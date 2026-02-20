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
        
      </Card>

      <EditCropDialog crop={editingCrop} open={editDialogOpen} onOpenChange={setEditDialogOpen} />
      
      <RequestTransportDialog crop={transportCrop} open={transportDialogOpen} onOpenChange={setTransportDialogOpen} />
    </>;
};
export default CropsSection;