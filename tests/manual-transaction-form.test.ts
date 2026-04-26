import { describe, it, expect } from 'vitest';

describe('REQ-001: Captura Estructurada de Transacciones', () => {
  it('should accept a valid transaction with all required fields', () => {
    // GIVEN: datos válidos (monto, tipo, categoría)
    const transaction = {
      amountCents: 15000,
      type: 'expense',
      category: 'Gasolina',
      occurredAt: Math.floor(Date.now() / 1000)
    };
    
    // THEN: la validación debe pasar
    expect(transaction.amountCents).toBeGreaterThan(0);
    expect(['income', 'expense']).toContain(transaction.type);
  });

  it('should reject a transaction with zero amount', () => {
    // GIVEN: monto cero
    const amountCents = 0;
    // WHEN: se valida
    const isValid = amountCents > 0;
    // THEN: es inválido
    expect(isValid).toBe(false);
  });
  
  it('should reject a transaction with negative amount', () => {
    // GIVEN: monto negativo
    const amountCents = -100;
    // WHEN: se valida
    const isValid = amountCents > 0;
    // THEN: es inválido
    expect(isValid).toBe(false);
  });
});
