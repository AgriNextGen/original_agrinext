import { useState } from 'react';
import DashboardLayout from '@/layouts/DashboardLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { useAllTransportRequests } from '@/hooks/useAgentDashboard';
import { 
  Truck, 
  MapPin, 
  Calendar,
  Package,
  Search,
  Info,
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import PageHeader from '@/components/shared/PageHeader';
import ResponsiveDataView from '@/components/shared/ResponsiveDataView';
import type { Column } from '@/components/shared/ResponsiveDataView';
import { useLoadingTimeout } from '@/hooks/useLoadingTimeout';
import { useLanguage } from '@/hooks/useLanguage';

const statusColors: Record<string, string> = {
  open: 'bg-gray-100 text-gray-800',
  requested: 'bg-amber-100 text-amber-800',
  assigned: 'bg-blue-100 text-blue-800',
  accepted: 'bg-blue-100 text-blue-800',
  in_progress: 'bg-purple-100 text-purple-800',
  completed: 'bg-green-100 text-green-800',
  delivered: 'bg-green-100 text-green-800',
  cancelled: 'bg-red-100 text-red-800',
};

const AgentTransport = () => {
  const { t } = useLanguage();
  const { data: requests, isLoading } = useAllTransportRequests();
  const loadingTimedOut = useLoadingTimeout(isLoading);
  
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredRequests = requests?.filter((req) => {
    const matchesStatus = filterStatus === 'all' || req.status === filterStatus;
    const matchesSearch = 
      (req as any).farmer?.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      req.pickup_village?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (req as any).crop?.crop_name?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStatus && (searchQuery === '' || matchesSearch);
  });

  const statusLabel = (s: string) => t(`agent.transportPage.statusLabels.${s}`);

  const columns: Column<any>[] = [
    { key: 'farmer', header: t('agent.transportPage.farmer'), render: (r) => <span className="font-medium">{r.farmer?.full_name || t('agent.transportPage.unknown')}</span> },
    { key: 'crop', header: t('agent.transportPage.crop'), render: (r) => r.crop ? <Badge variant="outline" className="bg-green-50">{r.crop.crop_name}</Badge> : '-' },
    { key: 'quantity', header: t('agent.transportPage.quantity'), render: (r) => <span className="flex items-center gap-1"><Package className="h-3 w-3" />{r.quantity} {r.quantity_unit}</span> },
    { key: 'village', header: t('agent.transportPage.village'), render: (r) => <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{r.pickup_village || r.pickup_location}</span> },
    { key: 'date', header: t('agent.transportPage.preferredDate'), render: (r) => r.preferred_date ? <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />{format(parseISO(r.preferred_date), 'MMM d')}</span> : '-' },
    { key: 'status', header: t('agent.transportPage.status'), render: (r) => <Badge className={statusColors[r.status]}>{statusLabel(r.status)}</Badge> },
  ];

  return (
    <DashboardLayout title={t('agent.transportPage.title')}>
      <PageHeader title={t('agent.transportPage.requestsTitle')} subtitle={t('agent.transportPage.subtitle')}>
      <div className="space-y-6">

        <div className="flex items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800">
          <Info className="h-4 w-4 shrink-0" />
          <span>{t('agent.transportPage.readOnlyInfo')}</span>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="py-4">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder={t('agent.transportPage.searchPlaceholder')}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
              <div className="flex flex-wrap gap-2">
                {['all', 'requested', 'assigned', 'in_progress', 'completed', 'cancelled'].map((status) => (
                  <Button
                    key={status}
                    variant={filterStatus === status ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setFilterStatus(status)}
                  >
                    {statusLabel(status)}
                  </Button>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Transport Data */}
        <Card>
          <CardContent className="p-0">
            <ResponsiveDataView
              data={filteredRequests}
              columns={columns}
              keyExtractor={(r) => r.id}
              loading={isLoading && !loadingTimedOut}
              emptyIcon={Truck}
              emptyTitle={t('agent.transportPage.noRequests')}
              emptyDescription={t('agent.transportPage.noRequestsDescription')}
              renderMobileCard={(req: any) => (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{req.farmer?.full_name || t('agent.transportPage.unknown')}</span>
                    <Badge className={statusColors[req.status]}>{statusLabel(req.status)}</Badge>
                  </div>
                  <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
                    {req.crop && (
                      <span className="flex items-center gap-1"><Package className="h-3 w-3" />{req.crop.crop_name}</span>
                    )}
                    <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{req.pickup_village || req.pickup_location}</span>
                    {req.preferred_date && (
                      <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />{format(parseISO(req.preferred_date), 'MMM d')}</span>
                    )}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {req.quantity} {req.quantity_unit}
                  </div>
                </div>
              )}
            />
          </CardContent>
        </Card>
      </div>
    </PageHeader>
    </DashboardLayout>
  );
};

export default AgentTransport;
