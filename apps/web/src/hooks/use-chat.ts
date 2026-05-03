import { useState, useEffect } from 'react';
import { apiClient } from '../lib/api-client';

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

export function useChat() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'assistant',
      content: '¡Hola! Soy Billi, tu asistente financiero. ¿En qué puedo ayudarte hoy?',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    }
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const [threadId, setThreadId] = useState<string | null>(null);

  // Load threadId from localStorage on mount
  useEffect(() => {
    const savedThreadId = localStorage.getItem('billi_chat_thread_id');
    if (savedThreadId) {
      setThreadId(savedThreadId);
    }
  }, []);

  const sendMessage = async (content: string) => {
    if (!content.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMessage]);
    setIsLoading(true);

    try {
      const res = await apiClient.post('/api/ai/chat', { 
        message: content,
        threadId: threadId || undefined
      });

      if (!res.ok) {
        throw new Error('Failed to get response from Billi');
      }

      const data = await res.json();
      
      if (data.threadId && data.threadId !== threadId) {
        setThreadId(data.threadId);
        localStorage.setItem('billi_chat_thread_id', data.threadId);
      }

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: data.text,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch {
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: 'Lo siento, hubo un error al procesar tu solicitud. Por favor intenta de nuevo.',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const clearChat = () => {
    localStorage.removeItem('billi_chat_thread_id');
    setThreadId(null);
    setMessages([{
      id: '1',
      role: 'assistant',
      content: '¡Hola! Soy Billi, tu asistente financiero. ¿En qué puedo ayudarte hoy?',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    }]);
  };

  return { messages, isLoading, sendMessage, clearChat };
}
