import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import DashboardLayout from '@/layouts/DashboardLayout';
import { useCropDetail, useUpdateGrowthStage, CropWithDiaryFields } from '@/hooks/useCropDiary';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  ArrowLeft,
  Sprout,
  MapPin,
  Calendar,
  Scale,
  Camera,
  ClipboardList,
  AlertTriangle,
  Plus,
  Heart,
  AlertCircle,
} from 'lucide-react';
import { format } from 'date-fns';
import PageHeader from '@/components/shared/PageHeader';
import { useLanguage } from '@/hooks/useLanguage';
import CropPhotoUploadDialog from '@/components/crop-diary/CropPhotoUploadDialog';
import CropActivityLogDialog from '@/components/crop-diary/CropActivityLogDialog';
import CropDiseaseReportDialog from '@/components/crop-diary/CropDiseaseReportDialog';
import CropPhotoGallery from '@/components/crop-diary/CropPhotoGallery';
import CropActivityTimeline from '@/components/crop-diary/CropActivityTimeline';

const growthStages: { value: CropWithDiaryFields['growth_stage']; label: string; emoji: string }[] = [
  { value: 'seedling', label: 'Seedling', emoji: '🌱' },
  { value: 'vegetative', label: 'Vegetative', emoji: '🌿' },
  { value: 'flowering', label: 'Flowering', emoji: '🌸' },
  { value: 'fruiting', label: 'Fruiting', emoji: '🍎' },
  { value: 'harvesting', label: 'Harvesting', emoji: '🌾' },
];

const healthStatusConfig = {
  normal: { label: 'Healthy', color: 'bg-emerald-100 text-emerald-800', icon: Heart },
  watch: { label: 'Watch', color: 'bg-amber-100 text-amber-800', icon: AlertCircle },
  diseased: { label: 'Diseased', color: 'bg-red-100 text-red-800', icon: AlertTriangle },
};

const CropDiaryPage = () => {
  const { cropId } = useParams<{ cropId: string }>();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const { data: crop, isLoading } = useCropDetail(cropId);
  const updateGrowthMutation = useUpdateGrowthStage();

  const [photoDialogOpen, setPhotoDialogOpen] = useState(false);
  const [activityDialogOpen, setActivityDialogOpen] = useState(false);
  const [diseaseDialogOpen, setDiseaseDialogOpen] = useState(false);

  if (isLoading) {
    return (
      <DashboardLayout title="Crop Diary">
        <div className="space-y-6">
          <Skeleton className="h-10 w-32" />
          <Skeleton className="h-48 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      </DashboardLayout>
    );
  }

  if (!crop) {
    return (
      <DashboardLayout title={t('cropDiary.title')}>
        <div className="text-center py-12">
          <Sprout className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <h2 className="text-xl font-semibold mb-2">Crop not found</h2>
          <p className="text-muted-foreground mb-4">
            This crop doesn't exist or you don't have access to it.
          </p>
          <Button onClick={() => navigate('/farmer/crops')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Crops
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  const healthConfig = healthStatusConfig[crop.health_status];
  const HealthIcon = healthConfig.icon;

  return (
    <DashboardLayout title={t('cropDiary.title')}>
      <PageHeader title={t('cropDiary.title')}>
      <div className="space-y-6">
        {/* Back Button */}
        <Button variant="ghost" onClick={() => navigate('/farmer/crops')} className="gap-2">
          <ArrowLeft className="h-4 w-4" />
          Back to Crops
        </Button>

        {/* Crop Header Card */}
        <Card>
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="p-3 rounded-full bg-primary/10">
                    <Sprout className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <h1 className="text-2xl font-bold">{crop.crop_name}</h1>
                    {crop.variety && (
                      <p className="text-muted-foreground">{crop.variety}</p>
                    )}
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                  {crop.farmland && (
                    <div className="flex items-center gap-1">
                      <MapPin className="h-4 w-4" />
                      {crop.farmland.name}
                    </div>
                  )}
                  {crop.sowing_date && (
                    <div className="flex items-center gap-1">
                      <Calendar className="h-4 w-4" />
                      Sown: {format(new Date(crop.sowing_date), 'MMM d, yyyy')}
                    </div>
                  )}
                  {crop.estimated_quantity && (
                    <div className="flex items-center gap-1">
                      <Scale className="h-4 w-4" />
                      {crop.estimated_quantity} {crop.quantity_unit}
                    </div>
                  )}
                </div>

                {/* Health Status Badge */}
                <Badge className={`${healthConfig.color} gap-1`}>
                  <HealthIcon className="h-3 w-3" />
                  {healthConfig.label}
                </Badge>
              </div>

              <div className="flex flex-col gap-3">
                {/* Growth Stage Selector */}
                <div>
                  <label className="text-sm text-muted-foreground mb-1 block">
                    Growth Stage
                  </label>
                  <Select
                    value={crop.growth_stage}
                    onValueChange={(v) =>
                      updateGrowthMutation.mutate({
                        cropId: crop.id,
                        growthStage: v as CropWithDiaryFields['growth_stage'],
                      })
                    }
                    disabled={updateGrowthMutation.isPending}
                  >
                    <SelectTrigger className="w-48">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {growthStages.map((stage) => (
                        <SelectItem key={stage.value} value={stage.value}>
                          <span className="flex items-center gap-2">
                            <span>{stage.emoji}</span>
                            {stage.label}
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Last photo info */}
                {crop.last_photo_at && (
                  <p className="text-xs text-muted-foreground">
                    Last photo: {format(new Date(crop.last_photo_at), 'MMM d, yyyy')}
                  </p>
                )}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap gap-2 mt-6 pt-4 border-t">
              <Button onClick={() => setPhotoDialogOpen(true)}>
                <Camera className="h-4 w-4 mr-2" />
                Upload Photo
              </Button>
              <Button variant="outline" onClick={() => setActivityDialogOpen(true)}>
                <ClipboardList className="h-4 w-4 mr-2" />
                Log Activity
              </Button>
              <Button
                variant="outline"
                className="text-destructive hover:text-destructive hover:bg-destructive/10"
                onClick={() => setDiseaseDialogOpen(true)}
              >
                <AlertTriangle className="h-4 w-4 mr-2" />
                Report Disease
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Photo Gallery & Activity Timeline */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <CropPhotoGallery cropId={crop.id} />
          <CropActivityTimeline cropId={crop.id} />
        </div>

        {/* Dialogs */}
        <CropPhotoUploadDialog
          cropId={crop.id}
          open={photoDialogOpen}
          onOpenChange={setPhotoDialogOpen}
        />
        <CropActivityLogDialog
          cropId={crop.id}
          open={activityDialogOpen}
          onOpenChange={setActivityDialogOpen}
        />
        <CropDiseaseReportDialog
          cropId={crop.id}
          open={diseaseDialogOpen}
          onOpenChange={setDiseaseDialogOpen}
        />
      </div>
      </PageHeader>
    </DashboardLayout>
  );
};

export default CropDiaryPage;
