import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface VehicleFormData {
  vehicle_type: string;
  capacity_kg: number;
  registration_number: string;
}

export function useCreateVehicle() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: VehicleFormData & { transporter_id: string }) => {
      const { data, error } = await supabase.from('vehicles').insert({
        transporter_id: params.transporter_id,
        vehicle_type: params.vehicle_type,
        capacity_kg: params.capacity_kg,
        registration_number: params.registration_number.toUpperCase(),
      }).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vehicles'] });
    },
  });
}

export function useUpdateVehicle() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: VehicleFormData }) => {
      const { error } = await supabase.from('vehicles').update({
        vehicle_type: data.vehicle_type,
        capacity_kg: data.capacity_kg,
        registration_number: data.registration_number.toUpperCase(),
      }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vehicles'] });
    },
  });
}

export function useDeleteVehicle() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (vehicleId: string) => {
      const { error } = await supabase.from('vehicles').delete().eq('id', vehicleId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vehicles'] });
    },
  });
}
