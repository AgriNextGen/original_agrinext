import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import DashboardLayout from '@/layouts/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { CalendarDays, CheckCircle, PlayCircle, Mic, Clock, AlertTriangle, WifiOff, MapPin } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { rpcJson } from '@/lib/readApi';
import { useAuth } from '@/hooks/useAuth';
import { useAgentTasksInfinite } from '@/hooks/useAgentTasksInfinite';
import { useUpdateTaskStatus } from '@/hooks/useAgentDashboard';
import { useStartVisit, useActiveVisit } from '@/hooks/useAgentAssignments';
import { useOfflineQueue } from '@/lib/offlineQueue';
import { useMyServiceAreas } from '@/hooks/useServiceAreas';
import TaskCompletionModal from '@/components/agent/TaskCompletionModal';
import { useToast } from '@/components/ui/use-toast';

const PRIORITY_COLORS: Record<string, string> = {
  urgent: 'bg-red-100 text-red-800',
  high: 'bg-orange-100 text-orange-800',
  normal: 'bg-blue-100 text-blue-800',
  low: 'bg-gray-100 text-gray-700',
};

export default function AgentToday() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { count: offlineCount } = useOfflineQueue();

  const [completingTask, setCompletingTask] = useState<{ id: string; farmerName?: string; taskType?: string } | null>(null);
  const { data: serviceAreas } = useMyServiceAreas('agent');

  // Dashboard stats
  const { data: dashboard, isLoading: dashLoading } = useQuery({
    queryKey: ['agent-dashboard', user?.id],
    queryFn: () => rpcJson('agent_dashboard_v1'),
    enabled: !!user?.id,
    staleTime: 30_000,
  });

  // Tasks (infinite, but we only show first page filtered to today/overdue)
  const { data: tasksData, isLoading: tasksLoading } = useAgentTasksInfinite();
  const allTasks = tasksData?.pages.flatMap((p) => p.items) ?? [];

  const startVisit = useStartVisit();
  const updateTask = useUpdateTaskStatus();
  const activeVisit = useActiveVisit();

  const today = new Date().toISOString().slice(0, 10);

  const todayTasks = useMemo(() => {
    return allTasks.filter((t: any) => {
      if (t.task_status === 'completed') return false;
      if (!t.due_date) return t.task_status === 'pending' || t.task_status === 'in_progress';
      return t.due_date <= today;
    });
  }, [allTasks, today]);

  const overdueTasks = todayTasks.filter((t: any) => t.due_date && t.due_date < today);
  const dueTodayTasks = todayTasks.filter((t: any) => !t.due_date || t.due_date === today);

  const handleStartTask = (task: any) => {
    updateTask.mutate({ taskId: task.id, status: 'in_progress' }, {
      onSuccess: () => toast({ title: 'Task started' }),
    });
  };

  const handleStartVisit = (task: any) => {
    if (!task.farmer?.id) return;
    startVisit.mutate({ farmerId: task.farmer.id, taskId: task.id }, {
      onSuccess: () => toast({ title: 'Visit started' }),
    });
  };

  return (
    <DashboardLayout>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <CalendarDays className="h-6 w-6" /> Today's Plan
            </h1>
            <p className="text-sm text-muted-foreground">{new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
          </div>
          {offlineCount > 0 && (
            <Badge variant="destructive" className="flex items-center gap-1">
              <WifiOff className="h-3 w-3" /> {offlineCount} pending sync
            </Badge>
          )}
          {serviceAreas !== undefined && serviceAreas.length === 0 && (
            <Button size="sm" variant="outline" onClick={() => navigate('/agent/service-area')} className="flex items-center gap-1 border-amber-300 text-amber-700 hover:bg-amber-50">
              <MapPin className="h-3 w-3" /> Set up your service area
            </Button>
          )}
        </div>

        {/* Quick Stats */}
        {dashLoading ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-20" />)}
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Card>
              <CardContent className="pt-4 text-center">
                <p className="text-2xl font-bold">{dashboard?.assigned_farmers_count ?? 0}</p>
                <p className="text-xs text-muted-foreground">Assigned Farmers</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4 text-center">
                <p className="text-2xl font-bold">{todayTasks.length}</p>
                <p className="text-xs text-muted-foreground">Tasks Today</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4 text-center">
                <p className="text-2xl font-bold text-red-600">{overdueTasks.length}</p>
                <p className="text-xs text-muted-foreground">Overdue</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4 text-center">
                <p className="text-2xl font-bold">{dashboard?.visits_today_count ?? 0}</p>
                <p className="text-xs text-muted-foreground">Visits Today</p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Overdue tasks */}
        {overdueTasks.length > 0 && (
          <Card className="border-red-200">
            <CardHeader className="py-3">
              <CardTitle className="text-base flex items-center gap-2 text-red-700">
                <AlertTriangle className="h-4 w-4" /> Overdue ({overdueTasks.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {overdueTasks.map((task: any) => (
                <TaskRow
                  key={task.id}
                  task={task}
                  onStart={() => handleStartTask(task)}
                  onComplete={() => setCompletingTask({ id: task.id, farmerName: task.farmer?.full_name, taskType: task.task_type })}
                  onVisit={() => handleStartVisit(task)}
                  onNavigate={() => task.farmer?.id && navigate(`/agent/farmer/${task.farmer.id}`)}
                />
              ))}
            </CardContent>
          </Card>
        )}

        {/* Today's tasks */}
        <Card>
          <CardHeader className="py-3">
            <CardTitle className="text-base">
              {dueTodayTasks.length > 0 ? `Due Today (${dueTodayTasks.length})` : 'No tasks due today'}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {tasksLoading && Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-16" />)}
            {dueTodayTasks.map((task: any) => (
              <TaskRow
                key={task.id}
                task={task}
                onStart={() => handleStartTask(task)}
                onComplete={() => setCompletingTask({ id: task.id, farmerName: task.farmer?.full_name, taskType: task.task_type })}
                onVisit={() => handleStartVisit(task)}
                onNavigate={() => task.farmer?.id && navigate(`/agent/farmer/${task.farmer.id}`)}
              />
            ))}
            {!tasksLoading && dueTodayTasks.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">No tasks scheduled for today. Great work!</p>
            )}
          </CardContent>
        </Card>

        {/* Task Completion Modal */}
        {completingTask && (
          <TaskCompletionModal
            open={!!completingTask}
            onClose={() => setCompletingTask(null)}
            taskId={completingTask.id}
            farmerName={completingTask.farmerName}
            taskType={completingTask.taskType}
          />
        )}
      </div>
    </DashboardLayout>
  );
}

function TaskRow({ task, onStart, onComplete, onVisit, onNavigate }: {
  task: any;
  onStart: () => void;
  onComplete: () => void;
  onVisit: () => void;
  onNavigate: () => void;
}) {
  return (
    <div className="flex items-center justify-between p-2 rounded border hover:bg-muted/30 transition-colors">
      <div className="min-w-0 cursor-pointer" onClick={onNavigate}>
        <div className="flex items-center gap-2 flex-wrap">
          <Badge variant="outline" className="text-xs">{task.task_type || 'task'}</Badge>
          <Badge className={`text-xs ${PRIORITY_COLORS[task.priority] || 'bg-gray-100'}`}>{task.priority || 'normal'}</Badge>
          <Badge variant="secondary" className="text-xs">{task.task_status}</Badge>
        </div>
        <p className="text-sm mt-0.5">
          {task.farmer?.full_name || 'Unknown farmer'}
          {task.crop?.crop_name ? ` — ${task.crop.crop_name}` : ''}
        </p>
        {task.due_date && (
          <span className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
            <Clock className="h-3 w-3" /> Due: {task.due_date}
          </span>
        )}
      </div>
      <div className="flex gap-1 flex-shrink-0">
        {task.task_status === 'pending' && (
          <Button size="sm" variant="outline" onClick={onStart}>
            <PlayCircle className="h-4 w-4" />
          </Button>
        )}
        {task.farmer?.id && (
          <Button size="sm" variant="outline" onClick={onVisit} title="Start visit">
            <Mic className="h-4 w-4" />
          </Button>
        )}
        <Button size="sm" onClick={onComplete}>
          <CheckCircle className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
