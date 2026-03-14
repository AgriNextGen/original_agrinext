/**
 * API-level tests for the logistics-orchestrator Edge Function.
 *
 * These tests verify the HTTP route handling, request/response shapes,
 * auth enforcement, and error handling of the Edge Function controller layer.
 *
 * Uses mock Supabase client to isolate the controller from the database.
 */
import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest';

const WORKER_SECRET = 'test-worker-secret';
const SUPABASE_URL = 'https://test.supabase.co';

const { mockRpc, mockFrom, mockGetUser } = vi.hoisted(() => ({
  mockRpc: vi.fn(),
  mockFrom: vi.fn(),
  mockGetUser: vi.fn(),
}));

vi.mock('jsr:@supabase/supabase-js@2', () => ({
  createClient: () => ({
    rpc: mockRpc,
    from: mockFrom,
    auth: { getUser: mockGetUser },
  }),
}));

vi.mock('jsr:@supabase/functions-js/edge-runtime.d.ts', () => ({}));

vi.stubGlobal('Deno', {
  env: {
    get: (key: string) => {
      const envMap: Record<string, string> = {
        SUPABASE_URL,
        SUPABASE_SERVICE_ROLE_KEY: 'test-service-key',
        WORKER_SECRET,
      };
      return envMap[key] ?? '';
    },
  },
  serve: vi.fn(),
});

function buildRequest(method: string, path: string, body?: unknown, headers: Record<string, string> = {}): Request {
  const url = `${SUPABASE_URL}/functions/v1/logistics-orchestrator/${path}`;
  const init: RequestInit = {
    method,
    headers: {
      'Content-Type': 'application/json',
      'x-worker-secret': WORKER_SECRET,
      ...headers,
    },
  };
  if (body) init.body = JSON.stringify(body);
  return new Request(url, init);
}

async function parseResponse(res: Response) {
  return { status: res.status, body: await res.json() };
}

// Captured once in beforeAll; re-used by every test via getHandler().
let edgeFunctionHandler: ((req: Request) => Promise<Response>) | null = null;

describe('logistics-orchestrator API routes', () => {
  beforeAll(async () => {
    // Load the edge function module once so it registers the Deno.serve handler.
    // Dynamic import() (unlike require()) goes through Vitest's TypeScript
    // transformer and correctly strips non-null assertions ('!') in the source.
    await import('../../supabase/functions/logistics-orchestrator/index.ts');
    const serveMock = vi.mocked(Deno.serve);
    const h = serveMock.mock.calls[0]?.[0];
    if (typeof h !== 'function') {
      throw new Error('Deno.serve was not called with a handler function');
    }
    edgeFunctionHandler = h as (req: Request) => Promise<Response>;
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('POST /shipments', () => {
    it('should call create_shipment_request_v1 RPC and return success', async () => {
      const rpcResult = { shipment_request_id: 'sr-001', route_cluster_id: 'rc-001' };
      mockRpc.mockResolvedValueOnce({ data: rpcResult, error: null });

      const handler = getHandler();
      const req = buildRequest('POST', 'shipments', {
        request_source_type: 'farmer',
        source_actor_id: 'user-001',
      });
      const res = await handler(req);
      const { status, body } = await parseResponse(res);

      expect(status).toBe(200);
      expect(body.success).toBe(true);
      expect(body.data).toEqual(rpcResult);
      expect(mockRpc).toHaveBeenCalledWith('create_shipment_request_v1', expect.any(Object));
    });

    it('should return error when RPC fails', async () => {
      mockRpc.mockResolvedValueOnce({ data: null, error: { message: 'validation failed' } });

      const handler = getHandler();
      const req = buildRequest('POST', 'shipments', { request_source_type: 'farmer' });
      const res = await handler(req);
      const { status, body } = await parseResponse(res);

      expect(status).toBe(400);
      expect(body.success).toBe(false);
      expect(body.error.code).toBeDefined();
    });
  });

  describe('GET /shipments/:id', () => {
    it('should call get_shipment_detail_v1 RPC', async () => {
      const detail = { id: 'sr-001', items: [], bookings: [] };
      mockRpc.mockResolvedValueOnce({ data: detail, error: null });

      const handler = getHandler();
      const req = buildRequest('GET', 'shipments/sr-001');
      const res = await handler(req);
      const { status, body } = await parseResponse(res);

      expect(status).toBe(200);
      expect(body.success).toBe(true);
      expect(body.data).toEqual(detail);
    });

    it('should return 404 for SHIPMENT_NOT_FOUND', async () => {
      mockRpc.mockResolvedValueOnce({ data: null, error: { message: 'SHIPMENT_NOT_FOUND' } });

      const handler = getHandler();
      const req = buildRequest('GET', 'shipments/nonexistent');
      const res = await handler(req);
      const { status, body } = await parseResponse(res);

      expect(status).toBe(404);
      expect(body.success).toBe(false);
      expect(body.error.code).toBe('NOT_FOUND');
    });
  });

  describe('POST /shipments/:id/items', () => {
    it('should call add_shipment_items_v1 RPC', async () => {
      const result = { shipment_request_id: 'sr-001', items_added: 1, item_ids: [{ item_id: 'si-001' }] };
      mockRpc.mockResolvedValueOnce({ data: result, error: null });

      const handler = getHandler();
      const req = buildRequest('POST', 'shipments/sr-001/items', {
        product_name: 'Tomato',
        quantity: 500,
        unit: 'kg',
      });
      const res = await handler(req);
      const { status, body } = await parseResponse(res);

      expect(status).toBe(201);
      expect(body.success).toBe(true);
      expect(body.data.items_added).toBe(1);
    });

    it('should accept array of items', async () => {
      const result = { shipment_request_id: 'sr-001', items_added: 2, item_ids: [] };
      mockRpc.mockResolvedValueOnce({ data: result, error: null });

      const handler = getHandler();
      const req = buildRequest('POST', 'shipments/sr-001/items', [
        { product_name: 'Tomato', quantity: 300 },
        { product_name: 'Onion', quantity: 200 },
      ]);
      const res = await handler(req);
      const { status, body } = await parseResponse(res);

      expect(status).toBe(201);
      expect(body.success).toBe(true);
    });
  });

  describe('POST /trips', () => {
    it('should call create_unified_trip_v1 RPC', async () => {
      const result = { unified_trip_id: 'ut-001' };
      mockRpc.mockResolvedValueOnce({ data: result, error: null });

      const handler = getHandler();
      const req = buildRequest('POST', 'trips', {
        vehicle_id: 'v-001',
        driver_id: 'u-001',
        start_location: 'Hunsuru',
        end_location: 'Mysuru',
      });
      const res = await handler(req);
      const { status, body } = await parseResponse(res);

      expect(status).toBe(200);
      expect(body.success).toBe(true);
      expect(body.data.unified_trip_id).toBe('ut-001');
    });
  });

  describe('GET /trips/:id', () => {
    it('should call get_unified_trip_detail_v1 RPC', async () => {
      const detail = { id: 'ut-001', legs: [], bookings: [] };
      mockRpc.mockResolvedValueOnce({ data: detail, error: null });

      const handler = getHandler();
      const req = buildRequest('GET', 'trips/ut-001');
      const res = await handler(req);
      const { status, body } = await parseResponse(res);

      expect(status).toBe(200);
      expect(body.success).toBe(true);
      expect(body.data).toEqual(detail);
    });

    it('should return 404 for TRIP_NOT_FOUND', async () => {
      mockRpc.mockResolvedValueOnce({ data: null, error: { message: 'TRIP_NOT_FOUND' } });

      const handler = getHandler();
      const req = buildRequest('GET', 'trips/nonexistent');
      const res = await handler(req);
      const { status, body } = await parseResponse(res);

      expect(status).toBe(404);
      expect(body.error.code).toBe('NOT_FOUND');
    });
  });

  describe('POST /bookings', () => {
    it('should call book_shipment_to_trip_v1 RPC', async () => {
      const result = { booking_id: 'bk-001', capacity_used_kg: 500, capacity_remaining_kg: 500 };
      mockRpc.mockResolvedValueOnce({ data: result, error: null });

      const handler = getHandler();
      const req = buildRequest('POST', 'bookings', {
        shipment_request_id: 'sr-001',
        unified_trip_id: 'ut-001',
      });
      const res = await handler(req);
      const { status, body } = await parseResponse(res);

      expect(status).toBe(200);
      expect(body.success).toBe(true);
      expect(body.data.booking_id).toBe('bk-001');
    });
  });

  describe('POST /load-pools', () => {
    it('should call create_load_pool_v1 RPC', async () => {
      const result = { load_pool_id: 'lp-001' };
      mockRpc.mockResolvedValueOnce({ data: result, error: null });

      const handler = getHandler();
      const req = buildRequest('POST', 'load-pools', {
        route_cluster_id: 'rc-001',
        capacity_target_kg: 5000,
      });
      const res = await handler(req);
      const { status, body } = await parseResponse(res);

      expect(status).toBe(200);
      expect(body.success).toBe(true);
      expect(body.data.load_pool_id).toBe('lp-001');
    });
  });

  describe('GET /reverse-candidates/:tripId', () => {
    it('should call find_reverse_load_candidates_v1 RPC', async () => {
      const result = { candidates: [], count: 0, remaining_capacity_kg: 1000 };
      mockRpc.mockResolvedValueOnce({ data: result, error: null });

      const handler = getHandler();
      const req = buildRequest('GET', 'reverse-candidates/ut-001');
      const res = await handler(req);
      const { status, body } = await parseResponse(res);

      expect(status).toBe(200);
      expect(body.success).toBe(true);
      expect(body.data.remaining_capacity_kg).toBe(1000);
    });
  });

  describe('POST /route-clusters/detect', () => {
    it('should call detect_route_cluster_v1 RPC', async () => {
      const result = { route_cluster_id: 'rc-001', created: false };
      mockRpc.mockResolvedValueOnce({ data: result, error: null });

      const handler = getHandler();
      const req = buildRequest('POST', 'route-clusters/detect', {
        origin_district_id: 'd-001',
        dest_district_id: 'd-002',
      });
      const res = await handler(req);
      const { status, body } = await parseResponse(res);

      expect(status).toBe(200);
      expect(body.success).toBe(true);
      expect(body.data.route_cluster_id).toBe('rc-001');
    });
  });

  describe('Auth enforcement', () => {
    it('should reject requests without auth', async () => {
      mockGetUser.mockResolvedValueOnce({ data: { user: null }, error: { message: 'invalid' } });

      const handler = getHandler();
      const req = new Request(`${SUPABASE_URL}/functions/v1/logistics-orchestrator/shipments`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });
      const res = await handler(req);
      const { status, body } = await parseResponse(res);

      expect(status).toBe(401);
      expect(body.success).toBe(false);
    });
  });

  describe('Unknown routes', () => {
    it('should return 404 for unmatched routes', async () => {
      const handler = getHandler();
      const req = buildRequest('GET', 'nonexistent/path');
      const res = await handler(req);
      const { status, body } = await parseResponse(res);

      expect(status).toBe(404);
      expect(body.success).toBe(false);
    });
  });

  describe('Response format', () => {
    it('should always return { success, data } on success', async () => {
      mockRpc.mockResolvedValueOnce({ data: { load_pool_id: 'lp-001' }, error: null });

      const handler = getHandler();
      const req = buildRequest('POST', 'load-pools', { route_cluster_id: 'rc-001', capacity_target_kg: 5000 });
      const res = await handler(req);
      const body = await res.json();

      expect(body).toHaveProperty('success', true);
      expect(body).toHaveProperty('data');
    });

    it('should always return { success, error: { code, message } } on error', async () => {
      mockRpc.mockResolvedValueOnce({ data: null, error: { message: 'test error' } });

      const handler = getHandler();
      const req = buildRequest('POST', 'bookings', { shipment_request_id: 'x', unified_trip_id: 'y' });
      const res = await handler(req);
      const body = await res.json();

      expect(body).toHaveProperty('success', false);
      expect(body).toHaveProperty('error');
      expect(body.error).toHaveProperty('code');
      expect(body.error).toHaveProperty('message');
    });
  });
});

/**
 * Return the handler captured from Deno.serve() during beforeAll.
 */
function getHandler(): (req: Request) => Promise<Response> {
  if (!edgeFunctionHandler) {
    throw new Error('Edge function handler not initialised — beforeAll must complete first');
  }
  return edgeFunctionHandler;
}
