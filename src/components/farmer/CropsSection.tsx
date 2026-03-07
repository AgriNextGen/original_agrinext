import { useState } from 'react';
import { useCrops, Crop, Farmland } from '@/hooks/useFarmerDashboard';
import { useLanguage } from '@/hooks/useLanguage';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Sprout, Calendar, MapPin, Scale, Edit, Truck, Plus } from 'lucide-react';
import { format } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import EditCropDialog from './EditCropDialog';
import RequestTransportDialog from './RequestTransportDialog';
const CropsSection = () => {
  const {
    data: crops,
    isLoading
  } = useCrops();
  const {
    t
  } = useLanguage();
  const navigate = useNavigate();
  const [editingCrop, setEditingCrop] = useState<(Crop & {
    farmland: Farmland | null;
  }) | null>(null);
  const [transportCrop, setTransportCrop] = useState<(Crop & {
    farmland: Farmland | null;
  }) | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [transportDialogOpen, setTransportDialogOpen] = useState(false);
  const statusConfig = {
    growing: {
      label: t('enum.crop_status.growing'),
      color: 'bg-muted text-muted-foreground',
      dotColor: 'bg-gray-400'
    },
    one_week: {
      label: t('enum.crop_status.one_week'),
      color: 'bg-amber-100 text-amber-800',
      dotColor: 'bg-amber-500'
    },
    ready: {
      label: t('enum.crop_status.ready'),
      color: 'bg-emerald-100 text-emerald-800',
      dotColor: 'bg-emerald-500'
    },
    harvested: {
      label: t('enum.crop_status.harvested'),
      color: 'bg-primary/10 text-primary',
      dotColor: 'bg-primary'
    }
  };
  const activeCrops = crops?.filter(c => c.status !== 'harvested') || [];
  const handleEdit = (crop: Crop & {
    farmland: Farmland | null;
  }) => {
    setEditingCrop(crop);
    setEditDialogOpen(true);
  };
  const handleTransport = (crop: Crop & {
    farmland: Farmland | null;
  }) => {
    setTransportCrop(crop);
    setTransportDialogOpen(true);
  };
  if (isLoading) {
    return <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Sprout className="h-5 w-5 text-primary" />
            {t('farmer.crops.myCrops')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map(i => <Skeleton key={i} className="h-48 rounded-xl" />)}
          </div>
        </CardContent>
      </Card>;
  }
  return <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-4">
          <CardTitle className="flex items-center gap-2">
            <Sprout className="h-5 w-5 text-primary" />
            {t('farmer.crops.myCrops')}
          </CardTitle>
          <Button size="sm" onClick={() => navigate('/farmer/crops')}>
            <Plus className="h-4 w-4 mr-1" />
            {t('farmer.crops.addCrop')}
          </Button>
        </CardHeader>
        <CardContent>
          {activeCrops.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <Sprout className="h-10 w-10 text-muted-foreground/40 mb-3" />
              <p className="text-sm text-muted-foreground">{t('farmer.crops.noCropsYet')}</p>
              <Button size="sm" variant="outline" className="mt-4" onClick={() => navigate('/farmer/crops')}>
                <Plus className="h-4 w-4 mr-1" />
                {t('farmer.crops.addCrop')}
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {activeCrops.map(crop => {
                const cfg = statusConfig[crop.status as keyof typeof statusConfig] || statusConfig.growing;
                return (
                  <div key={crop.id} className="rounded-xl border border-border bg-background p-4 flex flex-col gap-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="font-semibold text-foreground truncate">{crop.crop_name}</p>
                        {crop.variety && (
                          <p className="text-xs text-muted-foreground truncate">{crop.variety}</p>
                        )}
                      </div>
                      <span className={`shrink-0 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${cfg.color}`}>
                        <span className={`h-1.5 w-1.5 rounded-full ${cfg.dotColor}`} />
                        {cfg.label}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs text-muted-foreground">
                      {crop.farmland?.name && (
                        <span className="flex items-center gap-1 truncate col-span-2">
                          <MapPin className="h-3 w-3 shrink-0" />
                          {crop.farmland.name}
                        </span>
                      )}
                      {crop.harvest_estimate && (
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3 shrink-0" />
                          {format(new Date(crop.harvest_estimate), 'dd MMM yyyy')}
                        </span>
                      )}
                      {crop.estimated_quantity != null && (
                        <span className="flex items-center gap-1">
                          <Scale className="h-3 w-3 shrink-0" />
                          {crop.estimated_quantity} {crop.quantity_unit || 'kg'}
                        </span>
                      )}
                    </div>

                    <div className="flex gap-2 mt-auto pt-1">
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-1 gap-1 h-8 text-xs"
                        onClick={() => handleEdit(crop)}
                      >
                        <Edit className="h-3 w-3" />
                        {t('common.edit')}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-1 gap-1 h-8 text-xs"
                        onClick={() => handleTransport(crop)}
                      >
                        <Truck className="h-3 w-3" />
                        {t('farmer.transport.requestTransport')}
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <EditCropDialog crop={editingCrop} open={editDialogOpen} onOpenChange={setEditDialogOpen} />
      
      <RequestTransportDialog crop={transportCrop} open={transportDialogOpen} onOpenChange={setTransportDialogOpen} />
    </>;
};
export default CropsSection;