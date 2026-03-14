import { useState } from 'react';
import DashboardLayout from '@/layouts/DashboardLayout';
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { 
  useAgentTasks, 
  useUpdateTaskStatus, 
  useCreateTask,
  useAllFarmers,
  useAllCrops,
  AgentTask 
} from '@/hooks/useAgentDashboard';
import { useAgentTasksInfinite } from '@/hooks/useAgentTasksInfinite';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  ClipboardList, 
  Plus, 
  MapPin, 
  Calendar, 
  CheckCircle, 
  Clock, 
  Play,
  Search,
  FileAudio
} from 'lucide-react';
import { Loader2 } from 'lucide-react';
import AgentVoiceNoteDialog from '@/components/agent/AgentVoiceNoteDialog';
import { format, parseISO } from 'date-fns';
import { toast } from 'sonner';
import network from '@/offline/network';
import actionQueue from '@/offline/actionQueue';
import PageHeader from '@/components/shared/PageHeader';
import { useLanguage } from '@/hooks/useLanguage';
import DataState from '@/components/ui/DataState';

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

const AgentTasks = () => {
  const { data: tasksPages, isLoading: tasksLoading, fetchNextPage, hasNextPage, isFetchingNextPage } = useAgentTasksInfinite();
  const { t } = useLanguage();
  const tasks = tasksPages ? tasksPages.pages.flatMap((p: any) => p.items || []) : [];
  const isLoading = tasksLoading;
  const { data: farmers } = useAllFarmers();
  const { data: crops } = useAllCrops();
  const updateStatus = useUpdateTaskStatus();
  const createTask = useCreateTask();
  
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<AgentTask | null>(null);
  
  // New task form state
  const [newTask, setNewTask] = useState({
    farmer_id: '',
    crop_id: '',
    task_type: 'visit' as 'visit' | 'verify_crop' | 'harvest_check' | 'transport_assist',
    due_date: new Date().toISOString().split('T')[0],
    notes: '',
  });

  const filteredTasks = tasks?.filter((task) => {
    const matchesStatus = filterStatus === 'all' || task.task_status === filterStatus;
    const matchesSearch = 
      task.farmer?.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      task.farmer?.village?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      task.crop?.crop_name?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStatus && (searchQuery === '' || matchesSearch);
  });

  const handleCreateTask = () => {
    if (!newTask.farmer_id) {
      toast.error(t('agent.tasks.selectFarmerError'));
      return;
    }
    
    createTask.mutate({
      farmer_id: newTask.farmer_id,
      crop_id: newTask.crop_id || null,
      task_type: newTask.task_type,
      due_date: newTask.due_date,
      notes: newTask.notes,
    }, {
      onSuccess: () => {
        setIsCreateOpen(false);
        setNewTask({
          farmer_id: '',
          crop_id: '',
          task_type: 'visit',
          due_date: new Date().toISOString().split('T')[0],
          notes: '',
        });
      },
    });
  };

  const handleStatusChange = (task: AgentTask, newStatus: 'pending' | 'in_progress' | 'completed') => {
    // If offline, enqueue action with idempotencyKey and show pending notification
    if (!network.isOnline()) {
      const idempotencyKey = crypto.randomUUID();
      actionQueue.enqueueAction({
        id: crypto.randomUUID(),
        type: 'rpc',
        name: 'agent.update_task_status_v1',
        payload: { task_id: task.id, status: newStatus },
        idempotencyKey,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        status: 'queued',
        retryCount: 0,
        maxRetries: 8,
        nextRunAt: null,
        scope: 'agent',
        entityType: 'agent_task',
        entityId: task.id
      });
      toast.success(t('agent.tasks.savedLocally'));
      return;
    }
    updateStatus.mutate({ taskId: task.id, status: newStatus }, {
      onError: (err: any) => {
        // If network error, enqueue for retry
        if (String(err?.message || '').toLowerCase().includes('network') || String(err?.message || '').toLowerCase().includes('failed to fetch')) {
          const idempotencyKey = crypto.randomUUID();
          actionQueue.enqueueAction({
            id: crypto.randomUUID(),
            type: 'rpc',
            name: 'agent.update_task_status_v1',
            payload: { task_id: task.id, status: newStatus },
            idempotencyKey,
            createdAt: Date.now(),
            updatedAt: Date.now(),
            status: 'queued',
            retryCount: 0,
            maxRetries: 8,
            nextRunAt: null,
            scope: 'agent',
            entityType: 'agent_task',
            entityId: task.id
          });
          toast.success(t('agent.tasks.savedLocally'));
        }
      }
    });
  };

  return (
    <DashboardLayout title={t('agent.tasks.title')}>
      <PageHeader
        title={t('agent.tasks.title')}
        subtitle={t('agent.tasks.subtitle')}
        actions={(
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
              <DialogTrigger asChild>
              <Button variant="default">
                <Plus className="h-4 w-4 mr-2" />
                {t('agent.tasks.newTask')}
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{t('agent.tasks.createTitle')}</DialogTitle>
                <DialogDescription>{t('agent.tasks.createSubtitle')}</DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>{t('agent.myFarmers.name')} *</Label>
                  <Select 
                    value={newTask.farmer_id} 
                    onValueChange={(v) => setNewTask({ ...newTask, farmer_id: v })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={t('agent.tasks.selectFarmer')} />
                    </SelectTrigger>
                    <SelectContent>
                      {farmers?.map((f) => (
                        <SelectItem key={f.id} value={f.id}>
                          {f.full_name || t('common.unknown')} - {f.village || 'N/A'}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Label>{t('agent.farmerDetail.crop')} ({t('common.optional')})</Label>
                  <Select 
                    value={newTask.crop_id} 
                    onValueChange={(v) => setNewTask({ ...newTask, crop_id: v === '__none__' ? '' : v })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={t('agent.tasks.selectCrop')} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">{t('common.none')}</SelectItem>
                      {crops?.filter(c => c.farmer_id === newTask.farmer_id).map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.crop_name} - {c.status}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Label>{t('agent.farmerTasks.taskType')}</Label>
                  <Select 
                    value={newTask.task_type} 
                    onValueChange={(v: 'visit' | 'verify_crop' | 'harvest_check' | 'transport_assist') =>
                      setNewTask({ ...newTask, task_type: v })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="visit">{t('agent.taskTypes.visit')}</SelectItem>
                      <SelectItem value="verify_crop">{t('agent.taskTypes.verify_crop')}</SelectItem>
                      <SelectItem value="harvest_check">{t('agent.taskTypes.harvest_check')}</SelectItem>
                      <SelectItem value="transport_assist">{t('agent.taskTypes.transport_assist')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Label>{t('agent.tasks.dueDate')}</Label>
                  <Input
                    type="date"
                    value={newTask.due_date}
                    onChange={(e) => setNewTask({ ...newTask, due_date: e.target.value })}
                  />
                </div>
                
                <div>
                  <Label>{t('agent.tasks.notes')}</Label>
                  <Textarea
                    value={newTask.notes}
                    onChange={(e) => setNewTask({ ...newTask, notes: e.target.value })}
                    placeholder={t('agent.farmerTasks.notesPlaceholder')}
                  />
                </div>
                
                <Button 
                  onClick={handleCreateTask} 
                  disabled={createTask.isPending}
                  className="w-full"
                  variant="default"
                >
                  {createTask.isPending ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />{t('agent.tasks.creating')}</> : t('agent.tasks.createTask')}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        )}
      >
          
        {/* Filters */}
        <Card>
          <CardContent className="py-4">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder={t('agent.tasks.searchPlaceholder')}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
              <div className="flex gap-2">
                {['all', 'pending', 'in_progress', 'completed'].map((status) => (
                  <Button
                    key={status}
                    variant={filterStatus === status ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setFilterStatus(status)}
                  >
                    {status === 'all' ? t('common.all') : t(`agent.transportPage.statusLabels.${status}`)}
                  </Button>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tasks Table */}
        <Card>
          <CardContent className="p-0">
            <DataState loading={isLoading} empty={!isLoading && (!filteredTasks || filteredTasks.length === 0)} emptyTitle={t('agent.tasks.noTasks')}>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('agent.myFarmers.name')}</TableHead>
                    <TableHead>{t('agent.farmers.village')}</TableHead>
                    <TableHead>{t('agent.farmerDetail.crop')}</TableHead>
                    <TableHead>{t('agent.farmerTasks.taskType')}</TableHead>
                    <TableHead>{t('agent.tasks.dueDate')}</TableHead>
                    <TableHead>{t('agent.farmerDetail.status')}</TableHead>
                    <TableHead>{t('agent.myFarmers.actions')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTasks?.map((task) => (
                      <TableRow key={task.id}>
                        <TableCell className="font-medium">
                          {task.farmer?.full_name || t('common.unknown')}
                        </TableCell>
                        <TableCell>
                          <span className="flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            {task.farmer?.village || 'N/A'}
                          </span>
                        </TableCell>
                        <TableCell>
                          {task.crop ? (
                            <Badge variant="outline" className="bg-green-50">
                              {task.crop.crop_name}
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell>{t(`agent.taskTypes.${task.task_type}`)}</TableCell>
                        <TableCell>
                          {task.due_date ? (
                            <span className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {format(parseISO(task.due_date), 'MMM d, yyyy')}
                            </span>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge className={statusColors[task.task_status]}>
                            {task.task_status === 'pending' && <Clock className="h-3 w-3 mr-1" />}
                            {task.task_status === 'in_progress' && <Play className="h-3 w-3 mr-1" />}
                            {task.task_status === 'completed' && <CheckCircle className="h-3 w-3 mr-1" />}
                            {t(`agent.transportPage.statusLabels.${task.task_status}`)}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {task.task_status === 'pending' && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleStatusChange(task, 'in_progress')}
                              >
                                {t('agent.tasks.start')}
                              </Button>
                            )}
                            {task.task_status === 'in_progress' && (
                              <Button
                                size="sm"
                                variant="default"
                                onClick={() => handleStatusChange(task, 'completed')}
                              >
                                {t('agent.tasks.complete')}
                              </Button>
                            )}
                            {task.task_status === 'completed' && (
                              <span className="text-sm text-green-600">{t('agent.tasks.done')}</span>
                            )}
                            <AgentVoiceNoteDialog
                              farmerId={task.farmer_id}
                              taskId={task.id}
                              cropId={task.crop_id}
                              triggerButton={
                                <Button aria-label="Add voice note" variant="ghost" size="icon" className="h-8 w-8">
                                  <FileAudio className="h-4 w-4" />
                                </Button>
                              }
                            />
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
              <div className="p-4 text-center">
                {hasNextPage ? <Button variant="outline" onClick={() => fetchNextPage()} disabled={isFetchingNextPage}>{isFetchingNextPage ? t('common.loading') : t('common.loadMore')}</Button> : <div className="text-sm text-muted-foreground">{t('common.noMoreItems')}</div>}
              </div>
            </DataState>
          </CardContent>
        </Card>
      </PageHeader>
    </DashboardLayout>
  );
};

export default AgentTasks;
