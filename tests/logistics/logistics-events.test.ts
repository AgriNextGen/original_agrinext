/**
 * Phase 2 — LogisticsEventService tests
 *
 * Tests event emission, batch emission, filtering, and counting.
 *
 * Run with: vitest run tests/logistics/logistics-events.test.ts
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockFrom } = vi.hoisted(() => ({
  mockFrom: vi.fn(),
}));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: { from: mockFrom, rpc: vi.fn() },
}));

import { LogisticsEventService } from '@/services/logistics/LogisticsEventService';

function chainable(result: { data: unknown; error: unknown }) {
  const chain: Record<string, unknown> = {};
  const self = () => chain;
  chain.select = vi.fn().mockReturnValue(self());
  chain.insert = vi.fn().mockReturnValue(self());
  chain.eq = vi.fn().mockReturnValue(self());
  chain.gte = vi.fn().mockReturnValue(self());
  chain.lte = vi.fn().mockReturnValue(self());
  chain.order = vi.fn().mockReturnValue(self());
  chain.limit = vi.fn().mockReturnValue(self());
  chain.maybeSingle = vi.fn().mockResolvedValue(result);
  chain.then = vi.fn((cb: (v: typeof result) => unknown) => Promise.resolve(cb(result)));
  return chain;
}

describe('LogisticsEventService', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  describe('emit', () => {
    it('should insert an event and return it', async () => {
      const event = {
        id: 'evt-001',
        event_type: 'shipment_created',
        entity_type: 'shipment_request',
        entity_id: 'sr-001',
        payload: { weight_kg: 500 },
        created_at: '2026-03-14T10:00:00Z',
      };
      mockFrom.mockReturnValueOnce(chainable({ data: event, error: null }));

      const result = await LogisticsEventService.emit({
        event_type: 'shipment_created',
        entity_type: 'shipment_request',
        entity_id: 'sr-001',
        payload: { weight_kg: 500 },
      });

      expect(result).not.toBeNull();
      expect(result!.event_type).toBe('shipment_created');
      expect(result!.entity_id).toBe('sr-001');
    });

    it('should return null on insert error without throwing', async () => {
      mockFrom.mockReturnValueOnce(chainable({ data: null, error: { message: 'insert failed' } }));

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const result = await LogisticsEventService.emit({
        event_type: 'trip_generated',
        entity_type: 'unified_trip',
        entity_id: 'ut-001',
      });

      expect(result).toBeNull();
      consoleSpy.mockRestore();
    });

    it('should default payload to empty object', async () => {
      const event = { id: 'evt-002', event_type: 'load_pool_created', entity_type: 'load_pool', entity_id: 'lp-001', payload: {}, created_at: '2026-03-14T10:00:00Z' };
      mockFrom.mockReturnValueOnce(chainable({ data: event, error: null }));

      const result = await LogisticsEventService.emit({
        event_type: 'load_pool_created',
        entity_type: 'load_pool',
        entity_id: 'lp-001',
      });

      expect(result!.payload).toEqual({});
    });
  });

  describe('emitBatch', () => {
    it('should insert multiple events and return count', async () => {
      mockFrom.mockReturnValueOnce(chainable({ data: [{ id: 'e1' }, { id: 'e2' }], error: null }));

      const count = await LogisticsEventService.emitBatch([
        { event_type: 'shipment_created', entity_type: 'shipment_request', entity_id: 'sr-001' },
        { event_type: 'shipment_created', entity_type: 'shipment_request', entity_id: 'sr-002' },
      ]);

      expect(count).toBe(2);
    });

    it('should return 0 for empty array', async () => {
      const count = await LogisticsEventService.emitBatch([]);
      expect(count).toBe(0);
    });

    it('should return 0 on error', async () => {
      mockFrom.mockReturnValueOnce(chainable({ data: null, error: { message: 'batch fail' } }));
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const count = await LogisticsEventService.emitBatch([
        { event_type: 'trip_generated', entity_type: 'unified_trip', entity_id: 'ut-001' },
      ]);

      expect(count).toBe(0);
      consoleSpy.mockRestore();
    });
  });

  describe('listEvents', () => {
    it('should return events with default limit', async () => {
      const events = [
        { id: 'e1', event_type: 'shipment_created', entity_type: 'shipment_request', entity_id: 'sr-001', payload: {}, created_at: '2026-03-14T10:00:00Z' },
        { id: 'e2', event_type: 'trip_generated', entity_type: 'unified_trip', entity_id: 'ut-001', payload: {}, created_at: '2026-03-14T09:00:00Z' },
      ];
      mockFrom.mockReturnValueOnce(chainable({ data: events, error: null }));

      const result = await LogisticsEventService.listEvents();
      expect(result).toHaveLength(2);
    });

    it('should filter by event_type', async () => {
      mockFrom.mockReturnValueOnce(chainable({ data: [], error: null }));

      await LogisticsEventService.listEvents({ event_type: 'trip_generated' });
      expect(mockFrom).toHaveBeenCalledWith('logistics_events');
    });

    it('should throw on query error', async () => {
      mockFrom.mockReturnValueOnce(chainable({ data: null, error: { message: 'query fail' } }));

      await expect(LogisticsEventService.listEvents()).rejects.toThrow('listEvents failed');
    });
  });

  describe('getRecentEvents', () => {
    it('should delegate to listEvents with limit', async () => {
      mockFrom.mockReturnValueOnce(chainable({ data: [], error: null }));

      const result = await LogisticsEventService.getRecentEvents(5);
      expect(result).toHaveLength(0);
    });
  });

  describe('getEventCounts', () => {
    it('should return counts grouped by event type', async () => {
      const rows = [
        { event_type: 'shipment_created' },
        { event_type: 'shipment_created' },
        { event_type: 'trip_generated' },
      ];
      mockFrom.mockReturnValueOnce(chainable({ data: rows, error: null }));

      const counts = await LogisticsEventService.getEventCounts();
      expect(counts.shipment_created).toBe(2);
      expect(counts.trip_generated).toBe(1);
    });

    it('should return empty object when no events', async () => {
      mockFrom.mockReturnValueOnce(chainable({ data: [], error: null }));

      const counts = await LogisticsEventService.getEventCounts();
      expect(Object.keys(counts)).toHaveLength(0);
    });
  });

  describe('listEvents filters', () => {
    it('should filter by entity_type', async () => {
      mockFrom.mockReturnValueOnce(chainable({ data: [], error: null }));

      await LogisticsEventService.listEvents({ entity_type: 'unified_trip' });
      expect(mockFrom).toHaveBeenCalledWith('logistics_events');
    });

    it('should filter by entity_id', async () => {
      mockFrom.mockReturnValueOnce(chainable({ data: [], error: null }));

      await LogisticsEventService.listEvents({ entity_id: 'trip-001' });
      expect(mockFrom).toHaveBeenCalledWith('logistics_events');
    });

    it('should filter by date range', async () => {
      mockFrom.mockReturnValueOnce(chainable({ data: [], error: null }));

      await LogisticsEventService.listEvents({
        since: '2026-03-01T00:00:00Z',
        until: '2026-03-15T00:00:00Z',
      });
      expect(mockFrom).toHaveBeenCalledWith('logistics_events');
    });

    it('should combine multiple filters', async () => {
      const events = [
        { id: 'e1', event_type: 'trip_generated', entity_type: 'unified_trip', entity_id: 'ut-001', payload: {}, created_at: '2026-03-14T10:00:00Z' },
      ];
      mockFrom.mockReturnValueOnce(chainable({ data: events, error: null }));

      const result = await LogisticsEventService.listEvents({
        event_type: 'trip_generated',
        entity_type: 'unified_trip',
        since: '2026-03-14T00:00:00Z',
        limit: 10,
      });
      expect(result).toHaveLength(1);
    });
  });
});
