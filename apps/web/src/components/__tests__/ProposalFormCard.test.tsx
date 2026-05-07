import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ProposalFormCard } from '@/components/ProposalFormCard';
import type { CaptureProposal } from '@/hooks/use-capture';

const baseProposal: CaptureProposal = {
  amountCents: 25000,
  category: 'Comida',
  type: 'expense',
  date: '2026-05-06',
  merchant: 'Tacos El Güero',
  note: 'cena',
};

describe('ProposalFormCard', () => {
  it('renders the proposal fields populated', () => {
    render(
      <ProposalFormCard
        proposal={baseProposal}
        confidence={0.9}
        lowConfidenceFields={[]}
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />,
    );

    expect(screen.getByLabelText(/Monto/i)).toHaveValue(250);
    expect(screen.getByLabelText(/Fecha/i)).toHaveValue('2026-05-06');
    expect(screen.getByLabelText(/Comercio/i)).toHaveValue('Tacos El Güero');
    expect(screen.getByLabelText(/Nota/i)).toHaveValue('cena');
    expect(screen.getByRole('button', { name: /confirmar/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /cancelar/i })).toBeInTheDocument();
  });

  it('calls onConfirm with edited values when amount is changed', async () => {
    const onConfirm = vi.fn();
    render(
      <ProposalFormCard
        proposal={baseProposal}
        confidence={0.9}
        lowConfidenceFields={[]}
        onConfirm={onConfirm}
        onCancel={vi.fn()}
      />,
    );

    const amountInput = screen.getByLabelText(/Monto/i);
    fireEvent.change(amountInput, { target: { value: '500.50' } });

    fireEvent.click(screen.getByRole('button', { name: /confirmar/i }));

    expect(onConfirm).toHaveBeenCalledTimes(1);
    expect(onConfirm).toHaveBeenCalledWith(
      expect.objectContaining({
        amountCents: 50050,
        category: 'Comida',
        type: 'expense',
        date: '2026-05-06',
        merchant: 'Tacos El Güero',
        note: 'cena',
      }),
    );
  });

  it('calls onCancel when the user clicks Cancelar', () => {
    const onCancel = vi.fn();
    render(
      <ProposalFormCard
        proposal={baseProposal}
        confidence={0.9}
        lowConfidenceFields={[]}
        onConfirm={vi.fn()}
        onCancel={onCancel}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: /cancelar/i }));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it('highlights low-confidence fields', () => {
    render(
      <ProposalFormCard
        proposal={baseProposal}
        confidence={0.5}
        lowConfidenceFields={['amountCents']}
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />,
    );

    const amountInput = screen.getByLabelText(/Monto/i);
    expect(amountInput.className).toMatch(/border-amber-500/);
  });
});
