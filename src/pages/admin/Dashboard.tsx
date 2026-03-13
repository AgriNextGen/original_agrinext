import DashboardLayout from '@/layouts/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Users,
  Truck,
  ShoppingBag,
  AlertTriangle,
  TrendingUp,
  Activity,
  Brain,
  UserPlus,
  RefreshCw,
  Radio,
} from 'lucide-react';
import { useAdminDashboardStats, useRecentActivity } from '@/hooks/useAdminDashboard';
import { useAdminRealtimeSubscriptions } from '@/hooks/useAdminRealtimeSubscriptions';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';
import { useLanguage } from '@/hooks/useLanguage';
import { ROUTES } from '@/lib/routes';
import PageHeader from '@/components/shared/PageHeader';
import EmptyState from '@/components/shared/EmptyState';
import KpiCard from '@/components/dashboard/KpiCard';
import ActionPanel from '@/components/dashboard/ActionPanel';

const AdminDashboard = () => {
  useAdminRealtimeSubscriptions();
  const { t } = useLanguage();

  const { data: stats, isLoading: statsLoading, refetch: refetchStats } = useAdminDashboardStats();
  const { data: recentActivity, isLoading: activityLoading } = useRecentActivity();
  const handleAIAnalysis = async (_type: string) => {
    toast.info('AI analysis is not yet available. This feature is coming soon.');
  };

  return (
    <DashboardLayout title={t('admin.commandCenter')}>
      <PageHeader
        title={t('admin.commandCenter')}
        subtitle={t('admin.completeVisibility')}
        actions={
          <>
            <div className="hidden items-center gap-2 rounded-full bg-success/10 px-3 py-1.5 sm:flex">
              <Radio className="h-4 w-4 animate-pulse text-success" />
              <span className="text-sm font-medium text-emerald-700 dark:text-emerald-400">{t('common.live')}</span>
            </div>
            <Button aria-label="Refresh stats" onClick={() => refetchStats()} variant="outline" size="sm">
              <RefreshCw className="mr-2 h-4 w-4" />
              {t('common.refresh')}
            </Button>
          </>
        }
      >
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {statsLoading ? (
            Array(8).fill(0).map((_, i) => (
              <Card key={i}>
                <CardContent className="p-4">
                  <Skeleton className="h-10 w-full" />
                </CardContent>
              </Card>
            ))
          ) : (
            <>
              <KpiCard label={t('dashboard.newSignups')} value={stats?.newSignups || 0} icon={UserPlus} priority="success" />
              <KpiCard label={t('dashboard.activeUsers')} value={stats?.activeUsers || 0} icon={Users} priority="info" />
              <KpiCard label={t('dashboard.supportTickets')} value={stats?.supportTicketsOpen || 0} icon={AlertTriangle} priority="warning" />
              <KpiCard label={t('dashboard.stuckTrips')} value={stats?.stuckTrips || 0} icon={Truck} priority="warning" />
              <KpiCard label={t('dashboard.paymentFailures')} value={stats?.paymentFailures || 0} icon={Activity} priority="warning" />
              <KpiCard label={t('dashboard.rateLimitBlocks')} value={stats?.rateLimitBlocks || 0} icon={AlertTriangle} priority="neutral" />
              <KpiCard label={t('dashboard.kycPendingPayouts')} value={stats?.kycPendingPayouts || 0} icon={ShoppingBag} priority="info" />
            </>
          )}
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                {t('dashboard.recentActivity')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {activityLoading ? (
                <div className="space-y-3">
                  {Array(5).fill(0).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
                </div>
              ) : (
                <div className="space-y-3">
                  {recentActivity?.map((activity) => (
                    <div key={activity.id} className="flex items-center justify-between rounded-lg bg-muted/50 p-3">
                      <div className="flex items-center gap-3">
                        <Badge variant={activity.type === 'order' ? 'default' : activity.type === 'transport' ? 'secondary' : 'outline'}>
                          {activity.type}
                        </Badge>
                        <span className="text-sm">{activity.message}</span>
                      </div>
                      <span className="text-xs text-muted-foreground">{formatDistanceToNow(new Date(activity.time), { addSuffix: true })}</span>
                    </div>
                  ))}
                  {!recentActivity?.length && <EmptyState icon={Activity} title={t('dashboard.noRecentActivity')} description={''} />}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><UserPlus className="h-5 w-5" />{t('dashboard.quickActions')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button variant="outline" className="w-full justify-start" asChild><a href={ROUTES.ADMIN.FARMERS}><Users className="mr-2 h-4 w-4" />{t('admin.manageFarmers')}</a></Button>
              <Button variant="outline" className="w-full justify-start" asChild><a href={ROUTES.ADMIN.AGENTS}><Users className="mr-2 h-4 w-4" />{t('admin.manageAgents')}</a></Button>
              <Button variant="outline" className="w-full justify-start" asChild><a href={ROUTES.ADMIN.TRANSPORTERS}><Truck className="mr-2 h-4 w-4" />{t('admin.manageTransporters')}</a></Button>
              <Button variant="outline" className="w-full justify-start" asChild><a href={ROUTES.ADMIN.AI_CONSOLE}><Brain className="mr-2 h-4 w-4" />{t('admin.aiConsole')}</a></Button>
            </CardContent>
          </Card>
        </div>

        <ActionPanel title={t('admin.aiConsole')} context={t('admin.completeVisibility')}>
          <div className="mb-6 grid gap-4 md:grid-cols-4">
            <Button onClick={() => handleAIAnalysis('cluster_health')} className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700"><Activity className="mr-2 h-4 w-4" />{t('admin.clusterHealth')}</Button>
            <Button onClick={() => handleAIAnalysis('supply_demand')} className="bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700"><TrendingUp className="mr-2 h-4 w-4" />{t('admin.supplyDemand')}</Button>
            <Button onClick={() => handleAIAnalysis('price_anomaly')} className="bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700"><AlertTriangle className="mr-2 h-4 w-4" />{t('admin.priceAnomaly')}</Button>
            <Button onClick={() => handleAIAnalysis('efficiency_advisor')} className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700"><Brain className="mr-2 h-4 w-4" />{t('admin.efficiency')}</Button>
          </div>
        </ActionPanel>
      </PageHeader>
    </DashboardLayout>
  );
};

export default AdminDashboard;
