import { cn } from '@/lib/utils';
import type { SessionStatus } from '@/types';

interface StatusBadgeProps {
  status: SessionStatus;
  className?: string;
}

const statusConfig: Record<SessionStatus, { bg: string; text: string }> = {
  pending: { bg: 'bg-zn-gold/10', text: 'text-zn-gold' },
  confirming: { bg: 'bg-zn-link/10', text: 'text-zn-link' },
  confirmed: { bg: 'bg-zn-success/10', text: 'text-zn-success' },
  expired: { bg: 'bg-zn-error/10', text: 'text-zn-error' },
  failed: { bg: 'bg-zn-error/10', text: 'text-zn-error' },
};

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const config = statusConfig[status] || statusConfig.expired;
  const label = status.charAt(0).toUpperCase() + status.slice(1);

  return (
    <span
      className={cn(
        'inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-medium uppercase tracking-wider',
        config.bg,
        config.text,
        className
      )}
    >
      {label}
    </span>
  );
}
