import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import ValueProp from '../value-prop';

describe('ValueProp', () => {
  it('renders headline and at least three feature bullets (T1)', () => {
    render(<ValueProp />);
    
    // Assert at least one heading is present
    const headings = screen.getAllByRole('heading');
    expect(headings.length).toBeGreaterThan(0);
    
    // Assert at least 3 feature bullet items are visible
    // Assuming bullets are list items (li) or have a specific data-testid
    const listItems = screen.getAllByRole('listitem');
    expect(listItems.length).toBeGreaterThanOrEqual(3);
  });
});
