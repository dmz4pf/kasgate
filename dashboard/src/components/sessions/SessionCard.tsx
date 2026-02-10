import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { formatKas, formatRelativeTime, truncateAddress } from '@/lib/utils';
import type { Session } from '@/types';

interface SessionCardProps {
  session: Session;
}

export function SessionCard({ session }: SessionCardProps) {
  return (
    <Link to={`/dashboard/sessions/${session.id}`}>
      <Card className="hover:bg-[#1c2535] transition-colors cursor-pointer">
        <div className="flex items-center justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 mb-2">
              <StatusBadge status={session.status} />
              <span className="text-sm text-[#9ca3af]">
                {formatRelativeTime(session.createdAt)}
              </span>
            </div>
            <p className="text-[#e5e7eb] font-medium truncate">
              Order: {session.orderId}
            </p>
            <p className="text-sm text-[#9ca3af] mt-1">
              {formatKas(session.kaspaAmount)}
            </p>
          </div>
          <div className="text-right">
            <p className="text-sm text-[#9ca3af] font-mono">
              {truncateAddress(session.kaspaAddress, 6)}
            </p>
            <ArrowRight className="h-4 w-4 text-[#9ca3af] ml-auto mt-2" />
          </div>
        </div>
      </Card>
    </Link>
  );
}
