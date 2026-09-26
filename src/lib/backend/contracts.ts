import type { AuthenticatedUser, ChildSession } from "@/lib/auth/authorization.server";
import type { ChildProfile, CreateChildInput } from "@/lib/family";
import type { ProgressEvent } from "@/lib/learning/progress";
import type { RecordProgressInput } from "@/lib/progress/service";
import type { AssessmentDefinition, AssessmentResult } from "@/lib/assessment/types";
import type { ScenarioState } from "@/lib/scenario/types";
import type { FeedbackRow, FeedbackSubmission } from "@/lib/feedback";
import type { AnalyticsEvent, AnalyticsEventName } from "@/lib/analytics";
import type { AwardedAchievement } from "@/lib/gamification/achievements";

export type BackendProviderName = "supabase" | "firebase";

export interface AuthService {
  getCurrentUser(): Promise<AuthenticatedUser | null>;
  signIn(input: { email: string; password: string }): Promise<AuthenticatedUser>;
  signOut(): Promise<void>;
}

export interface FamilyService {
  ensureFamily(): Promise<string>;
  getFamilyChildren(): Promise<ChildProfile[]>;
  createChild(input: CreateChildInput): Promise<ChildProfile>;
  updateChild(id: string, changes: Partial<ChildProfile>): Promise<void>;
  assertChildAccess(childId: string): Promise<void>;
}

export interface FamilyMemberService {
  getMembers(familyId: string): Promise<Array<{ userId: string; role: string }>>;
}

export interface ChildProfileService {
  getChild(childId: string): Promise<ChildProfile | null>;
}

export interface ChildSessionService {
  login(tatiId: string, pin: string): Promise<{ profile: ChildProfile; session: ChildSession }>;
  getCurrentSession(): Promise<{ profile: ChildProfile; session: ChildSession } | null>;
  logout(): Promise<void>;
}

export interface JourneyProgressService {
  getProgress(childId: string): Promise<ProgressEvent[]>;
  recordProgress(input: RecordProgressInput): Promise<void>;
}

export interface AssessmentService {
  saveAttempt(
    childId: string,
    definition: AssessmentDefinition,
    result: AssessmentResult,
  ): Promise<void>;
}

export interface AssessmentResponseService {
  saveResponses(
    childId: string,
    definition: AssessmentDefinition,
    result: AssessmentResult,
  ): Promise<void>;
}

export interface ScenarioSessionService {
  loadSession(childId: string, scenarioId: string): Promise<ScenarioState | undefined>;
  saveSession(childId: string, state: ScenarioState): Promise<string | undefined>;
}

export interface ScenarioDecisionService {
  recordDecision(childId: string, sessionId: string, state: ScenarioState): Promise<void>;
}

export interface CompetencyService {
  getCompetencies(
    childId: string,
  ): Promise<Array<{ competencyId: string; score: number; level: string }>>;
}

export interface AchievementService {
  getAchievements(childId: string): Promise<AwardedAchievement[]>;
  awardAchievements(childId: string, achievementIds: string[]): Promise<void>;
  markCelebrated(childId: string, achievementIds: string[]): Promise<void>;
}

export interface ParentInsightService {
  getInsights(
    childId: string,
  ): Promise<Array<{ id: string; type: string; content: Record<string, unknown> }>>;
}

export interface FeedbackService {
  submit(input: FeedbackSubmission): Promise<void>;
  getForReview(): Promise<FeedbackRow[]>;
}

export interface AnalyticsService {
  track(
    eventName: AnalyticsEventName,
    input?: { childProfileId?: string | null; entityId?: string | null; eventKey?: string | null },
  ): Promise<string | undefined>;
  getForReview(): Promise<AnalyticsEvent[]>;
}

export interface TatiApplicationServices {
  provider: BackendProviderName;
  auth: AuthService;
  families: FamilyService;
  familyMembers: FamilyMemberService;
  childProfiles: ChildProfileService;
  childSessions: ChildSessionService;
  progress: JourneyProgressService;
  assessments: AssessmentService;
  assessmentResponses: AssessmentResponseService;
  scenarioSessions: ScenarioSessionService;
  scenarioDecisions: ScenarioDecisionService;
  competencies: CompetencyService;
  achievements: AchievementService;
  parentInsights: ParentInsightService;
  feedback: FeedbackService;
  analytics: AnalyticsService;
}
