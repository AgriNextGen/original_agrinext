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
import AgentVoiceNoteDialog from '@/components/agent/AgentVoiceNoteDialog';
import { format, parseISO } from 'date-fns';
import { toast } from 'sonner';
import network from '@/offline/network';
import actionQueue from '@/offline/actionQueue';
import PageShell from '@/components/layout/PageShell';
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
      toast.error('Please select a farmer');
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
      toast.success('Saved locally — will sync when online');
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
          toast.success('Saved locally — will sync when online');
        }
      }
    });
  };

  return (
    <DashboardLayout title="Tasks">
      <PageShell
        title="My Tasks"
        subtitle="Manage your field visit tasks"
        actions={(
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                New Task
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Task</DialogTitle>
                <DialogDescription>Schedule a new field visit or task</DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>Farmer *</Label>
                  <Select 
                    value={newTask.farmer_id} 
                    onValueChange={(v) => setNewTask({ ...newTask, farmer_id: v })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select farmer" />
                    </SelectTrigger>
                    <SelectContent>
                      {farmers?.map((f) => (
                        <SelectItem key={f.id} value={f.id}>
                          {f.full_name || 'Unknown'} - {f.village || 'N/A'}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Label>Crop (Optional)</Label>
                  <Select 
                    value={newTask.crop_id} 
                    onValueChange={(v) => setNewTask({ ...newTask, crop_id: v === '__none__' ? '' : v })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select crop" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">None</SelectItem>
                      {crops?.filter(c => c.farmer_id === newTask.farmer_id).map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.crop_name} - {c.status}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Label>Task Type</Label>
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
                      <SelectItem value="visit">Farm Visit</SelectItem>
                      <SelectItem value="verify_crop">Verify Crop</SelectItem>
                      <SelectItem value="harvest_check">Harvest Check</SelectItem>
                      <SelectItem value="transport_assist">Transport Assist</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Label>Due Date</Label>
                  <Input
                    type="date"
                    value={newTask.due_date}
                    onChange={(e) => setNewTask({ ...newTask, due_date: e.target.value })}
                  />
                </div>
                
                <div>
                  <Label>Notes</Label>
                  <Textarea
                    value={newTask.notes}
                    onChange={(e) => setNewTask({ ...newTask, notes: e.target.value })}
                    placeholder="Add any notes..."
                  />
                </div>
                
                <Button 
                  onClick={handleCreateTask} 
                  disabled={createTask.isPending}
                  className="w-full"
                >
                  {createTask.isPending ? 'Creating...' : 'Create Task'}
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
                  placeholder="Search by farmer, village, or crop..."
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
                    {status === 'all' ? 'All' : status.replace('_', ' ')}
                  </Button>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tasks Table */}
        <Card>
          <CardContent className="p-0">
            <DataState loading={isLoading} empty={!isLoading && (!filteredTasks || filteredTasks.length === 0)} emptyTitle="No tasks found">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Farmer</TableHead>
                    <TableHead>Village</TableHead>
                    <TableHead>Crop</TableHead>
                    <TableHead>Task Type</TableHead>
                    <TableHead>Due Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTasks?.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-12">
                        <ClipboardList className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
                        <p className="text-muted-foreground">No tasks found</p>
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredTasks?.map((task) => (
                      <TableRow key={task.id}>
                        <TableCell className="font-medium">
                          {task.farmer?.full_name || 'Unknown'}
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
                        <TableCell>{taskTypeLabels[task.task_type]}</TableCell>
                        <TableCell>
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {format(parseISO(task.due_date), 'MMM d, yyyy')}
                          </span>
                        </TableCell>
                        <TableCell>
                          <Badge className={statusColors[task.task_status]}>
                            {task.task_status === 'pending' && <Clock className="h-3 w-3 mr-1" />}
                            {task.task_status === 'in_progress' && <Play className="h-3 w-3 mr-1" />}
                            {task.task_status === 'completed' && <CheckCircle className="h-3 w-3 mr-1" />}
                            {task.task_status.replace('_', ' ')}
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
                                Start
                              </Button>
                            )}
                            {task.task_status === 'in_progress' && (
                              <Button
                                size="sm"
                                onClick={() => handleStatusChange(task, 'completed')}
                              >
                                Complete
                              </Button>
                            )}
                            {task.task_status === 'completed' && (
                              <span className="text-sm text-green-600">Done</span>
                            )}
                            <AgentVoiceNoteDialog
                              farmerId={task.farmer_id}
                              taskId={task.id}
                              cropId={task.crop_id}
                              triggerButton={
                                <Button variant="ghost" size="icon" className="h-8 w-8" title="Add voice note">
                                  <FileAudio className="h-4 w-4" />
                                </Button>
                              }
                            />
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
              <div className="p-4 text-center">
                {hasNextPage ? <Button onClick={() => fetchNextPage()} disabled={isFetchingNextPage}>{isFetchingNextPage ? 'Loading...' : 'Load more'}</Button> : <div className="text-sm text-muted-foreground">No more tasks</div>}
              </div>
            </DataState>
          </CardContent>
        </Card>
      </PageShell>
    </DashboardLayout>
  );
};

export default AgentTasks;
