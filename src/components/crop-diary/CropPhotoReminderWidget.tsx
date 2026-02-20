import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Camera, Bell, Sprout } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useCropPhotoReminders } from '@/hooks/useCropDiary';
import { Skeleton } from '@/components/ui/skeleton';

const CropPhotoReminderWidget = () => {
  const navigate = useNavigate();
  const { data: reminders, isLoading } = useCropPhotoReminders();

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Camera className="h-5 w-5" />
            Crop Photo Reminders
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-16 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (!reminders || reminders.length === 0) {
    return null; // Don't show widget if no reminders
  }

  return (
    <Card className="border-amber-200 bg-amber-50/50">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Bell className="h-5 w-5 text-amber-600" />
          Crop Photo Reminders
          <Badge variant="secondary" className="ml-auto bg-amber-100 text-amber-800">
            {reminders.length} pending
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {reminders.map((reminder) => (
          <div
            key={reminder.cropId}
            className="flex items-center justify-between p-3 bg-white rounded-lg border"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-primary/10">
                <Sprout className="h-4 w-4 text-primary" />
              </div>
              <div>
                <p className="font-medium text-sm">
                  {reminder.cropName}
                  {reminder.variety && (
                    <span className="text-muted-foreground"> ({reminder.variety})</span>
                  )}
                </p>
                <p className="text-xs text-amber-700">
                  📷 Upload Month-{reminder.monthIndex} photo
                </p>
              </div>
            </div>
            <Button
              size="sm"
              variant="outline"
              className="border-primary text-primary hover:bg-primary hover:text-primary-foreground"
              onClick={() => navigate(`/farmer/crops/${reminder.cropId}`)}
            >
              <Camera className="h-4 w-4 mr-1" />
              Upload
            </Button>
          </div>
        ))}
      </CardContent>
    </Card>
  );
};

export default CropPhotoReminderWidget;
