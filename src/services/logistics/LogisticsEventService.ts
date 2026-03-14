/**
 * LogisticsEventService
 *
 * Append-only event log for logistics orchestration observability.
 * Writes to the logistics_events table and provides query methods
 * for admin dashboard monitoring.
 *
 * Internal service — used by LogisticsMatchingEngine and admin APIs.
 */
import { supabase } from '@/integrations/supabase/client';
import type { LogisticsEvent, LogisticsEventType } from './types';

interface EmitParams {
  event_type: LogisticsEventType;
  entity_type: string;
  entity_id: string;
  payload?: Record<string, unknown>;
}

interface EventFilter {
  event_type?: LogisticsEventType;
  entity_type?: string;
  entity_id?: string;
  since?: string;
  until?: string;
  limit?: number;
}

export class LogisticsEventService {
  /**
   * Write an event to the logistics_events table.
   * Fire-and-forget by default — errors are logged but not thrown
   * to avoid disrupting the calling flow.
   */
  static async emit(params: EmitParams): Promise<LogisticsEvent | null> {
    const { data, error } = await supabase
      .from('logistics_events')
      .insert({
        event_type: params.event_type,
        entity_type: params.entity_type,
        entity_id: params.entity_id,
        payload: params.payload ?? {},
      })
      .select('id, event_type, entity_type, entity_id, payload, created_at')
      .maybeSingle();

    if (error) {
      console.error(`[LogisticsEventService] emit failed: ${error.message}`, params);
      return null;
    }

    return data as unknown as LogisticsEvent;
  }

  /**
   * Emit multiple events in a batch insert.
   */
  static async emitBatch(events: EmitParams[]): Promise<number> {
    if (events.length === 0) return 0;

    const rows = events.map((e) => ({
      event_type: e.event_type,
      entity_type: e.entity_type,
      entity_id: e.entity_id,
      payload: e.payload ?? {},
    }));

    const { data, error } = await supabase
      .from('logistics_events')
      .insert(rows)
      .select('id');

    if (error) {
      console.error(`[LogisticsEventService] emitBatch failed: ${error.message}`);
      return 0;
    }

    return data?.length ?? 0;
  }

  /**
   * Query events with filtering by type, entity, and time range.
   */
  static async listEvents(filters?: EventFilter): Promise<LogisticsEvent[]> {
    let query = supabase
      .from('logistics_events')
      .select('id, event_type, entity_type, entity_id, payload, created_at')
      .order('created_at', { ascending: false })
      .limit(filters?.limit ?? 50);

    if (filters?.event_type) {
      query = query.eq('event_type', filters.event_type);
    }
    if (filters?.entity_type) {
      query = query.eq('entity_type', filters.entity_type);
    }
    if (filters?.entity_id) {
      query = query.eq('entity_id', filters.entity_id);
    }
    if (filters?.since) {
      query = query.gte('created_at', filters.since);
    }
    if (filters?.until) {
      query = query.lte('created_at', filters.until);
    }

    const { data, error } = await query;
    if (error) throw new Error(`listEvents failed: ${error.message}`);
    return (data ?? []) as unknown as LogisticsEvent[];
  }

  /**
   * Get the latest N events for admin dashboard.
   */
  static async getRecentEvents(limit = 20): Promise<LogisticsEvent[]> {
    return this.listEvents({ limit });
  }

  /**
   * Get event counts grouped by type for a time range.
   */
  static async getEventCounts(
    since?: string
  ): Promise<Record<string, number>> {
    let query = supabase
      .from('logistics_events')
      .select('event_type');

    if (since) {
      query = query.gte('created_at', since);
    }

    const { data, error } = await query;
    if (error) throw new Error(`getEventCounts failed: ${error.message}`);

    const counts: Record<string, number> = {};
    for (const row of (data ?? []) as Array<{ event_type: string }>) {
      counts[row.event_type] = (counts[row.event_type] ?? 0) + 1;
    }
    return counts;
  }
}
