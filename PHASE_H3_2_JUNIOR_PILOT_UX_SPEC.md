# PHASE H3.2 – TATI Junior Pilot UX Specification
**Planning Phase | No Code Changes** | Date: Current Session  
Transforms audit findings into precise UX specification for one coherent TATI Money Journey

---

## EXECUTIVE UX DIRECTION

### Current State vs. Intended State

**Current:** Child sees "lessons and scenarios" as disconnected activities on a list.  
**Intended:** Child experiences "one 14-day money adventure where every choice connects to a real goal."

### Core UX Principle
The child should always understand:
1. **Where am I?** → Day X of 14, Chapter Y of 5, activity stage
2. **Why am I doing this?** → Learning objective connected to the story
3. **What am I trying to achieve?** → Explicitly: GH₵80 school bag goal + daily progress toward it
4. **What have I accomplished?** → Completed activities + money saved + lesson competencies
5. **What's next?** → One clear CTA that connects to the ongoing story

### Implementation Constraint
- No redesign of the visual language or component system
- No new backend infrastructure required
- Use existing Firestore + Firebase Auth model
- Preserve all existing security boundaries (child/parent/facilitator isolation)
- Work within existing route structure (can add child route pages, not refactor routing)
- Respect existing content (12 lessons, 5 scenarios, assessments, reflections)

---

## 1. VERIFIED CURRENT JOURNEY SEQUENCE

### Source of Truth
- `src/content/tracks/save.ts` – Complete 24-item sequence with metadata
- `src/content/scenarios/school-reopening.ts` – Scenario consequence data model
- `src/content/lessons/save.ts` – Lesson definitions with objectives
- `src/content/assessments/save-junior.ts` – Pre/post assessment structure
- `src/lib/progress/snapshot.ts` – Journey state computation (day tracking, goal progress)

### Journey Overview
**Track Name:** SAVE | **Tier:** Junior (ages 8–12) | **Setting:** Ghana

**Goal:** Term Ready Challenge
- **Challenge:** Save GH₵80 for Oxford blue school bag
- **Timeline:** 14 days  
- **Starting amount:** GH₵50 (implicit in scenario)
- **Completion bonus:** "TATI Junior Super Saver" badge

**Storyline:** "The School Reopening Adventure"

### Complete Verified Sequence (24 items)

#### **ENTRY**
- Route: `/onboarding`
- Activity: 7-step profile wizard (name, age, avatar selection)
- Persistence: localStorage (resumable draft)
- Unlocks: Pre-assessment
- Next state: Redirect to `/child/learn/$childId/assessment/save-pre`

---

#### **PHASE 1: PRE-JOURNEY (Getting Ready)**

**[Item 1] PRE-ASSESSMENT**
- Route: `/child/assessment/save-pre`
- ID: `save-pre`
- Component: AssessmentRunner
- Type: "CHECK-IN"
- Icon: 🧠
- Duration: ~5 minutes
- Content: 5 scenario-based questions (no exam language)
  - Q1: Money allocation (spend all/keep some/save all/give away)
  - Q2: Definition of saving
  - Q3: Where to keep money safe
  - Q4: Goal math (GH₵60 goal, GH₵5/week = weeks?)
  - Q5: Resilience (friend failed, what to tell them?)
- Feedback: Individual question feedback shown immediately
- Data Persisted:
  - Student responses
  - Points scored (0-5 scale)
  - Competency scores (pre-baseline for growth comparison)
  - Assessment event recorded to journey progress
- Flow: Question → reveal answer + feedback → next question → outro screen → continue button
- Next State: `/child/learn` (unlocks first lessons)

**[Item 2] LESSON: "Meet Your Money"**
- Route: `/child/lesson/meet-your-money`
- ID: `meet-your-money`
- Component: LessonPlayer
- Type: "LESSON"
- Stage: "Getting ready"
- Icon: 💰
- Duration: 4 minutes
- Objective: "Know the four things money can do: save, spend, share and plan"
- Topic: "Money Basics"
- Content Blocks:
  - Text: "Money can do four big things. Tap each one to see!"
  - Cards: 4 interactive cards (save/spend/share/plan) with reveal text + Ghanaian examples
  - Text: "People earn money by working…"
- Interactive Elements:
  - Card tapping (reveals hidden competency story)
  - Visual chip indicators (tone: save/spend/share/plan)
- Knowledge Check:
  - Prompt: "You have GH₵20 and spend GH₵6 on notebooks. How much remains?"
  - Correct: GH₵14
  - Feedback: "When you spend GH₵6, you have GH₵14 left for other goals."
- Reflection Prompt: "Which superpower do you use most right now?"
- XP Reward: 20 points
- Competencies: ["earning", "saving"]
- Data Persisted:
  - Draft (taps, quick-check answer, reflection text, allocation)
  - Resume via localStorage
  - Event recorded when completed
- Next State: `/child/learn` (unlocks next lesson)

**[Item 3] LESSON: "Set a Goal"**
- Route: `/child/lesson/set-a-goal`
- ID: `set-a-goal`
- Component: LessonPlayer
- Type: "TARGET"
- Stage: "Getting ready"
- Icon: 🎯
- Duration: 3 minutes
- Objective: "Pledge to save for the Oxford blue school bag"
- Competencies: ["goal-setting"]
- XP Reward: 0 points (non-rewarded lesson)
- Content: Goal-setting framework with Ghanaian context (bag at market, why it matters)
- Reflection: "Tell us your goal in your own words"
- Data Persisted: Reflection response + lesson completion event
- **Critical Note:** This lesson sets up the 14-day narrative (not yet visible to child)
- Next State: `/child/learn` (first scenario now ready)

---

#### **PHASE 2: CHAPTER 1 (Days 1–2) – "The Plan Begins"**

**[Item 4] SCENARIO: "Kwame Request — Chapter 1"**
- Route: `/child/scenario/kwame-request--ch1`
- ID: `kwame-request--ch1`
- Scenario ID: `kwame-request`
- Component: ScenarioPlayer
- Type: "STORY · DAYS 1–2"
- Stage: "Chapter 1 — The plan begins"
- Chapter Title: "Days 1–2 · Plan and earn"
- Icon: 🎒
- Duration: ~8 minutes (depending on decision tree)
- Goal Widget: "Save GH₵80 for school bag" (not currently visible)
- Starting Wallet: GH₵50 available, GH₵0 saved (first node: "plan-the-money")
- Narrative: School reopens in 14 days. You have GH₵50 and want GH₵80 bag. Decide how much to hide in savings box.

**Scenario Nodes & Consequences** (Actual structure from `school-reopening.ts`):
- Node 1: "plan-the-money" (Day 1)
  - Question: "How much goes into the savings box today?"
  - Choices:
    - Save GH₵40 → "A strong start with a thin pocket" (competency boost: goal-setting +3, saving +2)
    - Save GH₵30 → "A balanced plan" (competency boost: goal-setting +2, budgeting +2)
    - Save GH₵20 → "Plenty in the pocket" (competency boost: budgeting +1, tracking-money +1)
  - Each choice has:
    - decisionChip: "Decision: GH₵X into the savings box"
    - consequence screen: headline + title + body + ledgerNote
    - next node: "earn-at-the-stall"

- Node 2: "earn-at-the-stall" (Day 2)
  - (Story progression based on first choice)
  - Question: Job offer at stall; various earning opportunities
  - Choices affect wallet + competencies

**Data Persisted:**
- Current scenario state (wallet: {available, saved}, currentNodeId, decisionsHistory)
- Each decision records:
  - Choice ID
  - Competency impacts
  - Consequence narrative
  - Resulting wallet state
- Server-side session storage (not localStorage)
- Scenario completion event recorded only when journey through all nodes complete OR checkpoint reached

**Consequence Model (Currently in data, not displayed):**
```
consequence: {
  decisionChip: "Decision: GH₵40 into the savings box",
  headline: "Here's what happened",
  title: "A strong start with a thin pocket",
  body: "Your goal is already halfway. Just remember that only GH₵10 is left for the whole week, so surprises will feel tight.",
  ledgerNote: "GH₵40 → savings box"
}
```

**pauseBefore: ["needs-vs-wants"]**
- Constraint: Next scenario chapter cannot proceed until child completes "needs-vs-wants" lesson
- Purpose: Pedagogical sequencing (decision in scenario → teach the framework lesson)

**Next State:** `/child/learn` (lesson "needs-vs-wants" now unlocked as prerequisite)

**XP Reward:** 10 points (once scenario branch completed)

---

#### **PHASE 3: CHAPTER 2 (Day 4) – "Market Day"**

**[Item 5] LESSON: "Needs vs Wants"**
- Route: `/child/lesson/needs-vs-wants`
- ID: `needs-vs-wants`
- Type: "CONCEPT"
- Stage: "Chapter 2 — Market day"
- Icon: 🧺
- Duration: 5 minutes
- Objective: "Tell the difference between a need and a want, and know it can change with the situation"
- Content: Interactive card sorting (exercise book/pen/sticker/cookie vs. need/want labels)
- Competencies: ["needs-vs-wants"]
- XP Reward: 0 (uncompensated)
- Data: Sorting responses + reflection
- **Pedagogical Link:** Directly addresses the consequence of Chapter 1 scenario (child made choices about money and now learns the framework)
- Next State: `/child/learn` (next lesson ready)

**[Item 6] LESSON: "Stop-Think-Choose"**
- Route: `/child/lesson/stop-think-choose`
- ID: `stop-think-choose`
- Type: "SIGNATURE RULE"
- Stage: "Chapter 2 — Market day"
- Icon: 🔁
- Duration: 4 minutes
- Objective: "Value → Earn → Choose, the TATI way to decide"
- Competencies: ["spending-decisions"]
- XP Reward: 0
- Content: Decision framework (Value the goal, Earn/Save the money, then Choose what to do)
- **Pedagogical Purpose:** Framework for decisions in next scenario
- Next State: `/child/learn` (scenario now available)

**[Item 7] SCENARIO: "Kwame Request — Chapter 2"**
- Route: `/child/scenario/kwame-request--ch2`
- ID: `kwame-request--ch2`
- Chapter Title: "Day 4 · The market stall"
- Type: "STORY · DAY 4"
- Stage: "Chapter 2 — Market day"
- Icon: 🛒
- Duration: ~8 minutes
- Scenario: At market stall with three temptations: exercise book (need), toffee (want), saving goal (long-term)
- Wallet State: Carries forward from Chapter 1 (whatever was saved/available)
- pauseBefore: ["kwame-request"] (next lesson scenario must wait for reflection lesson)
- XP Reward: 5 points
- Next State: `/child/learn` (reflection now available)

**[Item 8] REFLECTION: "Reflect on Choices"**
- Route: `/child/reflection/reflect-choices`
- ID: `reflect-choices`
- Type: "REFLECTION"
- Stage: "Chapter 2 — Market day"
- Icon: 🪞
- Duration: 2 minutes
- Prompt: "What was loudest in your head at the market?"
- Placeholder: "I was thinking about…"
- Component: Text input form + save
- Purpose: Metacognitive pause (child reflects on decision-making in scenario)
- Data Persisted: Text response + event
- Next State: `/child/learn` (Chapter 3 lessons available)
- XP Reward: 0

---

#### **PHASE 4: CHAPTER 3 (Days 6–7) – "Friends and Safety"**

**[Item 9] LESSON: "Borrow and Lend"**
- ID: `borrow-and-lend`
- Type: "FRAMEWORK"
- Stage: "Chapter 3 — Friends and safety"
- Icon: 💬
- Duration: 4 minutes
- Objective: "Learn the 4 smart questions before lending money to friends"
- Competencies: ["borrowing-lending"]
- Content: 4-question framework (Does friend need it? Can they pay back? When? What if they can't?)
- Next State: Second lesson in chapter, then scenario

**[Item 10] LESSON: "Money Safety"**
- ID: `money-safety`
- Type: "SECURITY"
- Stage: "Chapter 3 — Friends and safety"
- Icon: 🛡️
- Duration: 5 minutes
- Objective: "Keep savings safe from loss, tricks and rainy day accidents"
- Competencies: ["money-safety"]
- Content: Where to keep money (piggy box, bank, mobile wallet) + why each is safe

**[Item 11] SCENARIO: "Kwame Request — Chapter 3"**
- ID: `kwame-request--ch3`
- Chapter Title: "Days 6–7 · Kwame asks, and money needs a home"
- Type: "STORY · DAYS 6–7"
- Stage: "Chapter 3 — Friends and safety"
- Icon: 🤝
- Duration: ~8 minutes
- Scenario: Classmate Kwame asks for lunch money + must decide where savings should live
- pauseBefore: ["water-errand"]
- XP Reward: 10 points
- Wallet: Carries forward from Chapter 2

**[Item 12] REFLECTION: "Reflect on Lending"**
- ID: `reflect-lending`
- Prompt: "How did your decision about Kwame feel afterwards?"
- Duration: 2 minutes
- Data: Text response

---

#### **PHASE 5: CHAPTER 4 (Days 8–10) – "Work, Promises and Surprises"**

**[Item 13] LESSON: "Where to Save"**
- ID: `where-to-save`
- Type: "FRAMEWORK"
- Stage: "Chapter 4 — Work, promises and surprises"
- Icon: 🏦
- Duration: 4 minutes
- Objective: "Safe, accessible, suitable — pick the right place to keep money"
- Competencies: ["money-safety"] (continued)

**[Item 14] LESSON: "Little by Little"**
- ID: `little-by-little`
- Type: "EARNING"
- Stage: "Chapter 4 — Work, promises and surprises"
- Icon: 🥜
- Duration: 5 minutes
- Objective: "Shell groundnuts, run errands, earn honest chore money little by little"
- Chip: "+GH₵15 Earned"
- Competencies: ["earning"]
- XP Reward: 15 points (this is a compensated lesson)
- **Note:** This lesson grants 15 XP, which directly connects to earning narrative

**[Item 15] SCENARIO: "Kwame Request — Chapter 4"**
- ID: `kwame-request--ch4`
- Chapter Title: "Days 8–10 · Buckets, repayment and a torn sandal"
- Type: "STORY · DAYS 8–10"
- Stage: "Chapter 4 — Work, promises and surprises"
- Icon: 🪣
- Duration: ~8 minutes
- Scenario: Errand for cedis + unexpected expense (torn sandal) + promise repayment comes back
- pauseBefore: ["second-job", "family-share"] (two optional lesson pathways)
- XP Reward: 10 points
- **Critical Note:** Scenario introduces "rainy day" expense (resilience learning)

---

#### **PHASE 6: CHAPTER 5 (Days 11–14) – "The Final Stretch"**

**[Item 16] LESSON: "Track Money"**
- ID: `track-money`
- Type: "TRACKING"
- Stage: "Chapter 5 — The final stretch"
- Icon: 📓
- Duration: 4 minutes
- Objective: "Practise noting every cedi in your mini ledger notebook"
- Competencies: ["tracking-money"]

**[Item 17] LESSON: "When Plans Change"**
- ID: `when-plans-change`
- Type: "MASTERY"
- Stage: "Chapter 5 — The final stretch"
- Icon: 🔧
- Duration: 5 minutes
- Objective: "Pause, adjust and continue when school plans change"
- Competencies: ["financial-resilience"]
- XP Reward: 10 points

**[Item 18] SCENARIO: "Kwame Request — Chapter 5" (FINALE)**
- ID: `kwame-request--ch5`
- Chapter Title: "Days 11–14 · School reopening"
- Type: "STORY · DAYS 11–14"
- Chip: "Grand finale"
- Stage: "Chapter 5 — The final stretch"
- Icon: 🏁
- Duration: ~10 minutes
- Scenario: One more earning opportunity + jersey temptation (needs-vs-wants test) + market day finale
- **Critical:** Final decision point — does child achieve GH₵80 goal or fall short?
- Wallet State: Carries forward + final opportunity to earn
- XP Reward: 10 points
- **Outcome:** Scenario evaluates if child reached goal (not enforced, exploratory)

**[Item 19] REFLECTION: "Reflect on Journey"**
- ID: `reflect-journey`
- Prompt: "What would you do differently if the term started again?"
- Icon: 🎒
- Duration: 2 minutes
- Purpose: Metacognitive wrap (transfer learning to hypothetical repeat)

---

#### **PHASE 7: BONUS STOPS (Optional)**

**[Item 20-23] FOUR BONUS LESSONS** (unlocked after main sequence, optional)

1. **"Money Plan"** (ID: `money-plan`) – "Divide cedis into Save, Spend and Share envelopes"
2. **"Mobile Money"** (ID: `mobile-money`) – "See how a digital wallet keeps savings safe on a phone"
3. **"Bank Accounts"** (ID: `bank-accounts`) – "Visit the bank and open a young saver's account"
4. **"Smart Spending"** (ID: `smart-spending`) – "A shiny football jersey at Makola — spend or stay the course?"

Each: Uncompensated (0 XP), optional, no pedagogical lock

---

#### **PHASE 8: POST-JOURNEY**

**[Item 24] POST-ASSESSMENT**
- Route: `/child/assessment/save-post`
- ID: `save-post`
- Component: AssessmentRunner
- Type: "FINAL CHECK-IN"
- Stage: "Bonus stops"
- Icon: 🌟
- Duration: ~5 minutes
- Purpose: Post-learning check-in (parallel questions to pre-assessment, different scenarios)
- Questions: 5 scenario-based questions testing application of learning
  - Q1: New earning scenario (GH₵20 helper money) → decision-making (good answer: set aside before spending)
  - Q2: Goal definition (which is a true goal?)
  - Q3: Safety of savings places
  - Q4: Goal math (GH₵48 bag, GH₵6/week = ?)
  - Q5: Resilience (Kofi failed, what next?)
- Data Persisted:
  - Student responses
  - Points scored (0-5 scale)
  - Competency scores (post-assessment, used for growth comparison)
  - Assessment completion event
- Next State: `/child/results` (automatic redirect)
- XP Reward: 10 points

**[Item 25] RESULTS & CELEBRATION**
- Route: `/child/results`
- Component: ChildResults
- Type: "Learning Summary + Celebration"
- Duration: ~3 minutes (child reads)
- Content Displayed:
  - 🎉 Celebration message ("Nice work, [Name]!")
  - XP Earned This Journey (total from all activities)
  - Journey Progress (X of 24 activities completed)
  - Badges Earned (final list of unlocked achievements)
  - Key Decisions Made (if data available, show 2-3 pivotal choices)
  - Learning Competencies (if pre-post comparison available, show growth areas)
  - Next Step: "Back to Home" or "View My Journey"
- **Currently Missing:** 
  - Pre vs. post assessment comparison (could show growth)
  - Consequence playback (what happened to wallet?)
  - Scenario decision visibility (which choices did I make?)
  - Explicit connection to GH₵80 goal (did I reach it?)
- Next State: `/child/home` (redirect or button click)

---

### JOURNEY MAPPING SUMMARY

| Phase | Stage | Activities | Duration | Goal | State |
|-------|-------|-----------|----------|------|-------|
| Entry | Onboarding | Profile (7 steps) | ~5 min | Create identity | Pre-assessment unlocked |
| 1 | Pre-journey | Pre-assess + 2 lessons | ~12 min | Set goal, learn money basics | Ch1 Scenario ready |
| 2 | Ch1: Days 1-2 | Scenario + lesson (pedagog) | ~16 min | Plan savings, earn first | Ch2 ready |
| 3 | Ch2: Day 4 | 2 lessons + scenario | ~17 min | Learn framework, practice | Ch3 ready |
| 4 | Ch3: Days 6-7 | 2 lessons + scenario | ~17 min | Learn safety, make hard choice | Ch4 ready |
| 5 | Ch4: Days 8-10 | 2 lessons + scenario | ~17 min | Earn more, handle surprise | Ch5 ready |
| 6 | Ch5: Days 11-14 | 2 lessons + scenario (finale) | ~17 min | Final stretch, reach goal | Post-assess ready |
| 7 | Bonus | 4 optional lessons | ~16 min | Explore deeper | Post-assess available |
| 8 | Post-journey | Post-assess + results | ~8 min | Celebrate, close loop | Complete |

**Total Time (Core Path):** ~85 minutes (split across sessions)  
**Total Time (Full Including Bonus):** ~101 minutes

---

## 2. INTENDED CHILD MENTAL MODEL

### The Child Understands

#### **Where am I?**
- Visual indicator: Day X of 14 (e.g., "Day 4 of 14")
- Chapter context: "Chapter 2 — Market Day"
- Activity stage: "Lesson 2 of 5 in this chapter"
- Progress: "You've completed X of 24 journey stops"

**Implementation:** Chapter banner at top of lesson/scenario pages, progress badge on home, day counter in sidebar/header

#### **Why am I doing this?**
- Learning objective: Shown as "You're learning: [objective]" or emoji-based label
- Connection to story: "This lesson explains why [concept] matters in your money adventure"
- Real-world relevance: "People in Ghana do this when…"

**Implementation:** PageHeader subtitle field + lesson intro screen

#### **What am I trying to achieve?**
- Primary goal: Save GH₵80 for Oxford blue school bag
- Wallet progress: Visual savings tracker showing "You've saved GH₵X of GH₵80" (updated after scenarios)
- Day goal: "X days left to reach your goal"
- Completion metric: X/5 chapters completed

**Implementation:** Persistent "Goal Widget" on home + lesson pages, showing current saved amount, target, days left

#### **What have I accomplished?**
- Completed activities: "You've finished 8 of 24 journey stops"
- Badges earned: Display badges earned (with new/recent highlighting)
- Competencies developed: "You're getting better at [skill]" (if pre-assessment done)
- Decisions made: (In results) "You chose [X] when faced with [scenario]" (sample decisions)

**Implementation:** Progress page `/child/progress` expanded, home page achievement summary

#### **What's next?**
- One clear CTA that's contextually accurate
- Sentence form: "Continue to [Lesson 5: Money Safety]" or "Take on [Chapter 2 Scenario]"
- If stuck: "You left off at [activity]. Keep going?"
- If complete: "See your results" or "Start the next journey"

**Implementation:** NextStepCard component on home, persistent CTA at bottom of pages

---

## 3. 14-DAY STORY ARC ANALYSIS

### Verified: The 14-Day Structure IS Genuinely Supported

**Evidence:**
- Track metadata: `goal: { daysTotal: 14, target: 80 }`
- Scenario intro: "Two weeks before school reopens you have GH₵50 and want a GH₵80 school bag."
- Scenario nodes are day-numbered (Day 1, Day 2, Day 4, Day 6-7, Day 8-10, Day 11-14)
- Snapshot computation: `dayNumber: Math.min(daysTotal, doneCount + 1)` — journey tracks day progression

**Days Defined:**

| Day | Chapter | Activity | Story Moment |
|-----|---------|----------|--------------|
| — | Pre | Pre-assess + lessons | Goal is set |
| 1-2 | Ch1 | Scenario: Plan & earn | "School reopens in 14 days. Decide how much to hide away." |
| 4 | Ch2 | Scenario: Market stall | "3 temptations at the stall" |
| 6-7 | Ch3 | Scenario: Friends & safety | "Kwame asks for lunch money" |
| 8-10 | Ch4 | Scenario: Surprises | "Errand for cedis + torn sandal" |
| 11-14 | Ch5 | Scenario: Grand finale | "Final earning chance + jersey temptation + market day" |

### How Content Connects to Days

**Each scenario chapter** is positioned in the story timeline:
- Chapter 1 (Days 1-2): Child makes first big decision about savings allocation
- Chapter 2 (Day 4): Mid-week market trip with multiple temptations
- Chapter 3 (Days 6-7): Social pressure (Kwame) + safety decisions
- Chapter 4 (Days 8-10): Earning more money + unexpected expense
- Chapter 5 (Days 11-14): Final push to goal + temptation test

**Lessons serve chapters:**
- Pre-chapters: Foundational (money basics, goal setting)
- Interchapter lessons: Just-in-time (needs vs wants before scenario 2, safety before scenario 3)
- Late chapters: Advanced (tracking, resilience)

### Goal Progress Tracking

Starting amount: GH₵50 (implied from scenario)  
Target: GH₵80  
Gap: GH₵30 to earn

**XP-to-Cedis Mapping (Implicit):**
Each scenario awards XP (5-10 points per decision branch) which conceptually maps to "cedis earned through work/choices"

**Current Implementation Gap:**
- Wallet value NOT currently displayed to child in-journey
- No visual feedback: "You now have GH₵X saved" after scenario
- Final results page doesn't show wallet outcome (did child reach GH₵80?)

### Proposal: Surface the 14-Day Arc Visually

**P0 Implementation (Clarity):**
1. Add chapter banner to every lesson/scenario page
   - "Chapter 2 — Market Day" (stage field already exists in track)
   - "Day 4 of 14" (can compute from sequence + day field)
2. Add goal progress widget (persistent across all child pages)
   - "Goal: Oxford blue school bag — GH₵80"
   - "You've earned: GH₵X through lessons and decisions"
   - Progress bar: X/80
3. Show learning objective on every page
   - "You're learning: [lesson objective]" or "You're deciding: [scenario prompt]"

**Data Available for This:**
- Track metadata: `goal`, `stage`, `chapterTitle` (all present in sequence)
- Snapshot: `savedCedis` (computed from rewards)
- No backend changes needed; UI-only

---

## 4. CHILD JOURNEY MAP

### Detailed View: Every Major Stage

| # | Stage | Child Goal | Child Action | Emotional/UX Need | System State | Primary CTA | Parent Visibility | Notes |
|---|-------|------------|--------------|---|---|---|---|---|
| 1 | **Onboarding** | Create my TATI identity | Pick name, age, avatar (7 steps) | Fun, welcoming, low-stakes | Profile created, stored in Firebase | "Let's go! 🚀" | Parent sees child added to account | Resume via localStorage if interrupted |
| 2 | **Pre-Assess Intro** | Understand what's about to happen | Read intro screen ("no grades, just tell us how you think") | Calm, no test anxiety | Assessment loaded, question 1 ready | "Start Check-In" | Parent notified: "Pre-assessment available" | Framing: "How you think about money today" |
| 3 | **Pre-Assess Q1-Q5** | Show my thinking | Answer 5 scenario questions (tap option) | Safe to be honest (no right/wrong) | Responses recorded, feedback shown per Q | "Next" (per question) | — | Feedback shown immediately after choice |
| 4 | **Pre-Assess Outro** | Finish strong | Read completion message | Proud, ready to start learning | Assessment event recorded, pre-competencies computed | "Start Your Adventure →" | Parent: "Pre-assessment complete" | Transition to first lessons |
| 5 | **Lesson 1: Money Basics** | Learn money can do 4 things | Tap cards to reveal (save/spend/share/plan) + answer KC + reflect | Interactive, not lecture-y | Draft saved to localStorage, can resume | "Continue" | — | 4 minutes, high engagement |
| 6 | **Lesson 2: Set Goal** | Commit to school bag goal | Read/listen goal story + reflect | Motivated, connected to real object (bag) | Goal set (recorded in reflection), narrative context established | "You're ready!" | Parent: "Child set their goal: school bag" | This lesson establishes 14-day context (not yet visible to child) |
| 7 | **Chapter 1 Scenario Intro** | Understand the adventure | Read scenario setup ("14 days, GH₵50, you want GH₵80 bag") | Excited, clear stakes | Scenario loaded, node 1 ("plan-the-money") ready | "Make Your Plan" | Parent: "Chapter 1 begins: Days 1-2" | **FIRST CONTEXTUAL MOMENT** (14-day structure becomes visible here) |
| 8 | **Chapter 1 Scenario D1** | Make first big money decision | Decide how much to put in savings box (GH₵40/30/20) | Ownership, agency, some difficulty | Decision recorded, wallet state updated (available/saved split) | "Earn at the stall" | Parent: "Child made first savings decision: chose GH₵X" | **CONSEQUENCE SCREEN SHOWS HERE** (child sees result of choice) |
| 9 | **Chapter 1 Scenario D2** | Earn some money | Make job choice at stall (yes/no/negotiate) | Empowered to earn | Wallet updates: +GH₵5-15 depending on choice | "See what happened next" or next node | Parent: "Child earned GH₵X through work choice" | Part of same scenario instance (no page reload) |
| 10 | **Chapter 1 Scenario Complete** | Finish the story branch | Scenario concludes, wallet shows updated state | Satisfied, wanting more | Scenario event recorded, next lesson unlocked (needs-vs-wants lesson) | "Keep learning" | Parent: "Chapter 1 complete. Earned: GH₵X" | Journey progress shows: "You're X% through your adventure" |
| 11 | **Lesson 3: Needs vs Wants** | Learn decision framework | Sort cards (pencil/sticker, need/want) + KC + reflect | "Oh! This is why my choice mattered in the story" | Draft saved, competency recorded | "Next chapter" | — | **PEDAGOGICAL BRIDGE** (explains Chapter 1 choice) |
| 12 | **Lesson 4: Stop-Think-Choose** | Learn TATI decision rule | Interactive (Value → Earn → Choose) | Framework, repeatable tool | Competency recorded | "Try this in Chapter 2" | — | Sets up next scenario |
| 13 | **Chapter 2 Scenario** | Navigate market temptations | Make 3 choices (need/want/goal) with real cost-benefit | Tension between wants and goal, learning to pause | Wallet updates reflect choices, consequence shown per decision | "See what happened" | Parent: "Child faced market choices, decided: [X]" | Longer scenario (3-4 decision nodes) |
| 14 | **Reflection: Market Choices** | Think about decision-making | Write: "What was loudest in your head?" | Metacognitive, emotional safety, growth mindset | Reflection text saved | "You're learning a lot" | Parent: "Child reflected on their choices" | Usually done immediately after scenario |
| 15+ | **Chapters 3-5** | (Repeat pattern: lessons → scenario → reflection) | See rows above | — | — | — | — | Same UX pattern across all chapters |
| 24 | **Post-Assess** | Show what you've learned | Answer 5 similar-but-different scenario questions | Growth mindset ("show what I know now, not what I didn't know before") | Post-assessment event recorded, competency scores computed, growth analysis possible | "See your journey" | Parent: "Final assessment complete" | Framing: "Let's see how your thinking has grown" |
| 25 | **Results & Celebration** | Celebrate, reflect | 🎉 Screen shows: total XP, activities done, badges, key decisions, competency growth | Pride, sense of achievement, closure | Journey marked complete in database | "Back to home" or "Share with parent" | Parent: "Journey complete! View [child]'s results" | **MISSING:** Wallet outcome (did they reach GH₵80?), decision playback |

---

## 5. NEXT-STEP STATE MATRIX

### Rule: Every State Has One Clear CTA

**Purpose:** Child always knows "what should I do now?" without confusion.

### State Definitions (from `src/lib/progress/snapshot.ts`)

```
journey.complete — entire journey done
assessments.preDone — pre-assessment completed
assessments.postReady — all other stops done, post-assessment available
assessments.postDone — post-assessment completed
steps[n].done — specific item completed
steps[n].current — next item to do
steps[n].locked — item not yet available
```

### CTA Decision Matrix

| Current State | Available Items | System State | Primary CTA | Secondary | Tertiary |
|---|---|---|---|---|---|
| **Not started** | None | Pre-assessment only | "Start Your Money Adventure" → assessment | View goal | — |
| **Pre-assess complete** | Pre + Lesson 1+2 | Lessons visible | "Begin Chapter 0: Money Basics" → Lesson 1 | View progress | — |
| **Lesson in progress** | Current lesson | Draft exists in localStorage | "Continue Lesson [X]" → same lesson resume | Start new | — |
| **Lesson complete** | Next lesson ready | Lesson event recorded | "Next: [Lesson Y Title]" → next lesson | View journey | — |
| **Before scenario** | Lesson + scenario | Scenario ready | "Try the Challenge: [Scenario Name]" → scenario | Review lessons | — |
| **Scenario in progress** | Current scenario | Session state exists server-side | "Continue Your Story" → scenario resume at last node | Exit to home | — |
| **Scenario complete** | Next lesson OR reflection | Scenario event recorded, next item unlocked | "What was that about? Reflect here" (if reflection available) OR "Next lesson" | View journey | — |
| **Reflection pending** | Reflection prompt | Reflection unlocked after scenario | "Reflect on Your Choices" → reflection form | Skip (optional) | — |
| **Mid-chapter** | Chapter lessons + scenarios | Multiple items in flight | Show chapter progress: "X of 5 chapter stops done. Keep going?" | View whole journey | — |
| **Pre-post comparison available** | All core items done | Post-assess ready | "Take Final Check-In" → post-assessment | View pre results | — |
| **Post-assess complete** | Bonus lessons | Post-assessment done | "See Your Results!" → results page | View bonuses | — |
| **Bonus lessons available** | 4 optional lessons | Journey core complete | "Optional: Explore Money Plans" or "Back to Home" | Specific bonus | View results |
| **Everything done** | — | Journey complete, post-assess done | "Share Your Journey" or "Start a New Track" | View results | — |

### Implementation: NextStepCard Component (NEW)

**Reuse:** No, this is new logic-heavy component  
**Location:** `/src/components/tati/NextStepCard.tsx`

**Props:**
```typescript
{
  currentState: ProgressSnapshot
  childId: string
  childName: string
}
```

**Renders:**
```
┌─────────────────────────────────┐
│ Primary CTA                      │
│ [Action Button - prominent]      │
│                                  │
│ Secondary info (e.g., day counter)
└─────────────────────────────────┘
```

**Usage:** 
- On `/child/home` (below XP indicator)
- On `/child/learn` (top of page)
- Contextually on lesson/scenario pages

---

## 6. SCENARIO CONSEQUENCE EXPERIENCE SPECIFICATION

### Current State
Scenario engine computes consequences (data exists in `school-reopening.ts`), but UI doesn't show them.

### Proposed UX Flow

```
Child makes choice (taps button)
    ↓
[Brief transition/animation]
    ↓
CONSEQUENCE SCREEN (NEW):
  ┌────────────────────────────────┐
  │ [Icon/emoji for choice]         │
  │ "Decision: You chose [X]"       │ (from decisionChip)
  │                                 │
  │ "Here's what happened:"         │ (headline)
  │ "[Title - short]"               │ (from consequence.title)
  │ "[Body - narrative]"            │ (from consequence.body)
  │                                 │
  │ [Wallet update visual?]         │
  │ "You now have: GH₵Y available"  │
  │ "Saved for goal: GH₵Z"          │
  │                                 │
  │ [Continue button or auto-fade]
  └────────────────────────────────┘
    ↓
[If more nodes in scenario:]
  Next node loads (Day X, new situation)
[If scenario complete:]
  Redirect to reflection or /child/learn
```

### Design Details

**Consequence Card Component (NEW)**

**Props:**
```typescript
{
  decision: Choice  // from scenario definition
  consequence: Consequence  // has decisionChip, headline, title, body, ledgerNote
  walletBefore: { available: number, saved: number }
  walletAfter: { available: number, saved: number }
  onContinue: () => void
}
```

**Rendering Logic:**
```
1. Show decision choice selected (emoji + label)
2. Show "Here's what happened" narrative (consequence fields)
3. Show money changes (if available):
   - Wallet before: "You had: GH₵X available + GH₵Y saved"
   - Wallet after: "Now: GH₵X' available + GH₵Y' saved"
   - Change visualization (color-coded: ↓ red if decreased, ↑ green if increased)
4. Competency impact (if available): "This helped you learn about [competency]"
5. Continue button (or auto-continue after 3 seconds)
```

**Critical Guidance:**
- **No punishment framing:** Even if child lost money, frame as "learning," not "failure"
- **Show cause-effect:** Money change must be directly tied to choice
- **Natural language:** Use consequence.body exactly (already written in child-friendly language)
- **Wallet transparency:** Show math so child understands GH₵ flow

### Persistence & Resumption

**Data to persist in scenario state:**
```
decisions: [
  {
    nodeId: "plan-the-money",
    choiceId: "save-40",
    decisionChip: "Decision: GH₵40 into savings box",
    consequence: { ... },
    walletAfter: { available: 10, saved: 40 },
    timestamp: ISO string
  },
  ...
]
```

**Resume behavior:**
- If child exits scenario mid-way, next return resumes at last node
- Consequence screen for previous decision is NOT replayed
- Child continues to next decision point

### Replay Option (P2 — Polish)

Optional: Add "Undo last choice?" button for child to explore alternate paths.  
**Dependency:** Requires scenario engine to support branching without destructing state.  
**Recommendation:** Defer to P2 phase after core consequence display works.

---

## 7. PRE-ASSESSMENT UX SPECIFICATION

### Current: Basic multiple-choice, per-question feedback

### Proposed: Scenario-based intro, framing, question feedback, transition

```
ENTRY (/child/assessment/save-pre)
    ↓
[AssessmentRunner component]
    ↓
├─ INTRO SCREEN (5 sec read)
│  ├─ Title: "Before we begin — Let's see how you think about money! 🧠"
│  ├─ Body: "There are no grades or scores here! Just choose what you think you would do in everyday life."
│  ├─ Topics preview: "🍎 Buying snacks · 💰 Saving cedis · 🤝 Sharing"
│  ├─ Estimated time: "This takes about 5 minutes"
│  └─ CTA: "Start Check-In"
│
├─ QUESTIONS (1 per screen)
│  │
│  ├─ Q1: "Auntie Akosua gives you GH₵10 on Saturday. What do you do first?"
│  │  ├─ Options: (spend all / keep some + spend / save all / give away)
│  │  ├─ Format: Large tap targets, emoji per option
│  │  ├─ On tap:
│  │  │  ├─ Option highlights
│  │  │  ├─ Brief animation
│  │  │  ├─ Feedback appears below: "Keeping a part... is a habit many savers use. We'll practise it together."
│  │  │  └─ "Next >" button appears
│  │  │
│  │  ├─ Q2-Q5: Same pattern
│  │  │
│  │  └─ Visual progress: "Question 2 of 5" badge
│  │
│  └─ OUTRO SCREEN (10 sec read)
│     ├─ Title: "Profile Unlocked! 🌟"
│     ├─ Message: "We've learned a little about how you think about everyday money choices. Now your TATI adventure begins!"
│     ├─ What's next: Show chapter 0 preview ("You'll learn about 4 superpowers of money...")
│     └─ CTA: "Start Learning →" → /child/learn

POST-ASSESS (data flow)
    ├─ responses: Record all Q answers (["a", "b", "b", "a", "b"])
    ├─ points: Calculate score (5 possible, showing child got X right)
    ├─ competencyScores: Compute pre-baseline for each competency (internal, not shown)
    └─ Event recorded: assessment_completed, date, scores
```

### Assessment Component Props (AssessmentRunner)

```typescript
{
  definition: AssessmentDefinition
  childId: string
  childName: string
  onComplete: (result: AssessmentResult) => void
}
```

### Data to Persist

**Per-Question:**
- Selected option ID
- Time to answer (if desired)
- Correctness (best option vs. selected)

**Aggregate:**
- Total points: sum of correct answers
- Competency scores:
  ```
  {
    "needs-vs-wants": { score: 1/1, confidence: "high" },
    "saving": { score: 1/1, confidence: "high" },
    "goal-setting": { score: 0/1, confidence: "low" },
    ...
  }
  ```
- Assessment event created (type: "assessment", item_id: "save-pre", score, timestamp)

### Critical: DO NOT Show Raw Scores to Child

- ❌ "You got 4 out of 5 — 80%"  
- ❌ "You need more practice in: goal-setting"

Instead:

- ✅ "You showed strong thinking about saving"  
- ✅ "Let's learn more about how to set goals together"

### Implementation: Extend AssessmentRunner

**Reuse:** Existing `AssessmentRunner` component exists in `/src/components/assessment/`  
**Extend:** Add consequence/feedback screen display after each question (currently might not show)

---

## 8. LESSON UX SPECIFICATION

### Current State
LessonPlayer component renders lesson content blocks (text, cards, knowledge check, reflection).

### Proposed: Add Context & Learning Objective

```
ENTRY (/child/lesson/{lessonId})
    ↓
[LessonPlayer component loads]
    ↓
├─ HEADER SECTION (new)
│  ├─ Back button: "← Back to journey"
│  ├─ Chapter banner: "Chapter 2 — Market Day" (from track.stage)
│  ├─ Lesson title: "Need or Want: What's the Difference?"
│  ├─ Learning objective: "You're learning to spot what you truly need for school and health"
│  ├─ Step label: "Lesson 4 of 12" (or could show relative to chapter)
│  └─ Duration badge: "~5 min"
│
├─ CONTENT AREA (existing)
│  ├─ Illustration/scene (existing .png.asset.json)
│  ├─ Content blocks (text, cards, activities) — existing rendering
│  └─ Knowledge check — existing rendering
│
├─ REFLECTION AREA (existing)
│  ├─ Prompt: "Which superpower do you use most right now?"
│  ├─ Text input (optional for junior)
│  └─ Save button: "Save & Continue"
│
└─ POST-LESSON (new)
   ├─ "What happens next?" context
   ├─ If scenario unlocked: "Next: Take on the [Scenario] challenge"
   ├─ If more lessons: "Next: Learn about [Lesson Y]"
   └─ CTA: "Continue Journey" → /child/learn (or specific next item)
```

### Component Changes (LessonPlayer)

**Add props:**
```typescript
{
  lesson: Lesson
  childId: string
  stepLabel?: string  // "Lesson 5 of 12"
  chapterStage?: string  // "Chapter 2 — Market Day"
  learningObjective?: string  // explicit objective
  nextActivityTitle?: string  // "Try the Challenge: Market Day Decision"
  nextActivityRoute?: string  // URL to next activity
}
```

**Render pattern:**
```
┌──────────────────────────────┐
│ Chapter 2 · Market Day       │  ← stage from track
│ Need or Want [title]         │
│ "You're learning to spot..." │  ← lesson.learningObjective
│ Lesson 4 of 12 · ~5 min      │
├──────────────────────────────┤
│ [Illustration]               │
│ [Content blocks - existing]  │
├──────────────────────────────┤
│ [Knowledge check - existing] │
├──────────────────────────────┤
│ [Reflection - existing]      │
├──────────────────────────────┤
│ Next: Try Challenge: Market  │  ← NEW
│ [Continue >]                 │
└──────────────────────────────┘
```

### Data Persistence (unchanged)

Existing localStorage resume mechanism works; just adding UI context.

### Implementation Plan

**Reuse:** LessonPlayer component (no new component needed)  
**Extend:** Add header section with chapter banner + learning objective display

---

## 9. SCENARIO/CONSEQUENCE UX SPECIFICATION

*See Section 6 above for detailed consequence screen design.*

### Additional: Scenario Entry & Goal Context

```
ENTRY (/child/scenario/{scenarioId})
    ↓
[ScenarioPlayer loads]
    ↓
├─ HEADER (new)
│  ├─ Back: "← Back to journey"
│  ├─ Chapter: "Chapter 2 — Market Day"
│  ├─ Story title: "An exercise book, a toffee and your goal all want the same cedis"
│  └─ Day counter: "Day 4 of 14"
│
├─ GOAL WIDGET (new, persistent)
│  ├─ Icon: 🎯
│  ├─ "Goal: Oxford blue school bag — GH₵80"
│  ├─ Progress: "You've earned GH₵X towards GH₵80 (50%)"
│  ├─ Visual bar: ████░░░░░░ (50%)
│  └─ Days: "10 days left"
│
├─ WALLET DISPLAY (new, persistent)
│  ├─ 👛 "Available: GH₵X"
│  ├─ 🐷 "Saved: GH₵Y"
│  └─ "Total: GH₵(X+Y)"
│
├─ SCENARIO INTRO (existing)
│  ├─ Scenario image
│  ├─ Situation text: "You're at the market with GH₵20..."
│  └─ "Let's decide" button
│
├─ DECISION NODE (existing)
│  ├─ Question: "What's your first choice?"
│  ├─ Options: (cards with emoji, label, description)
│  └─ On tap → CONSEQUENCE SCREEN (Section 6)
│
└─ ON SCENARIO COMPLETE
   ├─ Wallet updated
   ├─ Progress updated
   ├─ Redirect to: Reflection (if available) or /child/learn
   └─ Journey progress updated in snapshot
```

### New Components

**GoalWidget (NEW)**
```typescript
{
  goalLabel: string  // "Oxford blue school bag"
  targetAmount: number  // 80
  savedAmount: number  // current savings
  daysTotal: number  // 14
  daysUsed: number  // current day progress
}
```

**WalletDisplay (NEW)**
```typescript
{
  available: number
  saved: number
}
```

---

## 10. POST-ASSESSMENT & LEARNING SUMMARY SPECIFICATION

### Current: Assessment runs, child sees score/competencies (internal data)

### Proposed: Growth-focused learning summary

```
ENTRY (/child/assessment/save-post)
    ↓
[AssessmentRunner - same as pre-assessment]
    ↓
POST-ASSESSMENT COMPLETE
    ↓
REDIRECT → /child/results (automatic)
    ↓
RESULTS SCREEN renders:
├─ CELEBRATION (existing)
│  ├─ 🎉 "Nice work, [Name]!"
│  ├─ "You made your choices and saw what happened. That's exactly how savers learn."
│  └─ Icon: celebration animation (optional)
│
├─ JOURNEY SUMMARY (new/enhanced)
│  ├─ Title: "Your Journey So Far"
│  ├─ "You completed 24 of 24 journey stops!"
│  ├─ "Time spent: [calculated from events]"
│  ├─ Visual: progress ring (100% complete)
│  └─ Final goal state: (if available) "School bag goal: GH₵[final] (reached! / fell short by GH₵X)"
│
├─ KEY DECISIONS (new)
│  ├─ "Moments That Shaped Your Journey"
│  ├─ Show 2-3 pivotal scenario choices (if data available):
│  │  ├─ "Day 2: You chose to save GH₵40. That set the tone for your whole journey."
│  │  ├─ "Day 4: At the market, you chose the notebook over the toffee."
│  │  └─ "Day 10: You handled the torn sandal by [choice]."
│  │
│  └─ Pattern: [Day X: You chose [X]. Why it mattered: [consequence summary].]
│
├─ LEARNING GROWTH (new, if pre-post comparison available)
│  ├─ Title: "What You're Learning"
│  ├─ Competency growth (from pre-post assessment):
│  │  ├─ "Saving: You went from thinking... to understanding..."
│  │  ├─ "Needs vs Wants: You're now spotting the difference"
│  │  └─ "Goal-Setting: You learned how to make a plan stick"
│  │
│  ├─ [CONDITIONAL] If growth detected: "This grew since the first check-in! 📈"
│  └─ [CONDITIONAL] If same: "You were already strong here — nice consistency!"
│
├─ BADGES EARNED (existing, enhance)
│  ├─ "Your Achievements"
│  ├─ Show all earned badges with:
│  │  ├─ Badge icon/emoji
│  │  ├─ Badge name
│  │  ├─ When earned: "Day X"
│  │  └─ Why: "You learned about [topic]"
│  │
│  ├─ NEW: Highlight "Super Saver" badge if goal reached
│  └─ NEW: Show total earned: "5 badges earned"
│
├─ XP SUMMARY (existing, enhance)
│  ├─ "Experience Points Earned: XYZ stars ⭐"
│  ├─ "You went from Level 1 → Level X"
│  └─ Visual bar showing current level progress
│
└─ NEXT STEP (new)
   ├─ Title: "What's Next?"
   ├─ Option 1: "Share Your Journey with Your Parent" → share functionality
   ├─ Option 2: "View Your Progress Details" → /child/progress
   ├─ Option 3: "Start a New Track" (if available) OR "Back to Home"
   └─ Primary CTA: "Back to Your Home" → /child/home
```

### Implementation: ChildResults Component (Extend)

**Current component exists in `/src/routes/child/results.tsx`**

**Extend with new props:**
```typescript
{
  childName: string
  snapshot: ProgressSnapshot  // has all journey data
  preAssessmentData?: AssessmentResult
  postAssessmentData?: AssessmentResult
  scenarioDecisions?: ScenarioDecision[]  // if available from data
}
```

### Data Flow for Growth Comparison

**Pre-assessment:**
```
competencyScores: {
  "needs-vs-wants": 0.3,  // Q1 answer
  "saving": 0.8,          // Q2 answer
  "goal-setting": 0.2,    // Q4 answer
  ...
}
```

**Post-assessment:**
```
competencyScores: {
  "needs-vs-wants": 0.9,  // improved!
  "saving": 0.8,          // stable
  "goal-setting": 0.7,    // improved!
  ...
}
```

**Growth calculation:**
```typescript
function getGrowth(pre: CompetencyScore, post: CompetencyScore): {
  grew: boolean
  description: string
}
```

### Critical: Safety in Framing

- ✅ "You went from thinking X to understanding Y" (positive)
- ✅ "You were already strong in Z — you stayed consistent" (affirming)
- ❌ "You failed to improve in W" (never)
- ❌ Raw numbers or percentages (confusing for children)

---

## 11. PARENT JOURNEY MAP & EXPERIENCE SPECIFICATION

### Current Parent View

| Page | Shows | Missing |
|------|-------|---------|
| `/parent` | List of children, name, age, avatar | Real-time status, current lesson |
| `/parent/child/{id}` | Progress %, completed lessons, badges | Scenario decisions, struggle points, competency details |
| `/parent/feedback` | Form to write observations | — |
| `/parent/metrics` | (not explored in audit) | — |

### Proposed Parent Mental Model

#### **Where is my child?**
- Current activity: "Kojo is on Lesson 4: Needs vs Wants (7 min remaining, if tracked)"
- Estimated time: "Usually finishes in 15 min"
- Overall progress: "Chapter 2 of 5 (4 days in, 10 days left)"

#### **What have they completed?**
- Completed activities list (current: exists)
- Time spent: "Finished 8 activities in 45 minutes total"
- Assess engagement: Lesson duration vs. estimated (did they rush or linger?)

#### **What are they learning?**
- Competency development (from pre-post): "Getting better at needs-vs-wants, still practicing saving"
- Strengths emerging: "Really good at earning decisions"
- Areas to support: "Let's focus on goal-setting at home"

#### **What decisions did they make?**
- Key scenario choices: "When offered a job, chose to work for extra money"
- Pattern emerging: "Tends to choose spending over saving (in scenarios)"
- Conflict points: "Struggled with the lending decision in Day 6"

#### **How can I support?**
- Conversation starters: "Your child just learned about needs vs wants. Ask them to sort 3 things you're buying together."
- Practical activities: "Money talk ideas: count cedis together, visit the market"
- When to check in: "End of each chapter (every 2-3 days)"

### Parent Journey Map: Full View

| Stage | Parent Goal | Parent Action | Information Needed | System State | Primary CTA | Notes |
|---|---|---|---|---|---|---|
| **Child Created** | See child added | Create profile → name, age, avatar | Confirmation | Child in /parent list | "Let [child] start" | Parent sees onboarding CTA |
| **Pre-Assess Ready** | Know when to engage | Prompt: "Kojo is ready to start" | Notification (if available) | Assessment available | View child → "Ready to begin?" | Can watch first check-in |
| **Pre-Assess Complete** | Understand baseline | See what Kojo thinks about money now | Assessment summary (non-scores: "thinking style") | Assessment event recorded | "See what comes next" | No raw scores; framed as "here's how your child thinks about…" |
| **In Chapter 1** | Track pace | See "Day 2 of 14, Lesson 2 of 12 done" | Real-time progress + day counter | Snapshot computes dayNumber | View journey | Parent understands timeline |
| **Scenario Complete** | Understand choice | See key decision made in scenario | Scenario choices + consequence | Decisions persisted in scenario state | "Understand this decision" | Provides context for home conversation |
| **Mid-Journey** | Support at home | See what was learned, suggest conversation | Competency emerging, conversation starter, activity idea | Progress snapshot + competency data | "Conversation ideas" | Example: "Your child just learned about saving. Ask: When you get money, what do you do with it?" |
| **Chapter Complete** | Celebrate milestone | See which chapter done, celebrate | Chapter banner + completion badge | Event recorded per chapter | "Share the news" | Parent sends message to child |
| **Post-Assess Complete** | See growth | View pre-post comparison in parent language | Growth narrative (not scores) | Competency pre-post data | "See their growth" | Example: "From pre-assessment, your child has become better at needs-vs-wants" |
| **Journey Complete** | Celebrate, reflect | See full journey arc + decisions made | Summary, badges, key moments, learning growth | All data persisted | "Share results" or "next track" | Parent sees "Here's what your child learned" |

### Parent Screen: /parent/child/{childId} (Enhanced)

```
CURRENT (exists)
├─ Child profile card (avatar, name, age, grade)
├─ Progress ring (% of activities done)
├─ Completed lessons list
└─ Timeline of recent activity

PROPOSED ADDITIONS:

├─ REAL-TIME STATUS WIDGET (new)
│  ├─ 🎯 Current activity: "Lesson 4: Needs vs Wants (started 5 min ago)"
│  ├─ 📍 Journey stage: "Chapter 2 — Market Day (Day 4 of 14)"
│  ├─ ⏱️ Estimated time: "5-8 minutes remaining"
│  ├─ 📊 Overall progress: "4 of 5 chapters done"
│  └─ Refresh button (manual, since real-time may be expensive)
│
├─ DECISIONS & PATTERNS (new)
│  ├─ Title: "Key Choices Your Child Made"
│  ├─ Scenario summary (show 2-3 recent decisions):
│  │  ├─ "Day 2: Chose to save GH₵40 in the box (goal-setting focused)"
│  │  ├─ "Day 4: Picked the notebook over the toffee (needs-vs-wants thinking)"
│  │  └─ "Day 6: Lent money to Kwame (compassionate, but talked about risks later)"
│  │
│  └─ Pattern analysis (if apparent): "Your child tends to be [saver/spender/generous]"
│
├─ COMPETENCY DEVELOPMENT (new)
│  ├─ Title: "What They're Learning"
│  ├─ [IF pre-post available]:
│  │  ├─ "Needs-vs-Wants: Growing strong 📈"
│  │  ├─ "Saving: Very consistent ✓"
│  │  ├─ "Goal-Setting: Still practicing..."
│  │  └─ Text: "[Name] is becoming better at [competency]." + conversation starter
│  │
│  └─ [IF pre-post not yet available]:
│  │  ├─ "You'll see learning growth after the final check-in"
│  │  └─ Current competencies being developed (based on scenarios)
│
├─ CONVERSATION STARTERS (new)
│  ├─ Title: "Talk About This at Home"
│  ├─ Based on recent lessons + scenarios:
│  │  ├─ "Your child just learned about needs vs wants. Ask them to sort 3 things you're buying."
│  │  ├─ "At the market scenario, they chose the notebook. Ask why that was important to their goal."
│  │  └─ "Next scenario is about lending to friends. You might ask: 'What would you do if your friend asked to borrow?'"
│  │
│  └─ Refreshed after each chapter completion
│
├─ STRUGGLE INDICATORS (new, use with care)
│  ├─ "Things That Took More Than One Try:" (if data available)
│  │  ├─ "Lesson 6: Money Safety (took 2 attempts to pass knowledge check)"
│  │  └─ [Note: Frame as "learning moment," not failure]
│  │
│  └─ CTA: "Support this skill: [suggestion]"
│
└─ ENGAGEMENT METRICS (new, simple)
   ├─ "Your child has spent: ~45 minutes on this journey"
   ├─ "Pace: On track for 14-day timeline" OR "Ahead of schedule" OR "Taking time to think"
   └─ No pressure framing ("everyone learns at their own pace")
```

### Implementation: ParentChildView Component (Extend)

**Reuse:** `/src/routes/parent/child.$childId.tsx` exists  
**Extend:** Add sections for decisions, competencies, conversation starters

**New components needed:**
- `DecisionSummaryCard` — shows key scenario choices
- `ConversationStarterWidget` — pulls from parent-insights.ts
- `StruggleIndicatorCard` (optional, P2)

---

## 12. ACHIEVEMENT/CELEBRATION SYSTEM SPECIFICATION

### Verification: Are Badges/XP Real?

**YES. They are genuinely part of the product.**

Evidence:
- Track items have `.reward` field (XP points per item)
- Badge system exists: `GamificationState` in snapshot
- XPIndicator component renders levels + XP bar
- CelebrationOverlay component exists

### Current Implementation Gap
- Badges earned but no unlock animation
- XP awarded but no "+20 XP 🌟" toast feedback
- Celebration only at journey end, not at milestones

### Proposed: Lightweight Celebration Moments

**Goal:** Child feels rewarded without overwhelming the learning experience

#### **P0: Task Completion Acknowledgment** (every activity)

**After Lesson Completion:**
```
Child taps "Save & Continue"
    ↓
Brief loading state (1 sec)
    ↓
Toast appears (2 sec):
┌─────────────────────┐
│ ✓ Lesson complete!  │
│ +20 XP ⭐           │
└─────────────────────┘
    ↓
Redirect to /child/learn (or next page)
```

**Implementation:** Toast component + timing (don't block, auto-dismiss)

#### **P1: Chapter Completion Milestone**

**After Chapter 5 Scenario + Reflection:**
```
Reflection saved
    ↓
Modal appears (5 sec read):
┌──────────────────────────────┐
│ 🎉 Chapter 2 Complete!       │
│                              │
│ "You navigated market day    │
│  and learned when to say no" │
│                              │
│ +10 XP + 15 milestone points │
│ Next: Chapter 3 awaits       │
│                              │
│ [Continue >]                 │
└──────────────────────────────┘
    ↓
Redirect to /child/learn
```

**Frequency:** Once per chapter (5 times in journey)

#### **P1: Badge Unlock**

**When competency threshold crossed (if trackable):**
```
Scenario consequence recorded
    ↓
[System computes if badge tier reached]
    ↓
[IF badge unlocked]:
  Badge celebration modal (3 sec):
  ┌──────────────────────────┐
  │ 🏆 Badge Unlocked!       │
  │                          │
  │ "Wise Spender"           │
  │ You learned to spot the  │
  │ difference between needs │
  │ and wants                │
  │                          │
  │ [View badges]            │
  └──────────────────────────┘
    ↓
  Back to journey
```

**Frequency:** ~4-6 times (depends on badge system design)

#### **P2: Home Page "New" Highlights**

On `/child/home`, show:
- "🆕 3 new badges earned!" badge
- Highlight most recent badge (not all)
- "You're on Level 3 now!" if level changed

### Implementation: CelebrationToast Component (extend existing CelebrationOverlay)

**Reuse:** CelebrationOverlay exists  
**Extend:** Make it dismissable, add auto-close timer, support both modal and toast sizes

**Props:**
```typescript
{
  type: "lesson-complete" | "chapter-complete" | "badge-unlock" | "level-up"
  title: string
  message?: string
  icon?: string
  xpEarned?: number
  badgeName?: string
  autoClose?: number  // ms before auto-dismiss
  onDismiss: () => void
}
```

### Critical: Tone

- ✅ "Nice work, you finished!" (affirming)
- ✅ "+20 XP!" (transparent reward)
- ✅ "Wise Spender badge — you learned [thing]" (meaningful)
- ❌ No "level up" explosions (keep focus on learning)
- ❌ No pressure ("keep it up! only X more to go!")

---

## 13. MOBILE UX REQUIREMENTS

### Devices & Breakpoints

**Primary Target:**
- Ages 8-12 with parent's phone (smartphone)
- Common sizes: 375px - 428px width (iPhone SE to iPhone 14 Pro)
- Portrait orientation (primary), landscape (secondary)

**Testing Viewport Sizes:**
- 320px (minimum, older phones)
- 375px (iPhone SE, primary test)
- 428px (iPhone 14, check scaling)
- 768px (tablet, verify text doesn't break)

### Critical Screens & Requirements

#### **1. Child Home (/child/home)**

```
Touch targets: ≥48px
Text: base (16px+) for body, lg (18px+) for headings
Card spacing: gap-3 (12px) consistent
Scroll: Content scrolls vertically, no horizontal scroll
CTA placement: Thumb-reachable (bottom half of screen) or double-row buttons

Layout:
┌─────────────────────────────┐ (375px)
│ Header (TATI, sign out)     │
├─────────────────────────────┤
│ Welcome, [Name] 👋          │
├─────────────────────────────┤
│ XP Progress bar             │
├─────────────────────────────┤
│ Current Challenge card      │
├─────────────────────────────┤
│ My learning journey         │
│ X of Y activities           │
├─────────────────────────────┤
│ [Continue Journey >]        │ ← Button takes 50%+ width
├─────────────────────────────┤
│ Achievements                │
│ [Badge] [Badge] [Badge]     │
├─────────────────────────────┤
│ [View all badges] button    │
└─────────────────────────────┘
└─> Bottom nav (if used)
```

**Responsive Checklist:**
- ✅ No horizontal scroll at 375px
- ✅ All buttons ≥48px height (use py-3, min-h-[48px])
- ✅ Text doesn't overflow (use truncate, line-clamp)
- ✅ Bottom nav doesn't cover content (pb-28 on Page)
- ✅ Touch targets ≥12px gap between (avoid fat-finger errors)

#### **2. Pre-Assessment (/child/assessment/save-pre)**

```
Layout:
┌─────────────────────────────┐
│ Question 1 of 5             │
├─────────────────────────────┤
│ Question text               │
│ (can wrap to 2-3 lines)     │
├─────────────────────────────┤
│ Option A                    │ ← Large tap area
│ [████████████████]  48px    │
├─────────────────────────────┤
│ Option B                    │
│ [████████████████]  48px    │
├─────────────────────────────┤
│ Option C                    │
│ [████████████████]  48px    │
├─────────────────────────────┤
│ Option D                    │
│ [████████████████]  48px    │
├─────────────────────────────┤
│ [Feedback text, if shown]   │
├─────────────────────────────┤
│ [Next >] button             │
└─────────────────────────────┘
```

**Requirements:**
- ✅ Question text: text-base (16px) or lg (18px), bold
- ✅ Options: Each ≥48px tall, full width minus padding (px-4)
- ✅ Gap between options: gap-3 (12px minimum)
- ✅ No horizontal scroll
- ✅ Feedback text: text-sm (14px), sits between option and next button
- ✅ Scrollable if content exceeds viewport (but shouldn't for questions)

#### **3. Lesson (/child/lesson/{id})**

```
Layout:
┌──────────────────────────────┐
│ ← Back | Chapter 2 | Lesson 4│
├──────────────────────────────┤
│ [Illustration - responsive] │
│ ┌────────────────────────────┐
│ │  .png image, max-h-[250px] │
│ │  Aspect ratio: maintain    │
│ └────────────────────────────┘
├──────────────────────────────┤
│ Lesson Title                 │
│ (text-xl font-bold)          │
├──────────────────────────────┤
│ Learning objective:          │
│ "You're learning..."         │
│ (text-sm muted-foreground)   │
├──────────────────────────────┤
│ Content block 1 (text)       │
├──────────────────────────────┤
│ Content block 2 (cards)      │
│ ┌────────────────────────────┐
│ │ Card A (interactive)       │
│ └────────────────────────────┘
│ ┌────────────────────────────┐
│ │ Card B (can scroll horiz?)  │
│ └────────────────────────────┘
├──────────────────────────────┤
│ Knowledge check              │
│ [Multiple tap options]       │
├──────────────────────────────┤
│ Reflection                   │
│ [Text input area]            │
├──────────────────────────────┤
│ [Save & Continue]            │
└──────────────────────────────┘
```

**Requirements:**
- ✅ Illustration: max-w-full, max-h-[250px] on mobile (avoid vertical scroll)
- ✅ Content cards: Full width minus padding (px-4), can scroll horizontally if needed
- ✅ Text input: min-h-[120px], easy to tap
- ✅ Buttons: Full width or 2-column if space allows
- ✅ No horizontal scroll except for optional card carousel

#### **4. Scenario (/child/scenario/{id})**

```
Layout:
┌──────────────────────────────┐
│ ← Back | Chapter 2 | Day 4   │
├──────────────────────────────┤
│ [Goal Widget - compact]      │
│ 🎯 GH₵80 goal · 50% done     │
│ ⏱️ 10 days left              │
├──────────────────────────────┤
│ [Wallet Display - compact]   │
│ 👛 Available: GH₵10          │
│ 🐷 Saved: GH₵40             │
├──────────────────────────────┤
│ [Scenario image]             │
│ (max-h-[200px], responsive)  │
├──────────────────────────────┤
│ Situation text               │
│ (text-base, can wrap)        │
├──────────────────────────────┤
│ "What do you do?"            │
├──────────────────────────────┤
│ Choice Option 1              │
│ [████████████████]  48px tall│
│ Label: text-base             │
│ Description: text-sm         │
├──────────────────────────────┤
│ Choice Option 2              │
│ [████████████████]  48px tall│
├──────────────────────────────┤
│ Choice Option 3              │
│ [████████████████]  48px tall│
└──────────────────────────────┘
```

**Requirements:**
- ✅ Goal widget: Compact, no more than 2 lines (use abbreviated text)
- ✅ Wallet display: Same, compact
- ✅ Scenario image: max-h-[200px], full width
- ✅ Choice options: ≥48px tall, full width minus padding
- ✅ Description text: text-sm (14px), muted color, can wrap
- ✅ No horizontal scroll
- ✅ Consequence screen: Same layout standards when shown

#### **5. Consequence Screen (modal or full-screen)**

```
Modal (if modal):
┌──────────────────────────────┐
│ ✕ [Close - top right]        │
├──────────────────────────────┤
│ [Decision icon/emoji]        │
│ "You chose: Save GH₵40"      │
├──────────────────────────────┤
│ "Here's what happened"       │
│ [Narrative title]            │
│ [Narrative body text]        │
│ (scrollable if long)         │
├──────────────────────────────┤
│ Wallet before: GH₵50 available
│ Wallet after: GH₵10 available
│ [Visual indicator: ↓ or →]   │
├──────────────────────────────┤
│ [Continue >]                 │
└──────────────────────────────┘
```

**Requirements:**
- ✅ Modal width: 90vw (full minus padding)
- ✅ Text: body text-base (16px), title text-lg (18px)
- ✅ Scrollable content if narrative is long
- ✅ Close button clearly marked (X, not buried)
- ✅ CTA button: Full width, ≥48px tall

#### **6. Post-Assessment (/child/assessment/save-post)**

Same as pre-assessment (Section 3).

#### **7. Results (/child/results)**

```
Layout:
┌──────────────────────────────┐
│ 🎉                           │
│ "Nice work, [Name]!"         │
├──────────────────────────────┤
│ "You completed 24 of 24"     │
├──────────────────────────────┤
│ XP Earned: XXX ⭐            │
├──────────────────────────────┤
│ Key Decisions (scrollable)   │
│ • "Day 2: You chose..."      │
│ • "Day 4: You picked..."     │
│ • "Day 6: You..."            │
├──────────────────────────────┤
│ Learning Growth (if available)
│ • "Needs-vs-Wants: Strong!"  │
│ • "Saving: Growing"          │
├──────────────────────────────┤
│ Badges Earned                │
│ [Badge] [Badge] [Badge]      │
├──────────────────────────────┤
│ [Back to Home] button        │
│ [Share Journey] button       │
└──────────────────────────────┘
```

**Requirements:**
- ✅ Celebration emoji: Large (text-4xl or 6xl)
- ✅ Content scrollable if exceeds viewport
- ✅ Badges: Cards, not just emoji (include name, icon, description)
- ✅ Buttons: Full width or stacked, ≥48px
- ✅ Text: Headings text-lg, body text-base
- ✅ No horizontal scroll

### General Mobile Standards

**Typography:**
- ✅ Minimum font: text-sm (14px) for secondary text
- ✅ Body: text-base (16px, recommended for readability at ages 8-12)
- ✅ Headings: text-lg (18px) or text-xl (20px)
- ✅ Line height: loose (1.75) for paragraphs, default for headings
- ✅ Line length: max-w-lg or less (not full viewport for readability)

**Touch Targets:**
- ✅ Buttons: ≥48px (Tailwind: min-h-[48px])
- ✅ Interactive elements: ≥44px
- ✅ Gap between targets: ≥12px (Tailwind: gap-3)
- ✅ Icon buttons: ≥48x48px circle (flex, h-12 w-12)

**Spacing:**
- ✅ Card padding: p-5 (consistent)
- ✅ Section gap: mb-6 (consistent)
- ✅ Bottom nav offset: pb-28 (don't cover)
- ✅ Scrollable containers: No horizontal scroll at 375px

**Images:**
- ✅ Responsive: max-w-full, height: auto
- ✅ Aspect ratio: Maintain (object-cover or contain)
- ✅ Max height on mobile: Typically 200-250px (don't dominate screen)
- ✅ Lazy load if many images

**Forms:**
- ✅ Input height: ≥48px (py-3)
- ✅ Label: above input, text-sm, bold
- ✅ Placeholder: Visible, muted color
- ✅ Keyboard: type="text" for short text, type="email" etc. as appropriate
- ✅ Submit button: Full width, ≥48px

**Overflow Handling:**
- ✅ Text: Use `truncate` for single-line (card titles), `line-clamp-2` or `line-clamp-3` for multi-line summaries
- ✅ No content should be hidden by bottom nav (pb-28 offsets)
- ✅ Modals/overlays: Full screen or max-h-screen, scrollable if needed

---

## 14. COMPONENT STRATEGY MATRIX

### Existing Components (Audit Inventory)

| Component | Location | Current Use | P0 Action | Notes |
|-----------|----------|-------------|-----------|-------|
| **Page** | `tati/Layout.tsx` | All pages | Reuse | withBottomNav, role props — working well |
| **PageHeader** | `tati/Layout.tsx` | All pages | Extend | Add learningObjective prop, stage display |
| **Card** | `tati/Card.tsx` | All cards | Reuse | tone (surface/muted/primary) consistent |
| **Badge** | `tati/Badge.tsx` | Progress, labels | Reuse | Works well, no changes needed |
| **Button** | `tati/Button.tsx` | All CTAs | Reuse | variant/size system solid |
| **Avatar** | `tati/Avatar.tsx` | Profile | Reuse | No changes |
| **LessonCard** | `tati/Cards.tsx` | /learn list | Extend | Add chapter context, learning objective preview |
| **ScenarioCard** | `tati/Cards.tsx` | /learn list | Extend | Add day counter, wallet preview |
| **ProgressRing** | `tati/Progress.tsx` | Parent /child | Reuse | Working |
| **LoadingState** | `tati/States.tsx` | Loading fallback | Reuse | Working |
| **ErrorState** | `tati/States.tsx` | Error fallback | Reuse | Working |
| **EmptyState** | `tati/States.tsx` | Empty fallback | Reuse | Working |
| **XPIndicator** | `tati/Badge.tsx` | Home, results | Extend | Add "new level" highlight |
| **CelebrationOverlay** | `gamification/` | Results only | Extend | Use for task completions, add toast mode |
| **LessonPlayer** | `lesson/LessonPlayer.tsx` | /child/lesson | Extend | Add chapter banner, objective context |
| **ScenarioPlayer** | `scenario/ScenarioPlayer.tsx` | /child/scenario | Extend | Add goal widget, consequence screen |
| **AssessmentRunner** | `assessment/` | /child/assessment | Reuse | Existing UX ok, just extend data handling |

### New Components Needed

| Component | Purpose | Props | Reusability | P0/P1 | Dependency |
|-----------|---------|-------|------------|-------|------------|
| **ChapterBanner** | Display chapter context | { stage: string, dayNumber: number, daysTotal: number } | Reusable (all lessons/scenarios) | **P0** | None |
| **GoalWidget** | Show 14-day goal progress | { goalLabel, targetAmount, currentSaved, daysTotal, dayNumber } | Reusable (home, lesson, scenario) | **P0** | Track data |
| **WalletDisplay** | Show available + saved | { available: number, saved: number } | Reusable (scenario, consequence) | **P0** | Scenario state |
| **NextStepCard** | Show next action | { snapshot, childId, childName } | Reusable (home, learn) | **P0** | Snapshot computation |
| **ConsequenceCard** | Display scenario outcome | { decision, consequence, walletBefore, walletAfter, onContinue } | Reusable (any scenario) | **P0** | Scenario engine |
| **CelebrationToast** | Task/chapter completion | { type, title, message, xpEarned, onDismiss } | Reusable (all activities) | **P1** | Existing CelebrationOverlay |
| **DecisionSummaryCard** | Show key choice (parent) | { decision, consequence, date } | Reusable (parent page) | **P1** | Scenario data |
| **ConversationStarterWidget** | Parent conversation ideas | { competencies, recentLessons, recentScenarios } | Reusable (parent page) | **P1** | Parent insights engine |
| **StruggleIndicatorCard** | Show areas needing support | { itemId, attempts, area } | Reusable (parent page, optional) | **P2** | Event data |
| **CompetencyGrowthCard** | Pre-post comparison | { competency, preScore, postScore } | Reusable (results, parent page) | **P1** | Assessment data |
| **LearningObjectiveBadge** | Display learning goal | { objective: string } | Reusable (lesson/scenario pages) | **P0** | Content data |

### Component Extension Details

#### **ChapterBanner (NEW)**

```typescript
export function ChapterBanner({ stage, dayNumber, daysTotal }: {
  stage: string  // "Chapter 2 — Market Day"
  dayNumber: number  // 4
  daysTotal: number  // 14
}) {
  return (
    <div className="mb-4 flex items-center justify-between rounded-2xl bg-primary-soft px-4 py-3">
      <div>
        <p className="text-xs font-bold uppercase text-primary">
          {stage}
        </p>
        <p className="text-sm font-bold text-primary">
          Day {dayNumber} of {daysTotal}
        </p>
      </div>
      <span className="text-lg">📖</span>
    </div>
  )
}
```

**Usage:** Top of LessonPlayer, ScenarioPlayer

#### **GoalWidget (NEW)**

```typescript
export function GoalWidget({
  goalLabel,
  targetAmount,
  currentSaved,
  daysTotal,
  dayNumber,
}: {
  goalLabel: string  // "Oxford blue school bag"
  targetAmount: number  // 80
  currentSaved: number  // 45
  daysTotal: number  // 14
  dayNumber: number  // 4
}) {
  const pct = Math.min(100, Math.round((currentSaved / targetAmount) * 100))
  const daysLeft = Math.max(0, daysTotal - dayNumber)
  
  return (
    <Card tone="primary" className="text-white">
      <div className="flex items-center justify-between mb-3">
        <span className="text-lg">🎯</span>
        <span className="text-xs font-bold">{pct}% done</span>
      </div>
      <p className="text-sm font-bold mb-1">{goalLabel}</p>
      <p className="text-xs mb-2">GH₵{currentSaved} of GH₵{targetAmount}</p>
      <ProgressBar value={currentSaved} max={targetAmount} className="mb-2" />
      <p className="text-xs text-white/80">{daysLeft} days left</p>
    </Card>
  )
}
```

**Usage:** Home (goal context), every lesson/scenario page (persistent)

#### **ConsequenceCard (NEW)**

```typescript
export function ConsequenceCard({
  decision,
  consequence,
  walletBefore,
  walletAfter,
  onContinue,
}: {
  decision: Choice
  consequence: Consequence
  walletBefore: { available: number, saved: number }
  walletAfter: { available: number, saved: number }
  onContinue: () => void
}) {
  // Render decision chip + consequence narrative + wallet change
  // See Section 6 for visual layout
}
```

**Usage:** ScenarioPlayer (after each choice)

---

## 15. BACKEND/DATA DEPENDENCY MATRIX

### Classification

For every proposed UX change, determine:

| Change | Type | Backend Needed? | Schema Change? | Data Exists? | Notes |
|--------|------|---|---|---|---|
| **Chapter banner display** | UI-only | No | No | Yes (track.stage, chapterTitle) | Just display existing fields |
| **Day counter** | UI-only | No | No | Yes (dayNumber computed in snapshot) | Just display snapshot data |
| **Goal widget** | UI-only | No | No | Yes (savedCedis computed from rewards) | Recompute savedCedis = sum of scenario rewards so far |
| **Wallet display** | UI + data | No | No | Partial (scenario has available/saved, but not exposed to child UI) | Need to surface wallet from scenario state to component |
| **Consequence screen** | UI-only | No | No | Yes (consequence data in scenario definition) | Just render existing consequence object |
| **Next step CTA** | UI + logic | No | No | Yes (snapshot has all state) | New component logic, no backend |
| **Pre-post comparison** | UI + logic | No | No | Yes (pre/post events recorded) | Compute growth from existing event data |
| **Competency sentence** | UI-only | No | No | Yes (skillSentence function exists) | Just call existing function from parent page |
| **Conversation starters** | UI-only | No | No | Yes (conversationStarters in snapshot) | Just display existing data |
| **Chapter completion badge** | Data + UI | Maybe | Maybe | Partial (badge system exists, but no chapter-level badge defined) | Might need to add chapter badge definition (data change, not schema) |
| **Real-time status** (parent) | UI | Maybe | No | Partial (current activity computable, but not stored) | Can compute currentItem from snapshot; refresh=manual for now |
| **Decision history** (parent) | UI | No | No | Partial (scenario stores decisions, but not exposed to parent UI) | Need to surface scenario decisions through progress data |

### Data Availability Audit

**What's persisted:**
- ✅ All lesson completion events (event stored per lesson)
- ✅ Assessment responses + scores (full responses stored)
- ✅ Scenario decisions (stored in scenario state server-side)
- ✅ XP/badges (computed in gamification engine)
- ✅ Competency scores (per question/scenario)
- ✅ Reflection text (stored as event detail)

**What's NOT persisted but could be:**
- ⚠️ Individual decision consequences (visible in scenario.consequence object, but not replayed back to child/parent)
- ⚠️ Wallet state history (only final state in scenario, not per-decision)
- ⚠️ Time spent per activity (not computed, would need timestamp tracking)

### Backend Changes Required: NONE

**Why:** All necessary data already exists in the system:
1. Track metadata (stage, chapterTitle, dayNumber calculation)
2. Scenario consequence objects (defined in data)
3. Wallet state (computed in scenario engine)
4. Assessment scores (already stored)
5. Competency insights (functions already exist)

**Critical:** No schema migrations, no new data collection, no authorization changes needed.

---

## 16. PRIORITIZED IMPLEMENTATION BACKLOG

### Phase Breakdown

#### **P0 — JOURNEY CLARITY** (High-impact, unblocks learning)
Goal: Make the 14-day journey visible and understandable

| Item | Problem | Solution | Files | Risk | Benefit |
|------|---------|----------|-------|------|---------|
| 1.1 | Child doesn't see which chapter/day | Add ChapterBanner to lesson/scenario pages | LessonPlayer, ScenarioPlayer | Low | CRITICAL clarity |
| 1.2 | Child doesn't see goal progress | Add GoalWidget (persistent on home + all pages) | home.tsx, lesson/scenario players | Low | Motivation + context |
| 1.3 | Child sees unrelated list of lessons/scenarios | Add NextStepCard with contextual CTA | home.tsx, learn.tsx | Medium | Eliminates confusion on "what next?" |
| 1.4 | Consequence narrative exists but not shown | Add ConsequenceCard after scenario choice | ScenarioPlayer | Medium | CRITICAL for learning |
| 1.5 | Learning objective unclear | Add objective display in PageHeader or lesson intro | LessonPlayer, PageHeader | Low | Context for why |
| 1.6 | Scenario decisions invisible | Surface decisions in results page | results.tsx | Low | Reflection on choices |

**Estimated effort:** 1-2 days  
**Backend changes:** 0  
**Expected child experience:** "I understand where I am, why I'm doing this, and what's next"

---

#### **P1 — LEARNING FEEDBACK** (Medium-impact, deepens understanding)

| Item | Problem | Solution | Files | Risk | Benefit |
|------|---------|----------|-------|------|---------|
| 2.1 | Celebration only at journey end | Add CelebrationToast after lesson/chapter completion | All activity pages | Low | Immediate reinforcement |
| 2.2 | Pre-assessment feedback not integrated | Enhance assessment result display with context | assessment runner | Low | Self-reflection |
| 2.3 | Post-assessment just shows results | Add pre-post competency comparison | results.tsx | Medium | Growth narrative |
| 2.4 | Parent can't see child's choices | Add DecisionSummaryCard to parent page | parent/child.$childId.tsx | Low | Home reinforcement |
| 2.5 | Parent doesn't know how to help | Add ConversationStarterWidget to parent page | parent/child.$childId.tsx | Low | Action items for parent |
| 2.6 | Child doesn't understand competency growth | Display skill development in results | results.tsx, home.tsx | Medium | Metacognitive awareness |

**Estimated effort:** 2-3 days  
**Backend changes:** 0  
**Expected outcome:** Child feels progress; parent knows how to support

---

#### **P2 — POLISH** (Nice-to-have, improved experience)

| Item | Problem | Solution | Files | Risk | Benefit |
|------|---------|----------|-------|------|---------|
| 3.1 | No indication of effort/time | Add "You spent X minutes" summary | results.tsx | Low | Effort visibility |
| 3.2 | Child unsure if struggled | Add "You took 2 attempts" note (optional) | results.tsx, home.tsx | Medium | Normalizes struggle |
| 3.3 | Mobile text hard to read | Audit actual device rendering, adjust font sizes | tati/*, all routes | Medium | Better mobile UX |
| 3.4 | Wallet history not visible | Store + display wallet changes per decision | scenario state | High | Understand money flow |
| 3.5 | Can't explore alternate paths | Add "undo" or "restart scenario" option | ScenarioPlayer | High | Curiosity-driven learning |
| 3.6 | Parent can't see real-time status | Add "Currently on: Lesson X" widget (refresh=manual) | parent/child.$childId.tsx | Low | Engagement visibility |

**Estimated effort:** 2-3 days  
**Backend changes:** Possibly (undo/replay scenario, time tracking)  
**Expected outcome:** Professional, polished feel

---

#### **P3 — ADVANCED** (Deferred, post-pilot)

- Adaptive learning (adjust difficulty based on answers)
- Mobile Money/Mobile Wallet integration
- Multiplayer scenarios (compete/cooperate with peers)
- Parent app (separate native app)
- Offline support (cache scenarios)

---

### Recommended Implementation Order

**Sprint 1 (P0 Clarity):**
1. ChapterBanner component + integrate into LessonPlayer, ScenarioPlayer
2. GoalWidget component + integrate into home, lesson/scenario pages
3. NextStepCard component + integrate into home, learn pages
4. ConsequenceCard component + integrate into ScenarioPlayer
5. LearningObjectiveBadge + integrate into PageHeader/lesson intro

**Sprint 2 (P1 Feedback):**
1. CelebrationToast + wire to lesson/chapter completion
2. Pre-post competency comparison in results
3. DecisionSummaryCard for parent page
4. ConversationStarterWidget for parent page
5. Competency growth display on home/results

**Sprint 3 (P2 Polish) — If Time:**
1. Mobile responsiveness audit + fixes
2. Time tracking + display
3. Struggle indicators (optional)
4. Wallet history (if scenario engine supports replay)

---

### Per-Item Details

#### **P0-1.1: ChapterBanner Component**

**Problem:** Child doesn't see "Chapter 2 — Market Day" or "Day 4 of 14"  
**Solution:** 
```
Create `/src/components/tati/ChapterBanner.tsx`
- Props: { stage: string, dayNumber: number, daysTotal: number }
- Render: Primary-tone background, stage label, day counter
- Use in: LessonPlayer (at top), ScenarioPlayer (at top)
```

**Files Changed:**
- New: `src/components/tati/ChapterBanner.tsx`
- Modified: `src/components/lesson/LessonPlayer.tsx` (add ChapterBanner)
- Modified: `src/components/scenario/ScenarioPlayer.tsx` (add ChapterBanner)

**Data Required:**
- track.sequence[i].stage (exists: "Chapter 2 — Market Day")
- snapshot.journey.dayNumber (computed from snapshot)
- track.goal.daysTotal (exists: 14)

**Risk:** Low (display-only, no backend)  
**Acceptance Criteria:**
- [ ] ChapterBanner displays on every lesson
- [ ] ChapterBanner displays on every scenario
- [ ] Day counter increments (Day 1, Day 2, etc.)
- [ ] Responsive at 375px width

---

#### **P0-1.2: GoalWidget Component**

**Problem:** Child doesn't see "Save GH₵80" progress or "X days left"  
**Solution:**
```
Create `/src/components/tati/GoalWidget.tsx`
- Props: { goalLabel, targetAmount, currentSaved, daysTotal, dayNumber }
- Render: Card (primary tone), goal + current + progress bar + days left
- Use in: /child/home (persistent), /child/lesson, /child/scenario
```

**Files Changed:**
- New: `src/components/tati/GoalWidget.tsx`
- Modified: `src/routes/child/home.tsx` (add GoalWidget after XP)
- Modified: `src/components/lesson/LessonPlayer.tsx` (add GoalWidget in header)
- Modified: `src/components/scenario/ScenarioPlayer.tsx` (add GoalWidget in header)

**Data Required:**
- track.goal.title ("School Bag Goal")
- track.goal.target (80)
- snapshot.journey.savedCedis (computed: sum of lesson XP so far)
- track.goal.daysTotal (14)
- snapshot.journey.dayNumber (computed)

**Risk:** Low (display-only)  
**Acceptance Criteria:**
- [ ] GoalWidget on home shows GH₵X of GH₵80
- [ ] Visible on every lesson/scenario
- [ ] Day counter increments correctly
- [ ] Progress bar updates (doesn't stay at 0%)

---

#### **P0-1.3: NextStepCard Component**

**Problem:** Child sees lesson list but doesn't know "what should I do NOW?"  
**Solution:**
```
Create `/src/components/tati/NextStepCard.tsx`
- Props: { snapshot, childId, childName }
- Logic: Use state matrix (Section 5) to compute next action
- Render: Card with primary CTA + explanation
- Use in: /child/home (prominent), /child/learn (top)
```

**Files Changed:**
- New: `src/components/tati/NextStepCard.tsx`
- Modified: `src/routes/child/home.tsx` (add NextStepCard after achievements)
- Modified: `src/routes/child/learn.tsx` (add NextStepCard at top)

**Data Required:**
- snapshot.currentItem (what's next)
- snapshot.journey.complete (is journey done?)
- snapshot.assessments.preDone, postReady, postDone
- snapshot.steps[n].current, locked

**Risk:** Medium (complex state logic, needs testing)  
**Acceptance Criteria:**
- [ ] Shows "Start Your Adventure" before pre-assess
- [ ] Shows "Begin Lesson X" after pre-assess
- [ ] Shows "Try Challenge: [Scenario]" when scenario ready
- [ ] Shows "See Your Results" when post-assess ready
- [ ] Button navigates to correct route

---

#### **P0-1.4: ConsequenceCard Component**

**Problem:** Scenario consequences exist in data but child never sees them  
**Solution:**
```
Create `/src/components/scenario/ConsequenceCard.tsx`
- Props: { decision, consequence, walletBefore, walletAfter, onContinue }
- Render: Modal/fullscreen card with narrative + wallet change
- Integration: Show after scenario choice in ScenarioPlayer
```

**Files Changed:**
- New: `src/components/scenario/ConsequenceCard.tsx`
- Modified: `src/components/scenario/ScenarioPlayer.tsx` (add after choice, before next node)

**Data Required:**
- choice.consequence (decisionChip, headline, title, body, ledgerNote)
- scenario state: walletBefore, walletAfter
- competency impacts (already in choice.effect)

**Risk:** Medium (integrating into scenario flow, might affect UX)  
**Acceptance Criteria:**
- [ ] Consequence screen appears after child taps choice
- [ ] Decision chip shows: "Decision: You chose [X]"
- [ ] Narrative displays (headline + title + body)
- [ ] Wallet change visible (GH₵X → GH₵Y)
- [ ] Continue button works, resumes scenario or moves to reflection
- [ ] Test all consequence data is correct

---

#### **P1-2.1: CelebrationToast Component**

**Problem:** Celebration only at journey end; children don't feel immediate progress  
**Solution:**
```
Extend `/src/components/gamification/CelebrationOverlay.tsx`
- Add toast mode (dismissable, auto-close)
- Add onComplete handlers to show toast after lesson/chapter
- Props: { type, title, message, xpEarned, autoClose, onDismiss }
```

**Files Changed:**
- Modified: `src/components/gamification/CelebrationOverlay.tsx` (add toast support)
- Modified: `src/components/lesson/LessonPlayer.tsx` (call toast after save)
- Modified: `src/routes/child/learn.tsx` (call toast after scenario completion)

**Data Required:**
- Existing XP award system (lesson.xpReward, scenario reward)

**Risk:** Low (UI enhancement, non-blocking)  
**Acceptance Criteria:**
- [ ] Toast appears 1 sec after "Save & Continue"
- [ ] Shows "+20 XP ⭐"
- [ ] Auto-dismisses after 2-3 seconds
- [ ] Non-blocking (child can tap to dismiss)
- [ ] Chapter completion shows modal (5 sec), not toast

---

#### **P1-2.2: Pre-Post Competency Comparison**

**Problem:** Child finishes journey but doesn't see growth in competencies  
**Solution:**
```
Extend `/src/routes/child/results.tsx`
- Add competency growth section
- Compare pre vs post assessment scores per competency
- Display as "You went from X to Y" (child-friendly language)
- Use existing skillSentence() function from parent-insights.ts
```

**Files Changed:**
- Modified: `src/routes/child/results.tsx` (add competency section)

**Data Required:**
- preAssessmentEvent (already stored)
- postAssessmentEvent (already stored)
- buildSkillGrowth() function (already exists)
- skillSentence() function (already exists, used for parent)

**Risk:** Low (reusing existing functions)  
**Acceptance Criteria:**
- [ ] Results page shows "Learning Growth" section
- [ ] Displays: "Needs-vs-Wants: You went from [before] to [after]"
- [ ] Shows emoji indicator (📈 if grew, ✓ if stable)
- [ ] No raw percentages or scores shown
- [ ] Language is warm and affirming

---

#### **P1-2.3: DecisionSummaryCard (Parent)**

**Problem:** Parent doesn't see child's scenario choices  
**Solution:**
```
Create `/src/components/parent/DecisionSummaryCard.tsx`
- Props: { decisions: ScenarioDecision[] }
- Render: Card list showing "Day X: You chose [X]. Why it mattered: [consequence]"
- Integration: Add to /parent/child/$childId page
```

**Files Changed:**
- New: `src/components/parent/DecisionSummaryCard.tsx`
- Modified: `src/routes/parent/child.$childId.tsx` (add decision summary section)

**Data Required:**
- Scenario decisions from child progress (need to surface from scenario state)
- Decision consequence text (available in scenario definition)

**Risk:** Medium (need to surface scenario decisions through progress data)  
**Acceptance Criteria:**
- [ ] Parent page shows 2-3 key decisions child made
- [ ] Displays: "Day X: You chose [X]"
- [ ] Includes: Why it mattered (consequence summary)
- [ ] Doesn't expose raw decision data (interpreted for parent)

---

#### **P1-2.4: ConversationStarterWidget (Parent)**

**Problem:** Parent doesn't know what to talk about  
**Solution:**
```
Create `/src/components/parent/ConversationStarterWidget.tsx`
- Props: { competencies, recentLessons }
- Render: 2-3 conversation starters based on what child just learned
- Use existing conversationStarters from snapshot
- Integration: Add to /parent/child/$childId page
```

**Files Changed:**
- New: `src/components/parent/ConversationStarterWidget.tsx`
- Modified: `src/routes/parent/child.$childId.tsx` (add conversation starters section)

**Data Required:**
- snapshot.conversationStarters (already computed)
- Most recent lesson/scenario completed

**Risk:** Low (reusing existing data)  
**Acceptance Criteria:**
- [ ] Shows 2-3 conversation starters
- [ ] Starters are relevant to recently completed content
- [ ] Language is actionable: "Ask your child…"
- [ ] Includes specific activity suggestion

---

## 17. BACKEND/DATA DEPENDENCY MATRIX (RECAP)

**Zero backend changes required for P0.**

All P0 features use existing data:
- Track metadata: stage, chapterTitle (visible in track.sequence)
- Journey state: dayNumber, savedCedis (computed in snapshot)
- Scenario consequence: narrative text (in scenario definition)
- Assessment: pre/post scores (stored as events)

P1 features also don't require backend changes (reuse existing functions + data surfacing).

P2 features might require:
- Wallet history: Would need to store intermediate wallet states
- Undo/replay: Would need scenario engine to support branching without state destruction
- Time tracking: Would need timestamps on events

---

## 18. SECURITY BOUNDARY PRESERVATION

### Existing Security Model

- **Child isolation:** Each child's data visible only via their authenticated session
- **Parent/child linking:** Family relationship in Firestore; parent can see only their children
- **Facilitator access:** Facilitators see aggregated data only (no individual child decisions)
- **Admin access:** Admins can view (not modify) any child's progress (for support)
- **Assessment authorization:** Child can only access assessments when unlocked by journey progress
- **Scenario authorization:** Child can only access scenarios when unlocked (pauseBefore constraint)

### Proposed UX Changes: Impact Assessment

| Change | Requires Auth Change? | Requires RLS Change? | Security Risk? |
|--------|---|---|---|
| Display chapter/day to child | No | No | None |
| Display goal progress to child | No | No | None |
| Display wallet in scenario to child | No | No | None (child already sees wallet in game state) |
| Show consequences to child | No | No | None (child authored choice) |
| Show decisions to parent | No | No | None (parent already sees child data) |
| Show competencies to parent | No | No | None (parent already sees metrics) |
| Parent sees real-time "currently on" | No | No | None (computed from snapshots, no new data exposed) |

**Conclusion:** No security boundary changes needed. All proposed UX changes work within existing model.

---

## 19. UNRESOLVED QUESTIONS & ASSUMPTIONS

### Questions Remaining

1. **Wallet Starting Amount**
   - Assumption: GH₵50 (from scenario intro)
   - Question: Is this enforced in code, or just narrative?
   - Impact: Goal widget needs to show starting amount vs. earned

2. **Competency Scoring**
   - Assumption: Questions scored as binary (right/wrong)
   - Question: Can partial credit exist (e.g., 0-5 scale per question)?
   - Impact: Growth comparison relies on scoring accuracy

3. **Scenario Replay**
   - Assumption: Once completed, scenario isn't replayed (linear progression)
   - Question: Can child restart a scenario to try alternate path?
   - Impact: Affects "undo" feature feasibility (P2)

4. **Post-Assessment Timing**
   - Assumption: Post-assessment available only after ALL activities done
   - Question: Can child take post-assessment early if they wish?
   - Impact: When should NextStepCard show "Take Final Challenge"?

5. **Chapter Badges**
   - Assumption: 5 chapter-specific badges exist (one per chapter)
   - Question: Are chapter badges defined in current gamification engine?
   - Impact: Affects celebration messaging

6. **Time Tracking**
   - Assumption: Timestamps not currently recorded on activities
   - Question: Should we add timestamps for "You spent X min on this lesson"?
   - Impact: P2 feature, needs event model extension

### Assumptions Made (Verify Before Coding)

1. **Track data is source of truth for journey sequence**
   - ✅ Verified: `src/content/tracks/save.ts` matches code
   
2. **Snapshot computation is stable**
   - ✅ Verified: `src/lib/progress/snapshot.ts` shows mature logic
   
3. **Scenario consequence data exists in definition**
   - ✅ Verified: `school-reopening.ts` has consequence object
   
4. **14-day structure is intentional, not vestigial**
   - ✅ Verified: goal.daysTotal, chapterTitle fields suggest deliberate design
   
5. **Parent can access child's progress data**
   - ✅ Verified: `/parent/child/$childId` route exists, RLS allows it
   
6. **XP reward sum = money earned**
   - ⚠️ Assumption: savedCedis = sum of reward values
   - Question: Is this intentional mapping, or coincidence?
   - Need to verify: Does each scenario node grant XP = GH₵ amount?

---

## CONCLUSION & NEXT STEPS

### What Was Verified from Code

✅ 24-item journey sequence (pre-assess → 12 lessons → 5 scenarios → post-assess + bonus)  
✅ 14-day story arc is genuinely encoded (goal.daysTotal, chapterTitle fields)  
✅ Scenario consequence narrative framework exists in data model  
✅ Progress snapshot tracks day progression and goal completion  
✅ Component library is consistent and extensible  
✅ Security boundaries are solid (no changes needed)  

### What Is Proposed

✅ 5 P0 components (ChapterBanner, GoalWidget, NextStepCard, ConsequenceCard, LearningObjectiveBadge)  
✅ 5 P1 components (CelebrationToast, competency comparison, parent decision/conversation widgets)  
✅ 3-sprint implementation roadmap  
✅ Zero backend changes required  

### What Remains Uncertain

⚠️ Whether XP reward values map to GH₵ amounts (needs verification)  
⚠️ Chapter-specific badge definitions (might not exist yet)  
⚠️ Whether scenario replay/undo is supported by engine  
⚠️ Post-assessment availability constraints (early access?)  

### Recommended Action

**Before coding Phase 3:**
1. Verify XP-to-cedis mapping with product team
2. Confirm chapter badge definitions exist or need creation
3. Test scenario replay capability (browse ScenarioPlayer code)
4. Clarify post-assessment unlock rules

**Then proceed with P0 implementation:** ChapterBanner → GoalWidget → NextStepCard → ConsequenceCard → LearningObjective

---

**Status:** Specification Complete | Ready for Implementation Phase | No Code Changes Made

