import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import ConsentModal from '../consent-modal';

describe('ConsentModal', () => {
  it('renders all six required disclosure categories (T2)', () => {
    const mockOnAccept = vi.fn();
    render(<ConsentModal onAccept={mockOnAccept} />);
    
    const requiredTexts = [
      /Clerk Inc\./i,
      /Estados Unidos/i,
      /OpenRouter/i,
      /ARCO/i,
      /cifrad/i,
      /qué datos/i
    ];
    
    requiredTexts.forEach(text => {
      expect(screen.getByText(text)).toBeInTheDocument();
    });
  });
});
