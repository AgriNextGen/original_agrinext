import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import DashboardLayout from '@/layouts/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { CheckCircle, PlayCircle, Mic, Clock, AlertTriangle, WifiOff, MapPin, Users, ClipboardList } from 'lucide-react';
import EmptyState from '@/components/shared/EmptyState';
import { useQuery } from '@tanstack/react-query';
import { rpcJson } from '@/lib/readApi';
import { formatDistanceToNow, parseISO, format } from 'date-fns';
import { useAuth } from '@/hooks/useAuth';
import { useAgentTasksInfinite } from '@/hooks/useAgentTasksInfinite';
import { useUpdateTaskStatus } from '@/hooks/useAgentDashboard';
import { useStartVisit, useActiveVisit } from '@/hooks/useAgentAssignments';
import { useOfflineQueue } from '@/lib/offlineQueue';
import { useMyServiceAreas } from '@/hooks/useServiceAreas';
import TaskCompletionModal from '@/components/agent/TaskCompletionModal';
import { useToast } from '@/hooks/use-toast';
import PageHeader from '@/components/shared/PageHeader';
import KpiCard from '@/components/dashboard/KpiCard';
import { ROUTES } from '@/lib/routes';
import { useLanguage } from '@/hooks/useLanguage';

const PRIORITY_COLORS: Record<string, string> = {
  urgent: 'bg-destructive/10 text-destructive',
  high: 'bg-warning/10 text-warning',
  normal: 'bg-info/10 text-info',
  low: 'bg-muted text-muted-foreground',
};

export default function AgentToday() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { t } = useLanguage();
  const { count: offlineCount } = useOfflineQueue();

  const [completingTask, setCompletingTask] = useState<{ id: string; farmerName?: string; taskType?: string } | null>(null);
  const { data: serviceAreas } = useMyServiceAreas('agent');

  const { data: dashboard, isLoading: dashLoading } = useQuery({
    queryKey: ['agent-dashboard', user?.id],
    queryFn: () => rpcJson('agent_dashboard_v1'),
    enabled: !!user?.id,
    staleTime: 30_000,
  });

  const { data: tasksData, isLoading: tasksLoading } = useAgentTasksInfinite();
  const allTasks = tasksData?.pages.flatMap((p) => p.items) ?? [];

  const startVisit = useStartVisit();
  const updateTask = useUpdateTaskStatus();
  const activeVisit = useActiveVisit();

  const today = useMemo(() => new Date().toISOString().slice(0, 10), []);

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
      onSuccess: () => toast({ title: t('agent.today.taskStarted') }),
    });
  };

  const handleStartVisit = (task: any) => {
    if (!task.farmer?.id) return;
    startVisit.mutate({ farmerId: task.farmer.id, taskId: task.id }, {
      onSuccess: () => toast({ title: t('agent.today.visitStarted') }),
    });
  };

  return (
    <DashboardLayout title={t('nav.today')}>
      <PageHeader
        title={t('agent.today.title')}
        subtitle={new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}
        actions={
          <>
            {offlineCount > 0 && (
              <Badge variant="destructive" className="flex items-center gap-1">
                <WifiOff className="h-3 w-3" /> {offlineCount} {t('agent.today.pendingSync')}
              </Badge>
            )}
            {serviceAreas !== undefined && serviceAreas.length === 0 && (
              <Button size="sm" variant="outline" onClick={() => navigate(ROUTES.AGENT.SERVICE_AREA)} className="flex items-center gap-1 border-warning text-warning hover:bg-warning/10" aria-label={t('agent.today.setupServiceArea')}>
                <MapPin className="h-3 w-3" /> {t('agent.today.setupServiceArea')}
              </Button>
            )}
          </>
        }
      >
      <div className="space-y-4">
        {dashLoading ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-20" />)}
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <KpiCard label={t('agent.today.assignedFarmers')} value={dashboard?.assigned_farmers_count ?? 0} icon={Users} priority="primary" />
            <KpiCard label={t('agent.today.tasksToday')} value={todayTasks.length} icon={ClipboardList} priority="info" />
            <KpiCard label={t('agent.today.overdue')} value={overdueTasks.length} icon={AlertTriangle} priority="warning" />
            <KpiCard label={t('agent.today.visitsToday')} value={dashboard?.visits_today_count ?? 0} icon={CheckCircle} priority="success" />
          </div>
        )}

        {overdueTasks.length > 0 && (
          <Card className="border-destructive/30">
            <CardHeader className="py-3">
              <CardTitle className="text-base flex items-center gap-2 text-destructive">
                <AlertTriangle className="h-4 w-4" /> {t('agent.today.overdue')} ({overdueTasks.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {overdueTasks.map((task: any) => (
                <TaskRow
                  key={task.id}
                  task={task}
                  t={t}
                  onStart={() => handleStartTask(task)}
                  onComplete={() => setCompletingTask({ id: task.id, farmerName: task.farmer?.full_name, taskType: task.task_type })}
                  onVisit={() => handleStartVisit(task)}
                  onNavigate={() => task.farmer?.id && navigate(ROUTES.AGENT.FARMER_DETAIL(task.farmer.id))}
                />
              ))}
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader className="py-3">
            <CardTitle className="text-base">
              {dueTodayTasks.length > 0 ? `${t('agent.today.dueToday')} (${dueTodayTasks.length})` : t('agent.today.noTasks')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {tasksLoading && Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-16" />)}
            {dueTodayTasks.map((task: any) => (
              <TaskRow
                key={task.id}
                task={task}
                t={t}
                onStart={() => handleStartTask(task)}
                onComplete={() => setCompletingTask({ id: task.id, farmerName: task.farmer?.full_name, taskType: task.task_type })}
                onVisit={() => handleStartVisit(task)}
                onNavigate={() => task.farmer?.id && navigate(ROUTES.AGENT.FARMER_DETAIL(task.farmer.id))}
              />
            ))}
            {!tasksLoading && dueTodayTasks.length === 0 && (
              <EmptyState icon={CheckCircle} title={t('agent.today.noTasks')} />
            )}
          </CardContent>
        </Card>

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
    </PageHeader>
    </DashboardLayout>
  );
}

function TaskRow({ task, t, onStart, onComplete, onVisit, onNavigate }: {
  task: any;
  t: (key: string) => string;
  onStart: () => void;
  onComplete: () => void;
  onVisit: () => void;
  onNavigate: () => void;
}) {
  return (
    <div
      className="flex items-center justify-between p-2 rounded border hover:bg-muted/30 transition-colors"
      role="button"
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onNavigate(); }}
      onClick={onNavigate}
    >
      <div className="min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <Badge variant="outline" className="text-xs capitalize">{(task.task_type || t('common.unknown')).replace('_', ' ')}</Badge>
          <Badge className={`text-xs capitalize ${PRIORITY_COLORS[task.priority] || 'bg-muted'}`}>{task.priority || 'normal'}</Badge>
          <Badge variant="secondary" className="text-xs capitalize">{(task.task_status || '').replace('_', ' ')}</Badge>
        </div>
        <p className="text-sm mt-0.5">
          {task.farmer?.full_name || t('agent.today.unknownFarmer')}
          {task.crop?.crop_name ? ` — ${task.crop.crop_name}` : ''}
        </p>
        {task.due_date && (
          <span className={`text-xs flex items-center gap-1 mt-0.5 ${task.due_date < new Date().toISOString().slice(0, 10) ? 'text-destructive font-medium' : 'text-muted-foreground'}`}>
            <Clock className="h-3 w-3" />
            {(() => {
              try {
                const d = parseISO(task.due_date);
                const relative = formatDistanceToNow(d, { addSuffix: true });
                const formatted = format(d, 'MMM d');
                return `${formatted} (${relative})`;
              } catch { return task.due_date; }
            })()}
          </span>
        )}
      </div>
      <div className="flex gap-1 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
        {task.task_status === 'pending' && (
          <Button size="sm" variant="outline" className="touch-target" onClick={onStart} aria-label={t('agent.tasks.start')}>
            <PlayCircle className="h-4 w-4" />
          </Button>
        )}
        {task.farmer?.id && (
          <Button size="sm" variant="outline" className="touch-target" onClick={onVisit} aria-label={t('agent.today.startVisit')}>
            <Mic className="h-4 w-4" />
          </Button>
        )}
        <Button size="sm" className="touch-target" onClick={onComplete} aria-label={t('agent.tasks.complete')}>
          <CheckCircle className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
