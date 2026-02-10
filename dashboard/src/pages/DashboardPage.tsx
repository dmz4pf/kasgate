import { CreditCard, Clock, CheckCircle, Coins } from 'lucide-react';
import { StatCard } from '@/components/stats/StatCard';
import { SessionCard } from '@/components/sessions/SessionCard';
import { Card, CardHeader, CardTitle } from '@/components/ui/Card';
import { Skeleton } from '@/components/ui/Skeleton';
import { useStats } from '@/hooks/useStats';
import { useSessions } from '@/hooks/useSessions';
import { formatKas } from '@/lib/utils';

export function DashboardPage() {
  const { data: stats, isLoading: statsLoading } = useStats();
  const { data: sessionsData, isLoading: sessionsLoading } = useSessions({ limit: 5 });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#e5e7eb]">Dashboard</h1>
        <p className="text-[#9ca3af] mt-1">Overview of your payment sessions</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Sessions"
          value={stats?.totalSessions ?? 0}
          icon={CreditCard}
          trend={stats ? { value: stats.last24hSessions, label: 'last 24h' } : undefined}
          isLoading={statsLoading}
        />
        <StatCard
          title="Pending"
          value={stats?.pendingSessions ?? 0}
          icon={Clock}
          isLoading={statsLoading}
        />
        <StatCard
          title="Confirmed"
          value={stats?.confirmedSessions ?? 0}
          icon={CheckCircle}
          trend={stats ? { value: stats.last24hConfirmed, label: 'last 24h' } : undefined}
          isLoading={statsLoading}
        />
        <StatCard
          title="Total Received"
          value={stats ? formatKas(stats.totalKasReceived) : '0 KAS'}
          icon={Coins}
          trend={
            stats
              ? { value: parseFloat(stats.last24hKasReceived), label: 'KAS last 24h' }
              : undefined
          }
          isLoading={statsLoading}
        />
      </div>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
        </CardHeader>
        <div className="space-y-3">
          {sessionsLoading ? (
            Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="p-4 border border-[#2a3444] rounded-lg">
                <Skeleton className="h-4 w-24 mb-2" />
                <Skeleton className="h-5 w-48" />
              </div>
            ))
          ) : sessionsData?.sessions.length === 0 ? (
            <p className="text-center text-[#9ca3af] py-8">
              No payment sessions yet
            </p>
          ) : (
            sessionsData?.sessions.map((session) => (
              <SessionCard key={session.id} session={session} />
            ))
          )}
        </div>
      </Card>
    </div>
  );
}
