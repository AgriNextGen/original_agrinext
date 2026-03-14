import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import DashboardLayout from '@/layouts/DashboardLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Users,
  Search,
  MapPin,
  Phone,
  Sprout,
  Truck,
  Eye,
  Play
} from 'lucide-react';
import { useAssignedFarmers, useStartVisit, useActiveVisit } from '@/hooks/useAgentAssignments';
import { useLanguage } from '@/hooks/useLanguage';
import PageHeader from '@/components/shared/PageHeader';
import KpiCard from '@/components/dashboard/KpiCard';
import EmptyState from '@/components/shared/EmptyState';
import { ROUTES } from '@/lib/routes';
import { toast } from 'sonner';
import { useLoadingTimeout } from '@/hooks/useLoadingTimeout';

export default function AgentMyFarmers() {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const { data: farmers, isLoading } = useAssignedFarmers();
  const loadingTimedOut = useLoadingTimeout(isLoading);
  const startVisit = useStartVisit();
  const { data: activeVisit } = useActiveVisit();

  const [searchQuery, setSearchQuery] = useState('');

  const filteredFarmers = farmers?.filter(
    (f) =>
      f.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      f.village?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      f.district?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleStartVisit = (farmerId: string) => {
    if (activeVisit) {
      toast.error(t('agent.myFarmers.endVisitFirst'));
      return;
    }
    startVisit.mutate({ farmerId });
  };

  return (
    <DashboardLayout
      title={t('agent.myFarmers.title')}
    >
      <PageHeader title={t('agent.myFarmers.title')} subtitle={t('agent.myFarmers.subtitle')}>
      <div className="space-y-6">

        {/* Active Visit Banner */}
        {activeVisit && (
          <Card className="border-primary bg-primary/5">
            <CardContent className="py-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                <span className="font-medium">
                  {t('agent.myFarmers.activeVisit')}
                </span>
              </div>
              <Button size="sm" variant="outline" onClick={() => navigate(ROUTES.AGENT.FARMER_DETAIL(activeVisit.farmer_id))}>
                {t('agent.myFarmers.view')}
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Search */}
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={t('agent.myFarmers.searchPlaceholder')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <KpiCard label={t('agent.myFarmers.totalFarmers')} value={farmers?.length || 0} icon={Users} priority="primary" />
          <KpiCard label={t('agent.myFarmers.readyToHarvest')} value={farmers?.reduce((sum, f) => sum + (f.ready_crops_count || 0), 0) || 0} icon={Sprout} priority="success" />
          <KpiCard label={t('agent.myFarmers.activeCrops')} value={farmers?.reduce((sum, f) => sum + (f.crops_count || 0), 0) || 0} icon={Sprout} priority="info" />
          <KpiCard label={t('agent.myFarmers.pendingTransport')} value={farmers?.reduce((sum, f) => sum + (f.pending_transport_count || 0), 0) || 0} icon={Truck} priority="warning" />
        </div>

        {/* Farmers Table */}
        <Card>
          <CardContent className="p-0">
            {isLoading && !loadingTimedOut ? (
              <div className="p-6 space-y-4">
                {[1, 2, 3, 4, 5].map((i) => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('agent.myFarmers.name')}</TableHead>
                    <TableHead>{t('agent.myFarmers.location')}</TableHead>
                    <TableHead>{t('agent.myFarmers.phone')}</TableHead>
                    <TableHead>{t('agent.myFarmers.crops')}</TableHead>
                    <TableHead>{t('agent.myFarmers.transport')}</TableHead>
                    <TableHead>{t('agent.myFarmers.actions')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredFarmers?.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="p-0">
                        <EmptyState
                          icon={Users}
                          title={t('agent.myFarmers.noFarmers')}
                          description={t('agent.myFarmers.noFarmersDescription')}
                          actionLabel={t('agent.myFarmers.browseFarmers')}
                          onAction={() => navigate(ROUTES.AGENT.FARMERS)}
                        />
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredFarmers?.map((farmer) => (
                      <TableRow key={farmer.id}>
                        <TableCell className="font-medium">
                          {farmer.full_name || t('agent.myFarmers.unknown')}
                        </TableCell>
                        <TableCell>
                          <span className="flex items-center gap-1 text-sm">
                            <MapPin className="h-3 w-3" />
                            {[farmer.village, farmer.district]
                              .filter(Boolean)
                              .join(', ') || 'N/A'}
                          </span>
                        </TableCell>
                        <TableCell>
                          {farmer.phone ? (
                            <a
                              href={`tel:${farmer.phone}`}
                              className="flex items-center gap-1 text-sm text-primary hover:underline"
                            >
                              <Phone className="h-3 w-3" />
                              {farmer.phone}
                            </a>
                          ) : (
                            '-'
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Badge variant="secondary" className="flex items-center gap-1">
                              <Sprout className="h-3 w-3" />
                              {farmer.crops_count || 0}
                            </Badge>
                            {(farmer.ready_crops_count || 0) > 0 && (
                              <Badge className="bg-green-100 text-green-800">
                                {farmer.ready_crops_count} {t('agent.myFarmers.ready')}
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          {(farmer.pending_transport_count || 0) > 0 ? (
                            <Badge className="bg-amber-100 text-amber-800 flex items-center gap-1 w-fit">
                              <Truck className="h-3 w-3" />
                              {farmer.pending_transport_count}
                            </Badge>
                          ) : (
                            '-'
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => navigate(ROUTES.AGENT.FARMER_DETAIL(farmer.id))}
                            >
                              <Eye className="h-3 w-3 mr-1" />
                              {t('agent.myFarmers.view')}
                            </Button>
                            <Button
                              size="sm"
                              onClick={() => handleStartVisit(farmer.id)}
                              disabled={startVisit.isPending || !!activeVisit}
                            >
                              <Play className="h-3 w-3 mr-1" />
                              {t('agent.myFarmers.visit')}
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
      </PageHeader>
    </DashboardLayout>
  );
}
