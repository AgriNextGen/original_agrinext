import { useState, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useLanguage } from '@/hooks/useLanguage';
import { useCrops, Crop, Farmland } from '@/hooks/useFarmerDashboard';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Truck } from 'lucide-react';

interface RequestTransportDialogProps {
  crop?: (Crop & { farmland: Farmland | null }) | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const RequestTransportDialog = ({ crop, open, onOpenChange }: RequestTransportDialogProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const { t } = useLanguage();
  const queryClient = useQueryClient();
  const { data: crops } = useCrops();
  const [isSaving, setIsSaving] = useState(false);

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

  useEffect(() => {
    if (crop) {
      setFormData(prev => ({
        ...prev,
        crop_id: crop.id,
        quantity: crop.estimated_quantity?.toString() || '',
        quantity_unit: crop.quantity_unit || 'quintals',
        pickup_location: crop.farmland?.name || '',
        pickup_village: crop.farmland?.village || '',
      }));
    }
  }, [crop]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.id) return;

    setIsSaving(true);
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

      toast({ title: t('farmer.transport.requestSuccess') });
      onOpenChange(false);
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
          <DialogTitle className="flex items-center gap-2">
            <Truck className="h-5 w-5 text-primary" />
            {t('farmer.transport.requestTransport')}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label>{t('farmer.transport.crop')}</Label>
            <Select value={formData.crop_id} onValueChange={(v) => setFormData({ ...formData, crop_id: v })}>
              <SelectTrigger>
                <SelectValue placeholder={t('farmer.transport.selectCrop')} />
              </SelectTrigger>
              <SelectContent>
                {crops?.filter(c => c.status !== 'harvested').map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.crop_name} {c.variety && `(${c.variety})`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>{t('farmer.transport.quantity')} *</Label>
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
            <Label>{t('farmer.transport.pickupLocation')} *</Label>
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
              />
            </div>
            <div>
              <Label>{t('farmer.transport.preferredTime')}</Label>
              <Input
                value={formData.preferred_time}
                onChange={(e) => setFormData({ ...formData, preferred_time: e.target.value })}
                placeholder={t('farmer.transport.timePlaceholder')}
              />
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
          <Button type="submit" className="w-full" disabled={isSaving}>
            {isSaving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                {t('common.submitting')}
              </>
            ) : (
              t('farmer.transport.submitRequest')
            )}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default RequestTransportDialog;
