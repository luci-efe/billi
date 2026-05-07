import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import Chat from '../chat';

const mockSendMessage = vi.fn();
const mockClearChat = vi.fn();
const mockSubmitCapture = vi.fn();
const mockConfirmProposal = vi.fn();
const mockResetCapture = vi.fn();

vi.mock('@/hooks/use-chat', () => ({
  useChat: () => ({
    messages: [
      {
        id: '1',
        role: 'assistant' as const,
        content: '¡Hola! Soy Billi, tu asistente financiero. ¿En qué puedo ayudarte hoy?',
        timestamp: '10:00',
      },
    ],
    isLoading: false,
    sendMessage: mockSendMessage,
    clearChat: mockClearChat,
  }),
}));

vi.mock('@/hooks/use-capture', () => ({
  useCapture: () => ({
    proposal: null,
    confidence: null,
    lowConfidenceFields: [],
    error: null,
    isLoading: false,
    submitCapture: mockSubmitCapture,
    confirmProposal: mockConfirmProposal,
    reset: mockResetCapture,
  }),
}));

vi.mock('@/components/CaptureProposalReview', () => ({
  default: () => null,
}));

describe('Chat route', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSendMessage.mockResolvedValue(undefined);
    mockSubmitCapture.mockResolvedValue({ confidence: 0.9, proposal: undefined, error: 'needs review' });
  });

  it('routes the registration suggestion to the capture flow', async () => {
    render(
      <MemoryRouter>
        <Chat />
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByRole('button', { name: /registra que gasté 200 pesos en gasolina/i }));

    await waitFor(() => {
      expect(mockSubmitCapture).toHaveBeenCalledWith({
        message: 'Registra que gasté 200 pesos en gasolina',
        imageUrl: undefined,
        sourceHint: 'chat',
      });
    });

    expect(mockSendMessage).not.toHaveBeenCalled();
  });

  it('confirma antes de borrar la conversación', async () => {
    render(
      <MemoryRouter>
        <Chat />
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByRole('button', { name: /borrar chat/i }));

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText(/Esta acción eliminará los mensajes guardados/i)).toBeInTheDocument();
    expect(mockClearChat).not.toHaveBeenCalled();

    const dialog = screen.getByRole('dialog');
    fireEvent.click(within(dialog).getByRole('button', { name: /borrar chat/i }));

    await waitFor(() => {
      expect(mockClearChat).toHaveBeenCalledTimes(1);
    });
  });
});
