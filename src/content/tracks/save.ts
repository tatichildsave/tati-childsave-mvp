import { saveReflections } from "@/content/reflections/save";
import type { Track } from "@/lib/learning/types";

// SAVE track — TATI Junior (ages 8–12), set in Ghana.
// Purely data. No UI, no database access here.

export const saveTrack: Track = {
  id: "save",
  tier: "junior",
  name: "SAVE",
  tagline: "Keeping money safe today so it can help you tomorrow.",
  storyline: "The School Reopening Adventure",
  goal: {
    challengeName: "Term Ready Challenge",
    title: "School Bag Goal",
    target: 80,
    daysTotal: 14,
    finaleTitle: "School Bag Target Reached!",
    finaleBody:
      "Reach the market, buy your Oxford blue school bag, and earn your TATI Junior Super Saver badge.",
  },
  sequence: [
    {
      kind: "assessment",
      id: "save-pre",
      stage: "Getting ready",
      label: "CHECK-IN",
      blurb: "Tell TATI how you think about money today.",
      icon: "🧠",
    },
    {
      kind: "lesson",
      id: "meet-your-money",
      stage: "Getting ready",
      label: "LESSON",
      blurb: "Discover Ghana Cedis coins and notes with Auntie Adwoa.",
      icon: "💰",
      reward: 0,
    },
    {
      kind: "lesson",
      id: "set-a-goal",
      stage: "Getting ready",
      label: "TARGET",
      blurb: "Pledge to save for the Oxford blue school bag.",
      icon: "🎯",
      chip: "GH₵80 Goal",
      reward: 0,
    },

    {
      kind: "scenario",
      id: "kwame-request--ch1",
      scenarioId: "kwame-request",
      chapterTitle: "Days 1–2 · Plan and earn",
      stage: "Chapter 1 — The plan begins",
      label: "STORY · DAYS 1–2",
      chip: "Decision story",
      blurb:
        "School reopens in 14 days. Decide how much to hide away, then take a job at the stall.",
      icon: "🎒",
      pauseBefore: ["needs-vs-wants"],
      reward: 10,
    },

    {
      kind: "lesson",
      id: "needs-vs-wants",
      stage: "Chapter 2 — Market day",
      label: "CONCEPT",
      blurb: "Sort a sharp pencil (need) from a glossy sticker (want).",
      icon: "🧺",
      reward: 0,
    },
    {
      kind: "lesson",
      id: "stop-think-choose",
      stage: "Chapter 2 — Market day",
      label: "SIGNATURE RULE",
      blurb: "Value → Earn → Choose, the TATI way to decide.",
      icon: "🔁",
      reward: 0,
    },
    {
      kind: "scenario",
      id: "kwame-request--ch2",
      scenarioId: "kwame-request",
      chapterTitle: "Day 4 · The market stall",
      stage: "Chapter 2 — Market day",
      label: "STORY · DAY 4",
      chip: "Decision story",
      blurb: "An exercise book, a toffee and your goal all want the same cedis.",
      icon: "🛒",
      pauseBefore: ["kwame-request"],
      reward: 5,
    },
    {
      kind: "reflection",
      id: "reflect-choices",
      stage: "Chapter 2 — Market day",
      label: "REFLECTION",
      blurb: "What was loudest in your head at the market?",
      icon: "🪞",
      reward: 0,
    },

    {
      kind: "lesson",
      id: "borrow-and-lend",
      stage: "Chapter 3 — Friends and safety",
      label: "FRAMEWORK",
      blurb: "Learn the 4 smart questions before lending money to friends.",
      icon: "💬",
      reward: 0,
    },
    {
      kind: "lesson",
      id: "money-safety",
      stage: "Chapter 3 — Friends and safety",
      label: "SECURITY",
      blurb: "Keep savings safe from loss, tricks and rainy day accidents.",
      icon: "🛡️",
      reward: 0,
    },
    {
      kind: "scenario",
      id: "kwame-request--ch3",
      scenarioId: "kwame-request",
      chapterTitle: "Days 6–7 · Kwame asks, and money needs a home",
      stage: "Chapter 3 — Friends and safety",
      label: "STORY · DAYS 6–7",
      chip: "Decision story",
      blurb: "A classmate needs lunch money, then you must choose where your cedis sleep at night.",
      icon: "🤝",
      pauseBefore: ["water-errand"],
      reward: 10,
    },
    {
      kind: "reflection",
      id: "reflect-lending",
      stage: "Chapter 3 — Friends and safety",
      label: "REFLECTION",
      blurb: "How did your decision about Kwame feel afterwards?",
      icon: "🤔",
      reward: 0,
    },

    {
      kind: "lesson",
      id: "where-to-save",
      stage: "Chapter 4 — Work, promises and surprises",
      label: "FRAMEWORK",
      blurb: "Safe, accessible, suitable — pick the right place to keep money.",
      icon: "🏦",
      reward: 0,
    },
    {
      kind: "lesson",
      id: "little-by-little",
      stage: "Chapter 4 — Work, promises and surprises",
      label: "EARNING",
      blurb: "Shell groundnuts, run errands, earn honest chore money little by little.",
      icon: "🥜",
      chip: "+GH₵15 Earned",
      reward: 15,
    },
    {
      kind: "scenario",
      id: "kwame-request--ch4",
      scenarioId: "kwame-request",
      chapterTitle: "Days 8–10 · Buckets, repayment and a torn sandal",
      stage: "Chapter 4 — Work, promises and surprises",
      label: "STORY · DAYS 8–10",
      chip: "Decision story",
      blurb: "An errand for cedis, a promise that comes back, and a surprise you did not plan for.",
      icon: "🪣",
      pauseBefore: ["second-job", "family-share"],
      reward: 10,
    },

    {
      kind: "lesson",
      id: "track-money",
      stage: "Chapter 5 — The final stretch",
      label: "TRACKING",
      blurb: "Practise noting every cedi in your mini ledger notebook.",
      icon: "📓",
      reward: 0,
    },
    {
      kind: "lesson",
      id: "when-plans-change",
      stage: "Chapter 5 — The final stretch",
      label: "MASTERY",
      blurb: "Pause, adjust and continue when school plans change.",
      icon: "🔧",
      reward: 10,
    },
    {
      kind: "scenario",
      id: "kwame-request--ch5",
      scenarioId: "kwame-request",
      chapterTitle: "Days 11–14 · School reopening",
      stage: "Chapter 5 — The final stretch",
      label: "STORY · DAYS 11–14",
      chip: "Grand finale",
      blurb:
        "One more chance to earn, a jersey calling your name, and reopening day at the market.",
      icon: "🏁",
      reward: 10,
    },
    {
      kind: "reflection",
      id: "reflect-journey",
      stage: "Chapter 5 — The final stretch",
      label: "REFLECTION",
      blurb: "What would you do differently if the term started again?",
      icon: "🎒",
      reward: 0,
    },

    {
      kind: "lesson",
      id: "money-plan",
      stage: "Bonus stops",
      label: "STRATEGY",
      blurb: "Divide cedis into Save, Spend and Share envelopes.",
      icon: "📊",
      reward: 0,
    },
    {
      kind: "lesson",
      id: "mobile-money",
      stage: "Bonus stops",
      label: "DISCOVERY",
      blurb: "See how a digital wallet keeps savings safe on a phone.",
      icon: "📱",
      reward: 0,
    },
    {
      kind: "lesson",
      id: "bank-accounts",
      stage: "Bonus stops",
      label: "DISCOVERY",
      blurb: "Visit the bank and open a young saver's account.",
      icon: "🏛️",
      reward: 0,
    },
    {
      kind: "lesson",
      id: "smart-spending",
      stage: "Bonus stops",
      label: "DILEMMA",
      blurb: "A shiny football jersey at Makola — spend or stay the course?",
      icon: "👕",
      reward: 0,
    },
    {
      kind: "assessment",
      id: "save-post",
      stage: "Bonus stops",
      label: "FINAL CHECK-IN",
      blurb: "Show TATI how your money thinking has grown.",
      icon: "🌟",
      reward: 10,
    },
  ],
  reflections: saveReflections,
  assessments: [
    {
      id: "save-pre",
      phase: "pre",
      title: "Before we begin",
      intro:
        "A few quick questions so we know where to start. There is no pass or fail here — just tell us what you would really do.",
      questions: [
        {
          id: "p1",
          prompt: "Auntie Akosua gives you GH₵10 on Saturday. What do you do first?",
          options: [
            { id: "a", label: "Spend it all at the food stall" },
            { id: "b", label: "Keep some of it and spend the rest" },
            { id: "c", label: "Keep all of it for something bigger" },
            { id: "d", label: "Give it to a friend to hold" },
          ],
          bestOptionId: "b",
          feedback:
            "Keeping a part of your money and enjoying a part of it is a habit many savers use. We'll practise it together.",
        },
        {
          id: "p2",
          prompt: "What does 'saving' mean to you?",
          options: [
            { id: "a", label: "Money you keep for later" },
            { id: "b", label: "Money you are not allowed to touch" },
            { id: "c", label: "Money you hide from everyone" },
            { id: "d", label: "Money you get from grown-ups" },
          ],
          bestOptionId: "a",
          feedback: "Saving simply means money you keep now so it can help you later.",
        },
        {
          id: "p3",
          prompt: "Where is the safest place for your savings?",
          options: [
            { id: "a", label: "In your school bag" },
            { id: "b", label: "In your pocket" },
            { id: "c", label: "In a money box or with a trusted adult, bank or mobile wallet" },
            { id: "d", label: "Under a stone outside" },
          ],
          bestOptionId: "c",
          feedback:
            "Money kept in a safe place — a money box at home, a bank, or Mobile Money — is much harder to lose.",
        },
        {
          id: "p4",
          prompt: "You want a football that costs GH₵60. You get GH₵5 each week. What helps most?",
          options: [
            { id: "a", label: "Hope somebody buys it for you" },
            { id: "b", label: "Save GH₵5 every week and count the weeks" },
            { id: "c", label: "Forget about it" },
            { id: "d", label: "Borrow the money from a friend" },
          ],
          bestOptionId: "b",
          feedback:
            "A goal plus a plan makes big things possible. GH₵5 a week reaches GH₵60 in 12 weeks.",
        },
        {
          id: "p5",
          prompt:
            "Kofi saved for two weeks then spent everything on sweets. What would you tell him?",
          options: [
            { id: "a", label: "He wasted it all" },
            { id: "b", label: "He can start again and keep part of his money next time" },
            { id: "c", label: "He should never buy sweets" },
            { id: "d", label: "He should stop saving" },
          ],
          bestOptionId: "b",
          feedback: "Every decision teaches us something. Plans can always be adjusted.",
        },
      ],
    },
    {
      id: "save-post",
      phase: "post",
      title: "Let's see what you've picked up",
      intro: "Same kind of questions as before. Answer the way you would act now.",
      questions: [
        {
          id: "q1",
          prompt:
            "You receive GH₵20 for helping at your uncle's shop. What is a strong first step?",
          options: [
            { id: "a", label: "Decide how much to keep before you spend anything" },
            { id: "b", label: "Buy something quickly before you change your mind" },
            { id: "c", label: "Carry it around all week" },
            { id: "d", label: "Split it with everyone" },
          ],
          bestOptionId: "a",
          feedback:
            "Deciding first is what savers do. Spending is easier to control once the saving is set aside.",
        },
        {
          id: "q2",
          prompt: "Which is a saving goal?",
          options: [
            { id: "a", label: "GH₵40 for new school shoes by December" },
            { id: "b", label: "Some money, some day" },
            { id: "c", label: "Whatever is left over" },
            { id: "d", label: "As much as possible" },
          ],
          bestOptionId: "a",
          feedback: "A good goal has an amount and a time. That's what makes it easy to follow.",
        },
        {
          id: "q3",
          prompt: "Why is Mobile Money or a bank often safer than a pocket?",
          options: [
            { id: "a", label: "It looks smarter" },
            { id: "b", label: "The money cannot fall out or be misplaced" },
            { id: "c", label: "It makes money grow instantly" },
            { id: "d", label: "Nobody can ever take it" },
          ],
          bestOptionId: "b",
          feedback:
            "Safe places protect money from being lost — that's the main job of a saving place.",
        },
        {
          id: "q4",
          prompt: "You are saving GH₵6 a week for a GH₵48 bag. How many weeks?",
          options: [
            { id: "a", label: "6 weeks" },
            { id: "b", label: "8 weeks" },
            { id: "c", label: "12 weeks" },
            { id: "d", label: "48 weeks" },
          ],
          bestOptionId: "b",
          feedback: "GH₵48 ÷ GH₵6 = 8 weeks. Counting the weeks makes a goal feel possible.",
        },
        {
          id: "q5",
          prompt: "Your plan breaks because you spent part of your savings. What now?",
          options: [
            { id: "a", label: "Give up on the goal" },
            { id: "b", label: "Adjust the plan and keep going" },
            { id: "c", label: "Never spend anything again" },
            { id: "d", label: "Ask someone else to save for you" },
          ],
          bestOptionId: "b",
          feedback: "You can adjust your plan. Savers do this all the time.",
        },
      ],
    },
  ],
  lessons: [
    {
      id: "why-save",
      title: "Why people save",
      minutes: 5,
      bigIdea: "Saving is choosing to help your future self.",
      audioScript: "Why people save. Saving is choosing to help your future self.",
      blocks: [
        {
          type: "text",
          body: "Money comes to you in small amounts — an allowance, a gift from Auntie, a few cedis for helping at the shop. It disappears quickly if you have no plan for it.",
        },
        {
          type: "highlight",
          body: "Saving means keeping some money now so it can do a bigger job later.",
        },
        {
          type: "example",
          title: "Ama's story",
          body: "Ama gets GH₵5 every week. She keeps GH₵2 in a tin at home and spends GH₵3. After ten weeks she has GH₵20 — enough for the school bag she wanted, without asking anyone.",
        },
        {
          type: "text",
          body: "Notice that Ama still spent money every week. Saving is not about having no fun. It is about deciding first.",
        },
        {
          type: "checkpoint",
          prompt: "What made Ama's saving work?",
          options: [
            { id: "a", label: "She never spent anything" },
            { id: "b", label: "She kept the same amount every week" },
            { id: "c", label: "She was given extra money" },
          ],
          bestOptionId: "b",
          feedback: "Small amounts, kept regularly, add up. That's the whole secret.",
        },
      ],
    },
    {
      id: "where-to-keep",
      title: "Safe places for your money",
      minutes: 5,
      bigIdea: "Where money sleeps matters as much as how much you keep.",
      audioScript: "Safe places for your money.",
      blocks: [
        {
          type: "text",
          body: "Money in a pocket goes missing. Money in a school bag gets forgotten. A saving place should be safe, and a little bit hard to reach.",
        },
        {
          type: "example",
          title: "Three common places in Ghana",
          body: "A money box or tin at home with a parent who knows about it. A Mobile Money wallet a parent helps you use. A children's account at a bank.",
        },
        {
          type: "highlight",
          body: "A good saving place is safe, known by a trusted adult, and not too easy to dip into.",
        },
        {
          type: "checkpoint",
          prompt: "Yaw keeps GH₵30 loose in his trouser pocket at school. What would you suggest?",
          options: [
            { id: "a", label: "Move it to a money box or wallet at home" },
            { id: "b", label: "Carry it in both pockets" },
            { id: "c", label: "Spend it so it can't be lost" },
          ],
          bestOptionId: "a",
          feedback: "Moving money somewhere safe is the simplest way to protect it.",
        },
      ],
    },
    {
      id: "saving-plan",
      title: "Making a saving plan",
      minutes: 6,
      bigIdea: "Goal + amount + time = a plan you can follow.",
      audioScript: "Making a saving plan.",
      blocks: [
        {
          type: "text",
          body: "A saving plan answers three questions: What am I saving for? How much does it cost? How much can I keep each week?",
        },
        {
          type: "example",
          title: "Kwabena's plan",
          body: "Football boots: GH₵72. He keeps GH₵8 each week from his allowance and from washing bottles on Saturdays. 72 ÷ 8 = 9 weeks.",
        },
        {
          type: "highlight",
          body: "If the weeks feel too many, you can change the goal, save a little more each week, or find a small job.",
        },
        {
          type: "checkpoint",
          prompt: "Esi wants a GH₵50 dictionary and can keep GH₵10 a week. How long?",
          options: [
            { id: "a", label: "3 weeks" },
            { id: "b", label: "5 weeks" },
            { id: "c", label: "10 weeks" },
          ],
          bestOptionId: "b",
          feedback: "GH₵50 ÷ GH₵10 = 5 weeks. Now the goal has a date.",
        },
      ],
    },
  ],
  scenarios: [
    {
      id: "market-day",
      title: "Market day with GH₵20",
      summary: "You have GH₵20 and a Saturday at Makola market. Let's see what happens.",
      startingSavings: 20,
      startStepId: "s1",
      closingReflection:
        "Money moves fast when we are excited. Deciding what to keep before we arrive makes the day easier.",
      steps: [
        {
          id: "s1",
          situation:
            "Mum gives you GH₵20 for the market trip. You are also saving for a GH₵60 football.",
          question: "What do you do before you leave the house?",
          choices: [
            {
              id: "a",
              label: "Put GH₵10 in my money box first",
              savingsDelta: 0,
              outcome: "You set GH₵10 aside at home. GH₵10 goes with you to the market.",
              next: "s2",
            },
            {
              id: "b",
              label: "Take all GH₵20 with me",
              savingsDelta: 0,
              outcome: "All GH₵20 is in your pocket. Let's see what happens at the market.",
              next: "s2",
            },
          ],
        },
        {
          id: "s2",
          situation:
            "The waakye stall smells wonderful. A full plate costs GH₵12, a small one GH₵6.",
          question: "What do you choose?",
          choices: [
            {
              id: "a",
              label: "Small plate, GH₵6",
              savingsDelta: -6,
              outcome: "You eat well and still have money in hand.",
              next: "s3",
            },
            {
              id: "b",
              label: "Full plate, GH₵12",
              savingsDelta: -12,
              outcome: "Delicious. Your money is going faster than planned.",
              next: "s3",
            },
            {
              id: "c",
              label: "Eat at home later",
              savingsDelta: 0,
              outcome: "You stay hungry for now, but nothing is spent.",
              next: "s3",
            },
          ],
        },
        {
          id: "s3",
          situation: "A trader is selling bright wristbands at GH₵5 each. Your friend buys two.",
          question: "What about you?",
          choices: [
            {
              id: "a",
              label: "Buy one to match my friend",
              savingsDelta: -5,
              outcome: "You have a wristband. Your football fund did not grow today.",
              reflection:
                "Did the wristband matter more than the football? Only you can answer that.",
            },
            {
              id: "b",
              label: "Skip it and keep the money",
              savingsDelta: 0,
              outcome: "You walk on. Whatever is left goes into your money box tonight.",
              reflection:
                "You chose your bigger goal over a small buy. That is a real saving skill.",
            },
          ],
        },
      ],
    },
    {
      id: "school-shoes",
      title: "Saving for school shoes",
      summary: "School reopens in 8 weeks and shoes cost GH₵80. You start with GH₵15.",
      startingSavings: 15,
      startStepId: "t1",
      closingReflection:
        "Plans rarely go perfectly. Adjusting is part of saving, not a sign that you failed.",
      steps: [
        {
          id: "t1",
          situation: "You have GH₵15 saved and GH₵10 comes in each week for 8 weeks.",
          question: "How much of your weekly GH₵10 will you keep for the shoes?",
          choices: [
            {
              id: "a",
              label: "Keep GH₵5 each week",
              savingsDelta: 40,
              outcome: "After 8 weeks you have GH₵55, and GH₵5 a week to enjoy.",
              next: "t2",
            },
            {
              id: "b",
              label: "Keep GH₵8 each week",
              savingsDelta: 64,
              outcome: "After 8 weeks you have GH₵79 — almost exactly the price.",
              next: "t2",
            },
            {
              id: "c",
              label: "Keep GH₵10 each week",
              savingsDelta: 80,
              outcome: "After 8 weeks you have GH₵95, but no spending money at all.",
              next: "t2",
            },
          ],
        },
        {
          id: "t2",
          situation: "In week 5 your phone credit runs out and a friend's birthday is coming.",
          question: "What do you do?",
          choices: [
            {
              id: "a",
              label: "Take GH₵15 from the shoe money",
              savingsDelta: -15,
              outcome: "Your friend is happy. Your shoe fund is GH₵15 lighter.",
              next: "t3",
            },
            {
              id: "b",
              label: "Make a card instead and spend nothing",
              savingsDelta: 0,
              outcome: "The card is a hit and your plan stays on track.",
              next: "t3",
            },
            {
              id: "c",
              label: "Do two Saturdays of bottle washing for GH₵20",
              savingsDelta: 20,
              outcome: "Tiring, but you have extra money and a gift.",
              next: "t3",
            },
          ],
        },
        {
          id: "t3",
          situation: "It's week 8. Let's count what you have.",
          question: "What is your next move?",
          choices: [
            {
              id: "a",
              label: "Buy the shoes if I have enough",
              savingsDelta: 0,
              outcome: "You check your total against GH₵80 and decide with a clear head.",
              reflection: "Checking before buying keeps your plan in your own hands.",
            },
            {
              id: "b",
              label: "Adjust: buy a cheaper pair and keep saving",
              savingsDelta: 0,
              outcome: "You choose GH₵60 shoes and keep the rest for the next goal.",
              reflection: "Adjusting a plan is a smart move, not a step backwards.",
            },
          ],
        },
      ],
    },
  ],
};

export const tracks = { save: saveTrack };
