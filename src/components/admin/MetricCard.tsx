/**
 * MetricCard
 *
 * Beautiful KPI card for admin dashboard.
 * Displays:
 * - Large, readable numbers
 * - Icon for visual identity
 * - Optional trend indicator
 * - Semantic color tones
 * - Accessible, responsive
 */

import { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { Card } from '@/components/tati';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

type Tone = 'primary' | 'success' | 'warning' | 'neutral';
type Trend = 'up' | 'down' | 'neutral' | undefined;

const toneStyles: Record<Tone, { icon: string; badge: string }> = {
  primary: {
    icon: 'text-primary',
    badge: 'bg-primary-soft text-primary',
  },
  success: {
    icon: 'text-success',
    badge: 'bg-success-soft text-success',
  },
  warning: {
    icon: 'text-accent',
    badge: 'bg-warning-soft text-accent-foreground',
  },
  neutral: {
    icon: 'text-muted-foreground',
    badge: 'bg-muted text-muted-foreground',
  },
};

export interface MetricCardProps {
  title: string;
  value: string | number;
  unit?: string;
  icon?: ReactNode;
  trend?: Trend;
  trendValue?: string;
  tone?: Tone;
  loading?: boolean;
}

export function MetricCard({
  title,
  value,
  unit,
  icon,
  trend,
  trendValue,
  tone = 'primary',
  loading = false,
}: MetricCardProps) {
  const styles = toneStyles[tone];

  return (
    <Card className="p-6 hover:shadow-lg transition-shadow">
      <div className="flex items-start justify-between">
        {/* Content */}
        <div className="flex-1">
          <h3 className="text-sm font-semibold text-muted-foreground mb-3">{title}</h3>

          <div className="flex items-baseline gap-2 mb-3">
            {loading ? (
              <div className="h-8 w-24 bg-secondary rounded animate-pulse" />
            ) : (
              <>
                <span className="text-4xl font-extrabold text-foreground">
                  {value}
                </span>
                {unit && (
                  <span className="text-sm font-medium text-muted-foreground">
                    {unit}
                  </span>
                )}
              </>
            )}
          </div>

          {/* Trend Indicator */}
          {trendValue && trend && (
            <div className="flex items-center gap-1.5">
              {trend === 'up' && (
                <>
                  <TrendingUp className="h-4 w-4 text-success" />
                  <span className="text-sm font-semibold text-success">{trendValue}</span>
                </>
              )}
              {trend === 'down' && (
                <>
                  <TrendingDown className="h-4 w-4 text-destructive" />
                  <span className="text-sm font-semibold text-destructive">{trendValue}</span>
                </>
              )}
              {trend === 'neutral' && (
                <>
                  <Minus className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-semibold text-muted-foreground">{trendValue}</span>
                </>
              )}
            </div>
          )}
        </div>

        {/* Icon */}
        {icon && (
          <div className={cn(
            'flex items-center justify-center h-12 w-12 rounded-lg shrink-0',
            styles.badge,
          )}>
            <div className="text-xl">{icon}</div>
          </div>
        )}
      </div>
    </Card>
  );
}
