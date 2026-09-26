/**
 * TATI Academy React Query Hooks
 * Client-side data fetching with caching and state management
 */

import {
  useQuery,
  useMutation,
  useQueryClient,
  type UseQueryResult,
  type UseMutationResult,
} from "@tanstack/react-query";
import {
  loadAcademyDashboard,
  getAssignedChildren,
  getChildJourneyProgress,
  computeChildProgressSummary,
  type AcademyDashboardData,
  type AcademyFacilitatorProfile,
  type ChildProgressSummary,
  type AssignedChild,
} from "./data-access";
import {
  createAcademySession,
  getAcademySession,
  getActiveFacilitatorSession,
  listFacilitatorSessions,
  updateSessionAttendance,
  updateSessionNote,
  completeAcademySession,
  type AcademySession,
  type CreateSessionInput,
} from "./session-data";
import {
  createAcademyCohort,
  getAcademyCohort,
  getFacilitatorCohorts,
  updateAcademyCohort,
  archiveAcademyCohort,
  type AcademyCohort,
  type CreateCohortInput,
  type UpdateCohortInput,
  type ArchiveCohortInput,
} from "./cohort-data";
import {
  createSchool,
  getSchool,
  getAllSchools,
  updateSchool,
  archiveSchool,
  assignSchoolAdmin,
  removeSchoolAdmin,
  getSchoolAdmins,
  isUserSchoolAdmin,
  type School,
  type CreateSchoolInput,
  type UpdateSchoolInput,
  type AssignSchoolAdminInput,
  type RemoveSchoolAdminInput,
} from "./school-data";

/**
 * Hook: Fetch Academy dashboard data
 * Combines facilitator profile with assigned children and progress
 */
export function useAcademyDashboard(
  facilitator: AcademyFacilitatorProfile | null,
): UseQueryResult<AcademyDashboardData> {
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
export function useAssignedChildren(
  facilitatorUid: string | null,
): UseQueryResult<AssignedChild[]> {
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
        {
          id: childId,
          familyId,
          name: childName,
          avatar,
          age: 10,
          tier: "junior",
          tatiId: "",
          facilitatorUids: [],
        },
        progress,
      );
    },
    enabled: !!familyId && !!childId,
    staleTime: 5 * 60 * 1000,
    retry: 2,
  });
}

/**
 * Hook: Fetch a single academy session
 */
export function useAcademySession(
  sessionId: string | null,
  facilitatorUid: string | null,
): UseQueryResult<AcademySession | null> {
  return useQuery({
    queryKey: ["academy-session", sessionId],
    queryFn: async () => {
      if (!sessionId || !facilitatorUid) return null;
      return getAcademySession(sessionId, facilitatorUid);
    },
    enabled: !!sessionId && !!facilitatorUid,
    staleTime: 30 * 1000, // 30 seconds (more frequent refresh for active sessions)
    retry: 1,
  });
}

/**
 * Hook: Check for active session for a specific activity
 */
export function useActiveFacilitatorSession(
  facilitatorUid: string | null,
  activityId: string | null,
): UseQueryResult<AcademySession | null> {
  return useQuery({
    queryKey: ["academy-active-session", facilitatorUid, activityId],
    queryFn: async () => {
      if (!facilitatorUid || !activityId) return null;
      return getActiveFacilitatorSession(facilitatorUid, activityId);
    },
    enabled: !!facilitatorUid && !!activityId,
    staleTime: 10 * 1000, // 10 seconds (frequent refresh)
    retry: 1,
  });
}

/**
 * Hook: List all sessions for facilitator
 */
export function useFacilitatorSessions(
  facilitatorUid: string | null,
): UseQueryResult<AcademySession[]> {
  return useQuery({
    queryKey: ["academy-sessions", facilitatorUid],
    queryFn: async () => {
      if (!facilitatorUid) return [];
      return listFacilitatorSessions(facilitatorUid);
    },
    enabled: !!facilitatorUid,
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 1,
  });
}

/**
 * Hook: Create new academy session (mutation)
 */
export function useCreateAcademySession(): UseMutationResult<
  string,
  unknown,
  CreateSessionInput,
  unknown
> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createAcademySession,
    onSuccess: (sessionId, input) => {
      // Invalidate active session queries
      queryClient.invalidateQueries({
        queryKey: ["academy-active-session", input.facilitatorUid, input.activityId],
      });
      // Invalidate sessions list
      queryClient.invalidateQueries({
        queryKey: ["academy-sessions", input.facilitatorUid],
      });
    },
  });
}

/**
 * Hook: Update session attendance (mutation)
 */
export function useUpdateSessionAttendance(): UseMutationResult<
  void,
  unknown,
  {
    sessionId: string;
    facilitatorUid: string;
    childId: string;
    status: "present" | "absent" | "unknown";
  },
  unknown
> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input) => {
      return updateSessionAttendance(
        input.sessionId,
        input.facilitatorUid,
        input.childId,
        input.status,
      );
    },
    onSuccess: (_, input) => {
      // Invalidate session query
      queryClient.invalidateQueries({
        queryKey: ["academy-session", input.sessionId],
      });
    },
  });
}

/**
 * Hook: Update session note (mutation)
 */
export function useUpdateSessionNote(): UseMutationResult<
  void,
  unknown,
  { sessionId: string; facilitatorUid: string; note: string },
  unknown
> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input) => {
      return updateSessionNote(input.sessionId, input.facilitatorUid, input.note);
    },
    onSuccess: (_, input) => {
      // Invalidate session query
      queryClient.invalidateQueries({
        queryKey: ["academy-session", input.sessionId],
      });
    },
  });
}

/**
 * Hook: Complete academy session (mutation)
 */
export function useCompleteAcademySession(): UseMutationResult<
  void,
  unknown,
  { sessionId: string; facilitatorUid: string },
  unknown
> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input) => {
      return completeAcademySession(input.sessionId, input.facilitatorUid);
    },
    onSuccess: (_, input) => {
      // Invalidate session query
      queryClient.invalidateQueries({
        queryKey: ["academy-session", input.sessionId],
      });
      // Invalidate sessions list
      queryClient.invalidateQueries({
        queryKey: ["academy-sessions", input.facilitatorUid],
      });
    },
  });
}

// ============================================================================
// COHORT HOOKS (H3.2.9)
// ============================================================================

/**
 * Hook: Fetch all cohorts for a facilitator
 */
export function useFacilitatorCohorts(
  facilitatorUid: string | null,
): UseQueryResult<AcademyCohort[]> {
  return useQuery({
    queryKey: ["academy-cohorts", facilitatorUid],
    queryFn: async () => {
      if (!facilitatorUid) throw new Error("Facilitator UID required");
      return getFacilitatorCohorts(facilitatorUid);
    },
    enabled: !!facilitatorUid,
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 2,
  });
}

/**
 * Hook: Fetch a single cohort
 */
export function useAcademyCohort(
  cohortId: string | null,
  facilitatorUid: string | null,
): UseQueryResult<AcademyCohort | null> {
  return useQuery({
    queryKey: ["academy-cohort", cohortId],
    queryFn: async () => {
      if (!cohortId || !facilitatorUid) return null;
      return getAcademyCohort(cohortId, facilitatorUid);
    },
    enabled: !!cohortId && !!facilitatorUid,
    staleTime: 5 * 60 * 1000,
    retry: 2,
  });
}

/**
 * Hook: Create a new cohort (mutation)
 */
export function useCreateAcademyCohort(): UseMutationResult<
  string,
  unknown,
  CreateCohortInput,
  unknown
> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input) => {
      return createAcademyCohort(input);
    },
    onSuccess: (_, input) => {
      // Invalidate cohorts list for this facilitator
      queryClient.invalidateQueries({
        queryKey: ["academy-cohorts", input.facilitatorUid],
      });
    },
  });
}

/**
 * Hook: Update a cohort (mutation)
 */
export function useUpdateAcademyCohort(): UseMutationResult<
  void,
  unknown,
  UpdateCohortInput,
  unknown
> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input) => {
      return updateAcademyCohort(input);
    },
    onSuccess: (_, input) => {
      // Invalidate specific cohort
      queryClient.invalidateQueries({
        queryKey: ["academy-cohort", input.cohortId],
      });
      // Invalidate cohorts list
      queryClient.invalidateQueries({
        queryKey: ["academy-cohorts", input.facilitatorUid],
      });
    },
  });
}

/**
 * Hook: Archive a cohort (mutation)
 */
export function useArchiveAcademyCohort(): UseMutationResult<
  void,
  unknown,
  ArchiveCohortInput,
  unknown
> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input) => {
      return archiveAcademyCohort(input);
    },
    onSuccess: (_, input) => {
      // Invalidate specific cohort
      queryClient.invalidateQueries({
        queryKey: ["academy-cohort", input.cohortId],
      });
      // Invalidate cohorts list (archived cohort removed from active list)
      queryClient.invalidateQueries({
        queryKey: ["academy-cohorts", input.facilitatorUid],
      });
    },
  });
}

// ============================================================================
// H3.3 SCHOOL ADMINISTRATION HOOKS
// ============================================================================

/**
 * Hook: Fetch a single school
 */
export function useSchool(schoolId: string | null) {
  return useQuery({
    queryKey: ["school", schoolId],
    queryFn: () => {
      if (!schoolId) throw new Error("School ID required");
      return getSchool(schoolId);
    },
    enabled: !!schoolId,
  });
}

/**
 * Hook: Fetch all schools (platform admin only)
 */
export function useAllSchools() {
  return useQuery({
    queryKey: ["all-schools"],
    queryFn: () => getAllSchools(),
  });
}

/**
 * Hook: Create a new school
 */
export function useCreateSchool(): UseMutationResult<string, unknown, CreateSchoolInput, unknown> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input) => {
      return createSchool(input);
    },
    onSuccess: () => {
      // Invalidate all schools list
      queryClient.invalidateQueries({
        queryKey: ["all-schools"],
      });
    },
  });
}

/**
 * Hook: Update an existing school
 */
export function useUpdateSchool(): UseMutationResult<void, unknown, UpdateSchoolInput, unknown> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input) => {
      return updateSchool(input);
    },
    onSuccess: (_, input) => {
      // Invalidate specific school
      queryClient.invalidateQueries({
        queryKey: ["school", input.schoolId],
      });
      // Invalidate all schools list
      queryClient.invalidateQueries({
        queryKey: ["all-schools"],
      });
    },
  });
}

/**
 * Hook: Archive a school
 */
export function useArchiveSchool(): UseMutationResult<void, unknown, string, unknown> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (schoolId) => {
      return archiveSchool(schoolId);
    },
    onSuccess: (_, schoolId) => {
      // Invalidate specific school
      queryClient.invalidateQueries({
        queryKey: ["school", schoolId],
      });
      // Invalidate all schools list
      queryClient.invalidateQueries({
        queryKey: ["all-schools"],
      });
    },
  });
}

/**
 * Hook: Assign a user as school admin
 */
export function useAssignSchoolAdmin(): UseMutationResult<
  void,
  unknown,
  AssignSchoolAdminInput,
  unknown
> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input) => {
      return assignSchoolAdmin(input);
    },
    onSuccess: (_, input) => {
      // Invalidate school admins list
      queryClient.invalidateQueries({
        queryKey: ["school-admins", input.schoolId],
      });
    },
  });
}

/**
 * Hook: Remove a user from school admin role
 */
export function useRemoveSchoolAdmin(): UseMutationResult<
  void,
  unknown,
  RemoveSchoolAdminInput,
  unknown
> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input) => {
      return removeSchoolAdmin(input);
    },
    onSuccess: (_, input) => {
      // Invalidate school admins list
      queryClient.invalidateQueries({
        queryKey: ["school-admins", input.schoolId],
      });
    },
  });
}

/**
 * Hook: Fetch all admins for a school
 */
export function useSchoolAdmins(schoolId: string | null) {
  return useQuery({
    queryKey: ["school-admins", schoolId],
    queryFn: () => {
      if (!schoolId) throw new Error("School ID required");
      return getSchoolAdmins(schoolId);
    },
    enabled: !!schoolId,
  });
}
