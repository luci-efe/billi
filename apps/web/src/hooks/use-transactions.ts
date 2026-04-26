import { useState, useEffect } from 'react';
import { apiClient } from '../lib/api-client';

export interface Transaction {
  id: string;
  type: 'income' | 'expense';
  amountCents: number;
  category: string;
  occurredAt: number;
  note: string | null;
}

export function useTransactions() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchTransactions = async () => {
    try {
      setIsLoading(true);
      const res = await apiClient.get('/api/transactions');
      if (res.ok) {
        const data = await res.json();
        setTransactions(data.items || []);
      } else {
        throw new Error('Failed to fetch transactions');
      }
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Unknown error'));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTransactions();
  }, []);

  const createTransaction = async (values: {
    type: 'income' | 'expense';
    amountCents: number;
    category: string;
    note: string;
    occurredAt: number;
    source: string;
  }) => {
    const res = await apiClient.post('/api/transactions', {
      body: JSON.stringify(values),
    });

    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error || 'Failed to create transaction');
    }

    await fetchTransactions();
    return res.json();
  };

  return { transactions, isLoading, error, createTransaction, refresh: fetchTransactions };
}
