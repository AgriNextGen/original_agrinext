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
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useStartVisit, useActiveVisit } from '@/hooks/useAgentAssignments';
import { useLanguage } from '@/hooks/useLanguage';
import { toast } from 'sonner';
import { format, parseISO } from 'date-fns';

export default function AgentFarmerDetail() {
  const { farmerId } = useParams<{ farmerId: string }>();
  const navigate = useNavigate();
  const { language } = useLanguage();
  const startVisit = useStartVisit();
  const { data: activeVisit } = useActiveVisit();
  const [activeTab, setActiveTab] = useState('overview');

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
      toast.error(
        language === 'kn'
          ? 'ದಯವಿಟ್ಟು ಮೊದಲು ಪ್ರಸ್ತುತ ಭೇಟಿಯನ್ನು ಮುಗಿಸಿ'
          : 'Please end your current visit first'
      );
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
    const statusConfig: Record<string, { label: string; className: string }> = {
      growing: { label: 'Growing', className: 'bg-blue-100 text-blue-800' },
      one_week: { label: '1 Week', className: 'bg-amber-100 text-amber-800' },
      ready: { label: 'Ready', className: 'bg-green-100 text-green-800' },
      harvested: { label: 'Harvested', className: 'bg-gray-100 text-gray-800' },
      requested: { label: 'Requested', className: 'bg-amber-100 text-amber-800' },
      assigned: { label: 'Assigned', className: 'bg-blue-100 text-blue-800' },
      en_route: { label: 'En Route', className: 'bg-purple-100 text-purple-800' },
      picked_up: { label: 'Picked Up', className: 'bg-cyan-100 text-cyan-800' },
      delivered: { label: 'Delivered', className: 'bg-green-100 text-green-800' },
      cancelled: { label: 'Cancelled', className: 'bg-red-100 text-red-800' },
    };
    const config = statusConfig[status] || { label: status, className: 'bg-gray-100 text-gray-800' };
    return <Badge className={config.className}>{config.label}</Badge>;
  };

  if (farmerLoading) {
    return (
      <DashboardLayout title={language === 'kn' ? 'ರೈತ ವಿವರಗಳು' : 'Farmer Details'}>
        <div className="space-y-6">
          <Skeleton className="h-10 w-48" />
          <Skeleton className="h-40 w-full" />
        </div>
      </DashboardLayout>
    );
  }

  if (!farmer) {
    return (
      <DashboardLayout title={language === 'kn' ? 'ರೈತ ವಿವರಗಳು' : 'Farmer Details'}>
        <div className="text-center py-12">
          <User className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
          <p className="text-muted-foreground">
            {language === 'kn' ? 'ರೈತ ಕಂಡುಬಂದಿಲ್ಲ' : 'Farmer not found'}
          </p>
          <Button variant="outline" className="mt-4" onClick={() => navigate('/agent/my-farmers')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            {language === 'kn' ? 'ಹಿಂತಿರುಗಿ' : 'Go Back'}
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title={farmer.full_name || (language === 'kn' ? 'ರೈತ' : 'Farmer')}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <Button variant="ghost" onClick={() => navigate('/agent/my-farmers')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            {language === 'kn' ? 'ಹಿಂತಿರುಗಿ' : 'Back'}
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handleCall} disabled={!farmer.phone}>
              <Phone className="h-4 w-4 mr-1" />
              {language === 'kn' ? 'ಕರೆ' : 'Call'}
            </Button>
            <Button
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
              size="sm"
              onClick={handleStartVisit}
              disabled={startVisit.isPending || !!activeVisit}
            >
              <Play className="h-4 w-4 mr-1" />
              {language === 'kn' ? 'ಭೇಟಿ ಪ್ರಾರಂಭಿಸಿ' : 'Start Visit'}
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
                  {farmer.full_name || (language === 'kn' ? 'ಅಪರಿಚಿತ' : 'Unknown')}
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
                <div className="text-2xl font-bold text-primary">{crops?.length || 0}</div>
                <p className="text-sm text-muted-foreground">
                  {language === 'kn' ? 'ಸಕ್ರಿಯ ಬೆಳೆಗಳು' : 'Active Crops'}
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
              <span className="hidden sm:inline">{language === 'kn' ? 'ಅವಲೋಕನ' : 'Overview'}</span>
            </TabsTrigger>
            <TabsTrigger value="update" className="flex items-center gap-1">
              <Edit className="h-4 w-4" />
              <span className="hidden sm:inline">{language === 'kn' ? 'ನವೀಕರಣ' : 'Update'}</span>
            </TabsTrigger>
            <TabsTrigger value="tasks" className="flex items-center gap-1">
              <ClipboardList className="h-4 w-4" />
              <span className="hidden sm:inline">{language === 'kn' ? 'ಕಾರ್ಯಗಳು' : 'Tasks'}</span>
            </TabsTrigger>
            <TabsTrigger value="crops" className="flex items-center gap-1">
              <Sprout className="h-4 w-4" />
              <span className="hidden sm:inline">{language === 'kn' ? 'ಬೆಳೆಗಳು' : 'Crops'}</span>
            </TabsTrigger>
            <TabsTrigger value="transport" className="flex items-center gap-1">
              <Truck className="h-4 w-4" />
              <span className="hidden sm:inline">{language === 'kn' ? 'ಸಾರಿಗೆ' : 'Transport'}</span>
            </TabsTrigger>
            <TabsTrigger value="farmlands" className="flex items-center gap-1">
              <FileText className="h-4 w-4" />
              <span className="hidden sm:inline">{language === 'kn' ? 'ಜಮೀನುಗಳು' : 'Farmlands'}</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="mt-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    {language === 'kn' ? 'ಒಟ್ಟು ಭೂಮಿ' : 'Total Land'}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {farmer.total_land_area || 0} <span className="text-sm font-normal">acres</span>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    {language === 'kn' ? 'ಜಮೀನುಗಳು' : 'Farmlands'}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{farmlands?.length || 0}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    {language === 'kn' ? 'ಬಾಕಿ ಸಾರಿಗೆ' : 'Pending Transport'}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-amber-600">
                    {transport?.filter((t) => t.status === 'requested').length || 0}
                  </div>
                </CardContent>
              </Card>
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
                      {language === 'kn' ? 'ಯಾವುದೇ ಬೆಳೆಗಳಿಲ್ಲ' : 'No crops found'}
                    </p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{language === 'kn' ? 'ಬೆಳೆ' : 'Crop'}</TableHead>
                        <TableHead>{language === 'kn' ? 'ಪ್ರಮಾಣ' : 'Quantity'}</TableHead>
                        <TableHead>{language === 'kn' ? 'ಸ್ಥಿತಿ' : 'Status'}</TableHead>
                        <TableHead>{language === 'kn' ? 'ಕೊಯ್ಲು' : 'Harvest'}</TableHead>
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
                      {language === 'kn' ? 'ಯಾವುದೇ ಸಾರಿಗೆ ವಿನಂತಿಗಳಿಲ್ಲ' : 'No transport requests'}
                    </p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{language === 'kn' ? 'ಸ್ಥಳ' : 'Location'}</TableHead>
                        <TableHead>{language === 'kn' ? 'ಪ್ರಮಾಣ' : 'Quantity'}</TableHead>
                        <TableHead>{language === 'kn' ? 'ಸ್ಥಿತಿ' : 'Status'}</TableHead>
                        <TableHead>{language === 'kn' ? 'ದಿನಾಂಕ' : 'Date'}</TableHead>
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
                      {language === 'kn' ? 'ಯಾವುದೇ ಜಮೀನುಗಳಿಲ್ಲ' : 'No farmlands found'}
                    </p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{language === 'kn' ? 'ಹೆಸರು' : 'Name'}</TableHead>
                        <TableHead>{language === 'kn' ? 'ವಿಸ್ತೀರ್ಣ' : 'Area'}</TableHead>
                        <TableHead>{language === 'kn' ? 'ಮಣ್ಣಿನ ಪ್ರಕಾರ' : 'Soil Type'}</TableHead>
                        <TableHead>{language === 'kn' ? 'ಸ್ಥಳ' : 'Location'}</TableHead>
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
    </DashboardLayout>
  );
}
