/**
 * ReverseLogisticsService
 *
 * Detects return vehicle capacity, generates reverse load candidates,
 * manages candidate lifecycle (offer/accept/decline/expire), and
 * matches vendor/agri-input shipments to return routes.
 *
 * Phase 1: findCandidates, listCandidates, getEligibleReturnTrips
 * Phase 3: offerCandidate, acceptCandidate, declineCandidate,
 *          expireCandidates, scanAndMatch, matchVendorShipments,
 *          getOpportunities
 */
import { supabase } from '@/integrations/supabase/client';
import type {
  ReverseLoadCandidate,
  ReverseMatchResult,
  ShipmentRequest,
} from './types';
import { DEFAULT_REVERSE_MATCH_CONFIG } from './types';
import { LogisticsEventService } from './LogisticsEventService';

export class ReverseLogisticsService {
  /**
   * Find reverse load candidates for a completed or in-transit trip.
   * Scans pending shipments near the trip's end location.
   */
  static async findCandidates(
    unifiedTripId: string
  ): Promise<{
    candidates: Array<{
      candidate_id: string;
      shipment_request_id: string;
      score: number;
      weight_estimate_kg: number | null;
    }>;
    count: number;
    remaining_capacity_kg: number;
  }> {
    const { data, error } = await supabase.rpc('find_reverse_load_candidates_v1', {
      p_unified_trip_id: unifiedTripId,
    });

    if (error) throw new Error(`find_reverse_load_candidates failed: ${error.message}`);
    return data as {
      candidates: Array<{
        candidate_id: string;
        shipment_request_id: string;
        score: number;
        weight_estimate_kg: number | null;
      }>;
      count: number;
      remaining_capacity_kg: number;
    };
  }

  /**
   * List existing reverse load candidates for a trip.
   */
  static async listCandidates(
    unifiedTripId: string,
    statusFilter?: string
  ): Promise<ReverseLoadCandidate[]> {
    let query = supabase
      .from('reverse_load_candidates')
      .select('*')
      .eq('unified_trip_id', unifiedTripId)
      .order('candidate_score', { ascending: false });

    if (statusFilter) {
      query = query.eq('status', statusFilter);
    }

    const { data, error } = await query;
    if (error) throw new Error(`listCandidates failed: ${error.message}`);
    return (data ?? []) as unknown as ReverseLoadCandidate[];
  }

  /**
   * Get trips that have completed delivery and still have remaining capacity,
   * making them eligible for reverse loads.
   */
  static async getEligibleReturnTrips(params?: {
    min_remaining_kg?: number;
    limit?: number;
  }): Promise<Array<{ trip_id: string; remaining_kg: number; end_location: string | null }>> {
    const minKg = params?.min_remaining_kg ?? 0;

    let query = supabase
      .from('unified_trips')
      .select('id, capacity_total_kg, capacity_used_kg, end_location')
      .in('trip_status', ['delivered', 'completed'])
      .not('capacity_total_kg', 'is', null)
      .order('updated_at', { ascending: false })
      .limit(params?.limit ?? 20);

    if (minKg > 0) {
      query = query.gte('capacity_total_kg', minKg);
    }

    const { data, error } = await query;

    if (error) throw new Error(`getEligibleReturnTrips failed: ${error.message}`);

    return (data ?? [])
      .map((t: { id: string; capacity_total_kg: number | null; capacity_used_kg: number; end_location: string | null }) => ({
        trip_id: t.id,
        remaining_kg: (t.capacity_total_kg ?? 0) - (t.capacity_used_kg ?? 0),
        end_location: t.end_location,
      }))
      .filter((t) => t.remaining_kg > minKg);
  }

  // ── Phase 3: Reverse Logistics Engine ───────────────────────

  /**
   * Offer a reverse load candidate to a transport partner.
   * Transitions status: identified -> offered.
   */
  static async offerCandidate(
    candidateId: string
  ): Promise<{ candidate_id: string; status: string; unified_trip_id: string; shipment_request_id: string | null }> {
    const { data, error } = await supabase.rpc('offer_reverse_candidate_v1', {
      p_candidate_id: candidateId,
    });

    if (error) throw new Error(`offerCandidate failed: ${error.message}`);

    const result = data as { candidate_id: string; status: string; unified_trip_id: string; shipment_request_id: string | null };

    await LogisticsEventService.emit({
      event_type: 'reverse_candidate_offered',
      entity_type: 'reverse_load_candidate',
      entity_id: candidateId,
      payload: { unified_trip_id: result.unified_trip_id, shipment_request_id: result.shipment_request_id },
    });

    return result;
  }

  /**
   * Accept a reverse load candidate — creates booking and updates capacity.
   * Transitions status: offered -> accepted.
   * If the candidate has expired, the RPC persists the expiry and returns
   * a structured error instead of raising an exception.
   */
  static async acceptCandidate(
    candidateId: string
  ): Promise<{ candidate_id: string; status: string; booking_id: string | null; weight_allocated_kg: number; unified_trip_id: string; shipment_request_id: string | null }> {
    const { data, error } = await supabase.rpc('accept_reverse_candidate_v1', {
      p_candidate_id: candidateId,
    });

    if (error) throw new Error(`acceptCandidate failed: ${error.message}`);

    const result = data as { candidate_id: string; status: string; booking_id: string | null; weight_allocated_kg: number; unified_trip_id: string; shipment_request_id: string | null; error?: string };

    if (result.error === 'CANDIDATE_EXPIRED') {
      await LogisticsEventService.emit({
        event_type: 'reverse_candidate_expired',
        entity_type: 'reverse_load_candidate',
        entity_id: candidateId,
        payload: { unified_trip_id: result.unified_trip_id, expired_during: 'accept' },
      });
      throw new Error(`acceptCandidate failed: CANDIDATE_EXPIRED`);
    }

    await LogisticsEventService.emit({
      event_type: 'reverse_candidate_accepted',
      entity_type: 'reverse_load_candidate',
      entity_id: candidateId,
      payload: {
        booking_id: result.booking_id,
        weight_allocated_kg: result.weight_allocated_kg,
        unified_trip_id: result.unified_trip_id,
        shipment_request_id: result.shipment_request_id,
      },
    });

    return result;
  }

  /**
   * Decline a reverse load candidate.
   * Transitions status: identified|offered -> cancelled.
   */
  static async declineCandidate(
    candidateId: string
  ): Promise<{ candidate_id: string; status: string }> {
    const { data, error } = await supabase.rpc('decline_reverse_candidate_v1', {
      p_candidate_id: candidateId,
    });

    if (error) throw new Error(`declineCandidate failed: ${error.message}`);
    return data as { candidate_id: string; status: string };
  }

  /**
   * Expire all stale reverse load candidates past their expiry window.
   */
  static async expireCandidates(): Promise<{ expired_count: number }> {
    const { data, error } = await supabase.rpc('expire_reverse_candidates_v1');

    if (error) throw new Error(`expireCandidates failed: ${error.message}`);

    const result = data as { expired_count: number };

    if (result.expired_count > 0) {
      await LogisticsEventService.emit({
        event_type: 'reverse_candidate_expired',
        entity_type: 'reverse_load_candidate',
        entity_id: 'bulk',
        payload: { expired_count: result.expired_count },
      });
    }

    return result;
  }

  /**
   * Full reverse logistics scan: find eligible trips, generate candidates,
   * and attempt to match vendor/agri-input shipments.
   */
  static async scanAndMatch(): Promise<ReverseMatchResult> {
    const errors: string[] = [];
    let tripsScanned = 0;
    let candidatesCreated = 0;
    let matchesMade = 0;
    let bookingsCreated = 0;

    try {
      await this.expireCandidates();
    } catch (err) {
      errors.push(`Expiry: ${String(err)}`);
    }

    const eligibleTrips = await this.getEligibleReturnTrips({
      min_remaining_kg: DEFAULT_REVERSE_MATCH_CONFIG.min_capacity_kg,
      limit: 50,
    });

    for (const trip of eligibleTrips) {
      tripsScanned++;
      try {
        const result = await this.findCandidates(trip.trip_id);
        candidatesCreated += result.count;

        for (const candidate of (result.candidates ?? [])) {
          if (candidate.score >= DEFAULT_REVERSE_MATCH_CONFIG.score_threshold) {
            matchesMade++;

            try {
              await this.offerCandidate(candidate.candidate_id);
            } catch {
              // Offer may fail if candidate was already processed
            }

            await LogisticsEventService.emit({
              event_type: 'reverse_load_matched',
              entity_type: 'reverse_load_candidate',
              entity_id: candidate.candidate_id,
              payload: {
                trip_id: trip.trip_id,
                shipment_request_id: candidate.shipment_request_id,
                score: candidate.score,
                weight_estimate_kg: candidate.weight_estimate_kg,
              },
            });
          }
        }

        // Also scan for vendor/agri-input shipments for this trip
        try {
          await this.matchVendorShipments(trip.trip_id);
        } catch {
          // Non-fatal: vendor matching is supplementary
        }
      } catch (err) {
        errors.push(`Trip ${trip.trip_id}: ${String(err)}`);
      }
    }

    return {
      trips_scanned: tripsScanned,
      candidates_created: candidatesCreated,
      matches_made: matchesMade,
      bookings_created: bookingsCreated,
      errors,
    };
  }

  /**
   * Find pending vendor/agri-input shipments whose origin matches
   * a trip's end location district. Scores by weight fit.
   */
  static async matchVendorShipments(
    tripId: string
  ): Promise<Array<{ shipment_id: string; score: number; weight_kg: number | null }>> {
    const { data: trip, error: tripErr } = await supabase
      .from('unified_trips')
      .select('id, capacity_total_kg, capacity_used_kg, end_location')
      .eq('id', tripId)
      .maybeSingle();

    if (tripErr) throw new Error(`matchVendorShipments trip query failed: ${tripErr.message}`);
    if (!trip) throw new Error('Trip not found');

    const t = trip as { id: string; capacity_total_kg: number | null; capacity_used_kg: number; end_location: string | null };
    const remainingKg = (t.capacity_total_kg ?? 0) - (t.capacity_used_kg ?? 0);
    if (remainingKg <= 0) return [];

    const { data: legs, error: legErr } = await supabase
      .from('trip_legs')
      .select('district_id')
      .eq('unified_trip_id', tripId)
      .eq('leg_type', 'drop')
      .not('district_id', 'is', null);

    if (legErr) throw new Error(`matchVendorShipments legs query failed: ${legErr.message}`);

    const dropDistricts = [...new Set(
      (legs ?? []).map((l: { district_id: string | null }) => l.district_id).filter(Boolean)
    )] as string[];

    if (dropDistricts.length === 0) return [];

    const { data: shipments, error: shipErr } = await supabase
      .from('shipment_requests')
      .select('id, weight_estimate_kg, shipment_type, origin_district_id')
      .eq('status', 'pending')
      .in('shipment_type', ['agri_input', 'general_goods', 'return_goods'])
      .in('origin_district_id', dropDistricts)
      .order('weight_estimate_kg', { ascending: false })
      .limit(20);

    if (shipErr) throw new Error(`matchVendorShipments shipments query failed: ${shipErr.message}`);

    return (shipments ?? []).map((s: { id: string; weight_estimate_kg: number | null }) => {
      const weight = s.weight_estimate_kg ?? 0;
      const score = remainingKg > 0 ? Math.min((weight / remainingKg) * 100, 100) : 0;
      return { shipment_id: s.id, score: Math.round(score * 100) / 100, weight_kg: s.weight_estimate_kg };
    });
  }

  /**
   * List active reverse load opportunities for transport partners.
   * Returns identified and offered candidates with trip context.
   */
  static async getOpportunities(params?: {
    status?: string;
    route_cluster_id?: string;
    limit?: number;
  }): Promise<ReverseLoadCandidate[]> {
    let query = supabase
      .from('reverse_load_candidates')
      .select('*')
      .in('status', params?.status ? [params.status] : ['identified', 'offered'])
      .order('candidate_score', { ascending: false })
      .limit(params?.limit ?? 50);

    if (params?.route_cluster_id) {
      query = query.eq('route_cluster_id', params.route_cluster_id);
    }

    const { data, error } = await query;
    if (error) throw new Error(`getOpportunities failed: ${error.message}`);
    return (data ?? []) as unknown as ReverseLoadCandidate[];
  }
}
