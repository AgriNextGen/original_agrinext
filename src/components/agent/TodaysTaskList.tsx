import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useTodaysTasks, useUpdateTaskStatus, AgentTask } from '@/hooks/useAgentDashboard';
import { Skeleton } from '@/components/ui/skeleton';
import { ClipboardList, MapPin, ChevronRight, CheckCircle, Clock, Play } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const taskTypeLabels: Record<string, string> = {
  visit: 'Farm Visit',
  verify_crop: 'Verify Crop',
  harvest_check: 'Harvest Check',
  transport_assist: 'Transport Assist',
};

const statusColors: Record<string, string> = {
  pending: 'bg-amber-100 text-amber-800',
  in_progress: 'bg-blue-100 text-blue-800',
  completed: 'bg-green-100 text-green-800',
};

const TodaysTaskList = () => {
  const { data: tasks, isLoading } = useTodaysTasks();
  const updateStatus = useUpdateTaskStatus();
  const navigate = useNavigate();

  const handleStatusChange = (task: AgentTask) => {
    let newStatus: 'pending' | 'in_progress' | 'completed';
    if (task.task_status === 'pending') {
      newStatus = 'in_progress';
    } else if (task.task_status === 'in_progress') {
      newStatus = 'completed';
    } else {
      return;
    }
    updateStatus.mutate({ taskId: task.id, status: newStatus });
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ClipboardList className="h-5 w-5" />
            Today's Tasks
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-20 w-full" />
          ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <ClipboardList className="h-5 w-5 text-primary" />
            Today's Tasks
          </CardTitle>
          <Button variant="ghost" size="sm" onClick={() => navigate('/agent/tasks')}>
            View All <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {!tasks || tasks.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <ClipboardList className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>No tasks scheduled for today</p>
          </div>
        ) : (
          <div className="space-y-3">
            {tasks.slice(0, 5).map((task) => (
              <div
                key={task.id}
                className="flex items-center justify-between p-3 rounded-lg border hover:bg-accent/50 transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium truncate">
                      {task.farmer?.full_name || 'Unknown Farmer'}
                    </span>
                    <Badge variant="outline" className="text-xs">
                      {taskTypeLabels[task.task_type]}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-3 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <MapPin className="h-3 w-3" />
                      {task.farmer?.village || 'Unknown'}
                    </span>
                    {task.crop && (
                      <span className="text-xs bg-green-100 text-green-800 px-2 py-0.5 rounded">
                        {task.crop.crop_name}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge className={statusColors[task.task_status]}>
                    {task.task_status === 'pending' && <Clock className="h-3 w-3 mr-1" />}
                    {task.task_status === 'in_progress' && <Play className="h-3 w-3 mr-1" />}
                    {task.task_status === 'completed' && <CheckCircle className="h-3 w-3 mr-1" />}
                    {task.task_status.replace('_', ' ')}
                  </Badge>
                  {task.task_status !== 'completed' && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleStatusChange(task)}
                      disabled={updateStatus.isPending}
                    >
                      {task.task_status === 'pending' ? 'Start' : 'Complete'}
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default TodaysTaskList;
