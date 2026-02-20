import { useState, useRef, useCallback, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  FileAudio, 
  Play, 
  Pause, 
  User, 
  Calendar,
  MessageSquare,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

interface AgentVoiceNote {
  id: string;
  agent_id: string;
  farmer_id: string | null;
  crop_id: string | null;
  task_id: string | null;
  note_text: string | null;
  audio_path: string | null;
  language_code: string;
  created_at: string;
}

const languageLabels: Record<string, string> = {
  'en-IN': 'English',
  'hi-IN': 'Hindi',
  'kn-IN': 'Kannada',
};

const AgentNotesSection = () => {
  const { user } = useAuth();
  const [playingNoteId, setPlayingNoteId] = useState<string | null>(null);
  const [audioLoading, setAudioLoading] = useState<string | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const { data: notes, isLoading } = useQuery({
    queryKey: ['agent-notes-for-farmer', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      const { data, error } = await supabase
        .from('agent_voice_notes')
        .select('*')
        .eq('farmer_id', user.id)
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) {
        console.error('Error fetching agent notes:', error);
        return [];
      }

      return data as AgentVoiceNote[];
    },
    enabled: !!user?.id,
  });

  // Show first 2 notes by default, expand to show all
  const visibleNotes = useMemo(() => {
    if (!notes) return [];
    return isExpanded ? notes : notes.slice(0, 2);
  }, [notes, isExpanded]);

  const hasMoreNotes = (notes?.length || 0) > 2;

  const playAudio = useCallback(async (note: AgentVoiceNote) => {
    if (!note.audio_path) return;

    // Stop current audio
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }

    if (playingNoteId === note.id) {
      setPlayingNoteId(null);
      return;
    }

    setAudioLoading(note.id);

    try {
      // Get signed URL
      const { data: signedUrl, error } = await supabase.storage
        .from('voice_media')
        .createSignedUrl(note.audio_path, 300);

      if (error || !signedUrl?.signedUrl) {
        throw new Error('Could not get audio URL');
      }

      audioRef.current = new Audio(signedUrl.signedUrl);
      audioRef.current.onended = () => {
        setPlayingNoteId(null);
      };
      audioRef.current.onerror = () => {
        setPlayingNoteId(null);
        console.error('Audio playback error');
      };

      await audioRef.current.play();
      setPlayingNoteId(note.id);
    } catch (error) {
      console.error('Error playing audio:', error);
    } finally {
      setAudioLoading(null);
    }
  }, [playingNoteId]);

  if (isLoading) {
    return (
      <Card className="overflow-hidden">
        <CardHeader className="py-3 px-4">
          <CardTitle className="text-base flex items-center gap-2">
            <FileAudio className="h-5 w-5 text-primary" />
            Agent Notes
          </CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-3 pt-0">
          <Skeleton className="h-12 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (!notes || notes.length === 0) {
    return (
      <Card className="overflow-hidden">
        <CardHeader className="py-3 px-4">
          <CardTitle className="text-base flex items-center gap-2">
            <FileAudio className="h-4 w-4 text-muted-foreground" />
            Agent Notes
          </CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-3 pt-0">
          <div className="flex items-center gap-3 text-muted-foreground">
            <MessageSquare className="h-4 w-4 opacity-50" />
            <p className="text-sm">No notes from your agent yet</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden">
      <CardHeader className="py-3 px-4">
        <CardTitle className="text-base flex items-center gap-2">
          <FileAudio className="h-5 w-5 text-primary" />
          Agent Notes
          <Badge variant="secondary" className="ml-auto text-xs">
            {notes.length} notes
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="px-4 pb-3 pt-0">
        <div className="space-y-2">
          {visibleNotes.map((note) => (
            <div
              key={note.id}
              className="p-2.5 rounded-lg border bg-muted/30 hover:bg-muted/50 transition-colors"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <User className="h-3 w-3 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">
                      Field Agent
                    </span>
                    <Badge variant="outline" className="text-[10px] px-1 py-0">
                      {languageLabels[note.language_code] || note.language_code}
                    </Badge>
                    <span className="text-[10px] text-muted-foreground/70 ml-auto">
                      {format(new Date(note.created_at), 'MMM d')}
                    </span>
                  </div>
                  
                  {note.note_text && (
                    <p className={cn(
                      "text-sm",
                      !isExpanded && "line-clamp-2"
                    )}>{note.note_text}</p>
                  )}
                </div>

                {note.audio_path && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 flex-shrink-0"
                    onClick={() => playAudio(note)}
                    disabled={audioLoading === note.id}
                  >
                    {audioLoading === note.id ? (
                      <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                    ) : playingNoteId === note.id ? (
                      <Pause className="h-3.5 w-3.5" />
                    ) : (
                      <Play className="h-3.5 w-3.5" />
                    )}
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Show more/less button */}
        {hasMoreNotes && (
          <Button
            variant="ghost"
            size="sm"
            className="w-full mt-2 h-7 text-xs text-muted-foreground hover:text-foreground"
            onClick={() => setIsExpanded(!isExpanded)}
          >
            {isExpanded ? (
              <>
                <ChevronUp className="h-3 w-3 mr-1" />
                Show less
              </>
            ) : (
              <>
                <ChevronDown className="h-3 w-3 mr-1" />
                Show {notes.length - 2} more notes
              </>
            )}
          </Button>
        )}
      </CardContent>
    </Card>
  );
};

export default AgentNotesSection;
