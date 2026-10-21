/**
 * EmptyState
 *
 * Friendly, helpful empty state component.
 * Used when no data is available or as placeholder for actions.
 */

import { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { Card } from '@/components/tati';
import { Button } from '@/components/tati';

export interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  size?: 'sm' | 'md' | 'lg';
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  size = 'md',
}: EmptyStateProps) {
  const sizeClasses = {
    sm: 'py-8 px-4',
    md: 'py-12 px-6',
    lg: 'py-16 px-8',
  };

  return (
    <Card className={cn('text-center', sizeClasses[size])}>
      {icon && (
        <div className="text-4xl mb-4 opacity-50 flex justify-center">
          {icon}
        </div>
      )}
      <h3 className="text-lg font-bold text-foreground mb-2">{title}</h3>
      <p className="text-sm text-muted-foreground mb-6 max-w-sm mx-auto">
        {description}
      </p>
      {action && (
        <Button
          variant="primary"
          size="md"
          onClick={action.onClick}
          className="inline-flex"
        >
          {action.label}
        </Button>
      )}
    </Card>
  );
}

/**
 * LoadingState
 *
 * Skeleton loaders for data loading states.
 */

export interface LoadingStateProps {
  count?: number;
  height?: 'sm' | 'md' | 'lg';
}

export function LoadingState({ count = 3, height = 'md' }: LoadingStateProps) {
  const heightClasses = {
    sm: 'h-8',
    md: 'h-12',
    lg: 'h-16',
  };

  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className={cn('bg-secondary rounded-lg animate-pulse', heightClasses[height])}
        />
      ))}
    </div>
  );
}
