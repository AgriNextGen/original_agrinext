import { useState, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useLanguage } from '@/hooks/useLanguage';
import { useFarmlands, Crop, Farmland } from '@/hooks/useFarmerDashboard';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';

interface EditCropDialogProps {
  crop: (Crop & { farmland: Farmland | null }) | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const EditCropDialog = ({ crop, open, onOpenChange }: EditCropDialogProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const { t } = useLanguage();
  const queryClient = useQueryClient();
  const { data: farmlands } = useFarmlands();
  const [isSaving, setIsSaving] = useState(false);

  const [formData, setFormData] = useState({
    crop_name: '',
    variety: '',
    land_id: '',
    sowing_date: '',
    harvest_estimate: '',
    status: 'growing' as 'growing' | 'one_week' | 'ready' | 'harvested',
    estimated_quantity: '',
    quantity_unit: 'quintals',
  });

  useEffect(() => {
    if (crop) {
      setFormData({
        crop_name: crop.crop_name,
        variety: crop.variety || '',
        land_id: crop.land_id || '',
        sowing_date: crop.sowing_date || '',
        harvest_estimate: crop.harvest_estimate || '',
        status: crop.status,
        estimated_quantity: crop.estimated_quantity?.toString() || '',
        quantity_unit: crop.quantity_unit || 'quintals',
      });
    }
  }, [crop]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.id || !crop) return;

    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('crops')
        .update({
          crop_name: formData.crop_name,
          variety: formData.variety || null,
          land_id: formData.land_id || null,
          sowing_date: formData.sowing_date || null,
          harvest_estimate: formData.harvest_estimate || null,
          status: formData.status,
          estimated_quantity: formData.estimated_quantity ? parseFloat(formData.estimated_quantity) : null,
          quantity_unit: formData.quantity_unit,
        })
        .eq('id', crop.id);

      if (error) throw error;

      toast({ title: t('farmer.crops.updateSuccess') });
      onOpenChange(false);
      queryClient.invalidateQueries({ queryKey: ['crops', user.id] });
    } catch (error: any) {
      toast({ title: t('common.error'), description: error.message, variant: 'destructive' });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{t('farmer.crops.editCrop')}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label>{t('farmer.crops.cropName')} *</Label>
            <Input
              value={formData.crop_name}
              onChange={(e) => setFormData({ ...formData, crop_name: e.target.value })}
              placeholder={t('farmer.crops.cropNamePlaceholder')}
              required
            />
          </div>
          <div>
            <Label>{t('farmer.crops.variety')}</Label>
            <Input
              value={formData.variety}
              onChange={(e) => setFormData({ ...formData, variety: e.target.value })}
              placeholder={t('farmer.crops.varietyPlaceholder')}
            />
          </div>
          <div>
            <Label>{t('farmer.crops.status')}</Label>
            <Select 
              value={formData.status} 
              onValueChange={(v) => setFormData({ ...formData, status: v as any })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="growing">{t('enum.crop_status.growing')}</SelectItem>
                <SelectItem value="one_week">{t('enum.crop_status.one_week')}</SelectItem>
                <SelectItem value="ready">{t('enum.crop_status.ready')}</SelectItem>
                <SelectItem value="harvested">{t('enum.crop_status.harvested')}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>{t('farmer.farmlands.title')}</Label>
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
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>{t('farmer.crops.sowingDate')}</Label>
              <Input
                type="date"
                value={formData.sowing_date}
                onChange={(e) => setFormData({ ...formData, sowing_date: e.target.value })}
              />
            </div>
            <div>
              <Label>{t('farmer.crops.harvestDate')}</Label>
              <Input
                type="date"
                value={formData.harvest_estimate}
                onChange={(e) => setFormData({ ...formData, harvest_estimate: e.target.value })}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>{t('farmer.crops.expectedQuantity')}</Label>
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

export default EditCropDialog;
