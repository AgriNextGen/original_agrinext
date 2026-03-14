import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { useLanguage } from '@/hooks/useLanguage';
import { toast } from 'sonner';
import { TripManagementService } from '@/services/logistics/TripManagementService';
import { ReverseLogisticsService } from '@/services/logistics/ReverseLogisticsService';
import { VehicleCapacityService } from '@/services/logistics/VehicleCapacityService';
import type {
  UnifiedTrip,
  TripDirection,
  UnifiedTripStatus,
} from '@/services/logistics/types';

// ── Unified Trips ─────────────────────────────────────────────

export function useUnifiedTrips(params?: {
  status?: UnifiedTripStatus;
  direction?: TripDirection;
  limit?: number;
}) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['unified-trips', user?.id, params?.status, params?.direction, params?.limit],
    queryFn: async () => {
      if (!user?.id) return [];
      return TripManagementService.listTrips({
        transporter_id: user.id,
        status: params?.status,
        direction: params?.direction,
        limit: params?.limit ?? 50,
      });
    },
    enabled: !!user?.id,
  });
}

export function useUnifiedTripDetail(tripId: string | undefined) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['unified-trip-detail', tripId],
    queryFn: async () => {
      if (!tripId) return null;
      return TripManagementService.getTripDetail(tripId);
    },
    enabled: !!tripId && !!user?.id,
  });
}

// ── Active unified trips (status-based convenience hooks) ─────

const ACTIVE_STATUSES: UnifiedTripStatus[] = ['assigned', 'accepted', 'en_route', 'pickup_done', 'in_transit'];
const COMPLETED_STATUSES: UnifiedTripStatus[] = ['delivered', 'completed'];

export function useActiveUnifiedTrips() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['unified-trips-active', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const trips = await TripManagementService.listTrips({
        transporter_id: user.id,
        limit: 100,
      });
      return trips.filter((t) => ACTIVE_STATUSES.includes(t.trip_status));
    },
    enabled: !!user?.id,
  });
}

export function useCompletedUnifiedTrips() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['unified-trips-completed', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const trips = await TripManagementService.listTrips({
        transporter_id: user.id,
        limit: 100,
      });
      return trips.filter((t) => COMPLETED_STATUSES.includes(t.trip_status));
    },
    enabled: !!user?.id,
  });
}

// ── Reverse Load Opportunities ───────────────────────────────

export function useReverseLoadOpportunities(params?: {
  status?: string;
  route_cluster_id?: string;
  limit?: number;
}) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['reverse-loads', user?.id, params?.status, params?.route_cluster_id],
    queryFn: async () => {
      return ReverseLogisticsService.getOpportunities({
        status: params?.status,
        route_cluster_id: params?.route_cluster_id,
        limit: params?.limit ?? 50,
      });
    },
    enabled: !!user?.id,
  });
}

export function useAcceptReverseLoad() {
  const queryClient = useQueryClient();
  const { t } = useLanguage();

  return useMutation({
    mutationFn: async (candidateId: string) => {
      return ReverseLogisticsService.acceptCandidate(candidateId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reverse-loads'] });
      queryClient.invalidateQueries({ queryKey: ['unified-trips'] });
      queryClient.invalidateQueries({ queryKey: ['unified-trips-active'] });
      queryClient.invalidateQueries({ queryKey: ['vehicle-capacity'] });
      toast.success(t('hookToasts.unifiedLogistics.reverseAccepted'));
    },
    onError: (error: Error) => {
      if (error.message.includes('CANDIDATE_EXPIRED')) {
        toast.error(t('hookToasts.unifiedLogistics.reverseExpired'));
      } else {
        toast.error(t('hookToasts.unifiedLogistics.reverseFailed') + ': ' + error.message);
      }
    },
  });
}

export function useDeclineReverseLoad() {
  const queryClient = useQueryClient();
  const { t } = useLanguage();

  return useMutation({
    mutationFn: async (candidateId: string) => {
      return ReverseLogisticsService.declineCandidate(candidateId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reverse-loads'] });
      toast.success(t('hookToasts.unifiedLogistics.reverseDeclined'));
    },
    onError: (error: Error) => {
      toast.error(t('hookToasts.unifiedLogistics.reverseFailed') + ': ' + error.message);
    },
  });
}

// ── Vehicle Capacity ──────────────────────────────────────────

export function useVehicleCapacity(tripId: string | undefined) {
  return useQuery({
    queryKey: ['vehicle-capacity', tripId],
    queryFn: async () => {
      if (!tripId) return null;
      return VehicleCapacityService.getCapacityBlock(tripId);
    },
    enabled: !!tripId,
  });
}

export function useAllTripsCapacity() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['all-trips-capacity', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const trips = await TripManagementService.listTrips({
        transporter_id: user.id,
        limit: 100,
      });
      const activeTrips = trips.filter((t) => ACTIVE_STATUSES.includes(t.trip_status));

      return Promise.all(
        activeTrips.map(async (trip) => ({
          trip,
          capacityBlock: await VehicleCapacityService.getCapacityBlock(trip.id),
        }))
      );
    },
    enabled: !!user?.id,
  });
}

// ── Transport Earnings ────────────────────────────────────────

export interface EarningsSummary {
  forwardEarnings: number;
  reverseEarnings: number;
  combinedEarnings: number;
  tripCount: number;
  trips: Array<{
    id: string;
    direction: TripDirection;
    status: UnifiedTripStatus;
    estimated: number;
    actual: number;
    start_location: string | null;
    end_location: string | null;
    completed_at: string | null;
  }>;
}

export function useTransportEarnings() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['transport-earnings', user?.id],
    queryFn: async (): Promise<EarningsSummary> => {
      if (!user?.id) {
        return { forwardEarnings: 0, reverseEarnings: 0, combinedEarnings: 0, tripCount: 0, trips: [] };
      }

      const trips = await TripManagementService.listTrips({
        transporter_id: user.id,
        limit: 200,
      });

      let forwardEarnings = 0;
      let reverseEarnings = 0;

      const earningsTrips = trips.map((t) => {
        const est = t.estimated_earnings_inr ?? 0;
        const act = t.actual_earnings_inr ?? 0;
        const earning = act > 0 ? act : est;

        if (t.trip_direction === 'return') {
          reverseEarnings += earning;
        } else {
          forwardEarnings += earning;
        }

        return {
          id: t.id,
          direction: t.trip_direction,
          status: t.trip_status,
          estimated: est,
          actual: act,
          start_location: t.start_location,
          end_location: t.end_location,
          completed_at: t.actual_end_at,
        };
      });

      return {
        forwardEarnings,
        reverseEarnings,
        combinedEarnings: forwardEarnings + reverseEarnings,
        tripCount: earningsTrips.length,
        trips: earningsTrips,
      };
    },
    enabled: !!user?.id,
  });
}

// ── Unified Dashboard Counts ──────────────────────────────────

export function useUnifiedDashboardCounts() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['unified-dashboard-counts', user?.id],
    queryFn: async () => {
      if (!user?.id) {
        return {
          activeTrips: 0,
          forwardTrips: 0,
          reverseLoads: 0,
          completedTrips: 0,
        };
      }

      const [trips, reverseLoads] = await Promise.all([
        TripManagementService.listTrips({ transporter_id: user.id, limit: 200 }),
        ReverseLogisticsService.getOpportunities({ limit: 100 }),
      ]);

      return {
        activeTrips: trips.filter((t) => ACTIVE_STATUSES.includes(t.trip_status)).length,
        forwardTrips: trips.filter(
          (t) => t.trip_direction === 'forward' && ACTIVE_STATUSES.includes(t.trip_status)
        ).length,
        reverseLoads: reverseLoads.length,
        completedTrips: trips.filter((t) => COMPLETED_STATUSES.includes(t.trip_status)).length,
      };
    },
    enabled: !!user?.id,
  });
}
