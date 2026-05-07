import { useState, useEffect } from 'react';
import { apiClient } from '../lib/api-client';

export interface DashboardSummary {
  income: number;
  expense: number;
  balance: number;
}

export interface CategorySummary {
  name: string;
  value: number;
}

export interface DashboardData {
  current: DashboardSummary;
  previous: DashboardSummary;
  categories: CategorySummary[];
}

export interface Transaction {
  id: string;
  type: 'income' | 'expense';
  amountCents: number;
  category: string;
  occurredAt: number;
  note: string | null;
}

export function useDashboard(period: string = 'month') {
  const [data, setData] = useState<DashboardData | null>(null);
  const [recentTransactions, setRecentTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    async function fetchData() {
      const buildPeriodRange = () => {
        const now = new Date();
        const to = Math.floor(now.getTime() / 1000);
        let from = 0;

        if (period === 'day') {
          from = Math.floor(new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime() / 1000);
        } else if (period === 'week') {
          const day = now.getDay();
          const diff = now.getDate() - day + (day === 0 ? -6 : 1);
          from = Math.floor(new Date(now.getFullYear(), now.getMonth(), diff).getTime() / 1000);
        } else if (period === 'year') {
          from = Math.floor(new Date(now.getFullYear(), 0, 1).getTime() / 1000);
        } else {
          from = Math.floor(new Date(now.getFullYear(), now.getMonth(), 1).getTime() / 1000);
        }

        return { from, to };
      };

      try {
        setIsLoading(true);
        const { from, to } = buildPeriodRange();
        const [summaryRes, txRes] = await Promise.all([
          apiClient.get(`/api/dashboard/summary?period=${period}`),
          apiClient.get(`/api/transactions?limit=5&from=${from}&to=${to}`),
        ]);

        if (summaryRes.ok && txRes.ok) {
          const summaryData = await summaryRes.json();
          const txData = await txRes.json();
          setData(summaryData);
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
  }, [period]);

  return { data, recentTransactions, isLoading, error };
}
