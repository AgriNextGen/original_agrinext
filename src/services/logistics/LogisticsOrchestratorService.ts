/**
 * LogisticsOrchestratorService
 *
 * Responsible for creating shipment requests, grouping into load pools,
 * generating trip suggestions, and linking shipments to trips.
 *
 * Internal service — not exposed to frontend in Phase 1.
 * Calls unified logistics RPCs via Supabase client.
 */
import { supabase } from '@/integrations/supabase/client';
import type {
  CreateShipmentRequestParams,
  ShipmentRequest,
  ShipmentItem,
  ShipmentBooking,
} from './types';

export class LogisticsOrchestratorService {
  /**
   * Create a new shipment request with optional items.
   * Auto-detects route cluster from origin/dest districts.
   */
  static async createShipmentRequest(
    params: CreateShipmentRequestParams
  ): Promise<{ shipment_request_id: string; route_cluster_id: string | null }> {
    const { data, error } = await supabase.rpc('create_shipment_request_v1', {
      p_params: params as unknown as Record<string, unknown>,
    });

    if (error) throw new Error(`create_shipment_request failed: ${error.message}`);
    return data as { shipment_request_id: string; route_cluster_id: string | null };
  }

  /**
   * Get a shipment request by ID with its items and bookings.
   */
  static async getShipmentRequest(
    shipmentId: string
  ): Promise<ShipmentRequest & { items: ShipmentItem[]; bookings: ShipmentBooking[] }> {
    const { data: shipment, error: srErr } = await supabase
      .from('shipment_requests')
      .select('*')
      .eq('id', shipmentId)
      .maybeSingle();

    if (srErr) throw new Error(`getShipmentRequest query failed: ${srErr.message}`);
    if (!shipment) throw new Error('Shipment not found');

    const { data: items } = await supabase
      .from('shipment_items')
      .select('*')
      .eq('shipment_request_id', shipmentId);

    const { data: bookings } = await supabase
      .from('shipment_bookings')
      .select('*')
      .eq('shipment_request_id', shipmentId);

    return {
      ...(shipment as unknown as ShipmentRequest),
      items: (items ?? []) as unknown as ShipmentItem[],
      bookings: (bookings ?? []) as unknown as ShipmentBooking[],
    };
  }

  /**
   * Create a load pool for a route cluster.
   */
  static async createLoadPool(params: {
    route_cluster_id: string;
    capacity_target_kg: number;
    dispatch_window?: { start: string; end: string };
  }): Promise<{ load_pool_id: string }> {
    const { data, error } = await supabase.rpc('create_load_pool_v1', {
      p_route_cluster_id: params.route_cluster_id,
      p_capacity_target_kg: params.capacity_target_kg,
      p_dispatch_window: params.dispatch_window ?? null,
    });

    if (error) throw new Error(`create_load_pool failed: ${error.message}`);
    return data as { load_pool_id: string };
  }

  /**
   * Add a shipment to a load pool.
   */
  static async addShipmentToPool(
    shipmentRequestId: string,
    loadPoolId: string
  ): Promise<{ success: boolean; load_pool_id: string }> {
    const { data, error } = await supabase.rpc('add_shipment_to_pool_v1', {
      p_shipment_request_id: shipmentRequestId,
      p_load_pool_id: loadPoolId,
    });

    if (error) throw new Error(`add_shipment_to_pool failed: ${error.message}`);
    return data as { success: boolean; load_pool_id: string };
  }

  /**
   * Book a shipment to a unified trip.
   */
  static async bookShipmentToTrip(
    shipmentRequestId: string,
    unifiedTripId: string
  ): Promise<{ booking_id: string; capacity_used_kg: number; capacity_remaining_kg: number | null }> {
    const { data, error } = await supabase.rpc('book_shipment_to_trip_v1', {
      p_shipment_request_id: shipmentRequestId,
      p_unified_trip_id: unifiedTripId,
    });

    if (error) throw new Error(`book_shipment_to_trip failed: ${error.message}`);
    return data as { booking_id: string; capacity_used_kg: number; capacity_remaining_kg: number | null };
  }

  /**
   * List pending shipment requests, optionally filtered by route cluster.
   */
  static async listPendingShipments(params?: {
    route_cluster_id?: string;
    limit?: number;
  }): Promise<ShipmentRequest[]> {
    let query = supabase
      .from('shipment_requests')
      .select('*')
      .eq('status', 'pending')
      .order('created_at', { ascending: false })
      .limit(params?.limit ?? 50);

    if (params?.route_cluster_id) {
      query = query.eq('route_cluster_id', params.route_cluster_id);
    }

    const { data, error } = await query;
    if (error) throw new Error(`listPendingShipments failed: ${error.message}`);
    return (data ?? []) as unknown as ShipmentRequest[];
  }
}
