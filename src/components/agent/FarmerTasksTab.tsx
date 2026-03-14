import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  ClipboardList,
  Plus,
  Calendar,
  Clock,
  CheckCircle,
  Play,
  Loader2,
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useCreateTask, useUpdateTaskStatus } from '@/hooks/useAgentDashboard';
import { useLanguage } from '@/hooks/useLanguage';
import { format, parseISO } from 'date-fns';

const taskTypeOptions = [
  { value: 'visit' },
  { value: 'verify_crop' },
  { value: 'harvest_check' },
  { value: 'transport_assist' },
  { value: 'onboard_farmer' },
  { value: 'soil_report_upload' },
  { value: 'field_visit' },
];

const statusColors: Record<string, string> = {
  pending: 'bg-amber-100 text-amber-800',
  in_progress: 'bg-blue-100 text-blue-800',
  completed: 'bg-green-100 text-green-800',
  approved: 'bg-emerald-100 text-emerald-800',
  rejected: 'bg-red-100 text-red-800',
};

interface FarmerTasksTabProps {
  farmerId: string;
}

export default function FarmerTasksTab({ farmerId }: FarmerTasksTabProps) {
  const { user } = useAuth();
  const { t } = useLanguage();
  const createTask = useCreateTask();
  const updateStatus = useUpdateTaskStatus();
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  const [newTask, setNewTask] = useState({
    task_type: 'visit' as string,
    due_date: new Date().toISOString().split('T')[0],
    notes: '',
  });

  // Fetch tasks for this specific farmer
  const { data: tasks, isLoading } = useQuery({
    queryKey: ['farmer-tasks', farmerId],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from('agent_tasks')
        .select('*')
        .eq('agent_id', user.id)
        .eq('farmer_id', farmerId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id && !!farmerId,
  });

  const handleCreate = () => {
    createTask.mutate(
      {
        farmer_id: farmerId,
        task_type: newTask.task_type as any,
        due_date: newTask.due_date,
        notes: newTask.notes,
      },
      {
        onSuccess: () => {
          setIsCreateOpen(false);
          setNewTask({ task_type: 'visit', due_date: new Date().toISOString().split('T')[0], notes: '' });
        },
      }
    );
  };

  return (
    <div className="space-y-4">
      {/* Header with create button */}
      <div className="flex items-center justify-between">
        <h3 className="font-semibold flex items-center gap-2">
          <ClipboardList className="h-4 w-4" />
          {t('agent.farmerTasks.title')}
        </h3>
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="h-3 w-3 mr-1" />
              {t('agent.farmerTasks.newTask')}
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t('agent.farmerTasks.createTitle')}</DialogTitle>
              <DialogDescription>
                {t('agent.farmerTasks.createDescription')}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>{t('agent.farmerTasks.taskType')}</Label>
                <Select value={newTask.task_type} onValueChange={(v) => setNewTask({ ...newTask, task_type: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {taskTypeOptions.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {t(`agent.farmerTasks.taskTypes.${opt.value}`)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>{t('agent.farmerTasks.dueDate')}</Label>
                <Input
                  type="date"
                  value={newTask.due_date}
                  onChange={(e) => setNewTask({ ...newTask, due_date: e.target.value })}
                />
              </div>
              <div>
                <Label>{t('agent.farmerTasks.notes')}</Label>
                <Textarea
                  value={newTask.notes}
                  onChange={(e) => setNewTask({ ...newTask, notes: e.target.value })}
                  placeholder={t('agent.farmerTasks.notesPlaceholder')}
                  rows={3}
                />
              </div>
              <Button onClick={handleCreate} disabled={createTask.isPending} className="w-full">
                {createTask.isPending ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Plus className="h-4 w-4 mr-2" />
                )}
                {t('agent.farmerTasks.create')}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Tasks list */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-20 bg-muted rounded-lg animate-pulse" />
          ))}
        </div>
      ) : !tasks?.length ? (
        <Card>
          <CardContent className="py-8 text-center">
            <ClipboardList className="h-10 w-10 mx-auto text-muted-foreground/50 mb-2" />
            <p className="text-muted-foreground text-sm">
              {t('agent.farmerTasks.noTasks')}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {tasks.map((task) => {
            return (
              <Card key={task.id}>
                <CardContent className="py-3 px-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-sm">
                          {t(`agent.farmerTasks.taskTypes.${task.task_type}`)}
                        </span>
                        <Badge className={statusColors[task.task_status] || 'bg-gray-100 text-gray-800'}>
                          {task.task_status.replace('_', ' ')}
                        </Badge>
                        {(task as any).payload && (
                          <Badge variant="outline" className="text-amber-600 border-amber-300">
                            {t('agent.quickUpdate.needsApproval')}
                          </Badge>
                        )}
                      </div>
                      {task.notes && (
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-1">{task.notes}</p>
                      )}
                      <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {t('agent.farmerTasks.due')}: {format(parseISO(task.due_date), 'MMM d, yyyy')}
                      </p>
                    </div>
                    <div className="flex items-center gap-1">
                      {task.task_status === 'pending' && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => updateStatus.mutate({ taskId: task.id, status: 'in_progress' })}
                        >
                          <Play className="h-3 w-3" />
                        </Button>
                      )}
                      {task.task_status === 'in_progress' && (
                        <Button
                          size="sm"
                          onClick={() => updateStatus.mutate({ taskId: task.id, status: 'completed' })}
                        >
                          <CheckCircle className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
