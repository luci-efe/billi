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

export function useTransactions(filters?: { from?: number; to?: number; category?: string; type?: string }) {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchTransactions = async () => {
    try {
      setIsLoading(true);
      const queryParams = new URLSearchParams();
      if (filters?.from) queryParams.append('from', filters.from.toString());
      if (filters?.to) queryParams.append('to', filters.to.toString());
      if (filters?.category && filters.category !== 'all') queryParams.append('category', filters.category);
      if (filters?.type && filters.type !== 'all') queryParams.append('type', filters.type);

      const qs = queryParams.toString() ? `?${queryParams.toString()}` : '';
      const res = await apiClient.get(`/api/transactions${qs}`);
      
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
  }, [filters?.from, filters?.to, filters?.category, filters?.type]);

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
