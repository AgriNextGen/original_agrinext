import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import DashboardLayout from '@/layouts/DashboardLayout';
import { useTransportRequests, useCrops, useFarmlands } from '@/hooks/useFarmerDashboard';
import { useAuth } from '@/hooks/useAuth';
import { useLanguage } from '@/hooks/useLanguage';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from '@/components/ui/dialog';
import PageShell from '@/components/layout/PageShell';
import DataState from '@/components/ui/DataState';
import { useToast } from '@/hooks/use-toast';
import { Plus, Truck, MapPin, Calendar, Package, Clock, CheckCircle2, XCircle } from 'lucide-react';
import { format } from 'date-fns';
import ConfirmDialog from '@/components/ui/confirm-dialog';
import EmptyState from '@/components/farmer/EmptyState';
import HelpTooltip from '@/components/farmer/HelpTooltip';

const TransportPage = () => {
  const { data: requests, isLoading } = useTransportRequests();
  const { data: crops } = useCrops();
  const { data: farmlands } = useFarmlands();
  const { user } = useAuth();
  const { toast } = useToast();
  const { t } = useLanguage();
  const queryClient = useQueryClient();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [cancelConfirmOpen, setCancelConfirmOpen] = useState(false);
  const [cancellingRequest, setCancellingRequest] = useState<{ id: string; cropName: string } | null>(null);
  const [isCancelling, setIsCancelling] = useState(false);
  
  const [formData, setFormData] = useState({
    crop_id: '',
    quantity: '',
    quantity_unit: 'quintals',
    pickup_location: '',
    pickup_village: '',
    preferred_date: '',
    preferred_time: '',
    notes: '',
  });

  const statusConfig = {
    requested: { label: t('enum.transport_status.requested'), color: 'bg-blue-100 text-blue-800', icon: Clock },
    assigned: { label: t('enum.transport_status.assigned'), color: 'bg-purple-100 text-purple-800', icon: Truck },
    en_route: { label: t('enum.transport_status.en_route'), color: 'bg-amber-100 text-amber-800', icon: Truck },
    picked_up: { label: t('enum.transport_status.picked_up'), color: 'bg-emerald-100 text-emerald-800', icon: Package },
    delivered: { label: t('enum.transport_status.delivered'), color: 'bg-primary/10 text-primary', icon: CheckCircle2 },
    cancelled: { label: t('enum.transport_status.cancelled'), color: 'bg-destructive/10 text-destructive', icon: XCircle },
  };

  const filteredRequests = requests?.filter(req => 
    statusFilter === 'all' || req.status === statusFilter
  );

  const activeCount = requests?.filter(r => !['delivered', 'cancelled'].includes(r.status)).length || 0;
  const completedCount = requests?.filter(r => r.status === 'delivered').length || 0;

  // Auto-fill pickup location from selected crop's farmland
  const handleCropSelect = (cropId: string) => {
    setFormData({ ...formData, crop_id: cropId });
    const selectedCrop = crops?.find(c => c.id === cropId);
    if (selectedCrop?.farmland) {
      const location = [selectedCrop.farmland.name, selectedCrop.farmland.village, selectedCrop.farmland.district]
        .filter(Boolean)
        .join(', ');
      setFormData(prev => ({ 
        ...prev, 
        crop_id: cropId,
        pickup_location: location,
        pickup_village: selectedCrop.farmland?.village || '',
      }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.id) return;

    try {
      const { error } = await supabase.from('transport_requests').insert({
        farmer_id: user.id,
        crop_id: formData.crop_id || null,
        quantity: parseFloat(formData.quantity),
        quantity_unit: formData.quantity_unit,
        pickup_location: formData.pickup_location,
        pickup_village: formData.pickup_village || null,
        preferred_date: formData.preferred_date || null,
        preferred_time: formData.preferred_time || null,
        notes: formData.notes || null,
      });

      if (error) throw error;

      toast({ title: t('common.success'), description: t('farmer.transport.requestSuccess') });
      setIsDialogOpen(false);
      setFormData({
        crop_id: '',
        quantity: '',
        quantity_unit: 'quintals',
        pickup_location: '',
        pickup_village: '',
        preferred_date: '',
        preferred_time: '',
        notes: '',
      });
      queryClient.invalidateQueries({ queryKey: ['transport-requests', user.id] });
    } catch (error) {
      const message = error instanceof Error ? error.message : t('common.error');
      toast({ title: t('common.error'), description: message, variant: 'destructive' });
    }
  };

  const handleCancelClick = (id: string, cropName: string) => {
    setCancellingRequest({ id, cropName });
    setCancelConfirmOpen(true);
  };

  const handleCancelConfirm = async () => {
    if (!cancellingRequest) return;
    
    setIsCancelling(true);
    try {
      const { error } = await supabase
        .from('transport_requests')
        .update({ status: 'cancelled' })
        .eq('id', cancellingRequest.id);
      if (error) throw error;
      toast({ title: t('farmer.transport.cancelled'), description: t('farmer.transport.cancelSuccess') });
      queryClient.invalidateQueries({ queryKey: ['transport-requests', user?.id] });
      setCancelConfirmOpen(false);
      setCancellingRequest(null);
    } catch (error) {
      const message = error instanceof Error ? error.message : t('common.error');
      toast({ title: t('common.error'), description: message, variant: 'destructive' });
    } finally {
      setIsCancelling(false);
    }
  };

  const filterButtons = [
    { value: 'all', label: t('common.all'), count: requests?.length },
    { value: 'requested', label: t('farmer.transport.pending'), count: requests?.filter(r => r.status === 'requested').length },
    { value: 'assigned', label: t('enum.transport_status.assigned'), count: requests?.filter(r => r.status === 'assigned').length },
    { value: 'en_route', label: t('enum.transport_status.en_route'), count: requests?.filter(r => r.status === 'en_route').length },
    { value: 'delivered', label: t('enum.transport_status.delivered'), count: completedCount },
  ];

  return (
    <DashboardLayout title={t('farmer.transport.title')}>
      <PageShell title={t('farmer.transport.title')}>
        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-blue-100 text-blue-600">
                  <Clock className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{activeCount}</p>
                  <p className="text-xs text-muted-foreground">{t('farmer.transport.activeRequests')}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-emerald-100 text-emerald-600">
                  <CheckCircle2 className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{completedCount}</p>
                  <p className="text-xs text-muted-foreground">{t('farmer.transport.completed')}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-amber-100 text-amber-600">
                  <Truck className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-2xl font-bold">
                    {requests?.filter(r => r.status === 'en_route').length || 0}
                  </p>
                  <p className="text-xs text-muted-foreground">{t('farmer.transport.inTransit')}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10 text-primary">
                  <Package className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{requests?.length || 0}</p>
                  <p className="text-xs text-muted-foreground">{t('farmer.transport.totalRequests')}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Header */}
        <div className="flex flex-col sm:flex-row gap-4 justify-between">
          <div className="flex gap-2 flex-wrap">
            {filterButtons.map((btn) => (
              <Button
                key={btn.value}
                variant={statusFilter === btn.value ? 'default' : 'outline'}
                size="sm"
                onClick={() => setStatusFilter(btn.value)}
              >
                {btn.label}
                {btn.count !== undefined && btn.count > 0 && (
                  <span className="ml-1.5 px-1.5 py-0.5 rounded-full text-xs bg-background/20">
                    {btn.count}
                  </span>
                )}
              </Button>
            ))}
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button size="lg">
                <Plus className="h-4 w-4 mr-2" />
                {t('farmer.transport.newRequest')}
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>{t('farmer.transport.requestTransport')}</DialogTitle>
                <DialogDescription>
                  {t('farmer.transport.requestDescription')}
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label className="flex items-center">
                    {t('farmer.transport.crop')}
                    <HelpTooltip content={t('farmer.transport.cropHelp')} />
                  </Label>
                  <Select value={formData.crop_id} onValueChange={handleCropSelect}>
                    <SelectTrigger>
                      <SelectValue placeholder={t('farmer.transport.selectCrop')} />
                    </SelectTrigger>
                    <SelectContent>
                      {crops?.filter(c => c.status !== 'harvested').map((crop) => (
                        <SelectItem key={crop.id} value={crop.id}>
                          {crop.crop_name} {crop.variety && `(${crop.variety})`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="flex items-center">
                      {t('farmer.transport.quantity')} *
                      <HelpTooltip content={t('farmer.transport.quantityHelp')} />
                    </Label>
                    <Input
                      type="number"
                      value={formData.quantity}
                      onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                      placeholder="50"
                      required
                    />
                  </div>
                  <div>
                    <Label>{t('common.unit')}</Label>
                    <Select value={formData.quantity_unit} onValueChange={(v) => setFormData({ ...formData, quantity_unit: v })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="quintals">{t('enum.units.quintals')}</SelectItem>
                        <SelectItem value="kg">{t('enum.units.kg')}</SelectItem>
                        <SelectItem value="tonnes">{t('enum.units.tonnes')}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div>
                  <Label className="flex items-center">
                    {t('farmer.transport.pickupLocation')} *
                    <HelpTooltip content={t('farmer.transport.pickupHelp')} />
                  </Label>
                  <Input
                    value={formData.pickup_location}
                    onChange={(e) => setFormData({ ...formData, pickup_location: e.target.value })}
                    placeholder={t('farmer.transport.pickupPlaceholder')}
                    required
                  />
                </div>
                <div>
                  <Label>{t('farmer.farmlands.village')}</Label>
                  <Input
                    value={formData.pickup_village}
                    onChange={(e) => setFormData({ ...formData, pickup_village: e.target.value })}
                    placeholder={t('farmer.farmlands.villagePlaceholder')}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>{t('farmer.transport.preferredDate')}</Label>
                    <Input
                      type="date"
                      value={formData.preferred_date}
                      onChange={(e) => setFormData({ ...formData, preferred_date: e.target.value })}
                      min={new Date().toISOString().split('T')[0]}
                    />
                  </div>
                  <div>
                    <Label className="flex items-center">
                      {t('farmer.transport.preferredTime')}
                      <HelpTooltip content={t('farmer.transport.timeHelp')} />
                    </Label>
                    <Select value={formData.preferred_time} onValueChange={(v) => setFormData({ ...formData, preferred_time: v })}>
                      <SelectTrigger>
                        <SelectValue placeholder={t('farmer.transport.selectTime')} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Early Morning (5-8 AM)">{t('farmer.transport.earlyMorning')}</SelectItem>
                        <SelectItem value="Morning (8-11 AM)">{t('farmer.transport.morning')}</SelectItem>
                        <SelectItem value="Afternoon (12-3 PM)">{t('farmer.transport.afternoon')}</SelectItem>
                        <SelectItem value="Evening (4-6 PM)">{t('farmer.transport.evening')}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div>
                  <Label>{t('farmer.transport.notes')}</Label>
                  <Textarea
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    placeholder={t('farmer.transport.notesPlaceholder')}
                    rows={2}
                  />
                </div>
                <Button type="submit" className="w-full" size="lg">{t('farmer.transport.submitRequest')}</Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Requests List */}
        {isLoading ? (
          <DataState loading>
            <></>
          </DataState>
        ) : filteredRequests?.length === 0 ? (
          <Card>
            <CardContent className="p-0">
              <EmptyState
                icon={Truck}
                title={statusFilter !== 'all' ? t('farmer.transport.noRequestsFound') : t('farmer.transport.noRequestsYet')}
                description={
                  statusFilter !== 'all'
                    ? t('farmer.transport.tryDifferentFilter')
                    : t('farmer.transport.startRequestingTransport')
                }
                actionLabel={statusFilter !== 'all' ? t('common.showAll') : t('farmer.transport.createFirstRequest')}
                onAction={() => {
                  if (statusFilter !== 'all') {
                    setStatusFilter('all');
                  } else {
                    setIsDialogOpen(true);
                  }
                }}
              />
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {filteredRequests?.map((request) => {
              const status = statusConfig[request.status];
              const StatusIcon = status.icon;
              
              return (
                <Card key={request.id} className="hover:shadow-medium transition-all">
                  <CardContent className="p-4">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <div className={`p-2 rounded-lg ${status.color}`}>
                            <StatusIcon className="h-4 w-4" />
                          </div>
                          <span className="font-semibold text-lg">
                            {request.crop?.crop_name || t('farmer.transport.generalProduce')}
                          </span>
                          <span className="text-muted-foreground">
                            - {request.quantity} {request.quantity_unit}
                          </span>
                          <Badge className={status.color}>{status.label}</Badge>
                        </div>
                        <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <MapPin className="h-4 w-4 shrink-0" />
                            <span className="truncate max-w-[200px]">{request.pickup_village || request.pickup_location}</span>
                          </div>
                          {request.preferred_date && (
                            <div className="flex items-center gap-1">
                              <Calendar className="h-4 w-4" />
                              <span>{format(new Date(request.preferred_date), 'MMM d, yyyy')}</span>
                            </div>
                          )}
                          {request.preferred_time && (
                            <div className="flex items-center gap-1">
                              <Clock className="h-4 w-4" />
                              <span>{request.preferred_time}</span>
                            </div>
                          )}
                        </div>
                      </div>
                      {request.status === 'requested' && (
                        <Button 
                          variant="outline" 
                          size="sm"
                          className="text-destructive hover:text-destructive hover:bg-destructive/10"
                          onClick={() => handleCancelClick(request.id, request.crop?.crop_name || t('farmer.transport.generalProduce'))}
                        >
                          {t('farmer.transport.cancelRequest')}
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </PageShell>

      <ConfirmDialog
        open={cancelConfirmOpen}
        onOpenChange={setCancelConfirmOpen}
        title={t('farmer.transport.cancelTransportRequest')}
        description={t('farmer.transport.cancelConfirm')}
        confirmText={t('farmer.transport.yesCancel')}
        variant="destructive"
        onConfirm={handleCancelConfirm}
        loading={isCancelling}
      />
    </DashboardLayout>
  );
};

export default TransportPage;

