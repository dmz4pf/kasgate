import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useAuthStore } from '@/stores/authStore';
import { toast } from '@/components/ui/Toast';
import type { Merchant } from '@/types';

export function useMerchant() {
  const { setMerchant } = useAuthStore();

  return useQuery<Merchant>({
    queryKey: ['merchant'],
    queryFn: async () => {
      const merchant = await api.getMe();
      setMerchant(merchant);
      return merchant;
    },
  });
}

export function useUpdateMerchant() {
  const queryClient = useQueryClient();
  const { setMerchant } = useAuthStore();

  return useMutation({
    mutationFn: (data: Partial<Merchant>) => api.updateMe(data),
    onSuccess: (merchant) => {
      queryClient.setQueryData(['merchant'], merchant);
      setMerchant(merchant);
      toast('success', 'Profile updated successfully');
    },
    onError: (error) => {
      toast('error', error instanceof Error ? error.message : 'Failed to update profile');
    },
  });
}

export function useRegenerateApiKey() {
  const queryClient = useQueryClient();
  const { setApiKey } = useAuthStore();

  return useMutation({
    mutationFn: () => api.regenerateApiKey(),
    onSuccess: (data) => {
      setApiKey(data.apiKey);
      queryClient.invalidateQueries({ queryKey: ['merchant'] });
      toast('success', 'API key regenerated. Save it now - it won\'t be shown again!');
      return data.apiKey;
    },
    onError: (error) => {
      toast('error', error instanceof Error ? error.message : 'Failed to regenerate API key');
    },
  });
}

export function useRegenerateWebhookSecret() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => api.regenerateWebhookSecret(),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['merchant'] });
      toast('success', 'Webhook secret regenerated');
      return data.webhookSecret;
    },
    onError: (error) => {
      toast('error', error instanceof Error ? error.message : 'Failed to regenerate webhook secret');
    },
  });
}
