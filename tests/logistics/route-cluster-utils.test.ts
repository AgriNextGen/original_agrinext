/**
 * Route Cluster Utilities — unit tests
 *
 * Tests pure utility functions for route clustering.
 * No Supabase mocking needed — these are stateless helpers.
 *
 * Run with: vitest run tests/logistics/route-cluster-utils.test.ts
 */
import { describe, it, expect } from 'vitest';

import {
  buildClusterLabel,
  detectClusterLevel,
  haversineDistanceKm,
  isSameCluster,
  hasTimeWindowOverlap,
  reverseClusterLabel,
  compareClusterLevels,
  poolabilityScore,
} from '@/lib/logistics/routeClusters';

describe('Route Cluster Utilities', () => {
  describe('buildClusterLabel', () => {
    it('should build label with arrow separator', () => {
      expect(buildClusterLabel('Kolar', 'Bangalore')).toBe('Kolar → Bangalore');
    });

    it('should trim whitespace', () => {
      expect(buildClusterLabel('  Mysuru  ', '  Bangalore  ')).toBe('Mysuru → Bangalore');
    });
  });

  describe('detectClusterLevel', () => {
    it('should return village for < 5 km', () => {
      expect(detectClusterLevel(3)).toBe('village');
    });

    it('should return village_cluster for 5-15 km', () => {
      expect(detectClusterLevel(10)).toBe('village_cluster');
    });

    it('should return taluk for 15-50 km', () => {
      expect(detectClusterLevel(30)).toBe('taluk');
    });

    it('should return district for 50-150 km', () => {
      expect(detectClusterLevel(100)).toBe('district');
    });

    it('should return market_corridor for > 150 km', () => {
      expect(detectClusterLevel(200)).toBe('market_corridor');
    });

    it('should handle boundary at 5 km', () => {
      expect(detectClusterLevel(5)).toBe('village_cluster');
    });

    it('should handle boundary at 150 km', () => {
      expect(detectClusterLevel(150)).toBe('market_corridor');
    });
  });

  describe('haversineDistanceKm', () => {
    it('should return 0 for same point', () => {
      const p = { lat: 12.9716, lng: 77.5946 };
      expect(haversineDistanceKm(p, p)).toBeCloseTo(0, 5);
    });

    it('should calculate distance between Bangalore and Mysuru (~145 km)', () => {
      const bangalore = { lat: 12.9716, lng: 77.5946 };
      const mysuru = { lat: 12.2958, lng: 76.6394 };
      const dist = haversineDistanceKm(bangalore, mysuru);
      expect(dist).toBeGreaterThan(130);
      expect(dist).toBeLessThan(160);
    });

    it('should calculate short distance (~10 km)', () => {
      const a = { lat: 12.9716, lng: 77.5946 };
      const b = { lat: 12.9816, lng: 77.6946 };
      const dist = haversineDistanceKm(a, b);
      expect(dist).toBeGreaterThan(5);
      expect(dist).toBeLessThan(20);
    });
  });

  describe('isSameCluster', () => {
    it('should return true for matching districts', () => {
      expect(
        isSameCluster(
          { origin_district_id: 'd1', dest_district_id: 'd2' },
          { origin_district_id: 'd1', dest_district_id: 'd2' }
        )
      ).toBe(true);
    });

    it('should return false for different origin', () => {
      expect(
        isSameCluster(
          { origin_district_id: 'd1', dest_district_id: 'd2' },
          { origin_district_id: 'd3', dest_district_id: 'd2' }
        )
      ).toBe(false);
    });

    it('should return false when origin is null', () => {
      expect(
        isSameCluster(
          { origin_district_id: null, dest_district_id: 'd2' },
          { origin_district_id: 'd1', dest_district_id: 'd2' }
        )
      ).toBe(false);
    });

    it('should return false when dest is null', () => {
      expect(
        isSameCluster(
          { origin_district_id: 'd1', dest_district_id: null },
          { origin_district_id: 'd1', dest_district_id: 'd2' }
        )
      ).toBe(false);
    });
  });

  describe('hasTimeWindowOverlap', () => {
    it('should return true when windows overlap', () => {
      expect(
        hasTimeWindowOverlap(
          { pickup_time_window_start: '2026-03-15T06:00:00Z', pickup_time_window_end: '2026-03-15T12:00:00Z' },
          { start: '2026-03-15T10:00:00Z', end: '2026-03-15T18:00:00Z' }
        )
      ).toBe(true);
    });

    it('should return false when windows do not overlap', () => {
      expect(
        hasTimeWindowOverlap(
          { pickup_time_window_start: '2026-03-15T06:00:00Z', pickup_time_window_end: '2026-03-15T08:00:00Z' },
          { start: '2026-03-15T10:00:00Z', end: '2026-03-15T18:00:00Z' }
        )
      ).toBe(false);
    });

    it('should return true when shipment window is null (flexible)', () => {
      expect(
        hasTimeWindowOverlap(
          { pickup_time_window_start: null, pickup_time_window_end: null },
          { start: '2026-03-15T10:00:00Z', end: '2026-03-15T18:00:00Z' }
        )
      ).toBe(true);
    });

    it('should handle exact boundary overlap', () => {
      expect(
        hasTimeWindowOverlap(
          { pickup_time_window_start: '2026-03-15T06:00:00Z', pickup_time_window_end: '2026-03-15T10:00:00Z' },
          { start: '2026-03-15T10:00:00Z', end: '2026-03-15T18:00:00Z' }
        )
      ).toBe(true);
    });
  });

  describe('reverseClusterLabel', () => {
    it('should reverse a cluster label', () => {
      expect(reverseClusterLabel('Kolar → Bangalore')).toBe('Bangalore → Kolar');
    });

    it('should handle extra whitespace', () => {
      expect(reverseClusterLabel('  Mysuru  →  Bangalore  ')).toBe('Bangalore → Mysuru');
    });

    it('should return original if no arrow', () => {
      expect(reverseClusterLabel('Kolar to Bangalore')).toBe('Kolar to Bangalore');
    });
  });

  describe('compareClusterLevels', () => {
    it('should rank village < district', () => {
      expect(compareClusterLevels('village', 'district')).toBeLessThan(0);
    });

    it('should rank market_corridor > taluk', () => {
      expect(compareClusterLevels('market_corridor', 'taluk')).toBeGreaterThan(0);
    });

    it('should return 0 for same level', () => {
      expect(compareClusterLevels('taluk', 'taluk')).toBe(0);
    });
  });

  describe('poolabilityScore', () => {
    it('should return high score for small loads', () => {
      expect(poolabilityScore(300, 5000)).toBeCloseTo(0.94, 2);
    });

    it('should return low score for large loads', () => {
      expect(poolabilityScore(4500, 5000)).toBeCloseTo(0.1, 2);
    });

    it('should return 0 when load fills vehicle', () => {
      expect(poolabilityScore(5000, 5000)).toBe(0);
    });

    it('should return 0 when load exceeds vehicle', () => {
      expect(poolabilityScore(6000, 5000)).toBe(0);
    });

    it('should return 0 for zero capacity', () => {
      expect(poolabilityScore(100, 0)).toBe(0);
    });

    it('should return 0 for zero weight', () => {
      expect(poolabilityScore(0, 5000)).toBe(0);
    });
  });
});
