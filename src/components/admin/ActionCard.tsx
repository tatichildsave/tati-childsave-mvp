/**
 * ActionCard
 *
 * Prominent call-to-action card for quick admin actions.
 * Featured styling with icon, title, and description.
 */

import { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { Card } from '@/components/tati';
import { Button } from '@/components/tati';

export interface ActionCardProps {
  icon?: ReactNode;
  title: string;
  description: string;
  action: {
    label: string;
    onClick: () => void;
  };
  featured?: boolean;
  tone?: 'primary' | 'success' | 'accent';
}

const toneBg = {
  primary: 'bg-primary-soft',
  success: 'bg-success-soft',
  accent: 'bg-warning-soft',
};

const toneIcon = {
  primary: 'text-primary',
  success: 'text-success',
  accent: 'text-accent',
};

export function ActionCard({
  icon,
  title,
  description,
  action,
  featured = false,
  tone = 'primary',
}: ActionCardProps) {
  return (
    <Card
      className={cn(
        'p-6 hover:shadow-lg transition-shadow',
        featured && 'border-2 border-primary'
      )}
    >
      <div className="flex items-start gap-4">
        {icon && (
          <div className={cn(
            'flex items-center justify-center h-14 w-14 rounded-lg shrink-0',
            toneBg[tone],
            toneIcon[tone],
          )}>
            <div className="text-2xl">{icon}</div>
          </div>
        )}
        <div className="flex-1 min-w-0">
          <h3 className="text-lg font-bold text-foreground mb-1">{title}</h3>
          <p className="text-sm text-muted-foreground mb-4">{description}</p>
          <Button
            variant="primary"
            size="md"
            onClick={action.onClick}
            className="w-full sm:w-auto"
          >
            {action.label}
          </Button>
        </div>
      </div>
    </Card>
  );
}
