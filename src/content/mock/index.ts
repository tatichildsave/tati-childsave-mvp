/**
 * Temporary mock data for the foundation build.
 * Replaced by real backend reads once each MVP feature is wired up.
 */
import type { AvatarKey } from "@/components/tati/Avatar";
import type { ItemStatus } from "@/components/tati/Cards";

export type MockChild = {
  id: string;
  name: string;
  age: number;
  avatar: AvatarKey;
  className: string;
  teacher: string;
  school: string;
  available: number;
  saved: number;
  target: number;
  xp: number;
  level: number;
  lessonsDone: number;
};

export const mockChildren: MockChild[] = [
  {
    id: "kojo",
    name: "Kojo",
    age: 10,
    avatar: "kojo",
    className: "Primary 5A",
    teacher: "Ms. Mensah",
    school: "Achimota Basic School",
    available: 50,
    saved: 0,
    target: 80,
    xp: 20,
    level: 1,
    lessonsDone: 0,
  },
  {
    id: "ama",
    name: "Ama",
    age: 9,
    avatar: "ama",
    className: "Primary 4B",
    teacher: "Mr. Boateng",
    school: "Achimota Basic School",
    available: 35,
    saved: 25,
    target: 60,
    xp: 70,
    level: 2,
    lessonsDone: 3,
  },
];

export type MockLesson = {
  id: string;
  title: string;
  subtitle: string;
  minutes: number;
  status: ItemStatus;
  bigIdea: string;
  body: string[];
};

export const mockLessons: MockLesson[] = [
  {
    id: "meet-your-money",
    title: "Meet Your Money",
    subtitle: "Ready to learn",
    minutes: 5,
    status: "ready",
    bigIdea: "Every cedi you hold is a small choice waiting to happen.",
    body: [
      "Money reaches you in small amounts — an allowance, a gift from Auntie Akosua, a few cedis for helping at the shop.",
      "Before you spend, you can decide how much to keep. That single decision is what savers do.",
    ],
  },
  {
    id: "needs-vs-wants",
    title: "Needs vs Wants",
    subtitle: "Unlocks Day 3",
    minutes: 5,
    status: "locked",
    bigIdea: "A need helps you live and learn. A want is nice to have.",
    body: ["Bus fare to school is a need. A second wristband at the market is a want."],
  },
  {
    id: "set-a-goal",
    title: "Set a Goal",
    subtitle: "Unlocks Day 7",
    minutes: 6,
    status: "locked",
    bigIdea: "Goal + amount + time = a plan you can follow.",
    body: ["GH₵80 school bag, GH₵10 kept each week — that's 8 weeks."],
  },
];

export type MockScenario = {
  id: string;
  title: string;
  description: string;
  pocket: number;
  target: number;
  days: number;
  status: ItemStatus;
};

export const mockScenarios: MockScenario[] = [
  {
    id: "school-reopening",
    title: "School Reopening Challenge",
    description:
      "Prepare for class! Reach GH₵80 for your new school bag, starting with your allowance of GH₵50.",
    pocket: 50,
    target: 80,
    days: 14,
    status: "ready",
  },
  {
    id: "market-day",
    title: "Market Day with GH₵20",
    description:
      "A Saturday at Makola market, a waakye stall and a football fund. What will you keep?",
    pocket: 20,
    target: 60,
    days: 1,
    status: "locked",
  },
];

export const mockAchievements = [
  {
    id: "first-goal",
    icon: "🎯",
    title: "First Goal Set",
    note: "Commit to your first savings target",
    unlocked: false,
  },
  {
    id: "piggy-saver",
    icon: "💰",
    title: "Piggy Saver",
    note: "Keep money in savings for 3 straight choices",
    unlocked: false,
  },
  {
    id: "resilient",
    icon: "🌟",
    title: "Resilient Spender",
    note: "Choose a need over a tempting want",
    unlocked: false,
  },
];

export const mockInsights = [
  "Kojo is starting his SAVE track — the first check-in takes about three minutes.",
  "0 of 3 lessons finished so far.",
  "Talk at home: ask what he is saving for and how many weeks it will take.",
];
