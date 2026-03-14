import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { Loader2, Plus, Package } from 'lucide-react';
import DashboardLayout from '@/layouts/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useLanguage } from '@/hooks/useLanguage';
import { useCreateVendorShipment, useAddShipmentItems } from '@/hooks/useVendorDashboard';
import { ShipmentItemsList } from '@/components/shared/ShipmentItemsList';
import type { ShipmentType, ShipmentItem } from '@/services/logistics/types';

interface ShipmentFormData {
  pickup_location: string;
  drop_location: string;
  pickup_time_window_start: string;
  delivery_time_window_start: string;
  weight_estimate_kg: string;
  volume_estimate_cbm: string;
  notes: string;
  shipment_type: ShipmentType;
}

interface ItemFormData {
  product_name: string;
  quantity: string;
  unit: string;
  weight_kg: string;
  category: string;
}

const CreateShipment = () => {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const createShipment = useCreateVendorShipment();
  const addItems = useAddShipmentItems();
  const [createdShipmentId, setCreatedShipmentId] = useState<string | null>(null);
  const [addedItems, setAddedItems] = useState<ShipmentItem[]>([]);

  const { register, handleSubmit, watch, setValue } = useForm<ShipmentFormData>({
    defaultValues: {
      pickup_location: '',
      drop_location: '',
      pickup_time_window_start: '',
      delivery_time_window_start: '',
      weight_estimate_kg: '',
      volume_estimate_cbm: '',
      notes: '',
      shipment_type: 'agri_input',
    },
  });

  const {
    register: registerItem,
    handleSubmit: handleItemSubmit,
    reset: resetItemForm,
  } = useForm<ItemFormData>({
    defaultValues: {
      product_name: '',
      quantity: '',
      unit: 'kg',
      weight_kg: '',
      category: '',
    },
  });

  const onSubmitShipment = async (data: ShipmentFormData) => {
    const result = await createShipment.mutateAsync({
      pickup_location: data.pickup_location,
      drop_location: data.drop_location,
      pickup_time_window_start: data.pickup_time_window_start || undefined,
      delivery_time_window_start: data.delivery_time_window_start || undefined,
      weight_estimate_kg: data.weight_estimate_kg ? Number(data.weight_estimate_kg) : undefined,
      volume_estimate_cbm: data.volume_estimate_cbm ? Number(data.volume_estimate_cbm) : undefined,
      notes: data.notes || undefined,
      shipment_type: data.shipment_type,
    });
    setCreatedShipmentId(result.shipment_request_id);
  };

  const onSubmitItem = async (data: ItemFormData) => {
    if (!createdShipmentId) return;
    const items = await addItems.mutateAsync({
      shipmentId: createdShipmentId,
      items: [{
        product_name: data.product_name,
        quantity: Number(data.quantity),
        unit: data.unit || 'kg',
        weight_kg: data.weight_kg ? Number(data.weight_kg) : undefined,
        category: data.category || undefined,
      }],
    });
    setAddedItems(prev => [...prev, ...items]);
    resetItemForm();
  };

  if (createdShipmentId) {
    return (
      <DashboardLayout title={t('vendor.createShipment.addItems')}>
        <div className="space-y-6 p-4 md:p-6 max-w-2xl mx-auto">
          <div>
            <h1 className="text-2xl font-display font-bold">{t('vendor.createShipment.addItems')}</h1>
            <p className="text-muted-foreground">{t('vendor.createShipment.addItemsDesc')}</p>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>{t('vendor.shipmentItems.title')}</CardTitle>
            </CardHeader>
            <CardContent>
              <ShipmentItemsList items={addedItems} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">{t('vendor.shipmentItems.addItem')}</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleItemSubmit(onSubmitItem)} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>{t('vendor.shipmentItems.itemName')}</Label>
                    <Input {...registerItem('product_name', { required: true })} />
                  </div>
                  <div className="space-y-2">
                    <Label>{t('vendor.shipmentItems.quantity')}</Label>
                    <Input type="number" step="0.01" {...registerItem('quantity', { required: true })} />
                  </div>
                  <div className="space-y-2">
                    <Label>{t('vendor.shipmentItems.weight')}</Label>
                    <Input type="number" step="0.01" {...registerItem('weight_kg')} />
                  </div>
                  <div className="space-y-2">
                    <Label>{t('vendor.shipmentItems.packagingType')}</Label>
                    <Input {...registerItem('category')} placeholder="e.g. Bags, Drums, Crates" />
                  </div>
                </div>
                <div className="flex gap-3">
                  <Button type="submit" disabled={addItems.isPending}>
                    {addItems.isPending ? (
                      <><Loader2 className="h-4 w-4 mr-2 animate-spin" />{t('vendor.shipmentItems.adding')}</>
                    ) : (
                      <><Plus className="h-4 w-4 mr-2" />{t('vendor.shipmentItems.addItem')}</>
                    )}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => navigate(`/vendor/shipments/${createdShipmentId}`)}
                  >
                    {t('common.viewAll')}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title={t('vendor.createShipment.title')}>
      <div className="space-y-6 p-4 md:p-6 max-w-2xl mx-auto">
        <div>
          <h1 className="text-2xl font-display font-bold">{t('vendor.createShipment.title')}</h1>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>{t('vendor.createShipment.title')}</CardTitle>
            <CardDescription>{t('vendor.createShipment.shipmentDescription')}</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmitShipment)} className="space-y-4">
              <div className="space-y-2">
                <Label>{t('vendor.createShipment.shipmentType')}</Label>
                <Select
                  value={watch('shipment_type')}
                  onValueChange={(v) => setValue('shipment_type', v as ShipmentType)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="agri_input">{t('vendor.createShipment.agriInput')}</SelectItem>
                    <SelectItem value="general_goods">{t('vendor.createShipment.generalGoods')}</SelectItem>
                    <SelectItem value="return_goods">{t('vendor.createShipment.returnGoods')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>{t('vendor.createShipment.originLocation')}</Label>
                  <Input {...register('pickup_location', { required: true })} />
                </div>
                <div className="space-y-2">
                  <Label>{t('vendor.createShipment.destinationLocation')}</Label>
                  <Input {...register('drop_location', { required: true })} />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>{t('vendor.createShipment.pickupWindow')}</Label>
                  <Input type="datetime-local" {...register('pickup_time_window_start')} />
                </div>
                <div className="space-y-2">
                  <Label>{t('vendor.createShipment.deliveryWindow')}</Label>
                  <Input type="datetime-local" {...register('delivery_time_window_start')} />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>{t('vendor.createShipment.shipmentWeight')}</Label>
                  <Input type="number" step="0.01" {...register('weight_estimate_kg')} />
                </div>
                <div className="space-y-2">
                  <Label>{t('vendor.createShipment.shipmentVolume')}</Label>
                  <Input type="number" step="0.01" {...register('volume_estimate_cbm')} />
                </div>
              </div>

              <div className="space-y-2">
                <Label>{t('vendor.createShipment.shipmentDescription')}</Label>
                <Textarea {...register('notes')} rows={3} />
              </div>

              <Button type="submit" variant="hero" className="w-full" disabled={createShipment.isPending}>
                {createShipment.isPending ? (
                  <><Loader2 className="h-4 w-4 mr-2 animate-spin" />{t('vendor.createShipment.creating')}</>
                ) : (
                  <><Package className="h-4 w-4 mr-2" />{t('vendor.createShipment.submit')}</>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default CreateShipment;
