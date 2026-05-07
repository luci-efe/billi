import { useState, useEffect } from 'react';
import { apiClient } from '../lib/api-client';

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  sources?: string[];
}
const CHAT_MESSAGES_STORAGE_KEY = 'billi_chat_messages';
const CHAT_THREAD_STORAGE_KEY = 'billi_chat_thread_id';

function makeAssistantGreeting(): Message {
  return {
    id: crypto.randomUUID(),
    role: 'assistant',
    content: '¡Hola! Soy Billi, tu asistente financiero. ¿En qué puedo ayudarte hoy?',
    timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
  };
}

function makeMessage(role: Message['role'], content: string, sources?: string[]): Message {
  return {
    id: crypto.randomUUID(),
    role,
    content,
    timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    ...(sources && sources.length > 0 ? { sources } : {}),
  };
}

export function useChat() {
  const [messages, setMessages] = useState<Message[]>([makeAssistantGreeting()]);
  const [isLoading, setIsLoading] = useState(false);
  const [threadId, setThreadId] = useState<string | null>(null);

  useEffect(() => {
    const savedThreadId = localStorage.getItem(CHAT_THREAD_STORAGE_KEY);
    const savedMessages = localStorage.getItem(CHAT_MESSAGES_STORAGE_KEY);
    if (savedThreadId) {
      setThreadId(savedThreadId);
    }
    if (savedMessages) {
      try {
        const parsed = JSON.parse(savedMessages) as Message[];
        if (Array.isArray(parsed) && parsed.length > 0) {
          setMessages(parsed);
        }
      } catch {
        localStorage.removeItem(CHAT_MESSAGES_STORAGE_KEY);
      }
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(CHAT_MESSAGES_STORAGE_KEY, JSON.stringify(messages));
  }, [messages]);

  const sendMessage = async (content: string) => {
    if (!content.trim()) return;

    const userMessage = makeMessage('user', content);
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
        localStorage.setItem(CHAT_THREAD_STORAGE_KEY, data.threadId);
      }

      const assistantMessage = makeMessage('assistant', data.text, Array.isArray(data.sources) ? data.sources : undefined);
      setMessages((prev) => [...prev, assistantMessage]);
    } catch {
      const errorMessage = makeMessage(
        'assistant',
        'Lo siento, hubo un error al procesar tu solicitud. Por favor intenta de nuevo.'
      );
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const clearChat = () => {
    localStorage.removeItem(CHAT_THREAD_STORAGE_KEY);
    localStorage.removeItem(CHAT_MESSAGES_STORAGE_KEY);
    setThreadId(null);
    setMessages([makeAssistantGreeting()]);
  };

  return { messages, isLoading, sendMessage, clearChat };
}
