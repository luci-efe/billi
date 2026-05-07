import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import Transactions from '../transactions';

const mockCreateTransaction = vi.fn();

vi.mock('@/hooks/use-transactions', () => ({
  useTransactions: () => ({
    transactions: [],
    isLoading: false,
    createTransaction: mockCreateTransaction,
    bulkDelete: vi.fn(),
    bulkUpdateCategory: vi.fn(),
  }),
}));

vi.mock('@/hooks/use-documents', () => ({
  useDocuments: () => ({ documents: [], isLoading: false, refresh: vi.fn() }),
}));

vi.mock('@/components/EvidenceUploader', () => ({
  default: () => <div>Evidence uploader</div>,
}));

vi.mock('@/components/EvidenceViewer', () => ({
  default: () => <div>Evidence viewer</div>,
}));

describe('Transactions create dialog', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCreateTransaction.mockResolvedValue({ id: 'tx_123' });
  });

  it('submits the API payload with default type and category selections', async () => {
    render(
      <MemoryRouter initialEntries={[{ pathname: '/transactions', state: { openCreate: true } }]}>
        <Routes>
          <Route path="/transactions" element={<Transactions />} />
        </Routes>
      </MemoryRouter>,
    );

    fireEvent.change(screen.getByRole('textbox', { name: /concepto/i }), {
      target: { value: 'Café de prueba' },
    });
    fireEvent.change(screen.getByRole('spinbutton', { name: /monto \(mxn\)/i }), {
      target: { value: '120' },
    });
    fireEvent.click(screen.getByRole('button', { name: /guardar movimiento/i }));

    await waitFor(() => {
      expect(mockCreateTransaction).toHaveBeenCalledTimes(1);
    });

    expect(mockCreateTransaction).toHaveBeenCalledWith(
      expect.objectContaining({
        note: 'Café de prueba',
        category: 'Otros',
        amountCents: 12_000,
        type: 'expense',
        source: 'form',
      }),
    );

    expect(mockCreateTransaction.mock.calls[0]?.[0]?.occurredAt).toEqual(expect.any(Number));
  });
});
