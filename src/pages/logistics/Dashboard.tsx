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
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import {
  useLogisticsDashboardStats,
  useActiveTrips,
  useAvailableLoads,
  useTransporterProfile,
  useCreateTransporterProfile,
} from '@/hooks/useLogisticsDashboard';
import { useAuth } from '@/hooks/useAuth';
import { format, parseISO } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useLanguage } from '@/hooks/useLanguage';
import PageHeader from '@/components/shared/PageHeader';
import EmptyState from '@/components/shared/EmptyState';
import KpiCard from '@/components/dashboard/KpiCard';
import ActionPanel from '@/components/dashboard/ActionPanel';

const statusColors: Record<string, string> = {
  requested: 'bg-amber-100 text-amber-800',
  assigned: 'bg-blue-100 text-blue-800',
  en_route: 'bg-purple-100 text-purple-800',
  picked_up: 'bg-indigo-100 text-indigo-800',
  delivered: 'bg-green-100 text-green-800',
};

const LogisticsDashboard = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { t } = useLanguage();
  const { stats } = useLogisticsDashboardStats();
  const { data: activeTrips, isLoading: tripsLoading } = useActiveTrips();
  const { data: availableLoads, isLoading: loadsLoading } = useAvailableLoads();
  const { data: profile, isLoading: profileLoading } = useTransporterProfile();
  const createProfile = useCreateTransporterProfile();

  const [aiLoading, setAiLoading] = useState(false);
  const [aiSuggestion, setAiSuggestion] = useState<string | null>(null);
  const [reverseLoading, setReverseLoading] = useState(false);
  const [reverseSuggestion, setReverseSuggestion] = useState<string | null>(null);

  const handleCreateProfile = () => {
    createProfile.mutate({
      name: user?.email?.split('@')[0] || 'Transporter',
    });
  };

  const handleAIRouteOptimization = async () => {
    if (!availableLoads || availableLoads.length === 0) {
      toast.error('No available loads to optimize');
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
          apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
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
      toast.success('Route optimization complete!');
    } catch (error) {
      console.error('AI error:', error);
      toast.error('Failed to get AI suggestions');
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
          apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
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
      toast.success('Reverse load suggestions ready!');
    } catch (error) {
      console.error('AI error:', error);
      toast.error('Failed to get reverse load suggestions');
    } finally {
      setReverseLoading(false);
    }
  };

  if (profileLoading) {
    return (
      <DashboardLayout title={t('nav.dashboard')}>
        <div className="space-y-6">
          <Skeleton className="h-32 w-full" />
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-24" />
            ))}
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (!profile) {
    return (
      <DashboardLayout title={t('nav.dashboard')}>
        <div className="flex min-h-[60vh] items-center justify-center">
          <Card className="w-full max-w-md">
            <CardHeader className="text-center">
              <Truck className="mx-auto mb-4 h-16 w-16 text-primary" />
              <CardTitle>Welcome, Transporter!</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-center text-muted-foreground">
                Set up your transporter profile to start accepting loads and managing trips.
              </p>
              <Button className="w-full" onClick={handleCreateProfile} disabled={createProfile.isPending}>
                {createProfile.isPending ? 'Creating...' : 'Create Profile'}
              </Button>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title={t('nav.dashboard')}>
      <PageHeader
        title="Transporter Dashboard"
        subtitle={`Welcome back, ${profile.name} - ${profile.operating_village || 'Set your location'}`}
        actions={
          <Button aria-label="Open profile" variant="outline" onClick={() => navigate('/logistics/profile')}>
            <User className="mr-2 h-4 w-4" />
            {t('nav.profile')}
          </Button>
        }
      >
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <KpiCard label={t('logistics.availableLoads')} value={stats.availableLoads} icon={Package} priority="warning" onClick={() => navigate('/logistics/loads')} />
          <KpiCard label="Accepted Trips" value={stats.acceptedTrips} icon={Clock} priority="info" onClick={() => navigate('/logistics/trips')} />
          <KpiCard label="In Progress" value={stats.tripsInProgress} icon={Truck} priority="primary" onClick={() => navigate('/logistics/trips')} />
          <KpiCard label={t('logistics.completedTrips')} value={stats.completedTrips} icon={CheckCircle2} priority="success" onClick={() => navigate('/logistics/completed')} />
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Truck className="h-5 w-5 text-primary" />
                  Today's Active Trips
                </CardTitle>
                <Button variant="ghost" size="sm" onClick={() => navigate('/logistics/trips')}>
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
                  {activeTrips.slice(0, 3).map((trip) => (
                    <div key={trip.id} className="cursor-pointer rounded-lg border p-3 transition-colors hover:bg-accent/50" onClick={() => navigate(`/logistics/trip/${trip.id}`)}>
                      <div className="mb-2 flex items-center justify-between">
                        <span className="font-medium">{trip.crop?.crop_name || 'Unknown Crop'}</span>
                        <Badge className={statusColors[trip.status]}>{trip.status.replace('_', ' ')}</Badge>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <MapPin className="h-3 w-3" />
                        <span>{trip.pickup_village || trip.pickup_location}</span>
                        <span>-</span>
                        <span>{trip.quantity} {trip.quantity_unit}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Package className="h-5 w-5 text-amber-600" />
                  New Load Requests
                </CardTitle>
                <Button variant="ghost" size="sm" onClick={() => navigate('/logistics/loads')}>
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

        <ActionPanel
          title="AI-Powered Suggestions"
          context="Optimize routing and return loads to reduce idle distance and improve earnings."
          primaryAction={<Button size="sm" onClick={handleAIRouteOptimization} disabled={aiLoading || !availableLoads?.length}>{aiLoading ? 'Analyzing...' : 'Suggest Best Route'}</Button>}
          secondaryAction={<Button size="sm" variant="outline" onClick={handleReverseLogistics} disabled={reverseLoading}><RotateCcw className="mr-2 h-4 w-4" />{reverseLoading ? 'Finding...' : 'Find Return Loads'}</Button>}
        >
          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-lg border bg-background p-4">
              <h4 className="mb-2 flex items-center gap-2 font-medium"><Sparkles className="h-4 w-4 text-primary" />Route Optimization</h4>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">{aiSuggestion || 'Click "Suggest Best Route" to get AI-recommended pickup sequencing.'}</p>
            </div>
            <div className="rounded-lg border bg-background p-4">
              <h4 className="mb-2 flex items-center gap-2 font-medium"><RotateCcw className="h-4 w-4" />Reverse Logistics</h4>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">{reverseSuggestion || 'Click "Find Return Loads" to identify profitable return trips.'}</p>
            </div>
          </div>
        </ActionPanel>
      </PageHeader>
    </DashboardLayout>
  );
};

export default LogisticsDashboard;
