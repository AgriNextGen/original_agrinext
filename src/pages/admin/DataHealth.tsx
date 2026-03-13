import { useState } from 'react';
import DashboardLayout from '@/layouts/DashboardLayout';
import PageShell from '@/components/layout/PageShell';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { 
  RefreshCw, 
  Database, 
  AlertTriangle, 
  CheckCircle2, 
  Clock,
  Activity,
  TrendingUp,
  Globe,
  Play
} from 'lucide-react';
import KpiCard from '@/components/dashboard/KpiCard';
import { formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';
import { useLanguage } from '@/hooks/useLanguage';
import { useTrustedSources, useFarmerSegments, useWebFetchLogs, usePriceConfidence } from '@/hooks/useAdminDataHealth';
import { supabase } from '@/integrations/supabase/client';

const DataHealthPage = () => {
  const { t } = useLanguage();
  const [isRunningCrawl, setIsRunningCrawl] = useState(false);

  const { data: sources, isLoading: sourcesLoading, refetch: refetchSources } = useTrustedSources();
  const { data: segments, isLoading: segmentsLoading, refetch: refetchSegments } = useFarmerSegments();
  const { data: recentLogs, isLoading: logsLoading, refetch: refetchLogs } = useWebFetchLogs();
  const { data: confidenceStats } = usePriceConfidence();

  // Calculate stale sources (not crawled within their TTL)
  const staleSources = sources?.filter((s) => {
    if (!s.last_crawled_at) return true;
    const hoursSince = (Date.now() - new Date(s.last_crawled_at).getTime()) / (1000 * 60 * 60);
    return hoursSince > s.crawl_frequency_hours;
  });

  // Calculate stale segments
  const staleSegments = segments?.filter((s) => {
    if (!s.last_crawled_at) return true;
    const hoursSince = (Date.now() - new Date(s.last_crawled_at).getTime()) / (1000 * 60 * 60);
    return hoursSince > s.crawl_frequency_hours;
  });

  // Recent failed logs
  const failedLogs = recentLogs?.filter((l) => !l.success);

  // Run mandi price sync
  const runMandiSync = async (force = false) => {
    setIsRunningCrawl(true);
    try {
      const { data, error } = await supabase.functions.invoke('sync-karnataka-mandi-prices', {
        body: { force, maxSegments: 20 },
      });

      if (error) throw error;

      if (data?.success) {
        toast.success(`Sync complete! Success: ${data.results?.success || 0}, Raw: ${data.results?.raw_records_inserted || 0}`);
        refetchSources();
        refetchSegments();
        refetchLogs();
      } else {
        toast.error(data?.error || 'Sync failed');
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to run sync');
    } finally {
      setIsRunningCrawl(false);
    }
  };

  // Rebuild segments
  const rebuildSegments = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('rebuild-farmer-segments', {
        body: {},
      });

      if (error) throw error;

      if (data?.success) {
        toast.success(`Segments rebuilt: ${data.segments_created}`);
        refetchSegments();
      } else {
        toast.error(data?.error || 'Rebuild failed');
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to rebuild segments');
    }
  };

  return (
    <DashboardLayout title={t('admin.dataHealth.title')}>
      <PageShell
        title={t('admin.dataHealth.title')}
        subtitle={t('admin.dataHealth.subtitle')}
        actions={
          <TooltipProvider>
            <div className="flex gap-2">
              <Tooltip>
                <TooltipTrigger asChild>
                  <span>
                    <Button variant="outline" disabled>
                      <Database className="h-4 w-4 mr-2" />
                      {t('admin.dataHealth.rebuildSegments')}
                    </Button>
                  </span>
                </TooltipTrigger>
                <TooltipContent>{t('admin.dataHealth.edgeFunctionNotDeployed')}</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span>
                    <Button variant="outline" disabled>
                      <RefreshCw className="h-4 w-4 mr-2" />
                      {t('admin.syncNow')}
                    </Button>
                  </span>
                </TooltipTrigger>
                <TooltipContent>{t('admin.dataHealth.edgeFunctionNotDeployed')}</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span>
                    <Button disabled>
                      <Play className="h-4 w-4 mr-2" />
                      {t('admin.forceSync')}
                    </Button>
                  </span>
                </TooltipTrigger>
                <TooltipContent>{t('admin.dataHealth.edgeFunctionNotDeployed')}</TooltipContent>
              </Tooltip>
            </div>
          </TooltipProvider>
        }
      >
        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <KpiCard
            label={t('admin.dataHealth.activeSources')}
            value={sources?.filter(s => s.active).length || 0}
            icon={Globe}
            priority="primary"
          />
          <KpiCard
            label={t('admin.dataHealth.activeSegments')}
            value={segments?.length || 0}
            icon={Activity}
            priority="info"
          />

          {/* Price Confidence - keep as-is due to complex badge content */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{t('admin.dataHealth.priceConfidence')}</p>
                  <div className="flex gap-2 mt-1">
                    <Badge variant="default" className="bg-success text-primary-foreground">{confidenceStats?.high || 0}</Badge>
                    <Badge variant="outline" className="text-warning">{confidenceStats?.medium || 0}</Badge>
                    <Badge variant="destructive">{confidenceStats?.low || 0}</Badge>
                  </div>
                </div>
                <TrendingUp className="h-8 w-8 text-primary/50" />
              </div>
            </CardContent>
          </Card>

          <KpiCard
            label={t('admin.dataHealth.recentFailures')}
            value={failedLogs?.length || 0}
            icon={AlertTriangle}
            priority="warning"
          />
        </div>

        {/* Failed Sources Alert */}
        {failedLogs && failedLogs.length > 0 && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              {failedLogs.length} {t('admin.dataHealth.crawlFailures')}
            </AlertDescription>
          </Alert>
        )}

        {/* Two Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Trusted Sources */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Globe className="h-5 w-5" />
                {t('admin.dataHealth.trustedSources')}
              </CardTitle>
              <CardDescription>{t('admin.dataHealth.registeredCrawlTargets')}</CardDescription>
            </CardHeader>
            <CardContent>
              {sourcesLoading ? (
                <div className="space-y-2">
                  {[1, 2, 3].map((i) => <Skeleton key={i} className="h-12" />)}
                </div>
              ) : (
                <div className="space-y-2 max-h-80 overflow-y-auto">
                  {sources?.map((source) => {
                    const isStale = !source.last_crawled_at || 
                      (Date.now() - new Date(source.last_crawled_at).getTime()) / (1000 * 60 * 60) > source.crawl_frequency_hours;
                    
                    return (
                      <div key={source.id} className="flex items-center justify-between p-2 rounded border">
                        <div>
                          <p className="font-medium text-sm">{source.name}</p>
                          <p className="text-xs text-muted-foreground">{source.category}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant={source.active ? 'default' : 'secondary'}>
                            {source.active ? t('common.active') : t('common.inactive')}
                          </Badge>
                          {source.last_crawled_at ? (
                            <span className={`text-xs ${isStale ? 'text-warning' : 'text-muted-foreground'}`}>
                              {formatDistanceToNow(new Date(source.last_crawled_at), { addSuffix: true })}
                            </span>
                          ) : (
                            <span className="text-xs text-destructive">{t('admin.dataHealth.neverCrawled')}</span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Farmer Segments */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                {t('admin.dataHealth.farmerSegments')}
              </CardTitle>
              <CardDescription>{t('admin.dataHealth.farmerSegmentsDesc')}</CardDescription>
            </CardHeader>
            <CardContent>
              {segmentsLoading ? (
                <div className="space-y-2">
                  {[1, 2, 3].map((i) => <Skeleton key={i} className="h-12" />)}
                </div>
              ) : segments?.length === 0 ? (
                <p className="text-muted-foreground text-sm">{t('admin.dataHealth.noActiveSegments')}</p>
              ) : (
                <div className="space-y-2 max-h-80 overflow-y-auto">
                  {segments?.map((segment) => {
                    const isStale = !segment.last_crawled_at || 
                      (Date.now() - new Date(segment.last_crawled_at).getTime()) / (1000 * 60 * 60) > segment.crawl_frequency_hours;
                    
                    return (
                      <div key={segment.segment_key} className="flex items-center justify-between p-2 rounded border">
                        <div>
                          <p className="font-medium text-sm">{segment.crop_canonical}</p>
                          <p className="text-xs text-muted-foreground">{segment.district} • {segment.active_farmer_count} farmers</p>
                        </div>
                        <div className="flex items-center gap-2">
                          {isStale ? (
                            <Clock className="h-4 w-4 text-warning" />
                          ) : (
                            <CheckCircle2 className="h-4 w-4 text-success" />
                          )}
                          {segment.last_crawled_at ? (
                            <span className="text-xs text-muted-foreground">
                              {formatDistanceToNow(new Date(segment.last_crawled_at), { addSuffix: true })}
                            </span>
                          ) : (
                            <span className="text-xs text-warning">{t('admin.dataHealth.pending')}</span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Recent Logs */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5" />
                {t('admin.dataHealth.recentCrawlLogs')}
              </CardTitle>
              <CardDescription>{t('admin.dataHealth.recentCrawlLogsDesc')}</CardDescription>
          </CardHeader>
          <CardContent>
            {logsLoading ? (
              <div className="space-y-2">
                {[1, 2, 3, 4, 5].map((i) => <Skeleton key={i} className="h-10" />)}
              </div>
            ) : (
              <div className="space-y-1 max-h-96 overflow-y-auto">
                {recentLogs?.map((log) => (
                  <div 
                    key={log.id} 
                    className={`flex items-center justify-between p-2 rounded text-sm ${
                      log.success ? 'bg-muted/30' : 'bg-destructive/10'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      {log.success ? (
                        <CheckCircle2 className="h-4 w-4 text-success shrink-0" />
                      ) : (
                        <AlertTriangle className="h-4 w-4 text-destructive shrink-0" />
                      )}
                      <div>
                        <p className="font-medium">{log.endpoint}</p>
                        {log.query && (
                          <p className="text-xs text-muted-foreground truncate max-w-md">{log.query}</p>
                        )}
                        {log.error && (
                          <p className="text-xs text-destructive truncate max-w-md">{log.error}</p>
                        )}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(log.fetched_at), { addSuffix: true })}
                      </p>
                      {log.latency_ms && (
                        <p className="text-xs text-muted-foreground">{log.latency_ms}ms</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </PageShell>
    </DashboardLayout>
  );
};

export default DataHealthPage;
