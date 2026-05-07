import { useState, useCallback } from 'react';
import { apiClient } from '../lib/api-client';

export interface CaptureProposal {
  amountCents: number;
  category: string;
  type: 'income' | 'expense';
  date: string;
  merchant?: string;
  note?: string;
}

export interface CaptureResult {
  proposal?: CaptureProposal;
  confidence: number;
  error?: string;
  lowConfidenceFields?: string[];
}

export interface CaptureInput {
  message?: string;
  imageUrl?: string;
  sourceHint?: 'chat' | 'image' | 'text';
}

/**
 * useCapture — drives the AI capture pipeline.
 *
 * 1. submitCapture(input) → POST /api/capture, returns proposal+confidence.
 * 2. confirmProposal(proposal) → POST /api/transactions to persist it.
 *
 * Mirrors use-chat.ts: useState for proposal/error; isLoading; clears on success.
 * source is derived from the input shape: imageUrl → 'image', else 'text'.
 */
export function useCapture() {
  const [proposal, setProposal] = useState<CaptureProposal | null>(null);
  const [confidence, setConfidence] = useState<number | null>(null);
  const [lowConfidenceFields, setLowConfidenceFields] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [lastSource, setLastSource] = useState<'chat' | 'image' | 'text' | null>(null);

  const reset = useCallback(() => {
    setProposal(null);
    setConfidence(null);
    setLowConfidenceFields([]);
    setError(null);
    setLastSource(null);
  }, []);

  const submitCapture = useCallback(async (input: CaptureInput): Promise<CaptureResult> => {
    if (!input.message && !input.imageUrl) {
      const msg = 'Necesitas escribir un mensaje o adjuntar una imagen.';
      setError(msg);
      return { confidence: 0, error: msg };
    }

    setIsLoading(true);
    setError(null);

    const source: 'chat' | 'image' | 'text' = input.imageUrl
      ? 'image'
      : input.sourceHint ?? 'text';
    setLastSource(source);

    try {
      const res = await apiClient.post('/api/capture', input);
      const data = (await res.json()) as CaptureResult;

      if (!res.ok) {
        const msg = data?.error
          ? `Error al capturar: ${data.error}`
          : 'No pudimos procesar la solicitud. Intenta de nuevo.';
        setError(msg);
        return { confidence: 0, error: msg };
      }

      if (data.error) {
        setError(data.error);
      }
      setProposal(data.proposal ?? null);
      setConfidence(typeof data.confidence === 'number' ? data.confidence : 0);
      setLowConfidenceFields(data.lowConfidenceFields ?? []);
      return data;
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error desconocido al capturar.';
      setError(msg);
      return { confidence: 0, error: msg };
    } finally {
      setIsLoading(false);
    }
  }, []);

  const confirmProposal = useCallback(async (next: CaptureProposal): Promise<{ id: string }> => {
    setIsLoading(true);
    setError(null);
    try {
      const parseOccurredAt = (value: string): number => {
        if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
          const [year, month, day] = value.split('-').map(Number);
          return Math.floor(new Date(year, month - 1, day, 0, 0, 0, 0).getTime() / 1000);
        }

        const ts = Date.parse(value);
        return Number.isNaN(ts) ? Math.floor(Date.now() / 1000) : Math.floor(ts / 1000);
      };

      const body = {
        type: next.type,
        amountCents: next.amountCents,
        category: next.category,
        note: next.note ?? next.merchant ?? '',
        occurredAt: parseOccurredAt(next.date),
        source: lastSource ?? 'text',
      };
      const res = await apiClient.post('/api/transactions', body);
      if (!res.ok) {
        const data = await res.json().catch(() => ({} as { error?: string }));
        const msg =
          (data && typeof data === 'object' && 'error' in data && (data as { error?: string }).error) ||
          'No pudimos registrar el movimiento.';
        setError(msg);
        throw new Error(msg);
      }
      const created = (await res.json()) as { id: string };
      // success → clear proposal state
      reset();
      return created;
    } finally {
      setIsLoading(false);
    }
  }, [lastSource, reset]);

  return {
    proposal,
    confidence,
    lowConfidenceFields,
    error,
    isLoading,
    submitCapture,
    confirmProposal,
    reset,
  };
}
