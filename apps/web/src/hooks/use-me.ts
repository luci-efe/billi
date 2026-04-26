/* eslint-disable */
import { useState, useEffect } from 'react';
import { useAuth } from '@clerk/clerk-react';
import { apiClient } from '../lib/api-client';

export interface User {
  userId: string;
  email: string;
  consentAccepted: boolean;
  consentVersion: number | null;
}

export function useMe() {
  const { isSignedIn, isLoaded: authLoaded } = useAuth();
  
  const [data, setData] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(() => !authLoaded || (authLoaded && !!isSignedIn));
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!authLoaded) return;

    if (!isSignedIn) {
      setData(null);
      setIsLoading(false);
      return;
    }

    async function fetchMe() {
      try {
        setIsLoading(true);
        const res = await apiClient.get('/api/me');
        if (!res.ok) {
          if (res.status === 401) {
            setData(null);
          } else {
            throw new Error('Failed to fetch user data');
          }
        } else {
          const userData = await res.json();
          setData(userData);
        }
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Unknown error'));
      } finally {
        setIsLoading(false);
      }
    }

    fetchMe();
  }, [isSignedIn, authLoaded]);

  return {
    data,
    isLoading: !authLoaded || isLoading,
    error,
    mutate: (newData: User | null) => setData(newData),
  };
}
