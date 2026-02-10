import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { WebhookLogsResponse } from '@/types';
import { toast } from '@/components/ui/Toast';

interface UseWebhookLogsParams {
  limit?: number;
  offset?: number;
  event?: string;
}

export function useWebhookLogs(params: UseWebhookLogsParams = {}) {
  return useQuery<WebhookLogsResponse>({
    queryKey: ['webhook-logs', params],
    queryFn: () => api.getWebhookLogs(params),
  });
}

export function useRetryWebhook() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (logId: string) => api.retryWebhook(logId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['webhook-logs'] });
      toast('success', 'Webhook queued for retry');
    },
    onError: (error) => {
      toast('error', error instanceof Error ? error.message : 'Failed to retry webhook');
    },
  });
}
