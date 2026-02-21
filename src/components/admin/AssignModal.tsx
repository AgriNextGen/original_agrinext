import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import AdminAutocomplete from './AdminAutocomplete';
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/components/ui/use-toast';

export default function AssignModal({ open, onClose, disputeId, onAssigned }: { open: boolean; onClose: () => void; disputeId: string | null; onAssigned?: () => void }) {
  const [selectedAdmin, setSelectedAdmin] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleAssign = async () => {
    if (!disputeId || !selectedAdmin) return;
    setLoading(true);
    try {
      const { error } = await supabase.rpc('admin.assign_dispute_v1', { p_dispute_id: disputeId, p_admin_id: selectedAdmin });
      if (error) throw error;
      toast({ title: 'Assigned' });
      onAssigned && onAssigned();
      onClose();
    } catch (e:any) {
      console.error(e);
      toast({ title: 'Failed to assign', description: e?.message || String(e) });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Assign Dispute</DialogTitle>
        </DialogHeader>
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">Select admin to assign this dispute to.</p>
          <AdminAutocomplete onSelect={(uid) => setSelectedAdmin(uid)} placeholder="Type admin name..." />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={loading}>Cancel</Button>
          <Button onClick={handleAssign} disabled={!selectedAdmin || loading}>{loading ? 'Assigning...' : 'Assign'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

