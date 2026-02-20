import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ClipboardList, Clock, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { useFarmerHelpRequests } from '@/hooks/useAgentAssignments';
import { useLanguage } from '@/hooks/useLanguage';
import { format, parseISO } from 'date-fns';

const taskTypeLabels: Record<string, { en: string; kn: string }> = {
  visit: { en: 'Visit Request', kn: 'ಭೇಟಿ ವಿನಂತಿ' },
  verify_crop: { en: 'Crop Verification', kn: 'ಬೆಳೆ ಪರಿಶೀಲನೆ' },
  harvest_check: { en: 'Harvest Check', kn: 'ಕೊಯ್ಲು ಪರಿಶೀಲನೆ' },
  transport_assist: { en: 'Transport Help', kn: 'ಸಾರಿಗೆ ಸಹಾಯ' },
};

const statusConfig: Record<
  string,
  { icon: React.ComponentType<any>; color: string; label: { en: string; kn: string } }
> = {
  pending: {
    icon: Clock,
    color: 'bg-amber-100 text-amber-800',
    label: { en: 'Pending', kn: 'ಬಾಕಿ' },
  },
  in_progress: {
    icon: AlertCircle,
    color: 'bg-blue-100 text-blue-800',
    label: { en: 'In Progress', kn: 'ಪ್ರಗತಿಯಲ್ಲಿದೆ' },
  },
  completed: {
    icon: CheckCircle,
    color: 'bg-green-100 text-green-800',
    label: { en: 'Completed', kn: 'ಪೂರ್ಣಗೊಂಡಿದೆ' },
  },
  cancelled: {
    icon: XCircle,
    color: 'bg-gray-100 text-gray-800',
    label: { en: 'Cancelled', kn: 'ರದ್ದಾಗಿದೆ' },
  },
};

export default function MyHelpRequests() {
  const { language } = useLanguage();
  const { data: requests, isLoading } = useFarmerHelpRequests();

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <Skeleton className="h-6 w-40" />
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <ClipboardList className="h-5 w-5 text-primary" />
          {language === 'kn' ? 'ನನ್ನ ವಿನಂತಿಗಳು' : 'My Requests'}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {!requests?.length ? (
          <p className="text-muted-foreground text-sm text-center py-6">
            {language === 'kn'
              ? 'ಯಾವುದೇ ವಿನಂತಿಗಳಿಲ್ಲ'
              : 'No requests yet'}
          </p>
        ) : (
          <ScrollArea className="h-[300px] pr-4">
            <div className="space-y-3">
              {requests.map((request) => {
                const status = statusConfig[request.task_status] || statusConfig.pending;
                const StatusIcon = status.icon;
                const taskLabel =
                  taskTypeLabels[request.task_type] ||
                  taskTypeLabels.visit_request;

                return (
                  <div
                    key={request.id}
                    className="flex items-start gap-3 p-3 rounded-lg border bg-card"
                  >
                    <div className={`p-2 rounded-full ${status.color}`}>
                      <StatusIcon className="h-4 w-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium">
                          {language === 'kn' ? taskLabel.kn : taskLabel.en}
                        </span>
                        <Badge variant="outline" className={status.color}>
                          {language === 'kn'
                            ? status.label.kn
                            : status.label.en}
                        </Badge>
                      </div>
                      {request.notes && (
                        <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                          {request.notes}
                        </p>
                      )}
                      <p className="text-xs text-muted-foreground mt-1">
                        {format(parseISO(request.created_at), 'MMM d, yyyy')}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}
