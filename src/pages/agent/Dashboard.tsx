import DashboardLayout from '@/layouts/DashboardLayout';
import AgentSummaryCards from '@/components/agent/AgentSummaryCards';
import TodaysTaskList from '@/components/agent/TodaysTaskList';
import CropsNearHarvest from '@/components/agent/CropsNearHarvest';
import PendingTransportList from '@/components/agent/PendingTransportList';
import AIInsightsPanel from '@/components/agent/AIInsightsPanel';
import { useLanguage } from '@/hooks/useLanguage';
import PageHeader from '@/components/shared/PageHeader';

const AgentDashboard = () => {
  const { t } = useLanguage();

  return (
    <DashboardLayout title={t('agent.dashboard')}>
      <PageHeader title={t('agent.dashboard')} subtitle={t('agent.assignedFarmers')}>
        <AgentSummaryCards />

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <TodaysTaskList />
          <CropsNearHarvest />
        </div>

        <AIInsightsPanel />
        <PendingTransportList />
      </PageHeader>
    </DashboardLayout>
  );
};

export default AgentDashboard;
