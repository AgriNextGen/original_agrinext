import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Camera, Upload, X, Loader2, MapPin, CheckCircle2 } from 'lucide-react';
import { useUploadCropMedia } from '@/hooks/useCropDiary';
import { toast } from 'sonner';
import imageCompression from 'browser-image-compression';
import { FILE_SIZE_LIMITS, validateFileSize, isImageFile, getErrorMessage, createRetryAction } from '@/lib/error-utils';
import { useGeoCapture } from '@/hooks/useGeoCapture';

interface CropPhotoUploadDialogProps {
  cropId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const CropPhotoUploadDialog = ({ cropId, open, onOpenChange }: CropPhotoUploadDialogProps) => {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [caption, setCaption] = useState('');
  const [monthTag, setMonthTag] = useState('');
  const [isCompressing, setIsCompressing] = useState(false);
  const geo = useGeoCapture();

  const uploadMutation = useUploadCropMedia();

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    if (!isImageFile(selectedFile)) {
      toast.error('Please select an image file (JPG, PNG, WebP)');
      return;
    }

    const validation = validateFileSize(selectedFile, FILE_SIZE_LIMITS.IMAGE_MAX_MB);
    if (!validation.valid) {
      toast.error(validation.message);
      return;
    }

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
      } catch (error) {
        console.error('Compression failed:', error);
        toast.error('Failed to compress image. Please try a smaller file.');
        setIsCompressing(false);
        return;
      }
      setIsCompressing(false);
    }

    setFile(processedFile);
    const reader = new FileReader();
    reader.onloadend = () => setPreview(reader.result as string);
    reader.readAsDataURL(processedFile);

    // Auto-capture GPS when photo is selected
    if (!geo.position) {
      geo.capture();
    }
  };

  const clearFile = () => {
    setFile(null);
    setPreview(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return;

    const tags: string[] = [];
    if (monthTag) tags.push(monthTag);

    try {
      await uploadMutation.mutateAsync({
        cropId,
        file,
        caption: caption || undefined,
        tags: tags.length > 0 ? tags : undefined,
        latitude: geo.position?.latitude,
        longitude: geo.position?.longitude,
      });

      setFile(null);
      setPreview(null);
      setCaption('');
      setMonthTag('');
      geo.clear();
      onOpenChange(false);
    } catch (error) {
      const message = getErrorMessage(error);
      toast.error(`Upload failed: ${message}`, {
        action: createRetryAction(() => handleSubmit(e)),
      });
    }
  };

  const isLoading = uploadMutation.isPending || isCompressing;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Camera className="h-5 w-5" />
            Upload Crop Photo
          </DialogTitle>
          <DialogDescription>
            Capture or upload a photo of your crop to track its progress.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {!preview ? (
            <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-8 text-center">
              <input
                type="file"
                id="photo-upload"
                accept="image/*"
                capture="environment"
                onChange={handleFileChange}
                className="hidden"
                disabled={isLoading}
              />
              <label
                htmlFor="photo-upload"
                className="cursor-pointer flex flex-col items-center gap-3"
              >
                <div className="p-4 rounded-full bg-primary/10">
                  {isCompressing ? (
                    <Loader2 className="h-8 w-8 text-primary animate-spin" />
                  ) : (
                    <Camera className="h-8 w-8 text-primary" />
                  )}
                </div>
                <div>
                  <p className="font-medium">
                    {isCompressing ? 'Compressing...' : 'Take Photo or Upload'}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {isCompressing 
                      ? 'Optimizing image for upload' 
                      : 'Tap to open camera or select from gallery'}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Max {FILE_SIZE_LIMITS.IMAGE_MAX_MB}MB • Auto-compressed to {FILE_SIZE_LIMITS.IMAGE_COMPRESS_TARGET_MB}MB
                  </p>
                </div>
              </label>
            </div>
          ) : (
            <div className="relative">
              <img
                src={preview}
                alt="Preview"
                className="w-full h-48 object-cover rounded-lg"
              />
              <Button
                type="button"
                variant="secondary"
                size="icon"
                className="absolute top-2 right-2"
                onClick={clearFile}
                disabled={isLoading}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          )}

          {/* Geo status indicator */}
          {file && (
            <div className="flex items-center gap-2 text-xs px-1">
              {geo.capturing ? (
                <span className="text-muted-foreground flex items-center gap-1">
                  <Loader2 className="h-3 w-3 animate-spin" /> Capturing location...
                </span>
              ) : geo.position ? (
                <span className="text-green-600 flex items-center gap-1">
                  <CheckCircle2 className="h-3 w-3" /> 📍 Geo-tagged
                </span>
              ) : (
                <button
                  type="button"
                  onClick={() => geo.capture()}
                  className="text-muted-foreground hover:text-foreground flex items-center gap-1"
                >
                  <MapPin className="h-3 w-3" /> Add location (optional)
                </button>
              )}
            </div>
          )}

          <div>
            <Label>Caption (Optional)</Label>
            <Input
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              placeholder="Describe what's happening..."
              disabled={isLoading}
            />
          </div>

          <div>
            <Label>Month Tag (Optional)</Label>
            <Select value={monthTag} onValueChange={setMonthTag} disabled={isLoading}>
              <SelectTrigger>
                <SelectValue placeholder="Select month..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="month_1">Month 1</SelectItem>
                <SelectItem value="month_2">Month 2</SelectItem>
                <SelectItem value="month_3">Month 3</SelectItem>
                <SelectItem value="month_4">Month 4</SelectItem>
                <SelectItem value="month_5">Month 5</SelectItem>
                <SelectItem value="month_6">Month 6</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Button
            type="submit"
            className="w-full"
            disabled={!file || isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                {isCompressing ? 'Compressing...' : 'Uploading...'}
              </>
            ) : (
              <>
                <Upload className="h-4 w-4 mr-2" />
                Upload Photo
              </>
            )}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default CropPhotoUploadDialog;
