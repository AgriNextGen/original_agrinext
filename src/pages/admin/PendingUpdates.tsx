import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import DashboardLayout from '@/layouts/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Shield,
  CheckCircle,
  XCircle,
  Clock,
  User,
  ArrowRight,
  FileText,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { format, parseISO } from 'date-fns';

export default function PendingUpdates() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [selectedTask, setSelectedTask] = useState<any>(null);

  // Fetch pending tasks with payload (sensitive update requests)
  const { data: pendingTasks, isLoading } = useQuery({
    queryKey: ['admin-pending-updates'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('agent_tasks')
        .select('*')
        .eq('task_status', 'pending')
        .not('payload', 'is', null)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Enrich with farmer + agent names
      const enriched = await Promise.all(
        (data || []).map(async (task) => {
          const [farmerRes, agentRes] = await Promise.all([
            supabase.from('profiles').select('full_name, district, village').eq('id', task.farmer_id).single(),
            supabase.from('profiles').select('full_name').eq('id', task.agent_id).single(),
          ]);
          return {
            ...task,
            farmer_name: farmerRes.data?.full_name || 'Unknown',
            farmer_district: farmerRes.data?.district,
            farmer_village: farmerRes.data?.village,
            agent_name: agentRes.data?.full_name || 'Unknown',
          };
        })
      );

      return enriched;
    },
  });

  // Approve mutation
  const approveMutation = useMutation({
    mutationFn: async (task: any) => {
      if (!user?.id) throw new Error('Not authenticated');

      const payload = task.payload as Record<string, unknown>;

      // Apply the proposed changes to the farmer profile
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ ...payload, updated_at: new Date().toISOString() })
        .eq('id', task.farmer_id);

      if (updateError) throw updateError;

      // Mark task as approved
      const { error: taskError } = await supabase
        .from('agent_tasks')
        .update({
          task_status: 'approved' as any,
          completed_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', task.id);

      if (taskError) throw taskError;

      // Audit log
      await (supabase as any).from('agent_activity_logs').insert({
        actor_id: user.id,
        actor_role: 'admin',
        farmer_id: task.farmer_id,
        action_type: 'ADMIN_APPROVED_UPDATE',
        details: { task_id: task.id, applied_changes: payload },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-pending-updates'] });
      setSelectedTask(null);
      toast.success('Update approved and applied');
    },
    onError: () => toast.error('Failed to approve update'),
  });

  // Reject mutation
  const rejectMutation = useMutation({
    mutationFn: async (task: any) => {
      if (!user?.id) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('agent_tasks')
        .update({
          task_status: 'rejected' as any,
          completed_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', task.id);

      if (error) throw error;

      await (supabase as any).from('agent_activity_logs').insert({
        actor_id: user.id,
        actor_role: 'admin',
        farmer_id: task.farmer_id,
        action_type: 'ADMIN_REJECTED_UPDATE',
        details: { task_id: task.id, rejected_changes: task.payload },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-pending-updates'] });
      setSelectedTask(null);
      toast.success('Update rejected');
    },
    onError: () => toast.error('Failed to reject update'),
  });

  return (
    <DashboardLayout title="Pending Updates">
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Shield className="h-6 w-6 text-amber-600" />
            Pending Farmer Updates
          </h1>
          <p className="text-muted-foreground">
            Review and approve agent-submitted profile changes
          </p>
        </div>

        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-24 w-full" />
            ))}
          </div>
        ) : !pendingTasks?.length ? (
          <Card>
            <CardContent className="py-12 text-center">
              <CheckCircle className="h-12 w-12 mx-auto text-green-500 mb-3" />
              <p className="text-lg font-medium">All caught up!</p>
              <p className="text-muted-foreground">No pending update requests</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {pendingTasks.map((task: any) => (
              <Card key={task.id} className="border-amber-200">
                <CardContent className="py-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap mb-2">
                        <Badge className="bg-amber-100 text-amber-800">
                          <Clock className="h-3 w-3 mr-1" />
                          Pending Approval
                        </Badge>
                        <span className="text-sm text-muted-foreground">
                          {format(parseISO(task.created_at), 'MMM d, yyyy h:mm a')}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <User className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">{task.farmer_name}</span>
                        <span className="text-muted-foreground">
                          ({task.farmer_village}, {task.farmer_district})
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        Submitted by: <span className="font-medium">{task.agent_name}</span>
                      </p>
                      {task.notes && (
                        <p className="text-sm text-muted-foreground mt-1 italic">"{task.notes}"</p>
                      )}

                      {/* Proposed Changes Preview */}
                      <div className="mt-3 p-3 bg-muted rounded-lg">
                        <p className="text-xs font-medium text-muted-foreground mb-2">
                          Proposed Changes:
                        </p>
                        {Object.entries(task.payload || {}).map(([key, value]) => (
                          <div key={key} className="flex items-center gap-2 text-sm">
                            <span className="font-mono text-xs bg-background px-1.5 py-0.5 rounded">
                              {key}
                            </span>
                            <ArrowRight className="h-3 w-3 text-muted-foreground" />
                            <span className="font-medium">{String(value)}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="flex flex-col gap-2">
                      <Button
                        size="sm"
                        onClick={() => approveMutation.mutate(task)}
                        disabled={approveMutation.isPending}
                        className="bg-green-600 hover:bg-green-700"
                      >
                        <CheckCircle className="h-4 w-4 mr-1" />
                        Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => rejectMutation.mutate(task)}
                        disabled={rejectMutation.isPending}
                        className="text-red-600 border-red-200 hover:bg-red-50"
                      >
                        <XCircle className="h-4 w-4 mr-1" />
                        Reject
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
