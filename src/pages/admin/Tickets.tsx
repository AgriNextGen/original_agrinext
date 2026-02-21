import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import DashboardLayout from '@/layouts/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { CheckCircle, XCircle, User, Clock, Sparkles } from 'lucide-react';
import { useAdminTickets, useUpdateTicketStatus, useAssignTicket, type SupportTicket } from '@/hooks/useAdminTickets';
import { useLanguage } from '@/hooks/useLanguage';
import { useAiOutputs, useAcceptAiSuggestion, type AiOutput } from '@/hooks/useAiOutputs';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/components/ui/use-toast';

const STATUS_OPTIONS = ['open', 'in_progress', 'resolved', 'closed'];
const PRIORITY_OPTIONS = ['low', 'normal', 'high', 'urgent'];
const CATEGORY_OPTIONS = ['trip', 'order', 'listing', 'account', 'payment', 'kyc', 'other'];

const PRIORITY_COLORS: Record<string, string> = {
  urgent: 'bg-red-100 text-red-800',
  high: 'bg-orange-100 text-orange-800',
  normal: 'bg-blue-100 text-blue-800',
  low: 'bg-gray-100 text-gray-700',
};

export default function AdminTickets() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [statusFilter, setStatusFilter] = useState('open');
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);

  const filters = useMemo(() => {
    const f: Record<string, string> = {};
    if (statusFilter) f.status = statusFilter;
    return f;
  }, [statusFilter]);

  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading } = useAdminTickets(filters);
  const { t } = useLanguage();
  const updateStatus = useUpdateTicketStatus();
  const assignTicket = useAssignTicket();
  const acceptSuggestion = useAcceptAiSuggestion();

  // Fetch AI triage suggestions for the selected ticket
  const { data: aiData } = useAiOutputs({ target_type: 'ticket', status: 'suggested' });
  const allAiItems = aiData?.pages.flatMap((p) => p.items) ?? [];

  const tickets = data?.pages.flatMap((p) => p.items) ?? [];

  const getTriageForTicket = (ticketId: string): AiOutput | undefined => {
    return allAiItems.find((o) => o.target_id === ticketId);
  };

  const handleStatusUpdate = (ticketId: string, status: string) => {
    updateStatus.mutate({ ticketId, status, note: `Status changed to ${status}` }, {
      onSuccess: () => toast({ title: `Ticket ${status}` }),
    });
  };

  const handleAssignToMe = (ticketId: string) => {
    if (!user?.id) return;
    assignTicket.mutate({ ticketId, adminId: user.id }, {
      onSuccess: () => toast({ title: 'Ticket assigned to you' }),
    });
  };

  const handleAcceptTriage = (outputId: string, accept: boolean) => {
    acceptSuggestion.mutate({ outputId, accept }, {
      onSuccess: () => toast({ title: accept ? 'Suggestion accepted' : 'Suggestion rejected' }),
    });
  };

  return (
    <DashboardLayout>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Support Tickets</h1>
        </div>

        {/* Filters */}
        <div className="flex gap-2 flex-wrap">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-36"><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              {STATUS_OPTIONS.map((s) => <SelectItem key={s} value={s}>{s.replace(/_/g, ' ')}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        {/* List */}
        <div className="space-y-2">
          {isLoading && Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-20 w-full" />
          ))}

          {!isLoading && tickets.length === 0 && (
            <Card><CardContent className="py-12 text-center text-muted-foreground">No tickets found.</CardContent></Card>
          )}

          {tickets.map((tk) => {
            const triage = getTriageForTicket(tk.id);
            return (
              <Card key={tk.id} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setSelectedTicket(tk)}>
                <CardContent className="py-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <Badge variant="outline" className="text-xs">{tk.category}</Badge>
                        <Badge className={`text-xs ${PRIORITY_COLORS[tk.priority] || ''}`}>{tk.priority}</Badge>
                        <Badge variant="secondary" className="text-xs">{tk.status.replace(/_/g, ' ')}</Badge>
                        {triage && <Badge className="bg-purple-100 text-purple-800 text-xs"><Sparkles className="h-3 w-3 mr-1 inline" />AI triaged</Badge>}
                      </div>
                      <p className="text-sm truncate">{tk.message.slice(0, 120)}</p>
                      <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                        {tk.role && <span><User className="inline h-3 w-3 mr-0.5" />{tk.role}</span>}
                        <span><Clock className="inline h-3 w-3 mr-0.5" />{new Date(tk.created_at).toLocaleDateString()}</span>
                        {tk.assigned_admin && <span>Assigned: {tk.assigned_admin.slice(0, 8)}</span>}
                      </div>
                    </div>
                    <div className="flex gap-1">
                      {tk.status === 'open' && (
                        <Button size="sm" variant="outline" onClick={(e) => { e.stopPropagation(); handleStatusUpdate(tk.id, 'in_progress'); }}>
                          Start
                        </Button>
                      )}
                      {tk.status === 'in_progress' && (
                        <Button size="sm" variant="outline" onClick={(e) => { e.stopPropagation(); handleStatusUpdate(tk.id, 'resolved'); }}>
                          Resolve
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {hasNextPage && (
          <div className="text-center">
            <Button variant="outline" onClick={() => fetchNextPage()} disabled={isFetchingNextPage}>
              {isFetchingNextPage ? t('common.loading') : t('common.loadMore')}
            </Button>
          </div>
        )}

        {/* Ticket Detail Dialog */}
        <Dialog open={!!selectedTicket} onOpenChange={(o) => !o && setSelectedTicket(null)}>
          {selectedTicket && (
            <DialogContent className="sm:max-w-lg max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Ticket Detail</DialogTitle>
              </DialogHeader>
              <div className="space-y-3">
                <div className="flex gap-2 flex-wrap">
                  <Badge variant="outline">{selectedTicket.category}</Badge>
                  <Badge className={PRIORITY_COLORS[selectedTicket.priority] || ''}>{selectedTicket.priority}</Badge>
                  <Badge variant="secondary">{selectedTicket.status}</Badge>
                </div>
                <p className="text-sm">{selectedTicket.message}</p>
                <dl className="text-xs space-y-1 text-muted-foreground">
                  <div className="flex justify-between"><dt>Created by</dt><dd>{selectedTicket.created_by.slice(0, 8)}</dd></div>
                  <div className="flex justify-between"><dt>Role</dt><dd>{selectedTicket.role || '—'}</dd></div>
                  <div className="flex justify-between"><dt>Entity</dt><dd>{selectedTicket.entity_type ? `${selectedTicket.entity_type}/${selectedTicket.entity_id?.slice(0, 8)}` : '—'}</dd></div>
                  <div className="flex justify-between"><dt>Created</dt><dd>{new Date(selectedTicket.created_at).toLocaleString()}</dd></div>
                </dl>

                {selectedTicket.entity_type && selectedTicket.entity_id && (
                  <Link to={`/admin/entity/${selectedTicket.entity_type}/${selectedTicket.entity_id}`}>
                    <Button size="sm" variant="outline" className="w-full">View Entity 360</Button>
                  </Link>
                )}

                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => handleAssignToMe(selectedTicket.id)}>Assign to me</Button>
                  {selectedTicket.status !== 'closed' && (
                    <Button size="sm" onClick={() => handleStatusUpdate(selectedTicket.id, 'closed')}>Close</Button>
                  )}
                </div>

                {/* AI Triage Suggestion */}
                {(() => {
                  const triage = getTriageForTicket(selectedTicket.id);
                  if (!triage) return null;
                  return (
                    <>
                      <Separator />
                      <Card className="border-purple-200">
                        <CardHeader className="py-2 px-3">
                          <CardTitle className="text-sm flex items-center gap-1"><Sparkles className="h-4 w-4 text-purple-600" /> AI Triage Suggestion</CardTitle>
                        </CardHeader>
                        <CardContent className="px-3 pb-3 text-sm space-y-2">
                          <div className="flex gap-2">
                            <span className="text-muted-foreground">Category:</span>
                            <Badge variant="outline">{triage.output?.suggested_category}</Badge>
                          </div>
                          <div className="flex gap-2">
                            <span className="text-muted-foreground">Priority:</span>
                            <Badge className={PRIORITY_COLORS[triage.output?.suggested_priority] || ''}>{triage.output?.suggested_priority}</Badge>
                          </div>
                          {triage.output?.suggested_actions && (
                            <div>
                              <span className="text-muted-foreground">Actions: </span>
                              <span>{(triage.output.suggested_actions as string[]).join(', ')}</span>
                            </div>
                          )}
                          <p className="text-xs text-muted-foreground">Provider: {triage.provider} | Confidence: {triage.confidence ?? 'N/A'}</p>
                          <div className="flex gap-2 pt-1">
                            <Button size="sm" onClick={() => handleAcceptTriage(triage.id, true)}>
                              <CheckCircle className="h-3 w-3 mr-1" /> Accept & Apply
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => handleAcceptTriage(triage.id, false)}>
                              <XCircle className="h-3 w-3 mr-1" /> Reject
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    </>
                  );
                })()}
              </div>
            </DialogContent>
          )}
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
