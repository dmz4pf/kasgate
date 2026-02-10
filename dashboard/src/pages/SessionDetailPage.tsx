import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, ExternalLink, Copy, XCircle } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Skeleton } from '@/components/ui/Skeleton';
import { useSession, useCancelSession } from '@/hooks/useSessions';
import { formatKas, formatDateTime, copyToClipboard } from '@/lib/utils';
import { toast } from '@/components/ui/Toast';

export function SessionDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: session, isLoading } = useSession(id!);
  const cancelMutation = useCancelSession();

  const handleCopy = async (text: string, label: string) => {
    await copyToClipboard(text);
    toast('success', `${label} copied to clipboard`);
  };

  const handleCancel = () => {
    if (window.confirm('Are you sure you want to cancel this session?')) {
      cancelMutation.mutate(id!);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-32" />
        <Card>
          <Skeleton className="h-64 w-full" />
        </Card>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="text-center py-12">
        <p className="text-[#9ca3af]">Session not found</p>
        <Button variant="secondary" onClick={() => navigate('/dashboard/sessions')} className="mt-4">
          Back to Sessions
        </Button>
      </div>
    );
  }

  const canCancel = session.status === 'pending';

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={() => navigate('/dashboard/sessions')}>
          <ArrowLeft className="h-4 w-4" />
          Back
        </Button>
      </div>

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#e5e7eb]">Session Details</h1>
          <p className="text-[#9ca3af] mt-1">Order: {session.orderId}</p>
        </div>
        <StatusBadge status={session.status} className="text-sm px-3 py-1" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Payment Details */}
        <Card>
          <CardHeader>
            <CardTitle>Payment Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between">
              <span className="text-[#9ca3af]">Amount</span>
              <span className="text-[#e5e7eb] font-medium">
                {session.amount} {session.currency}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#9ca3af]">KAS Amount</span>
              <span className="text-[#e5e7eb] font-medium">
                {formatKas(session.kaspaAmount)}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-[#9ca3af]">Address</span>
              <div className="flex items-center gap-2">
                <span className="text-[#e5e7eb] font-mono text-sm truncate max-w-[200px]">
                  {session.kaspaAddress}
                </span>
                <button
                  onClick={() => handleCopy(session.kaspaAddress, 'Address')}
                  className="text-[#9ca3af] hover:text-[#49EACB]"
                >
                  <Copy className="h-4 w-4" />
                </button>
              </div>
            </div>
            {session.txHash && (
              <div className="flex justify-between items-center">
                <span className="text-[#9ca3af]">Transaction</span>
                <a
                  href={`https://explorer.kaspa.org/txs/${session.txHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-[#49EACB] hover:underline text-sm"
                >
                  View on Explorer
                  <ExternalLink className="h-3 w-3" />
                </a>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Timeline */}
        <Card>
          <CardHeader>
            <CardTitle>Timeline</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <TimelineItem
                label="Created"
                time={formatDateTime(session.createdAt)}
                isActive
              />
              <TimelineItem
                label="Expires"
                time={formatDateTime(session.expiresAt)}
                isActive={session.status === 'pending'}
              />
              {session.confirmedAt && (
                <TimelineItem
                  label="Confirmed"
                  time={formatDateTime(session.confirmedAt)}
                  isActive
                  isSuccess
                />
              )}
              {session.status === 'expired' && (
                <TimelineItem label="Expired" time="Session expired" isError />
              )}
              {session.status === 'failed' && (
                <TimelineItem label="Failed" time="Payment failed" isError />
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Actions */}
      {canCancel && (
        <Card>
          <CardContent className="flex justify-end">
            <Button
              variant="danger"
              onClick={handleCancel}
              isLoading={cancelMutation.isPending}
            >
              <XCircle className="h-4 w-4" />
              Cancel Session
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Metadata */}
      {session.metadata && Object.keys(session.metadata).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Metadata</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="bg-[#0A0F14] rounded-lg p-4 overflow-x-auto text-sm text-[#9ca3af]">
              {JSON.stringify(session.metadata, null, 2)}
            </pre>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function TimelineItem({
  label,
  time,
  isActive,
  isSuccess,
  isError,
}: {
  label: string;
  time: string;
  isActive?: boolean;
  isSuccess?: boolean;
  isError?: boolean;
}) {
  return (
    <div className="flex items-start gap-3">
      <div
        className={`w-2 h-2 mt-2 rounded-full ${
          isSuccess
            ? 'bg-green-500'
            : isError
            ? 'bg-red-500'
            : isActive
            ? 'bg-[#49EACB]'
            : 'bg-[#2a3444]'
        }`}
      />
      <div>
        <p className="text-[#e5e7eb] font-medium">{label}</p>
        <p className="text-sm text-[#9ca3af]">{time}</p>
      </div>
    </div>
  );
}
