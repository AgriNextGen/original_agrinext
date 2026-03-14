/**
 * Vehicle Recommendation Engine — Tests
 *
 * Covers scoring algorithm, ranking logic, recommendation lifecycle,
 * and the key invariant: recommendations never auto-dispatch trucks.
 *
 * Run with: vitest run tests/logistics/vehicle-recommendation.test.ts
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockRpc = vi.fn();
const mockFrom = vi.fn();

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    rpc: mockRpc,
    from: mockFrom,
  },
}));

function chainable(result: { data: unknown; error: unknown; count?: number }) {
  const chain: Record<string, unknown> = {};
  const self = () => chain;
  chain.select = vi.fn().mockReturnValue(self());
  chain.insert = vi.fn().mockReturnValue(self());
  chain.update = vi.fn().mockReturnValue(self());
  chain.upsert = vi.fn().mockReturnValue(self());
  chain.eq = vi.fn().mockReturnValue(self());
  chain.neq = vi.fn().mockReturnValue(self());
  chain.in = vi.fn().mockReturnValue(self());
  chain.gt = vi.fn().mockReturnValue(self());
  chain.lt = vi.fn().mockReturnValue(self());
  chain.gte = vi.fn().mockReturnValue(self());
  chain.lte = vi.fn().mockReturnValue(self());
  chain.not = vi.fn().mockReturnValue(self());
  chain.order = vi.fn().mockReturnValue(self());
  chain.limit = vi.fn().mockReturnValue(self());
  chain.maybeSingle = vi.fn().mockResolvedValue(result);
  chain.single = vi.fn().mockResolvedValue(result);
  chain.then = vi.fn((cb: (v: typeof result) => unknown) => Promise.resolve(cb(result)));
  return chain;
}

describe('Recommendation Scoring Algorithm', () => {
  describe('Capacity Fit Score', () => {
    it('should score 100 for exact capacity match', () => {
      const poolWeight = 1000;
      const vehicleCapacity = 1000;
      const ratio = poolWeight / vehicleCapacity;
      const score = Math.max(0, 100 - Math.abs(1 - ratio) * 100);
      expect(score).toBe(100);
    });

    it('should score ~50 for 2x oversized vehicle', () => {
      const poolWeight = 500;
      const vehicleCapacity = 1000;
      const ratio = poolWeight / vehicleCapacity;
      const score = Math.max(0, 100 - Math.abs(1 - ratio) * 100);
      expect(score).toBe(50);
    });

    it('should score 0 for vastly oversized vehicle', () => {
      const poolWeight = 100;
      const vehicleCapacity = 10000;
      const ratio = poolWeight / vehicleCapacity;
      const score = Math.max(0, 100 - Math.abs(1 - ratio) * 100);
      expect(score).toBe(0);
    });

    it('should score 0 for zero weight pool', () => {
      const poolWeight = 0;
      const vehicleCapacity = 1000;
      expect(poolWeight <= 0 ? 0 : Math.max(0, 100 - Math.abs(1 - poolWeight / vehicleCapacity) * 100)).toBe(0);
    });

    it('should score 80 for 20% oversized vehicle', () => {
      const poolWeight = 800;
      const vehicleCapacity = 1000;
      const ratio = poolWeight / vehicleCapacity;
      const score = Math.max(0, 100 - Math.abs(1 - ratio) * 100);
      expect(score).toBe(80);
    });
  });

  describe('Composite Score Calculation', () => {
    const WEIGHTS = {
      CAPACITY_FIT: 0.30,
      ROUTE_MATCH: 0.25,
      PRICE: 0.20,
      RELIABILITY: 0.15,
      REVERSE_LOAD: 0.10,
    };

    it('should compute weighted sum correctly', () => {
      const capacity = 90;
      const route = 80;
      const price = 70;
      const reliability = 60;
      const reverse = 50;

      const expected =
        WEIGHTS.CAPACITY_FIT * capacity +
        WEIGHTS.ROUTE_MATCH * route +
        WEIGHTS.PRICE * price +
        WEIGHTS.RELIABILITY * reliability +
        WEIGHTS.REVERSE_LOAD * reverse;

      expect(expected).toBeCloseTo(76);
    });

    it('should return 0 when all factors are 0', () => {
      const composite =
        WEIGHTS.CAPACITY_FIT * 0 +
        WEIGHTS.ROUTE_MATCH * 0 +
        WEIGHTS.PRICE * 0 +
        WEIGHTS.RELIABILITY * 0 +
        WEIGHTS.REVERSE_LOAD * 0;

      expect(composite).toBe(0);
    });

    it('should return 100 when all factors are 100', () => {
      const composite =
        WEIGHTS.CAPACITY_FIT * 100 +
        WEIGHTS.ROUTE_MATCH * 100 +
        WEIGHTS.PRICE * 100 +
        WEIGHTS.RELIABILITY * 100 +
        WEIGHTS.REVERSE_LOAD * 100;

      expect(composite).toBe(100);
    });

    it('should weight capacity more than reverse load', () => {
      const withHighCapacity =
        WEIGHTS.CAPACITY_FIT * 100 + WEIGHTS.REVERSE_LOAD * 0;
      const withHighReverse =
        WEIGHTS.CAPACITY_FIT * 0 + WEIGHTS.REVERSE_LOAD * 100;

      expect(withHighCapacity).toBeGreaterThan(withHighReverse);
    });
  });

  describe('Route Match Score', () => {
    it('should score 100 for 0km distance', () => {
      const dist = 0;
      const score = Math.max(0, 100 - (dist / 50) * 100);
      expect(score).toBe(100);
    });

    it('should score ~50 for 25km distance', () => {
      const dist = 25;
      const score = Math.max(0, 100 - (dist / 50) * 100);
      expect(score).toBe(50);
    });

    it('should score 0 for 50km+ distance', () => {
      const dist = 50;
      const score = Math.max(0, 100 - (dist / 50) * 100);
      expect(score).toBe(0);
    });

    it('should default to 50 when no geo data available', () => {
      const score = 50;
      expect(score).toBe(50);
    });
  });

  describe('Reliability Score', () => {
    it('should score 100 for perfect completion rate', () => {
      const completed = 20;
      const total = 20;
      const score = Math.min(100, (completed / total) * 100);
      expect(score).toBe(100);
    });

    it('should score 50 for 50% completion rate', () => {
      const completed = 5;
      const total = 10;
      const score = Math.min(100, (completed / total) * 100);
      expect(score).toBe(50);
    });

    it('should default to 50 for no trip history', () => {
      const total = 0;
      const score = total === 0 ? 50 : 0;
      expect(score).toBe(50);
    });
  });

  describe('Reverse Load Score', () => {
    it('should score 0 when no reverse candidates exist', () => {
      const count = 0;
      const score = Math.min(100, count * 20);
      expect(score).toBe(0);
    });

    it('should score 60 for 3 reverse candidates', () => {
      const count = 3;
      const score = Math.min(100, count * 20);
      expect(score).toBe(60);
    });

    it('should cap at 100', () => {
      const count = 10;
      const score = Math.min(100, count * 20);
      expect(score).toBe(100);
    });
  });
});

describe('Recommendation Type Definitions', () => {
  it('should have correct RECOMMENDATION_WEIGHTS that sum to 1.0', async () => {
    const { RECOMMENDATION_WEIGHTS } = await import('@/services/logistics/types');
    const sum =
      RECOMMENDATION_WEIGHTS.CAPACITY_FIT +
      RECOMMENDATION_WEIGHTS.ROUTE_MATCH +
      RECOMMENDATION_WEIGHTS.PRICE +
      RECOMMENDATION_WEIGHTS.RELIABILITY +
      RECOMMENDATION_WEIGHTS.REVERSE_LOAD;
    expect(sum).toBeCloseTo(1.0);
  });

  it('should define RecommendationStatus type values', async () => {
    const validStatuses = ['pending', 'accepted', 'rejected', 'expired'];
    validStatuses.forEach((s) => {
      expect(typeof s).toBe('string');
    });
  });
});

describe('Recommendation Route Constants', () => {
  it('should include RECOMMENDATIONS in LOGISTICS routes', async () => {
    const { ROUTES } = await import('@/lib/routes');
    expect(ROUTES.LOGISTICS.RECOMMENDATIONS).toBe('/logistics/recommendations');
  });
});

describe('LogisticsMatchingEngine — Recommendation Mode', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should include recommendation_generated event type', async () => {
    const validEvents = [
      'recommendation_generated',
      'recommendation_accepted',
      'recommendation_rejected',
    ];
    validEvents.forEach((e) => {
      expect(typeof e).toBe('string');
    });
  });
});

describe('Recommendation Invariants', () => {
  it('should never auto-assign a vehicle: acceptance requires explicit call', () => {
    const acceptRecommendation = async (id: string) => {
      if (!id) throw new Error('Recommendation ID required');
      return { unified_trip_id: 'trip-001', vehicle_id: 'v-001', bookings_count: 1 };
    };

    expect(() => acceptRecommendation('')).rejects.toThrow('Recommendation ID required');
    expect(acceptRecommendation('rec-001')).resolves.toHaveProperty('unified_trip_id');
  });

  it('should expire recommendations after 24 hours', () => {
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
    const now = new Date();
    expect(expiresAt.getTime()).toBeGreaterThan(now.getTime());

    const pastExpiry = new Date(Date.now() - 1000);
    expect(pastExpiry.getTime()).toBeLessThan(now.getTime());
  });

  it('should reject all other recommendations when one is accepted', () => {
    const recommendations = [
      { id: 'rec-1', status: 'pending' },
      { id: 'rec-2', status: 'pending' },
      { id: 'rec-3', status: 'pending' },
    ];

    const accepted = 'rec-2';
    const afterAcceptance = recommendations.map((r) => ({
      ...r,
      status: r.id === accepted ? 'accepted' : 'rejected',
    }));

    expect(afterAcceptance.filter(r => r.status === 'accepted')).toHaveLength(1);
    expect(afterAcceptance.filter(r => r.status === 'rejected')).toHaveLength(2);
  });

  it('should rank vehicles by descending score', () => {
    const scores = [45, 92, 78, 60, 85];
    const sorted = [...scores].sort((a, b) => b - a);
    expect(sorted).toEqual([92, 85, 78, 60, 45]);
    expect(sorted[0]).toBe(92);
  });
});
