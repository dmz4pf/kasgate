import { Link } from 'react-router-dom';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import { formatKas, formatDateTime, truncateAddress } from '@/lib/utils';
import type { Session } from '@/types';

interface SessionTableProps {
  sessions: Session[];
  isLoading: boolean;
  total: number;
  limit: number;
  offset: number;
  onPageChange: (offset: number) => void;
}

export function SessionTable({
  sessions,
  isLoading,
  total,
  limit,
  offset,
  onPageChange,
}: SessionTableProps) {
  const currentPage = Math.floor(offset / limit) + 1;
  const totalPages = Math.ceil(total / limit);
  const hasPrev = offset > 0;
  const hasNext = offset + limit < total;

  if (isLoading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="p-4 border border-[#2a3444] rounded-lg">
            <Skeleton className="h-5 w-full" />
          </div>
        ))}
      </div>
    );
  }

  if (sessions.length === 0) {
    return (
      <div className="text-center py-12 text-[#9ca3af]">
        No sessions found
      </div>
    );
  }

  return (
    <div>
      {/* Desktop Table */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-[#2a3444]">
              <th className="text-left py-3 px-4 text-sm font-medium text-[#9ca3af]">
                Order ID
              </th>
              <th className="text-left py-3 px-4 text-sm font-medium text-[#9ca3af]">
                Status
              </th>
              <th className="text-left py-3 px-4 text-sm font-medium text-[#9ca3af]">
                Amount
              </th>
              <th className="text-left py-3 px-4 text-sm font-medium text-[#9ca3af]">
                Address
              </th>
              <th className="text-left py-3 px-4 text-sm font-medium text-[#9ca3af]">
                Created
              </th>
            </tr>
          </thead>
          <tbody>
            {sessions.map((session) => (
              <tr
                key={session.id}
                className="border-b border-[#2a3444] hover:bg-[#1c2535] transition-colors"
              >
                <td className="py-3 px-4">
                  <Link
                    to={`/dashboard/sessions/${session.id}`}
                    className="text-[#49EACB] hover:underline font-medium"
                  >
                    {session.orderId}
                  </Link>
                </td>
                <td className="py-3 px-4">
                  <StatusBadge status={session.status} />
                </td>
                <td className="py-3 px-4 text-[#e5e7eb]">
                  {formatKas(session.kaspaAmount)}
                </td>
                <td className="py-3 px-4 font-mono text-sm text-[#9ca3af]">
                  {truncateAddress(session.kaspaAddress)}
                </td>
                <td className="py-3 px-4 text-sm text-[#9ca3af]">
                  {formatDateTime(session.createdAt)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile Cards */}
      <div className="md:hidden space-y-3">
        {sessions.map((session) => (
          <Link
            key={session.id}
            to={`/dashboard/sessions/${session.id}`}
            className="block p-4 border border-[#2a3444] rounded-lg hover:bg-[#1c2535] transition-colors"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="font-medium text-[#49EACB]">{session.orderId}</span>
              <StatusBadge status={session.status} />
            </div>
            <div className="text-sm text-[#9ca3af]">
              {formatKas(session.kaspaAmount)} • {formatDateTime(session.createdAt)}
            </div>
          </Link>
        ))}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-4 pt-4 border-t border-[#2a3444]">
          <span className="text-sm text-[#9ca3af]">
            Showing {offset + 1}-{Math.min(offset + limit, total)} of {total}
          </span>
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => onPageChange(Math.max(0, offset - limit))}
              disabled={!hasPrev}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm text-[#9ca3af]">
              Page {currentPage} of {totalPages}
            </span>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => onPageChange(offset + limit)}
              disabled={!hasNext}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
