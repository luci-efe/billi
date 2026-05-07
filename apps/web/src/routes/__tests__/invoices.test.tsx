import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import Invoices from '../invoices';

const mockTransactions = vi.fn();
const mockUseDocuments = vi.fn();

vi.mock('@/hooks/use-transactions', () => ({
  useTransactions: () => ({
    transactions: mockTransactions(),
    isLoading: false,
    error: null,
  }),
}));

vi.mock('@/hooks/use-documents', () => ({
  useDocuments: (transactionId: string | null) => mockUseDocuments(transactionId),
}));

vi.mock('@/components/EvidenceUploader', () => ({
  default: ({ transactionId, onUploaded }: { transactionId: string; onUploaded?: () => void }) => (
    <button type="button" onClick={onUploaded} data-testid={`uploader-${transactionId}`}>
      Subir comprobante {transactionId}
    </button>
  ),
}));

vi.mock('@/components/EvidenceViewer', () => ({
  default: ({ documents, onDeleted }: { documents: Array<{ fileName: string }>; onDeleted?: () => void }) => (
    <div data-testid="viewer">
      <button type="button" onClick={onDeleted}>Eliminar comprobante</button>
      {documents.map((doc) => (
        <span key={doc.fileName}>{doc.fileName}</span>
      ))}
    </div>
  ),
}));

describe('Invoices route', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockTransactions.mockReturnValue([]);
    mockUseDocuments.mockReturnValue({ documents: [], isLoading: false, error: null, refresh: vi.fn() });
  });

  it('muestra un estado vacío útil sin prometer capacidades no soportadas', () => {
    render(
      <MemoryRouter>
        <Invoices />
      </MemoryRouter>,
    );

    expect(screen.queryByText(/En construcción/i)).not.toBeInTheDocument();
    expect(screen.getByText(/Aún no tienes movimientos para documentar/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Registrar primer movimiento/i })).toBeInTheDocument();
    expect(screen.getByText(/comprobantes PDF e imagen/i)).toBeInTheDocument();
  });

  it('renderiza el flujo de comprobantes adjuntos y refresca al subir o eliminar', () => {
    const refresh = vi.fn();
    mockTransactions.mockReturnValue([
      {
        id: 'tx_1',
        type: 'expense',
        amountCents: 12_500,
        category: 'Comida',
        occurredAt: 1_735_689_600,
        note: 'Cena de equipo',
      },
    ]);
    mockUseDocuments.mockReturnValue({
      documents: [{ id: 'doc_1', fileName: 'ticket.pdf', fileType: 'application/pdf', fileSize: 1024, createdAt: 1 }],
      isLoading: false,
      error: null,
      refresh,
    });

    render(
      <MemoryRouter>
        <Invoices />
      </MemoryRouter>,
    );

    expect(mockUseDocuments).toHaveBeenLastCalledWith('tx_1');
    expect(screen.getByText('Cena de equipo')).toBeInTheDocument();
    expect(screen.getByText(/1 comprobante/i)).toBeInTheDocument();
    expect(screen.getByTestId('uploader-tx_1')).toBeInTheDocument();
    expect(screen.getByText('ticket.pdf')).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('uploader-tx_1'));
    fireEvent.click(screen.getByRole('button', { name: /Eliminar comprobante/i }));

    expect(refresh).toHaveBeenCalledTimes(2);
  });
});
