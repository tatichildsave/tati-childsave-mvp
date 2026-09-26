/**
 * Cohort List Component
 */

import { Badge, Button, Card, EmptyState, LoadingState } from "@/components/tati";
import type { AcademyCohort } from "@/lib/academy";

export interface CohortListProps {
  cohorts: AcademyCohort[];
  isLoading?: boolean;
  error?: string | null;
  onCreateNew?: () => void;
  onSelect?: (cohort: AcademyCohort) => void;
  onEdit?: (cohort: AcademyCohort) => void;
  onArchive?: (cohort: AcademyCohort) => void;
  showArchived?: boolean;
}

export function CohortList({
  cohorts,
  isLoading = false,
  error = null,
  onCreateNew,
  onSelect,
  onEdit,
  onArchive,
  showArchived = false,
}: CohortListProps) {
  if (isLoading) {
    return <LoadingState label="Loading cohorts…" />;
  }

  if (error) {
    return (
      <Card tone="muted">
        <p className="text-sm text-destructive">{error}</p>
      </Card>
    );
  }

  const visibleCohorts = cohorts.filter(
    (cohort) =>
      (cohort.status === "active" && !showArchived) ||
      (cohort.status === "archived" && showArchived),
  );

  if (visibleCohorts.length === 0) {
    return (
      <EmptyState
        title={showArchived ? "No archived cohorts" : "No cohorts yet"}
        description={
          showArchived
            ? "You don't have any archived cohorts."
            : "Create a cohort to group learners together."
        }
        action={
          onCreateNew && !showArchived ? (
            <Button onClick={onCreateNew}>Create Cohort</Button>
          ) : undefined
        }
      />
    );
  }

  return (
    <div className="space-y-3">
      {visibleCohorts.map((cohort) => (
        <div
          key={cohort.id}
          onClick={() => onSelect?.(cohort)}
          onKeyDown={(e: React.KeyboardEvent<HTMLDivElement>) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              onSelect?.(cohort);
            }
          }}
          role="button"
          tabIndex={0}
          className="cursor-pointer"
        >
          <Card interactive={true}>
            <div className="flex items-center justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-bold text-foreground truncate">{cohort.name}</h3>
                  <Badge>{cohort.status === "active" ? "Active" : "Archived"}</Badge>
                </div>

                {cohort.description && (
                  <p className="mt-1 text-sm text-muted-foreground line-clamp-2">
                    {cohort.description}
                  </p>
                )}

                <p className="mt-2 text-xs text-muted-foreground">
                  {cohort.learnerIds.length} learner
                  {cohort.learnerIds.length !== 1 ? "s" : ""}
                </p>
              </div>

              <div
                className="flex items-center gap-2 flex-shrink-0"
                onClick={(e: React.MouseEvent<HTMLDivElement>) => e.stopPropagation()}
              >
                {onEdit && (
                  <Button variant="outline" size="md" onClick={() => onEdit(cohort)}>
                    Edit
                  </Button>
                )}

                {!showArchived && onArchive && (
                  <Button variant="outline" size="md" onClick={() => onArchive(cohort)}>
                    Archive
                  </Button>
                )}
              </div>
            </div>
          </Card>
        </div>
      ))}
    </div>
  );
}
