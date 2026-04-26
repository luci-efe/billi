import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { MemoryRouter } from 'react-router';
import Landing from '../landing';
import { COPY_HASH } from '../../lib/consent';

describe('Landing Page Onboarding (BIL-1)', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  it('sign-in and sign-up CTAs are disabled when no consent exists (T3)', () => {
    render(
      <MemoryRouter>
        <Landing />
      </MemoryRouter>
    );
    
    const signInBtn = screen.getByTestId('cta-sign-in');
    const signUpBtn = screen.getByTestId('cta-sign-up');
    
    expect(signInBtn).toHaveAttribute('aria-disabled', 'true');
    expect(signUpBtn).toBeDisabled();
  });

  it('accepting consent enables CTAs (T5)', async () => {
    render(
      <MemoryRouter>
        <Landing />
      </MemoryRouter>
    );
    
    // Assert modal is present (check for the title specifically in the dialog)
    expect(screen.getByRole('heading', { name: /Billi — Aviso de privacidad simplificado/i })).toBeInTheDocument();
    
    // Click Acepto
    const acceptBtn = screen.getByRole('button', { name: /Acepto/i });
    fireEvent.click(acceptBtn);
    
    // Assert CTAs are enabled
    const signInBtn = screen.getByTestId('cta-sign-in');
    const signUpBtn = screen.getByTestId('cta-sign-up');
    
    expect(signInBtn).not.toHaveAttribute('aria-disabled', 'true');
    expect(signUpBtn).toBeEnabled();
    
    // Assert modal is gone
    await waitFor(() => {
      expect(screen.queryByRole('button', { name: /Acepto/i })).not.toBeInTheDocument();
    }, { timeout: 2000 });
  });

  it('skips modal when valid consent exists (T6)', async () => {
    const validRecord = {
      version: 1,
      acceptedAt: Math.floor(Date.now() / 1000),
      copyHash: COPY_HASH // Use the real hash
    };
    localStorage.setItem('billi.consent.v1', JSON.stringify(validRecord));
    
    render(
      <MemoryRouter>
        <Landing />
      </MemoryRouter>
    );
    
    // Modal should NOT be present
    await waitFor(() => {
      expect(screen.queryByRole('button', { name: /Acepto/i })).not.toBeInTheDocument();
    }, { timeout: 2000 });
    
    // CTAs should be enabled
    expect(screen.getByTestId('cta-sign-in')).not.toHaveAttribute('aria-disabled', 'true');
  });

  it('re-shows modal when copyHash mismatches (T8)', () => {
    const staleRecord = {
      version: 1,
      acceptedAt: Math.floor(Date.now() / 1000),
      copyHash: 'mismatching-hash'
    };
    localStorage.setItem('billi.consent.v1', JSON.stringify(staleRecord));
    
    render(
      <MemoryRouter>
        <Landing />
      </MemoryRouter>
    );
    
    // Modal should be present
    expect(screen.getByRole('heading', { name: /Billi — Aviso de privacidad simplificado/i })).toBeInTheDocument();
    
    // CTAs should be disabled
    expect(screen.getByTestId('cta-sign-in')).toHaveAttribute('aria-disabled', 'true');
  });
});
