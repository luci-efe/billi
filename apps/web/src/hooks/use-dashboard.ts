import { useState, useEffect } from 'react';
import { apiClient } from '../lib/api-client';

export interface DashboardSummary {
  income: number;
  expense: number;
  balance: number;
}

export interface Transaction {
  id: string;
  type: 'income' | 'expense';
  amountCents: number;
  category: string;
  occurredAt: number;
  note: string | null;
}

export function useDashboard() {
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [recentTransactions, setRecentTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        setIsLoading(true);
        const [summaryRes, txRes] = await Promise.all([
          apiClient.get('/api/dashboard/summary'),
          apiClient.get('/api/transactions?limit=5'),
        ]);

        if (summaryRes.ok && txRes.ok) {
          const summaryData = await summaryRes.json();
          const txData = await txRes.json();
          setSummary(summaryData);
          setRecentTransactions(txData.items || []);
        } else {
          throw new Error('Failed to fetch dashboard data');
        }
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Unknown error'));
      } finally {
        setIsLoading(false);
      }
    }

    fetchData();
  }, []);

  return { summary, recentTransactions, isLoading, error };
}
