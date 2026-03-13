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
import VoiceAssistant from '@/components/farmer/VoiceAssistant';
import AgentNotesSection from '@/components/farmer/AgentNotesSection';
import FarmerLocationPrompt from '@/components/farmer/FarmerLocationPrompt';
import CropPhotoReminderWidget from '@/components/crop-diary/CropPhotoReminderWidget';
import MyAgentWidget from '@/components/farmer/MyAgentWidget';
import MyHelpRequests from '@/components/farmer/MyHelpRequests';
import { useRealtimeSubscriptions } from '@/hooks/useRealtimeSubscriptions';
import { useLanguage } from '@/hooks/useLanguage';
import PageHeader from '@/components/shared/PageHeader';
import { useQuery } from '@tanstack/react-query';
import { rpcJson } from '@/lib/readApi';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { AlertCircle, RefreshCw } from 'lucide-react';

const DashboardSkeleton = () => (
  <div className="space-y-6 animate-pulse">
    <Skeleton className="h-32 w-full rounded-xl" />
    <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
      {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-24 rounded-lg" />)}
    </div>
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
      {[1, 2, 3].map(i => <Skeleton key={i} className="h-40 rounded-lg" />)}
    </div>
    <Skeleton className="h-48 w-full rounded-lg" />
  </div>
);

const FarmerDashboard = () => {
  useRealtimeSubscriptions();
  const { t } = useLanguage();
  const { data: dashboardData, isLoading, isError, refetch } = useQuery({
    queryKey: ['farmer-dashboard'],
    queryFn: async () => {
      return await rpcJson('farmer_dashboard_v1');
    }
  });

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
            <p className="text-lg font-medium mb-2">Failed to load dashboard</p>
            <p className="text-sm text-muted-foreground mb-4">Please check your connection and try again.</p>
            <Button variant="outline" onClick={() => refetch()}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Retry
            </Button>
          </div>
        </PageHeader>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title={t('nav.dashboard')}>
      <PageHeader title={t('dashboard.welcome')} subtitle={t('dashboard.quickActions')} >
        <FarmerLocationPrompt />
        <OnboardingTour />
        <FarmerSummaryCard dashboardData={dashboardData} />
        <QuickActions />

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          <WeatherWidget />
          <MarketPricesWidget />
          <AgentNotesSection />
        </div>

        <FarmlandsSummary />
        <CropPhotoReminderWidget />
        <CropsSection />

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <HarvestTimeline />
          <TransportSection />
        </div>

        <AdvisoriesList />

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <MyAgentWidget />
          <MyHelpRequests />
        </div>
      </PageHeader>

      <VoiceAssistant />
    </DashboardLayout>
  );
};

export default FarmerDashboard;
