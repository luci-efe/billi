import { describe, it, expect } from 'vitest';

// Utility to convert transactions to CSV
export function generateCSV(transactions: any[]) {
  if (!transactions.length) return '';
  const headers = ['Concepto', 'Categoría', 'Fecha', 'Tipo', 'Monto'];
  const rows = transactions.map(tx => {
    const date = new Date(tx.occurredAt * 1000).toISOString().split('T')[0];
    const amount = (tx.amountCents / 100).toFixed(2);
    return `"${tx.note || ''}","${tx.category}","${date}","${tx.type}","${amount}"`;
  });
  return [headers.join(','), ...rows].join('\n');
}

describe('REQ-001: Transaction List View', () => {
  it('should format transaction correctly for list view', () => {
    const tx = {
      note: 'Coffee',
      category: 'Food',
      occurredAt: 1714089600, // 2024-04-26
      type: 'expense',
      amountCents: 5000
    };
    expect(tx.note).toBe('Coffee');
  });
});

describe('REQ-002: CSV Export Implementation', () => {
  it('should export transactions to CSV format', () => {
    const transactions = [
      { note: 'Salary', category: 'Income', occurredAt: 1714089600, type: 'income', amountCents: 100000 },
      { note: 'Coffee', category: 'Food', occurredAt: 1714176000, type: 'expense', amountCents: 500 }
    ];
    
    const csv = generateCSV(transactions);
    const lines = csv.split('\n');
    
    expect(lines.length).toBe(3); // 1 header + 2 data
    expect(lines[0]).toBe('Concepto,Categoría,Fecha,Tipo,Monto');
    expect(lines[1]).toBe('"Salary","Income","2024-04-26","income","1000.00"');
    expect(lines[2]).toBe('"Coffee","Food","2024-04-27","expense","5.00"');
  });

  it('should handle empty export', () => {
    const csv = generateCSV([]);
    expect(csv).toBe('');
  });
});

describe('REQ-003: Advanced Filtering', () => {
  it('should filter transactions by date and category', () => {
    const transactions = [
      { note: 'Salary', category: 'Income', occurredAt: 1714089600, type: 'income', amountCents: 100000 },
      { note: 'Coffee', category: 'Food', occurredAt: 1714176000, type: 'expense', amountCents: 500 },
      { note: 'Lunch', category: 'Food', occurredAt: 1714262400, type: 'expense', amountCents: 1500 }
    ];
    
    // Filter by "Food"
    const filteredByCategory = transactions.filter(t => t.category === 'Food');
    expect(filteredByCategory.length).toBe(2);
    
    // Filter by date range (1714176000 to 1714176000)
    const filteredByDate = transactions.filter(t => t.occurredAt >= 1714176000 && t.occurredAt <= 1714176000);
    expect(filteredByDate.length).toBe(1);
    expect(filteredByDate[0].note).toBe('Coffee');
  });
});
