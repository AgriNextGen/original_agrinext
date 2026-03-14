/**
 * Tests for src/lib/constants.ts and src/lib/routes.ts
 * Verifies the constants are well-formed and routes don't have typos.
 */
import { ROLES, STORAGE_KEYS, SUPABASE_BUCKETS, TRIP_STATUS_ORDER } from '@/lib/constants';
import { ROUTES } from '@/lib/routes';

describe('ROLES', () => {
  it('contains all 6 expected roles', () => {
    expect(Object.values(ROLES)).toContain('farmer');
    expect(Object.values(ROLES)).toContain('agent');
    expect(Object.values(ROLES)).toContain('logistics');
    expect(Object.values(ROLES)).toContain('buyer');
    expect(Object.values(ROLES)).toContain('admin');
    expect(Object.values(ROLES)).toContain('vendor');
    expect(Object.values(ROLES)).toHaveLength(6);
  });
});

describe('STORAGE_KEYS', () => {
  it('all keys are non-empty strings', () => {
    for (const val of Object.values(STORAGE_KEYS)) {
      expect(typeof val).toBe('string');
      expect(val.length).toBeGreaterThan(0);
    }
  });
});

describe('SUPABASE_BUCKETS', () => {
  it('all bucket names are non-empty strings', () => {
    for (const val of Object.values(SUPABASE_BUCKETS)) {
      expect(typeof val).toBe('string');
      expect(val.length).toBeGreaterThan(0);
    }
  });
});

describe('TRIP_STATUS_ORDER', () => {
  it('starts with ASSIGNED and ends with CLOSED', () => {
    expect(TRIP_STATUS_ORDER[0]).toBe('ASSIGNED');
    expect(TRIP_STATUS_ORDER[TRIP_STATUS_ORDER.length - 1]).toBe('CLOSED');
  });
});

describe('ROUTES', () => {
  it('all static routes start with /', () => {
    const check = (obj: unknown, path: string) => {
      if (typeof obj === 'string') {
        expect(obj).toMatch(/^\//, `Route ${path} should start with /`);
      } else if (typeof obj === 'function') {
        // Dynamic route function — call with test ID
        const result = (obj as Function)('test-id');
        expect(result).toMatch(/^\//, `Dynamic route ${path} should start with /`);
      } else if (typeof obj === 'object' && obj !== null) {
        for (const [key, val] of Object.entries(obj)) {
          check(val, `${path}.${key}`);
        }
      }
    };
    check(ROUTES, 'ROUTES');
  });

  it('FARMER routes all contain /farmer/', () => {
    const farmerStaticRoutes = Object.entries(ROUTES.FARMER)
      .filter(([, v]) => typeof v === 'string')
      .map(([, v]) => v as string);
    for (const route of farmerStaticRoutes) {
      if (route !== '/farmer') {
        expect(route).toContain('/farmer/');
      }
    }
  });
});
