import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { toast } from 'sonner';

// Types
export interface AgentAssignment {
  id?: string;
  agent_id: string;
  farmer_id: string;
  assigned_by: string | null;
  active: boolean;
  assigned_at: string | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface AssignedFarmer {
  id: string;
  full_name: string | null;
  phone: string | null;
  village: string | null;
  taluk: string | null;
  district: string | null;
  avatar_url: string | null;
  crops_count?: number;
  ready_crops_count?: number;
  pending_transport_count?: number;
}

export interface FarmerAgent {
  id: string;
  agent_id: string;
  agent_name: string | null;
  agent_phone: string | null;
  agent_village: string | null;
  agent_district: string | null;
}

export interface AgentVisit {
  id: string;
  agent_id: string;
  farmer_id: string;
  task_id: string | null;
  check_in_at: string;
  check_out_at: string | null;
  notes: string | null;
  created_at: string | null;
}

// Helper to get supabase client with any type to avoid deep type inference issues
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const getTable = (tableName: string): any => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (supabase as any).from(tableName);
};

// Hook to get assigned farmers for an agent
export const useAssignedFarmers = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['assigned-farmers', user?.id],
    queryFn: async (): Promise<AssignedFarmer[]> => {
      if (!user?.id) return [];

      // Get assignments using helper to avoid type issues
      const { data: assignments, error: assignmentError } = await getTable('agent_farmer_assignments')
        .select('farmer_id')
        .eq('agent_id', user.id)
        .eq('active', true);

      if (assignmentError) throw assignmentError;
      if (!assignments?.length) return [];

      const farmerIds = assignments.map((a: { farmer_id: string }) => a.farmer_id);

      // Get farmer profiles
      const { data: farmers, error: farmersError } = await supabase
        .from('profiles')
        .select('id, full_name, phone, village, taluk, district, avatar_url')
        .in('id', farmerIds);

      if (farmersError) throw farmersError;

      // Get crop counts and transport counts in parallel
      const [cropsResult, transportResult] = await Promise.all([
        supabase
          .from('crops')
          .select('farmer_id, status')
          .in('farmer_id', farmerIds)
          .neq('status', 'harvested'),
        supabase
          .from('transport_requests')
          .select('farmer_id, status')
          .in('farmer_id', farmerIds)
          .eq('status', 'requested')
      ]);

      // Aggregate counts
      const cropsByFarmer: Record<string, { total: number; ready: number }> = {};
      const transportByFarmer: Record<string, number> = {};

      cropsResult.data?.forEach(crop => {
        if (!cropsByFarmer[crop.farmer_id]) {
          cropsByFarmer[crop.farmer_id] = { total: 0, ready: 0 };
        }
        cropsByFarmer[crop.farmer_id].total++;
        if (crop.status === 'ready' || crop.status === 'one_week') {
          cropsByFarmer[crop.farmer_id].ready++;
        }
      });

      transportResult.data?.forEach(req => {
        transportByFarmer[req.farmer_id] = (transportByFarmer[req.farmer_id] || 0) + 1;
      });

      return (farmers || []).map(farmer => ({
        ...farmer,
        crops_count: cropsByFarmer[farmer.id]?.total || 0,
        ready_crops_count: cropsByFarmer[farmer.id]?.ready || 0,
        pending_transport_count: transportByFarmer[farmer.id] || 0
      }));
    },
    enabled: !!user?.id
  });
};

// Hook to get assigned agent for a farmer
export const useFarmerAgent = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['farmer-agent', user?.id],
    queryFn: async (): Promise<FarmerAgent | null> => {
      if (!user?.id) return null;

      const { data: assignment, error } = await getTable('agent_farmer_assignments')
        .select('agent_id')
        .eq('farmer_id', user.id)
        .eq('active', true)
        .maybeSingle();

      if (error) throw error;
      if (!assignment) return null;

      // Get agent profile
      const { data: agent, error: agentError } = await supabase
        .from('profiles')
        .select('full_name, phone, village, district')
        .eq('id', assignment.agent_id)
        .single();

      if (agentError) throw agentError;

      return {
        id: assignment.agent_id,
        agent_id: assignment.agent_id,
        agent_name: agent.full_name,
        agent_phone: agent.phone,
        agent_village: agent.village,
        agent_district: agent.district
      };
    },
    enabled: !!user?.id
  });
};

// Hook to get agent visits for a farmer
export const useFarmerAgentVisits = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['farmer-agent-visits', user?.id],
    queryFn: async (): Promise<AgentVisit[]> => {
      if (!user?.id) return [];

      const { data, error } = await getTable('agent_visits')
        .select('*')
        .eq('farmer_id', user.id)
        .order('check_in_at', { ascending: false })
        .limit(10);

      if (error) throw error;
      return (data as AgentVisit[]) || [];
    },
    enabled: !!user?.id
  });
};

// Hook to create farmer help request (task)
export const useCreateHelpRequest = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      agentId,
      taskType,
      notes,
      dueDate
    }: {
      agentId: string;
      taskType: string;
      notes?: string;
      dueDate?: string;
    }) => {
      if (!user?.id) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('agent_tasks')
        .insert({
          farmer_id: user.id,
          agent_id: agentId,
          task_type: taskType as 'visit' | 'verify_crop' | 'harvest_check' | 'transport_assist',
          task_status: 'pending',
          notes,
          due_date: dueDate || new Date().toISOString().split('T')[0],
          created_by: user.id,
          created_by_role: 'farmer'
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agent-tasks'] });
      queryClient.invalidateQueries({ queryKey: ['farmer-help-requests'] });
      toast.success('Help request sent to your agent');
    },
    onError: (error) => {
      console.error('Error creating help request:', error);
      toast.error('Failed to send help request');
    }
  });
};

// Hook to get farmer's help requests
export const useFarmerHelpRequests = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['farmer-help-requests', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      const { data, error } = await supabase
        .from('agent_tasks')
        .select('*')
        .eq('farmer_id', user.id)
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id
  });
};

// Hook to start agent visit
export const useStartVisit = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      farmerId,
      taskId
    }: {
      farmerId: string;
      taskId?: string;
    }): Promise<AgentVisit> => {
      if (!user?.id) throw new Error('Not authenticated');

      const { data, error } = await getTable('agent_visits')
        .insert({
          agent_id: user.id,
          farmer_id: farmerId,
          task_id: taskId || null
        })
        .select()
        .single();

      if (error) throw error;
      return data as AgentVisit;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agent-visits'] });
      queryClient.invalidateQueries({ queryKey: ['active-visit'] });
      toast.success('Visit started');
    },
    onError: (error) => {
      console.error('Error starting visit:', error);
      toast.error('Failed to start visit');
    }
  });
};

// Hook to end agent visit
export const useEndVisit = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      visitId,
      notes
    }: {
      visitId: string;
      notes?: string;
    }): Promise<AgentVisit> => {
      const { data, error } = await getTable('agent_visits')
        .update({
          check_out_at: new Date().toISOString(),
          notes
        })
        .eq('id', visitId)
        .select()
        .single();

      if (error) throw error;
      return data as AgentVisit;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agent-visits'] });
      queryClient.invalidateQueries({ queryKey: ['active-visit'] });
      toast.success('Visit ended');
    },
    onError: (error) => {
      console.error('Error ending visit:', error);
      toast.error('Failed to end visit');
    }
  });
};

// Hook to get active visit for agent
export const useActiveVisit = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['active-visit', user?.id],
    queryFn: async (): Promise<AgentVisit | null> => {
      if (!user?.id) return null;

      const { data, error } = await getTable('agent_visits')
        .select('*')
        .eq('agent_id', user.id)
        .is('check_out_at', null)
        .order('check_in_at', { ascending: false })
        .maybeSingle();

      if (error) throw error;
      return data as AgentVisit | null;
    },
    enabled: !!user?.id
  });
};

// Admin hook: Assign farmer to agent
export const useAssignFarmerToAgent = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      farmerId,
      agentId
    }: {
      farmerId: string;
      agentId: string;
    }): Promise<AgentAssignment> => {
      if (!user?.id) throw new Error('Not authenticated');

      // First deactivate any existing assignment for this farmer
      await getTable('agent_farmer_assignments')
        .update({ active: false })
        .eq('farmer_id', farmerId)
        .eq('active', true);

      // Create new assignment
      const { data, error } = await getTable('agent_farmer_assignments')
        .upsert({
          agent_id: agentId,
          farmer_id: farmerId,
          assigned_by: user.id,
          active: true,
          assigned_at: new Date().toISOString()
        }, {
          onConflict: 'agent_id,farmer_id'
        })
        .select()
        .single();

      if (error) throw error;
      return data as AgentAssignment;
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['assigned-farmers'] });
      queryClient.invalidateQueries({ queryKey: ['agent-farmer-assignments'] });
      queryClient.invalidateQueries({ queryKey: ['farmer-agent'] });
      queryClient.invalidateQueries({ queryKey: ['all-farmers'] });

      // Audit log
      if (user?.id) {
        (supabase as any).from('agent_activity_logs').insert({
          actor_id: user.id,
          actor_role: 'agent',
          farmer_id: variables.farmerId,
          action_type: 'ASSIGN_FARMER',
          details: { agent_id: variables.agentId },
        });
      }

      toast.success('Farmer assigned to agent');
    },
    onError: (error) => {
      console.error('Error assigning farmer:', error);
      toast.error('Failed to assign farmer');
    }
  });
};

// Admin hook: Unassign farmer from agent
export const useUnassignFarmer = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (assignmentId: string): Promise<void> => {
      const { error } = await getTable('agent_farmer_assignments')
        .update({ active: false })
        .eq('id', assignmentId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assigned-farmers'] });
      queryClient.invalidateQueries({ queryKey: ['agent-farmer-assignments'] });
      queryClient.invalidateQueries({ queryKey: ['farmer-agent'] });
      toast.success('Farmer unassigned');
    },
    onError: (error) => {
      console.error('Error unassigning farmer:', error);
      toast.error('Failed to unassign farmer');
    }
  });
};

// Admin hook: Get all assignments
export const useAllAssignments = () => {
  return useQuery({
    queryKey: ['agent-farmer-assignments'],
    queryFn: async (): Promise<AgentAssignment[]> => {
      const { data, error } = await getTable('agent_farmer_assignments')
        .select('*')
        .eq('active', true)
        .order('assigned_at', { ascending: false });

      if (error) throw error;
      return (data as AgentAssignment[]) || [];
    }
  });
};

// Hook to update agent task status
export const useUpdateAgentTaskStatus = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      taskId,
      status
    }: {
      taskId: string;
      status: 'pending' | 'in_progress' | 'completed';
    }) => {
      const updateData: Record<string, unknown> = { task_status: status };
      if (status === 'completed') {
        updateData.completed_at = new Date().toISOString();
      }

      const { data, error } = await supabase
        .from('agent_tasks')
        .update(updateData)
        .eq('id', taskId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agent-tasks'] });
      queryClient.invalidateQueries({ queryKey: ['farmer-help-requests'] });
      toast.success('Task status updated');
    },
    onError: (error) => {
      console.error('Error updating task:', error);
      toast.error('Failed to update task');
    }
  });
};

// Hook to get agent's tasks
export const useAgentTasks = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['agent-tasks', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      const { data, error } = await supabase
        .from('agent_tasks')
        .select('*')
        .eq('agent_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id
  });
};
