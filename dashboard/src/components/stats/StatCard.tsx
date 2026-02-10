import { type LucideIcon } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Skeleton } from '@/components/ui/Skeleton';
import { cn } from '@/lib/utils';

interface StatCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
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
  trend,
  isLoading,
  className,
}: StatCardProps) {
  if (isLoading) {
    return (
      <Card className={cn('', className)}>
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-8 w-32" />
          </div>
          <Skeleton className="h-10 w-10 rounded-lg" />
        </div>
      </Card>
    );
  }

  return (
    <Card className={cn('', className)}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-[#9ca3af]">{title}</p>
          <p className="mt-1 text-2xl font-bold text-[#e5e7eb]">{value}</p>
          {trend && (
            <p className="mt-1 text-xs text-[#9ca3af]">
              <span
                className={cn(
                  'font-medium',
                  trend.value >= 0 ? 'text-green-500' : 'text-red-500'
                )}
              >
                {trend.value >= 0 ? '+' : ''}
                {trend.value}
              </span>{' '}
              {trend.label}
            </p>
          )}
        </div>
        <div className="p-2.5 rounded-lg bg-[#49EACB]/10">
          <Icon className="h-5 w-5 text-[#49EACB]" />
        </div>
      </div>
    </Card>
  );
}
