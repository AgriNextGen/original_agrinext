import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import DashboardLayout from '@/layouts/DashboardLayout';
import { useCrops, useFarmlands, Crop, Farmland } from '@/hooks/useFarmerDashboard';
import { useAuth } from '@/hooks/useAuth';
import { useLanguage } from '@/hooks/useLanguage';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from '@/components/ui/dialog';
import PageShell from '@/components/layout/PageShell';
import DataState from '@/components/ui/DataState';
import { useToast } from '@/hooks/use-toast';
import { Plus, Search, Sprout, Calendar, MapPin, Scale, Edit, Trash2, Truck, BookOpen } from 'lucide-react';
import { format } from 'date-fns';
import EditCropDialog from '@/components/farmer/EditCropDialog';
import RequestTransportDialog from '@/components/farmer/RequestTransportDialog';
import ConfirmDialog from '@/components/ui/confirm-dialog';
import EmptyState from '@/components/farmer/EmptyState';
import HelpTooltip from '@/components/farmer/HelpTooltip';

const CropsPage = () => {
  const { data: crops, isLoading } = useCrops();
  const { data: farmlands } = useFarmlands();
  const { user } = useAuth();
  const { toast } = useToast();
  const { t } = useLanguage();
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [editingCrop, setEditingCrop] = useState<(Crop & { farmland: Farmland | null }) | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [transportCrop, setTransportCrop] = useState<(Crop & { farmland: Farmland | null }) | null>(null);
  const [transportDialogOpen, setTransportDialogOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deletingCrop, setDeletingCrop] = useState<{ id: string; name: string } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  
  const [formData, setFormData] = useState({
    crop_name: '',
    variety: '',
    land_id: '',
    sowing_date: '',
    harvest_estimate: '',
    status: 'growing' as const,
    estimated_quantity: '',
    quantity_unit: 'quintals',
  });

  const statusConfig = {
    growing: { label: t('enum.crop_status.growing'), color: 'bg-muted text-muted-foreground', dotColor: 'bg-gray-400' },
    one_week: { label: t('enum.crop_status.one_week'), color: 'bg-amber-100 text-amber-800', dotColor: 'bg-amber-500' },
    ready: { label: t('enum.crop_status.ready'), color: 'bg-emerald-100 text-emerald-800', dotColor: 'bg-emerald-500' },
    harvested: { label: t('enum.crop_status.harvested'), color: 'bg-primary/10 text-primary', dotColor: 'bg-primary' },
  };

  const filteredCrops = crops?.filter(crop => {
    const matchesSearch = crop.crop_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      crop.variety?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || crop.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const stats = {
    total: crops?.length || 0,
    growing: crops?.filter(c => c.status === 'growing').length || 0,
    oneWeek: crops?.filter(c => c.status === 'one_week').length || 0,
    ready: crops?.filter(c => c.status === 'ready').length || 0,
    harvested: crops?.filter(c => c.status === 'harvested').length || 0,
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.id) return;

    try {
      const { error } = await supabase.from('crops').insert({
        farmer_id: user.id,
        crop_name: formData.crop_name,
        variety: formData.variety || null,
        land_id: formData.land_id || null,
        sowing_date: formData.sowing_date || null,
        harvest_estimate: formData.harvest_estimate || null,
        status: formData.status,
        estimated_quantity: formData.estimated_quantity ? parseFloat(formData.estimated_quantity) : null,
        quantity_unit: formData.quantity_unit,
      });

      if (error) throw error;

      toast({ title: t('common.success'), description: t('farmer.crops.addSuccess') });
      setIsDialogOpen(false);
      setFormData({
        crop_name: '',
        variety: '',
        land_id: '',
        sowing_date: '',
        harvest_estimate: '',
        status: 'growing',
        estimated_quantity: '',
        quantity_unit: 'quintals',
      });
      queryClient.invalidateQueries({ queryKey: ['crops', user.id] });
    } catch (error) {
      const message = error instanceof Error ? error.message : t('common.error');
      toast({ title: t('common.error'), description: message, variant: 'destructive' });
    }
  };

  const handleDeleteClick = (id: string, name: string) => {
    setDeletingCrop({ id, name });
    setDeleteConfirmOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!deletingCrop) return;
    
    setIsDeleting(true);
    try {
      const { error } = await supabase.from('crops').delete().eq('id', deletingCrop.id);
      if (error) throw error;
      toast({ title: t('farmer.crops.deleted'), description: t('farmer.crops.deleteSuccess') });
      queryClient.invalidateQueries({ queryKey: ['crops', user?.id] });
      setDeleteConfirmOpen(false);
      setDeletingCrop(null);
    } catch (error) {
      const message = error instanceof Error ? error.message : t('common.error');
      toast({ title: t('common.error'), description: message, variant: 'destructive' });
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <DashboardLayout title={t('farmer.crops.title')}>
      <PageShell title={t('farmer.crops.title')}>
        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <Card 
            className={`cursor-pointer hover:shadow-md transition-all ${statusFilter === 'all' ? 'ring-2 ring-primary shadow-md' : ''}`} 
            onClick={() => setStatusFilter('all')}
          >
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10 text-primary">
                  <Sprout className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.total}</p>
                  <p className="text-xs text-muted-foreground">{t('farmer.crops.totalCrops')}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className={`cursor-pointer hover:shadow-md transition-all ${statusFilter === 'growing' ? 'ring-2 ring-primary shadow-md' : ''}`} onClick={() => setStatusFilter('growing')}>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-muted">
                  <div className="w-5 h-5 rounded-full bg-gray-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.growing}</p>
                  <p className="text-xs text-muted-foreground">{t('enum.crop_status.growing')}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className={`cursor-pointer hover:shadow-md transition-all ${statusFilter === 'one_week' ? 'ring-2 ring-primary shadow-md' : ''}`} onClick={() => setStatusFilter('one_week')}>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-amber-100">
                  <div className="w-5 h-5 rounded-full bg-amber-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.oneWeek}</p>
                  <p className="text-xs text-muted-foreground">{t('enum.crop_status.one_week')}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className={`cursor-pointer hover:shadow-md transition-all ${statusFilter === 'ready' ? 'ring-2 ring-primary shadow-md' : ''}`} onClick={() => setStatusFilter('ready')}>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-emerald-100">
                  <div className="w-5 h-5 rounded-full bg-emerald-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.ready}</p>
                  <p className="text-xs text-muted-foreground">{t('enum.crop_status.ready')}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className={`cursor-pointer hover:shadow-md transition-all ${statusFilter === 'harvested' ? 'ring-2 ring-primary shadow-md' : ''}`} onClick={() => setStatusFilter('harvested')}>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <div className="w-5 h-5 rounded-full bg-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.harvested}</p>
                  <p className="text-xs text-muted-foreground">{t('enum.crop_status.harvested')}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Header */}
        <div className="flex flex-col sm:flex-row gap-4 justify-between">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={t('farmer.crops.searchPlaceholder')}
              className="pl-10"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button size="lg">
                <Plus className="h-4 w-4 mr-2" />
                {t('farmer.crops.addCrop')}
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>{t('farmer.crops.addNewCrop')}</DialogTitle>
                <DialogDescription>
                  {t('farmer.crops.addCropDescription')}
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label className="flex items-center">
                    {t('farmer.crops.cropName')} *
                    <HelpTooltip content={t('farmer.crops.cropNameHelp')} />
                  </Label>
                  <Input
                    value={formData.crop_name}
                    onChange={(e) => setFormData({ ...formData, crop_name: e.target.value })}
                    placeholder={t('farmer.crops.cropNamePlaceholder')}
                    required
                  />
                </div>
                <div>
                  <Label className="flex items-center">
                    {t('farmer.crops.variety')}
                    <HelpTooltip content={t('farmer.crops.varietyHelp')} />
                  </Label>
                  <Input
                    value={formData.variety}
                    onChange={(e) => setFormData({ ...formData, variety: e.target.value })}
                    placeholder={t('farmer.crops.varietyPlaceholder')}
                  />
                </div>
                <div>
                  <Label className="flex items-center">
                    {t('farmer.farmlands.title')}
                    <HelpTooltip content={t('farmer.crops.farmlandHelp')} />
                  </Label>
                  <Select value={formData.land_id} onValueChange={(v) => setFormData({ ...formData, land_id: v })}>
                    <SelectTrigger>
                      <SelectValue placeholder={t('farmer.crops.selectFarmland')} />
                    </SelectTrigger>
                    <SelectContent>
                      {farmlands?.map((land) => (
                        <SelectItem key={land.id} value={land.id}>
                          {land.name} ({land.area} {land.area_unit})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {(!farmlands || farmlands.length === 0) && (
                    <p className="text-xs text-muted-foreground mt-1">
                      {t('farmer.crops.noFarmlands')} <button type="button" className="text-primary underline" onClick={() => navigate('/farmer/farmlands')}>{t('farmer.crops.addFarmlandFirst')}</button>
                    </p>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="flex items-center">
                      {t('farmer.crops.sowingDate')}
                      <HelpTooltip content={t('farmer.crops.sowingDateHelp')} />
                    </Label>
                    <Input
                      type="date"
                      value={formData.sowing_date}
                      onChange={(e) => setFormData({ ...formData, sowing_date: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label className="flex items-center">
                      {t('farmer.crops.harvestDate')}
                      <HelpTooltip content={t('farmer.crops.harvestDateHelp')} />
                    </Label>
                    <Input
                      type="date"
                      value={formData.harvest_estimate}
                      onChange={(e) => setFormData({ ...formData, harvest_estimate: e.target.value })}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="flex items-center">
                      {t('farmer.crops.expectedQuantity')}
                      <HelpTooltip content={t('farmer.crops.quantityHelp')} />
                    </Label>
                    <Input
                      type="number"
                      value={formData.estimated_quantity}
                      onChange={(e) => setFormData({ ...formData, estimated_quantity: e.target.value })}
                      placeholder="50"
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
                <Button type="submit" className="w-full" size="lg">{t('farmer.crops.addCrop')}</Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Crops Grid */}
        {isLoading ? (
          <DataState loading>
            <></>
          </DataState>
        ) : filteredCrops?.length === 0 ? (
          <Card>
            <CardContent className="p-0">
              <EmptyState
                icon={Sprout}
                title={searchQuery || statusFilter !== 'all' ? t('farmer.crops.noCropsFound') : t('farmer.crops.noCropsYet')}
                description={
                  searchQuery || statusFilter !== 'all' 
                    ? t('farmer.crops.adjustSearch')
                    : t('farmer.crops.startAddingCrops')
                }
                actionLabel={searchQuery || statusFilter !== 'all' ? t('common.clearFilters') : t('farmer.crops.addFirstCrop')}
                onAction={() => {
                  if (searchQuery || statusFilter !== 'all') {
                    setSearchQuery('');
                    setStatusFilter('all');
                  } else {
                    setIsDialogOpen(true);
                  }
                }}
              />
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {filteredCrops?.map((crop) => {
              const status = statusConfig[crop.status];
              return (
                <Card key={crop.id} className="hover:shadow-medium transition-all group">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h3 className="font-semibold text-lg">{crop.crop_name}</h3>
                        {crop.variety && <p className="text-sm text-muted-foreground">{crop.variety}</p>}
                      </div>
                      <Badge className={status.color}>
                        <span className={`w-2 h-2 rounded-full mr-1.5 ${status.dotColor}`} />
                        {status.label}
                      </Badge>
                    </div>
                    <div className="space-y-2 text-sm text-muted-foreground mb-4">
                      {crop.farmland && (
                        <div className="flex items-center gap-2">
                          <MapPin className="h-4 w-4 shrink-0" />
                          <span className="truncate">{crop.farmland.name}</span>
                        </div>
                      )}
                      {crop.harvest_estimate && (
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 shrink-0" />
                          <span>{t('farmer.crops.harvest')}: {format(new Date(crop.harvest_estimate), 'MMM d, yyyy')}</span>
                        </div>
                      )}
                      {crop.estimated_quantity && (
                        <div className="flex items-center gap-2">
                          <Scale className="h-4 w-4 shrink-0" />
                          <span>{crop.estimated_quantity} {crop.quantity_unit}</span>
                        </div>
                      )}
                    </div>
                    <div className="flex gap-2 flex-wrap">
                      <Button variant="default" size="sm" className="flex-1" onClick={() => navigate(`/farmer/crops/${crop.id}`)}>
                        <BookOpen className="h-4 w-4 mr-1" />
                        {t('farmer.crops.diary')}
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => {
                        setEditingCrop(crop);
                        setEditDialogOpen(true);
                      }}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => {
                        setTransportCrop(crop);
                        setTransportDialogOpen(true);
                      }}>
                        <Truck className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="text-destructive hover:text-destructive hover:bg-destructive/10"
                        onClick={() => handleDeleteClick(crop.id, crop.crop_name)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </PageShell>

      <EditCropDialog
        crop={editingCrop}
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
      />
      
      <RequestTransportDialog
        crop={transportCrop}
        open={transportDialogOpen}
        onOpenChange={setTransportDialogOpen}
      />

      <ConfirmDialog
        open={deleteConfirmOpen}
        onOpenChange={setDeleteConfirmOpen}
        title={t('farmer.crops.deleteCrop')}
        description={t('farmer.crops.deleteConfirm')}
        confirmText={t('common.delete')}
        variant="destructive"
        onConfirm={handleDeleteConfirm}
        loading={isDeleting}
      />
    </DashboardLayout>
  );
};

export default CropsPage;
