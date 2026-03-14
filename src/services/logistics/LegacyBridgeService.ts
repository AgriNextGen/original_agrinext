/**
 * LegacyBridgeService
 *
 * Maps legacy transport_requests and trips to the new unified
 * logistics domain. Provides utilities for querying the bridge
 * relationships and verifying sync state.
 *
 * Internal service — not exposed to frontend in Phase 1.
 * The actual bridging happens via DB triggers (see migration
 * 202603141200_phase_unified_logistics_bridge_rpcs.sql).
 * This service provides a programmatic interface for the same.
 */
import { supabase } from '@/integrations/supabase/client';
import type { ShipmentRequest, UnifiedTrip } from './types';

export class LegacyBridgeService {
  /**
   * Manually bridge a legacy transport_request to a shipment_request.
   * Normally this happens automatically via DB trigger, but this
   * can be used for backfilling or recovery.
   */
  static async bridgeTransportRequest(
    transportRequestId: string
  ): Promise<{ shipment_request_id: string; already_exists: boolean }> {
    const { data, error } = await supabase.rpc('bridge_transport_request_to_shipment_v1', {
      p_transport_request_id: transportRequestId,
    });

    if (error) throw new Error(`bridge_transport_request failed: ${error.message}`);
    return data as { shipment_request_id: string; already_exists: boolean };
  }

  /**
   * Manually bridge a legacy trip to a unified_trip.
   * Normally this happens automatically via DB trigger.
   */
  static async bridgeTrip(
    tripId: string
  ): Promise<{ unified_trip_id: string; already_exists: boolean }> {
    const { data, error } = await supabase.rpc('bridge_trip_to_unified_trip_v1', {
      p_trip_id: tripId,
    });

    if (error) throw new Error(`bridge_trip failed: ${error.message}`);
    return data as { unified_trip_id: string; already_exists: boolean };
  }

  /**
   * Find the shipment_request linked to a legacy transport_request.
   */
  static async getShipmentForTransportRequest(
    transportRequestId: string
  ): Promise<ShipmentRequest | null> {
    const { data, error } = await supabase
      .from('shipment_requests')
      .select('*')
      .eq('legacy_transport_request_id', transportRequestId)
      .maybeSingle();

    if (error) throw new Error(`getShipmentForTransportRequest failed: ${error.message}`);
    return data as unknown as ShipmentRequest | null;
  }

  /**
   * Find the unified_trip linked to a legacy trip.
   */
  static async getUnifiedTripForLegacyTrip(
    legacyTripId: string
  ): Promise<UnifiedTrip | null> {
    const { data, error } = await supabase
      .from('unified_trips')
      .select('*')
      .eq('legacy_trip_id', legacyTripId)
      .maybeSingle();

    if (error) throw new Error(`getUnifiedTripForLegacyTrip failed: ${error.message}`);
    return data as unknown as UnifiedTrip | null;
  }

  /**
   * Check sync health: count legacy records without unified counterparts.
   * Useful for monitoring and alerting.
   */
  static async checkSyncHealth(): Promise<{
    transport_requests_total: number;
    transport_requests_bridged: number;
    transport_requests_unlinked: number;
    trips_total: number;
    trips_bridged: number;
    trips_unlinked: number;
  }> {
    const [trTotal, trBridged, tripsTotal, tripsBridged] = await Promise.all([
      supabase.from('transport_requests').select('id', { count: 'exact', head: true }),
      supabase.from('shipment_requests').select('id', { count: 'exact', head: true })
        .not('legacy_transport_request_id', 'is', null),
      supabase.from('trips').select('id', { count: 'exact', head: true }),
      supabase.from('unified_trips').select('id', { count: 'exact', head: true })
        .not('legacy_trip_id', 'is', null),
    ]);

    const trTotalCount = trTotal.count ?? 0;
    const trBridgedCount = trBridged.count ?? 0;
    const tripsTotalCount = tripsTotal.count ?? 0;
    const tripsBridgedCount = tripsBridged.count ?? 0;

    return {
      transport_requests_total: trTotalCount,
      transport_requests_bridged: trBridgedCount,
      transport_requests_unlinked: trTotalCount - trBridgedCount,
      trips_total: tripsTotalCount,
      trips_bridged: tripsBridgedCount,
      trips_unlinked: tripsTotalCount - tripsBridgedCount,
    };
  }
}
