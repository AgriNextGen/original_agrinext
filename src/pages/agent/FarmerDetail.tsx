import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import DashboardLayout from '@/layouts/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import FarmerQuickUpdateTab from '@/components/agent/FarmerQuickUpdateTab';
import FarmerTasksTab from '@/components/agent/FarmerTasksTab';
import AgentSoilReportUploadDialog from '@/components/agent/AgentSoilReportUploadDialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  User,
  Phone,
  MapPin,
  ArrowLeft,
  Sprout,
  Truck,
  FileText,
  Play,
  MessageCircle,
  Edit,
  ClipboardList,
  FlaskConical,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useStartVisit, useActiveVisit } from '@/hooks/useAgentAssignments';
import { useLanguage } from '@/hooks/useLanguage';
import { toast } from 'sonner';
import PageHeader from '@/components/shared/PageHeader';
import KpiCard from '@/components/dashboard/KpiCard';
import EmptyState from '@/components/shared/EmptyState';
import { ROUTES } from '@/lib/routes';
import { format, parseISO } from 'date-fns';

export default function AgentFarmerDetail() {
  const { farmerId } = useParams<{ farmerId: string }>();
  const navigate = useNavigate();
  const { t } = useLanguage();
  const startVisit = useStartVisit();
  const { data: activeVisit } = useActiveVisit();
  const [activeTab, setActiveTab] = useState('overview');
  const [soilReportOpen, setSoilReportOpen] = useState(false);

  // Fetch farmer profile
  const { data: farmer, isLoading: farmerLoading } = useQuery({
    queryKey: ['agent-farmer-detail', farmerId],
    queryFn: async () => {
      if (!farmerId) return null;
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', farmerId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!farmerId,
  });

  // Fetch farmer's crops
  const { data: crops, isLoading: cropsLoading } = useQuery({
    queryKey: ['agent-farmer-crops', farmerId],
    queryFn: async () => {
      if (!farmerId) return [];
      const { data, error } = await supabase
        .from('crops')
        .select('*')
        .eq('farmer_id', farmerId)
        .neq('status', 'harvested')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!farmerId,
  });

  // Fetch farmer's transport requests
  const { data: transport, isLoading: transportLoading } = useQuery({
    queryKey: ['agent-farmer-transport', farmerId],
    queryFn: async () => {
      if (!farmerId) return [];
      const { data, error } = await supabase
        .from('transport_requests')
        .select('*')
        .eq('farmer_id', farmerId)
        .order('created_at', { ascending: false })
        .limit(10);
      if (error) throw error;
      return data || [];
    },
    enabled: !!farmerId,
  });

  // Fetch farmer's farmlands
  const { data: farmlands, isLoading: farmlandsLoading } = useQuery({
    queryKey: ['agent-farmer-farmlands', farmerId],
    queryFn: async () => {
      if (!farmerId) return [];
      const { data, error } = await supabase
        .from('farmlands')
        .select('*')
        .eq('farmer_id', farmerId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!farmerId,
  });

  const handleStartVisit = () => {
    if (!farmerId) return;
    if (activeVisit) {
      toast.error(t('agent.farmerDetail.endVisitFirst'));
      return;
    }
    startVisit.mutate({ farmerId });
  };

  const handleCall = () => {
    if (farmer?.phone) {
      window.location.href = `tel:${farmer.phone}`;
    }
  };

  const handleWhatsApp = () => {
    if (farmer?.phone) {
      const phone = farmer.phone.replace(/[^0-9]/g, '');
      const message = encodeURIComponent('Hello');
      window.open(`https://wa.me/91${phone}?text=${message}`, '_blank');
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { className: string }> = {
      growing: { className: 'bg-blue-100 text-blue-800' },
      one_week: { className: 'bg-amber-100 text-amber-800' },
      ready: { className: 'bg-green-100 text-green-800' },
      harvested: { className: 'bg-gray-100 text-gray-800' },
      requested: { className: 'bg-amber-100 text-amber-800' },
      assigned: { className: 'bg-blue-100 text-blue-800' },
      en_route: { className: 'bg-purple-100 text-purple-800' },
      picked_up: { className: 'bg-cyan-100 text-cyan-800' },
      delivered: { className: 'bg-green-100 text-green-800' },
      cancelled: { className: 'bg-red-100 text-red-800' },
    };
    const config = statusConfig[status] || { className: 'bg-gray-100 text-gray-800' };
    const label = t(`agent.farmerDetail.statusLabels.${status}`) || status;
    return <Badge className={config.className}>{label}</Badge>;
  };

  if (farmerLoading) {
    return (
      <DashboardLayout title={t('agent.farmerDetail.title')}>
        <div className="space-y-6">
          <Skeleton className="h-10 w-48" />
          <Skeleton className="h-40 w-full" />
        </div>
      </DashboardLayout>
    );
  }

  if (!farmer) {
    return (
      <DashboardLayout title={t('agent.farmerDetail.title')}>
        <div className="text-center py-12">
          <EmptyState
            icon={User}
            title={t('agent.farmerDetail.notFound')}
            description={t('agent.farmerDetail.notFoundDescription')}
            actionLabel={t('agent.farmerDetail.goBack')}
            onAction={() => navigate(ROUTES.AGENT.MY_FARMERS)}
          />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title={farmer.full_name || t('agent.farmerDetail.farmer')}>
      <PageHeader title={farmer.full_name || t('agent.farmerDetail.farmer')}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <Button variant="ghost" onClick={() => navigate(ROUTES.AGENT.MY_FARMERS)} aria-label="Back to farmers">
            <ArrowLeft className="h-4 w-4 mr-2" />
            {t('agent.farmerDetail.back')}
          </Button>
          <div className="flex gap-2">
            <Button aria-label="Call farmer" variant="outline" size="sm" onClick={handleCall} disabled={!farmer.phone}>
              <Phone className="h-4 w-4 mr-1" />
              {t('agent.farmerDetail.call')}
            </Button>
            <Button
              aria-label="WhatsApp farmer"
              variant="outline"
              size="sm"
              onClick={handleWhatsApp}
              disabled={!farmer.phone}
              className="text-green-600"
            >
              <MessageCircle className="h-4 w-4 mr-1" />
              WhatsApp
            </Button>
            <Button
              aria-label="Start visit"
              size="sm"
              onClick={handleStartVisit}
              disabled={startVisit.isPending || !!activeVisit}
            >
              <Play className="h-4 w-4 mr-1" />
              {t('agent.farmerDetail.startVisit')}
            </Button>
            <Button
              aria-label="Upload soil report"
              size="sm"
              variant="outline"
              onClick={() => setSoilReportOpen(true)}
            >
              <FlaskConical className="h-4 w-4 mr-1" />
              {t('agent.farmerDetail.soilReport')}
            </Button>
          </div>
        </div>

        {/* Profile Card */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-start gap-4">
              <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
                <User className="h-8 w-8 text-primary" />
              </div>
              <div className="flex-1">
                <h2 className="text-xl font-semibold">
                  {farmer.full_name || t('agent.farmerDetail.unknown')}
                </h2>
                {farmer.phone && (
                  <p className="text-muted-foreground flex items-center gap-1 mt-1">
                    <Phone className="h-4 w-4" />
                    {farmer.phone}
                  </p>
                )}
                <p className="text-muted-foreground flex items-center gap-1 mt-1">
                  <MapPin className="h-4 w-4" />
                  {[farmer.village, farmer.taluk, farmer.district].filter(Boolean).join(', ') || 'N/A'}
                </p>
              </div>
              <div className="text-right">
                <div className="text-2xl font-display font-semibold text-primary">{crops?.length || 0}</div>
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  {t('agent.farmerDetail.activeCrops')}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3 sm:grid-cols-6">
            <TabsTrigger value="overview" className="flex items-center gap-1">
              <User className="h-4 w-4" />
              <span className="hidden sm:inline">{t('agent.farmerDetail.overview')}</span>
            </TabsTrigger>
            <TabsTrigger value="update" className="flex items-center gap-1">
              <Edit className="h-4 w-4" />
              <span className="hidden sm:inline">{t('agent.farmerDetail.update')}</span>
            </TabsTrigger>
            <TabsTrigger value="tasks" className="flex items-center gap-1">
              <ClipboardList className="h-4 w-4" />
              <span className="hidden sm:inline">{t('agent.farmerDetail.tasks')}</span>
            </TabsTrigger>
            <TabsTrigger value="crops" className="flex items-center gap-1">
              <Sprout className="h-4 w-4" />
              <span className="hidden sm:inline">{t('agent.farmerDetail.crops')}</span>
            </TabsTrigger>
            <TabsTrigger value="transport" className="flex items-center gap-1">
              <Truck className="h-4 w-4" />
              <span className="hidden sm:inline">{t('agent.farmerDetail.transport')}</span>
            </TabsTrigger>
            <TabsTrigger value="farmlands" className="flex items-center gap-1">
              <FileText className="h-4 w-4" />
              <span className="hidden sm:inline">{t('agent.farmerDetail.farmlands')}</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="mt-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <KpiCard
                label={t('agent.farmerDetail.totalLand')}
                value={`${farmer.total_land_area || 0} acres`}
                icon={FileText}
                priority="primary"
              />
              <KpiCard
                label={t('agent.farmerDetail.farmlands')}
                value={farmlands?.length || 0}
                icon={MapPin}
                priority="info"
              />
              <KpiCard
                label={t('agent.farmerDetail.pendingTransport')}
                value={transport?.filter((t) => t.status === 'requested').length || 0}
                icon={Truck}
                priority="warning"
              />
            </div>
          </TabsContent>

          <TabsContent value="update" className="mt-6">
            <FarmerQuickUpdateTab farmer={farmer} />
          </TabsContent>

          <TabsContent value="tasks" className="mt-6">
            {farmerId && <FarmerTasksTab farmerId={farmerId} />}
          </TabsContent>

          <TabsContent value="crops" className="mt-6">
            <Card>
              <CardContent className="p-0">
                {cropsLoading ? (
                  <div className="p-6 space-y-4">
                    {[1, 2, 3].map((i) => (
                      <Skeleton key={i} className="h-12 w-full" />
                    ))}
                  </div>
                ) : !crops?.length ? (
                  <div className="text-center py-12">
                    <Sprout className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
                    <p className="text-muted-foreground">
                      {t('agent.farmerDetail.noCrops')}
                    </p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t('agent.farmerDetail.crop')}</TableHead>
                        <TableHead>{t('agent.farmerDetail.quantity')}</TableHead>
                        <TableHead>{t('agent.farmerDetail.status')}</TableHead>
                        <TableHead>{t('agent.farmerDetail.harvest')}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {crops.map((crop) => (
                        <TableRow key={crop.id}>
                          <TableCell className="font-medium">{crop.crop_name}</TableCell>
                          <TableCell>
                            {crop.estimated_quantity || '-'} {crop.quantity_unit || ''}
                          </TableCell>
                          <TableCell>{getStatusBadge(crop.status)}</TableCell>
                          <TableCell>
                            {crop.harvest_estimate
                              ? format(parseISO(crop.harvest_estimate), 'MMM d, yyyy')
                              : '-'}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="transport" className="mt-6">
            <Card>
              <CardContent className="p-0">
                {transportLoading ? (
                  <div className="p-6 space-y-4">
                    {[1, 2, 3].map((i) => (
                      <Skeleton key={i} className="h-12 w-full" />
                    ))}
                  </div>
                ) : !transport?.length ? (
                  <div className="text-center py-12">
                    <Truck className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
                    <p className="text-muted-foreground">
                      {t('agent.farmerDetail.noTransport')}
                    </p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t('agent.farmerDetail.location')}</TableHead>
                        <TableHead>{t('agent.farmerDetail.quantity')}</TableHead>
                        <TableHead>{t('agent.farmerDetail.status')}</TableHead>
                        <TableHead>{t('agent.farmerDetail.date')}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {transport.map((req) => (
                        <TableRow key={req.id}>
                          <TableCell className="font-medium">
                            {req.pickup_location || req.pickup_village || '-'}
                          </TableCell>
                          <TableCell>
                            {req.quantity || '-'} {req.quantity_unit || 'kg'}
                          </TableCell>
                          <TableCell>{getStatusBadge(req.status)}</TableCell>
                          <TableCell>
                            {req.preferred_date
                              ? format(parseISO(req.preferred_date), 'MMM d, yyyy')
                              : format(parseISO(req.created_at), 'MMM d, yyyy')}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="farmlands" className="mt-6">
            <Card>
              <CardContent className="p-0">
                {farmlandsLoading ? (
                  <div className="p-6 space-y-4">
                    {[1, 2, 3].map((i) => (
                      <Skeleton key={i} className="h-12 w-full" />
                    ))}
                  </div>
                ) : !farmlands?.length ? (
                  <div className="text-center py-12">
                    <FileText className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
                    <p className="text-muted-foreground">
                      {t('agent.farmerDetail.noFarmlands')}
                    </p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t('agent.farmerDetail.name')}</TableHead>
                        <TableHead>{t('agent.farmerDetail.area')}</TableHead>
                        <TableHead>{t('agent.farmerDetail.soilType')}</TableHead>
                        <TableHead>{t('agent.farmerDetail.location')}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {farmlands.map((land) => (
                        <TableRow key={land.id}>
                          <TableCell className="font-medium">{land.name}</TableCell>
                          <TableCell>
                            {land.area} {land.area_unit}
                          </TableCell>
                          <TableCell>{land.soil_type || '-'}</TableCell>
                          <TableCell>
                            {[land.village, land.district].filter(Boolean).join(', ') || '-'}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </PageHeader>

    {farmer && (
      <AgentSoilReportUploadDialog
        open={soilReportOpen}
        onOpenChange={setSoilReportOpen}
        farmers={[{ id: farmer.id, full_name: farmer.full_name }]}
        preselectedFarmerId={farmer.id}
      />
    )}
    </DashboardLayout>
  );
}
