import { FieldValue } from "firebase-admin/firestore";
import type { Firestore } from "firebase-admin/firestore";
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
    created_at: (document.createdAt as any).toDate?.().toISOString?.() || new Date(document.createdAt).toISOString(),
    updated_at: (document.updatedAt as any).toDate?.().toISOString?.() || new Date(document.updatedAt).toISOString(),
  };
}

export class FirebaseFamilyRepository implements FamilyService {
  constructor(
    private readonly db: Firestore,
    private readonly userId: string,
  ) {}

  async ensureFamily(): Promise<string> {
    try {
      console.log("[ensureFamily] Checking for existing family membership for user:", this.userId);
      // Check for existing active family membership
      const memberships = await this.db
        .collection("users")
        .doc(this.userId)
        .collection("familyMemberships")
        .get();
      
      console.log("[ensureFamily] Found", memberships.docs.length, "memberships");
      const active = memberships.docs.find((item) => item.data()["status"] === "active");
      if (active) {
        console.log("[ensureFamily] Found existing family:", active.id);
        return active.id;
      }

      // No family exists - create a new one
      console.log("[ensureFamily] Creating new family for user:", this.userId);
      const familyId = `fam-${crypto.randomUUID()}`;
      const now = FieldValue.serverTimestamp();

      // Create family document with all required fields per FirestoreFamilyDocument schema
      await this.db
        .collection("families")
        .doc(familyId)
        .set({
          name: "My Family",  // Default family name
          createdBy: this.userId,
          status: "active",
          createdAt: now,
          updatedAt: now,
        });
      console.log("[ensureFamily] Family document created:", familyId);

      // Create family membership for this user
      await this.db
        .collection("users")
        .doc(this.userId)
        .collection("familyMemberships")
        .doc(familyId)
        .set({
          familyId,
          userId: this.userId,
          role: "parent",
          status: "active",
          createdAt: now,
        });
      console.log("[ensureFamily] Membership document created:", familyId);

      console.log("[ensureFamily] Family created:", familyId);
      return familyId;
    } catch (error) {
      console.error("[ensureFamily] Error for user:", this.userId, error);
      throw error;
    }
  }

  async getFamilyChildren(): Promise<ChildProfile[]> {
    try {
      console.log("[getFamilyChildren] Getting family ID");
      const familyId = await this.ensureFamily();
      console.log("[getFamilyChildren] Got family:", familyId, "querying children");
      
      const children = await this.db
        .collection("families")
        .doc(familyId)
        .collection("children")
        .orderBy("createdAt", "asc")
        .get();
      
      console.log("[getFamilyChildren] Query succeeded, found", children.docs.length, "children");
      const result = children.docs.map((item) => {
        try {
          return toChildProfile(item.data() as FirestoreChildDocument);
        } catch (e) {
          console.error("[getFamilyChildren] Error mapping child document:", item.id, e);
          throw new Error(`Failed to map child ${item.id}: ${e instanceof Error ? e.message : String(e)}`);
        }
      });
      console.log("[getFamilyChildren] Successfully converted", result.length, "children");
      return result;
    } catch (error) {
      console.error("[getFamilyChildren] Error:", error);
      throw error;
    }
  }

  async createChild(input: CreateChildInput): Promise<ChildProfile> {
    try {
      console.log("[createChild] Starting for user:", this.userId, "child name:", input.name);
      const familyId = await this.ensureFamily();
      console.log("[createChild] Got family:", familyId);
      
      const childId = crypto.randomUUID();
      console.log("[createChild] Generated child ID:", childId);
      
      const now = FieldValue.serverTimestamp();
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
      
      console.log("[createChild] Writing child document");
      await this.db
        .collection("families")
        .doc(familyId)
        .collection("children")
        .doc(childId)
        .set(document);
      console.log("[createChild] Document written, reading back");
      
      const saved = await this.db
        .collection("families")
        .doc(familyId)
        .collection("children")
        .doc(childId)
        .get();
      
      if (!saved.exists) {
        throw new Error("Child document was written but cannot be read back");
      }
      
      console.log("[createChild] Document read, converting to profile");
      const profile = toChildProfile(saved.data() as FirestoreChildDocument);
      console.log("[createChild] Success! Created child profile:", profile.id);
      return profile;
    } catch (error) {
      console.error("[createChild] Error for user:", this.userId, error);
      throw error;
    }
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
      updatedAt: FieldValue.serverTimestamp(),
    };
    await this.db
      .collection("families")
      .doc(familyId)
      .collection("children")
      .doc(id)
      .update(allowed);
  }

  async assertChildAccess(childId: string): Promise<void> {
    const familyId = await this.ensureFamily();
    const snapshot = await this.db
      .collection("families")
      .doc(familyId)
      .collection("children")
      .doc(childId)
      .get();
    if (!snapshot.exists) throw new Error("That learner is not part of your family.");
  }
}

export class FirebaseFamilyMemberRepository implements FamilyMemberService {
  constructor(private readonly db: Firestore) {}

  async getMembers(familyId: string): Promise<Array<{ userId: string; role: string }>> {
    const members = await this.db
      .collection("families")
      .doc(familyId)
      .collection("members")
      .get();
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
    const snapshot = await this.db
      .collection("families")
      .doc(this.familyId)
      .collection("children")
      .doc(childId)
      .get();
    return snapshot.exists ? toChildProfile(snapshot.data() as FirestoreChildDocument) : null;
  }
}

export class FirebaseJourneyProgressRepository implements JourneyProgressService {
  constructor(
    private readonly db: Firestore,
    private readonly familyId: string,
  ) {}

  async getProgress(childId: string): Promise<ProgressEvent[]> {
    const rows = await this.db
      .collection("families")
      .doc(this.familyId)
      .collection("children")
      .doc(childId)
      .collection("journeyProgress")
      .orderBy("updatedAt", "asc")
      .get();
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
        created_at: (row.createdAt as any).toDate?.().toISOString?.() || new Date(row.createdAt).toISOString(),
        updated_at: (row.updatedAt as any).toDate?.().toISOString?.() || new Date(row.updatedAt).toISOString(),
      };
    });
  }

  async recordProgress(input: RecordProgressInput): Promise<void> {
    const itemKey = `${input.itemType}:${input.itemId}`;
    await this.db
      .collection("families")
      .doc(this.familyId)
      .collection("children")
      .doc(input.childId)
      .collection("journeyProgress")
      .doc(itemKey)
      .set(
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
          createdAt: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp(),
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
    const rows = await this.db
      .collection("families")
      .doc(this.familyId)
      .collection("children")
      .doc(childId)
      .collection("competencies")
      .get();
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
    const rows = await this.db
      .collection("families")
      .doc(this.familyId)
      .collection("children")
      .doc(childId)
      .collection("achievements")
      .get();
    return rows.docs.map((item) => {
      const row = item.data() as FirestoreAchievementDocument;
      return { achievementId: row.achievementId, celebrated: row.celebrated };
    });
  }

  async awardAchievements(childId: string, achievementIds: string[]): Promise<void> {
    await Promise.all(
      achievementIds.map((achievementId) =>
        this.db
          .collection("families")
          .doc(this.familyId)
          .collection("children")
          .doc(childId)
          .collection("achievements")
          .doc(achievementId)
          .set(
            { achievementId, celebrated: false, awardedAt: FieldValue.serverTimestamp() },
            { merge: true },
          ),
      ),
    );
  }

  async markCelebrated(childId: string, achievementIds: string[]): Promise<void> {
    await Promise.all(
      achievementIds.map((achievementId) =>
        this.db
          .collection("families")
          .doc(this.familyId)
          .collection("children")
          .doc(childId)
          .collection("achievements")
          .doc(achievementId)
          .update({ celebrated: true }),
      ),
    );
  }
}
