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
import { AlertCircle, RefreshCw, CalendarDays, ClipboardList, UserPlus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { ROUTES } from '@/lib/routes';

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
  const navigate = useNavigate();

  const dashTitle = t('agent.dashboard');
  const dashSubtitle = t('agent.dashboardSubtitle');

  if (isLoading) {
    return (
      <DashboardLayout title={dashTitle}>
        <PageHeader title={dashTitle} subtitle={dashSubtitle}>
          <DashboardSkeleton />
        </PageHeader>
      </DashboardLayout>
    );
  }

  if (isError) {
    return (
      <DashboardLayout title={dashTitle}>
        <PageHeader title={dashTitle} subtitle={dashSubtitle}>
          <div className="flex flex-col items-center justify-center py-16 text-center" role="alert">
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
    <DashboardLayout title={dashTitle}>
      <PageHeader title={dashTitle} subtitle={dashSubtitle}>
        {/* Quick Actions */}
        <div className="flex flex-wrap gap-3">
          <Button onClick={() => navigate(ROUTES.AGENT.TODAY)} variant="default" size="sm">
            <CalendarDays className="h-4 w-4 mr-2" />
            {t('agent.quickActions.todaysPlan')}
          </Button>
          <Button onClick={() => navigate(ROUTES.AGENT.TASKS)} variant="outline" size="sm">
            <ClipboardList className="h-4 w-4 mr-2" />
            {t('agent.quickActions.createTask')}
          </Button>
          <Button onClick={() => navigate(ROUTES.AGENT.FARMERS)} variant="outline" size="sm">
            <UserPlus className="h-4 w-4 mr-2" />
            {t('agent.quickActions.browseFarmers')}
          </Button>
        </div>

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
