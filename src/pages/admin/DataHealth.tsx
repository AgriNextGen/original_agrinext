import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import DashboardLayout from '@/layouts/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
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
import { formatDistanceToNow, format } from 'date-fns';
import { toast } from 'sonner';

// Types
interface TrustedSource {
  id: string;
  name: string;
  url: string;
  category: string;
  state: string;
  district: string | null;
  active: boolean;
  last_crawled_at: string | null;
  crawl_frequency_hours: number;
}

interface FarmerSegment {
  segment_key: string;
  district: string;
  crop_canonical: string;
  active_farmer_count: number;
  last_crawled_at: string | null;
  crawl_frequency_hours: number;
}

interface WebFetchLog {
  id: string;
  endpoint: string;
  query: string | null;
  success: boolean;
  latency_ms: number | null;
  http_status: number | null;
  error: string | null;
  fetched_at: string;
}

interface PriceConfidenceStats {
  high: number;
  medium: number;
  low: number;
}

const DataHealthPage = () => {
  const [isRunningCrawl, setIsRunningCrawl] = useState(false);

  // Fetch trusted sources
  const { data: sources, isLoading: sourcesLoading, refetch: refetchSources } = useQuery({
    queryKey: ['admin-trusted-sources'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('trusted_sources')
        .select('*')
        .order('last_crawled_at', { ascending: true, nullsFirst: true });
      if (error) throw error;
      return data as TrustedSource[];
    },
  });

  // Fetch farmer segments
  const { data: segments, isLoading: segmentsLoading, refetch: refetchSegments } = useQuery({
    queryKey: ['admin-farmer-segments'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('farmer_segments')
        .select('*')
        .gt('active_farmer_count', 0)
        .order('last_crawled_at', { ascending: true, nullsFirst: true });
      if (error) throw error;
      return data as FarmerSegment[];
    },
  });

  // Fetch recent logs
  const { data: recentLogs, isLoading: logsLoading, refetch: refetchLogs } = useQuery({
    queryKey: ['admin-web-fetch-logs'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('web_fetch_logs')
        .select('*')
        .order('fetched_at', { ascending: false })
        .limit(20);
      if (error) throw error;
      return data as WebFetchLog[];
    },
  });

  // Fetch price confidence distribution
  const { data: confidenceStats } = useQuery({
    queryKey: ['admin-price-confidence'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('market_prices_agg')
        .select('confidence');
      if (error) throw error;
      
      const stats: PriceConfidenceStats = { high: 0, medium: 0, low: 0 };
      data?.forEach((row: { confidence: string | null }) => {
        if (row.confidence === 'high') stats.high++;
        else if (row.confidence === 'medium') stats.medium++;
        else stats.low++;
      });
      return stats;
    },
  });

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
    <DashboardLayout title="Data Health Monitor">
      <div className="space-y-6">
        {/* Header Actions */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold">Firecrawl Data Health</h2>
            <p className="text-muted-foreground">Monitor web ingestion, crawl status, and data quality</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={rebuildSegments}>
              <Database className="h-4 w-4 mr-2" />
              Rebuild Segments
            </Button>
            <Button variant="outline" onClick={() => runMandiSync(false)} disabled={isRunningCrawl}>
              <RefreshCw className={`h-4 w-4 mr-2 ${isRunningCrawl ? 'animate-spin' : ''}`} />
              Sync Now
            </Button>
            <Button onClick={() => runMandiSync(true)} disabled={isRunningCrawl}>
              {isRunningCrawl ? (
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Play className="h-4 w-4 mr-2" />
              )}
              Force Sync
            </Button>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Active Sources</p>
                  <p className="text-2xl font-bold">{sources?.filter(s => s.active).length || 0}</p>
                </div>
                <Globe className="h-8 w-8 text-primary/50" />
              </div>
              {staleSources && staleSources.length > 0 && (
                <Badge variant="destructive" className="mt-2">
                  {staleSources.length} stale
                </Badge>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Active Segments</p>
                  <p className="text-2xl font-bold">{segments?.length || 0}</p>
                </div>
                <Activity className="h-8 w-8 text-primary/50" />
              </div>
              {staleSegments && staleSegments.length > 0 && (
                <Badge variant="outline" className="mt-2 text-amber-600">
                  {staleSegments.length} due for crawl
                </Badge>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Price Confidence</p>
                  <div className="flex gap-2 mt-1">
                    <Badge variant="default" className="bg-emerald-600">{confidenceStats?.high || 0}</Badge>
                    <Badge variant="outline" className="text-amber-600">{confidenceStats?.medium || 0}</Badge>
                    <Badge variant="destructive">{confidenceStats?.low || 0}</Badge>
                  </div>
                </div>
                <TrendingUp className="h-8 w-8 text-primary/50" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Recent Failures</p>
                  <p className="text-2xl font-bold text-destructive">{failedLogs?.length || 0}</p>
                </div>
                <AlertTriangle className="h-8 w-8 text-destructive/50" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Failed Sources Alert */}
        {failedLogs && failedLogs.length > 0 && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              {failedLogs.length} recent crawl failures detected. Check logs below for details.
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
                Trusted Sources
              </CardTitle>
              <CardDescription>Registered crawl targets</CardDescription>
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
                            {source.active ? 'Active' : 'Inactive'}
                          </Badge>
                          {source.last_crawled_at ? (
                            <span className={`text-xs ${isStale ? 'text-amber-600' : 'text-muted-foreground'}`}>
                              {formatDistanceToNow(new Date(source.last_crawled_at), { addSuffix: true })}
                            </span>
                          ) : (
                            <span className="text-xs text-destructive">Never crawled</span>
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
                Farmer Segments
              </CardTitle>
              <CardDescription>District + Crop combinations with active farmers</CardDescription>
            </CardHeader>
            <CardContent>
              {segmentsLoading ? (
                <div className="space-y-2">
                  {[1, 2, 3].map((i) => <Skeleton key={i} className="h-12" />)}
                </div>
              ) : segments?.length === 0 ? (
                <p className="text-muted-foreground text-sm">No active segments. Run "Rebuild Segments" first.</p>
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
                            <Clock className="h-4 w-4 text-amber-600" />
                          ) : (
                            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                          )}
                          {segment.last_crawled_at ? (
                            <span className="text-xs text-muted-foreground">
                              {formatDistanceToNow(new Date(segment.last_crawled_at), { addSuffix: true })}
                            </span>
                          ) : (
                            <span className="text-xs text-amber-600">Pending</span>
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
              Recent Crawl Logs
            </CardTitle>
            <CardDescription>Last 20 web fetch operations</CardDescription>
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
                        <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
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
      </div>
    </DashboardLayout>
  );
};

export default DataHealthPage;
