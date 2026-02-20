import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Camera,
  Leaf,
  Bug,
  Droplets,
  Scissors,
  AlertTriangle,
  TrendingUp,
  PackageCheck,
  ClipboardList,
  Sparkles,
} from 'lucide-react';
import { format } from 'date-fns';
import { useCropActivityLogs, useSignedUrl, CropActivityLog } from '@/hooks/useCropDiary';

interface CropActivityTimelineProps {
  cropId: string;
}

const activityIcons: Record<CropActivityLog['activity_type'], React.ReactNode> = {
  photo: <Camera className="h-4 w-4" />,
  fertilizer: <Leaf className="h-4 w-4" />,
  spray: <Bug className="h-4 w-4" />,
  irrigation: <Droplets className="h-4 w-4" />,
  weeding: <Scissors className="h-4 w-4" />,
  disease: <AlertTriangle className="h-4 w-4" />,
  growth_update: <TrendingUp className="h-4 w-4" />,
  harvest_update: <PackageCheck className="h-4 w-4" />,
  note: <ClipboardList className="h-4 w-4" />,
  other: <Sparkles className="h-4 w-4" />,
};

const activityLabels: Record<CropActivityLog['activity_type'], string> = {
  photo: 'Photo Added',
  fertilizer: 'Fertilizer Applied',
  spray: 'Spray/Pesticide',
  irrigation: 'Irrigation',
  weeding: 'Weeding',
  disease: 'Disease Reported',
  growth_update: 'Growth Update',
  harvest_update: 'Harvest Update',
  note: 'Note',
  other: 'Activity',
};

const activityColors: Record<CropActivityLog['activity_type'], string> = {
  photo: 'bg-blue-100 text-blue-700',
  fertilizer: 'bg-green-100 text-green-700',
  spray: 'bg-purple-100 text-purple-700',
  irrigation: 'bg-cyan-100 text-cyan-700',
  weeding: 'bg-lime-100 text-lime-700',
  disease: 'bg-red-100 text-red-700',
  growth_update: 'bg-amber-100 text-amber-700',
  harvest_update: 'bg-emerald-100 text-emerald-700',
  note: 'bg-gray-100 text-gray-700',
  other: 'bg-slate-100 text-slate-700',
};

const CropActivityTimeline = ({ cropId }: CropActivityTimelineProps) => {
  const { data: logs, isLoading } = useCropActivityLogs(cropId);
  const signedUrlMutation = useSignedUrl();
  const [mediaThumbnails, setMediaThumbnails] = useState<Record<string, string>>({});

  // Load media thumbnails for logs with media_id
  useEffect(() => {
    const loadThumbnails = async () => {
      if (!logs) return;

      const logsWithMedia = logs.filter((l) => l.media);
      const newThumbnails: Record<string, string> = {};

      for (const log of logsWithMedia) {
        if (log.media && !mediaThumbnails[log.media.id]) {
          try {
            const url = await signedUrlMutation.mutateAsync(log.media.file_path);
            newThumbnails[log.media.id] = url;
          } catch (e) {
            console.error('Failed to load thumbnail:', e);
          }
        }
      }

      if (Object.keys(newThumbnails).length > 0) {
        setMediaThumbnails((prev) => ({ ...prev, ...newThumbnails }));
      }
    };

    loadThumbnails();
  }, [logs]);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ClipboardList className="h-5 w-5" />
            Activity Timeline
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex gap-4">
              <Skeleton className="h-10 w-10 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-1/3" />
                <Skeleton className="h-3 w-1/2" />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  if (!logs || logs.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ClipboardList className="h-5 w-5" />
            Activity Timeline
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <ClipboardList className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p>No activities yet</p>
            <p className="text-sm">Start logging your crop activities</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ClipboardList className="h-5 w-5" />
          Activity Timeline ({logs.length})
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="relative">
          {/* Timeline line */}
          <div className="absolute left-5 top-0 bottom-0 w-px bg-border" />

          <div className="space-y-4">
            {logs.map((log) => (
              <div key={log.id} className="relative flex gap-4 pl-2">
                {/* Icon */}
                <div
                  className={`relative z-10 flex items-center justify-center w-8 h-8 rounded-full ${activityColors[log.activity_type]}`}
                >
                  {activityIcons[log.activity_type]}
                </div>

                {/* Content */}
                <div className="flex-1 pb-4">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium">{activityLabels[log.activity_type]}</span>
                    {log.severity && (
                      <Badge
                        variant="outline"
                        className={
                          log.severity === 'high'
                            ? 'border-red-500 text-red-600'
                            : log.severity === 'medium'
                            ? 'border-orange-500 text-orange-600'
                            : 'border-yellow-500 text-yellow-600'
                        }
                      >
                        {log.severity}
                      </Badge>
                    )}
                    {log.creator_role === 'agent' && (
                      <Badge variant="secondary" className="text-xs">
                        By Agent
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {format(new Date(log.activity_at), 'PPp')}
                  </p>

                  {log.notes && <p className="text-sm mt-2">{log.notes}</p>}

                  {log.meta && Object.keys(log.meta).length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-2">
                      {(log.meta as Record<string, unknown>).product_name && (
                        <Badge variant="outline" className="text-xs">
                          {(log.meta as Record<string, unknown>).product_name as string}
                        </Badge>
                      )}
                      {(log.meta as Record<string, unknown>).dosage && (
                        <Badge variant="outline" className="text-xs">
                          {(log.meta as Record<string, unknown>).dosage as string}
                        </Badge>
                      )}
                      {(log.meta as Record<string, unknown>).cost && (
                        <Badge variant="outline" className="text-xs">
                          ₹{(log.meta as Record<string, unknown>).cost as number}
                        </Badge>
                      )}
                    </div>
                  )}

                  {log.media && mediaThumbnails[log.media.id] && (
                    <div className="mt-2">
                      <img
                        src={mediaThumbnails[log.media.id]}
                        alt="Activity photo"
                        className="h-20 w-20 object-cover rounded-lg"
                      />
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default CropActivityTimeline;
