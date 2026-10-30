/**
 * Mini money mission shown on the welcome page.
 * Pure demo logic: it never touches Firebase and never records XP, badges or progress.
 */
export type MissionChoiceId = "save" | "treats" | "borrow";

export interface MissionChoice {
  id: MissionChoiceId;
  emoji: string;
  label: string;
  outcome: "success" | "retry";
  feedback: string;
}

export const MISSION_QUESTION =
  "You have GH₵20. You want to save for a new football. What's a smart move?";

export const MISSION_CHOICES: readonly MissionChoice[] = [
  {
    id: "save",
    emoji: "💚",
    label: "Save GH₵15, keep GH₵5 for needs",
    outcome: "success",
    feedback:
      "Smart move! You set aside GH₵15 for your football and kept GH₵5 for things you need.",
  },
  {
    id: "treats",
    emoji: "🍭",
    label: "Spend everything on treats",
    outcome: "retry",
    feedback:
      "Treats taste great, but spending all GH₵20 today leaves nothing for your football. What could you do differently?",
  },
  {
    id: "borrow",
    emoji: "⚡",
    label: "Borrow the rest right away",
    outcome: "retry",
    feedback:
      "Borrowing means you have to pay the money back later, which can make your goal harder. Saving a little at a time is calmer. Try another choice!",
  },
];

export type MissionState = { status: "idle" } | { status: "answered"; choiceId: MissionChoiceId };

export type MissionAction = { type: "choose"; choiceId: MissionChoiceId } | { type: "replay" };

export const INITIAL_MISSION_STATE: MissionState = { status: "idle" };

export function findMissionChoice(id: MissionChoiceId): MissionChoice {
  const choice = MISSION_CHOICES.find((item) => item.id === id);
  if (!choice) throw new Error(`Unknown mission choice: ${id}`);
  return choice;
}

export function missionReducer(state: MissionState, action: MissionAction): MissionState {
  if (action.type === "replay") return INITIAL_MISSION_STATE;
  // The first answer stands until the learner replays.
  if (state.status === "answered") return state;
  return { status: "answered", choiceId: action.choiceId };
}
