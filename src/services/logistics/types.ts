/**
 * Unified Logistics Domain — TypeScript type definitions.
 *
 * These types mirror the new database tables introduced by the
 * unified logistics engine migration. They are used by the
 * internal service layer and will eventually be superseded by
 * auto-generated types once `supabase gen types` is re-run.
 *
 * After applying the unified logistics migrations, regenerate
 * the auto-generated Supabase types with:
 *
 *   supabase gen types typescript --local > src/integrations/supabase/types.ts
 */

// ── Enums ──────────────────────────────────────────────────

export type ShipmentSourceType = 'farmer' | 'buyer' | 'vendor' | 'admin';

export type ShipmentType = 'farm_produce' | 'agri_input' | 'general_goods' | 'return_goods';

export type ShipmentStatus =
  | 'draft'
  | 'pending'
  | 'pooled'
  | 'booked'
  | 'in_transit'
  | 'delivered'
  | 'completed'
  | 'cancelled';

export type LoadPoolStatus = 'open' | 'filling' | 'full' | 'dispatched' | 'cancelled';

export type UnifiedTripStatus =
  | 'planned'
  | 'assigned'
  | 'accepted'
  | 'en_route'
  | 'pickup_done'
  | 'in_transit'
  | 'delivered'
  | 'completed'
  | 'cancelled';

export type TripDirection = 'forward' | 'return' | 'mixed';

export type BookingStatus = 'tentative' | 'confirmed' | 'in_transit' | 'delivered' | 'cancelled';

export type ReverseCandidateStatus = 'identified' | 'offered' | 'accepted' | 'expired' | 'cancelled';

export type TripLegType = 'pickup' | 'drop' | 'waypoint';

export type RouteClusterType = 'district' | 'taluk' | 'village_cluster' | 'market_corridor';

// ── Table Row Types ────────────────────────────────────────

export interface RouteCluster {
  id: string;
  cluster_type: RouteClusterType;
  origin_district_id: string | null;
  dest_district_id: string | null;
  origin_market_id: string | null;
  dest_market_id: string | null;
  label: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ShipmentRequest {
  id: string;
  request_source_type: ShipmentSourceType;
  source_actor_id: string;
  shipment_type: ShipmentType;
  pickup_location: string | null;
  drop_location: string | null;
  pickup_geo_lat: number | null;
  pickup_geo_long: number | null;
  drop_geo_lat: number | null;
  drop_geo_long: number | null;
  origin_district_id: string | null;
  dest_district_id: string | null;
  origin_market_id: string | null;
  dest_market_id: string | null;
  route_cluster_id: string | null;
  pickup_time_window_start: string | null;
  pickup_time_window_end: string | null;
  delivery_time_window_start: string | null;
  delivery_time_window_end: string | null;
  weight_estimate_kg: number | null;
  volume_estimate_cbm: number | null;
  status: ShipmentStatus;
  priority: number;
  notes: string | null;
  legacy_transport_request_id: string | null;
  legacy_market_order_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface ShipmentItem {
  id: string;
  shipment_request_id: string;
  product_name: string;
  category: string | null;
  quantity: number;
  unit: string;
  weight_kg: number | null;
  legacy_crop_id: string | null;
  created_at: string;
}

export interface LoadPool {
  id: string;
  route_cluster_id: string | null;
  origin_district_id: string | null;
  dest_district_id: string | null;
  total_weight_kg: number;
  total_volume_cbm: number;
  capacity_target_kg: number | null;
  status: LoadPoolStatus;
  dispatch_window_start: string | null;
  dispatch_window_end: string | null;
  created_at: string;
  updated_at: string;
}

export interface LoadPoolMember {
  id: string;
  load_pool_id: string;
  shipment_request_id: string;
  added_at: string;
}

export interface UnifiedTrip {
  id: string;
  vehicle_id: string | null;
  driver_id: string | null;
  transporter_id: string | null;
  trip_status: UnifiedTripStatus;
  trip_direction: TripDirection;
  start_location: string | null;
  end_location: string | null;
  start_geo_lat: number | null;
  start_geo_long: number | null;
  end_geo_lat: number | null;
  end_geo_long: number | null;
  capacity_total_kg: number | null;
  capacity_used_kg: number;
  capacity_total_cbm: number | null;
  capacity_used_cbm: number;
  planned_start_at: string | null;
  planned_end_at: string | null;
  actual_start_at: string | null;
  actual_end_at: string | null;
  estimated_earnings_inr: number;
  actual_earnings_inr: number;
  legacy_trip_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface TripLeg {
  id: string;
  unified_trip_id: string;
  sequence_order: number;
  leg_type: TripLegType;
  location_name: string | null;
  geo_lat: number | null;
  geo_long: number | null;
  district_id: string | null;
  shipment_request_id: string | null;
  estimated_arrival_at: string | null;
  actual_arrival_at: string | null;
  status: string;
  created_at: string;
}

export interface VehicleCapacityBlock {
  id: string;
  unified_trip_id: string;
  remaining_weight_kg: number;
  remaining_volume_cbm: number | null;
  available_from: string | null;
  available_until: string | null;
  created_at: string;
  updated_at: string;
}

export interface ReverseLoadCandidate {
  id: string;
  unified_trip_id: string;
  route_cluster_id: string | null;
  origin_district_id: string | null;
  dest_district_id: string | null;
  available_capacity_kg: number | null;
  available_capacity_cbm: number | null;
  candidate_score: number;
  status: ReverseCandidateStatus;
  shipment_request_id: string | null;
  expires_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface ShipmentBooking {
  id: string;
  shipment_request_id: string;
  unified_trip_id: string;
  booking_status: BookingStatus;
  confirmed_at: string | null;
  weight_allocated_kg: number | null;
  volume_allocated_cbm: number | null;
  created_at: string;
  updated_at: string;
}

// ── RPC Input / Output Shapes ──────────────────────────────

export interface CreateShipmentRequestParams {
  request_source_type: ShipmentSourceType;
  source_actor_id: string;
  shipment_type?: ShipmentType;
  pickup_location?: string;
  drop_location?: string;
  pickup_geo_lat?: number;
  pickup_geo_long?: number;
  drop_geo_lat?: number;
  drop_geo_long?: number;
  origin_district_id?: string;
  dest_district_id?: string;
  origin_market_id?: string;
  dest_market_id?: string;
  pickup_time_window_start?: string;
  pickup_time_window_end?: string;
  delivery_time_window_start?: string;
  delivery_time_window_end?: string;
  weight_estimate_kg?: number;
  volume_estimate_cbm?: number;
  priority?: number;
  notes?: string;
  items?: CreateShipmentItemParams[];
}

export interface CreateShipmentItemParams {
  product_name: string;
  category?: string;
  quantity: number;
  unit?: string;
  weight_kg?: number;
  legacy_crop_id?: string;
}

export interface CreateUnifiedTripParams {
  vehicle_id?: string;
  driver_id?: string;
  transporter_id?: string;
  trip_status?: UnifiedTripStatus;
  trip_direction?: TripDirection;
  start_location?: string;
  end_location?: string;
  start_geo_lat?: number;
  start_geo_long?: number;
  end_geo_lat?: number;
  end_geo_long?: number;
  capacity_total_kg?: number;
  capacity_total_cbm?: number;
  planned_start_at?: string;
  planned_end_at?: string;
  legs?: CreateTripLegParams[];
}

export interface CreateTripLegParams {
  sequence_order?: number;
  leg_type?: TripLegType;
  location_name?: string;
  geo_lat?: number;
  geo_long?: number;
  district_id?: string;
  shipment_request_id?: string;
  estimated_arrival_at?: string;
}

// ── Phase 2: Orchestration Engine Types ─────────────────────

export type LogisticsEventType =
  | 'shipment_created'
  | 'load_pool_created'
  | 'load_pool_filled'
  | 'trip_generated'
  | 'shipment_assigned'
  | 'capacity_allocated'
  | 'capacity_released'
  | 'matching_run_started'
  | 'matching_run_completed'
  | 'reverse_candidate_created'
  | 'reverse_candidate_offered'
  | 'reverse_candidate_accepted'
  | 'reverse_candidate_expired'
  | 'reverse_load_matched'
  | 'recommendation_generated'
  | 'recommendation_accepted'
  | 'recommendation_rejected';

export type MatchingRunStatus = 'running' | 'completed' | 'failed';

export interface LogisticsEvent {
  id: string;
  event_type: LogisticsEventType;
  entity_type: string;
  entity_id: string;
  payload: Record<string, unknown>;
  created_at: string;
}

export interface MatchingRun {
  id: string;
  status: MatchingRunStatus;
  shipments_processed: number;
  pools_created: number;
  trips_generated: number;
  bookings_created: number;
  started_at: string;
  completed_at: string | null;
  error_message: string | null;
  created_at: string;
}

export interface MatchingConfig {
  min_pool_weight_kg: number;
  max_pool_weight_kg: number;
  min_pool_members: number;
  pickup_window_hours: number;
  vehicle_utilization_threshold: number;
}

export const DEFAULT_MATCHING_CONFIG: MatchingConfig = {
  min_pool_weight_kg: 200,
  max_pool_weight_kg: 10000,
  min_pool_members: 1,
  pickup_window_hours: 24,
  vehicle_utilization_threshold: 0.3,
};

export interface MatchingResult {
  run_id: string;
  shipments_processed: number;
  pools_created: number;
  pools_filled: number;
  trips_generated: number;
  bookings_created: number;
  errors: string[];
  duration_ms: number;
}

export interface VehicleCandidate {
  vehicle_id: string;
  transporter_id: string;
  vehicle_type: string;
  capacity_kg: number;
  capacity_volume_cbm: number | null;
  registration_number: string;
  fit_score: number;
}

export interface CapacityAllocation {
  trip_id: string;
  weight_allocated_kg: number;
  volume_allocated_cbm: number | null;
  remaining_weight_kg: number;
  remaining_volume_cbm: number | null;
}

export interface ShipmentCluster {
  route_cluster_id: string;
  shipments: ShipmentRequest[];
  total_weight_kg: number;
  pickup_window_start: string | null;
  pickup_window_end: string | null;
}

export interface PoolReadiness {
  load_pool_id: string;
  is_ready: boolean;
  total_weight_kg: number;
  capacity_target_kg: number | null;
  member_count: number;
  weight_ratio: number;
}

// ── Phase 3: Reverse Logistics Engine Types ─────────────────

export interface ReverseMatchConfig {
  min_capacity_kg: number;
  max_candidates_per_trip: number;
  expiry_hours: number;
  score_threshold: number;
}

export const DEFAULT_REVERSE_MATCH_CONFIG: ReverseMatchConfig = {
  min_capacity_kg: 100,
  max_candidates_per_trip: 20,
  expiry_hours: 24,
  score_threshold: 10,
};

export interface ReverseMatchResult {
  trips_scanned: number;
  candidates_created: number;
  matches_made: number;
  bookings_created: number;
  errors: string[];
}

// ── Phase 6: Recommendation Engine Types ────────────────────

export type RecommendationStatus = 'pending' | 'accepted' | 'rejected' | 'expired';

export interface VehicleRecommendation extends VehicleCandidate {
  recommendation_id: string;
  load_pool_id: string;
  capacity_fit_score: number;
  route_match_score: number;
  price_score: number;
  reliability_score: number;
  reverse_load_score: number;
  recommendation_score: number;
  estimated_price_inr: number | null;
  distance_to_pickup_km: number | null;
  pool_weight_kg: number;
  vehicle_capacity_kg: number;
  status: RecommendationStatus;
  expires_at: string;
  created_at: string;
}

export interface LoadRecommendation {
  load_pool_id: string;
  route_cluster_id: string | null;
  origin_district_id: string | null;
  dest_district_id: string | null;
  total_weight_kg: number;
  capacity_target_kg: number | null;
  member_count: number;
  pickup_location: string | null;
  drop_location: string | null;
  capacity_fit_score: number;
  route_match_score: number;
  earnings_score: number;
  reverse_load_score: number;
  recommendation_score: number;
  estimated_earnings_inr: number | null;
}

export interface VehicleRecommendationRow {
  id: string;
  load_pool_id: string;
  vehicle_id: string;
  transporter_id: string;
  capacity_fit_score: number;
  route_match_score: number;
  price_score: number;
  reliability_score: number;
  reverse_load_score: number;
  recommendation_score: number;
  estimated_price_inr: number | null;
  distance_to_pickup_km: number | null;
  pool_weight_kg: number | null;
  vehicle_capacity_kg: number | null;
  status: RecommendationStatus;
  accepted_at: string | null;
  generated_trip_id: string | null;
  created_at: string;
  expires_at: string;
  updated_at: string;
}

export const RECOMMENDATION_WEIGHTS = {
  CAPACITY_FIT: 0.30,
  ROUTE_MATCH: 0.25,
  PRICE: 0.20,
  RELIABILITY: 0.15,
  REVERSE_LOAD: 0.10,
} as const;

export const DEFAULT_RECOMMENDATION_EXPIRY_HOURS = 24;
