import DashboardLayout from '@/layouts/DashboardLayout';
import AgentSummaryCards from '@/components/agent/AgentSummaryCards';
import TodaysTaskList from '@/components/agent/TodaysTaskList';
import CropsNearHarvest from '@/components/agent/CropsNearHarvest';
import PendingTransportList from '@/components/agent/PendingTransportList';
import AIInsightsPanel from '@/components/agent/AIInsightsPanel';
import { useLanguage } from '@/hooks/useLanguage';
import PageHeader from '@/components/shared/PageHeader';
import { useAgentDashboardStats } from '@/hooks/useAgentDashboard';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { AlertCircle, RefreshCw } from 'lucide-react';

const DashboardSkeleton = () => (
  <div className="space-y-6 animate-pulse">
    <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
      {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-24 rounded-lg" />)}
    </div>
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      <Skeleton className="h-48 rounded-lg" />
      <Skeleton className="h-48 rounded-lg" />
    </div>
    <Skeleton className="h-40 w-full rounded-lg" />
    <Skeleton className="h-40 w-full rounded-lg" />
  </div>
);

const AgentDashboard = () => {
  const { t } = useLanguage();
  const { isLoading, isError, refetch } = useAgentDashboardStats();

  if (isLoading) {
    return (
      <DashboardLayout title={t('agent.dashboard')}>
        <PageHeader title={t('agent.dashboard')} subtitle={t('agent.assignedFarmers')}>
          <DashboardSkeleton />
        </PageHeader>
      </DashboardLayout>
    );
  }

  if (isError) {
    return (
      <DashboardLayout title={t('agent.dashboard')}>
        <PageHeader title={t('agent.dashboard')} subtitle={t('agent.assignedFarmers')}>
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
