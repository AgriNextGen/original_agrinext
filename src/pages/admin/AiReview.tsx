import { useState, useMemo } from 'react';
import DashboardLayout from '@/layouts/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { CheckCircle, XCircle, Sparkles, Clock } from 'lucide-react';
import { useAiOutputs, useAcceptAiSuggestion } from '@/hooks/useAiOutputs';
import { useToast } from '@/components/ui/use-toast';

const TARGET_TYPES = ['ticket', 'timeline', 'search_intent', 'voice_note'];
const STATUS_OPTIONS = ['suggested', 'accepted', 'rejected'];

const STATUS_COLORS: Record<string, string> = {
  suggested: 'bg-yellow-100 text-yellow-800',
  accepted: 'bg-green-100 text-green-800',
  rejected: 'bg-red-100 text-red-800',
};

export default function AiReview() {
  const { toast } = useToast();
  const [statusFilter, setStatusFilter] = useState('suggested');
  const [typeFilter, setTypeFilter] = useState('');

  const filters = useMemo(() => {
    const f: Record<string, string> = {};
    if (statusFilter) f.status = statusFilter;
    if (typeFilter) f.target_type = typeFilter;
    return f;
  }, [statusFilter, typeFilter]);

  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading } = useAiOutputs(filters);
  const acceptSuggestion = useAcceptAiSuggestion();

  const items = data?.pages.flatMap((p) => p.items) ?? [];

  const handleDecision = (outputId: string, accept: boolean) => {
    acceptSuggestion.mutate({ outputId, accept }, {
      onSuccess: () => toast({ title: accept ? 'Accepted' : 'Rejected' }),
    });
  };

  return (
    <DashboardLayout>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">AI Outputs Review</h1>
        </div>

        <div className="flex gap-2 flex-wrap">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-36"><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              {STATUS_OPTIONS.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-40"><SelectValue placeholder="Type" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              {TARGET_TYPES.map((t) => <SelectItem key={t} value={t}>{t.replace(/_/g, ' ')}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          {isLoading && Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-24 w-full" />)}

          {!isLoading && items.length === 0 && (
            <Card><CardContent className="py-12 text-center text-muted-foreground">No AI outputs to review.</CardContent></Card>
          )}

          {items.map((item) => (
            <Card key={item.id}>
              <CardContent className="py-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap mb-2">
                      <Sparkles className="h-4 w-4 text-purple-500" />
                      <Badge variant="outline" className="text-xs capitalize">{item.target_type.replace(/_/g, ' ')}</Badge>
                      <Badge className={`text-xs ${STATUS_COLORS[item.status] || ''}`}>{item.status}</Badge>
                      <Badge variant="secondary" className="text-xs">{item.provider}</Badge>
                      {item.confidence != null && (
                        <span className="text-xs text-muted-foreground">Confidence: {(item.confidence * 100).toFixed(0)}%</span>
                      )}
                    </div>

                    <div className="text-xs text-muted-foreground mb-1">
                      Target: {item.target_id.slice(0, 8)} | <Clock className="inline h-3 w-3" /> {new Date(item.created_at).toLocaleString()}
                    </div>

                    {/* Output preview */}
                    <div className="bg-muted/50 rounded p-2 text-sm">
                      {item.target_type === 'ticket' && (
                        <div className="space-y-1">
                          <p>Category: <strong>{item.output?.suggested_category}</strong></p>
                          <p>Priority: <strong>{item.output?.suggested_priority}</strong></p>
                          {item.output?.suggested_actions && <p>Actions: {(item.output.suggested_actions as string[]).join(', ')}</p>}
                        </div>
                      )}
                      {item.target_type === 'timeline' && (
                        <p className="whitespace-pre-wrap">{item.output?.summary || JSON.stringify(item.output).slice(0, 200)}</p>
                      )}
                      {item.target_type === 'search_intent' && (
                        <div className="space-y-1">
                          <p>Query: <em>{item.output?.original_query}</em></p>
                          <p>Filters: {JSON.stringify(item.output?.suggested_filters)}</p>
                        </div>
                      )}
                      {!['ticket', 'timeline', 'search_intent'].includes(item.target_type) && (
                        <pre className="text-xs overflow-auto max-h-32">{JSON.stringify(item.output, null, 2)}</pre>
                      )}
                    </div>
                  </div>

                  {item.status === 'suggested' && (
                    <div className="flex flex-col gap-1 flex-shrink-0">
                      <Button size="sm" onClick={() => handleDecision(item.id, true)}>
                        <CheckCircle className="h-3 w-3 mr-1" /> Accept
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => handleDecision(item.id, false)}>
                        <XCircle className="h-3 w-3 mr-1" /> Reject
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {hasNextPage && (
          <div className="text-center">
            <Button variant="outline" onClick={() => fetchNextPage()} disabled={isFetchingNextPage}>
              {isFetchingNextPage ? 'Loading...' : 'Load more'}
            </Button>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
