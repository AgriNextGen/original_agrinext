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
      const { data, error } = await supabase.functions.invoke('gemini-chat', {
        body: { user_id: userId, session_id: sessionId, message },
      });

      if (error) throw error;

      setSessionId(data.session_id);
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
