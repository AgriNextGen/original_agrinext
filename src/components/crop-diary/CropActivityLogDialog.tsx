import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ClipboardList, Droplets, Leaf, Bug, Scissors, Sparkles } from 'lucide-react';
import { useAddActivityLog, CropActivityLog } from '@/hooks/useCropDiary';

interface CropActivityLogDialogProps {
  cropId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const activityTypes: { value: CropActivityLog['activity_type']; label: string; icon: React.ReactNode }[] = [
  { value: 'fertilizer', label: 'Fertilizer', icon: <Leaf className="h-4 w-4" /> },
  { value: 'spray', label: 'Spray/Pesticide', icon: <Bug className="h-4 w-4" /> },
  { value: 'irrigation', label: 'Irrigation', icon: <Droplets className="h-4 w-4" /> },
  { value: 'weeding', label: 'Weeding', icon: <Scissors className="h-4 w-4" /> },
  { value: 'note', label: 'General Note', icon: <ClipboardList className="h-4 w-4" /> },
  { value: 'other', label: 'Other', icon: <Sparkles className="h-4 w-4" /> },
];

const CropActivityLogDialog = ({ cropId, open, onOpenChange }: CropActivityLogDialogProps) => {
  const [activityType, setActivityType] = useState<CropActivityLog['activity_type']>('note');
  const [notes, setNotes] = useState('');
  const [productName, setProductName] = useState('');
  const [dosage, setDosage] = useState('');
  const [cost, setCost] = useState('');

  const addLogMutation = useAddActivityLog();

  const showProductFields = ['fertilizer', 'spray'].includes(activityType);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const meta: Record<string, unknown> = {};
    if (productName) meta.product_name = productName;
    if (dosage) meta.dosage = dosage;
    if (cost) meta.cost = parseFloat(cost);

    await addLogMutation.mutateAsync({
      cropId,
      activityType,
      notes: notes || undefined,
      meta: Object.keys(meta).length > 0 ? meta : undefined,
    });

    setNotes('');
    setProductName('');
    setDosage('');
    setCost('');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ClipboardList className="h-5 w-5" />
            Log Activity
          </DialogTitle>
          <DialogDescription>
            Record an activity like fertilizer application, irrigation, or spraying.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label>Activity Type</Label>
            <Select value={activityType} onValueChange={(v) => setActivityType(v as CropActivityLog['activity_type'])}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {activityTypes.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    <div className="flex items-center gap-2">
                      {type.icon}
                      {type.label}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {showProductFields && (
            <>
              <div>
                <Label>Product Name</Label>
                <Input
                  value={productName}
                  onChange={(e) => setProductName(e.target.value)}
                  placeholder="e.g., Urea, NPK 20-20-20"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Dosage</Label>
                  <Input
                    value={dosage}
                    onChange={(e) => setDosage(e.target.value)}
                    placeholder="e.g., 50kg/acre"
                  />
                </div>
                <div>
                  <Label>Cost (₹)</Label>
                  <Input
                    type="number"
                    value={cost}
                    onChange={(e) => setCost(e.target.value)}
                    placeholder="e.g., 1500"
                  />
                </div>
              </div>
            </>
          )}

          <div>
            <Label>Notes</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add any details..."
              rows={3}
            />
          </div>

          <Button
            type="submit"
            className="w-full"
            disabled={addLogMutation.isPending}
          >
            {addLogMutation.isPending ? 'Saving...' : 'Save Activity'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default CropActivityLogDialog;
