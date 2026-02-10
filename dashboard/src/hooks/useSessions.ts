import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { Session, SessionsResponse } from '@/types';
import { toast } from '@/components/ui/Toast';

interface UseSessionsParams {
  limit?: number;
  offset?: number;
  status?: string;
}

export function useSessions(params: UseSessionsParams = {}) {
  return useQuery<SessionsResponse>({
    queryKey: ['sessions', params],
    queryFn: () => api.getSessions(params),
  });
}

export function useSession(id: string) {
  return useQuery<Session>({
    queryKey: ['session', id],
    queryFn: () => api.getSession(id),
    enabled: !!id,
  });
}

export function useCancelSession() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => api.cancelSession(id),
    onSuccess: (session) => {
      queryClient.invalidateQueries({ queryKey: ['sessions'] });
      queryClient.invalidateQueries({ queryKey: ['session', session.id] });
      queryClient.invalidateQueries({ queryKey: ['stats'] });
      toast('success', 'Session cancelled successfully');
    },
    onError: (error) => {
      toast('error', error instanceof Error ? error.message : 'Failed to cancel session');
    },
  });
}
