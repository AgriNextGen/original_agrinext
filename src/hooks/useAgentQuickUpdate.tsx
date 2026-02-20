import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { toast } from 'sonner';

// Safe fields that agents can directly update on farmer profiles
const SAFE_FIELDS = ['phone', 'village', 'taluk', 'preferred_language', 'avatar_url'] as const;
type SafeField = typeof SAFE_FIELDS[number];

// Sensitive fields that require task-based approval
const SENSITIVE_FIELDS = ['total_land_area', 'district'] as const;

export const useAgentQuickUpdate = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      farmerId,
      updates,
    }: {
      farmerId: string;
      updates: Partial<Record<SafeField, string | null>>;
    }) => {
      if (!user?.id) throw new Error('Not authenticated');

      // Filter to only safe fields
      const safeUpdates: Record<string, string | null> = {};
      for (const [key, value] of Object.entries(updates)) {
        if (SAFE_FIELDS.includes(key as SafeField)) {
          safeUpdates[key] = value;
        }
      }

      if (Object.keys(safeUpdates).length === 0) {
        throw new Error('No valid fields to update');
      }

      // Update farmer profile
      const { error } = await supabase
        .from('profiles')
        .update({ ...safeUpdates, updated_at: new Date().toISOString() })
        .eq('id', farmerId);

      if (error) throw error;

      // Log the activity
      await (supabase as any)
        .from('agent_activity_logs')
        .insert({
          actor_id: user.id,
          actor_role: 'agent',
          farmer_id: farmerId,
          action_type: 'QUICK_UPDATE_SAFE_FIELDS',
          details: { fields_updated: Object.keys(safeUpdates), new_values: safeUpdates },
        });

      return safeUpdates;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['agent-farmer-detail', variables.farmerId] });
      queryClient.invalidateQueries({ queryKey: ['assigned-farmers'] });
      queryClient.invalidateQueries({ queryKey: ['all-farmers'] });
      toast.success('Farmer profile updated');
    },
    onError: (error) => {
      console.error('Quick update error:', error);
      toast.error('Failed to update farmer profile');
    },
  });
};

// Create a sensitive update task (requires admin approval, via Edge Function)
export const useCreateSensitiveUpdateTask = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      farmerId,
      proposedChanges,
      notes,
    }: {
      farmerId: string;
      proposedChanges: Record<string, unknown>;
      notes?: string;
    }) => {
      const { data, error } = await supabase.functions.invoke('agent-create-task', {
        body: {
          farmer_id: farmerId,
          task_type: 'update_profile',
          due_date: new Date().toISOString().split('T')[0],
          notes: notes || 'Profile update requiring approval',
          payload: proposedChanges,
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      return data.task;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agent-tasks'] });
      toast.success('Update request submitted for admin approval');
    },
    onError: (error) => {
      console.error('Sensitive update error:', error);
      toast.error('Failed to create update request');
    },
  });
};

// Hook for logging audit activities
export const useLogActivity = () => {
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({
      farmerId,
      actionType,
      details,
    }: {
      farmerId?: string;
      actionType: string;
      details?: Record<string, unknown>;
    }) => {
      if (!user?.id) return;

      await (supabase as any)
        .from('agent_activity_logs')
        .insert({
          actor_id: user.id,
          actor_role: 'agent',
          farmer_id: farmerId || null,
          action_type: actionType,
          details: details || {},
        });
    },
  });
};
