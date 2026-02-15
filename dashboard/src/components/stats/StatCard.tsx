import { type LucideIcon } from 'lucide-react';
import { Skeleton } from '@/components/ui/Skeleton';
import { cn } from '@/lib/utils';

type StatColor = 'accent' | 'gold' | 'purple' | 'success';

const colorStyles: Record<StatColor, { iconBg: string; iconText: string }> = {
  accent: { iconBg: 'bg-gradient-to-br from-zn-accent/20 to-zn-accent/5', iconText: 'text-zn-accent' },
  gold: { iconBg: 'bg-gradient-to-br from-zn-gold/20 to-zn-gold/5', iconText: 'text-zn-gold' },
  purple: { iconBg: 'bg-gradient-to-br from-zn-purple/20 to-zn-purple/5', iconText: 'text-zn-purple' },
  success: { iconBg: 'bg-gradient-to-br from-zn-success/20 to-zn-success/5', iconText: 'text-zn-success' },
};

interface StatCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  color?: StatColor;
  trend?: {
    value: number;
    label: string;
  };
  isLoading?: boolean;
  className?: string;
}

export function StatCard({
  title,
  value,
  icon: Icon,
  color = 'accent',
  trend,
  isLoading,
  className,
}: StatCardProps) {
  const colors = colorStyles[color];

  if (isLoading) {
    return (
      <div className={cn('bg-zn-surface/70 backdrop-blur-xl border border-zn-border rounded-2xl p-7 space-y-4', className)}>
        <Skeleton className="h-12 w-12 rounded-xl" />
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-4 w-24" />
      </div>
    );
  }

  return (
    <div
      className={cn(
        'bg-zn-surface/70 backdrop-blur-xl border border-zn-border rounded-2xl p-7 relative overflow-hidden',
        'transition-all duration-300 hover:-translate-y-1 hover:border-zn-accent/30 hover:shadow-xl hover:shadow-zn-accent/5',
        className
      )}
    >
      <div className="flex items-start justify-between mb-4">
        <div className={cn('w-12 h-12 rounded-xl flex items-center justify-center', colors.iconBg)}>
          <Icon className={cn('h-5 w-5', colors.iconText)} />
        </div>
        {trend && (
          <span className={cn(
            'text-xs font-medium px-2 py-1 rounded-md',
            trend.value >= 0 ? 'bg-zn-success/10 text-zn-success' : 'bg-zn-error/10 text-zn-error'
          )}>
            {trend.value >= 0 ? '+' : ''}{trend.value}{trend.label.includes('%') ? '' : '%'}
          </span>
        )}
      </div>

      <p className="text-[32px] font-bold text-zn-text tracking-tight leading-none mb-1">{String(value)}</p>
      <p className="text-[13px] text-zn-muted">{title}</p>
    </div>
  );
}
