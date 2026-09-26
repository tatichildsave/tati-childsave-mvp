import type { Firestore } from "firebase/firestore";
import {
  FirebaseAchievementRepository,
  FirebaseChildProfileRepository,
  FirebaseCompetencyRepository,
  FirebaseFamilyMemberRepository,
  FirebaseFamilyRepository,
  FirebaseJourneyProgressRepository,
} from "./repositories";

export interface FirebaseRepositoryBundle {
  families: FirebaseFamilyRepository;
  familyMembers: FirebaseFamilyMemberRepository;
  childProfiles: FirebaseChildProfileRepository;
  progress: FirebaseJourneyProgressRepository;
  competencies: FirebaseCompetencyRepository;
  achievements: FirebaseAchievementRepository;
}

/**
 * Creates only the Phase F repositories. This bundle is dormant and is not
 * registered as the application's active provider yet.
 */
export function createFirebaseRepositoryBundle(
  db: Firestore,
  input: { userId: string; familyId: string },
): FirebaseRepositoryBundle {
  return {
    families: new FirebaseFamilyRepository(db, input.userId),
    familyMembers: new FirebaseFamilyMemberRepository(db),
    childProfiles: new FirebaseChildProfileRepository(db, input.familyId),
    progress: new FirebaseJourneyProgressRepository(db, input.familyId),
    competencies: new FirebaseCompetencyRepository(db, input.familyId),
    achievements: new FirebaseAchievementRepository(db, input.familyId),
  };
}
