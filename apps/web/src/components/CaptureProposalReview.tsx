import { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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

export interface CaptureProposalReviewProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  proposal: CaptureProposal | null;
  confidence: number | null;
  lowConfidenceFields: string[];
  isLoading?: boolean;
  error?: string | null;
  onConfirm: (proposal: CaptureProposal) => Promise<void> | void;
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
  return new Date().toISOString().slice(0, 10);
}

export function CaptureProposalReview({
  open,
  onOpenChange,
  proposal,
  confidence,
  lowConfidenceFields,
  isLoading,
  error,
  onConfirm,
}: CaptureProposalReviewProps) {
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-slate-900 border-slate-800 text-slate-100 sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Revisar movimiento</DialogTitle>
          <DialogDescription className="text-slate-400">
            Confirma o ajusta los datos antes de guardar.
          </DialogDescription>
        </DialogHeader>

        {!draft ? (
          <p className="text-sm text-slate-400">No hay propuesta que revisar.</p>
        ) : (
          <div className="grid gap-3 py-2" data-testid="capture-proposal-form">
            {lowConfidenceWarning && (
              <div className="rounded-md border border-amber-500/40 bg-amber-500/10 p-2 text-xs text-amber-300">
                Confianza baja ({confidence !== null ? Math.round(confidence * 100) : 0}%).
                Revisa los campos resaltados.
              </div>
            )}
            {error && (
              <div className="rounded-md border border-rose-500/40 bg-rose-500/10 p-2 text-xs text-rose-300">
                {error}
              </div>
            )}

            <div className="grid gap-1.5">
              <Label htmlFor="cp-amount" className={cn(isLowConfidence('amountCents', lowConfidenceFields) && 'text-amber-400')}>
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
                  'bg-slate-950 border-slate-800',
                  isLowConfidence('amountCents', lowConfidenceFields) && 'border-amber-500',
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <Label htmlFor="cp-type" className={cn(isLowConfidence('type', lowConfidenceFields) && 'text-amber-400')}>
                  Tipo
                </Label>
                <Select
                  value={draft.type}
                  onValueChange={(v: string | null) => v && setDraft({ ...draft, type: v as 'income' | 'expense' })}
                >
                  <SelectTrigger
                    id="cp-type"
                    className={cn(
                      'bg-slate-950 border-slate-800',
                      isLowConfidence('type', lowConfidenceFields) && 'border-amber-500',
                    )}
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-900 border-slate-800 text-slate-100">
                    <SelectItem value="income">Ingreso</SelectItem>
                    <SelectItem value="expense">Egreso</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-1.5">
                <Label htmlFor="cp-category" className={cn(isLowConfidence('category', lowConfidenceFields) && 'text-amber-400')}>
                  Categoría
                </Label>
                <Select
                  value={draft.category || 'Otros'}
                  onValueChange={(v: string | null) => v && setDraft({ ...draft, category: v })}
                >
                  <SelectTrigger
                    id="cp-category"
                    className={cn(
                      'bg-slate-950 border-slate-800',
                      isLowConfidence('category', lowConfidenceFields) && 'border-amber-500',
                    )}
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-900 border-slate-800 text-slate-100">
                    {CATEGORIES.map((c) => (
                      <SelectItem key={c} value={c}>{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid gap-1.5">
              <Label htmlFor="cp-date" className={cn(isLowConfidence('date', lowConfidenceFields) && 'text-amber-400')}>
                Fecha
              </Label>
              <Input
                id="cp-date"
                type="date"
                value={draft.date || todayISO()}
                onChange={(e) => setDraft({ ...draft, date: e.target.value })}
                className={cn(
                  'bg-slate-950 border-slate-800',
                  isLowConfidence('date', lowConfidenceFields) && 'border-amber-500',
                )}
              />
            </div>

            <div className="grid gap-1.5">
              <Label htmlFor="cp-merchant" className={cn(isLowConfidence('merchant', lowConfidenceFields) && 'text-amber-400')}>
                Comercio
              </Label>
              <Input
                id="cp-merchant"
                value={draft.merchant ?? ''}
                onChange={(e) => setDraft({ ...draft, merchant: e.target.value })}
                placeholder="Opcional"
                className={cn(
                  'bg-slate-950 border-slate-800',
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
                className="bg-slate-950 border-slate-800"
              />
            </div>
          </div>
        )}

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isLoading}
          >
            Cancelar
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={!draft || isLoading}
            className="bg-indigo-600 hover:bg-indigo-500 text-white"
          >
            {isLoading ? 'Guardando…' : 'Confirmar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default CaptureProposalReview;
