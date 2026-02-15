import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useWebhookLogs, useRetryWebhook } from '@/hooks/useWebhookLogs';
import {
  CheckCircle2,
  XCircle,
  Clock,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ExternalLink,
  AlertCircle,
  Webhook,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/Button';
import type { WebhookLog, WebhookEvent } from '@/types';

const EVENT_OPTIONS = [
  { value: '', label: 'All Events' },
  { value: 'payment.pending', label: 'Pending' },
  { value: 'payment.confirming', label: 'Confirming' },
  { value: 'payment.confirmed', label: 'Confirmed' },
  { value: 'payment.expired', label: 'Expired' },
];

function getStatusIcon(log: WebhookLog) {
  if (log.deliveredAt && log.statusCode && log.statusCode >= 200 && log.statusCode < 300) {
    return <CheckCircle2 className="h-[18px] w-[18px] text-zn-success" />;
  }
  if (log.nextRetryAt) {
    return <Clock className="h-[18px] w-[18px] text-zn-warning" />;
  }
  if (log.statusCode && (log.statusCode >= 400 || log.attempts > 0)) {
    return <XCircle className="h-[18px] w-[18px] text-zn-error" />;
  }
  return <Clock className="h-[18px] w-[18px] text-zn-muted" />;
}

function getStatusText(log: WebhookLog): string {
  if (log.deliveredAt && log.statusCode && log.statusCode >= 200 && log.statusCode < 300) return 'Delivered';
  if (log.nextRetryAt) return 'Pending Retry';
  if (log.attempts >= 5) return 'Failed';
  if (log.statusCode) return `Error (${log.statusCode})`;
  return 'Pending';
}

function getEventColor(event: WebhookEvent): string {
  switch (event) {
    case 'payment.pending': return 'bg-zn-alt text-zn-secondary';
    case 'payment.confirming': return 'bg-zn-warning/20 text-zn-warning';
    case 'payment.confirmed': return 'bg-zn-success/20 text-zn-success';
    case 'payment.expired': return 'bg-zn-error/20 text-zn-error';
    default: return 'bg-zn-alt text-zn-secondary';
  }
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleString();
}

function WebhookLogRow({ log }: { log: WebhookLog }) {
  const [expanded, setExpanded] = useState(false);
  const retryMutation = useRetryWebhook();
  const canRetry = !log.deliveredAt || (log.statusCode && log.statusCode >= 400);

  return (
    <div className="border-b border-zn-border last:border-0">
      <div
        className="flex items-center gap-4 p-4 hover:bg-zn-alt cursor-pointer"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="shrink-0">{getStatusIcon(log)}</div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1.5">
            <span className={cn('px-2 py-0.5 rounded text-xs font-medium', getEventColor(log.event))}>{log.event}</span>
            <span className="text-xs text-zn-muted">{formatDate(log.createdAt)}</span>
          </div>
          <div className="text-sm text-zn-text">
            Payment:{' '}
            <Link
              to={`/sessions/${log.sessionId}`}
              onClick={(e) => e.stopPropagation()}
              className="text-zn-link hover:text-zn-link"
            >
              {log.sessionId.slice(0, 8)}...
            </Link>
          </div>
        </div>
        <div className="shrink-0 text-right">
          <div className="text-sm font-medium text-zn-text">{getStatusText(log)}</div>
          <div className="text-xs text-zn-secondary">{log.attempts} attempt{log.attempts !== 1 ? 's' : ''}</div>
        </div>
        <div className="shrink-0 flex items-center gap-2">
          {canRetry && (
            <button
              onClick={(e) => { e.stopPropagation(); retryMutation.mutate(log.id); }}
              disabled={retryMutation.isPending}
              className="p-2 text-zn-muted hover:text-zn-link hover:bg-zn-link/10 rounded-md disabled:opacity-40"
              title="Retry webhook"
            >
              <RefreshCw className={cn('h-4 w-4', retryMutation.isPending && 'animate-spin')} />
            </button>
          )}
          <ChevronDown className={cn('h-4 w-4 text-zn-muted transition-transform', expanded && 'rotate-180')} />
        </div>
      </div>

      {expanded && (
        <div className="px-4 pb-4 space-y-4 bg-zn-inset animate-fade-in">
          <div className="grid grid-cols-2 gap-4 text-sm p-4 rounded-lg bg-zn-surface border border-zn-border">
            <div>
              <span className="text-zn-secondary">Status Code:</span>
              <span className="ml-2 text-zn-text font-medium">{log.statusCode || 'No response'}</span>
            </div>
            <div>
              <span className="text-zn-secondary">Delivered At:</span>
              <span className="ml-2 text-zn-text">{log.deliveredAt ? formatDate(log.deliveredAt) : 'Not delivered yet'}</span>
            </div>
            {log.deliveryId && (
              <div className="col-span-2">
                <span className="text-zn-secondary">Delivery ID:</span>
                <span className="ml-2 text-zn-text font-mono text-xs">{log.deliveryId}</span>
              </div>
            )}
            {log.nextRetryAt && (
              <div className="col-span-2">
                <span className="text-zn-secondary">Next Retry:</span>
                <span className="ml-2 text-zn-text">{formatDate(log.nextRetryAt)}</span>
              </div>
            )}
          </div>

          {log.payload && (
            <div>
              <div className="text-zn-secondary text-sm mb-2 font-medium">Notification Data:</div>
              <pre className="bg-zn-surface p-4 rounded-lg text-xs text-zn-secondary overflow-x-auto font-mono border border-zn-border">
                {JSON.stringify(log.payload, null, 2)}
              </pre>
            </div>
          )}

          {log.response && (
            <div>
              <div className="text-zn-secondary text-sm mb-2 font-medium">Response:</div>
              <pre className="bg-zn-surface p-4 rounded-lg text-xs text-zn-secondary overflow-x-auto max-h-32 font-mono border border-zn-border">
                {log.response}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function WebhooksPage() {
  const [offset, setOffset] = useState(0);
  const [event, setEvent] = useState('');
  const limit = 10;

  const { data, isLoading } = useWebhookLogs({ limit, offset, event: event || undefined });

  const handleEventChange = (newEvent: string) => {
    setEvent(newEvent);
    setOffset(0);
  };

  const totalPages = Math.ceil((data?.total ?? 0) / limit);
  const currentPage = Math.floor(offset / limit) + 1;

  return (
    <div className="space-y-10">
      <div className="bg-zn-surface/70 backdrop-blur-xl border border-zn-border rounded-2xl overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 pb-5">
          <h2 className="text-lg font-semibold text-zn-text">Notification History</h2>
          <div className="inline-flex gap-1 p-1 bg-zn-alt rounded-lg" role="tablist">
            {EVENT_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                role="tab"
                aria-selected={event === opt.value}
                onClick={() => handleEventChange(opt.value)}
                className={cn(
                  'px-3 py-1.5 rounded-md text-sm font-medium',
                  event === opt.value ? 'bg-zn-accent/20 text-zn-accent' : 'text-zn-secondary hover:text-zn-text'
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <RefreshCw className="h-8 w-8 text-zn-accent animate-spin" />
          </div>
        ) : data?.logs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center px-4">
            <div className="w-16 h-16 rounded-lg bg-zn-alt flex items-center justify-center mb-4">
              <AlertCircle className="h-8 w-8 text-zn-muted" />
            </div>
            <p className="text-zn-text font-medium text-lg mb-1">No webhook logs found</p>
            <p className="text-zn-secondary text-sm">Webhook deliveries will appear here when payment events occur</p>
          </div>
        ) : (
          <>
            <div>
              {data?.logs.map((log) => <WebhookLogRow key={log.id} log={log} />)}
            </div>

            {totalPages > 1 && (
              <div className="flex items-center justify-between p-4 border-t border-zn-border">
                <span className="text-sm text-zn-secondary tabular-nums">
                  Showing <span className="text-zn-text font-medium">{offset + 1}</span>-
                  <span className="text-zn-text font-medium">{Math.min(offset + limit, data?.total ?? 0)}</span> of{' '}
                  <span className="text-zn-text font-medium">{data?.total ?? 0}</span>
                </span>
                <div className="flex items-center gap-2">
                  <Button variant="secondary" size="sm" onClick={() => setOffset(Math.max(0, offset - limit))} disabled={offset === 0}>
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <span className="text-sm text-zn-secondary px-2 tabular-nums">
                    Page <span className="text-zn-text font-medium">{currentPage}</span> of{' '}
                    <span className="text-zn-text font-medium">{totalPages}</span>
                  </span>
                  <Button variant="secondary" size="sm" onClick={() => setOffset(offset + limit)} disabled={offset + limit >= (data?.total ?? 0)}>
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      <div className="bg-zn-surface/70 backdrop-blur-xl border border-zn-border rounded-2xl p-6">
        <div className="flex items-start gap-4">
          <div className="w-9 h-9 bg-zn-alt rounded-lg flex items-center justify-center shrink-0">
            <Webhook className="h-[18px] w-[18px] text-zn-secondary" />
          </div>
          <div>
            <h3 className="font-semibold text-zn-text mb-1">About Payment Notifications</h3>
            <p className="text-sm text-zn-secondary">
              KasGate automatically alerts your server when payments are received, confirmed, or expire. Failed alerts are retried up to 5 times.
            </p>
            <Link to="/integration" className="inline-flex items-center gap-1.5 text-sm text-zn-link hover:text-zn-link font-medium mt-3">
              View setup guide <ExternalLink className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
