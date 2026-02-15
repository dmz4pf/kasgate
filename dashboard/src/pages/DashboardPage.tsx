import { CreditCard, Clock, CheckCircle, Coins, ChevronDown } from 'lucide-react';
import { StatCard } from '@/components/stats/StatCard';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Skeleton } from '@/components/ui/Skeleton';
import { useStats } from '@/hooks/useStats';
import { useSessions } from '@/hooks/useSessions';
import { useMerchant } from '@/hooks/useMerchant';
import { formatKas, formatRelativeTime } from '@/lib/utils';
import { RevenueChart } from '@/components/charts/RevenueChart';
import { Link } from 'react-router-dom';


const EMPTY_STATS = {
  totalSessions: 0,
  pendingSessions: 0,
  confirmingSessions: 0,
  confirmedSessions: 0,
  expiredSessions: 0,
  totalReceived: '0',
  totalReceivedSompi: '0',
};

export function DashboardPage() {
  const { data: stats, isLoading: statsLoading } = useStats();
  const { data: sessionsData, isLoading: sessionsLoading } = useSessions({ limit: 5 });
  const { data: merchant } = useMerchant();

  const displayStats = stats || EMPTY_STATS;
  const displaySessions = sessionsData?.sessions ?? [];
  const successRate = displayStats.totalSessions > 0
    ? ((displayStats.confirmedSessions / displayStats.totalSessions) * 100).toFixed(1)
    : '0';

  return (
    <div>
      {/* Welcome Header */}
      <div className="flex justify-between items-center mb-10">
        <div>
          <h1 className="text-[28px] font-semibold text-gradient leading-tight mb-1">Welcome back</h1>
          <p className="text-sm text-zn-muted">Here's what's happening with your payments</p>
        </div>
        <button className="hidden sm:flex items-center gap-3 px-4 py-2.5 bg-zn-surface/70 backdrop-blur-sm border border-zn-border rounded-xl text-sm text-zn-text hover:border-zn-accent/30 transition-colors">
          <span className="font-mono text-zn-secondary">
            {merchant?.name || '0x7f3a...d4f2'}
          </span>
          <ChevronDown className="h-4 w-4 text-zn-muted" />
        </button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
        <StatCard
          title="Total Sessions"
          value={displayStats.totalSessions.toLocaleString()}
          icon={CreditCard}
          color="accent"
          trend={{ value: 12, label: '% this month' }}
          isLoading={statsLoading}
        />
        <StatCard
          title="Pending"
          value={displayStats.pendingSessions}
          icon={Clock}
          color="gold"
          isLoading={statsLoading}
        />
        <StatCard
          title="Total Received"
          value={`${displayStats.totalReceived} KAS`}
          icon={Coins}
          color="purple"
          trend={{ value: 5, label: '% this month' }}
          isLoading={statsLoading}
        />
        <StatCard
          title="Success Rate"
          value={`${successRate}%`}
          icon={CheckCircle}
          color="success"
          trend={{ value: 2, label: '% this month' }}
          isLoading={statsLoading}
        />
      </div>

      {/* Revenue Chart */}
      <div className="mb-10">
        <RevenueChart />
      </div>

      {/* Recent Activity */}
      <div className="bg-zn-surface/70 backdrop-blur-xl border border-zn-border rounded-2xl overflow-hidden">
        <div className="px-6 py-5 border-b border-zn-border">
          <h2 className="text-base font-semibold text-zn-text">Recent Activity</h2>
        </div>

        {sessionsLoading ? (
          Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center px-6 py-4 border-b border-zn-border last:border-0">
              <Skeleton className="h-5 w-20 rounded-full" />
              <Skeleton className="h-4 w-32 ml-4" />
              <div className="flex-1" />
              <Skeleton className="h-4 w-24 mr-6" />
              <Skeleton className="h-4 w-16" />
            </div>
          ))
        ) : (
          displaySessions.map((session, idx) => (
            <Link
              key={session.id}
              to={session.id.startsWith('demo-') ? '#' : `/sessions/${session.id}`}
              className={
                'flex items-center px-6 py-4 hover:bg-zn-accent/[0.03] transition-colors' +
                (idx < displaySessions.length - 1 ? ' border-b border-zn-border' : '')
              }
            >
              <span className="w-28 shrink-0">
                <StatusBadge status={session.status} />
              </span>
              <span className="flex-1 min-w-0 truncate text-sm font-mono text-zn-text ml-4">
                {session.orderId}
              </span>
              <span className="w-32 text-right text-sm font-medium text-zn-text font-mono whitespace-nowrap">
                {formatKas(session.amount)}
              </span>
              <span className="w-24 text-right text-sm text-zn-muted">
                {formatRelativeTime(session.createdAt)}
              </span>
            </Link>
          ))
        )}
      </div>
    </div>
  );
}
