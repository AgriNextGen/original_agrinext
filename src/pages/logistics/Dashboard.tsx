import { useState } from 'react';
import DashboardLayout from '@/layouts/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Truck,
  Package,
  CheckCircle2,
  Clock,
  Sparkles,
  MapPin,
  ArrowRight,
  RotateCcw,
  User,
  DollarSign,
  Gauge,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import {
  useLogisticsDashboardStats,
  useActiveTrips,
  useAvailableLoads,
  useTransporterProfile,
  useCreateTransporterProfile,
} from '@/hooks/useLogisticsDashboard';
import { useUnifiedDashboardCounts } from '@/hooks/useUnifiedLogistics';
import { useAuth } from '@/hooks/useAuth';
import { format, parseISO } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useLanguage } from '@/hooks/useLanguage';
import { ROUTES } from '@/lib/routes';
import PageHeader from '@/components/shared/PageHeader';
import EmptyState from '@/components/shared/EmptyState';
import KpiCard from '@/components/dashboard/KpiCard';
import ActionPanel from '@/components/dashboard/ActionPanel';
import OnboardingWizard from '@/components/logistics/OnboardingWizard';
import LoadsMapView from '@/components/logistics/LoadsMapView';
import { TRANSPORT_STATUS_COLORS } from '@/lib/constants';

const LogisticsDashboard = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { t } = useLanguage();
  const { data: dashData, isLoading: statsLoading } = useLogisticsDashboardStats();
  const stats = dashData?.stats ?? { availableLoads: 0, acceptedTrips: 0, tripsInProgress: 0, completedTrips: 0 };
  const { data: activeTrips, isLoading: tripsLoading } = useActiveTrips();
  const { data: availableLoads, isLoading: loadsLoading } = useAvailableLoads();
  const { data: profile, isLoading: profileLoading } = useTransporterProfile();
  const createProfile = useCreateTransporterProfile();
  const { data: unifiedCounts } = useUnifiedDashboardCounts();

  const [aiLoading, setAiLoading] = useState(false);
  const [aiSuggestion, setAiSuggestion] = useState<string | null>(null);
  const [reverseLoading, setReverseLoading] = useState(false);
  const [reverseSuggestion, setReverseSuggestion] = useState<string | null>(null);

  const handleAIRouteOptimization = async () => {
    if (!availableLoads || availableLoads.length === 0) {
      toast.error(t('toast.noLoadsToOptimize'));
      return;
    }

    setAiLoading(true);
    try {
      const loads = availableLoads.map((load) => ({
        farmer_name: load.farmer?.full_name,
        village: load.pickup_village || load.pickup_location,
        crop_name: load.crop?.crop_name,
        quantity: load.quantity,
        quantity_unit: load.quantity_unit,
        preferred_date: load.preferred_date,
      }));
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-gateway/transport-ai`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
          apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
        },
        body: JSON.stringify({
          type: 'route_optimization',
          loads,
          currentLocation: profile?.operating_village || 'Base',
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error?.message || 'Function error');
      setAiSuggestion(data.result);
      toast.success(t('toast.routeOptimizationComplete'));
    } catch (error) {
      if (import.meta.env.DEV) console.error('AI error:', error);
      toast.error(t('toast.failedAiSuggestions'));
    } finally {
      setAiLoading(false);
    }
  };

  const handleReverseLogistics = async () => {
    setReverseLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-gateway/transport-ai`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
          apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
        },
        body: JSON.stringify({
          type: 'reverse_logistics',
          currentLocation: 'Market/Mandi',
          homeBase: profile?.operating_village || 'Base village',
          loads: [],
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error?.message || 'Function error');
      setReverseSuggestion(data.result);
      toast.success(t('toast.reverseLoadSuggestionsReady'));
    } catch (error) {
      if (import.meta.env.DEV) console.error('AI error:', error);
      toast.error(t('toast.failedReverseLoadSuggestions'));
    } finally {
      setReverseLoading(false);
    }
  };

  if (profileLoading) {
    return (
      <DashboardLayout title={t('nav.dashboard')}>
        <div className="space-y-6 animate-pulse">
          <div className="rounded-lg border bg-card p-5 space-y-3">
            <Skeleton className="h-5 w-48" />
            <Skeleton className="h-4 w-64" />
          </div>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="rounded-lg border-2 bg-card p-4 space-y-2">
                <Skeleton className="h-3 w-20" />
                <Skeleton className="h-8 w-12" />
              </div>
            ))}
          </div>
          <div className="grid gap-6 md:grid-cols-2">
            <div className="rounded-lg border bg-card p-5 space-y-3">
              <Skeleton className="h-5 w-36" />
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
            </div>
            <div className="rounded-lg border bg-card p-5 space-y-3">
              <Skeleton className="h-5 w-36" />
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
            </div>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (!profile) {
    return (
      <DashboardLayout title={t('nav.dashboard')}>
        <OnboardingWizard
          defaultName={user?.email?.split('@')[0] || ''}
          isSubmitting={createProfile.isPending}
          onComplete={(data) => {
            createProfile.mutate({ name: data.name, phone: data.phone, vehicle_type: data.vehicle_type, vehicle_capacity: data.vehicle_capacity ? parseFloat(data.vehicle_capacity) : undefined, operating_village: data.operating_village, operating_district: data.operating_district });
          }}
        />
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title={t('nav.dashboard')}>
      <PageHeader
        title={t('logistics.transporterDashboard')}
        subtitle={`Welcome back, ${profile.name} - ${profile.operating_village || t('logistics.setYourLocation')}`}
        actions={
          <div className="flex items-center gap-2">
            <Button aria-label={t('common.refresh')} variant="ghost" size="icon" className="md:hidden" onClick={() => { window.location.reload(); }}>
              <RotateCcw className="h-4 w-4" />
            </Button>
            <Button aria-label="Open profile" variant="outline" onClick={() => navigate(ROUTES.LOGISTICS.PROFILE)}>
              <User className="mr-2 h-4 w-4" />
              {t('nav.profile')}
            </Button>
          </div>
        }
      >
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <KpiCard label={t('logistics.availableLoads')} value={stats.availableLoads} icon={Package} priority="warning" onClick={() => navigate(ROUTES.LOGISTICS.AVAILABLE_LOADS)} />
          <KpiCard label={t('logistics.acceptedTrips')} value={stats.acceptedTrips} icon={Clock} priority="info" onClick={() => navigate(ROUTES.LOGISTICS.ACTIVE_TRIPS)} />
          <KpiCard label={t('logistics.inProgress')} value={stats.tripsInProgress} icon={Truck} priority="primary" onClick={() => navigate(ROUTES.LOGISTICS.ACTIVE_TRIPS)} />
          <KpiCard label={t('logistics.completedTrips')} value={stats.completedTrips} icon={CheckCircle2} priority="success" onClick={() => navigate(ROUTES.LOGISTICS.COMPLETED_TRIPS)} />
        </div>

        {unifiedCounts && (
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            <KpiCard label={t('logistics.forwardTrips')} value={unifiedCounts.forwardTrips} icon={Truck} priority="info" onClick={() => navigate(ROUTES.LOGISTICS.FORWARD_TRIPS)} />
            <KpiCard label={t('logistics.reverseLoads')} value={unifiedCounts.reverseLoads} icon={RotateCcw} priority="warning" onClick={() => navigate(ROUTES.LOGISTICS.REVERSE_LOADS)} />
            <KpiCard label={t('logistics.vehicleCapacity')} value={`${unifiedCounts.activeTrips}`} icon={Gauge} priority="primary" onClick={() => navigate(ROUTES.LOGISTICS.CAPACITY)} />
            <KpiCard label={t('logistics.earnings')} value="—" icon={DollarSign} priority="success" onClick={() => navigate(ROUTES.LOGISTICS.EARNINGS)} />
          </div>
        )}

        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Truck className="h-5 w-5 text-primary" />
                  {t('logistics.todaysActiveTrips')}
                </CardTitle>
                <Button variant="ghost" size="sm" onClick={() => navigate(ROUTES.LOGISTICS.ACTIVE_TRIPS)}>
                  {t('common.viewAll')} <ArrowRight className="ml-1 h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {tripsLoading ? (
                <div className="space-y-3">{[1, 2].map((i) => <Skeleton key={i} className="h-20" />)}</div>
              ) : !activeTrips || activeTrips.length === 0 ? (
                <div className="p-4">
                  <EmptyState icon={Truck} title={t('logistics.noActiveTrips')} description={''} />
                </div>
              ) : (
                <div className="space-y-3">
                  {activeTrips.slice(0, 3).map((trip) => {
                    const tripId = trip.accepted_trip_id || trip.assigned_trip_id;
                    return (
                    <div key={trip.id} className="cursor-pointer rounded-lg border p-3 transition-colors hover:bg-accent/50" onClick={() => tripId && navigate(ROUTES.LOGISTICS.TRIP_DETAIL(tripId))}>
                      <div className="mb-2 flex items-center justify-between">
                        <span className="font-medium">{trip.crop?.crop_name || 'Unknown Crop'}</span>
                        <Badge className={TRANSPORT_STATUS_COLORS[trip.status] ?? 'bg-gray-100 text-gray-800'}>{trip.status.replace('_', ' ')}</Badge>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <MapPin className="h-3 w-3" />
                        <span>{trip.pickup_village || trip.pickup_location}</span>
                        <span>-</span>
                        <span>{trip.quantity} {trip.quantity_unit}</span>
                      </div>
                    </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Package className="h-5 w-5 text-warning" />
                  {t('logistics.newLoadRequests')}
                </CardTitle>
                <Button variant="ghost" size="sm" onClick={() => navigate(ROUTES.LOGISTICS.AVAILABLE_LOADS)}>
                  {t('common.viewAll')} <ArrowRight className="ml-1 h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {loadsLoading ? (
                <div className="space-y-3">{[1, 2].map((i) => <Skeleton key={i} className="h-20" />)}</div>
              ) : !availableLoads || availableLoads.length === 0 ? (
                <div className="p-4">
                  <EmptyState icon={Package} title={t('logistics.noLoadsFound')} description={''} />
                </div>
              ) : (
                <div className="space-y-3">
                  {availableLoads.slice(0, 3).map((load) => (
                    <div key={load.id} className="rounded-lg border p-3 transition-colors hover:bg-accent/50">
                      <div className="mb-2 flex items-center justify-between">
                        <span className="font-medium">{load.farmer?.full_name || 'Unknown Farmer'}</span>
                        <span className="text-sm text-muted-foreground">{load.preferred_date ? format(parseISO(load.preferred_date), 'MMM d') : t('common.flexible')}</span>
                      </div>
                      <div className="mb-2 flex items-center gap-2 text-sm text-muted-foreground">
                        <span>{load.crop?.crop_name || 'Crop'}</span>
                        <span>-</span>
                        <span>{load.quantity} {load.quantity_unit}</span>
                        <span>-</span>
                        <MapPin className="h-3 w-3" />
                        <span>{load.pickup_village || load.pickup_location}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {availableLoads && availableLoads.length > 0 && (
          <LoadsMapView
            loads={availableLoads.slice(0, 10).map(l => ({
              id: l.id,
              farmer_name: l.farmer?.full_name || 'Unknown',
              crop_name: l.crop?.crop_name || 'Crop',
              quantity: l.quantity ?? 0,
              quantity_unit: l.quantity_unit || 'quintals',
              village: l.pickup_village || l.pickup_location || '',
            }))}
            centerVillage={profile?.operating_village}
          />
        )}

        <ActionPanel
          title={t('logistics.aiSuggestions')}
          context={t('logistics.aiSuggestionsContext')}
          primaryAction={<Button size="sm" onClick={handleAIRouteOptimization} disabled={aiLoading || !availableLoads?.length}>{aiLoading ? t('logistics.analyzing') : t('logistics.suggestBestRoute')}</Button>}
          secondaryAction={<Button size="sm" variant="outline" onClick={handleReverseLogistics} disabled={reverseLoading}><RotateCcw className="mr-2 h-4 w-4" />{reverseLoading ? t('logistics.finding') : t('logistics.findReturnLoads')}</Button>}
        >
          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-lg border bg-background p-4">
              <h4 className="mb-2 flex items-center gap-2 font-medium"><Sparkles className="h-4 w-4 text-primary" />{t('logistics.routeOptimization')}</h4>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">{aiSuggestion || t('logistics.routeOptimizationHint')}</p>
            </div>
            <div className="rounded-lg border bg-background p-4">
              <h4 className="mb-2 flex items-center gap-2 font-medium"><RotateCcw className="h-4 w-4" />{t('logistics.reverseLogistics')}</h4>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">{reverseSuggestion || t('logistics.reverseLogisticsHint')}</p>
            </div>
          </div>
        </ActionPanel>
      </PageHeader>
    </DashboardLayout>
  );
};

export default LogisticsDashboard;
