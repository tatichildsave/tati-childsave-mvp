/**
 * Cohort Form Component
 */

import { useState } from "react";
import { Button, Card } from "@/components/tati";
import type { AcademyCohort, AssignedChild } from "@/lib/academy";

export interface CohortFormProps {
  cohort?: AcademyCohort | null;
  availableLearners: AssignedChild[];
  onSubmit: (data: {
    name: string;
    description: string | null;
    learnerIds: string[];
  }) => Promise<void>;
  onCancel?: () => void;
  isLoading?: boolean;
  error?: string | null;
}

export function CohortForm({
  cohort,
  availableLearners,
  onSubmit,
  onCancel,
  isLoading = false,
  error = null,
}: CohortFormProps) {
  const [name, setName] = useState(cohort?.name || "");
  const [description, setDescription] = useState(cohort?.description || "");
  const [selectedLearnerIds, setSelectedLearnerIds] = useState<Set<string>>(
    new Set(cohort?.learnerIds || []),
  );
  const [validationError, setValidationError] = useState<string | null>(null);

  const handleLearnerToggle = (learnerId: string) => {
    const newIds = new Set(selectedLearnerIds);
    if (newIds.has(learnerId)) {
      newIds.delete(learnerId);
    } else {
      newIds.add(learnerId);
    }
    setSelectedLearnerIds(newIds);
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setValidationError(null);

    // Validation
    const trimmedName = name.trim();
    if (!trimmedName) {
      setValidationError("Cohort name is required");
      return;
    }
    if (trimmedName.length > 100) {
      setValidationError("Cohort name must be 100 characters or less");
      return;
    }
    if (description.length > 500) {
      setValidationError("Description must be 500 characters or less");
      return;
    }

    try {
      await onSubmit({
        name: trimmedName,
        description: description || null,
        learnerIds: Array.from(selectedLearnerIds),
      });
    } catch {
      // Error handling is done in parent component
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {(error || validationError) && (
        <Card tone="muted">
          <p className="text-sm text-destructive">{error || validationError}</p>
        </Card>
      )}

      <div>
        <label className="block text-sm font-medium mb-2">Cohort Name *</label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          disabled={isLoading}
          placeholder="Enter cohort name"
          maxLength={100}
          className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
        />
        <p className="mt-1 text-xs text-muted-foreground">{name.length}/100 characters</p>
      </div>

      <div>
        <label className="block text-sm font-medium mb-2">Description</label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          disabled={isLoading}
          placeholder="Enter cohort description (optional)"
          maxLength={500}
          className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary resize-none"
          rows={3}
        />
        <p className="mt-1 text-xs text-muted-foreground">{description.length}/500 characters</p>
      </div>

      <div>
        <label className="block text-sm font-medium mb-3">Learners in Cohort</label>
        {availableLearners.length === 0 ? (
          <p className="text-sm text-muted-foreground">No learners available</p>
        ) : (
          <Card>
            <div className="space-y-2">
              {availableLearners.map((learner) => (
                <label key={learner.id} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedLearnerIds.has(learner.id)}
                    onChange={() => handleLearnerToggle(learner.id)}
                    disabled={isLoading}
                    className="rounded border-border"
                  />
                  <span className="text-sm">{learner.name}</span>
                </label>
              ))}
            </div>
          </Card>
        )}
      </div>

      <div className="flex gap-3 pt-4 border-t border-border">
        <Button type="button" variant="outline" onClick={() => onCancel?.()} disabled={isLoading}>
          Cancel
        </Button>
        <Button type="submit" disabled={isLoading} variant="primary">
          {isLoading ? "Saving…" : cohort ? "Update Cohort" : "Create Cohort"}
        </Button>
      </div>
    </form>
  );
}
