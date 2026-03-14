/**
 * Unit tests for supabase/functions/_shared/maps_client.ts
 *
 * Tests geocoding (with cache), directions, and nearby search
 * with mocked Google Maps API and Supabase calls.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ── Deno env mock ──────────────────────────────────────────────────────

const envVars: Record<string, string> = {
  GOOGLE_MAPS_API_KEY: 'test-maps-key',
  SUPABASE_URL: 'https://test.supabase.co',
  SUPABASE_SERVICE_ROLE_KEY: 'test-service-role-key',
};

const mockDeno = {
  env: {
    get: (key: string) => envVars[key] ?? '',
  },
};

(globalThis as any).Deno = mockDeno;

// ── Fetch mock ─────────────────────────────────────────────────────────

const originalFetch = globalThis.fetch;
let fetchMock: ReturnType<typeof vi.fn>;

beforeEach(() => {
  fetchMock = vi.fn();
  globalThis.fetch = fetchMock as any;
});

afterEach(() => {
  globalThis.fetch = originalFetch;
  vi.restoreAllMocks();
});

// ── Geocoding tests ────────────────────────────────────────────────────

describe('geocodeAddress', () => {
  it('returns cached result on cache hit', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve([{
        lat: 12.9716,
        lng: 77.5946,
        formatted_address: 'Bangalore, Karnataka, India',
        place_id: 'ChIJbU60yXAWrjsR4E9-UejD3_g',
      }]),
    });

    const { geocodeAddress } = await import('../../supabase/functions/_shared/maps_client.ts');
    const result = await geocodeAddress('Bangalore');

    expect(result.lat).toBe(12.9716);
    expect(result.lng).toBe(77.5946);
    expect(result.cached).toBe(true);
    expect(result.formatted_address).toContain('Bangalore');
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('calls Google API on cache miss and caches result', async () => {
    // Cache miss
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve([]),
    });
    // Google Geocoding API
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({
        status: 'OK',
        results: [{
          geometry: { location: { lat: 15.3647, lng: 75.1240 } },
          formatted_address: 'Hubli, Karnataka, India',
          place_id: 'ChIJ_test',
        }],
      }),
    });
    // Cache write
    fetchMock.mockResolvedValueOnce({ ok: true });

    const { geocodeAddress } = await import('../../supabase/functions/_shared/maps_client.ts');
    const result = await geocodeAddress('Hubli');

    expect(result.lat).toBeCloseTo(15.3647, 3);
    expect(result.lng).toBeCloseTo(75.1240, 3);
    expect(result.cached).toBe(false);
    expect(result.formatted_address).toContain('Hubli');
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it('throws on empty address', async () => {
    const { geocodeAddress } = await import('../../supabase/functions/_shared/maps_client.ts');
    await expect(geocodeAddress('')).rejects.toThrow('address is required');
  });

  it('throws on Google API error status', async () => {
    // Cache miss
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve([]),
    });
    // Google returns error
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ status: 'ZERO_RESULTS' }),
    });

    const { geocodeAddress } = await import('../../supabase/functions/_shared/maps_client.ts');
    await expect(geocodeAddress('xyznonexistent123')).rejects.toThrow('Geocoding failed');
  });

  it('retries on network error', async () => {
    // Cache miss
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve([]),
    });
    // First attempt fails with server error
    fetchMock.mockResolvedValueOnce({
      ok: false,
      status: 500,
      json: () => Promise.resolve({ error: 'Internal Server Error' }),
    });
    // Retry succeeds
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({
        status: 'OK',
        results: [{
          geometry: { location: { lat: 12.0, lng: 77.0 } },
          formatted_address: 'Test Place',
          place_id: 'test',
        }],
      }),
    });
    // Cache write
    fetchMock.mockResolvedValueOnce({ ok: true });

    const { geocodeAddress } = await import('../../supabase/functions/_shared/maps_client.ts');
    const result = await geocodeAddress('Test Place');

    expect(result.lat).toBe(12.0);
    expect(fetchMock).toHaveBeenCalledTimes(4);
  });
});

// ── Directions tests ───────────────────────────────────────────────────

describe('getDirections', () => {
  it('returns route details between two addresses', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({
        status: 'OK',
        routes: [{
          legs: [{
            distance: { value: 15000, text: '15 km' },
            duration: { value: 1800, text: '30 mins' },
            steps: [
              {
                html_instructions: 'Head <b>north</b>',
                distance: { text: '2 km' },
                duration: { text: '5 mins' },
              },
              {
                html_instructions: 'Turn <b>right</b> onto NH48',
                distance: { text: '13 km' },
                duration: { text: '25 mins' },
              },
            ],
          }],
          overview_polyline: { points: 'a~l~Fjk~uOwHJy@' },
        }],
      }),
    });

    const { getDirections } = await import('../../supabase/functions/_shared/maps_client.ts');
    const result = await getDirections('Bangalore', 'Mysore');

    expect(result.distance_meters).toBe(15000);
    expect(result.distance_text).toBe('15 km');
    expect(result.duration_seconds).toBe(1800);
    expect(result.duration_text).toBe('30 mins');
    expect(result.polyline).toBe('a~l~Fjk~uOwHJy@');
    expect(result.steps).toHaveLength(2);
    expect(result.steps[0].instruction).toContain('north');
  });

  it('accepts LatLng objects as input', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({
        status: 'OK',
        routes: [{
          legs: [{
            distance: { value: 5000, text: '5 km' },
            duration: { value: 600, text: '10 mins' },
            steps: [],
          }],
          overview_polyline: { points: 'abc' },
        }],
      }),
    });

    const { getDirections } = await import('../../supabase/functions/_shared/maps_client.ts');
    const result = await getDirections(
      { lat: 12.97, lng: 77.59 },
      { lat: 13.00, lng: 77.60 },
    );

    expect(result.distance_meters).toBe(5000);
    const callUrl = fetchMock.mock.calls[0][0] as string;
    expect(callUrl).toContain('12.97');
    expect(callUrl).toContain('77.59');
  });

  it('throws on no route found', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({
        status: 'NOT_FOUND',
      }),
    });

    const { getDirections } = await import('../../supabase/functions/_shared/maps_client.ts');
    await expect(getDirections('Invalid Place', 'Another Invalid'))
      .rejects.toThrow('Directions failed');
  });
});

// ── Nearby search tests ────────────────────────────────────────────────

describe('searchNearby', () => {
  it('returns nearby places', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({
        status: 'OK',
        results: [
          {
            name: 'APMC Market Hubli',
            place_id: 'ChIJ_market1',
            geometry: { location: { lat: 15.36, lng: 75.12 } },
            vicinity: 'Hubli',
            types: ['establishment'],
            rating: 4.2,
            opening_hours: { open_now: true },
          },
          {
            name: 'Farmer Market',
            place_id: 'ChIJ_market2',
            geometry: { location: { lat: 15.37, lng: 75.13 } },
            vicinity: 'Hubli North',
            types: ['store'],
            rating: 3.8,
            opening_hours: { open_now: false },
          },
        ],
      }),
    });

    const { searchNearby } = await import('../../supabase/functions/_shared/maps_client.ts');
    const result = await searchNearby({
      type: 'market',
      lat: 15.36,
      lng: 75.12,
      radius: 10000,
    });

    expect(result.places).toHaveLength(2);
    expect(result.total).toBe(2);
    expect(result.places[0].name).toBe('APMC Market Hubli');
    expect(result.places[0].rating).toBe(4.2);
    expect(result.places[0].open_now).toBe(true);
    expect(result.places[1].open_now).toBe(false);
  });

  it('returns empty array for ZERO_RESULTS', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({
        status: 'ZERO_RESULTS',
        results: [],
      }),
    });

    const { searchNearby } = await import('../../supabase/functions/_shared/maps_client.ts');
    const result = await searchNearby({
      type: 'hospital',
      lat: 0,
      lng: 0,
    });

    expect(result.places).toHaveLength(0);
    expect(result.total).toBe(0);
  });

  it('clamps radius to valid range', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({
        status: 'ZERO_RESULTS',
        results: [],
      }),
    });

    const { searchNearby } = await import('../../supabase/functions/_shared/maps_client.ts');
    await searchNearby({
      type: 'store',
      lat: 15.0,
      lng: 75.0,
      radius: 100000,
    });

    const callUrl = fetchMock.mock.calls[0][0] as string;
    expect(callUrl).toContain('radius=50000');
  });

  it('throws on API error status', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({
        status: 'REQUEST_DENIED',
      }),
    });

    const { searchNearby } = await import('../../supabase/functions/_shared/maps_client.ts');
    await expect(searchNearby({
      type: 'store',
      lat: 15.0,
      lng: 75.0,
    })).rejects.toThrow('Nearby search failed');
  });
});

// ── Timeout behavior tests ─────────────────────────────────────────────

describe('timeout and retry', () => {
  it('handles missing GOOGLE_MAPS_API_KEY', async () => {
    const savedKey = envVars.GOOGLE_MAPS_API_KEY;
    envVars.GOOGLE_MAPS_API_KEY = '';

    // Cache miss
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve([]),
    });

    const { geocodeAddress } = await import('../../supabase/functions/_shared/maps_client.ts');
    await expect(geocodeAddress('Test')).rejects.toThrow();

    envVars.GOOGLE_MAPS_API_KEY = savedKey;
  });
});
