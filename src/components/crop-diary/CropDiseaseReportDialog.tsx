import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { AlertTriangle, Camera, X } from 'lucide-react';
import { useReportDisease } from '@/hooks/useCropDiary';

interface CropDiseaseReportDialogProps {
  cropId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const CropDiseaseReportDialog = ({ cropId, open, onOpenChange }: CropDiseaseReportDialogProps) => {
  const [notes, setNotes] = useState('');
  const [severity, setSeverity] = useState<'low' | 'medium' | 'high'>('medium');
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);

  const reportMutation = useReportDisease();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      const reader = new FileReader();
      reader.onloadend = () => setPreview(reader.result as string);
      reader.readAsDataURL(selectedFile);
    }
  };

  const clearFile = () => {
    setFile(null);
    setPreview(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!notes.trim()) return;

    await reportMutation.mutateAsync({
      cropId,
      notes,
      severity,
      file: file || undefined,
    });

    setNotes('');
    setSeverity('medium');
    setFile(null);
    setPreview(null);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5" />
            Report Disease
          </DialogTitle>
          <DialogDescription>
            Describe the symptoms you're observing. Optionally add a photo for reference.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label>Symptoms / Issue Description *</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Describe what you're seeing... (e.g., yellow leaves, spots, wilting)"
              rows={4}
              required
            />
          </div>

          <div>
            <Label className="mb-3 block">Severity</Label>
            <RadioGroup
              value={severity}
              onValueChange={(v) => setSeverity(v as 'low' | 'medium' | 'high')}
              className="flex gap-4"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="low" id="low" />
                <Label htmlFor="low" className="font-normal cursor-pointer">
                  <span className="px-2 py-1 rounded bg-yellow-100 text-yellow-800 text-sm">Low</span>
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="medium" id="medium" />
                <Label htmlFor="medium" className="font-normal cursor-pointer">
                  <span className="px-2 py-1 rounded bg-orange-100 text-orange-800 text-sm">Medium</span>
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="high" id="high" />
                <Label htmlFor="high" className="font-normal cursor-pointer">
                  <span className="px-2 py-1 rounded bg-red-100 text-red-800 text-sm">High</span>
                </Label>
              </div>
            </RadioGroup>
          </div>

          <div>
            <Label className="mb-2 block">Photo (Optional)</Label>
            {!preview ? (
              <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-4 text-center">
                <input
                  type="file"
                  id="disease-photo"
                  accept="image/*"
                  capture="environment"
                  onChange={handleFileChange}
                  className="hidden"
                />
                <label
                  htmlFor="disease-photo"
                  className="cursor-pointer flex items-center justify-center gap-2 text-muted-foreground"
                >
                  <Camera className="h-5 w-5" />
                  <span>Add photo of issue</span>
                </label>
              </div>
            ) : (
              <div className="relative">
                <img
                  src={preview}
                  alt="Disease photo"
                  className="w-full h-32 object-cover rounded-lg"
                />
                <Button
                  type="button"
                  variant="secondary"
                  size="icon"
                  className="absolute top-2 right-2 h-6 w-6"
                  onClick={clearFile}
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            )}
          </div>

          <Button
            type="submit"
            variant="destructive"
            className="w-full"
            disabled={!notes.trim() || reportMutation.isPending}
          >
            {reportMutation.isPending ? 'Submitting...' : 'Submit Disease Report'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default CropDiseaseReportDialog;
