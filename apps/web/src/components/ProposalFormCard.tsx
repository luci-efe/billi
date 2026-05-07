import { useEffect, useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import type { CaptureProposal } from '@/hooks/use-capture';

export type ProposalFormVariant = 'modal' | 'inline';

export interface ProposalFormCardProps {
  proposal: CaptureProposal | null;
  confidence?: number | null;
  lowConfidenceFields: string[];
  isLoading?: boolean;
  error?: string | null;
  onConfirm: (proposal: CaptureProposal) => Promise<void> | void;
  onCancel?: () => void;
  variant?: ProposalFormVariant;
}

const CATEGORIES = [
  'Comida',
  'Transporte',
  'Salario',
  'Renta',
  'Entretenimiento',
  'Otros',
];

function isLowConfidence(field: string, lowFields: string[]): boolean {
  return lowFields.includes(field);
}

function fmtAmountInput(cents: number): string {
  return (cents / 100).toFixed(2);
}

function parseAmountInput(value: string): number {
  const n = Number(value);
  if (!Number.isFinite(n)) return 0;
  return Math.round(n * 100);
}

function todayISO(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * ProposalFormCard — editable transaction proposal form.
 *
 * Pure presentational component: never calls APIs. Consumers (the modal
 * Capture flow or the inline chat flow) handle persistence via callbacks.
 */
export function ProposalFormCard({
  proposal,
  confidence,
  lowConfidenceFields,
  isLoading,
  error,
  onConfirm,
  onCancel,
  variant = 'inline',
}: ProposalFormCardProps) {
  const [draft, setDraft] = useState<CaptureProposal | null>(proposal);

  useEffect(() => {
    setDraft(proposal);
  }, [proposal]);

  const lowConfidenceWarning =
    typeof confidence === 'number' && confidence < 0.7;

  const handleConfirm = async () => {
    if (!draft) return;
    await onConfirm(draft);
  };

  if (!draft) {
    return (
      <p className="text-sm text-muted-foreground">No hay propuesta que revisar.</p>
    );
  }

  const wrapperClass =
    variant === 'inline'
      ? 'mt-2 rounded-xl border border-border bg-background/80 p-3'
      : '';

  return (
    <div className={wrapperClass} data-testid="proposal-form-card">
      <div className="grid gap-3" data-testid="capture-proposal-form">
        {lowConfidenceWarning && (
          <div className="rounded-md border border-amber-500/40 bg-amber-500/10 p-2 text-xs text-amber-700 dark:text-amber-300">
            Confianza baja ({typeof confidence === 'number' ? Math.round(confidence * 100) : 0}%).
            Revisa los campos resaltados.
          </div>
        )}
        {error && (
          <div className="rounded-md border border-rose-500/40 bg-rose-500/10 p-2 text-xs text-rose-700 dark:text-rose-300">
            {error}
          </div>
        )}

        <div className="grid gap-1.5">
          <Label
            htmlFor="cp-amount"
            className={cn(
              isLowConfidence('amountCents', lowConfidenceFields) && 'text-amber-700 dark:text-amber-400',
            )}
          >
            Monto (MXN)
          </Label>
          <Input
            id="cp-amount"
            type="number"
            step="0.01"
            value={fmtAmountInput(draft.amountCents)}
            onChange={(e) =>
              setDraft({ ...draft, amountCents: parseAmountInput(e.target.value) })
            }
            className={cn(
              'border-border bg-background',
              isLowConfidence('amountCents', lowConfidenceFields) && 'border-amber-500',
            )}
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="grid gap-1.5">
            <Label
              htmlFor="cp-type"
              className={cn(
                isLowConfidence('type', lowConfidenceFields) && 'text-amber-700 dark:text-amber-400',
              )}
            >
              Tipo
            </Label>
            <Select
              value={draft.type}
              onValueChange={(v: string | null) =>
                v && setDraft({ ...draft, type: v as 'income' | 'expense' })
              }
            >
              <SelectTrigger
                id="cp-type"
                className={cn(
                  'border-border bg-background',
                  isLowConfidence('type', lowConfidenceFields) && 'border-amber-500',
                )}
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="income">Ingreso</SelectItem>
                <SelectItem value="expense">Egreso</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-1.5">
            <Label
              htmlFor="cp-category"
              className={cn(
                isLowConfidence('category', lowConfidenceFields) && 'text-amber-700 dark:text-amber-400',
              )}
            >
              Categoría
            </Label>
            <Select
              value={draft.category || 'Otros'}
              onValueChange={(v: string | null) => v && setDraft({ ...draft, category: v })}
            >
              <SelectTrigger
                id="cp-category"
                className={cn(
                  'border-border bg-background',
                  isLowConfidence('category', lowConfidenceFields) && 'border-amber-500',
                )}
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CATEGORIES.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid gap-1.5">
          <Label
            htmlFor="cp-date"
            className={cn(
              isLowConfidence('date', lowConfidenceFields) && 'text-amber-700 dark:text-amber-400',
            )}
          >
            Fecha
          </Label>
          <Input
            id="cp-date"
            type="date"
            value={draft.date || todayISO()}
            onChange={(e) => setDraft({ ...draft, date: e.target.value })}
            className={cn(
              'border-border bg-background',
              isLowConfidence('date', lowConfidenceFields) && 'border-amber-500',
            )}
          />
        </div>

        <div className="grid gap-1.5">
          <Label
            htmlFor="cp-merchant"
            className={cn(
              isLowConfidence('merchant', lowConfidenceFields) && 'text-amber-700 dark:text-amber-400',
            )}
          >
            Comercio
          </Label>
          <Input
            id="cp-merchant"
            value={draft.merchant ?? ''}
            onChange={(e) => setDraft({ ...draft, merchant: e.target.value })}
            placeholder="Opcional"
            className={cn(
              'border-border bg-background',
              isLowConfidence('merchant', lowConfidenceFields) && 'border-amber-500',
            )}
          />
        </div>

        <div className="grid gap-1.5">
          <Label htmlFor="cp-note">Nota</Label>
          <Input
            id="cp-note"
            value={draft.note ?? ''}
            onChange={(e) => setDraft({ ...draft, note: e.target.value })}
            placeholder="Detalle adicional"
            className="border-border bg-background"
          />
        </div>
      </div>

      <div
        className={cn(
          'flex justify-end gap-2',
          variant === 'inline' ? 'mt-3' : 'mt-4',
        )}
      >
        {onCancel && (
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={isLoading}
          >
            Cancelar
          </Button>
        )}
        <Button
          type="button"
          onClick={handleConfirm}
          disabled={!draft || isLoading}
          className="bg-indigo-600 hover:bg-indigo-500 text-white"
        >
          {isLoading ? 'Guardando…' : 'Confirmar'}
        </Button>
      </div>
    </div>
  );
}

export default ProposalFormCard;
