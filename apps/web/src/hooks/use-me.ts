/* eslint-disable */
import { useState, useEffect } from 'react';
import { useAuth } from '@clerk/clerk-react';
import { apiClient } from '../lib/api-client';

export interface User {
  userId: string;
  email: string;
  rfc: string | null;
  defaultCurrency: string;
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

export function useUpdateMe() {
  const [isUpdating, setIsUpdating] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const { mutate } = useMe();

  const updateMe = async (values: { rfc?: string; defaultCurrency?: string }) => {
    setIsUpdating(true);
    setError(null);
    try {
      const res = await apiClient.patch('/api/me', {
        body: JSON.stringify(values),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to update profile');
      }

      const updatedUser = await res.json();
      mutate(updatedUser);
      return updatedUser;
    } catch (err) {
      const e = err instanceof Error ? err : new Error('Unknown error');
      setError(e);
      throw e;
    } finally {
      setIsUpdating(false);
    }
  };

  return { updateMe, isUpdating, error };
}
