/**
 * Route Cluster Utilities
 *
 * Pure helper functions for route clustering logic used by
 * load pooling, reverse logistics, and trip generation.
 *
 * These are stateless utilities — they do not call Supabase.
 * Service-level DB interactions live in RouteClusterService.
 *
 * Cluster hierarchy: village < village_cluster < taluk < district < market_corridor
 */

export type ClusterLevel = 'village' | 'village_cluster' | 'taluk' | 'district' | 'market_corridor';

export interface GeoPoint {
  lat: number;
  lng: number;
}

export interface ClusterCandidate {
  origin: string;
  destination: string;
  level: ClusterLevel;
}

const CLUSTER_LEVEL_ORDER: Record<ClusterLevel, number> = {
  village: 1,
  village_cluster: 2,
  taluk: 3,
  district: 4,
  market_corridor: 5,
};

/**
 * Build a cluster label from origin and destination names.
 * Convention: "Origin → Destination"
 */
export function buildClusterLabel(origin: string, destination: string): string {
  return `${origin.trim()} → ${destination.trim()}`;
}

/**
 * Determine the appropriate cluster level based on geographic distance.
 * Approximate distance thresholds for Karnataka:
 *   village: < 5 km
 *   village_cluster: 5-15 km
 *   taluk: 15-50 km
 *   district: 50-150 km
 *   market_corridor: > 150 km
 */
export function detectClusterLevel(distanceKm: number): ClusterLevel {
  if (distanceKm < 5) return 'village';
  if (distanceKm < 15) return 'village_cluster';
  if (distanceKm < 50) return 'taluk';
  if (distanceKm < 150) return 'district';
  return 'market_corridor';
}

/**
 * Calculate approximate distance between two geo points using Haversine formula.
 * Returns distance in kilometers.
 */
export function haversineDistanceKm(a: GeoPoint, b: GeoPoint): number {
  const R = 6371;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const sinLat = Math.sin(dLat / 2);
  const sinLng = Math.sin(dLng / 2);
  const h = sinLat * sinLat + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * sinLng * sinLng;
  return R * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

function toRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

/**
 * Check if two shipments are in the same route cluster.
 * Same cluster = same origin district AND same destination district.
 */
export function isSameCluster(
  a: { origin_district_id?: string | null; dest_district_id?: string | null },
  b: { origin_district_id?: string | null; dest_district_id?: string | null }
): boolean {
  if (!a.origin_district_id || !b.origin_district_id) return false;
  if (!a.dest_district_id || !b.dest_district_id) return false;
  return a.origin_district_id === b.origin_district_id && a.dest_district_id === b.dest_district_id;
}

/**
 * Check if a shipment's pickup time window overlaps with a reference window.
 * Returns true if there is any overlap.
 */
export function hasTimeWindowOverlap(
  shipment: { pickup_time_window_start?: string | null; pickup_time_window_end?: string | null },
  reference: { start: string; end: string }
): boolean {
  const sStart = shipment.pickup_time_window_start;
  const sEnd = shipment.pickup_time_window_end;

  if (!sStart || !sEnd) return true;

  const shipStart = new Date(sStart).getTime();
  const shipEnd = new Date(sEnd).getTime();
  const refStart = new Date(reference.start).getTime();
  const refEnd = new Date(reference.end).getTime();

  return shipStart <= refEnd && shipEnd >= refStart;
}

/**
 * Determine the reverse route label for a given forward cluster label.
 * "Kolar → Bangalore" becomes "Bangalore → Kolar"
 */
export function reverseClusterLabel(label: string): string {
  const parts = label.split('→').map((s) => s.trim());
  if (parts.length !== 2) return label;
  return `${parts[1]} → ${parts[0]}`;
}

/**
 * Compare two cluster levels.
 * Returns negative if a < b, zero if equal, positive if a > b.
 */
export function compareClusterLevels(a: ClusterLevel, b: ClusterLevel): number {
  return CLUSTER_LEVEL_ORDER[a] - CLUSTER_LEVEL_ORDER[b];
}

/**
 * Score a shipment's poolability based on weight.
 * Small loads get higher poolability scores (they benefit more from pooling).
 * Score range: 0.0 (no benefit) to 1.0 (maximum benefit).
 */
export function poolabilityScore(weightKg: number, vehicleCapacityKg: number): number {
  if (vehicleCapacityKg <= 0 || weightKg <= 0) return 0;
  if (weightKg >= vehicleCapacityKg) return 0;
  return 1 - weightKg / vehicleCapacityKg;
}
