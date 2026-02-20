import { useState, useRef, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { 
  Mic, 
  MicOff, 
  Send, 
  Volume2, 
  VolumeX, 
  Bot, 
  User, 
  Loader2,
  Globe,
  Sparkles,
  Languages,
  MessageSquare,
  X,
  Play,
  Pause
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

// Web Speech API types
interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
}

interface SpeechRecognitionResultList {
  readonly length: number;
  item(index: number): SpeechRecognitionResult;
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionResult {
  readonly length: number;
  item(index: number): SpeechRecognitionAlternative;
  [index: number]: SpeechRecognitionAlternative;
}

interface SpeechRecognitionAlternative {
  readonly transcript: string;
  readonly confidence: number;
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string;
}

interface ISpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
}

declare global {
  interface Window {
    SpeechRecognition?: new () => ISpeechRecognition;
    webkitSpeechRecognition?: new () => ISpeechRecognition;
  }
}

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  personalized?: boolean;
  webVerified?: boolean;
  audioUrl?: string | null;
  audioLoading?: boolean;
}

type SupportedLanguage = 'en-IN' | 'hi-IN' | 'kn-IN';

const languageLabels: Record<SupportedLanguage, string> = {
  'en-IN': 'English',
  'hi-IN': 'हिंदी',
  'kn-IN': 'ಕನ್ನಡ',
};

const VoiceAssistant = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState<SupportedLanguage>('en-IN');
  const [voiceReplyEnabled, setVoiceReplyEnabled] = useState(() => {
    const saved = localStorage.getItem('voiceReplyEnabled');
    return saved !== null ? saved === 'true' : true;
  });
  const [playingMessageId, setPlayingMessageId] = useState<string | null>(null);
  
  const recognitionRef = useRef<ISpeechRecognition | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Save voice reply preference
  useEffect(() => {
    localStorage.setItem('voiceReplyEnabled', String(voiceReplyEnabled));
  }, [voiceReplyEnabled]);

  // Initialize speech recognition
  useEffect(() => {
    const SpeechRecognitionAPI = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (typeof window !== 'undefined' && SpeechRecognitionAPI) {
      recognitionRef.current = new SpeechRecognitionAPI();
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = false;
      recognitionRef.current.lang = selectedLanguage;

      recognitionRef.current.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        setInputText(transcript);
        setIsListening(false);
        // Auto-send after voice input
        handleSendMessage(transcript);
      };

      recognitionRef.current.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
        setIsListening(false);
        if (event.error === 'not-allowed') {
          toast.error('Microphone access denied. Please enable it in your browser settings.');
        } else {
          toast.error('Voice input error. Please try again or type your message.');
        }
      };

      recognitionRef.current.onend = () => {
        setIsListening(false);
      };
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }
      if (audioRef.current) {
        audioRef.current.pause();
      }
    };
  }, [selectedLanguage]);

  // Update recognition language when changed
  useEffect(() => {
    if (recognitionRef.current) {
      recognitionRef.current.lang = selectedLanguage;
    }
  }, [selectedLanguage]);

  // Scroll to bottom on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const startListening = async () => {
    if (!recognitionRef.current) {
      toast.error('Voice input is not supported in your browser. Please use Chrome or Edge.');
      return;
    }

    try {
      await navigator.mediaDevices.getUserMedia({ audio: true });
      recognitionRef.current.lang = selectedLanguage;
      recognitionRef.current.start();
      setIsListening(true);
    } catch (error) {
      console.error('Microphone error:', error);
      toast.error('Could not access microphone. Please check permissions.');
    }
  };

  const stopListening = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    setIsListening(false);
  };

  // Fetch TTS audio from ElevenLabs edge function
  const fetchTTSAudio = useCallback(async (text: string, messageId: string) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return null;

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/tts-elevenlabs`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
            'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          },
          body: JSON.stringify({
            text: text.substring(0, 1200),
            language_code: selectedLanguage,
            voice_role: 'farmer',
          }),
        }
      );

      const data = await response.json();
      
      if (data.audio_url) {
        // Update message with audio URL
        setMessages(prev => prev.map(msg => 
          msg.id === messageId 
            ? { ...msg, audioUrl: data.audio_url, audioLoading: false }
            : msg
        ));
        return data.audio_url;
      }
      
      return null;
    } catch (error) {
      console.error('TTS fetch error:', error);
      setMessages(prev => prev.map(msg => 
        msg.id === messageId 
          ? { ...msg, audioLoading: false }
          : msg
      ));
      return null;
    }
  }, [selectedLanguage]);

  const playAudio = useCallback(async (messageId: string, audioUrl?: string | null) => {
    // Stop current playing audio
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }

    if (playingMessageId === messageId) {
      setPlayingMessageId(null);
      return;
    }

    const message = messages.find(m => m.id === messageId);
    if (!message) return;

    let url = audioUrl || message.audioUrl;

    // If no URL yet, fetch it
    if (!url && !message.audioLoading) {
      setMessages(prev => prev.map(msg => 
        msg.id === messageId ? { ...msg, audioLoading: true } : msg
      ));
      url = await fetchTTSAudio(message.content, messageId);
    }

    if (!url) {
      toast.error('Voice unavailable for this message');
      return;
    }

    try {
      audioRef.current = new Audio(url);
      audioRef.current.onended = () => {
        setPlayingMessageId(null);
      };
      audioRef.current.onerror = () => {
        setPlayingMessageId(null);
        toast.error('Could not play audio');
      };
      await audioRef.current.play();
      setPlayingMessageId(messageId);
    } catch (error) {
      console.error('Audio play error:', error);
      toast.error('Could not play audio');
    }
  }, [messages, playingMessageId, fetchTTSAudio]);

  const handleSendMessage = async (text?: string) => {
    const messageText = text || inputText.trim();
    if (!messageText || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: messageText,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInputText('');
    setIsLoading(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-gateway/farmer-assistant`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
          apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        },
        body: JSON.stringify({
          message: messageText,
          language: selectedLanguage,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error?.message || 'Function error');

      const assistantMessageId = (Date.now() + 1).toString();
      const assistantMessage: Message = {
        id: assistantMessageId,
        role: 'assistant',
        content: data.reply,
        timestamp: new Date(),
        personalized: data.metadata?.personalized ?? true,
        webVerified: data.metadata?.webVerified ?? false,
        audioLoading: voiceReplyEnabled,
      };

      setMessages(prev => [...prev, assistantMessage]);
      
      // Fetch TTS if voice reply is enabled
      if (voiceReplyEnabled) {
        const audioUrl = await fetchTTSAudio(data.reply, assistantMessageId);
        if (audioUrl) {
          playAudio(assistantMessageId, audioUrl);
        }
      }
    } catch (error) {
      console.error('Error:', error);
      toast.error('Could not get a response. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const cycleLanguage = () => {
    const languages: SupportedLanguage[] = ['en-IN', 'hi-IN', 'kn-IN'];
    const currentIndex = languages.indexOf(selectedLanguage);
    const nextIndex = (currentIndex + 1) % languages.length;
    setSelectedLanguage(languages[nextIndex]);
    toast.success(`Language: ${languageLabels[languages[nextIndex]]}`);
  };

  if (!isOpen) {
    return (
      <Button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-lg bg-primary hover:bg-primary/90 z-50"
        size="icon"
      >
        <MessageSquare className="h-6 w-6" />
      </Button>
    );
  }

  return (
    <Card className="fixed bottom-6 right-6 w-[360px] max-w-[calc(100vw-3rem)] h-[520px] max-h-[calc(100vh-6rem)] shadow-xl z-50 flex flex-col">
      <CardHeader className="pb-2 border-b flex-shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
              <Bot className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-base">Krishi Mitra</CardTitle>
              <p className="text-xs text-muted-foreground">Your Farming Assistant</p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={cycleLanguage}
              title="Change language"
            >
              <Languages className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => setIsOpen(false)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
        <div className="flex items-center justify-between mt-2">
          <Badge variant="secondary" className="text-xs">
            {languageLabels[selectedLanguage]}
          </Badge>
          <div className="flex items-center gap-2">
            <Label htmlFor="voice-reply" className="text-xs text-muted-foreground cursor-pointer">
              Voice Reply
            </Label>
            <Switch
              id="voice-reply"
              checked={voiceReplyEnabled}
              onCheckedChange={setVoiceReplyEnabled}
              className="scale-75"
            />
          </div>
        </div>
      </CardHeader>

      <CardContent className="flex-1 flex flex-col p-0 overflow-hidden">
        {/* Messages Area */}
        <ScrollArea className="flex-1 p-4" ref={scrollRef}>
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-4">
              <Bot className="h-12 w-12 text-muted-foreground/50 mb-3" />
              <h3 className="font-medium text-sm mb-1">Namaste! 🙏</h3>
              <p className="text-xs text-muted-foreground mb-3">
                Ask me about crops, weather, market prices, or any farming questions.
              </p>
              <div className="flex flex-wrap gap-2 justify-center">
                <Badge 
                  variant="outline" 
                  className="cursor-pointer hover:bg-accent text-xs"
                  onClick={() => handleSendMessage("What crops should I plant this season?")}
                >
                  Season crops
                </Badge>
                <Badge 
                  variant="outline" 
                  className="cursor-pointer hover:bg-accent text-xs"
                  onClick={() => handleSendMessage("मेरी फसल में कीड़े लग गए हैं, क्या करूं?")}
                >
                  कीट नियंत्रण
                </Badge>
                <Badge 
                  variant="outline" 
                  className="cursor-pointer hover:bg-accent text-xs"
                  onClick={() => handleSendMessage("ಬೆಳೆಗಳಿಗೆ ನೀರು ಹೇಗೆ ನೀಡಬೇಕು?")}
                >
                  ನೀರಾವರಿ
                </Badge>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex gap-2 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  {msg.role === 'assistant' && (
                    <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <Bot className="h-4 w-4 text-primary" />
                    </div>
                  )}
                  <div className="flex flex-col gap-1 max-w-[80%]">
                    {msg.role === 'assistant' && (
                      <div className="flex gap-1 flex-wrap">
                        {msg.personalized && (
                          <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4 gap-0.5">
                            <Sparkles className="h-2.5 w-2.5" />
                            Personalized
                          </Badge>
                        )}
                        {msg.webVerified && (
                          <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 gap-0.5 border-blue-300 text-blue-600">
                            <Globe className="h-2.5 w-2.5" />
                            Web verified
                          </Badge>
                        )}
                      </div>
                    )}
                    <div
                      className={`rounded-lg px-3 py-2 text-sm ${
                        msg.role === 'user'
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted'
                      }`}
                    >
                      {msg.content}
                    </div>
                    {/* Play button for assistant messages */}
                    {msg.role === 'assistant' && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-fit px-2 text-xs gap-1 self-start"
                        onClick={() => playAudio(msg.id)}
                        disabled={msg.audioLoading}
                      >
                        {msg.audioLoading ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : playingMessageId === msg.id ? (
                          <Pause className="h-3 w-3" />
                        ) : (
                          <Play className="h-3 w-3" />
                        )}
                        {msg.audioLoading ? 'Loading...' : playingMessageId === msg.id ? 'Stop' : 'Play'}
                      </Button>
                    )}
                  </div>
                  {msg.role === 'user' && (
                    <div className="h-7 w-7 rounded-full bg-secondary flex items-center justify-center flex-shrink-0">
                      <User className="h-4 w-4" />
                    </div>
                  )}
                </div>
              ))}
              {isLoading && (
                <div className="flex gap-2 justify-start">
                  <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center">
                    <Bot className="h-4 w-4 text-primary" />
                  </div>
                  <div className="bg-muted rounded-lg px-3 py-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                  </div>
                </div>
              )}
            </div>
          )}
        </ScrollArea>

        {/* Input Area */}
        <div className="p-3 border-t flex-shrink-0">
          <div className="flex items-center gap-2">
            <Button
              variant={isListening ? "destructive" : "outline"}
              size="icon"
              className="h-10 w-10 flex-shrink-0"
              onClick={isListening ? stopListening : startListening}
              disabled={isLoading}
            >
              {isListening ? (
                <MicOff className="h-4 w-4" />
              ) : (
                <Mic className="h-4 w-4" />
              )}
            </Button>
            <Input
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder={isListening ? "Listening..." : "Type or speak..."}
              className="flex-1"
              disabled={isListening || isLoading}
            />
            <Button
              size="icon"
              className="h-10 w-10 flex-shrink-0"
              onClick={() => handleSendMessage()}
              disabled={!inputText.trim() || isLoading}
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </div>
          {isListening && (
            <p className="text-xs text-center text-muted-foreground mt-2 animate-pulse">
              🎤 Speak now in {languageLabels[selectedLanguage]}...
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default VoiceAssistant;
