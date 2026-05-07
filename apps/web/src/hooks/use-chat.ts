import { useState, useEffect, useCallback } from 'react';
import { apiClient } from '../lib/api-client';
import { createTransactionFromProposal } from '../lib/transactions';
import type { CaptureProposal } from './use-capture';

export type ProposalStatus = 'pending' | 'confirmed' | 'cancelled' | 'error';

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  sources?: string[];
  proposal?: CaptureProposal;
  confidence?: number;
  lowConfidenceFields?: string[];
  proposalStatus?: ProposalStatus;
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
        threadId: threadId || undefined,
      });

      if (!res.ok) {
        throw new Error('Failed to get response from Billi');
      }

      const data = await res.json();

      if (data.threadId && data.threadId !== threadId) {
        setThreadId(data.threadId);
        localStorage.setItem(CHAT_THREAD_STORAGE_KEY, data.threadId);
      }

      const assistantMessage: Message = makeMessage(
        'assistant',
        data.text,
        Array.isArray(data.sources) ? data.sources : undefined,
      );

      if (data.proposal && typeof data.proposal === 'object') {
        assistantMessage.proposal = data.proposal as CaptureProposal;
        assistantMessage.proposalStatus = 'pending';
        if (typeof data.confidence === 'number') {
          assistantMessage.confidence = data.confidence;
        }
        if (Array.isArray(data.lowConfidenceFields)) {
          assistantMessage.lowConfidenceFields = data.lowConfidenceFields;
        }
      }

      setMessages((prev) => [...prev, assistantMessage]);
    } catch {
      const errorMessage = makeMessage(
        'assistant',
        'Lo siento, hubo un error al procesar tu solicitud. Por favor intenta de nuevo.',
      );
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const updateProposalStatus = useCallback(
    (messageId: string, status: ProposalStatus, edited?: CaptureProposal) => {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === messageId
            ? { ...m, proposalStatus: status, ...(edited ? { proposal: edited } : {}) }
            : m,
        ),
      );
    },
    [],
  );

  const confirmProposal = useCallback(
    async (messageId: string, edited: CaptureProposal): Promise<void> => {
      try {
        await createTransactionFromProposal(edited, 'chat');
        updateProposalStatus(messageId, 'confirmed', edited);
        setMessages((prev) => [
          ...prev,
          makeMessage('assistant', 'Movimiento registrado en tu cuenta.'),
        ]);
      } catch (err) {
        updateProposalStatus(messageId, 'error');
        const detail = err instanceof Error ? err.message : 'Intenta de nuevo en un momento.';
        setMessages((prev) => [
          ...prev,
          makeMessage(
            'assistant',
            `No pudimos registrar el movimiento. ${detail}`,
          ),
        ]);
      }
    },
    [updateProposalStatus],
  );

  const cancelProposal = useCallback(
    (messageId: string): void => {
      updateProposalStatus(messageId, 'cancelled');
      setMessages((prev) => [
        ...prev,
        makeMessage('assistant', 'OK, no registré nada.'),
      ]);
    },
    [updateProposalStatus],
  );

  const clearChat = () => {
    localStorage.removeItem(CHAT_THREAD_STORAGE_KEY);
    localStorage.removeItem(CHAT_MESSAGES_STORAGE_KEY);
    setThreadId(null);
    setMessages([makeAssistantGreeting()]);
  };

  return { messages, isLoading, sendMessage, clearChat, confirmProposal, cancelProposal };
}
