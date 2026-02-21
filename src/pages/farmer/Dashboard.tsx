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
import PageShell from '@/components/layout/PageShell';
import { useQuery } from '@tanstack/react-query';
import { rpcJson } from '@/lib/readApi';

const FarmerDashboard = () => {
  useRealtimeSubscriptions();
  const { t } = useLanguage();
  const { data: dashboardData } = useQuery({
    queryKey: ['farmer-dashboard'],
    queryFn: async () => {
      return await rpcJson('farmer_dashboard_v1');
    }
  });

  return (
    <DashboardLayout title={t('nav.dashboard')}>
      <PageShell title={t('dashboard.welcome')} subtitle={t('dashboard.quickActions')} density="comfortable">
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
      </PageShell>

      <VoiceAssistant />
    </DashboardLayout>
  );
};

export default FarmerDashboard;
