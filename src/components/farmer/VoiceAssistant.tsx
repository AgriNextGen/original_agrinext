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
  Bot,
  User,
  Loader2,
  Globe,
  Sparkles,
  Languages,
  MessageSquare,
  X,
  Play,
  Pause,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/hooks/useLanguage';
import { toast } from 'sonner';

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

type SupportedLanguage = 'en-IN' | 'hi-IN' | 'kn-IN';

type ChatTurn = {
  role: 'user' | 'assistant';
  content: string;
};

interface Message extends ChatTurn {
  id: string;
  timestamp: Date;
  personalized?: boolean;
  webVerified?: boolean;
  audioUrl?: string | null;
  audioMimeType?: string | null;
  audioLoading?: boolean;
  suggestions?: string[];
  detectedLanguage?: string | null;
  responseLanguage?: 'en' | 'kn' | null;
}

interface AssistantApiResponse {
  reply?: string;
  metadata?: {
    personalized?: boolean;
    webVerified?: boolean;
    detectedInputLanguage?: string | null;
    responseLanguage?: 'en' | 'kn' | null;
  };
  suggestions?: string[];
  error?: { code?: string; message?: string };
}

interface TtsApiResponse {
  audio_url?: string;
  audio_base64?: string;
  mime_type?: string;
  error?: { code?: string; message?: string };
}

const LANGUAGE_ORDER: SupportedLanguage[] = ['en-IN', 'hi-IN', 'kn-IN'];
const DEFAULT_VOICE_PREF_KEY = 'voiceReplyEnabled';

const appLanguageToSpeechLanguage = (language: 'en' | 'kn'): SupportedLanguage =>
  language === 'kn' ? 'kn-IN' : 'en-IN';

const speechLanguageToAppLanguage = (language: SupportedLanguage): 'en' | 'kn' =>
  language === 'kn-IN' ? 'kn' : 'en';

function buildObjectUrlFromBase64(base64: string, mimeType?: string | null) {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  const blob = new Blob([bytes], { type: mimeType || 'audio/mpeg' });
  return URL.createObjectURL(blob);
}

function normalizeSuggestions(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => String(item || '').trim())
    .filter(Boolean)
    .slice(0, 3);
}

const VoiceAssistant = () => {
  const { t, language: appLanguage } = useLanguage();

  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState<SupportedLanguage>('en-IN');
  const [voiceReplyEnabled, setVoiceReplyEnabled] = useState(() => {
    const saved = localStorage.getItem(DEFAULT_VOICE_PREF_KEY);
    return saved !== null ? saved === 'true' : true;
  });
  const [playingMessageId, setPlayingMessageId] = useState<string | null>(null);

  const recognitionRef = useRef<ISpeechRecognition | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const speechUtteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const objectUrlsRef = useRef<string[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);

  const getLanguageLabel = useCallback(
    (lang: SupportedLanguage) => {
      if (lang === 'kn-IN') return t('common.kannada');
      if (lang === 'hi-IN') return t('common.hindi');
      return t('common.english');
    },
    [t],
  );

  const quickPrompts = [
    {
      id: 'season-crops',
      labelKey: 'farmer.assistant.quickPrompts.seasonCropsLabel',
      messageKey: 'farmer.assistant.quickPrompts.seasonCropsMessage',
    },
    {
      id: 'pest-control',
      labelKey: 'farmer.assistant.quickPrompts.pestControlLabel',
      messageKey: 'farmer.assistant.quickPrompts.pestControlMessage',
    },
    {
      id: 'irrigation',
      labelKey: 'farmer.assistant.quickPrompts.irrigationLabel',
      messageKey: 'farmer.assistant.quickPrompts.irrigationMessage',
    },
  ] as const;

  const stopAllPlayback = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }

    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }

    speechUtteranceRef.current = null;
    setPlayingMessageId(null);
  }, []);

  useEffect(() => {
    localStorage.setItem(DEFAULT_VOICE_PREF_KEY, String(voiceReplyEnabled));
  }, [voiceReplyEnabled]);

  useEffect(() => {
    if (!isOpen) return;
    setSelectedLanguage((prev) => {
      const preferred = appLanguageToSpeechLanguage(appLanguage);
      if (prev === 'hi-IN') return prev;
      return preferred;
    });
  }, [isOpen, appLanguage]);

  useEffect(() => {
    const SpeechRecognitionAPI = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (typeof window !== 'undefined' && SpeechRecognitionAPI) {
      recognitionRef.current = new SpeechRecognitionAPI();
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = false;
      recognitionRef.current.lang = selectedLanguage;

      recognitionRef.current.onresult = (event) => {
        const transcript = event.results[0]?.[0]?.transcript || '';
        if (!transcript) {
          setIsListening(false);
          return;
        }
        setInputText(transcript);
        setIsListening(false);
        void handleSendMessage(transcript);
      };

      recognitionRef.current.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
        setIsListening(false);
        if (event.error === 'not-allowed') {
          toast.error(t('errors.voice.microphoneDenied'));
        } else {
          toast.error(t('errors.voice.inputFailed'));
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
      stopAllPlayback();
      objectUrlsRef.current.forEach((url) => {
        try {
          URL.revokeObjectURL(url);
        } catch {
          // Ignore revoke errors for stale blob URLs
        }
      });
      objectUrlsRef.current = [];
    };
  }, [selectedLanguage, stopAllPlayback, t]);

  useEffect(() => {
    if (recognitionRef.current) {
      recognitionRef.current.lang = selectedLanguage;
    }
  }, [selectedLanguage]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const startListening = async () => {
    if (!recognitionRef.current) {
      toast.error(t('errors.voice.unsupportedBrowser'));
      return;
    }

    try {
      await navigator.mediaDevices.getUserMedia({ audio: true });
      recognitionRef.current.lang = selectedLanguage;
      recognitionRef.current.start();
      setIsListening(true);
    } catch (error) {
      console.error('Microphone error:', error);
      toast.error(t('errors.voice.couldNotAccessMicrophone'));
    }
  };

  const stopListening = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    setIsListening(false);
  };

  const speakWithBrowserTTS = useCallback(async (text: string, messageId: string) => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      return false;
    }

    const cleanText = text.trim();
    if (!cleanText) return false;

    try {
      stopAllPlayback();

      const utterance = new SpeechSynthesisUtterance(cleanText.slice(0, 1000));
      utterance.lang = selectedLanguage;
      utterance.rate = 1;
      utterance.pitch = 1;

      const langPrefix = selectedLanguage.split('-')[0].toLowerCase();
      const voices = window.speechSynthesis.getVoices();
      const match = voices.find((voice) => voice.lang.toLowerCase().startsWith(langPrefix));
      if (match) {
        utterance.voice = match;
      }

      utterance.onend = () => {
        if (speechUtteranceRef.current === utterance) {
          speechUtteranceRef.current = null;
        }
        setPlayingMessageId(null);
      };
      utterance.onerror = () => {
        if (speechUtteranceRef.current === utterance) {
          speechUtteranceRef.current = null;
        }
        setPlayingMessageId(null);
      };

      speechUtteranceRef.current = utterance;
      setPlayingMessageId(messageId);
      window.speechSynthesis.speak(utterance);
      return true;
    } catch (error) {
      console.error('Browser speech synthesis error:', error);
      setPlayingMessageId(null);
      return false;
    }
  }, [selectedLanguage, stopAllPlayback]);

  const fetchTTSAudio = useCallback(async (text: string, messageId: string) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return null;

      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/tts-elevenlabs`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
          apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        },
        body: JSON.stringify({
          text: text.slice(0, 1200),
          language_code: selectedLanguage,
          voice_role: 'farmer',
        }),
      });

      const raw = (await response.json().catch(() => ({}))) as TtsApiResponse;
      if (!response.ok) {
        throw new Error(raw?.error?.message || 'TTS function error');
      }

      let resolvedUrl: string | null = null;
      let mimeType = raw.mime_type || 'audio/mpeg';

      if (raw.audio_url) {
        resolvedUrl = raw.audio_url;
      } else if (raw.audio_base64) {
        resolvedUrl = buildObjectUrlFromBase64(raw.audio_base64, mimeType);
        objectUrlsRef.current.push(resolvedUrl);
      }

      setMessages((prev) => prev.map((msg) => (
        msg.id === messageId
          ? { ...msg, audioUrl: resolvedUrl, audioMimeType: mimeType, audioLoading: false }
          : msg
      )));

      return resolvedUrl;
    } catch (error) {
      console.error('TTS fetch error:', error);
      setMessages((prev) => prev.map((msg) => (
        msg.id === messageId
          ? { ...msg, audioLoading: false }
          : msg
      )));
      return null;
    }
  }, [selectedLanguage]);

  const playAudio = useCallback(async (messageId: string, audioUrl?: string | null) => {
    if (playingMessageId === messageId) {
      stopAllPlayback();
      return;
    }

    stopAllPlayback();

    const message = messages.find((m) => m.id === messageId);
    if (!message) return;

    let url = audioUrl || message.audioUrl;

    if (!url && !message.audioLoading) {
      setMessages((prev) => prev.map((msg) => (
        msg.id === messageId ? { ...msg, audioLoading: true } : msg
      )));
      url = await fetchTTSAudio(message.content, messageId);
    }

    if (url) {
      try {
        audioRef.current = new Audio(url);
        audioRef.current.onended = () => {
          setPlayingMessageId(null);
        };
        audioRef.current.onerror = async () => {
          setPlayingMessageId(null);
          const browserFallback = await speakWithBrowserTTS(message.content, messageId);
          if (!browserFallback) {
            toast.error(t('errors.audio.playFailed'));
          }
        };
        setPlayingMessageId(messageId);
        await audioRef.current.play();
        return;
      } catch (error) {
        console.error('Audio play error:', error);
      }
    }

    const browserFallback = await speakWithBrowserTTS(message.content, messageId);
    if (!browserFallback) {
      toast.error(t('errors.audio.voiceUnavailable'));
    }
  }, [messages, playingMessageId, fetchTTSAudio, speakWithBrowserTTS, stopAllPlayback, t]);

  const appendAssistantFallback = useCallback((messageText: string) => {
    const responseLang = speechLanguageToAppLanguage(selectedLanguage);
    const fallbackMessage = responseLang === 'kn'
      ? 'ಕ್ಷಮಿಸಿ, ಈಗ ಪ್ರತಿಕ್ರಿಯೆ ಪಡೆಯಲಾಗಲಿಲ್ಲ. ದಯವಿಟ್ಟು ಮತ್ತೆ ಪ್ರಯತ್ನಿಸಿ ಅಥವಾ ಪ್ರಶ್ನೆಯನ್ನು ಸ್ವಲ್ಪ ಸರಳವಾಗಿ ಕೇಳಿ.'
      : 'Sorry, I could not get a response right now. Please try again or ask in a simpler way.';

    const assistantMessage: Message = {
      id: `${Date.now()}-fallback`,
      role: 'assistant',
      content: fallbackMessage,
      timestamp: new Date(),
      personalized: false,
      webVerified: false,
      audioLoading: false,
      suggestions: responseLang === 'kn'
        ? [t('common.retry'), 'ಇಂಗ್ಲಿಷ್‌ನಲ್ಲಿ ಉತ್ತರಿಸಿ']
        : [t('common.retry'), 'Reply in Kannada'],
      detectedLanguage: null,
      responseLanguage: responseLang,
    };

    setMessages((prev) => [...prev, assistantMessage]);
    console.error('Assistant fallback triggered for message:', messageText);
  }, [selectedLanguage, t]);

  const handleSendMessage = async (text?: string) => {
    const messageText = (typeof text === 'string' ? text : inputText).trim();
    if (!messageText || isLoading) return;

    const userMessage: Message = {
      id: `${Date.now()}`,
      role: 'user',
      content: messageText,
      timestamp: new Date(),
    };

    const conversationPayload = [...messages, userMessage]
      .slice(-8)
      .map<ChatTurn>((msg) => ({ role: msg.role, content: msg.content }));

    setMessages((prev) => [...prev, userMessage]);
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
          ui_language: appLanguage,
          conversation: conversationPayload,
          mode: {
            response_style: 'concise',
            channel: 'chat',
            voice_reply_enabled: voiceReplyEnabled,
          },
          context: {
            include_profile: true,
            include_weather: true,
            include_market: true,
            include_crops: true,
          },
        }),
      });

      const data = (await res.json().catch(() => ({}))) as AssistantApiResponse;
      if (!res.ok) throw new Error(data?.error?.message || 'Function error');

      const assistantMessageId = `${Date.now()}-assistant`;
      const assistantMessage: Message = {
        id: assistantMessageId,
        role: 'assistant',
        content: String(data.reply || '').trim() || t('errors.ai.assistantUnavailable'),
        timestamp: new Date(),
        personalized: data.metadata?.personalized ?? true,
        webVerified: data.metadata?.webVerified ?? false,
        audioLoading: voiceReplyEnabled,
        suggestions: normalizeSuggestions(data.suggestions),
        detectedLanguage: data.metadata?.detectedInputLanguage ?? null,
        responseLanguage: data.metadata?.responseLanguage ?? null,
      };

      setMessages((prev) => [...prev, assistantMessage]);

      if (voiceReplyEnabled) {
        const audioUrl = await fetchTTSAudio(assistantMessage.content, assistantMessageId);
        if (audioUrl) {
          await playAudio(assistantMessageId, audioUrl);
        } else {
          const spoke = await speakWithBrowserTTS(assistantMessage.content, assistantMessageId);
          if (!spoke) {
            toast.message(t('errors.audio.textOnlyFallback'));
          }
        }
      }
    } catch (error) {
      console.error('Assistant error:', error);
      toast.error(t('errors.ai.assistantUnavailable'));
      appendAssistantFallback(messageText);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      void handleSendMessage();
    }
  };

  const cycleLanguage = () => {
    const currentIndex = LANGUAGE_ORDER.indexOf(selectedLanguage);
    const nextIndex = (currentIndex + 1) % LANGUAGE_ORDER.length;
    const nextLang = LANGUAGE_ORDER[nextIndex];
    setSelectedLanguage(nextLang);
    toast.success(`${t('settings.language')}: ${getLanguageLabel(nextLang)}`);
  };

  if (!isOpen) {
    return (
      <Button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 h-14 w-14 rounded-full shadow-lg bg-primary hover:bg-primary/90 z-50"
        size="icon"
        title={t('farmer.assistant.open')}
      >
        <MessageSquare className="h-6 w-6" />
      </Button>
    );
  }

  return (
    <Card className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 w-[360px] max-w-[calc(100vw-1rem)] h-[540px] max-h-[calc(100vh-2rem)] sm:max-h-[calc(100vh-6rem)] shadow-xl z-50 flex flex-col">
      <CardHeader className="pb-2 border-b flex-shrink-0">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
              <Bot className="h-5 w-5 text-primary" />
            </div>
            <div className="min-w-0">
              <CardTitle className="text-base truncate">{t('farmer.assistant.title')}</CardTitle>
              <p className="text-xs text-muted-foreground truncate">{t('farmer.assistant.subtitle')}</p>
            </div>
          </div>
          <div className="flex items-center gap-1 flex-shrink-0">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={cycleLanguage}
              title={t('farmer.assistant.changeLanguage')}
            >
              <Languages className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => {
                stopAllPlayback();
                setIsOpen(false);
              }}
              title={t('common.close')}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
        <div className="flex items-center justify-between mt-2 gap-2">
          <Badge variant="secondary" className="text-xs">
            {getLanguageLabel(selectedLanguage)}
          </Badge>
          <div className="flex items-center gap-2">
            <Label htmlFor="voice-reply" className="text-xs text-muted-foreground cursor-pointer">
              {t('farmer.assistant.voiceReply')}
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
        <ScrollArea className="flex-1 p-4" ref={scrollRef}>
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-4">
              <Bot className="h-12 w-12 text-muted-foreground/50 mb-3" />
              <h3 className="font-medium text-sm mb-1">{t('farmer.assistant.welcome')}</h3>
              <p className="text-xs text-muted-foreground mb-3 leading-relaxed">
                {t('farmer.assistant.intro')}
              </p>
              <div className="flex flex-wrap gap-2 justify-center">
                {quickPrompts.map((prompt) => (
                  <Badge
                    key={prompt.id}
                    variant="outline"
                    className="cursor-pointer hover:bg-accent text-xs"
                    onClick={() => void handleSendMessage(t(prompt.messageKey))}
                  >
                    {t(prompt.labelKey)}
                  </Badge>
                ))}
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
                  <div className="flex flex-col gap-1 max-w-[82%]">
                    {msg.role === 'assistant' && (
                      <div className="flex gap-1 flex-wrap">
                        {msg.personalized && (
                          <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4 gap-0.5">
                            <Sparkles className="h-2.5 w-2.5" />
                            {t('badges.personalized')}
                          </Badge>
                        )}
                        {msg.webVerified && (
                          <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 gap-0.5 border-blue-300 text-blue-600">
                            <Globe className="h-2.5 w-2.5" />
                            {t('badges.webVerified')}
                          </Badge>
                        )}
                      </div>
                    )}
                    <div
                      className={`rounded-lg px-3 py-2 text-sm leading-relaxed break-words ${
                        msg.role === 'user'
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted'
                      }`}
                    >
                      {msg.content}
                    </div>

                    {msg.role === 'assistant' && Array.isArray(msg.suggestions) && msg.suggestions.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {msg.suggestions.slice(0, 2).map((suggestion, idx) => (
                          <Badge
                            key={`${msg.id}-s-${idx}`}
                            variant="outline"
                            className="cursor-pointer hover:bg-accent text-[10px]"
                            onClick={() => void handleSendMessage(suggestion)}
                          >
                            {suggestion}
                          </Badge>
                        ))}
                      </div>
                    )}

                    {msg.role === 'assistant' && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-fit px-2 text-xs gap-1 self-start"
                        onClick={() => void playAudio(msg.id)}
                        disabled={msg.audioLoading}
                        title={t('farmer.assistant.playVoice')}
                      >
                        {msg.audioLoading ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : playingMessageId === msg.id ? (
                          <Pause className="h-3 w-3" />
                        ) : (
                          <Play className="h-3 w-3" />
                        )}
                        {msg.audioLoading
                          ? t('common.loading')
                          : playingMessageId === msg.id
                            ? t('common.stop')
                            : t('common.play')}
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

        <div className="p-3 border-t flex-shrink-0">
          <div className="flex items-center gap-2">
            <Button
              variant={isListening ? 'destructive' : 'outline'}
              size="icon"
              className="h-10 w-10 flex-shrink-0"
              onClick={isListening ? stopListening : startListening}
              disabled={isLoading}
              title={isListening ? t('farmer.assistant.stopListening') : t('farmer.assistant.startListening')}
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
              placeholder={isListening ? t('farmer.assistant.listening') : t('farmer.assistant.typeOrSpeak')}
              className="flex-1"
              disabled={isListening || isLoading}
            />
            <Button
              size="icon"
              className="h-10 w-10 flex-shrink-0"
              onClick={() => void handleSendMessage()}
              disabled={!inputText.trim() || isLoading}
              title={t('farmer.assistant.send')}
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
              {t('farmer.assistant.speakNow')} {getLanguageLabel(selectedLanguage)}...
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default VoiceAssistant;
