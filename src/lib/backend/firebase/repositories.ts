import {
  collection,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  type Firestore,
} from "firebase/firestore";
import type { ChildProfile, CreateChildInput } from "@/lib/family";
import type { ProgressEvent } from "@/lib/learning/progress";
import type { RecordProgressInput } from "@/lib/progress/service";
import type { AwardedAchievement } from "@/lib/gamification/achievements";
import type {
  FirestoreAchievementDocument,
  FirestoreChildDocument,
  FirestoreCompetencyDocument,
  FirestoreFamilyDocument,
  FirestoreFamilyMemberDocument,
  FirestoreJourneyProgressDocument,
} from "@/integrations/firebase/firestore-types";
import type {
  AchievementService,
  ChildProfileService,
  FamilyMemberService,
  FamilyService,
  JourneyProgressService,
  CompetencyService,
} from "@/lib/backend/contracts";

function familyRef(db: Firestore, familyId: string) {
  return doc(db, "families", familyId);
}

function childRef(db: Firestore, familyId: string, childId: string) {
  return doc(familyRef(db, familyId), "children", childId);
}

function toChildProfile(document: FirestoreChildDocument): ChildProfile {
  return {
    id: document.id,
    tati_id: document.tati_id,
    family_id: document.familyId,
    created_by: document.created_by,
    name: document.name,
    age: document.age,
    avatar: document.avatar,
    tier: document.tier,
    curriculum_level: document.curriculum_level,
    onboarding_step: document.onboarding_step,
    onboarding_completed: document.onboarding_completed,
    created_at: document.createdAt.toDate().toISOString(),
    updated_at: document.updatedAt.toDate().toISOString(),
  };
}

export class FirebaseFamilyRepository implements FamilyService {
  constructor(
    private readonly db: Firestore,
    private readonly userId: string,
  ) {}

  async ensureFamily(): Promise<string> {
    const members = await getDocs(collection(this.db, "users", this.userId, "familyMemberships"));
    const active = members.docs.find((item) => item.data()["status"] === "active");
    if (active) return active.id;
    throw new Error("No active family membership found.");
  }

  async getFamilyChildren(): Promise<ChildProfile[]> {
    const familyId = await this.ensureFamily();
    const children = await getDocs(
      query(collection(familyRef(this.db, familyId), "children"), orderBy("createdAt", "asc")),
    );
    return children.docs.map((item) => toChildProfile(item.data() as FirestoreChildDocument));
  }

  async createChild(input: CreateChildInput): Promise<ChildProfile> {
    const familyId = await this.ensureFamily();
    const childId = crypto.randomUUID();
    const ref = childRef(this.db, familyId, childId);
    const now = serverTimestamp();
    const document = {
      id: childId,
      familyId,
      created_by: this.userId,
      name: input.name.trim(),
      age: input.age,
      avatar: input.avatar,
      tier: "junior",
      curriculum_level: `Primary ${Math.max(1, input.age - 5)}`,
      onboarding_step: 0,
      onboarding_completed: input.onboardingCompleted ?? true,
      tati_id: "",
      createdAt: now,
      updatedAt: now,
    };
    await setDoc(ref, document);
    const saved = await getDoc(ref);
    return toChildProfile(saved.data() as FirestoreChildDocument);
  }

  async updateChild(id: string, changes: Partial<ChildProfile>): Promise<void> {
    const familyId = await this.ensureFamily();
    const allowed = {
      ...(changes.name === undefined ? {} : { name: changes.name }),
      ...(changes.age === undefined ? {} : { age: changes.age }),
      ...(changes.avatar === undefined ? {} : { avatar: changes.avatar }),
      ...(changes.onboarding_step === undefined
        ? {}
        : { onboarding_step: changes.onboarding_step }),
      ...(changes.onboarding_completed === undefined
        ? {}
        : { onboarding_completed: changes.onboarding_completed }),
      updatedAt: serverTimestamp(),
    };
    await updateDoc(childRef(this.db, familyId, id), allowed);
  }

  async assertChildAccess(childId: string): Promise<void> {
    const familyId = await this.ensureFamily();
    const snapshot = await getDoc(childRef(this.db, familyId, childId));
    if (!snapshot.exists()) throw new Error("That learner is not part of your family.");
  }
}

export class FirebaseFamilyMemberRepository implements FamilyMemberService {
  constructor(private readonly db: Firestore) {}

  async getMembers(familyId: string): Promise<Array<{ userId: string; role: string }>> {
    const members = await getDocs(collection(familyRef(this.db, familyId), "members"));
    return members.docs.map((item) => {
      const member = item.data() as FirestoreFamilyMemberDocument;
      return { userId: member.uid, role: member.role };
    });
  }
}

export class FirebaseChildProfileRepository implements ChildProfileService {
  constructor(
    private readonly db: Firestore,
    private readonly familyId: string,
  ) {}

  async getChild(childId: string): Promise<ChildProfile | null> {
    const snapshot = await getDoc(childRef(this.db, this.familyId, childId));
    return snapshot.exists() ? toChildProfile(snapshot.data() as FirestoreChildDocument) : null;
  }
}

export class FirebaseJourneyProgressRepository implements JourneyProgressService {
  constructor(
    private readonly db: Firestore,
    private readonly familyId: string,
  ) {}

  async getProgress(childId: string): Promise<ProgressEvent[]> {
    const rows = await getDocs(
      query(
        collection(childRef(this.db, this.familyId, childId), "journeyProgress"),
        orderBy("updatedAt", "asc"),
      ),
    );
    return rows.docs.map((item) => {
      const row = item.data() as FirestoreJourneyProgressDocument;
      return {
        id: row.id,
        child_profile_id: row.child_profile_id,
        track_id: row.track_id,
        item_type: row.item_type,
        item_id: row.item_id,
        status: row.status,
        score: row.score,
        max_score: row.max_score,
        details: row.details,
        created_at: row.createdAt.toDate().toISOString(),
        updated_at: row.updatedAt.toDate().toISOString(),
      };
    });
  }

  async recordProgress(input: RecordProgressInput): Promise<void> {
    const itemKey = `${input.itemType}:${input.itemId}`;
    const ref = doc(
      collection(childRef(this.db, this.familyId, input.childId), "journeyProgress"),
      itemKey,
    );
    await setDoc(
      ref,
      {
        id: itemKey,
        familyId: this.familyId,
        childId: input.childId,
        child_profile_id: input.childId,
        track_id: "save",
        item_type: input.itemType,
        item_id: input.itemId,
        status: "completed",
        score: input.score ?? null,
        max_score: input.maxScore ?? null,
        details: input.details ?? {},
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      },
      { merge: true },
    );
  }
}

export class FirebaseCompetencyRepository implements CompetencyService {
  constructor(
    private readonly db: Firestore,
    private readonly familyId: string,
  ) {}

  async getCompetencies(childId: string) {
    const rows = await getDocs(
      collection(childRef(this.db, this.familyId, childId), "competencies"),
    );
    return rows.docs.map((item) => {
      const row = item.data() as FirestoreCompetencyDocument;
      return { competencyId: row.competencyId, score: row.score, level: row.level };
    });
  }
}

export class FirebaseAchievementRepository implements AchievementService {
  constructor(
    private readonly db: Firestore,
    private readonly familyId: string,
  ) {}

  async getAchievements(childId: string): Promise<AwardedAchievement[]> {
    const rows = await getDocs(
      collection(childRef(this.db, this.familyId, childId), "achievements"),
    );
    return rows.docs.map((item) => {
      const row = item.data() as FirestoreAchievementDocument;
      return { achievementId: row.achievementId, celebrated: row.celebrated };
    });
  }

  async awardAchievements(childId: string, achievementIds: string[]): Promise<void> {
    await Promise.all(
      achievementIds.map((achievementId) =>
        setDoc(
          doc(collection(childRef(this.db, this.familyId, childId), "achievements"), achievementId),
          { achievementId, celebrated: false, awardedAt: serverTimestamp() },
          { merge: true },
        ),
      ),
    );
  }

  async markCelebrated(childId: string, achievementIds: string[]): Promise<void> {
    await Promise.all(
      achievementIds.map((achievementId) =>
        updateDoc(
          doc(collection(childRef(this.db, this.familyId, childId), "achievements"), achievementId),
          { celebrated: true },
        ),
      ),
    );
  }
}
