import DashboardLayout from '@/layouts/DashboardLayout';
import AgentSummaryCards from '@/components/agent/AgentSummaryCards';
import TodaysTaskList from '@/components/agent/TodaysTaskList';
import CropsNearHarvest from '@/components/agent/CropsNearHarvest';
import PendingTransportList from '@/components/agent/PendingTransportList';
import AIInsightsPanel from '@/components/agent/AIInsightsPanel';
import { useLanguage } from '@/hooks/useLanguage';
import PageShell from '@/components/layout/PageShell';

const AgentDashboard = () => {
  const { t } = useLanguage();

  return (
    <DashboardLayout title={t('agent.dashboard')}>
      <PageShell title={t('agent.dashboard')} subtitle={t('agent.assignedFarmers')}>
        <AgentSummaryCards />

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <TodaysTaskList />
          <CropsNearHarvest />
        </div>

        <AIInsightsPanel />
        <PendingTransportList />
      </PageShell>
    </DashboardLayout>
  );
};

export default AgentDashboard;
