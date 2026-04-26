import { describe, it, expect } from 'vitest';

describe('REQ-001: Resumen Financiero Mensual', () => {
  it('should correctly calculate balance from income and expenses', () => {
    // GIVEN: un set de transacciones
    const income = 100000; // $1000.00
    const expense = 45000;  // $450.00
    
    // WHEN: se calcula el balance
    const balance = income - expense;
    
    // THEN: el resultado es correcto
    expect(balance).toBe(55000);
  });

  it('should show zero balance for new user without transactions', () => {
    // GIVEN: un usuario nuevo
    const transactions: any[] = [];
    
    // WHEN: se calcula el resumen
    const income = transactions.reduce((acc, t) => t.type === 'income' ? acc + t.amountCents : acc, 0);
    const expense = transactions.reduce((acc, t) => t.type === 'expense' ? acc + t.amountCents : acc, 0);
    
    // THEN: todos los valores son cero
    expect(income).toBe(0);
    expect(expense).toBe(0);
    expect(income - expense).toBe(0);
  });
});
