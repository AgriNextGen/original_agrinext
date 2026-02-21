import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { CheckCircle, Camera, Mic, Loader2 } from 'lucide-react';
import { useUpdateTaskStatus } from '@/hooks/useAgentDashboard';
import { enqueueAction } from '@/lib/offlineQueue';
import { useToast } from '@/components/ui/use-toast';

interface TaskCompletionModalProps {
  open: boolean;
  onClose: () => void;
  taskId: string;
  farmerName?: string;
  taskType?: string;
}

export default function TaskCompletionModal({ open, onClose, taskId, farmerName, taskType }: TaskCompletionModalProps) {
  const [step, setStep] = useState(0);
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const updateTask = useUpdateTaskStatus();
  const { toast } = useToast();

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      await updateTask.mutateAsync({ taskId, status: 'completed', notes });
      toast({ title: 'Task completed' });
      resetAndClose();
    } catch (err) {
      enqueueAction('complete_task', { taskId, status: 'completed', notes });
      toast({ title: 'Saved offline', description: 'Will sync when network is available.' });
      resetAndClose();
    } finally {
      setSubmitting(false);
    }
  };

  const resetAndClose = () => {
    setStep(0);
    setNotes('');
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && resetAndClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-600" />
            Complete Task
          </DialogTitle>
        </DialogHeader>

        {farmerName && <p className="text-sm text-muted-foreground">Farmer: {farmerName} | Task: {taskType || 'General'}</p>}

        {/* Step indicators */}
        <div className="flex gap-2 mb-2">
          {[0, 1].map((s) => (
            <div key={s} className={`h-1 flex-1 rounded ${s <= step ? 'bg-green-500' : 'bg-muted'}`} />
          ))}
        </div>

        {step === 0 && (
          <div className="space-y-3">
            <div>
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="What did you observe? Any issues?"
                rows={4}
              />
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" disabled>
                <Camera className="h-4 w-4 mr-1" /> Photo (optional)
              </Button>
              <Button variant="outline" size="sm" disabled>
                <Mic className="h-4 w-4 mr-1" /> Voice note (optional)
              </Button>
            </div>
          </div>
        )}

        {step === 1 && (
          <div className="space-y-3">
            <p className="text-sm font-medium">Review & Submit</p>
            <div className="bg-muted/50 rounded p-3 text-sm space-y-1">
              <p><strong>Status:</strong> Completed</p>
              <p><strong>Notes:</strong> {notes || '(none)'}</p>
            </div>
          </div>
        )}

        <DialogFooter>
          {step === 0 && (
            <>
              <Button variant="outline" onClick={resetAndClose}>Cancel</Button>
              <Button onClick={() => setStep(1)}>Next</Button>
            </>
          )}
          {step === 1 && (
            <>
              <Button variant="outline" onClick={() => setStep(0)}>Back</Button>
              <Button onClick={handleSubmit} disabled={submitting}>
                {submitting && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
                Submit
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
