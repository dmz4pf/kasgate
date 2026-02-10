import { useState } from 'react';
import { Card, CardHeader, CardTitle } from '@/components/ui/Card';
import { SessionTable } from '@/components/sessions/SessionTable';
import { useSessions } from '@/hooks/useSessions';

const STATUS_OPTIONS = [
  { value: '', label: 'All Status' },
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
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#e5e7eb]">Payment Sessions</h1>
        <p className="text-[#9ca3af] mt-1">View and manage your payment sessions</p>
      </div>

      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <CardTitle>Sessions</CardTitle>
          <select
            value={status}
            onChange={(e) => handleStatusChange(e.target.value)}
            className="bg-[#0A0F14] border border-[#2a3444] rounded-lg px-3 py-2 text-sm text-[#e5e7eb] focus:border-[#49EACB] focus:outline-none"
          >
            {STATUS_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </CardHeader>
        <SessionTable
          sessions={data?.sessions ?? []}
          isLoading={isLoading}
          total={data?.total ?? 0}
          limit={limit}
          offset={offset}
          onPageChange={setOffset}
        />
      </Card>
    </div>
  );
}
