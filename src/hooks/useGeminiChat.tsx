import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface ChatMessage {
  role: 'user' | 'model';
  content: string;
}

export const useGeminiChat = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const sendMessage = useCallback(async (userId: string, message: string) => {
    setIsLoading(true);
    setMessages((prev) => [...prev, { role: 'user', content: message }]);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-gateway/gemini/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
          apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        },
        body: JSON.stringify({ user_id: userId, session_id: sessionId, message }),
      });
      const data = await res.json();

      if (!res.ok) throw new Error(data?.error?.message || 'Function error');

      setSessionId(data.session_id ?? sessionId);
      setMessages((prev) => [...prev, { role: 'model', content: data.reply }]);
      return data;
    } catch (err) {
      console.error('Gemini chat error:', err);
      setMessages((prev) => [
        ...prev,
        { role: 'model', content: 'Sorry, something went wrong. Please try again.' },
      ]);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [sessionId]);

  const resetChat = useCallback(() => {
    setMessages([]);
    setSessionId(null);
  }, []);

  return { messages, sessionId, isLoading, sendMessage, resetChat };
};
