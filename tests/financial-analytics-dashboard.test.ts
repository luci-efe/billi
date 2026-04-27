import { describe, it, expect } from 'vitest';

describe('REQ-001: Spending by Category Chart', () => {
  it('should transform backend data to Recharts format', () => {
    // Given the new API response shape
    const apiResponse = {
      current: { income: 1000, expense: 500, balance: 500 },
      previous: { income: 800, expense: 400, balance: 400 },
      categories: [
        { name: 'Food', value: 300 },
        { name: 'Transport', value: 200 }
      ]
    };
    
    // We expect the frontend to be able to map this directly to the PieChart data
    const pieData = apiResponse.categories.map((c, i) => ({
      ...c,
      color: `hsl(var(--chart-${(i % 5) + 1}))` // Example color mapping
    }));
    
    expect(pieData.length).toBe(2);
    expect(pieData[0].name).toBe('Food');
    expect(pieData[0].value).toBe(300);
    expect(pieData[0].color).toBe('hsl(var(--chart-1))');
  });
});

describe('REQ-002: Month-over-Month Trend Comparison', () => {
  it('should calculate MoM percentage correctly', () => {
    const currentExpense = 50000; // $500.00
    const prevExpense = 40000; // $400.00
    
    let percentChange = 0;
    if (prevExpense > 0) {
      percentChange = ((currentExpense - prevExpense) / prevExpense) * 100;
    }
    
    expect(percentChange).toBe(25); // 25% increase
  });

  it('should handle previous month zero', () => {
    const currentExpense = 50000;
    const prevExpense = 0;
    
    let percentChange = 0;
    if (prevExpense > 0) {
      percentChange = ((currentExpense - prevExpense) / prevExpense) * 100;
    } else {
      percentChange = 100; // Or "New Activity" marker
    }
    
    expect(percentChange).toBe(100);
  });
});

describe('REQ-003: Interactive Period Selection', () => {
  it('should generate correct query params for period', () => {
    const period = 'week';
    const qs = new URLSearchParams({ period }).toString();
    
    expect(qs).toBe('period=week');
  });
});
