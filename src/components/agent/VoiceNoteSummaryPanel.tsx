import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Sparkles, Edit2, Check, X } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

interface VoiceNoteSummaryPanelProps {
  voiceNoteId: string;
}

export default function VoiceNoteSummaryPanel({ voiceNoteId }: VoiceNoteSummaryPanelProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);
  const [editedSummary, setEditedSummary] = useState('');

  const { data: summary, isLoading } = useQuery({
    queryKey: ['voice-note-summary', voiceNoteId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('agent_voice_note_summaries')
        .select('*')
        .eq('voice_note_id', voiceNoteId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!voiceNoteId,
    staleTime: 60_000,
  });

  const updateSummary = useMutation({
    mutationFn: async (newSummary: string) => {
      if (!summary?.id) throw new Error('No summary to update');
      const { error } = await supabase
        .from('agent_voice_note_summaries')
        .update({ summary: newSummary })
        .eq('id', summary.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['voice-note-summary', voiceNoteId] });
      setIsEditing(false);
      toast({ title: 'Summary updated' });
    },
  });

  if (isLoading) return null;
  if (!summary) return null;

  const extracted = summary.extracted as Record<string, any> | null;

  return (
    <Card className="border-purple-200 mt-2">
      <CardHeader className="py-2 px-3">
        <CardTitle className="text-sm flex items-center gap-1">
          <Sparkles className="h-4 w-4 text-purple-600" />
          AI Summary
        </CardTitle>
      </CardHeader>
      <CardContent className="px-3 pb-3 space-y-2">
        {isEditing ? (
          <div className="space-y-2">
            <Textarea
              value={editedSummary}
              onChange={(e) => setEditedSummary(e.target.value)}
              rows={3}
            />
            <div className="flex gap-2">
              <Button size="sm" onClick={() => updateSummary.mutate(editedSummary)} disabled={updateSummary.isPending}>
                <Check className="h-3 w-3 mr-1" /> Save
              </Button>
              <Button size="sm" variant="outline" onClick={() => setIsEditing(false)}>
                <X className="h-3 w-3 mr-1" /> Cancel
              </Button>
            </div>
          </div>
        ) : (
          <div>
            <p className="text-sm">{summary.summary}</p>
            <Button size="sm" variant="ghost" className="mt-1" onClick={() => { setEditedSummary(summary.summary || ''); setIsEditing(true); }}>
              <Edit2 className="h-3 w-3 mr-1" /> Edit
            </Button>
          </div>
        )}

        {extracted && (
          <div className="flex flex-wrap gap-1 pt-1">
            {extracted.issues && (extracted.issues as string[]).length > 0 && (
              (extracted.issues as string[]).map((issue: string) => (
                <Badge key={issue} variant="destructive" className="text-xs">{issue}</Badge>
              ))
            )}
            {extracted.crop_stage && <Badge variant="secondary" className="text-xs">Stage: {extracted.crop_stage}</Badge>}
            {extracted.followup_date && <Badge variant="outline" className="text-xs">Follow-up: {extracted.followup_date}</Badge>}
            {extracted.recommended_action && (
              <p className="text-xs text-muted-foreground w-full mt-1">Recommended: {extracted.recommended_action}</p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
