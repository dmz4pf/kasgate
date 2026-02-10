import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { useWebhookLogs, useRetryWebhook } from '@/hooks/useWebhookLogs';
import {
  CheckCircle2,
  XCircle,
  Clock,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  AlertCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
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
    return <CheckCircle2 className="h-5 w-5 text-green-500" />;
  }
  if (log.nextRetryAt) {
    return <Clock className="h-5 w-5 text-yellow-500" />;
  }
  if (log.statusCode && (log.statusCode >= 400 || log.attempts > 0)) {
    return <XCircle className="h-5 w-5 text-red-500" />;
  }
  return <Clock className="h-5 w-5 text-gray-500" />;
}

function getStatusText(log: WebhookLog): string {
  if (log.deliveredAt && log.statusCode && log.statusCode >= 200 && log.statusCode < 300) {
    return 'Delivered';
  }
  if (log.nextRetryAt) {
    return 'Pending Retry';
  }
  if (log.attempts >= 5) {
    return 'Failed';
  }
  if (log.statusCode) {
    return `Error (${log.statusCode})`;
  }
  return 'Pending';
}

function getEventColor(event: WebhookEvent): string {
  switch (event) {
    case 'payment.pending':
      return 'bg-gray-500/20 text-gray-400';
    case 'payment.confirming':
      return 'bg-yellow-500/20 text-yellow-400';
    case 'payment.confirmed':
      return 'bg-green-500/20 text-green-400';
    case 'payment.expired':
      return 'bg-red-500/20 text-red-400';
    default:
      return 'bg-gray-500/20 text-gray-400';
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
    <div className="border-b border-[#2a3444] last:border-0">
      <div
        className="flex items-center gap-4 p-4 hover:bg-[#0A0F14]/50 cursor-pointer transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex-shrink-0">{getStatusIcon(log)}</div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className={cn('px-2 py-0.5 rounded text-xs font-medium', getEventColor(log.event))}>
              {log.event}
            </span>
            <span className="text-xs text-[#9ca3af]">
              {formatDate(log.createdAt)}
            </span>
          </div>
          <div className="text-sm text-[#e5e7eb] truncate">
            Session: <Link
              to={`/sessions/${log.sessionId}`}
              onClick={(e) => e.stopPropagation()}
              className="text-[#49EACB] hover:underline"
            >
              {log.sessionId.slice(0, 8)}...
            </Link>
          </div>
        </div>

        <div className="flex-shrink-0 text-right">
          <div className="text-sm font-medium text-[#e5e7eb]">
            {getStatusText(log)}
          </div>
          <div className="text-xs text-[#9ca3af]">
            {log.attempts} attempt{log.attempts !== 1 ? 's' : ''}
          </div>
        </div>

        <div className="flex-shrink-0 flex items-center gap-2">
          {canRetry && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                retryMutation.mutate(log.id);
              }}
              disabled={retryMutation.isPending}
              className="p-2 text-[#9ca3af] hover:text-[#49EACB] hover:bg-[#49EACB]/10 rounded-lg transition-colors disabled:opacity-50"
              title="Retry webhook"
            >
              <RefreshCw className={cn('h-4 w-4', retryMutation.isPending && 'animate-spin')} />
            </button>
          )}
          <ChevronRight
            className={cn(
              'h-4 w-4 text-[#9ca3af] transition-transform',
              expanded && 'rotate-90'
            )}
          />
        </div>
      </div>

      {expanded && (
        <div className="px-4 pb-4 space-y-3 bg-[#0A0F14]/30">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-[#9ca3af]">Status Code:</span>
              <span className="ml-2 text-[#e5e7eb]">{log.statusCode || 'N/A'}</span>
            </div>
            <div>
              <span className="text-[#9ca3af]">Delivered At:</span>
              <span className="ml-2 text-[#e5e7eb]">
                {log.deliveredAt ? formatDate(log.deliveredAt) : 'Not delivered'}
              </span>
            </div>
            {log.deliveryId && (
              <div className="col-span-2">
                <span className="text-[#9ca3af]">Delivery ID:</span>
                <span className="ml-2 text-[#e5e7eb] font-mono text-xs">{log.deliveryId}</span>
              </div>
            )}
            {log.nextRetryAt && (
              <div className="col-span-2">
                <span className="text-[#9ca3af]">Next Retry:</span>
                <span className="ml-2 text-[#e5e7eb]">{formatDate(log.nextRetryAt)}</span>
              </div>
            )}
          </div>

          {log.payload && (
            <div>
              <div className="text-[#9ca3af] text-sm mb-1">Payload:</div>
              <pre className="bg-[#0A0F14] p-3 rounded-lg text-xs text-[#e5e7eb] overflow-x-auto">
                {JSON.stringify(log.payload, null, 2)}
              </pre>
            </div>
          )}

          {log.response && (
            <div>
              <div className="text-[#9ca3af] text-sm mb-1">Response:</div>
              <pre className="bg-[#0A0F14] p-3 rounded-lg text-xs text-[#e5e7eb] overflow-x-auto max-h-32">
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

  const { data, isLoading } = useWebhookLogs({
    limit,
    offset,
    event: event || undefined,
  });

  const handleEventChange = (newEvent: string) => {
    setEvent(newEvent);
    setOffset(0);
  };

  const totalPages = Math.ceil((data?.total ?? 0) / limit);
  const currentPage = Math.floor(offset / limit) + 1;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#e5e7eb]">Webhook Logs</h1>
        <p className="text-[#9ca3af] mt-1">Monitor webhook deliveries and retry failed webhooks</p>
      </div>

      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <CardTitle>Delivery History</CardTitle>
          <select
            value={event}
            onChange={(e) => handleEventChange(e.target.value)}
            className="bg-[#0A0F14] border border-[#2a3444] rounded-lg px-3 py-2 text-sm text-[#e5e7eb] focus:border-[#49EACB] focus:outline-none"
          >
            {EVENT_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <RefreshCw className="h-8 w-8 text-[#49EACB] animate-spin" />
            </div>
          ) : data?.logs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <AlertCircle className="h-12 w-12 text-[#9ca3af] mb-4" />
              <p className="text-[#e5e7eb] font-medium">No webhook logs found</p>
              <p className="text-[#9ca3af] text-sm mt-1">
                Webhook deliveries will appear here when payment events occur
              </p>
            </div>
          ) : (
            <>
              <div className="divide-y divide-[#2a3444]">
                {data?.logs.map((log) => (
                  <WebhookLogRow key={log.id} log={log} />
                ))}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between p-4 border-t border-[#2a3444]">
                  <span className="text-sm text-[#9ca3af]">
                    Showing {offset + 1}-{Math.min(offset + limit, data?.total ?? 0)} of {data?.total ?? 0}
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setOffset(Math.max(0, offset - limit))}
                      disabled={offset === 0}
                      className="p-2 text-[#9ca3af] hover:text-[#e5e7eb] hover:bg-[#0A0F14] rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <ChevronLeft className="h-5 w-5" />
                    </button>
                    <span className="text-sm text-[#e5e7eb] px-2">
                      Page {currentPage} of {totalPages}
                    </span>
                    <button
                      onClick={() => setOffset(offset + limit)}
                      disabled={offset + limit >= (data?.total ?? 0)}
                      className="p-2 text-[#9ca3af] hover:text-[#e5e7eb] hover:bg-[#0A0F14] rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <ChevronRight className="h-5 w-5" />
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Info card */}
      <Card>
        <CardContent className="py-4">
          <div className="flex items-start gap-3">
            <ExternalLink className="h-5 w-5 text-[#49EACB] flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="text-sm font-medium text-[#e5e7eb]">About Webhooks</h3>
              <p className="text-sm text-[#9ca3af] mt-1">
                KasGate sends webhook notifications for payment events. Failed deliveries are
                automatically retried up to 5 times with exponential backoff. You can also
                manually retry from this page.
              </p>
              <Link to="/integration" className="text-sm text-[#49EACB] hover:underline mt-2 inline-block">
                View integration guide →
              </Link>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
