import { useState, useMemo } from 'react';
import DashboardLayout from '@/layouts/DashboardLayout';
import FarmerSummaryCard from '@/components/farmer/FarmerSummaryCard';
import CropsSection from '@/components/farmer/CropsSection';
import HarvestTimeline from '@/components/farmer/HarvestTimeline';
import TransportSection from '@/components/farmer/TransportSection';
import MarketPricesWidget from '@/components/farmer/MarketPricesWidget';
import AdvisoriesList from '@/components/farmer/AdvisoriesList';
import QuickActions from '@/components/farmer/QuickActions';
import WeatherWidget from '@/components/farmer/WeatherWidget';
import FarmlandsSummary from '@/components/farmer/FarmlandsSummary';
import OnboardingTour from '@/components/farmer/OnboardingTour';
import FarmerOnboardingWizard from '@/components/farmer/FarmerOnboardingWizard';
import VoiceAssistant from '@/components/farmer/VoiceAssistant';
import AgentNotesSection from '@/components/farmer/AgentNotesSection';
import FarmerLocationPrompt from '@/components/farmer/FarmerLocationPrompt';
import CropPhotoReminderWidget from '@/components/crop-diary/CropPhotoReminderWidget';
import MyAgentWidget from '@/components/farmer/MyAgentWidget';
import MyHelpRequests from '@/components/farmer/MyHelpRequests';
import DashboardZone from '@/components/farmer/DashboardZone';
import { useRealtimeSubscriptions } from '@/hooks/useRealtimeSubscriptions';
import { useLanguage } from '@/hooks/useLanguage';
import { useAuth } from '@/hooks/useAuth';
import PageHeader from '@/components/shared/PageHeader';
import { useQuery } from '@tanstack/react-query';
import { rpcJson } from '@/lib/readApi';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { AlertCircle, RefreshCw, ChevronDown } from 'lucide-react';

const DashboardSkeleton = () => (
  <div className="space-y-6">
    {/* Onboarding wizard skeleton */}
    <Skeleton className="h-44 w-full rounded-xl animate-pulse" />
    {/* Summary card skeleton */}
    <div className="bg-gradient-to-r from-primary/5 via-primary/3 to-accent/5 rounded-2xl p-5 border border-border">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div className="space-y-2">
          <Skeleton className="h-7 w-48 animate-pulse" />
          <Skeleton className="h-4 w-32 animate-pulse" />
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[1, 2, 3, 4].map(i => (
            <Skeleton key={i} className="h-16 w-28 rounded-xl animate-pulse" />
          ))}
        </div>
      </div>
    </div>
    {/* Quick actions skeleton */}
    <Skeleton className="h-24 w-full rounded-lg animate-pulse" />
    {/* Weather + Market skeleton */}
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
      <Skeleton className="h-36 rounded-xl animate-pulse" />
      <Skeleton className="h-36 rounded-xl animate-pulse" />
    </div>
  </div>
);

const FarmerDashboard = () => {
  useRealtimeSubscriptions();
  const { t } = useLanguage();
  const { user } = useAuth();
  const [showAllSections, setShowAllSections] = useState(false);

  const { data: dashboardData, isLoading, isError, refetch } = useQuery({
    queryKey: ['farmer-dashboard', user?.id],
    queryFn: async () => {
      return await rpcJson('farmer_dashboard_v1');
    },
    enabled: !!user?.id,
    staleTime: 30_000,
    retry: 2,
  });

  const hasAnyData = useMemo(() => dashboardData && (
    (dashboardData.crops_by_status && Object.values(dashboardData.crops_by_status).some((v: any) => v > 0)) ||
    dashboardData.open_transport_requests_count > 0 ||
    dashboardData.active_orders_count > 0 ||
    dashboardData.total_farmlands > 0
  ), [dashboardData]);

  const hasFarmData = useMemo(() => dashboardData && (
    dashboardData.total_farmlands > 0 ||
    (dashboardData.crops_by_status && Object.values(dashboardData.crops_by_status).some((v: any) => v > 0))
  ), [dashboardData]);

  const hasTransportOrOrders = useMemo(() => dashboardData && (
    dashboardData.open_transport_requests_count > 0 ||
    dashboardData.active_orders_count > 0
  ), [dashboardData]);

  if (isLoading) {
    return (
      <DashboardLayout title={t('nav.dashboard')}>
        <PageHeader title={t('dashboard.welcome')} subtitle={t('dashboard.quickActions')}>
          <DashboardSkeleton />
        </PageHeader>
      </DashboardLayout>
    );
  }

  if (isError) {
    return (
      <DashboardLayout title={t('nav.dashboard')}>
        <PageHeader title={t('dashboard.welcome')} subtitle={t('dashboard.quickActions')}>
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <AlertCircle className="h-12 w-12 text-destructive mb-4" />
            <p className="text-lg font-medium mb-2">{t('common.loadError')}</p>
            <p className="text-sm text-muted-foreground mb-4">{t('common.retryMessage')}</p>
            <Button variant="outline" onClick={() => refetch()}>
              <RefreshCw className="h-4 w-4 mr-2" />
              {t('common.retry')}
            </Button>
          </div>
        </PageHeader>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title={t('nav.dashboard')}>
      <PageHeader title={t('dashboard.welcome')} subtitle={t('dashboard.quickActions')}>
        <FarmerLocationPrompt />

        {/* Zone 1: Hero — always visible */}
        {!hasAnyData ? (
          <FarmerOnboardingWizard />
        ) : (
          <OnboardingTour />
        )}
        <FarmerSummaryCard dashboardData={dashboardData} />
        <QuickActions />

        {/* Zone 2: At-a-Glance — weather + prices (hide agent notes when empty) */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <WeatherWidget />
          <MarketPricesWidget />
        </div>

        {/* Zone 3: Farm Data — show when user has farm data, or reveal via toggle */}
        <DashboardZone
          title={t('dashboard.farmData')}
          hasContent={hasFarmData || showAllSections}
        >
          <FarmlandsSummary />
          <CropPhotoReminderWidget />
          <CropsSection />

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <HarvestTimeline />
            <TransportSection />
          </div>
        </DashboardZone>

        {/* Zone 4: Support — collapsed by default for clean initial view */}
        <DashboardZone
          title={t('dashboard.supportAndAlerts')}
          defaultOpen={false}
          hasContent={hasTransportOrOrders || showAllSections}
        >
          <AdvisoriesList />
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <MyAgentWidget />
            <MyHelpRequests />
          </div>
        </DashboardZone>

        {/* Agent Notes — only show when there's actual content */}
        {hasAnyData && <AgentNotesSection />}

        {/* Show more toggle for new users */}
        {!hasAnyData && !showAllSections && (
          <div className="flex justify-center pt-2 pb-4">
            <Button
              variant="ghost"
              size="sm"
              className="text-muted-foreground gap-2"
              onClick={() => setShowAllSections(true)}
            >
              <ChevronDown className="h-4 w-4" />
              {t('common.showAll')}
            </Button>
          </div>
        )}
      </PageHeader>

      <VoiceAssistant />
    </DashboardLayout>
  );
};

export default FarmerDashboard;
