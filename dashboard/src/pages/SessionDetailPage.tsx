import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, ExternalLink, Copy, XCircle, Clock, CheckCircle, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Skeleton } from '@/components/ui/Skeleton';
import { useSession, useCancelSession } from '@/hooks/useSessions';
import { formatKas, formatDateTime, copyToClipboard, cn } from '@/lib/utils';
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
    if (window.confirm('Are you sure you want to cancel this payment?')) {
      cancelMutation.mutate(id!);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-10">
        <Skeleton className="h-9 w-24" />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="bg-zn-surface/70 backdrop-blur-xl border border-zn-border rounded-2xl p-6"><Skeleton className="h-64 w-full" /></div>
          <div className="bg-zn-surface/70 backdrop-blur-xl border border-zn-border rounded-2xl p-6"><Skeleton className="h-64 w-full" /></div>
        </div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <div className="w-20 h-20 rounded-lg bg-zn-alt flex items-center justify-center mb-6">
          <AlertCircle className="h-10 w-10 text-zn-muted" />
        </div>
        <p className="text-xl font-semibold text-zn-text mb-2">Payment not found</p>
        <p className="text-zn-secondary mb-6">This payment doesn't exist or may have been removed</p>
        <Button variant="secondary" onClick={() => navigate('/sessions')}>Back to Payments</Button>
      </div>
    );
  }

  const canCancel = session.status === 'pending';

  return (
    <div className="space-y-10">
      <Button variant="ghost" size="sm" onClick={() => navigate('/sessions')} className="gap-2">
        <ArrowLeft className="h-4 w-4" /> Back to Payments
      </Button>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="text-lg font-mono text-zn-text">{session.orderId}</span>
          <StatusBadge status={session.status} />
        </div>
        {canCancel && (
          <Button variant="danger" onClick={handleCancel} isLoading={cancelMutation.isPending} className="gap-2">
            <XCircle className="h-4 w-4" /> Cancel Payment
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-zn-surface/70 backdrop-blur-xl border border-zn-border rounded-2xl">
          <div className="p-6 border-b border-zn-border">
            <h2 className="text-lg font-semibold text-zn-text">Payment Details</h2>
          </div>
          <div>
            <DetailRow label="Amount" value={formatKas(session.amount)} highlight />
            <div className="flex justify-between items-start gap-4 py-3 px-5 border-b border-zn-border">
              <span className="text-sm text-zn-secondary">Payment Address</span>
              <div className="flex items-center gap-2 text-right">
                <span className="text-sm text-zn-text font-mono break-all max-w-[200px]">{session.address}</span>
                <button
                  onClick={() => handleCopy(session.address, 'Address')}
                  className="p-1.5 rounded text-zn-muted hover:text-zn-link shrink-0"
                >
                  <Copy className="h-4 w-4" />
                </button>
              </div>
            </div>
            {session.txId && (
              <div className="flex justify-between items-center py-3 px-5 border-b border-zn-border">
                <span className="text-sm text-zn-secondary">Transaction</span>
                <a
                  href={`https://explorer.kaspa.org/txs/${session.txId}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-zn-link hover:text-zn-link text-sm font-medium"
                >
                  View on Explorer <ExternalLink className="h-4 w-4" />
                </a>
              </div>
            )}
          </div>
        </div>

        <div className="bg-zn-surface/70 backdrop-blur-xl border border-zn-border rounded-2xl">
          <div className="p-6 border-b border-zn-border">
            <h2 className="text-lg font-semibold text-zn-text">Timeline</h2>
          </div>
          <div className="p-5 space-y-1">
            <TimelineItem icon={Clock} label="Created" time={formatDateTime(session.createdAt)} status="complete" />
            <TimelineItem icon={Clock} label="Expires" time={formatDateTime(session.expiresAt)} status={session.status === 'pending' ? 'pending' : 'complete'} />
            {session.status === 'pending' && (
              <TimelineItem icon={Clock} label="Awaiting Payment" time="Waiting for customer..." status="pending" />
            )}
            {session.status === 'confirming' && (
              <TimelineItem icon={Clock} label="Confirming" time="Being confirmed on Kaspa network..." status="pending" />
            )}
            {session.confirmedAt && (
              <TimelineItem icon={CheckCircle} label="Confirmed" time={formatDateTime(session.confirmedAt)} status="success" />
            )}
            {session.status === 'expired' && (
              <TimelineItem icon={AlertCircle} label="Expired" time="No payment received in time" status="error" />
            )}
            {session.status === 'failed' && (
              <TimelineItem icon={AlertCircle} label="Failed" time="Payment could not be completed" status="error" />
            )}
          </div>
        </div>
      </div>

      {session.metadata && Object.keys(session.metadata).length > 0 && (
        <div className="bg-zn-surface/70 backdrop-blur-xl border border-zn-border rounded-2xl">
          <div className="p-6 border-b border-zn-border">
            <h2 className="text-lg font-semibold text-zn-text">Order Details</h2>
          </div>
          <div className="p-5">
            <pre className="bg-zn-alt border border-zn-border rounded-lg p-5 overflow-x-auto text-sm text-zn-secondary font-mono">
              {JSON.stringify(session.metadata, null, 2)}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
}

function DetailRow({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="flex justify-between items-center py-3 px-5 border-b border-zn-border">
      <span className="text-sm text-zn-secondary">{label}</span>
      <span className={cn('font-medium', highlight ? 'text-zn-link' : 'text-zn-text')}>{value}</span>
    </div>
  );
}

function TimelineItem({
  icon: Icon,
  label,
  time,
  status,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  time: string;
  status: 'complete' | 'pending' | 'success' | 'error';
}) {
  const statusStyles = {
    complete: 'bg-zn-success/20 text-zn-success',
    pending: 'bg-zn-warning/20 text-zn-warning',
    success: 'bg-zn-success/20 text-zn-success',
    error: 'bg-zn-error/20 text-zn-error',
  };

  return (
    <div className="flex items-start gap-4 py-3">
      <div className={cn('w-8 h-8 rounded-full flex items-center justify-center', statusStyles[status])}>
        <Icon className="h-4 w-4" />
      </div>
      <div className="flex-1">
        <p className="text-sm font-medium text-zn-text">{label}</p>
        <p className="text-xs text-zn-secondary mt-0.5">{time}</p>
      </div>
    </div>
  );
}
