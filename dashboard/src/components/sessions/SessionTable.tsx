import { Link } from 'react-router-dom';
import { ChevronLeft, ChevronRight, FileX } from 'lucide-react';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import { formatKas, formatDateTime, truncateAddress, cn } from '@/lib/utils';
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
      <div className="space-y-3 p-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="p-4 rounded-lg bg-zn-alt">
            <div className="flex items-center gap-4">
              <Skeleton className="h-5 w-24" />
              <Skeleton className="h-5 w-16" />
              <Skeleton className="h-5 w-32 hidden md:block" />
              <Skeleton className="h-5 w-28 hidden md:block" />
              <Skeleton className="h-5 w-20 ml-auto" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (sessions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-4">
        <div className="w-16 h-16 rounded-lg bg-zn-alt flex items-center justify-center mb-4">
          <FileX className="h-8 w-8 text-zn-muted" />
        </div>
        <p className="text-zn-text font-medium text-lg mb-1">No payments found</p>
        <p className="text-zn-secondary text-sm text-center">
          Payments will show up here when customers start checking out
        </p>
      </div>
    );
  }

  return (
    <div>
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-zn-border bg-zn-surface/50">
              <th className="text-left h-10 px-5 text-[11px] font-medium text-zn-muted uppercase tracking-[0.05em]">Order ID</th>
              <th className="text-left h-10 px-5 text-[11px] font-medium text-zn-muted uppercase tracking-[0.05em]">Status</th>
              <th className="text-left h-10 px-5 text-[11px] font-medium text-zn-muted uppercase tracking-[0.05em]">Amount</th>
              <th className="text-left h-10 px-5 text-[11px] font-medium text-zn-muted uppercase tracking-[0.05em]">Address</th>
              <th className="text-left h-10 px-5 text-[11px] font-medium text-zn-muted uppercase tracking-[0.05em]">Created</th>
            </tr>
          </thead>
          <tbody>
            {sessions.map((session, idx) => (
              <tr
                key={session.id}
                className={cn(
                  'h-[52px] hover:bg-zn-accent/[0.03] transition-colors',
                  idx < sessions.length - 1 && 'border-b border-zn-border'
                )}
              >
                <td className="px-5">
                  <Link to={`/sessions/${session.id}`} className="text-zn-link hover:text-zn-link font-medium font-mono">
                    {session.orderId}
                  </Link>
                </td>
                <td className="px-5"><StatusBadge status={session.status} /></td>
                <td className="px-5 text-zn-text font-medium font-mono">{formatKas(session.amount)}</td>
                <td className="px-5">
                  <span className="font-mono text-sm bg-zn-alt text-zn-secondary px-2 py-1 rounded">
                    {truncateAddress(session.address)}
                  </span>
                </td>
                <td className="px-5 text-xs text-zn-secondary">{formatDateTime(session.createdAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="md:hidden space-y-3 p-4">
        {sessions.map((session) => (
          <Link
            key={session.id}
            to={`/sessions/${session.id}`}
            className="block p-4 rounded-lg bg-zn-alt border border-zn-border hover:border-zn-border-strong"
          >
            <div className="flex items-center justify-between mb-3">
              <span className="font-medium text-zn-link">{session.orderId}</span>
              <StatusBadge status={session.status} />
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-zn-text font-medium">{formatKas(session.amount)}</span>
              <span className="text-zn-secondary">{formatDateTime(session.createdAt)}</span>
            </div>
          </Link>
        ))}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between px-5 py-3 border-t border-zn-border">
          <span className="text-sm text-zn-secondary">
            Showing <span className="text-zn-text font-medium">{offset + 1}</span>-
            <span className="text-zn-text font-medium">{Math.min(offset + limit, total)}</span> of{' '}
            <span className="text-zn-text font-medium">{total}</span>
          </span>
          <div className="flex items-center gap-2">
            <Button variant="secondary" size="sm" onClick={() => onPageChange(Math.max(0, offset - limit))} disabled={!hasPrev}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm text-zn-secondary px-3">
              Page <span className="text-zn-text font-medium">{currentPage}</span> of{' '}
              <span className="text-zn-text font-medium">{totalPages}</span>
            </span>
            <Button variant="secondary" size="sm" onClick={() => onPageChange(offset + limit)} disabled={!hasNext}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
