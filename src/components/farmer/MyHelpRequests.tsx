import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ClipboardList, Clock, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { useFarmerHelpRequests } from '@/hooks/useAgentAssignments';
import { useLanguage } from '@/hooks/useLanguage';
import { format, parseISO } from 'date-fns';

const taskTypeKeys: Record<string, string> = {
  visit: 'visit',
  verify_crop: 'verify_crop',
  harvest_check: 'harvest_check',
  transport_assist: 'transport_assist',
};

const statusConfig: Record<
  string,
  { icon: React.ComponentType<any>; color: string }
> = {
  pending: {
    icon: Clock,
    color: 'bg-amber-100 text-amber-800',
  },
  in_progress: {
    icon: AlertCircle,
    color: 'bg-blue-100 text-blue-800',
  },
  completed: {
    icon: CheckCircle,
    color: 'bg-green-100 text-green-800',
  },
  cancelled: {
    icon: XCircle,
    color: 'bg-gray-100 text-gray-800',
  },
};

export default function MyHelpRequests() {
  const { t } = useLanguage();
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
          {t('farmer.helpRequests.title')}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {!requests?.length ? (
          <p className="text-muted-foreground text-sm text-center py-6">
            {t('farmer.helpRequests.noRequests')}
          </p>
        ) : (
          <ScrollArea className="h-[300px] pr-4">
            <div className="space-y-3">
              {requests.map((request) => {
                const status = statusConfig[request.task_status] || statusConfig.pending;
                const StatusIcon = status.icon;
                const taskKey =
                  taskTypeKeys[request.task_type] || 'visit';

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
                          {t(`farmer.helpRequests.taskTypes.${taskKey}`)}
                        </span>
                        <Badge variant="outline" className={status.color}>
                          {t(`farmer.helpRequests.status.${request.task_status}`)}
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
