// Domain types for TATI learning content. Content is data-driven: lessons,
// scenarios and assessments are described by these types, never hard-coded
// into page components. Future tracks (SPEND, EARN) and tiers (teen, plus)
// simply add more data files.

export type Tier = "junior" | "teen" | "plus";

export interface AssessmentOption {
  id: string;
  label: string;
}

export interface AssessmentQuestion {
  id: string;
  prompt: string;
  options: AssessmentOption[];
  /** The option that shows the strongest saving habit. Never shown as "right/wrong". */
  bestOptionId: string;
  /** Warm, non-shaming feedback shown after answering. */
  feedback: string;
}

export interface Assessment {
  id: string;
  phase: "pre" | "post";
  title: string;
  intro: string;
  questions: AssessmentQuestion[];
}

export type LessonBlock =
  | { type: "text"; body: string }
  | { type: "highlight"; body: string }
  | { type: "example"; title: string; body: string }
  | {
      type: "checkpoint";
      prompt: string;
      options: AssessmentOption[];
      bestOptionId: string;
      feedback: string;
    };

export interface Lesson {
  id: string;
  title: string;
  minutes: number;
  bigIdea: string;
  blocks: LessonBlock[];
  /** Reserved for future listen/text-to-speech support. */
  audioScript?: string;
}

export interface ScenarioChoice {
  id: string;
  label: string;
  /** Change to the child's savings in GH₵. */
  savingsDelta: number;
  /** Warm consequence narration. */
  outcome: string;
  /** Next step id, or undefined to end the scenario. */
  next?: string;
  reflection?: string;
}

export interface ScenarioStep {
  id: string;
  situation: string;
  question: string;
  choices: ScenarioChoice[];
}

export interface Scenario {
  id: string;
  title: string;
  summary: string;
  startingSavings: number;
  startStepId: string;
  steps: ScenarioStep[];
  closingReflection: string;
}

export type TrackItemKind = "assessment" | "lesson" | "scenario" | "reflection";

/** A short pause-and-think stop between story chapters. No right answers. */
export interface ReflectionPrompt {
  id: string;
  title: string;
  /** Why we are pausing here, in one child-friendly line. */
  intro: string;
  question: string;
  options: { id: string; label: string; response: string }[];
  closing: string;
  icon?: string;
}

/**
 * One stop on the adventure trail. Presentation copy lives in the data so the
 * trail screen stays a pure renderer.
 */
export interface TrackItem {
  kind: TrackItemKind;
  id: string;
  /** Trail label, e.g. "LESSON", "DILEMMA", "FRAMEWORK". */
  label?: string;
  /** One-line child-friendly description shown under the title. */
  blurb?: string;
  /** Short chip, e.g. "Saved GH₵10". */
  chip?: string;
  /** Emoji shown for upcoming steps. */
  icon?: string;
  /** Cedis added to the goal jar when this step is cleared. */
  reward?: number;
  /** Title shown for a scenario chapter stop. */
  chapterTitle?: string;
  /** Chapter heading on the journey map, e.g. "Chapter 2 — Market day". */
  stage?: string;
  /** For scenario chapters: the underlying scenario definition id. */
  scenarioId?: string;
  /** Story nodes that begin the NEXT chapter — the chapter pauses there. */
  pauseBefore?: string[];
}

/** The term-long challenge that frames the whole track. */
export interface TrackGoal {
  challengeName: string;
  title: string;
  /** Savings target in GH₵. */
  target: number;
  daysTotal: number;
  finaleTitle: string;
  finaleBody: string;
}

export interface Track {
  id: string;
  tier: Tier;
  name: string;
  tagline: string;
  /** Story line shown on the trail banner. */
  storyline?: string;
  goal?: TrackGoal;
  assessments: Assessment[];
  reflections?: ReflectionPrompt[];
  lessons: Lesson[];
  scenarios: Scenario[];
  /** Ordered learning journey. */
  sequence: TrackItem[];
}
