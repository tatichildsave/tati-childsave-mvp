/**
 * Cohort Detail Component
 */

import { Avatar, Badge, Button, Card, EmptyState, LoadingState } from "@/components/tati";
import type { AcademyCohort, AssignedChild, ChildProgressSummary } from "@/lib/academy";

export interface CohortDetailProps {
  cohort: AcademyCohort | null;
  cohortLearners: (AssignedChild | ChildProgressSummary)[];
  isLoading?: boolean;
  onBack?: () => void;
  onEdit?: () => void;
  onArchive?: () => void;
  onSelectLearner?: (learner: AssignedChild | ChildProgressSummary) => void;
}

// Helper functions to extract properties from either AssignedChild or ChildProgressSummary
function getLearnerName(learner: AssignedChild | ChildProgressSummary): string {
  return "name" in learner ? learner.name : learner.childName;
}

function getLearnerId(learner: AssignedChild | ChildProgressSummary): string {
  return "id" in learner ? learner.id : learner.childId;
}

function getLearnerAge(learner: AssignedChild | ChildProgressSummary): number | undefined {
  return "age" in learner ? learner.age : undefined;
}

export function CohortDetail({
  cohort,
  cohortLearners,
  isLoading = false,
  onBack,
  onEdit,
  onArchive,
  onSelectLearner,
}: CohortDetailProps) {
  if (isLoading) {
    return <LoadingState label="Loading cohort…" />;
  }

  if (!cohort) {
    return null;
  }

  const isArchived = cohort.status === "archived";

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <h2 className="text-2xl font-bold">{cohort.name}</h2>
              <Badge>{isArchived ? "Archived" : "Active"}</Badge>
            </div>

            {cohort.description && <p className="text-muted-foreground">{cohort.description}</p>}

            <div className="mt-3 flex gap-4 text-sm text-muted-foreground">
              <span>Created {cohort.createdAt.toDate().toLocaleDateString()}</span>
              {isArchived && cohort.updatedAt && (
                <span>Archived {cohort.updatedAt.toDate().toLocaleDateString()}</span>
              )}
            </div>
          </div>

          <div className="flex gap-2 flex-shrink-0">
            {onEdit && !isArchived && (
              <Button variant="outline" size="md" onClick={() => onEdit()}>
                Edit
              </Button>
            )}

            {onArchive && !isArchived && (
              <Button variant="outline" size="md" onClick={() => onArchive()}>
                Archive
              </Button>
            )}

            {onBack && (
              <Button variant="ghost" size="md" onClick={() => onBack()}>
                Back
              </Button>
            )}
          </div>
        </div>
      </div>

      <div className="space-y-3">
        <h3 className="font-semibold">Learners ({cohort.learnerIds.length})</h3>

        {cohortLearners.length === 0 ? (
          <EmptyState
            title="No learners in this cohort"
            description="Add learners to this cohort to get started."
            action={onEdit ? <Button onClick={() => onEdit()}>Manage Learners</Button> : undefined}
          />
        ) : (
          <div className="grid gap-3">
            {cohortLearners.map((learner) => (
              <div
                key={learner.id}
                onClick={() => onSelectLearner?.(learner)}
                onKeyDown={(e: React.KeyboardEvent<HTMLDivElement>) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    onSelectLearner?.(learner);
                  }
                }}
                role="button"
                tabIndex={0}
                className="cursor-pointer"
              >
                <Card interactive={true}>
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3 flex-1">
                      <Avatar avatar={learner.avatar} name={getLearnerName(learner)} />
                      <div>
                        <h3 className="text-base font-bold text-foreground">
                          {getLearnerName(learner)}
                        </h3>
                        <p className="text-xs text-muted-foreground">
                          {getLearnerAge(learner) && `Age ${getLearnerAge(learner)} • `}ID:{" "}
                          {getLearnerId(learner)}
                        </p>
                      </div>
                    </div>

                    <div onClick={(e: React.MouseEvent<HTMLDivElement>) => e.stopPropagation()}>
                      <Button
                        variant="outline"
                        size="md"
                        onClick={() => onSelectLearner?.(learner)}
                      >
                        View →
                      </Button>
                    </div>
                  </div>
                </Card>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
