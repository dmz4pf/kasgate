import { cn, getStatusBgColor } from '@/lib/utils';
import type { SessionStatus } from '@/types';

interface StatusBadgeProps {
  status: SessionStatus;
  className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const label = status.charAt(0).toUpperCase() + status.slice(1);

  return (
    <span
      className={cn(
        'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border',
        getStatusBgColor(status),
        className
      )}
    >
      {label}
    </span>
  );
}
