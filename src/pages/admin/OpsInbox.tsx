import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import DashboardLayout from '@/layouts/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertTriangle, CheckCircle, Clock, Search, Sparkles, X, MapPin } from 'lucide-react';
import { useOpsInbox, useResolveOpsItem } from '@/hooks/useOpsInbox';
import { useSmartSearch } from '@/hooks/useSmartSearch';
import { useToast } from '@/components/ui/use-toast';
import GeoStateSelect from '@/components/geo/GeoStateSelect';
import GeoDistrictSelect from '@/components/geo/GeoDistrictSelect';

const ITEM_TYPE_TABS = [
  { value: '', label: 'All' },
  { value: 'ticket', label: 'Tickets' },
  { value: 'stuck_trip', label: 'Stuck Trips' },
  { value: 'stuck_order', label: 'Stuck Orders' },
  { value: 'kyc_pending', label: 'KYC Pending' },
  { value: 'payout_pending', label: 'Payouts' },
  { value: 'dead_job', label: 'Dead Jobs' },
  { value: 'security_alert', label: 'Security' },
];

const SEVERITY_COLORS: Record<string, string> = {
  high: 'bg-red-100 text-red-800 border-red-200',
  medium: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  low: 'bg-green-100 text-green-800 border-green-200',
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

  const items = data?.pages.flatMap((p) => p.items) ?? [];

  const handleSmartSearch = () => {
    if (!searchQuery.trim()) return;
    submitSearch.mutate(searchQuery);
  };

  const applySmartFilters = () => {
    if (!suggestedFilters) return;
    if (suggestedFilters.item_type) setActiveTab(suggestedFilters.item_type);
    setSuggestedFilters(null);
    toast({ title: 'Filters applied', description: 'Search suggestion applied to inbox filters.' });
  };

  const handleResolve = (id: string) => {
    resolveItem.mutate({ id, status: 'resolved' }, {
      onSuccess: () => toast({ title: 'Resolved' }),
    });
  };

  return (
    <DashboardLayout>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Ops Inbox</h1>
        </div>

        {/* Smart Search */}
        <Card>
          <CardContent className="pt-4">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Smart search: e.g. 'stuck orders in last week', 'urgent tickets'..."
                  className="pl-9"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSmartSearch()}
                />
              </div>
              <Button onClick={handleSmartSearch} disabled={isSearching || !searchQuery.trim()}>
                <Sparkles className="h-4 w-4 mr-1" />
                {isSearching ? 'Analyzing...' : 'AI Search'}
              </Button>
            </div>
            {suggestedFilters && (
              <div className="mt-3 flex items-center gap-2 flex-wrap">
                <span className="text-xs text-muted-foreground">AI suggested:</span>
                {Object.entries(suggestedFilters).map(([key, value]) => (
                  <Badge key={key} variant="secondary" className="text-xs">
                    {key}: {value}
                  </Badge>
                ))}
                <Button size="sm" variant="outline" onClick={applySmartFilters}>Apply</Button>
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
                  placeholder="Filter by state"
                />
              </div>
              <div className="w-44">
                <GeoDistrictSelect
                  stateId={geoStateId || null}
                  value={geoDistrictId}
                  onValueChange={setGeoDistrictId}
                  placeholder="Filter by district"
                />
              </div>
              {(geoStateId || geoDistrictId) && (
                <Button size="sm" variant="ghost" onClick={() => { setGeoStateId(''); setGeoDistrictId(''); }}>
                  <X className="h-3 w-3 mr-1" /> Clear geo
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="flex-wrap h-auto gap-1">
            {ITEM_TYPE_TABS.map((tab) => (
              <TabsTrigger key={tab.value} value={tab.value} className="text-xs">
                {tab.label}
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
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                <CheckCircle className="mx-auto h-10 w-10 mb-2 text-green-500" />
                <p className="font-medium">All clear!</p>
                <p className="text-sm">No open items in the ops inbox.</p>
              </CardContent>
            </Card>
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
                      item.severity === 'high' ? 'text-red-500' : item.severity === 'medium' ? 'text-yellow-500' : 'text-green-500'
                    }`} />
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant="outline" className="text-xs">{item.item_type.replace(/_/g, ' ')}</Badge>
                        <Badge className={`text-xs ${SEVERITY_COLORS[item.severity] || ''}`}>{item.severity}</Badge>
                        <span className="text-xs text-muted-foreground">{item.entity_type}/{item.entity_id.slice(0, 8)}</span>
                      </div>
                      <p className="text-sm mt-1 truncate">{item.summary || 'No summary'}</p>
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
              {isFetchingNextPage ? 'Loading...' : 'Load more'}
            </Button>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
