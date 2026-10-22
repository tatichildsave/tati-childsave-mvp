/**
 * TATI Academy class scheduling data layer.
 *
 * Classes live in academyClasses. Firestore rules restrict writes to the
 * facilitator who owns the cohort, and make ownership, cohort, activity and
 * schedule immutable. Only status (scheduled <-> cancelled) can change.
 */

import {
  collection,
  doc,
  getDocs,
  query,
  serverTimestamp,
  setDoc,
  Timestamp,
  updateDoc,
  where,
} from "firebase/firestore";
import { useMutation, useQuery, useQueryClient, type UseQueryResult } from "@tanstack/react-query";
import { getFirebaseFirestore } from "@/integrations/firebase/client";
import type { AcademyClass, AcademyClassDeliveryMode } from "./class-schedule";

export interface CreateClassInput {
  facilitatorUid: string;
  cohortId: string;
  activityId: string;
  scheduledAt: Date;
  durationMinutes: number;
  deliveryMode: AcademyClassDeliveryMode;
  location: string;
}

function requireDb() {
  const db = getFirebaseFirestore();
  if (!db) throw new Error("Firestore not initialized");
  return db;
}

function toAcademyClass(id: string, data: Record<string, unknown>): AcademyClass | null {
  const when = data["scheduledAt"];
  const scheduledAt = when instanceof Timestamp ? when.toDate() : null;
  const cohortId = data["cohortId"];
  const activityId = data["activityId"];
  const facilitatorUid = data["facilitatorUid"];
  const duration = data["durationMinutes"];
  const delivery = data["deliveryMode"];
  const location = data["location"];
  const status = data["status"];

  if (
    !scheduledAt ||
    typeof cohortId !== "string" ||
    typeof activityId !== "string" ||
    typeof facilitatorUid !== "string" ||
    typeof duration !== "number" ||
    (delivery !== "in-person" && delivery !== "virtual") ||
    typeof location !== "string" ||
    (status !== "scheduled" && status !== "cancelled")
  ) {
    return null;
  }

  return {
    id,
    cohortId,
    activityId,
    facilitatorUid,
    scheduledAt,
    durationMinutes: duration,
    deliveryMode: delivery,
    location,
    status,
  };
}

/** Create a scheduled class for a cohort the facilitator owns. */
export async function createAcademyClass(input: CreateClassInput): Promise<string> {
  const db = requireDb();
  const ref = doc(collection(db, "academyClasses"));
  await setDoc(ref, {
    facilitatorUid: input.facilitatorUid,
    cohortId: input.cohortId,
    activityId: input.activityId,
    scheduledAt: Timestamp.fromDate(input.scheduledAt),
    durationMinutes: input.durationMinutes,
    deliveryMode: input.deliveryMode,
    location: input.location.trim(),
    status: "scheduled",
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return ref.id;
}

/** Cancel a class. The record is kept for history; only status changes. */
export async function cancelAcademyClass(classId: string): Promise<void> {
  const db = requireDb();
  await updateDoc(doc(db, "academyClasses", classId), {
    status: "cancelled",
    updatedAt: serverTimestamp(),
  });
}

/** All classes owned by a facilitator. Filtering and sorting happen client-side. */
export async function getFacilitatorClasses(facilitatorUid: string): Promise<AcademyClass[]> {
  const db = requireDb();
  const snap = await getDocs(
    query(collection(db, "academyClasses"), where("facilitatorUid", "==", facilitatorUid)),
  );
  return snap.docs
    .map((d) => toAcademyClass(d.id, d.data() as Record<string, unknown>))
    .filter((c): c is AcademyClass => c !== null);
}

export function useFacilitatorClasses(facilitatorUid: string | null): UseQueryResult<AcademyClass[]> {
  return useQuery({
    queryKey: ["academy-classes", facilitatorUid],
    queryFn: () => {
      if (!facilitatorUid) throw new Error("Facilitator UID required");
      return getFacilitatorClasses(facilitatorUid);
    },
    enabled: !!facilitatorUid,
    staleTime: 60 * 1000,
    retry: 2,
  });
}

export function useCreateAcademyClass(facilitatorUid: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: Omit<CreateClassInput, "facilitatorUid">) => {
      if (!facilitatorUid) throw new Error("Facilitator UID required");
      return createAcademyClass({ ...input, facilitatorUid });
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["academy-classes", facilitatorUid] });
    },
  });
}

export function useCancelAcademyClass(facilitatorUid: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (classId: string) => cancelAcademyClass(classId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["academy-classes", facilitatorUid] });
    },
  });
}
