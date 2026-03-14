import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import DashboardLayout from '@/layouts/DashboardLayout';
import PageShell from '@/components/layout/PageShell';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertTriangle, CheckCircle, Clock, Search, Sparkles, X, MapPin, Inbox } from 'lucide-react';
import EmptyState from '@/components/shared/EmptyState';
import { useOpsInbox, useResolveOpsItem } from '@/hooks/useOpsInbox';
import { useSmartSearch } from '@/hooks/useSmartSearch';
import { useToast } from '@/hooks/use-toast';
import GeoStateSelect from '@/components/geo/GeoStateSelect';
import GeoDistrictSelect from '@/components/geo/GeoDistrictSelect';
import { useLanguage } from '@/hooks/useLanguage';

const ITEM_TYPE_TAB_KEYS = [
  { value: '', key: 'all' },
  { value: 'ticket', key: 'tickets' },
  { value: 'stuck_trip', key: 'stuckTrips' },
  { value: 'stuck_order', key: 'stuckOrders' },
  { value: 'kyc_pending', key: 'kycPending' },
  { value: 'payout_pending', key: 'payoutsPending' },
  { value: 'dead_job', key: 'deadJobs' },
  { value: 'security_alert', key: 'security' },
];

const SEVERITY_COLORS: Record<string, string> = {
  high: 'bg-destructive/10 text-destructive border-destructive/20',
  medium: 'bg-warning/10 text-warning border-warning/20',
  low: 'bg-success/10 text-success border-success/20',
};

export default function OpsInbox() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [geoStateId, setGeoStateId] = useState('');
  const [geoDistrictId, setGeoDistrictId] = useState('');

  const filters = useMemo(() => {
    const f: Record<string, string> = {};
    if (activeTab) f.item_type = activeTab;
    if (geoDistrictId) f.district_id = geoDistrictId;
    return f;
  }, [activeTab, geoDistrictId]);

  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading } = useOpsInbox(filters);
  const resolveItem = useResolveOpsItem();
  const { submitSearch, suggestedFilters, setSuggestedFilters, isSearching } = useSmartSearch();
  const { t } = useLanguage();

  const items = data?.pages.flatMap((p) => p.items) ?? [];

  const handleSmartSearch = () => {
    if (!searchQuery.trim()) return;
    submitSearch.mutate(searchQuery);
  };

  const applySmartFilters = () => {
    if (!suggestedFilters) return;
    if (suggestedFilters.item_type) setActiveTab(suggestedFilters.item_type);
    setSuggestedFilters(null);
    toast({ title: t('admin.opsInbox.filtersApplied'), description: t('admin.opsInbox.searchApplied') });
  };

  const handleResolve = (id: string) => {
    resolveItem.mutate({ id, status: 'resolved' }, {
      onSuccess: () => toast({ title: t('admin.opsInbox.resolved') }),
    });
  };

  return (
    <DashboardLayout>
      <PageShell title={t('admin.opsInbox.title')}>
        {/* Smart Search */}
        <Card>
          <CardContent className="pt-4">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder={t('admin.opsInbox.search')}
                  className="pl-9"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSmartSearch()}
                />
              </div>
              <Button onClick={handleSmartSearch} disabled={isSearching || !searchQuery.trim()}>
                <Sparkles className="h-4 w-4 mr-1" />
                {isSearching ? t('admin.opsInbox.analyzing') : t('admin.opsInbox.aiSearch')}
              </Button>
            </div>
            {suggestedFilters && (
              <div className="mt-3 flex items-center gap-2 flex-wrap">
                <span className="text-xs text-muted-foreground">{t('admin.opsInbox.aiSuggested')}</span>
                {Object.entries(suggestedFilters).map(([key, value]) => (
                  <Badge key={key} variant="secondary" className="text-xs">
                    {key}: {value}
                  </Badge>
                ))}
                <Button size="sm" variant="outline" onClick={applySmartFilters}>{t('admin.opsInbox.apply')}</Button>
                <Button size="sm" variant="ghost" onClick={() => setSuggestedFilters(null)}><X className="h-3 w-3" /></Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Geo Filters */}
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3 flex-wrap">
              <MapPin className="h-4 w-4 text-muted-foreground" />
              <div className="w-44">
                <GeoStateSelect
                  value={geoStateId}
                  onValueChange={(v) => { setGeoStateId(v); setGeoDistrictId(''); }}
                  placeholder={t('admin.opsInbox.filterByState')}
                />
              </div>
              <div className="w-44">
                <GeoDistrictSelect
                  stateId={geoStateId || null}
                  value={geoDistrictId}
                  onValueChange={setGeoDistrictId}
                  placeholder={t('admin.opsInbox.filterByDistrict')}
                />
              </div>
              {(geoStateId || geoDistrictId) && (
                <Button size="sm" variant="ghost" onClick={() => { setGeoStateId(''); setGeoDistrictId(''); }}>
                  <X className="h-3 w-3 mr-1" /> {t('admin.opsInbox.clearGeo')}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="flex-wrap h-auto gap-1">
            {ITEM_TYPE_TAB_KEYS.map((tab) => (
              <TabsTrigger key={tab.value} value={tab.value} className="text-xs">
                {t(`admin.opsInbox.${tab.key}`)}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>

        {/* Items list */}
        <div className="space-y-2">
          {isLoading && Array.from({ length: 5 }).map((_, i) => (
            <Card key={i}><CardContent className="py-4"><Skeleton className="h-16 w-full" /></CardContent></Card>
          ))}

          {!isLoading && items.length === 0 && (
            <EmptyState icon={CheckCircle} title={t('admin.opsInbox.noItems')} description={t('admin.opsInbox.noItemsDesc')} />
          )}

          {items.map((item) => (
            <Card
              key={item.id}
              className="cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => navigate(`/admin/entity/${item.entity_type}/${item.entity_id}`)}
            >
              <CardContent className="py-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2 min-w-0">
                    <AlertTriangle className={`h-4 w-4 flex-shrink-0 ${
                      item.severity === 'high' ? 'text-destructive' : item.severity === 'medium' ? 'text-warning' : 'text-success'
                    }`} />
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant="outline" className="text-xs">{item.item_type.replace(/_/g, ' ')}</Badge>
                        <Badge className={`text-xs ${SEVERITY_COLORS[item.severity] || ''}`}>{item.severity}</Badge>
                        <span className="text-xs text-muted-foreground">{item.entity_type}/{item.entity_id.slice(0, 8)}</span>
                      </div>
                      <p className="text-sm mt-1 truncate">{item.summary || t('admin.opsInbox.noSummary')}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className="text-xs text-muted-foreground whitespace-nowrap">
                      <Clock className="inline h-3 w-3 mr-1" />
                      {new Date(item.updated_at).toLocaleDateString()}
                    </span>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={(e) => { e.stopPropagation(); handleResolve(item.id); }}
                    >
                      <CheckCircle className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Load more */}
        {hasNextPage && (
          <div className="text-center">
            <Button variant="outline" onClick={() => fetchNextPage()} disabled={isFetchingNextPage}>
              {isFetchingNextPage ? t('common.loading') : t('common.loadMore')}
            </Button>
          </div>
        )}
      </PageShell>
    </DashboardLayout>
  );
}
