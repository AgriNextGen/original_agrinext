import { useState, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useLanguage } from '@/hooks/useLanguage';
import { Farmland } from '@/hooks/useFarmerDashboard';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Loader2, MapPin, CheckCircle2 } from 'lucide-react';
import { useGeoCapture } from '@/hooks/useGeoCapture';

interface EditFarmlandDialogProps {
  farmland: Farmland | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const EditFarmlandDialog = ({ farmland, open, onOpenChange }: EditFarmlandDialogProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const { t } = useLanguage();
  const queryClient = useQueryClient();
  const [isSaving, setIsSaving] = useState(false);
  const geo = useGeoCapture();

  const [formData, setFormData] = useState({
    name: '',
    area: '',
    area_unit: 'acres',
    soil_type: '',
    village: '',
    district: '',
  });

  const [geoState, setGeoState] = useState<{
    lat: number | null;
    lng: number | null;
    verified: boolean;
  }>({ lat: null, lng: null, verified: false });

  useEffect(() => {
    if (farmland) {
      setFormData({
        name: farmland.name,
        area: farmland.area.toString(),
        area_unit: farmland.area_unit,
        soil_type: farmland.soil_type || '',
        village: farmland.village || '',
        district: farmland.district || '',
      });
      setGeoState({
        lat: (farmland as any).location_lat || null,
        lng: (farmland as any).location_long || null,
        verified: (farmland as any).geo_verified || false,
      });
    }
  }, [farmland]);

  const handleCaptureLocation = async () => {
    const pos = await geo.capture();
    if (pos) {
      setGeoState({ lat: pos.latitude, lng: pos.longitude, verified: true });
      toast({ title: 'Location captured', description: `Accuracy: ~${Math.round(pos.accuracy)}m` });
    } else if (geo.error) {
      toast({ title: 'Location error', description: geo.error, variant: 'destructive' });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.id || !farmland) return;

    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('farmlands')
        .update({
          name: formData.name,
          area: parseFloat(formData.area),
          area_unit: formData.area_unit,
          soil_type: formData.soil_type || null,
          village: formData.village || null,
          district: formData.district || null,
          location_lat: geoState.lat,
          location_long: geoState.lng,
          geo_verified: geoState.verified,
        })
        .eq('id', farmland.id);

      if (error) throw error;

      toast({ title: t('farmer.farmlands.updateSuccess') });
      onOpenChange(false);
      queryClient.invalidateQueries({ queryKey: ['farmlands', user.id] });
    } catch (error: any) {
      toast({ title: t('common.error'), description: error.message, variant: 'destructive' });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('farmer.farmlands.editFarmland')}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label>{t('farmer.farmlands.plotName')} *</Label>
            <Input
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder={t('farmer.farmlands.plotNamePlaceholder')}
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>{t('farmer.farmlands.area')} *</Label>
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
            <Label>{t('farmer.farmlands.soilType')}</Label>
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
              Farm Location (GPS)
            </Label>
            {geoState.verified ? (
              <div className="flex items-center justify-between">
                <span className="text-sm text-green-600 flex items-center gap-1">
                  <CheckCircle2 className="h-4 w-4" />
                  📍 Location Captured
                </span>
                <Button type="button" variant="outline" size="sm" onClick={handleCaptureLocation} disabled={geo.capturing}>
                  {geo.capturing ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : null}
                  Recapture
                </Button>
              </div>
            ) : (
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Location not added</span>
                <Button type="button" variant="outline" size="sm" onClick={handleCaptureLocation} disabled={geo.capturing}>
                  {geo.capturing ? (
                    <><Loader2 className="h-3 w-3 animate-spin mr-1" /> Capturing...</>
                  ) : (
                    <><MapPin className="h-3 w-3 mr-1" /> Capture Location</>
                  )}
                </Button>
              </div>
            )}
          </div>

          <Button type="submit" className="w-full" disabled={isSaving}>
            {isSaving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                {t('common.saving')}
              </>
            ) : (
              t('common.saveChanges')
            )}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default EditFarmlandDialog;
