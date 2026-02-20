import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Upload, ChevronDown, FileImage, FileText, Loader2, ShieldCheck } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { signAndUpload } from '@/lib/storage-upload';

interface AgentSoilReportUploadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  farmers: Array<{ id: string; full_name: string | null }>;
  preselectedFarmerId?: string;
}

interface Farmland {
  id: string;
  name: string;
  farmer_id: string;
}

interface FormData {
  farmer_id: string;
  farmland_id: string;
  report_date: string;
  lab_name: string;
  notes: string;
  consent_captured: boolean;
  consent_note: string;
  ph: number | null;
  ec: number | null;
  organic_carbon: number | null;
  nitrogen: number | null;
  phosphorus: number | null;
  potassium: number | null;
}

export default function AgentSoilReportUploadDialog({
  open,
  onOpenChange,
  farmers,
  preselectedFarmerId,
}: AgentSoilReportUploadDialogProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [isUploading, setIsUploading] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [showOptionalFields, setShowOptionalFields] = useState(false);
  const [farmlands, setFarmlands] = useState<Farmland[]>([]);
  const [loadingFarmlands, setLoadingFarmlands] = useState(false);
  
  const [formData, setFormData] = useState<FormData>({
    farmer_id: preselectedFarmerId || '',
    farmland_id: '',
    report_date: new Date().toISOString().split('T')[0],
    lab_name: '',
    notes: '',
    consent_captured: false,
    consent_note: '',
    ph: null,
    ec: null,
    organic_carbon: null,
    nitrogen: null,
    phosphorus: null,
    potassium: null,
  });

  // Fetch farmlands when farmer changes
  useEffect(() => {
    if (formData.farmer_id) {
      setLoadingFarmlands(true);
      supabase
        .from('farmlands')
        .select('id, name, farmer_id')
        .eq('farmer_id', formData.farmer_id)
        .then(({ data, error }) => {
          if (!error && data) {
            setFarmlands(data);
          }
          setLoadingFarmlands(false);
        });
    } else {
      setFarmlands([]);
    }
  }, [formData.farmer_id]);

  // Reset form when dialog opens
  useEffect(() => {
    if (open) {
      setFormData({
        farmer_id: preselectedFarmerId || '',
        farmland_id: '',
        report_date: new Date().toISOString().split('T')[0],
        lab_name: '',
        notes: '',
        consent_captured: false,
        consent_note: '',
        ph: null,
        ec: null,
        organic_carbon: null,
        nitrogen: null,
        phosphorus: null,
        potassium: null,
      });
      setFile(null);
      setShowOptionalFields(false);
    }
  }, [open, preselectedFarmerId]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      const isImage = selectedFile.type.startsWith('image/');
      const isPdf = selectedFile.type === 'application/pdf';
      if (!isImage && !isPdf) {
        toast({ title: 'Error', description: 'Please select an image or PDF file', variant: 'destructive' });
        return;
      }
      setFile(selectedFile);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user?.id) {
      toast({ title: 'Error', description: 'Not authenticated', variant: 'destructive' });
      return;
    }
    
    if (!file) {
      toast({ title: 'Error', description: 'Please select a file to upload', variant: 'destructive' });
      return;
    }
    
    if (!formData.consent_captured) {
      toast({ title: 'Error', description: 'Farmer consent is required', variant: 'destructive' });
      return;
    }

    setIsUploading(true);
    
    try {
      // Determine file type
      const isImage = file.type.startsWith('image/');

      // Upload via signed URL
      const filePath = await signAndUpload(file, {
        bucket: 'soil-reports',
        contentType: file.type,
        sizeBytes: file.size,
        entity: { type: 'soil_report', id: formData.farmland_id },
      });

      // Insert database record
      const { error: dbError } = await supabase
        .from('soil_test_reports')
        .insert({
          farmland_id: formData.farmland_id,
          farmer_id: formData.farmer_id,
          uploaded_by: user.id,
          source_role: 'agent',
          report_date: formData.report_date,
          lab_name: formData.lab_name || null,
          report_file_path: filePath,
          report_file_type: isImage ? 'image' : 'pdf',
          report_mime_type: file.type,
          notes: formData.notes || null,
          consent_captured: formData.consent_captured,
          consent_note: formData.consent_note || null,
          consent_at: new Date().toISOString(),
          ph: formData.ph ?? null,
          ec: formData.ec ?? null,
          organic_carbon: formData.organic_carbon ?? null,
          nitrogen: formData.nitrogen ?? null,
          phosphorus: formData.phosphorus ?? null,
          potassium: formData.potassium ?? null,
        });

      if (dbError) {
        // Cleanup uploaded file if DB insert fails
        await supabase.storage.from('soil-reports').remove([filePath]);
        throw new Error(`Failed to save report: ${dbError.message}`);
      }

      toast({ title: 'Success', description: 'Soil report uploaded successfully!' });
      queryClient.invalidateQueries({ queryKey: ['soil-reports', formData.farmland_id] });
      onOpenChange(false);
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } finally {
      setIsUploading(false);
    }
  };

  const handleNumericChange = (field: keyof FormData, value: string) => {
    const numValue = value === '' ? null : parseFloat(value);
    setFormData({ ...formData, [field]: numValue });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Upload Soil Report (Agent)</DialogTitle>
          <DialogDescription>
            Upload a soil test report during a farm visit
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Farmer Selection */}
          <div>
            <Label>Farmer *</Label>
            <Select 
              value={formData.farmer_id} 
              onValueChange={(v) => setFormData({ ...formData, farmer_id: v, farmland_id: '' })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select farmer" />
              </SelectTrigger>
              <SelectContent>
                {farmers.map((farmer) => (
                  <SelectItem key={farmer.id} value={farmer.id}>
                    {farmer.full_name || 'Unknown Farmer'}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Farmland Selection */}
          <div>
            <Label>Farmland *</Label>
            <Select 
              value={formData.farmland_id} 
              onValueChange={(v) => setFormData({ ...formData, farmland_id: v })}
              disabled={!formData.farmer_id || loadingFarmlands}
            >
              <SelectTrigger>
                <SelectValue placeholder={loadingFarmlands ? 'Loading...' : 'Select farmland'} />
              </SelectTrigger>
              <SelectContent>
                {farmlands.map((land) => (
                  <SelectItem key={land.id} value={land.id}>
                    {land.name}
                  </SelectItem>
                ))}
                {farmlands.length === 0 && !loadingFarmlands && formData.farmer_id && (
                  <div className="p-2 text-sm text-muted-foreground">No farmlands found</div>
                )}
              </SelectContent>
            </Select>
          </div>

          {/* Report Date */}
          <div>
            <Label htmlFor="report_date">Report Date *</Label>
            <Input
              id="report_date"
              type="date"
              value={formData.report_date}
              onChange={(e) => setFormData({ ...formData, report_date: e.target.value })}
              required
            />
          </div>

          {/* File Upload */}
          <div>
            <Label>Report File (Image/PDF) *</Label>
            <div className="mt-1">
              {file ? (
                <div className="flex items-center gap-2 p-3 border rounded-lg bg-muted/30">
                  {file.type.startsWith('image/') ? (
                    <FileImage className="h-5 w-5 text-primary" />
                  ) : (
                    <FileText className="h-5 w-5 text-primary" />
                  )}
                  <span className="flex-1 truncate text-sm">{file.name}</span>
                  <Button type="button" variant="ghost" size="sm" onClick={() => setFile(null)}>
                    Change
                  </Button>
                </div>
              ) : (
                <label className="flex flex-col items-center justify-center p-6 border-2 border-dashed rounded-lg cursor-pointer hover:bg-muted/30 transition-colors">
                  <Upload className="h-8 w-8 text-muted-foreground mb-2" />
                  <span className="text-sm text-muted-foreground">
                    Click to upload or drag & drop
                  </span>
                  <input
                    type="file"
                    className="hidden"
                    accept="image/jpeg,image/jpg,image/png,image/webp,application/pdf"
                    onChange={handleFileChange}
                  />
                </label>
              )}
            </div>
          </div>

          {/* Consent Section */}
          <div className="p-3 border rounded-lg bg-amber-50 dark:bg-amber-950/20">
            <div className="flex items-start gap-3">
              <Checkbox
                id="consent"
                checked={formData.consent_captured}
                onCheckedChange={(checked) => 
                  setFormData({ ...formData, consent_captured: checked === true })
                }
              />
              <div>
                <Label htmlFor="consent" className="font-medium flex items-center gap-1.5">
                  <ShieldCheck className="h-4 w-4 text-amber-600" />
                  Farmer Consent *
                </Label>
                <p className="text-xs text-muted-foreground mt-0.5">
                  I confirm that the farmer has given verbal/written consent to upload this report
                </p>
              </div>
            </div>
            {formData.consent_captured && (
              <div className="mt-3">
                <Input
                  placeholder="Optional: Note about consent (e.g., 'Verbal consent at farm visit')"
                  value={formData.consent_note}
                  onChange={(e) => setFormData({ ...formData, consent_note: e.target.value })}
                />
              </div>
            )}
          </div>

          {/* Lab Name */}
          <div>
            <Label htmlFor="lab_name">Lab Name (optional)</Label>
            <Input
              id="lab_name"
              value={formData.lab_name}
              onChange={(e) => setFormData({ ...formData, lab_name: e.target.value })}
              placeholder="e.g., Krishi Vigyan Kendra"
            />
          </div>

          {/* Notes */}
          <div>
            <Label htmlFor="notes">Notes (optional)</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Any additional notes..."
              rows={2}
            />
          </div>

          {/* Optional Numeric Fields */}
          <Collapsible open={showOptionalFields} onOpenChange={setShowOptionalFields}>
            <CollapsibleTrigger asChild>
              <Button type="button" variant="ghost" size="sm" className="w-full justify-between">
                <span>Add Soil Values (optional)</span>
                <ChevronDown className={`h-4 w-4 transition-transform ${showOptionalFields ? 'rotate-180' : ''}`} />
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-3 pt-2">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="ph" className="text-xs">pH</Label>
                  <Input
                    id="ph"
                    type="number"
                    step="0.1"
                    min="0"
                    max="14"
                    value={formData.ph ?? ''}
                    onChange={(e) => handleNumericChange('ph', e.target.value)}
                    placeholder="e.g., 6.5"
                  />
                </div>
                <div>
                  <Label htmlFor="ec" className="text-xs">EC (dS/m)</Label>
                  <Input
                    id="ec"
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.ec ?? ''}
                    onChange={(e) => handleNumericChange('ec', e.target.value)}
                    placeholder="e.g., 0.5"
                  />
                </div>
                <div>
                  <Label htmlFor="nitrogen" className="text-xs">Nitrogen (kg/ha)</Label>
                  <Input
                    id="nitrogen"
                    type="number"
                    step="0.1"
                    min="0"
                    value={formData.nitrogen ?? ''}
                    onChange={(e) => handleNumericChange('nitrogen', e.target.value)}
                    placeholder="e.g., 280"
                  />
                </div>
                <div>
                  <Label htmlFor="phosphorus" className="text-xs">Phosphorus (kg/ha)</Label>
                  <Input
                    id="phosphorus"
                    type="number"
                    step="0.1"
                    min="0"
                    value={formData.phosphorus ?? ''}
                    onChange={(e) => handleNumericChange('phosphorus', e.target.value)}
                    placeholder="e.g., 45"
                  />
                </div>
                <div>
                  <Label htmlFor="potassium" className="text-xs">Potassium (kg/ha)</Label>
                  <Input
                    id="potassium"
                    type="number"
                    step="0.1"
                    min="0"
                    value={formData.potassium ?? ''}
                    onChange={(e) => handleNumericChange('potassium', e.target.value)}
                    placeholder="e.g., 320"
                  />
                </div>
                <div>
                  <Label htmlFor="organic_carbon" className="text-xs">Organic Carbon (%)</Label>
                  <Input
                    id="organic_carbon"
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.organic_carbon ?? ''}
                    onChange={(e) => handleNumericChange('organic_carbon', e.target.value)}
                    placeholder="e.g., 0.75"
                  />
                </div>
              </div>
            </CollapsibleContent>
          </Collapsible>

          <Button 
            type="submit" 
            className="w-full" 
            disabled={isUploading || !file || !formData.farmer_id || !formData.farmland_id || !formData.consent_captured}
          >
            {isUploading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Uploading...
              </>
            ) : (
              <>
                <Upload className="h-4 w-4 mr-2" />
                Upload Report
              </>
            )}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
