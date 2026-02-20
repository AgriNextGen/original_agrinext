import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { signAndUpload } from '@/lib/storage-upload';

export interface SoilTestReport {
  id: string;
  farmland_id: string;
  farmer_id: string;
  uploaded_by: string;
  source_role: 'farmer' | 'agent' | 'lab';
  report_date: string;
  lab_name: string | null;
  report_file_path: string;
  report_file_type: 'image' | 'pdf';
  report_mime_type: string | null;
  notes: string | null;
  extracted_data: any | null;
  ph: number | null;
  ec: number | null;
  organic_carbon: number | null;
  nitrogen: number | null;
  phosphorus: number | null;
  potassium: number | null;
  consent_captured: boolean;
  consent_note: string | null;
  consent_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface SoilReportFormData {
  report_date: string;
  lab_name?: string;
  notes?: string;
  ph?: number | null;
  ec?: number | null;
  organic_carbon?: number | null;
  nitrogen?: number | null;
  phosphorus?: number | null;
  potassium?: number | null;
}

export const useSoilReports = (farmlandId: string) => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['soil-reports', farmlandId],
    queryFn: async () => {
      if (!farmlandId) return [];

      const { data, error } = await supabase
        .from('soil_test_reports')
        .select('*')
        .eq('farmland_id', farmlandId)
        .order('report_date', { ascending: false });

      if (error) throw error;
      return data as SoilTestReport[];
    },
    enabled: !!farmlandId && !!user?.id,
  });
};

export const useLatestSoilReport = (farmlandId: string) => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['soil-reports-latest', farmlandId],
    queryFn: async () => {
      if (!farmlandId) return null;

      const { data, error } = await supabase
        .from('soil_test_reports')
        .select('*')
        .eq('farmland_id', farmlandId)
        .order('report_date', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      return data as SoilTestReport | null;
    },
    enabled: !!farmlandId && !!user?.id,
  });
};

export const useUploadSoilReport = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      farmlandId,
      file,
      formData,
    }: {
      farmlandId: string;
      file: File;
      formData: SoilReportFormData;
    }) => {
      if (!user?.id) throw new Error('Not authenticated');

      // Determine file type
      const isImage = file.type.startsWith('image/');
      const isPdf = file.type === 'application/pdf';
      if (!isImage && !isPdf) {
        throw new Error('Only images and PDF files are allowed');
      }

      // Upload via signed URL
      const filePath = await signAndUpload(file, {
        bucket: 'soil-reports',
        contentType: file.type,
        sizeBytes: file.size,
        entity: { type: 'soil_report', id: farmlandId },
      });

      // Insert database record
      const { data, error: dbError } = await supabase
        .from('soil_test_reports')
        .insert({
          farmland_id: farmlandId,
          farmer_id: user.id,
          uploaded_by: user.id,
          source_role: 'farmer',
          report_date: formData.report_date,
          lab_name: formData.lab_name || null,
          report_file_path: filePath,
          report_file_type: isImage ? 'image' : 'pdf',
          report_mime_type: file.type,
          notes: formData.notes || null,
          ph: formData.ph ?? null,
          ec: formData.ec ?? null,
          organic_carbon: formData.organic_carbon ?? null,
          nitrogen: formData.nitrogen ?? null,
          phosphorus: formData.phosphorus ?? null,
          potassium: formData.potassium ?? null,
        })
        .select()
        .single();

      if (dbError) {
        // Cleanup uploaded file if DB insert fails
        await supabase.storage.from('soil-reports').remove([filePath]);
        throw new Error(`Failed to save report: ${dbError.message}`);
      }

      return data;
    },
    onSuccess: (_, { farmlandId }) => {
      toast({ title: 'Success', description: 'Soil report uploaded successfully!' });
      queryClient.invalidateQueries({ queryKey: ['soil-reports', farmlandId] });
      queryClient.invalidateQueries({ queryKey: ['soil-reports-latest', farmlandId] });
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });
};

export const useDeleteSoilReport = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ report }: { report: SoilTestReport }) => {
      // Delete from storage first
      const { error: storageError } = await supabase.storage
        .from('soil-reports')
        .remove([report.report_file_path]);

      if (storageError) {
        console.warn('Storage delete warning:', storageError);
      }

      // Delete from database
      const { error: dbError } = await supabase
        .from('soil_test_reports')
        .delete()
        .eq('id', report.id);

      if (dbError) {
        throw new Error(`Failed to delete report: ${dbError.message}`);
      }

      return report;
    },
    onSuccess: (report) => {
      toast({ title: 'Deleted', description: 'Soil report deleted successfully.' });
      queryClient.invalidateQueries({ queryKey: ['soil-reports', report.farmland_id] });
      queryClient.invalidateQueries({ queryKey: ['soil-reports-latest', report.farmland_id] });
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });
};

export const useSignedUrl = (filePath: string | null) => {
  return useQuery({
    queryKey: ['signed-url', filePath],
    queryFn: async () => {
      if (!filePath) return null;

      const { data, error } = await supabase.storage
        .from('soil-reports')
        .createSignedUrl(filePath, 600); // 10 minutes TTL

      if (error) throw error;
      return data.signedUrl;
    },
    enabled: !!filePath,
    staleTime: 5 * 60 * 1000, // Consider stale after 5 minutes
    gcTime: 9 * 60 * 1000, // Garbage collect after 9 minutes
  });
};
