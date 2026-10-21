/**
 * ActivityFeed
 *
 * Shows recent admin activity.
 * Used in dashboard overview to show recent events.
 */

import { ReactNode } from 'react';
import { Card } from '@/components/tati';
import { Badge } from '@/components/tati';
import type { Tone } from '@/lib/theme';

export interface ActivityItem {
  id: string;
  icon: ReactNode;
  title: string;
  description?: string;
  timestamp: Date;
  tone?: Tone;
}

export interface ActivityFeedProps {
  title?: string;
  items: ActivityItem[];
  loading?: boolean;
  emptyMessage?: string;
}

function timeAgo(date: Date): string {
  const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);

  if (seconds < 60) return 'Just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;

  return date.toLocaleDateString();
}

export function ActivityFeed({
  title = 'Recent Activity',
  items,
  loading = false,
  emptyMessage = 'No recent activity',
}: ActivityFeedProps) {
  return (
    <Card className="p-6">
      <h3 className="text-lg font-bold text-foreground mb-4">{title}</h3>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-12 bg-secondary rounded-lg animate-pulse" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-6">{emptyMessage}</p>
      ) : (
        <div className="space-y-3">
          {items.map((item, index) => (
            <div
              key={item.id}
              className="flex gap-4 pb-3 last:pb-0"
            >
              {/* Timeline line and icon */}
              <div className="flex flex-col items-center">
                <div className="flex items-center justify-center h-10 w-10 rounded-lg bg-secondary text-lg">
                  {item.icon}
                </div>
                {index < items.length - 1 && (
                  <div className="h-6 w-0.5 bg-border my-1" />
                )}
              </div>

              {/* Activity content */}
              <div className="flex-1 pt-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground">{item.title}</p>
                    {item.description && (
                      <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                        {item.description}
                      </p>
                    )}
                  </div>
                  {item.tone && (
                    <Badge tone={item.tone} className="shrink-0 text-xs">
                      {item.tone}
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  {timeAgo(item.timestamp)}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
