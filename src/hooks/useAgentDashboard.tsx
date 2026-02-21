import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

// Types
export interface AgentTask {
  id: string;
  agent_id: string;
  farmer_id: string;
  crop_id: string | null;
  task_type: 'visit' | 'verify_crop' | 'harvest_check' | 'transport_assist';
  task_status: 'pending' | 'in_progress' | 'completed';
  due_date: string;
  notes: string | null;
  priority: number;
  created_at: string;
  updated_at: string;
  farmer?: {
    full_name: string | null;
    village: string | null;
    district: string | null;
    phone: string | null;
  };
  crop?: {
    crop_name: string;
    status: string;
    harvest_estimate: string | null;
    estimated_quantity: number | null;
  };
}

export interface AIAgentLog {
  id: string;
  agent_id: string;
  log_type: string;
  input_context: any;
  output_text: string | null;
  created_at: string;
}

const enrichTasksWithContext = async (tasks: any[]): Promise<AgentTask[]> => {
  if (!tasks || tasks.length === 0) return [];

  const farmerIds = Array.from(new Set(tasks.map((t) => t.farmer_id).filter(Boolean)));
  const cropIds = Array.from(new Set(tasks.map((t) => t.crop_id).filter(Boolean)));

  const [farmersRes, cropsRes] = await Promise.all([
    farmerIds.length > 0
      ? supabase
          .from('profiles')
          .select('id, full_name, village, district, phone')
          .in('id', farmerIds)
      : Promise.resolve({ data: [], error: null }),
    cropIds.length > 0
      ? supabase
          .from('crops')
          .select('id, crop_name, status, harvest_estimate, estimated_quantity')
          .in('id', cropIds as string[])
      : Promise.resolve({ data: [], error: null }),
  ]);

  if (farmersRes.error) throw farmersRes.error;
  if (cropsRes.error) throw cropsRes.error;

  const farmerMap = new Map((farmersRes.data || []).map((f: any) => [f.id, f]));
  const cropMap = new Map((cropsRes.data || []).map((c: any) => [c.id, c]));

  return tasks.map((task) => ({
    ...task,
    farmer: farmerMap.get(task.farmer_id)
      ? {
          full_name: farmerMap.get(task.farmer_id).full_name,
          village: farmerMap.get(task.farmer_id).village,
          district: farmerMap.get(task.farmer_id).district,
          phone: farmerMap.get(task.farmer_id).phone,
        }
      : null,
    crop: task.crop_id ? cropMap.get(task.crop_id) || null : null,
  })) as AgentTask[];
};

// Fetch agent tasks
export const useAgentTasks = () => {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ['agent-tasks', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      
      // First get tasks
      const { data: tasks, error } = await supabase
        .from('agent_tasks')
        .select('*')
        .eq('agent_id', user.id)
        .order('due_date', { ascending: true })
        .order('priority', { ascending: false });
      
      if (error) throw error;
      
      return enrichTasksWithContext(tasks || []);
    },
    enabled: !!user?.id,
  });
};

// Fetch today's tasks
export const useTodaysTasks = () => {
  const { user } = useAuth();
  const today = new Date().toISOString().split('T')[0];
  
  return useQuery({
    queryKey: ['today-tasks', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      
      const { data: tasks, error } = await supabase
        .from('agent_tasks')
        .select('*')
        .eq('agent_id', user.id)
        .eq('due_date', today)
        .order('priority', { ascending: false });
      
      if (error) throw error;
      
      return enrichTasksWithContext(tasks || []);
    },
    enabled: !!user?.id,
  });
};

// Fetch farmers in agent's district with assignment status
export const useAllFarmers = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['all-farmers', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      // Get agent's district
      const { data: agentProfile, error: profileError } = await supabase
        .from('profiles')
        .select('district')
        .eq('id', user.id)
        .single();

      if (profileError) throw profileError;
      if (!agentProfile?.district) return [];

      // Get farmers in same district
      const { data: farmers, error } = await supabase
        .from('profiles')
        .select('*, user_roles!inner(role)')
        .eq('user_roles.role', 'farmer')
        .eq('district', agentProfile.district);

      if (error) throw error;

      // Get all active assignments for these farmers
      const farmerIds = (farmers || []).map(f => f.id);
      if (farmerIds.length === 0) return [];

      const { data: assignments } = await (supabase as any)
        .from('agent_farmer_assignments')
        .select('farmer_id, agent_id, active')
        .in('farmer_id', farmerIds)
        .eq('active', true);

      // Map assignment info onto farmers
      const assignmentMap: Record<string, string> = {};
      (assignments || []).forEach((a: any) => {
        assignmentMap[a.farmer_id] = a.agent_id;
      });

      return (farmers || []).map(f => ({
        ...f,
        assigned_agent_id: assignmentMap[f.id] || null,
        is_assigned_to_me: assignmentMap[f.id] === user.id,
        is_assigned_to_other: !!assignmentMap[f.id] && assignmentMap[f.id] !== user.id,
      }));
    },
    enabled: !!user?.id,
  });
};

// Fetch all crops (with farmer info)
export const useAllCrops = () => {
  return useQuery({
    queryKey: ['all-crops-agent'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('crops')
        .select(`
          *,
          farmer:profiles!crops_farmer_id_fkey(full_name, village, district),
          farmland:farmlands(name, village)
        `)
        .order('harvest_estimate', { ascending: true });
      
      if (error) throw error;
      return data;
    },
  });
};

// Fetch all transport requests
export const useAllTransportRequests = () => {
  return useQuery({
    queryKey: ['all-transport-requests'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('transport_requests')
        .select(`
          *,
          crop:crops(crop_name, farmer_id),
          farmer:profiles!transport_requests_farmer_id_fkey(full_name, village)
        `)
        .order('preferred_date', { ascending: true });
      
      if (error) throw error;
      return data;
    },
  });
};

// Update task status
export const useUpdateTaskStatus = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ taskId, status, notes }: { taskId: string; status: 'pending' | 'in_progress' | 'completed'; notes?: string }) => {
      const { data, error } = await supabase.functions.invoke('agent-update-task-status', {
        body: {
          task_id: taskId,
          status,
          notes: notes || null,
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agent-tasks'] });
      queryClient.invalidateQueries({ queryKey: ['today-tasks'] });
      toast.success('Task updated successfully');
    },
    onError: (error) => {
      toast.error('Failed to update task');
      console.error(error);
    },
  });
};

// Create new task (via Edge Function)
export const useCreateTask = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (task: { 
      farmer_id: string; 
      crop_id?: string | null; 
      task_type: 'visit' | 'verify_crop' | 'harvest_check' | 'transport_assist';
      due_date: string;
      notes?: string;
    }) => {
      const { data, error } = await supabase.functions.invoke('agent-create-task', {
        body: {
          farmer_id: task.farmer_id,
          crop_id: task.crop_id || null,
          task_type: task.task_type,
          due_date: task.due_date,
          notes: task.notes || null,
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agent-tasks'] });
      queryClient.invalidateQueries({ queryKey: ['today-tasks'] });
      toast.success('Task created successfully');
    },
    onError: (error) => {
      toast.error('Failed to create task');
      console.error(error);
    },
  });
};

// Update crop status (agent can update any crop)
export const useUpdateCropStatus = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ cropId, status, quantity, notes }: { 
      cropId: string; 
      status: string; 
      quantity?: number;
      notes?: string;
    }) => {
      const { data, error } = await supabase.functions.invoke('agent-update-crop-status', {
        body: {
          crop_id: cropId,
          status,
          estimated_quantity: quantity,
          notes: notes || null,
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['all-crops-agent'] });
      toast.success('Crop status updated');
    },
    onError: (error) => {
      toast.error('Failed to update crop');
      console.error(error);
    },
  });
};

// AI Visit Prioritization
export const useAIVisitPrioritization = () => {
  const { user } = useAuth();
  
  return useMutation({
    mutationFn: async (tasks: AgentTask[]) => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-gateway/agent-ai`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
          apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        },
        body: JSON.stringify({
          type: 'visit_prioritization',
          context: {
            tasks: tasks.map(t => ({
              id: t.id,
              farmer: t.farmer?.full_name || 'Unknown',
              village: t.farmer?.village || 'Unknown',
              taskType: t.task_type,
              cropName: t.crop?.crop_name || 'N/A',
              cropStatus: t.crop?.status || 'N/A',
              harvestEstimate: t.crop?.harvest_estimate || 'N/A',
              estimatedQuantity: t.crop?.estimated_quantity || 0,
            })),
          },
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error?.message || 'Function error');

      // Log the AI usage
      await supabase.from('ai_agent_logs').insert({
        agent_id: user?.id,
        log_type: 'visit_prioritization',
        input_context: { taskCount: tasks.length },
        output_text: data.result,
      });

      return data.result;
    },
  });
};

// AI Cluster Summary
export const useAIClusterSummary = () => {
  const { user } = useAuth();
  
  return useMutation({
    mutationFn: async (clusterData: any) => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-gateway/agent-ai`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
          apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        },
        body: JSON.stringify({
          type: 'cluster_summary',
          context: { clusterData },
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error?.message || 'Function error');

      // Log the AI usage
      await supabase.from('ai_agent_logs').insert({
        agent_id: user?.id,
        log_type: 'cluster_summary',
        input_context: clusterData,
        output_text: data.result,
      });

      return data.result;
    },
  });
};

// Fetch AI logs
export const useAILogs = () => {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ['ai-logs', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      
      const { data, error } = await supabase
        .from('ai_agent_logs')
        .select('*')
        .eq('agent_id', user.id)
        .order('created_at', { ascending: false })
        .limit(10);
      
      if (error) throw error;
      return data as AIAgentLog[];
    },
    enabled: !!user?.id,
  });
};

// Dashboard stats
import { rpcJson } from '@/lib/readApi';

export const useAgentDashboardStats = () => {
  return useQuery({
    queryKey: ['agent-dashboard-stats'],
    queryFn: async () => {
      const data = await rpcJson('agent_dashboard_v1');
      return {
        farmersAssigned: Number(data?.assigned_farmers_count || 0),
        activeCrops: Number(data?.active_crops || 0),
        tasksToday: Number(data?.pending_tasks_count || 0),
        tasksCompleted: 0,
        cropsReadyToHarvest: Number((data?.tasks_top10 || []).length || 0),
        pendingTransportRequests: Number(data?.pending_tasks_count || 0),
      };
    },
  });
};
