import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Upload, ChevronDown, FileImage, FileText, Loader2 } from 'lucide-react';
import { useUploadSoilReport, SoilReportFormData } from '@/hooks/useSoilReports';
import { toast } from 'sonner';
import imageCompression from 'browser-image-compression';
import { FILE_SIZE_LIMITS, validateFileSize, isImageFile, isPdfFile, getErrorMessage, createRetryAction } from '@/lib/error-utils';

interface SoilReportUploadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  farmlandId: string;
  farmlandName: string;
}

export default function SoilReportUploadDialog({
  open,
  onOpenChange,
  farmlandId,
  farmlandName,
}: SoilReportUploadDialogProps) {
  const uploadMutation = useUploadSoilReport();
  const [file, setFile] = useState<File | null>(null);
  const [showOptionalFields, setShowOptionalFields] = useState(false);
  const [isCompressing, setIsCompressing] = useState(false);
  const [formData, setFormData] = useState<SoilReportFormData>({
    report_date: new Date().toISOString().split('T')[0],
    lab_name: '',
    notes: '',
    ph: null,
    ec: null,
    organic_carbon: null,
    nitrogen: null,
    phosphorus: null,
    potassium: null,
  });

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    const isImage = isImageFile(selectedFile);
    const isPdf = isPdfFile(selectedFile);
    
    if (!isImage && !isPdf) {
      toast.error('Please select an image or PDF file');
      return;
    }

    // Validate file size based on type
    if (isPdf) {
      const validation = validateFileSize(selectedFile, FILE_SIZE_LIMITS.PDF_MAX_MB);
      if (!validation.valid) {
        toast.error(validation.message);
        return;
      }
      setFile(selectedFile);
    } else if (isImage) {
      const validation = validateFileSize(selectedFile, FILE_SIZE_LIMITS.IMAGE_MAX_MB);
      if (!validation.valid) {
        toast.error(validation.message);
        return;
      }

      // Compress if needed
      let processedFile = selectedFile;
      const sizeMB = selectedFile.size / (1024 * 1024);
      
      if (sizeMB > FILE_SIZE_LIMITS.IMAGE_COMPRESS_TARGET_MB) {
        setIsCompressing(true);
        try {
          processedFile = await imageCompression(selectedFile, {
            maxSizeMB: FILE_SIZE_LIMITS.IMAGE_COMPRESS_TARGET_MB,
            maxWidthOrHeight: 1920,
            useWebWorker: true,
          });
          const compressedSizeMB = processedFile.size / (1024 * 1024);
          console.log(`Image compressed: ${sizeMB.toFixed(2)}MB → ${compressedSizeMB.toFixed(2)}MB`);
        } catch (error) {
          console.error('Compression failed:', error);
          toast.error('Failed to compress image. Please try a smaller file.');
          setIsCompressing(false);
          return;
        }
        setIsCompressing(false);
      }
      setFile(processedFile);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      toast.error('Please select a file to upload');
      return;
    }

    try {
      await uploadMutation.mutateAsync({
        farmlandId,
        file,
        formData,
      });

      // Reset form on success
      setFile(null);
      setFormData({
        report_date: new Date().toISOString().split('T')[0],
        lab_name: '',
        notes: '',
        ph: null,
        ec: null,
        organic_carbon: null,
        nitrogen: null,
        phosphorus: null,
        potassium: null,
      });
      setShowOptionalFields(false);
      onOpenChange(false);
    } catch (error) {
      const message = getErrorMessage(error);
      toast.error(`Upload failed: ${message}`, {
        action: createRetryAction(() => handleSubmit(e)),
      });
    }
  };

  const handleNumericChange = (field: keyof SoilReportFormData, value: string) => {
    const numValue = value === '' ? null : parseFloat(value);
    setFormData({ ...formData, [field]: numValue });
  };

  const isLoading = uploadMutation.isPending || isCompressing;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Upload Soil Report</DialogTitle>
          <DialogDescription>
            Add a soil test report for {farmlandName}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Report Date */}
          <div>
            <Label htmlFor="report_date">Report Date *</Label>
            <Input
              id="report_date"
              type="date"
              value={formData.report_date}
              onChange={(e) => setFormData({ ...formData, report_date: e.target.value })}
              required
              disabled={isLoading}
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
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setFile(null)}
                    disabled={isLoading}
                  >
                    Change
                  </Button>
                </div>
              ) : (
                <label className="flex flex-col items-center justify-center p-6 border-2 border-dashed rounded-lg cursor-pointer hover:bg-muted/30 transition-colors">
                  {isCompressing ? (
                    <Loader2 className="h-8 w-8 text-muted-foreground mb-2 animate-spin" />
                  ) : (
                    <Upload className="h-8 w-8 text-muted-foreground mb-2" />
                  )}
                  <span className="text-sm text-muted-foreground">
                    {isCompressing ? 'Compressing image...' : 'Click to upload or drag & drop'}
                  </span>
                  <span className="text-xs text-muted-foreground mt-1">
                    Images: max {FILE_SIZE_LIMITS.IMAGE_MAX_MB}MB • PDF: max {FILE_SIZE_LIMITS.PDF_MAX_MB}MB
                  </span>
                  <input
                    type="file"
                    className="hidden"
                    accept="image/jpeg,image/jpg,image/png,image/webp,application/pdf"
                    onChange={handleFileChange}
                    disabled={isLoading}
                  />
                </label>
              )}
            </div>
          </div>

          {/* Lab Name */}
          <div>
            <Label htmlFor="lab_name">Lab Name (optional)</Label>
            <Input
              id="lab_name"
              value={formData.lab_name}
              onChange={(e) => setFormData({ ...formData, lab_name: e.target.value })}
              placeholder="e.g., Krishi Vigyan Kendra"
              disabled={isLoading}
            />
          </div>

          {/* Notes */}
          <div>
            <Label htmlFor="notes">Notes (optional)</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Any additional notes about this report..."
              rows={2}
              disabled={isLoading}
            />
          </div>

          {/* Optional Numeric Fields */}
          <Collapsible open={showOptionalFields} onOpenChange={setShowOptionalFields}>
            <CollapsibleTrigger asChild>
              <Button type="button" variant="ghost" size="sm" className="w-full justify-between" disabled={isLoading}>
                <span>Add Soil Values (optional)</span>
                <ChevronDown className={`h-4 w-4 transition-transform ${showOptionalFields ? 'rotate-180' : ''}`} />
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-3 pt-2">
              <p className="text-xs text-muted-foreground">
                Enter values from your report for trend tracking
              </p>
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
                    disabled={isLoading}
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
                    disabled={isLoading}
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
                    disabled={isLoading}
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
                    disabled={isLoading}
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
                    disabled={isLoading}
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
                    disabled={isLoading}
                  />
                </div>
              </div>
            </CollapsibleContent>
          </Collapsible>

          <Button type="submit" className="w-full" disabled={isLoading || !file}>
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                {isCompressing ? 'Compressing...' : 'Uploading...'}
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