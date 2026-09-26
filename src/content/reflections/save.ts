import type { ReflectionPrompt } from "@/lib/learning/types";

// Pause-and-think stops between story chapters. Data only — no UI here.
// Nothing is marked right or wrong; every answer gets a warm response.
export const saveReflections: ReflectionPrompt[] = [
  {
    id: "reflect-choices",
    title: "Pause and think",
    intro: "You have made your first market choices. Let's look back for a moment.",
    question: "When you chose at the market, what was loudest in your head?",
    icon: "🪞",
    options: [
      {
        id: "goal",
        label: "My school bag goal",
        response:
          "Holding your goal in mind helps, even when it means saying 'not today' to something nice.",
      },
      {
        id: "now",
        label: "What I wanted right then",
        response:
          "Wanting something now is normal. Noticing that feeling is the first step to steering it.",
      },
      {
        id: "both",
        label: "A bit of both, honestly",
        response: "Most savers feel both. The skill is choosing on purpose instead of by accident.",
      },
    ],
    closing: "There is no perfect answer here — only what you notice about yourself.",
  },
  {
    id: "reflect-lending",
    title: "Money and friendship",
    intro: "Kwame asked, and you decided. Money between friends is never only about cedis.",
    question: "How did your decision about Kwame feel afterwards?",
    icon: "🤝",
    options: [
      {
        id: "good",
        label: "Good — I helped a friend",
        response:
          "Helping is a real value. Agreeing on when money comes back keeps the friendship easy.",
      },
      {
        id: "worried",
        label: "A little worried about my goal",
        response:
          "That worry is useful information. It tells you how much this goal matters to you.",
      },
      {
        id: "unsure",
        label: "I am still not sure",
        response:
          "Unsure is an honest answer. Some money choices only make sense after you see what follows.",
      },
    ],
    closing: "Lending is a choice, not a rule. What matters is deciding with your eyes open.",
  },
  {
    id: "reflect-journey",
    title: "Looking back at your 14 days",
    intro: "School reopens. Your story is finished — now let's think about it.",
    question: "What would you do differently if the term started again tomorrow?",
    icon: "🎒",
    options: [
      {
        id: "earn",
        label: "Look for more ways to earn",
        response:
          "Earning gave you choices nobody else controlled. That is a strong habit to grow.",
      },
      {
        id: "save-first",
        label: "Move money to the box sooner",
        response: "Saving first, then spending what is left, is how most savers protect a goal.",
      },
      {
        id: "plan",
        label: "Plan for the surprise days",
        response:
          "Surprises always come. A small emergency stash keeps a plan standing when they do.",
      },
      {
        id: "same",
        label: "Mostly the same — it went well",
        response: "Then your plan suited you. Keep it and stretch the goal a little next time.",
      },
    ],
    closing:
      "Reaching GH₵80 was never the whole point. Finishing the journey and learning from it is progress.",
  },
];
