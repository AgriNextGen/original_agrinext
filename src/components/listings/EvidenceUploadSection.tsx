import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Camera, FileText, Upload, Loader2, Eye, EyeOff, ImagePlus, ScrollText } from 'lucide-react';
import { useListingAttachments, useUploadTraceAttachment, useToggleAttachmentVisibility, TraceAttachment } from '@/hooks/useTraceability';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

interface EvidenceUploadSectionProps {
  listingId: string;
  cropId?: string | null;
}

const TAG_LABELS: Record<string, string> = {
  stage_photo: 'Crop Stage Photo',
  input_proof: 'Input/Fertilizer Proof',
  soil_report: 'Soil Report',
};

const EvidenceUploadSection = ({ listingId, cropId }: EvidenceUploadSectionProps) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { data: attachments = [], isLoading } = useListingAttachments(listingId);
  const uploadMutation = useUploadTraceAttachment();
  const toggleVisibility = useToggleAttachmentVisibility();
  const [uploadingTag, setUploadingTag] = useState<string | null>(null);
  const [showDiaryPicker, setShowDiaryPicker] = useState(false);
  const [showSoilPicker, setShowSoilPicker] = useState(false);
  const [selectedDiaryIds, setSelectedDiaryIds] = useState<Set<string>>(new Set());
  const [selectedSoilIds, setSelectedSoilIds] = useState<Set<string>>(new Set());
  const [linkingDiary, setLinkingDiary] = useState(false);
  const [linkingSoil, setLinkingSoil] = useState(false);

  // Fetch crop diary photos if crop is linked
  const { data: diaryPhotos = [] } = useQuery({
    queryKey: ['crop-diary-photos', cropId],
    queryFn: async () => {
      if (!cropId) return [];
      const { data, error } = await supabase
        .from('crop_media')
        .select('id, file_path, mime_type, caption, captured_at, tags')
        .eq('crop_id', cropId)
        .order('captured_at', { ascending: false })
        .limit(30);
      if (error) throw error;
      return data || [];
    },
    enabled: !!cropId,
  });

  // Fetch soil reports if crop is linked (via farmland)
  const { data: soilReports = [] } = useQuery({
    queryKey: ['soil-reports-for-listing', cropId],
    queryFn: async () => {
      if (!cropId) return [];
      // Get land_id from crop
      const { data: crop } = await supabase
        .from('crops')
        .select('land_id')
        .eq('id', cropId)
        .single();
      if (!crop?.land_id) return [];

      const { data, error } = await supabase
        .from('soil_test_reports')
        .select('id, report_file_path, report_file_type, lab_name, report_date, ph, nitrogen, phosphorus, potassium')
        .eq('farmland_id', crop.land_id)
        .order('report_date', { ascending: false })
        .limit(10);
      if (error) throw error;
      return data || [];
    },
    enabled: !!cropId,
  });

  // Already-linked diary IDs (to avoid duplicates)
  const linkedDiaryPaths = new Set(
    attachments
      .filter(a => a.owner_type === 'crop' || a.tag === 'stage_photo')
      .map(a => a.file_url)
  );

  const linkedSoilPaths = new Set(
    attachments
      .filter(a => a.tag === 'soil_report')
      .map(a => a.file_url)
  );

  const handleUpload = async (tag: string, accept: string) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = accept;
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      setUploadingTag(tag);
      try {
        await uploadMutation.mutateAsync({
          file,
          ownerType: 'listing',
          ownerId: listingId,
          tag,
          visibility: 'private',
        });
      } finally {
        setUploadingTag(null);
      }
    };
    input.click();
  };

  const handleToggle = (att: TraceAttachment) => {
    const newVis = att.visibility === 'public_on_qr' ? 'private' : 'public_on_qr';
    toggleVisibility.mutate({ id: att.id, visibility: newVis });
  };

  // Link selected diary photos as trace_attachments (copy path reference to traceability-media context)
  const handleLinkDiaryPhotos = async () => {
    if (!user || selectedDiaryIds.size === 0) return;
    setLinkingDiary(true);
    try {
      const selectedPhotos = diaryPhotos.filter(p => selectedDiaryIds.has(p.id));
      const rows = selectedPhotos.map(p => ({
        owner_type: 'listing',
        owner_id: listingId,
        file_url: p.file_path, // storage path in crop-media bucket
        file_type: p.mime_type?.startsWith('image') ? 'image' : 'pdf',
        tag: 'stage_photo',
        visibility: 'public_on_qr',
        notes: p.caption || null,
        uploaded_by: user.id,
        captured_at: p.captured_at || new Date().toISOString(),
      }));

      const { error } = await supabase.from('trace_attachments').insert(rows);
      if (error) throw error;

      queryClient.invalidateQueries({ queryKey: ['trace-attachments'] });
      toast.success(`${selectedPhotos.length} photo(s) linked to listing`);
      setSelectedDiaryIds(new Set());
      setShowDiaryPicker(false);
    } catch (err: any) {
      toast.error(`Failed to link photos: ${err.message}`);
    } finally {
      setLinkingDiary(false);
    }
  };

  // Link selected soil reports
  const handleLinkSoilReports = async () => {
    if (!user || selectedSoilIds.size === 0) return;
    setLinkingSoil(true);
    try {
      const selectedReports = soilReports.filter(r => selectedSoilIds.has(r.id));
      const rows = selectedReports.map(r => ({
        owner_type: 'listing',
        owner_id: listingId,
        file_url: r.report_file_path, // storage path in soil-reports bucket
        file_type: r.report_file_type === 'pdf' ? 'pdf' : 'image',
        tag: 'soil_report',
        visibility: 'public_on_qr',
        notes: r.lab_name ? `Lab: ${r.lab_name}` : null,
        uploaded_by: user.id,
        captured_at: r.report_date || new Date().toISOString(),
      }));

      const { error } = await supabase.from('trace_attachments').insert(rows);
      if (error) throw error;

      queryClient.invalidateQueries({ queryKey: ['trace-attachments'] });
      toast.success(`${selectedReports.length} report(s) linked to listing`);
      setSelectedSoilIds(new Set());
      setShowSoilPicker(false);
    } catch (err: any) {
      toast.error(`Failed to link reports: ${err.message}`);
    } finally {
      setLinkingSoil(false);
    }
  };

  const toggleDiarySelection = (id: string) => {
    setSelectedDiaryIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleSoilSelection = (id: string) => {
    setSelectedSoilIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  // Get signed URL for preview (crop-media bucket)
  const getCropMediaUrl = (path: string) => {
    const { data } = supabase.storage.from('crop-media').getPublicUrl(path);
    return data?.publicUrl || '';
  };

  return (
    <div className="space-y-4 p-4 rounded-lg border border-border bg-muted/20">
      <div className="flex items-center gap-2">
        <Camera className="h-4 w-4 text-primary" />
        <Label className="text-sm font-medium">Evidence Attachments (Optional)</Label>
      </div>
      <p className="text-xs text-muted-foreground">
        Add photos/reports and control which appear on the public QR page
      </p>

      {/* Upload + Pick buttons */}
      <div className="flex flex-wrap gap-2">
        <Button
          type="button" variant="outline" size="sm" className="gap-2"
          disabled={uploadingTag === 'stage_photo'}
          onClick={() => handleUpload('stage_photo', 'image/*')}
        >
          {uploadingTag === 'stage_photo' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
          Upload Photo
        </Button>
        <Button
          type="button" variant="outline" size="sm" className="gap-2"
          disabled={uploadingTag === 'input_proof'}
          onClick={() => handleUpload('input_proof', 'image/*')}
        >
          {uploadingTag === 'input_proof' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
          Input Proof
        </Button>
        <Button
          type="button" variant="outline" size="sm" className="gap-2"
          disabled={uploadingTag === 'soil_report'}
          onClick={() => handleUpload('soil_report', 'application/pdf,image/*')}
        >
          {uploadingTag === 'soil_report' ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
          Upload Report
        </Button>
      </div>

      {/* Crop Diary Photo Picker */}
      {cropId && diaryPhotos.length > 0 && (
        <div className="space-y-2">
          <Button
            type="button" variant="secondary" size="sm" className="gap-2 w-full"
            onClick={() => setShowDiaryPicker(!showDiaryPicker)}
          >
            <ImagePlus className="h-4 w-4" />
            Pick from Crop Diary ({diaryPhotos.length} photos)
          </Button>

          {showDiaryPicker && (
            <div className="space-y-2 p-3 border border-border rounded-lg bg-background">
              <div className="grid grid-cols-3 gap-2 max-h-48 overflow-y-auto">
                {diaryPhotos.map(photo => {
                  const alreadyLinked = linkedDiaryPaths.has(photo.file_path);
                  const selected = selectedDiaryIds.has(photo.id);
                  return (
                    <div
                      key={photo.id}
                      className={`relative rounded-md overflow-hidden border-2 cursor-pointer transition-colors ${
                        alreadyLinked ? 'border-muted opacity-50 cursor-not-allowed' :
                        selected ? 'border-primary' : 'border-border hover:border-primary/50'
                      }`}
                      onClick={() => !alreadyLinked && toggleDiarySelection(photo.id)}
                    >
                      <img
                        src={getCropMediaUrl(photo.file_path)}
                        alt={photo.caption || 'Crop photo'}
                        className="w-full h-20 object-cover"
                      />
                      {alreadyLinked && (
                        <div className="absolute inset-0 flex items-center justify-center bg-background/60">
                          <Badge variant="secondary" className="text-[10px]">Linked</Badge>
                        </div>
                      )}
                      {selected && (
                        <div className="absolute top-1 right-1">
                          <Checkbox checked className="h-4 w-4" />
                        </div>
                      )}
                      {photo.captured_at && (
                        <p className="text-[9px] text-muted-foreground p-0.5 truncate">
                          {new Date(photo.captured_at).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
              {selectedDiaryIds.size > 0 && (
                <Button
                  type="button" size="sm" className="w-full gap-2"
                  disabled={linkingDiary}
                  onClick={handleLinkDiaryPhotos}
                >
                  {linkingDiary ? <Loader2 className="h-4 w-4 animate-spin" /> : <Eye className="h-4 w-4" />}
                  Link {selectedDiaryIds.size} Photo(s) to QR Page
                </Button>
              )}
            </div>
          )}
        </div>
      )}

      {/* Soil Report Picker */}
      {cropId && soilReports.length > 0 && (
        <div className="space-y-2">
          <Button
            type="button" variant="secondary" size="sm" className="gap-2 w-full"
            onClick={() => setShowSoilPicker(!showSoilPicker)}
          >
            <ScrollText className="h-4 w-4" />
            Pick Soil Reports ({soilReports.length} available)
          </Button>

          {showSoilPicker && (
            <div className="space-y-2 p-3 border border-border rounded-lg bg-background">
              {soilReports.map(report => {
                const alreadyLinked = linkedSoilPaths.has(report.report_file_path);
                const selected = selectedSoilIds.has(report.id);
                return (
                  <div
                    key={report.id}
                    className={`flex items-center gap-3 p-2 rounded-md border-2 cursor-pointer transition-colors ${
                      alreadyLinked ? 'border-muted opacity-50 cursor-not-allowed' :
                      selected ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'
                    }`}
                    onClick={() => !alreadyLinked && toggleSoilSelection(report.id)}
                  >
                    <FileText className="h-5 w-5 text-muted-foreground shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium">
                        {report.lab_name || 'Soil Report'} — {new Date(report.report_date).toLocaleDateString()}
                      </p>
                      <p className="text-[10px] text-muted-foreground">
                        {[
                          report.ph && `pH: ${report.ph}`,
                          report.nitrogen && `N: ${report.nitrogen}`,
                          report.phosphorus && `P: ${report.phosphorus}`,
                          report.potassium && `K: ${report.potassium}`,
                        ].filter(Boolean).join(' | ') || 'No details'}
                      </p>
                    </div>
                    {alreadyLinked ? (
                      <Badge variant="secondary" className="text-[10px] shrink-0">Linked</Badge>
                    ) : (
                      <Checkbox checked={selected} className="shrink-0" />
                    )}
                  </div>
                );
              })}
              {selectedSoilIds.size > 0 && (
                <Button
                  type="button" size="sm" className="w-full gap-2"
                  disabled={linkingSoil}
                  onClick={handleLinkSoilReports}
                >
                  {linkingSoil ? <Loader2 className="h-4 w-4 animate-spin" /> : <Eye className="h-4 w-4" />}
                  Link {selectedSoilIds.size} Report(s) to QR Page
                </Button>
              )}
            </div>
          )}
        </div>
      )}

      {/* Existing attachments */}
      {isLoading ? (
        <p className="text-xs text-muted-foreground">Loading attachments...</p>
      ) : attachments.length === 0 ? (
        <p className="text-xs text-muted-foreground italic">No evidence uploaded yet</p>
      ) : (
        <div className="space-y-2">
          {attachments.map((att) => (
            <div key={att.id} className="flex items-center gap-3 p-2 rounded-md bg-background border border-border">
              {att.file_type === 'image' ? (
                <Camera className="h-4 w-4 text-muted-foreground shrink-0" />
              ) : (
                <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
              )}
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium truncate">{TAG_LABELS[att.tag] || att.tag}</p>
                <p className="text-xs text-muted-foreground">
                  {new Date(att.created_at).toLocaleDateString()}
                </p>
              </div>
              <Badge
                variant={att.visibility === 'public_on_qr' ? 'default' : 'secondary'}
                className="text-xs cursor-pointer shrink-0"
                onClick={() => handleToggle(att)}
              >
                {att.visibility === 'public_on_qr' ? (
                  <><Eye className="h-3 w-3 mr-1" />On QR</>
                ) : (
                  <><EyeOff className="h-3 w-3 mr-1" />Private</>
                )}
              </Badge>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default EvidenceUploadSection;