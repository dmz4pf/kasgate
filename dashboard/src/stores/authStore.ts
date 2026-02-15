import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Merchant } from '@/types';

interface AuthState {
  apiKey: string | null;
  merchant: Merchant | null;
  isLoading: boolean;
  error: string | null;

  setApiKey: (key: string) => void;
  setMerchant: (merchant: Merchant) => void;
  setError: (error: string | null) => void;
  setLoading: (loading: boolean) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      apiKey: null,
      merchant: null,
      isLoading: false,
      error: null,

      setApiKey: (key) =>
        set({
          apiKey: key,
          error: null,
        }),

      setMerchant: (merchant) =>
        set({ merchant }),

      setError: (error) =>
        set({
          error,
          isLoading: false,
        }),

      setLoading: (loading) =>
        set({ isLoading: loading }),

      logout: () =>
        set({
          apiKey: null,
          merchant: null,
          error: null,
        }),
    }),
    {
      name: 'kasgate-auth',
    }
  )
);
