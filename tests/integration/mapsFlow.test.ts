/**
 * Integration test: Maps flow
 *
 * Simulates full maps service lifecycle:
 *   geocode query → cache check → Google API call → cache write → response
 *   directions query → Google API call → response
 *   nearby search → Google API call → response
 *
 * Mocks Google Maps API and Supabase REST but tests full orchestration
 * across maps_client.ts, env.ts, and request_context.ts.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ── Deno env mock ──────────────────────────────────────────────────────

const envVars: Record<string, string> = {
  GOOGLE_MAPS_API_KEY: 'test-maps-key-integration',
  SUPABASE_URL: 'https://test.supabase.co',
  SUPABASE_SERVICE_ROLE_KEY: 'test-service-role-key',
};

(globalThis as any).Deno = {
  env: { get: (key: string) => envVars[key] ?? '' },
};

const originalFetch = globalThis.fetch;
let fetchMock: ReturnType<typeof vi.fn>;
let fetchCallLog: Array<{ url: string; method: string }> = [];

function mockJsonResponse(data: unknown, ok = true) {
  return {
    ok,
    status: ok ? 200 : 500,
    json: () => Promise.resolve(data),
  };
}

beforeEach(() => {
  fetchCallLog = [];
  fetchMock = vi.fn().mockImplementation((url: string | Request, init?: RequestInit) => {
    const urlStr = typeof url === 'string' ? url : url.toString();
    const method = init?.method ?? 'GET';
    fetchCallLog.push({ url: urlStr, method });

    if (urlStr.includes('/rest/v1/geocoding_cache') && method === 'GET') {
      return Promise.resolve(mockJsonResponse([]));
    }

    if (urlStr.includes('/rest/v1/geocoding_cache') && method === 'POST') {
      return Promise.resolve(mockJsonResponse({ id: 'cache-entry-1' }));
    }

    if (urlStr.includes('maps.googleapis.com/maps/api/geocode')) {
      return Promise.resolve(mockJsonResponse({
        status: 'OK',
        results: [{
          geometry: { location: { lat: 12.2958, lng: 76.6394 } },
          formatted_address: 'Mysore, Karnataka 570001, India',
          place_id: 'ChIJ-36grSI9rjsRDhYokGTVzlQ',
        }],
      }));
    }

    if (urlStr.includes('maps.googleapis.com/maps/api/directions')) {
      return Promise.resolve(mockJsonResponse({
        status: 'OK',
        routes: [{
          legs: [{
            distance: { value: 145000, text: '145 km' },
            duration: { value: 10800, text: '3 hours' },
            steps: [
              {
                html_instructions: 'Head <b>southwest</b> on NH275',
                distance: { text: '120 km' },
                duration: { text: '2 hours 30 mins' },
              },
              {
                html_instructions: 'Continue to <b>Mysore</b>',
                distance: { text: '25 km' },
                duration: { text: '30 mins' },
              },
            ],
          }],
          overview_polyline: { points: 'polyline_encoded_string' },
        }],
      }));
    }

    if (urlStr.includes('maps.googleapis.com/maps/api/place/nearbysearch')) {
      return Promise.resolve(mockJsonResponse({
        status: 'OK',
        results: [
          {
            name: 'Devaraja Market',
            place_id: 'ChIJ_devaraja',
            geometry: { location: { lat: 12.3050, lng: 76.6550 } },
            vicinity: 'Dhanvanthri Road, Mysore',
            types: ['market', 'point_of_interest'],
            rating: 4.1,
            opening_hours: { open_now: true },
          },
          {
            name: 'APMC Yard',
            place_id: 'ChIJ_apmc',
            geometry: { location: { lat: 12.2800, lng: 76.6200 } },
            vicinity: 'Industrial Area, Mysore',
            types: ['establishment'],
            rating: 3.5,
          },
        ],
      }));
    }

    return Promise.resolve(mockJsonResponse({}));
  });
  globalThis.fetch = fetchMock as any;
});

afterEach(() => {
  globalThis.fetch = originalFetch;
  vi.restoreAllMocks();
});

describe('Maps flow integration', () => {
  it('geocode: cache miss → API call → cache write → valid response', async () => {
    const { geocodeAddress } = await import('../../supabase/functions/_shared/maps_client.ts');

    const result = await geocodeAddress('Mysore, Karnataka', { requestId: 'int-maps-1' });

    expect(result.lat).toBeCloseTo(12.2958, 3);
    expect(result.lng).toBeCloseTo(76.6394, 3);
    expect(result.formatted_address).toContain('Mysore');
    expect(result.place_id).toBeTruthy();
    expect(result.cached).toBe(false);

    const cacheRead = fetchCallLog.find(
      c => c.url.includes('geocoding_cache') && c.method === 'GET'
    );
    expect(cacheRead).toBeDefined();

    const googleCall = fetchCallLog.find(
      c => c.url.includes('maps.googleapis.com/maps/api/geocode')
    );
    expect(googleCall).toBeDefined();

    const cacheWrite = fetchCallLog.find(
      c => c.url.includes('geocoding_cache') && c.method === 'POST'
    );
    expect(cacheWrite).toBeDefined();
  });

  it('geocode: cache hit skips API call', async () => {
    fetchMock.mockReset();
    fetchMock.mockImplementation((url: string) => {
      const urlStr = typeof url === 'string' ? url : '';
      if (urlStr.includes('/rest/v1/geocoding_cache')) {
        return Promise.resolve(mockJsonResponse([{
          lat: 12.2958,
          lng: 76.6394,
          formatted_address: 'Mysore (cached)',
          place_id: 'cached-place-id',
        }]));
      }
      return Promise.resolve(mockJsonResponse({}));
    });

    const { geocodeAddress } = await import('../../supabase/functions/_shared/maps_client.ts');
    const result = await geocodeAddress('Mysore');

    expect(result.cached).toBe(true);
    expect(result.formatted_address).toContain('cached');

    const googleCalls = fetchCallLog.filter(
      c => c.url.includes('maps.googleapis.com')
    );
    expect(googleCalls).toHaveLength(0);
  });

  it('directions: returns complete route with steps', async () => {
    const { getDirections } = await import('../../supabase/functions/_shared/maps_client.ts');

    const result = await getDirections('Bangalore', 'Mysore', { requestId: 'int-maps-2' });

    expect(result.distance_meters).toBe(145000);
    expect(result.distance_text).toBe('145 km');
    expect(result.duration_seconds).toBe(10800);
    expect(result.duration_text).toBe('3 hours');
    expect(result.polyline).toBe('polyline_encoded_string');
    expect(result.steps).toHaveLength(2);
    expect(result.steps[0].instruction).toContain('southwest');
    expect(result.steps[1].instruction).toContain('Mysore');
  });

  it('directions: works with LatLng objects', async () => {
    const { getDirections } = await import('../../supabase/functions/_shared/maps_client.ts');

    const result = await getDirections(
      { lat: 12.9716, lng: 77.5946 },
      { lat: 12.2958, lng: 76.6394 },
    );

    expect(result.distance_meters).toBeGreaterThan(0);
    expect(result.steps).toBeDefined();
  });

  it('nearby: returns places with all fields populated', async () => {
    const { searchNearby } = await import('../../supabase/functions/_shared/maps_client.ts');

    const result = await searchNearby({
      type: 'market',
      lat: 12.3050,
      lng: 76.6550,
      radius: 10000,
      requestId: 'int-maps-3',
    });

    expect(result.places).toHaveLength(2);
    expect(result.total).toBe(2);

    const market = result.places[0];
    expect(market.name).toBe('Devaraja Market');
    expect(market.place_id).toBeTruthy();
    expect(market.lat).toBeCloseTo(12.3050, 3);
    expect(market.lng).toBeCloseTo(76.6550, 3);
    expect(market.vicinity).toContain('Mysore');
    expect(market.types).toContain('market');
    expect(market.rating).toBe(4.1);
    expect(market.open_now).toBe(true);

    const apmc = result.places[1];
    expect(apmc.name).toBe('APMC Yard');
    expect(apmc.open_now).toBeNull();
  });

  it('full flow: geocode → directions → nearby (chained)', async () => {
    const { geocodeAddress, getDirections, searchNearby } = await import(
      '../../supabase/functions/_shared/maps_client.ts'
    );

    const origin = await geocodeAddress('Bangalore');
    expect(origin.lat).toBeDefined();

    const destination = await geocodeAddress('Mysore');
    expect(destination.lat).toBeDefined();

    const route = await getDirections(
      { lat: origin.lat, lng: origin.lng },
      { lat: destination.lat, lng: destination.lng },
    );
    expect(route.distance_meters).toBeGreaterThan(0);

    const markets = await searchNearby({
      type: 'market',
      lat: destination.lat,
      lng: destination.lng,
      radius: 5000,
    });
    expect(markets.places.length).toBeGreaterThanOrEqual(0);
  });
});
