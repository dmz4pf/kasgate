import { useState } from 'react';
import { SessionTable } from '@/components/sessions/SessionTable';
import { useSessions } from '@/hooks/useSessions';
import { cn } from '@/lib/utils';

const STATUS_OPTIONS = [
  { value: '', label: 'All' },
  { value: 'pending', label: 'Pending' },
  { value: 'confirming', label: 'Confirming' },
  { value: 'confirmed', label: 'Confirmed' },
  { value: 'expired', label: 'Expired' },
  { value: 'failed', label: 'Failed' },
];

export function SessionsPage() {
  const [offset, setOffset] = useState(0);
  const [status, setStatus] = useState('');
  const limit = 10;

  const { data, isLoading } = useSessions({ limit, offset, status: status || undefined });

  const handleStatusChange = (newStatus: string) => {
    setStatus(newStatus);
    setOffset(0);
  };

  return (
    <div className="space-y-10">
      <div className="bg-zn-surface/70 backdrop-blur-xl border border-zn-border rounded-2xl overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 pb-5">
          <h2 className="text-sm font-semibold text-zn-text">All Payments</h2>
          <div className="inline-flex gap-1 p-1 bg-zn-alt rounded-lg" role="tablist">
            {STATUS_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                role="tab"
                aria-selected={status === opt.value}
                onClick={() => handleStatusChange(opt.value)}
                className={cn(
                  'px-3 py-1.5 rounded-md text-sm font-medium',
                  status === opt.value
                    ? 'bg-zn-accent/20 text-zn-accent'
                    : 'text-zn-secondary hover:text-zn-text'
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
        <SessionTable
          sessions={data?.sessions ?? []}
          isLoading={isLoading}
          total={data?.total ?? 0}
          limit={limit}
          offset={offset}
          onPageChange={setOffset}
        />
      </div>
    </div>
  );
}
