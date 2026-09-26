/**
 * TATI Academy React Query Hooks
 * Client-side data fetching with caching and state management
 */

import { useQuery, type UseQueryResult } from "@tanstack/react-query";
import {
  loadAcademyDashboard,
  getAssignedChildren,
  getChildJourneyProgress,
  computeChildProgressSummary,
  type AcademyDashboardData,
  type AcademyFacilitatorProfile,
  type ChildProgressSummary,
} from "./data-access";

/**
 * Hook: Fetch Academy dashboard data
 * Combines facilitator profile with assigned children and progress
 */
export function useAcademyDashboard(facilitator: AcademyFacilitatorProfile | null): UseQueryResult<AcademyDashboardData> {
  return useQuery({
    queryKey: ["academy-dashboard", facilitator?.uid],
    queryFn: async () => {
      if (!facilitator) throw new Error("Facilitator not authenticated");
      return loadAcademyDashboard(facilitator);
    },
    enabled: !!facilitator,
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 2,
  });
}

/**
 * Hook: Fetch assigned children for facilitator
 */
export function useAssignedChildren(facilitatorUid: string | null): UseQueryResult<any[]> {
  return useQuery({
    queryKey: ["assigned-children", facilitatorUid],
    queryFn: async () => {
      if (!facilitatorUid) throw new Error("Facilitator UID required");
      return getAssignedChildren(facilitatorUid);
    },
    enabled: !!facilitatorUid,
    staleTime: 5 * 60 * 1000,
    retry: 2,
  });
}

/**
 * Hook: Fetch child progress summary
 */
export function useChildProgressSummary(
  familyId: string | null,
  childId: string | null,
  childName: string = "",
  avatar: string = "🧒",
): UseQueryResult<ChildProgressSummary> {
  return useQuery({
    queryKey: ["child-progress", familyId, childId],
    queryFn: async () => {
      if (!familyId || !childId) throw new Error("Family and child IDs required");
      const progress = await getChildJourneyProgress(familyId, childId);
      return computeChildProgressSummary(
        { id: childId, familyId, name: childName, avatar, age: 10, tier: "junior", tatiId: "", facilitatorUids: [] },
        progress,
      );
    },
    enabled: !!familyId && !!childId,
    staleTime: 5 * 60 * 1000,
    retry: 2,
  });
}
