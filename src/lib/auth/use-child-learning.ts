import { useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getTrack } from "@/lib/learning/track";
import type { ProgressEvent } from "@/lib/learning/progress";
import { computeProgressSnapshot } from "@/lib/progress/snapshot";
import {
  getChildLearningData,
  recordChildProgress,
  saveChildAssessment,
  type ChildLearningData,
} from "./child-learning.functions";

export const childLearningKey = ["child-learning"] as const;

type ChildProgressInput = {
  data: {
    itemType: "assessment" | "lesson" | "scenario" | "reflection";
    itemId: string;
    score?: number | null;
    maxScore?: number | null;
    details?: Record<string, unknown>;
  };
};

type ChildAssessmentInput = {
  data: {
    assessmentId: string;
    responses: Record<string, string>;
    points: number;
    maxPoints: number;
    competencyScores: Record<string, unknown>;
  };
};

export function useChildLearning() {
  const query = useQuery({ queryKey: childLearningKey, queryFn: getChildLearningData });
  const snapshot = useMemo(() => {
    const data = query.data;
    if (!data) return null;
    return computeProgressSnapshot(
      getTrack("save"),
      data.progress as unknown as ProgressEvent[],
      data.profile.id,
      data.profile.name,
    );
  }, [query.data]);
  return { ...query, data: query.data, snapshot };
}

export function useRecordChildProgress() {
  const queryClient = useQueryClient();
  return useMutation<unknown, Error, ChildProgressInput>({
    mutationFn: (options) => recordChildProgress(options),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: childLearningKey }),
  });
}

export function useSaveChildAssessment() {
  const queryClient = useQueryClient();
  return useMutation<unknown, Error, ChildAssessmentInput>({
    mutationFn: (options) => saveChildAssessment(options),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: childLearningKey }),
  });
}

export function childLearningProfile(data: ChildLearningData | undefined) {
  return data?.profile;
}
