import { Link } from 'react-router-dom';
import { ArrowRight, Clock } from 'lucide-react';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { formatKas, formatRelativeTime, truncateAddress } from '@/lib/utils';
import type { Session } from '@/types';

interface SessionCardProps {
  session: Session;
}

export function SessionCard({ session }: SessionCardProps) {
  return (
    <Link to={`/sessions/${session.id}`}>
      <div className="bg-zn-surface/70 backdrop-blur-xl border border-zn-border rounded-2xl p-4 hover:border-zn-accent/30 transition-colors">
        <div className="flex items-center justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 mb-3">
              <StatusBadge status={session.status} />
              <span className="text-xs text-zn-muted flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {formatRelativeTime(session.createdAt)}
              </span>
            </div>
            <p className="text-zn-text font-semibold truncate mb-1">{session.orderId}</p>
            <p className="text-sm text-zn-link font-medium">{formatKas(session.amount)}</p>
          </div>
          <div className="text-right flex flex-col items-end gap-2">
            <p className="text-xs font-mono bg-zn-alt text-zn-secondary px-2 py-1 rounded">
              {truncateAddress(session.address, 6)}
            </p>
            <div className="w-8 h-8 rounded-md flex items-center justify-center bg-zn-alt text-zn-muted">
              <ArrowRight className="h-4 w-4" />
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}
