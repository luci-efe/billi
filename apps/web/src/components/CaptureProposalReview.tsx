import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ProposalFormCard } from '@/components/ProposalFormCard';
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

/**
 * Modal-shaped wrapper around ProposalFormCard. Public API kept identical
 * to the previous implementation so the existing Sparkles capture flow in
 * chat.tsx keeps working without changes at the call site.
 */
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
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Revisar movimiento</DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Confirma o ajusta los datos antes de guardar.
          </DialogDescription>
        </DialogHeader>

        <ProposalFormCard
          variant="modal"
          proposal={proposal}
          confidence={confidence}
          lowConfidenceFields={lowConfidenceFields}
          isLoading={isLoading}
          error={error}
          onConfirm={onConfirm}
          onCancel={() => onOpenChange(false)}
        />
      </DialogContent>
    </Dialog>
  );
}

export default CaptureProposalReview;
