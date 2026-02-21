import { useState } from 'react';
import DashboardLayout from '@/layouts/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Users,
  Sprout,
  Truck,
  ShoppingBag,
  Package,
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
import PageHeader from '@/components/shared/PageHeader';
import EmptyState from '@/components/shared/EmptyState';
import KpiCard from '@/components/dashboard/KpiCard';
import ActionPanel from '@/components/dashboard/ActionPanel';

const AdminDashboard = () => {
  useAdminRealtimeSubscriptions();
  const { t } = useLanguage();

  const { data: stats, isLoading: statsLoading, refetch: refetchStats } = useAdminDashboardStats();
  const { data: recentActivity, isLoading: activityLoading } = useRecentActivity();
  const [aiLoading, setAiLoading] = useState<string | null>(null);
  const [aiResult, setAiResult] = useState<string | null>(null);

  const handleAIAnalysis = async (type: string) => {
    setAiLoading(type);
    setAiResult(null);

    try {
      const { data, error } = await supabase.functions.invoke('admin-ai', {
        body: {
          type,
          data: {
            totalFarmers: stats?.totalFarmers || 0,
            totalBuyers: stats?.totalBuyers || 0,
            activeTransporters: stats?.activeTransporters || 0,
            totalCrops: stats?.totalCrops || 0,
            harvestReady: stats?.harvestReady || 0,
            oneWeekAway: stats?.oneWeekAway || 0,
            pendingTransport: stats?.pendingTransport || 0,
            activeTransport: stats?.activeTransport || 0,
            pendingOrders: stats?.pendingOrders || 0,
            totalOrders: stats?.newOrdersToday || 0,
          },
        },
      });

      if (error) throw error;
      setAiResult(data.analysis);
      toast.success(t('admin.aiAnalysisGenerated'));
    } catch (error) {
      console.error('AI error:', error);
      toast.error(t('admin.failedToGenerate'));
    } finally {
      setAiLoading(null);
    }
  };

  return (
    <DashboardLayout title={t('admin.commandCenter')}>
      <PageHeader
        title={t('admin.commandCenter')}
        subtitle={t('admin.completeVisibility')}
        actions={
          <>
            <div className="hidden items-center gap-2 rounded-full bg-emerald-100 px-3 py-1.5 dark:bg-emerald-900/30 sm:flex">
              <Radio className="h-4 w-4 animate-pulse text-emerald-600" />
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
              <KpiCard label={t('dashboard.totalFarmers')} value={stats?.totalFarmers || 0} icon={Users} priority="success" />
              <KpiCard label={t('dashboard.activeBuyers')} value={stats?.totalBuyers || 0} icon={ShoppingBag} priority="warning" />
              <KpiCard label={t('dashboard.activeTransporters')} value={stats?.activeTransporters || 0} icon={Truck} priority="info" />
              <KpiCard label={t('dashboard.activeCrops')} value={stats?.totalCrops || 0} icon={Sprout} priority="success" />
              <KpiCard label={t('dashboard.harvestReady')} value={stats?.harvestReady || 0} icon={Package} priority="warning" />
              <KpiCard label={t('dashboard.pendingTransport')} value={stats?.pendingTransport || 0} icon={Truck} priority="primary" />
              <KpiCard label={t('dashboard.newOrdersToday')} value={stats?.newOrdersToday || 0} icon={TrendingUp} priority="info" />
              <KpiCard label={t('dashboard.pendingOrders')} value={stats?.pendingOrders || 0} icon={Activity} priority="neutral" />
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
              <Button variant="outline" className="w-full justify-start" asChild><a href="/admin/farmers"><Users className="mr-2 h-4 w-4" />{t('admin.manageFarmers')}</a></Button>
              <Button variant="outline" className="w-full justify-start" asChild><a href="/admin/agents"><Users className="mr-2 h-4 w-4" />{t('admin.manageAgents')}</a></Button>
              <Button variant="outline" className="w-full justify-start" asChild><a href="/admin/transporters"><Truck className="mr-2 h-4 w-4" />{t('admin.manageTransporters')}</a></Button>
              <Button variant="outline" className="w-full justify-start" asChild><a href="/admin/ai-console"><Brain className="mr-2 h-4 w-4" />{t('admin.aiConsole')}</a></Button>
            </CardContent>
          </Card>
        </div>

        <ActionPanel title={t('admin.aiConsole')} context={t('admin.completeVisibility')}>
          <div className="mb-6 grid gap-4 md:grid-cols-4">
            <Button onClick={() => handleAIAnalysis('cluster_health')} disabled={!!aiLoading} className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700">{aiLoading === 'cluster_health' ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : <Activity className="mr-2 h-4 w-4" />}{t('admin.clusterHealth')}</Button>
            <Button onClick={() => handleAIAnalysis('supply_demand')} disabled={!!aiLoading} className="bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700">{aiLoading === 'supply_demand' ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : <TrendingUp className="mr-2 h-4 w-4" />}{t('admin.supplyDemand')}</Button>
            <Button onClick={() => handleAIAnalysis('price_anomaly')} disabled={!!aiLoading} className="bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700">{aiLoading === 'price_anomaly' ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : <AlertTriangle className="mr-2 h-4 w-4" />}{t('admin.priceAnomaly')}</Button>
            <Button onClick={() => handleAIAnalysis('efficiency_advisor')} disabled={!!aiLoading} className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700">{aiLoading === 'efficiency_advisor' ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : <Brain className="mr-2 h-4 w-4" />}{t('admin.efficiency')}</Button>
          </div>

          {aiResult ? (
            <div className="rounded-lg border bg-muted/50 p-4">
              <h4 className="mb-3 flex items-center gap-2 font-semibold"><Brain className="h-4 w-4" />{t('admin.aiAnalysis')}</h4>
              <div className="prose prose-sm max-w-none whitespace-pre-wrap dark:prose-invert">{aiResult}</div>
            </div>
          ) : null}
        </ActionPanel>
      </PageHeader>
    </DashboardLayout>
  );
};

export default AdminDashboard;
