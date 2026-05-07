import { apiClient } from './api-client';
import type { CaptureProposal } from '@/hooks/use-capture';

export type TransactionSource = 'form' | 'text' | 'voice' | 'image' | 'chat';

/**
 * Convert a YYYY-MM-DD (or any parseable date) string into a unix timestamp
 * in seconds. Mirrors the logic that previously lived inside use-capture's
 * confirmProposal so both the capture flow and the inline chat flow share
 * the exact same date semantics.
 */
function parseOccurredAt(value: string): number {
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [year, month, day] = value.split('-').map(Number);
    return Math.floor(new Date(year, month - 1, day, 0, 0, 0, 0).getTime() / 1000);
  }
  const ts = Date.parse(value);
  return Number.isNaN(ts) ? Math.floor(Date.now() / 1000) : Math.floor(ts / 1000);
}

/**
 * Persist a CaptureProposal as a transaction. Used by both `useCapture`
 * (image / sparkles flow) and `useChat` (inline chat-confirm flow).
 *
 * Throws on non-2xx with a user-facing Spanish error message.
 */
export async function createTransactionFromProposal(
  proposal: CaptureProposal,
  source: TransactionSource,
): Promise<{ id: string }> {
  const body = {
    type: proposal.type,
    amountCents: proposal.amountCents,
    category: proposal.category,
    note: proposal.note ?? proposal.merchant ?? '',
    occurredAt: parseOccurredAt(proposal.date),
    source,
  };

  const res = await apiClient.post('/api/transactions', body);
  if (!res.ok) {
    const data = await res.json().catch(() => ({} as { error?: string }));
    const msg =
      (data && typeof data === 'object' && 'error' in data && (data as { error?: string }).error) ||
      'No pudimos registrar el movimiento.';
    throw new Error(msg);
  }
  return (await res.json()) as { id: string };
}
