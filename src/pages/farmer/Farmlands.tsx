import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import DashboardLayout from '@/layouts/DashboardLayout';
import { useFarmlands, Farmland } from '@/hooks/useFarmerDashboard';
import { useAuth } from '@/hooks/useAuth';
import { useLanguage } from '@/hooks/useLanguage';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from '@/components/ui/dialog';
import PageHeader from '@/components/shared/PageHeader';
import DataState from '@/components/ui/DataState';
import { useToast } from '@/hooks/use-toast';
import { Plus, Search, LandPlot, MapPin, Layers, Edit, Trash2, TreeDeciduous, TestTube2, Loader2, CheckCircle2 } from 'lucide-react';
import EditFarmlandDialog from '@/components/farmer/EditFarmlandDialog';
import ConfirmDialog from '@/components/ui/confirm-dialog';
import EmptyState from '@/components/shared/EmptyState';
import HelpTooltip from '@/components/farmer/HelpTooltip';
import FarmlandSoilReportsPanel from '@/components/farmer/soil-reports/FarmlandSoilReportsPanel';
import { useGeoCapture } from '@/hooks/useGeoCapture';

const FarmlandsPage = () => {
  const { data: farmlands, isLoading } = useFarmlands();
  const { user } = useAuth();
  const { toast } = useToast();
  const { t } = useLanguage();
  const queryClient = useQueryClient();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [editingFarmland, setEditingFarmland] = useState<Farmland | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deletingFarmland, setDeletingFarmland] = useState<{ id: string; name: string } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [soilReportsFarmland, setSoilReportsFarmland] = useState<Farmland | null>(null);
  const [soilReportsPanelOpen, setSoilReportsPanelOpen] = useState(false);
  const geo = useGeoCapture();
  
  const [formData, setFormData] = useState({
    name: '',
    area: '',
    area_unit: 'acres',
    soil_type: '',
    village: '',
    district: '',
  });

  const filteredFarmlands = farmlands?.filter(land =>
    land.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    land.village?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.id) return;

    setIsSubmitting(true);
    try {
      const { error } = await supabase.from('farmlands').insert({
        farmer_id: user.id,
        name: formData.name,
        area: parseFloat(formData.area),
        area_unit: formData.area_unit,
        soil_type: formData.soil_type || null,
        village: formData.village || null,
        district: formData.district || null,
        location_lat: geo.position?.latitude ?? null,
        location_long: geo.position?.longitude ?? null,
        geo_verified: !!geo.position,
      });

      if (error) throw error;

      toast({ title: t('common.success'), description: t('farmer.farmlands.addSuccess') });
      setIsDialogOpen(false);
      setFormData({ name: '', area: '', area_unit: 'acres', soil_type: '', village: '', district: '' });
      geo.clear();
      queryClient.invalidateQueries({ queryKey: ['farmlands', user.id] });
    } catch (error) {
      const message = error instanceof Error ? error.message : t('common.error');
      toast({ title: t('common.error'), description: message, variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteClick = (id: string, name: string) => {
    setDeletingFarmland({ id, name });
    setDeleteConfirmOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!deletingFarmland) return;
    
    setIsDeleting(true);
    try {
      const { error } = await supabase.from('farmlands').delete().eq('id', deletingFarmland.id);
      if (error) throw error;
      toast({ title: t('farmer.farmlands.deleted'), description: t('farmer.farmlands.deleteSuccess') });
      queryClient.invalidateQueries({ queryKey: ['farmlands', user?.id] });
      setDeleteConfirmOpen(false);
      setDeletingFarmland(null);
    } catch (error) {
      const message = error instanceof Error ? error.message : t('common.error');
      toast({ title: t('common.error'), description: message, variant: 'destructive' });
    } finally {
      setIsDeleting(false);
    }
  };

  const totalArea = farmlands?.reduce((sum, l) => sum + l.area, 0) || 0;

  const soilDistribution = farmlands?.reduce((acc, land) => {
    const soil = land.soil_type || 'unknown';
    acc[soil] = (acc[soil] || 0) + land.area;
    return acc;
  }, {} as Record<string, number>);

  return (
    <DashboardLayout title={t('farmer.farmlands.title')}>
      <PageHeader title={t('farmer.farmlands.title')}>
        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10 text-primary">
                  <LandPlot className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{farmlands?.length || 0}</p>
                  <p className="text-xs text-muted-foreground">{t('farmer.farmlands.totalPlots')}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-emerald-100 text-emerald-600">
                  <Layers className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{totalArea.toFixed(1)}</p>
                  <p className="text-xs text-muted-foreground">{t('farmer.farmlands.totalAcres')}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-amber-100 text-amber-600">
                  <TreeDeciduous className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-2xl font-bold">
                    {Object.keys(soilDistribution || {}).filter(k => k !== 'unknown').length}
                  </p>
                  <p className="text-xs text-muted-foreground">{t('farmer.farmlands.soilTypes')}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-blue-100 text-blue-600">
                  <MapPin className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-2xl font-bold">
                    {new Set(farmlands?.map(l => l.village).filter(Boolean)).size}
                  </p>
                  <p className="text-xs text-muted-foreground">{t('farmer.farmlands.villages')}</p>
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
              placeholder={t('farmer.farmlands.searchPlaceholder')}
              className="pl-10"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button size="lg" variant="default">
                <Plus className="h-4 w-4 mr-2" />
                {t('farmer.farmlands.addFarmland')}
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{t('farmer.farmlands.addNewFarmland')}</DialogTitle>
                <DialogDescription>
                  {t('farmer.farmlands.addFarmlandDescription')}
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label className="flex items-center">
                    {t('farmer.farmlands.plotName')} *
                    <HelpTooltip content={t('farmer.farmlands.plotNameHelp')} />
                  </Label>
                  <Input
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder={t('farmer.farmlands.plotNamePlaceholder')}
                    required
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="flex items-center">
                      {t('farmer.farmlands.area')} *
                      <HelpTooltip content={t('farmer.farmlands.areaHelp')} />
                    </Label>
                    <Input
                      type="number"
                      step="0.1"
                      value={formData.area}
                      onChange={(e) => setFormData({ ...formData, area: e.target.value })}
                      placeholder="5"
                      required
                    />
                  </div>
                  <div>
                    <Label>{t('common.unit')}</Label>
                    <Select value={formData.area_unit} onValueChange={(v) => setFormData({ ...formData, area_unit: v })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="acres">{t('enum.area_units.acres')}</SelectItem>
                        <SelectItem value="hectares">{t('enum.area_units.hectares')}</SelectItem>
                        <SelectItem value="bigha">{t('enum.area_units.bigha')}</SelectItem>
                        <SelectItem value="guntha">{t('enum.area_units.guntha')}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div>
                  <Label className="flex items-center">
                    {t('farmer.farmlands.soilType')}
                    <HelpTooltip content={t('farmer.farmlands.soilTypeHelp')} />
                  </Label>
                  <Select value={formData.soil_type} onValueChange={(v) => setFormData({ ...formData, soil_type: v })}>
                    <SelectTrigger>
                      <SelectValue placeholder={t('farmer.farmlands.selectSoilType')} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="alluvial">{t('enum.soil_types.alluvial')}</SelectItem>
                      <SelectItem value="black">{t('enum.soil_types.black')}</SelectItem>
                      <SelectItem value="red">{t('enum.soil_types.red')}</SelectItem>
                      <SelectItem value="laterite">{t('enum.soil_types.laterite')}</SelectItem>
                      <SelectItem value="sandy">{t('enum.soil_types.sandy')}</SelectItem>
                      <SelectItem value="clay">{t('enum.soil_types.clay')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>{t('farmer.farmlands.village')}</Label>
                    <Input
                      value={formData.village}
                      onChange={(e) => setFormData({ ...formData, village: e.target.value })}
                      placeholder={t('farmer.farmlands.villagePlaceholder')}
                    />
                  </div>
                  <div>
                    <Label>{t('farmer.farmlands.district')}</Label>
                    <Input
                      value={formData.district}
                      onChange={(e) => setFormData({ ...formData, district: e.target.value })}
                      placeholder={t('farmer.farmlands.districtPlaceholder')}
                    />
                  </div>
                </div>

                {/* GPS Capture */}
                <div className="rounded-lg border border-border p-3 space-y-2">
                  <Label className="text-sm font-medium flex items-center gap-1.5">
                    <MapPin className="h-4 w-4" />
                    Farm Location (GPS) - Optional
                  </Label>
                  {geo.position ? (
                    <div className="flex items-center justify-between">
                      <span className="text-sm flex items-center gap-1 text-green-600">
                        <CheckCircle2 className="h-4 w-4" />
                        Location captured
                      </span>
                      <Button type="button" variant="outline" size="sm" onClick={() => geo.capture()} disabled={geo.capturing}>
                        {geo.capturing ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : null}
                        Recapture
                      </Button>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Location not added</span>
                      <Button type="button" variant="outline" size="sm" onClick={() => geo.capture()} disabled={geo.capturing}>
                        {geo.capturing ? (
                          <><Loader2 className="h-3 w-3 animate-spin mr-1" /> Capturing...</>
                        ) : (
                          <><MapPin className="h-3 w-3 mr-1" /> Capture Location</>
                        )}
                      </Button>
                    </div>
                  )}
                </div>

                <Button type="submit" variant="default" className="w-full" size="lg" disabled={isSubmitting}>
                  {isSubmitting ? t('common.saving') : t('farmer.farmlands.addFarmland')}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Farmlands Grid */}
        {isLoading ? (
          <DataState loading>
            <></>
          </DataState>
        ) : filteredFarmlands?.length === 0 ? (
          <Card>
            <CardContent className="p-0">
              <EmptyState
                icon={LandPlot}
                title={searchQuery ? t('farmer.farmlands.noFarmlandsFound') : t('farmer.farmlands.noFarmlandsYet')}
                description={
                  searchQuery 
                    ? t('farmer.farmlands.adjustSearch')
                    : t('farmer.farmlands.startAddingFarmlands')
                }
                actionLabel={searchQuery ? t('common.clearSearch') : t('farmer.farmlands.addFirstFarmland')}
                onAction={() => {
                  if (searchQuery) {
                    setSearchQuery('');
                  } else {
                    setIsDialogOpen(true);
                  }
                }}
              />
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {filteredFarmlands?.map((land) => (
              <Card key={land.id} className="hover:shadow-medium transition-all group">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className="p-2 rounded-lg bg-amber-100 text-amber-600">
                        <LandPlot className="h-5 w-5" />
                      </div>
                      <div>
                        <h3 className="font-semibold">{land.name}</h3>
                        <p className="text-sm text-muted-foreground">{land.area} {land.area_unit}</p>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-2 text-sm text-muted-foreground mb-4">
                    {land.village && (
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4 shrink-0" />
                        <span className="truncate">{land.village}{land.district ? `, ${land.district}` : ''}</span>
                      </div>
                    )}
                    {land.soil_type && (
                      <div className="flex items-center gap-2">
                        <Layers className="h-4 w-4 shrink-0" />
                        <span className="capitalize">{t(`enum.soil_types.${land.soil_type}`)}</span>
                      </div>
                    )}
                    {(land as { geo_verified?: boolean }).geo_verified ? (
                      <div className="flex items-center gap-2 text-green-600">
                        <CheckCircle2 className="h-4 w-4 shrink-0" />
                        <span>Location captured</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4 shrink-0 opacity-40" />
                        <span>Location not added</span>
                      </div>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="flex-1"
                      onClick={() => {
                        setSoilReportsFarmland(land);
                        setSoilReportsPanelOpen(true);
                      }}
                    >
                      <TestTube2 className="h-4 w-4 mr-1" />
                      {t('farmer.farmlands.soilReports')}
                    </Button>
                    <Button
                      aria-label={`Edit ${land.name}`}
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setEditingFarmland(land);
                        setEditDialogOpen(true);
                      }}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      aria-label={`Delete ${land.name}`}
                      variant="outline"
                      size="sm"
                      className="text-destructive hover:text-destructive hover:bg-destructive/10"
                      onClick={() => handleDeleteClick(land.id, land.name)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </PageHeader>

      <EditFarmlandDialog
        farmland={editingFarmland}
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
      />

      <FarmlandSoilReportsPanel
        farmland={soilReportsFarmland}
        open={soilReportsPanelOpen}
        onOpenChange={setSoilReportsPanelOpen}
      />

      <ConfirmDialog
        open={deleteConfirmOpen}
        onOpenChange={setDeleteConfirmOpen}
        title={t('farmer.farmlands.deleteFarmland')}
        description={t('farmer.farmlands.deleteConfirm')}
        confirmText={t('common.delete')}
        variant="destructive"
        onConfirm={handleDeleteConfirm}
        loading={isDeleting}
      />
    </DashboardLayout>
  );
};

export default FarmlandsPage;

