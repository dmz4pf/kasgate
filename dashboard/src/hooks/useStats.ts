import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { Stats } from '@/types';

export function useStats() {
  return useQuery<Stats>({
    queryKey: ['stats'],
    queryFn: () => api.getStats(),
    refetchInterval: 30000, // Refetch every 30 seconds
  });
}
