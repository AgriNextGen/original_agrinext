import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { AlertTriangle, Loader2 } from 'lucide-react';
import { useUpdateTripStatusSecure } from '@/hooks/useTrips';

interface IssueReportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tripId: string;
  onSuccess?: () => void;
}

const issueTypes = [
  { value: 'farmer_unavailable', label: 'Farmer not available' },
  { value: 'wrong_quantity', label: 'Wrong quantity/quality' },
  { value: 'road_block', label: 'Road blocked/inaccessible' },
  { value: 'vehicle_problem', label: 'Vehicle breakdown' },
  { value: 'weather', label: 'Bad weather' },
  { value: 'other', label: 'Other issue' },
];

export default function IssueReportDialog({
  open,
  onOpenChange,
  tripId,
  onSuccess,
}: IssueReportDialogProps) {
  const [issueCode, setIssueCode] = useState('');
  const [issueNotes, setIssueNotes] = useState('');

  const updateStatus = useUpdateTripStatusSecure();

  const handleSubmit = async () => {
    if (!issueCode) return;

    try {
      await updateStatus.mutateAsync({
        tripId,
        newStatus: 'issue',
        issueCode,
        issueNotes: issueNotes || undefined,
      });

      setIssueCode('');
      setIssueNotes('');
      onOpenChange(false);
      onSuccess?.();
    } catch (error) {
      // Error handled by mutation
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-amber-600">
            <AlertTriangle className="h-5 w-5" />
            Report Issue
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-3">
            <Label>What's the issue?</Label>
            <RadioGroup value={issueCode} onValueChange={setIssueCode}>
              {issueTypes.map((type) => (
                <div key={type.value} className="flex items-center space-x-3">
                  <RadioGroupItem value={type.value} id={type.value} />
                  <Label htmlFor={type.value} className="font-normal cursor-pointer">
                    {type.label}
                  </Label>
                </div>
              ))}
            </RadioGroup>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Additional Details</Label>
            <Textarea
              id="notes"
              placeholder="Describe the issue in detail..."
              value={issueNotes}
              onChange={(e) => setIssueNotes(e.target.value)}
              rows={3}
            />
          </div>

          <p className="text-xs text-muted-foreground">
            The farmer and admin will be notified about this issue.
          </p>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleSubmit}
            disabled={!issueCode || updateStatus.isPending}
          >
            {updateStatus.isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Reporting...
              </>
            ) : (
              'Report Issue'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
