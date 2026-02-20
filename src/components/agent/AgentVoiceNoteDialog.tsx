import { useState, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Mic, MicOff, Loader2, Languages, FileAudio } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

type SupportedLanguage = 'en-IN' | 'hi-IN' | 'kn-IN';

const languageLabels: Record<SupportedLanguage, string> = {
  'en-IN': 'English',
  'hi-IN': 'Hindi',
  'kn-IN': 'Kannada',
};

const MAX_RECORDING_DURATION = 30000; // 30 seconds

interface AgentVoiceNoteDialogProps {
  farmerId?: string | null;
  taskId?: string | null;
  cropId?: string | null;
  triggerButton?: React.ReactNode;
  onNoteSaved?: () => void;
}

const AgentVoiceNoteDialog = ({
  farmerId,
  taskId,
  cropId,
  triggerButton,
  onNoteSaved,
}: AgentVoiceNoteDialogProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [noteText, setNoteText] = useState('');
  const [language, setLanguage] = useState<SupportedLanguage>('en-IN');
  const [isRecording, setIsRecording] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [recordingDuration, setRecordingDuration] = useState(0);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingTimerRef = useRef<NodeJS.Timeout | null>(null);
  const durationIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      const mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        setAudioBlob(blob);
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start(1000);
      setIsRecording(true);
      setRecordingDuration(0);

      durationIntervalRef.current = setInterval(() => {
        setRecordingDuration(prev => prev + 1);
      }, 1000);

      recordingTimerRef.current = setTimeout(() => {
        stopRecording();
      }, MAX_RECORDING_DURATION);

    } catch (error) {
      console.error('Recording error:', error);
      toast.error('Could not start recording. Please check microphone permissions.');
    }
  }, []);

  const stopRecording = useCallback(() => {
    if (recordingTimerRef.current) clearTimeout(recordingTimerRef.current);
    if (durationIntervalRef.current) clearInterval(durationIntervalRef.current);

    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
  }, [isRecording]);

  const handleSave = async () => {
    if (!noteText.trim() && !audioBlob) {
      toast.error('Please add a note or recording');
      return;
    }

    setIsSaving(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      let audioBase64: string | null = null;
      if (audioBlob) {
        const buffer = await audioBlob.arrayBuffer();
        const bytes = new Uint8Array(buffer);
        let binary = '';
        for (let i = 0; i < bytes.byteLength; i++) {
          binary += String.fromCharCode(bytes[i]);
        }
        audioBase64 = btoa(binary);
      }

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/save-agent-voice-note`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
            'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          },
          body: JSON.stringify({
            farmer_id: farmerId || null,
            task_id: taskId || null,
            crop_id: cropId || null,
            language_code: language,
            note_text: noteText.trim() || null,
            audio_base64: audioBase64,
          }),
        }
      );

      const data = await response.json();
      if (!data.success) throw new Error(data.error || 'Failed to save note');

      toast.success('Voice note saved!');
      setIsOpen(false);
      setNoteText('');
      setAudioBlob(null);
      setRecordingDuration(0);
      onNoteSaved?.();
    } catch (error: any) {
      console.error('Save error:', error);
      toast.error(error.message || 'Failed to save note');
    } finally {
      setIsSaving(false);
    }
  };

  const handleClose = () => {
    if (isRecording) stopRecording();
    setIsOpen(false);
    setNoteText('');
    setAudioBlob(null);
    setRecordingDuration(0);
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => open ? setIsOpen(true) : handleClose()}>
      <DialogTrigger asChild>
        {triggerButton || (
          <Button variant="outline" size="sm">
            <FileAudio className="h-4 w-4 mr-2" />
            Voice Note
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileAudio className="h-5 w-5" />
            Add Voice Note
          </DialogTitle>
          <DialogDescription>
            Record a voice note or type your observations
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Language Selection */}
          <div className="flex items-center gap-4">
            <Label className="flex items-center gap-2">
              <Languages className="h-4 w-4" />
              Language
            </Label>
            <Select 
              value={language} 
              onValueChange={(v: SupportedLanguage) => setLanguage(v)}
              disabled={isRecording}
            >
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="en-IN">English</SelectItem>
                <SelectItem value="hi-IN">Hindi</SelectItem>
                <SelectItem value="kn-IN">Kannada</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Recording Controls */}
          <div className="flex flex-col items-center gap-3 py-4">
            <Button
              variant={isRecording ? "destructive" : "default"}
              size="lg"
              className="h-16 w-16 rounded-full"
              onClick={isRecording ? stopRecording : startRecording}
              disabled={isSaving}
            >
              {isRecording ? (
                <MicOff className="h-6 w-6" />
              ) : (
                <Mic className="h-6 w-6" />
              )}
            </Button>
            {isRecording && (
              <Badge variant="destructive" className="animate-pulse">
                Recording {formatDuration(recordingDuration)}
              </Badge>
            )}
            {audioBlob && !isRecording && (
              <Badge variant="secondary">
                Recording saved ({formatDuration(recordingDuration)})
              </Badge>
            )}
            <p className="text-xs text-muted-foreground">
              {isRecording 
                ? `Max ${MAX_RECORDING_DURATION / 1000} seconds`
                : 'Tap to start recording'}
            </p>
          </div>

          {/* Note Text */}
          <div>
            <Label htmlFor="note-text">Note Text</Label>
            <Textarea
              id="note-text"
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
              placeholder="Type or speak your observations..."
              className="mt-1.5 min-h-[100px]"
              disabled={isRecording || isSaving}
            />
          </div>

          {/* Context Info */}
          {(farmerId || taskId || cropId) && (
            <div className="flex gap-2 flex-wrap">
              {farmerId && <Badge variant="outline">Farmer linked</Badge>}
              {taskId && <Badge variant="outline">Task linked</Badge>}
              {cropId && <Badge variant="outline">Crop linked</Badge>}
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={handleClose} disabled={isSaving}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={isSaving || (!noteText.trim() && !audioBlob)}>
              {isSaving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save Note'
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AgentVoiceNoteDialog;
