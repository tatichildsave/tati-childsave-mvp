# PHASE H0.2: TATI MVP PRODUCT BLUEPRINT & EXPERIENCE ARCHITECTURE

**Status:** EVIDENCE-BASED PRODUCT DEFINITION (READ-ONLY AUDIT)  
**Date:** Phase H0.2 Discovery  
**Scope:** Definitive MVP product architecture and screen inventory  
**Output:** Blueprint for Phase H frontend implementation  

---

## EXECUTIVE SUMMARY

### TATI MVP is ONE Ecosystem with FOUR Connected Experiences

TATI is designed as a **single learning system with four role-based experiences**, not four separate applications.

```
                         ┌──────────────────┐
                         │  TATI ADMIN      │
                         │  OPERATIONS      │
                         └────────┬─────────┘
                                  │
                  operates, measures, deploys
                                  │
                         ┌────────▼─────────┐
                         │ TATI ACADEMY     │
                         │ Facilitator/     │
                         │ Teacher          │
                         └────────┬─────────┘
                                  │
                    delivers programme content
                                  │
                         ┌────────▼─────────┐
                         │  TATI JUNIOR     │
                         │  Child/Learner   │
                         └────────┬─────────┘
                                  │
                  learns, decides, experiences consequences
                                  │
                         ┌────────▼─────────┐
                         │  TATI PARENT     │
                         │  Family/Home     │
                         │  Reinforcement   │
                         └──────────────────┘
```

### MVP Scope (Not Determined by What Exists)

| Experience | Purpose | Current Status | MVP Priority |
|------------|---------|-----------------|--------------|
| **JUNIOR** | Child learns through decisions | 85% implemented | P0 (polish needed) |
| **ACADEMY** | Facilitator delivers programme | 0% (zero frontend) | P0 (must exist) |
| **PARENT** | Home reinforcement + visibility | 75% implemented | P0 (insights needed) |
| **ADMIN** | Operate + measure pilot | 0% (zero frontend) | P1 (needed) |

### Critical Finding

✅ **Backend ready:** Firebase schema, Firestore rules, role system all support four experiences  
❌ **Frontend gaps:** Academy (P0) and Admin (P1) have zero routes, zero components  
⚠️ **Content minimal:** Only 1 scenario, 1 assessment—pilot needs richer content  
⚠️ **Parent insights:** Feedback form exists; recommendation engine missing

### Product Hypothesis Being Tested

> Can a connected learning ecosystem work where children learn independently, facilitators deliver in schools, parents reinforce at home, and operations measure the whole system?

---

## SECTION 1: CURRENT PRODUCT INVENTORY

### Technology Foundation (Do Not Modify)

**Backend:**
- ✅ Supabase PostgreSQL (primary database)
- ✅ Firebase Firestore (parallel family/child data)
- ✅ Firebase Auth (child identity mapping)
- ✅ Supabase Auth (parent email + Google OAuth)
- ✅ Scenario engine (deterministic, pure functions)
- ✅ Assessment engine (scoring logic)
- ✅ G5.1 integrity verification (server-side validation)
- ✅ G6.1 error recovery (save feedback, retry, answer preservation)

**Frontend:**
- ✅ TanStack React Router (file-based routing)
- ✅ Tailwind CSS (styling)
- ✅ React Query (state management)
- ✅ 8 TATI custom components (Avatar, Badge, Button, Card, Layout, Progress, States)
- ✅ 40+ shadcn/ui base components (available)

### Protected Systems (Immutable)

These must not be modified during Phase H:
- ❌ Firebase authentication
- ❌ Firestore security rules and role system
- ❌ Supabase RLS policies
- ❌ Scenario engine and state machine
- ❌ Assessment scoring logic
- ❌ G5.1 verification
- ❌ G6.1 error recovery
- ❌ Database schema (unless schema gaps identified)

### Routes Inventory (31 Total)

#### Public Routes (5)
```
GET  /                     Landing page
GET  /login               Parent login form
GET  /signup              Parent signup form
GET  /onboarding          Parent family + child setup
GET  /auth                Auth boundary (redirects to /login)
```

#### Junior Experience Routes (10) ✅
```
GET  /child               Child route group
GET  /child/login         Child TATI ID + PIN login
GET  /child/home          Child home dashboard
GET  /child/learn         Learning journey overview
GET  /child/assessment/:id Assessment (pre/post test)
GET  /child/lesson/:id    Lesson content
GET  /child/scenario/:id  Scenario (decision story)
GET  /child/reflection/:id Post-scenario reflection
GET  /child/progress      Achievement dashboard
GET  /child/results       Track completion results
```

**Status:** ✅ Implemented (85% functional)

#### Parent Experience Routes (5) ✅
```
GET  /parent              Parent dashboard
GET  /parent/child/:id    Individual child view
GET  /parent/feedback     Feedback form
GET  /parent/feedback-review Feedback history
GET  /parent/metrics      Analytics dashboard
```

**Status:** ✅ Implemented (75% functional)

#### Academy Experience Routes (0) ❌
```
MISSING: /academy/* (All facilitator routes)
```

**Status:** ❌ NOT IMPLEMENTED (0%)  
**Priority:** P0 (blocking pilot)

#### Admin Experience Routes (0) ❌
```
MISSING: /admin/* (All administrative routes)
```

**Status:** ❌ NOT IMPLEMENTED (0%)  
**Priority:** P1 (needed for pilot operations)

#### Legacy Routes (10)
```
/_authenticated/dashboard
/_authenticated/learn/$childId/assessment/$assessmentId
/_authenticated/learn/$childId/feedback
/_authenticated/learn/$childId/lesson/$lessonId
/_authenticated/learn/$childId/reflection/$reflectionId
/_authenticated/learn/$childId/scenario/$scenarioId
/_authenticated/learn/$childId/summary
/_authenticated/route
[and related parent routes]
```

**Status:** ⚠️ Appears to duplicate `/child/*` routes  
**Recommendation:** Audit for consolidation in H1

### Content Inventory (Minimal)

#### Current Content
```
Tracks:      1 (SAVE — Junior, ages 8–12)
Scenarios:   1 (School Reopening Challenge, 14-day story)
Assessments: 1 (Save Pre-Assessment, 5 questions)
Lessons:     ~3-4 (meet-your-money, set-a-goal, needs-vs-wants, stop-think-choose, borrow-and-lend, money-safety, where-to-save)
Reflections: ~14 (post-scenario reflections)
```

#### Track Structure: SAVE
**Tier:** Junior (ages 8–12)  
**Setting:** Ghana (GHS currency)  
**Goal:** GH₵80 (school bag purchase)  
**Duration:** 14-day story  
**Narrative:** "The School Reopening Challenge"  

**Sequence:**
1. Pre-assessment (5 questions, no grading)
2. Lesson: Meet Your Money (currency introduction)
3. Lesson: Set a Goal (target-setting)
4. Scenario CH1: Plan and Earn (Days 1–2, pause before "needs-vs-wants")
5. Lesson: Needs vs. Wants
6. Lesson: Stop-Think-Choose (decision framework)
7. Scenario CH2: Market Day (Day 4, pause before reflection)
8. Reflection: What Was Loudest?
9. Lesson: Borrow and Lend (framework for lending)
10. Lesson: Money Safety (security/protection)
11. Scenario CH3: Friends and Money (Days 6–7)
12. Reflection: How Did That Feel?
13. [More scenarios/lessons for remaining days]
14. Post-assessment
15. Results + Achievement

#### Scenario Engine Details

**School Reopening Challenge:**
- **ID:** kwame-request
- **Chapters:** 3 (divided across 14 days)
- **Story nodes:** ~26 nodes (branching structure)
- **Illustration assets:** 6 PNG scenes
- **Decisions:** Each node presents 2–4 choices
- **Consequences:** Money changes (visible), narrative explanation, competency scores (hidden)
- **Branching:** Paths diverge based on decisions (affects which scenarios trigger)

**Scenario State Tracked:**
- Available money (pocket, GH₵)
- Saved money (protected, GH₵)
- Goal target (GH₵80)
- Day progress (1–14)
- Competency scores (8 types)
- Decision log (complete history)
- Scheduled events (future consequences)

#### Assessment Engine

**Save Pre-Assessment:**
- **Type:** Pre-test (no grading shown to child)
- **Format:** 5 scenario-based multiple-choice questions
- **Topics:** Spending decisions, saving awareness, sharing, earning attitude, money safety
- **Scoring:** Hidden competency attribution
- **Results:** Badges/unlock, not grades

---

## SECTION 2: AUTHENTICATION & AUTHORIZATION ARCHITECTURE

### Current Authentication Methods

#### Child Authentication ✅
**Method:** TATI ID + PIN (custom, non-federated)  
**Session:** Opaque bearer token in `child_sessions` table  
**Duration:** Short-lived (expires_at tracked)  
**Validation:** SHA-256 token digest (raw token returned once)  
**Backend:** Hashed PIN in `child_credentials`  
**Routes:** Protected via session validation in routes

**Flow:**
```
Child enters TATI ID (e.g., TATI-ABC12345)
      ↓
Child enters PIN (4-digit)
      ↓
Server validates PIN hash
      ↓
Session token issued
      ↓
Token stored in cookie (TATI_CHILD_SESSION)
      ↓
Child can access /child/* routes
      ↓
Token expires after inactivity
```

#### Parent Authentication ✅
**Method:** Supabase Auth (email/password + Google OAuth)  
**Session:** Supabase session token (JWT)  
**Duration:** Long-lived (refreshes on activity)  
**OAuth:** Google Sign-In available  
**Routes:** Protected via Supabase auth check

**Flow:**
```
Parent enters email + password (or clicks Google)
      ↓
Supabase Auth validates
      ↓
JWT session token issued
      ↓
Parent can access /parent/* routes
      ↓
Parent family auto-created on first login
      ↓
Children linked to family
```

### Role System (Backend Ready, Frontend TBD)

**Database:** `user_roles` table  
**Roles:** parent, child, facilitator, admin  
**Assignment:** Server-side only (no client-side self-promotion)

**Role Capabilities (Defined in Firestore Rules):**

| Role | Can Read | Can Create | Can Update | Can Delete |
|------|----------|-----------|------------|-----------|
| **parent** | Own family, own children | New child (in family) | Own child data | Own child |
| **child** | Own progress, assessments | Progress events | None | None |
| **facilitator** | Assigned cohort data | Progress for cohort | Progress for cohort | None |
| **admin** | All data | Any data | Any data | Any data |

**Firestore Functions (Already Implemented):**
- `isAdmin()` — checks admin role
- `isFamilyAdult()` — checks parent/guardian role
- `isAssignedFacilitator()` — checks facilitator assignment to child
- `canAccessChild()` — composite: family adult OR assigned facilitator OR admin

### Missing Authentication Flows

#### Facilitator Authentication ❌
**Current:** Not implemented  
**Required for:** Academy experience  
**Needed:** Email/password or school SSO  
**Backend support:** Role defined, Firestore rules ready  

#### Admin Authentication ❌
**Current:** Not implemented  
**Required for:** Admin experience  
**Needed:** Trusted admin-only credentials  
**Backend support:** Role defined, Firestore rules ready  

---

## SECTION 3: TATI JUNIOR EXPERIENCE (LEARNER)

### Purpose
Help children (ages 8–12) learn financial concepts through decision-making in realistic scenarios, with visible consequences and supportive reflection.

### User Type
**Primary:** Child, ages 8–12 (Ghana context)  
**Secondary:** Facilitator/teacher (delivers within school context)

### Target Outcomes
- Understands money concepts (saving, earning, spending, safety)
- Makes money decisions and experiences consequences
- Reflects on decisions (no pass/fail framing)
- Progresses through curriculum at own pace
- Earns achievements and competency development

### Complete Journey (School Reopening Challenge)

```
ENTRY
├─ /child/login (TATI ID + PIN)
│  └─ Authenticate child
│
├─ /child/home (Home dashboard)
│  ├─ Show: Child name, avatar, XP/achievement
│  ├─ Show: Current track name + goal
│  ├─ Show: Next activity (lesson/scenario/assessment)
│  ├─ Show: Progress bar (GH₵ saved vs. goal)
│  └─ Navigation: Learn, Progress, Logout
│
├─ /child/learn (Learning journey)
│  ├─ Show: Full track sequence (all 15+ activities)
│  ├─ Status: Completed (✓), Current (▶), Locked (🔒)
│  │
│  ├─→ ASSESSMENT (Pre-test)
│  │   └─ /child/assessment/save-pre
│  │      ├─ Intro (5 min, "Check-in", no grading language)
│  │      ├─ Questions 1–5 (scenario-based, 4 options each)
│  │      ├─ Scoring (competencies calculated, not shown)
│  │      ├─ Results (badge, profile unlock, "Let's go!")
│  │      └─ Error recovery (G6.1): Answers preserved, retry available
│  │
│  ├─→ LESSON (Interactive learning)
│  │   └─ /child/lesson/:id
│  │      ├─ Title + introduction
│  │      ├─ Media/illustrations
│  │      ├─ Content explanation
│  │      ├─ Practice interaction (simple quiz, sort activity, etc.)
│  │      └─ "Ready for the next step?" button
│  │
│  ├─→ SCENARIO (14-day branching story)
│  │   └─ /child/scenario/kwame-request--ch1
│  │      ├─ Intro screen
│  │      │  ├─ Scene illustration
│  │      │  ├─ Story context ("School reopens in 14 days...")
│  │      │  ├─ Starting capital (GH₵50)
│  │      │  ├─ Goal (GH₵80 school bag)
│  │      │  └─ "Start Day 1" button
│  │      │
│  │      ├─ Story node (e.g., "Plan the Money")
│  │      │  ├─ Scene (illustration + caption)
│  │      │  ├─ Story text (situation)
│  │      │  ├─ Question ("How much goes into the savings box?")
│  │      │  ├─ Choices (3–4 options with descriptions)
│  │      │  │  ├─ "Put GH₵40 in the box" (icon: 🎯)
│  │      │  │  ├─ "Put GH₵30 in the box" (icon: ⚖️)
│  │      │  │  └─ "Put GH₵20 in the box" (icon: 👛)
│  │      │  └─ Money meter shows pocket/savings
│  │      │
│  │      ├─ Decision → Consequence
│  │      │  ├─ Money changes visible (GH₵40 → savings box)
│  │      │  ├─ Headline ("A strong start with a thin pocket")
│  │      │  ├─ Narrative ("Your goal is already halfway...")
│  │      │  ├─ Ledger note ("GH₵40 → savings box")
│  │      │  └─ Competency scores (hidden)
│  │      │
│  │      ├─ Day progression (visual bar: 1/14 → 2/14)
│  │      ├─ Error recovery (G6.1): Save feedback, retry, no data loss
│  │      └─ Chapter pause (optional multi-node chapter)
│  │
│  ├─→ REFLECTION (Thinking prompt)
│  │   └─ /child/reflection/:id
│  │      ├─ Headline (consequence summary)
│  │      ├─ Reflection prompt ("What was loudest in your head?")
│  │      ├─ Suggestion (open-ended, no right answer)
│  │      └─ "Continue to next step" button
│  │
│  └─→ COMPLETION
│      ├─ /child/results (Track finale)
│      │  ├─ Achievement headline ("School Bag Target Reached!")
│      │  ├─ Final results (GH₵ saved vs. goal, e.g., "You saved GH₵82!")
│      │  ├─ Badge unlock ("TATI Junior Super Saver 🌟")
│      │  ├─ Competency summary (8 skills, growth shown)
│      │  ├─ Decision review ("You made 26 money decisions")
│      │  ├─ Next track offer (if exists)
│      │  └─ Celebration (confetti, sound, animation)
│      │
│      └─ /child/progress (Achievement dashboard)
│         ├─ Badges earned (all 14 possible badges?)
│         ├─ Competency levels (8 skills, with icons)
│         ├─ Days completed (14/14)
│         └─ "Ready for SPEND track?" (next progression)
```

### Visual/UX Principles

**For children aged 8–12:**
- ✅ Simple, encouraging language (no banking jargon)
- ✅ Visual progress (money meter, day counter, badges)
- ✅ Emojis/illustrations for visual interest
- ✅ Clear choice descriptions (not abstract)
- ✅ Immediate feedback (money changes visible right away)
- ✅ No pass/fail framing (all choices valid)
- ✅ Celebration on achievement
- ✅ Mobile-first (touch-friendly buttons)

**What NOT to do:**
- ❌ Grades or scoring language
- ❌ Complex financial terminology
- ❌ Shame-based messaging ("bad decision")
- ❌ Overwhelming information density
- ❌ Long text blocks without breaks

### Components Used

**Current:**
- Page, PageHeader (layout)
- Card (content container)
- Button (primary CTA, choice buttons)
- Badge (achievement display)
- Progress bar (GH₵ savings vs. goal)
- States (loading, error, empty)

**Available but underused:**
- CelebrationOverlay (achievement celebration)
- SkillBars (competency visualization)
- AnimatedNumber (XP/money animation)

### Completion Criteria for Phase H

✅ **Functional Core Implemented**  
⚠️ **Visual needs polish:**
- Better scenario scene presentation
- Character illustration/personality
- Money visualization (before/after ledger)
- Celebration flow integration
- Loading state polish

⚠️ **Content needs expansion:**
- Additional scenarios (SPEND, GIVE, INVEST tracks)
- More lessons (10+ topics)
- More assessments (post-test, concept quizzes)
- Branching path visualization

---

## SECTION 4: TATI ACADEMY EXPERIENCE (FACILITATOR) ❌ MISSING

### Purpose
Enable teachers/facilitators to deliver TATI curriculum in schools/communities with clarity, support, and progress monitoring.

### User Type
**Primary:** Facilitator (teacher, community leader, volunteer)  
**Context:** School class or community group (cohort of 15–40 learners)

### Entry Points
**Before Academy:**
1. Admin or school administrator provisions facilitator account
2. Assigns facilitator to school
3. Creates class/cohort
4. Adds learners to cohort

**Facilitator then:**
1. Logs into /academy/login (email or school SSO)
2. Accesses /academy (home)
3. Selects /academy/school (assigned school)
4. Selects /academy/cohort/:id (class/group)
5. Accesses today's lesson

### Three Critical Question Sets

#### BEFORE CLASS
Facilitator needs to know:
- ❓ Which cohort am I teaching today?
- ❓ What's the objective for today's session (lesson/scenario)?
- ❓ How long should this take?
- ❓ What materials/resources do I need?
- ❓ What discussion prompts should I use?
- ❓ What previous context do I need? (prior decisions, outcomes)

#### DURING CLASS
Facilitator needs to:
- ▶️ Launch the scenario for the cohort
- ▶️ Monitor which learners have started/finished
- ▶️ See real-time decisions being made
- ▶️ Access discussion prompts/talking points
- ▶️ Optionally facilitate whole-class discussion
- ▶️ Take attendance/note participation
- ▶️ Handle technical issues

#### AFTER CLASS
Facilitator needs to:
- 📊 Review class outcomes (decisions made, patterns)
- 📊 Identify learners who struggled/need support
- 📊 Understand what competencies were developed
- 📊 Note what to discuss next session
- 📧 Communicate with parents (optional)
- 📝 Archive session for record-keeping

### Complete Academy Journey

```
/academy/login (Facilitator SSO or email)
│
├─→ /academy (Academy home)
│   ├─ School name + welcome
│   ├─ Cohorts managed by facilitator
│   ├─ Quick stats (total learners, completion %)
│   └─ Link: "View today's session"
│
├─→ /academy/cohort/:id (Class/cohort view)
│   ├─ Cohort name + grade
│   ├─ Learner roster (15–40 names)
│   │  ├─ Status (active, completed, absent)
│   │  ├─ Progress in track (% complete)
│   │  └─ Quick link to learner detail
│   ├─ Session history (completed dates)
│   └─ Link: "Start today's session"
│
├─→ /academy/session/:sessionId (Today's preparation)
│   ├─ TODAY'S SESSION HEADER
│   │  ├─ Lesson objective
│   │  ├─ Duration (e.g., 45 min)
│   │  ├─ Content type (Lesson / Scenario / Assessment)
│   │  └─ Status: "Ready to start"
│   │
│   ├─ FACILITATOR RESOURCES
│   │  ├─ Lesson plan (objectives, steps)
│   │  ├─ Discussion prompts (5–10 questions)
│   │  ├─ Talking points ("If a child says X, respond with Y")
│   │  ├─ Connection to workbook (page refs)
│   │  ├─ Home activity (optional tie-in)
│   │  └─ Download/print buttons
│   │
│   ├─ SCENARIO-SPECIFIC (if scenario today)
│   │  ├─ Story summary (what learners will do)
│   │  ├─ Key decisions (expected choice points)
│   │  ├─ Discussion debrief plan
│   │  └─ Common misconceptions to address
│   │
│   └─ "LAUNCH SESSION" button
│       ↓
│   /academy/session/:sessionId/live (Live monitoring)
│   ├─ COHORT PROGRESS BAR
│   │  ├─ Learners started / learners total
│   │  ├─ Real-time updates as children log in
│   │  └─ Estimated finish time
│   │
│   ├─ LEARNER LIST (Live)
│   │  ├─ Name, status (not started / in progress / completed)
│   │  ├─ Current node/day (e.g., "Day 3")
│   │  ├─ Optional: click for learner detail mid-session
│   │  └─ Attendance tracking
│   │
│   ├─ FACILITATOR GUIDANCE
│   │  ├─ Current focus (what learners are deciding)
│   │  ├─ Suggested prompt ("Ask learners why they chose to save GH₵30")
│   │  └─ Timer (optional: count down session time)
│   │
│   └─ Session ends when all/most learners complete
│
├─→ /academy/cohort/:id/results (Session debrief)
│   ├─ SESSION SUMMARY
│   │  ├─ Date, duration, attendance
│   │  ├─ Completion stats (% completed)
│   │  ├─ Key decisions (heatmap: most common choices)
│   │  └─ Competency gains (which skills developed)
│   │
│   ├─ LEARNER-BY-LEARNER VIEW
│   │  ├─ Each child's path through scenario
│   │  ├─ Decisions made (with outcomes)
│   │  ├─ Competency scores (hidden from child)
│   │  └─ Flag: at-risk learners (stuck, no progress)
│   │
│   ├─ DISCUSSION SUMMARY (If facilitated)
│   │  ├─ What learners discussed
│   │  ├─ Common themes/misconceptions
│   │  └─ Suggested follow-ups
│   │
│   └─ NEXT SESSION PREP
│       ├─ Recommended intervention for struggling learners
│       ├─ Home activity for parents
│       └─ Link to next lesson
│
└─→ /academy/learner/:learnerId (Individual learner view)
    ├─ Learner name, TATI ID, age
    ├─ Progress in track (completed activities)
    ├─ Competency development (8 skills, growth trajectory)
    ├─ Decision history (all scenarios played)
    ├─ Assessment results (pre/post scores, if shown)
    ├─ Notes (facilitator observations)
    └─ Alert (if at-risk or exceptional performance)
```

### Backend Ready / Frontend Missing

**What's ready in backend:**
- ✅ Facilitator role defined in `user_roles` table
- ✅ Firestore rules allow facilitator access to assigned cohort
- ✅ Facilitator can create/update progress for cohort
- ✅ Schema supports cohort-to-learner relationships (inferred)

**What's missing:**
- ❌ Facilitator authentication (login)
- ❌ School entity / facilitator assignment
- ❌ Cohort entity / learner assignment
- ❌ Session entity (groups learners for one lesson date)
- ❌ All Academy routes
- ❌ All Academy components
- ❌ Facilitator resource system

### MVP Scope for Academy (Pilot Essential)

**MUST HAVE:**
- Facilitator login
- View assigned school/cohort
- View learner roster
- Understand today's session (objective + resources)
- Monitor session (live learner status)
- See post-session results (who completed, what decisions)
- See learner-by-learner progress
- Access discussion prompts

**SHOULD HAVE:**
- Print lesson plans
- At-risk learner alerts
- Home activity suggestions
- Learner note-taking
- Session archiving

**CAN WAIT:**
- Complex analytics
- Assessment result review (deep analysis)
- Automated interventions
- Advanced reporting

---

## SECTION 5: TATI PARENT EXPERIENCE (FAMILY REINFORCEMENT)

### Purpose
Help parents understand what their child is learning and provide simple, actionable ways to reinforce learning at home (without replacing facilitator).

### User Type
**Primary:** Parent/guardian of child aged 8–12  
**Context:** Home, after child has engaged with Junior or Academy

### Key Design Constraint

Parents should feel:
> "I know what my child is learning. I can have simple conversations to support it. I don't need to become a financial literacy educator."

NOT:
> "I have access to all child's data. I need to review analytics."

### Parent Onboarding

```
/login (Email or Google OAuth)
  ↓
/onboarding (Parent first-time setup)
  ├─ Welcome to TATI
  ├─ Create family (family name, optional)
  ├─ Add first child
  │  ├─ Child name
  │  ├─ Age
  │  └─ Avatar selection
  ├─ "Family created! Your child's TATI ID is TATI-ABC12345"
  └─ Link to child login instructions
```

### Complete Parent Journey

```
/login (Authentication)
  ↓
/parent (Parent dashboard)
├─ Welcome message ("Welcome back, [Parent name]!")
├─ Quick stats
│  ├─ Total children
│  ├─ Total challenges active
│  └─ Aggregate progress
├─ Child cards (one per child)
│  ├─ Name + avatar
│  ├─ Current track (e.g., "SAVE")
│  ├─ Progress bar (GH₵ saved vs. goal)
│  ├─ Latest activity ("Playing Day 4 of School Reopening")
│  └─ "View details" link
├─ "Add another child" button
└─ Quick links (Feedback, Metrics, Help)
│
├─→ /parent/child/:childId (Individual child view)
│   ├─ CHILD PROGRESS SECTION
│   │  ├─ Name, avatar, age
│   │  ├─ Track name ("Save for School Bag Challenge")
│   │  ├─ Progress bar
│   │  │  ├─ GH₵ saved: GH₵45 of GH₵80 goal
│   │  │  ├─ Days completed: 7 of 14
│   │  │  └─ Estimated completion: "5 more days"
│   │  └─ "What's happening in the story right now?"
│   │     └─ Current day/scenario (plain language summary)
│   │
│   ├─ COMPETENCIES DEVELOPING
│   │  ├─ "Skills your child is practicing:"
│   │  ├─ List (with icons)
│   │  │  ├─ 💾 Saving (★★★☆☆ = strong)
│   │  │  ├─ 💰 Earning (★★☆☆☆ = growing)
│   │  │  ├─ 🧺 Needs vs. Wants (★★★★☆ = very strong)
│   │  │  ├─ 🤝 Lending (★★☆☆☆ = emerging)
│   │  │  └─ [6 more competencies]
│   │  └─ "Click to see conversation starters"
│   │
│   ├─ RECENT DECISIONS (Last 5 choices)
│   │  ├─ "Decisions your child made this week:"
│   │  ├─ Choice 1: "Saved GH₵30 instead of spending on snacks"
│   │  │  └─ "This shows they're thinking about their goal."
│   │  ├─ Choice 2: "Lent GH₵5 to a friend"
│   │  │  └─ "They're learning about helping others while protecting savings."
│   │  └─ Choice 5: "Bought an exercise book (GH₵3) for school"
│   │     └─ "They know school supplies are important."
│   │
│   ├─ BADGES EARNED
│   │  ├─ "Achievements unlocked:"
│   │  ├─ 🌟 Super Saver (reached midpoint)
│   │  ├─ 💡 Wise Spender (made thoughtful choice)
│   │  └─ [More badges as earned]
│   │
│   └─ HOME CONVERSATION STARTERS (Auto-generated)
│      ├─ "Questions to ask this week:"
│      ├─ "Your child is practicing NEEDS vs. WANTS. You could ask:"
│      │  └─ '"In our house, what\'s a need? What\'s a want? Can you give examples?"'
│      ├─ "They\'re thinking about SAVING. Try:"
│      │  └─ '"How much money do you think we should save each month? What for?"'
│      └─ "Quick activity: Grocery Shopping"
│         └─ "Go shopping together. Ask your child which items are needs and which are wants."
│
├─→ /parent/feedback (Feedback form)
│   ├─ "Share observations about [Child name]'s learning"
│   ├─ Text input (open-ended)
│   │  └─ Prompt: "What have you noticed about how your child thinks about money?"
│   ├─ Optional: "Any concerns or questions?"
│   ├─ Submit button
│   └─ "This helps TATI understand how children learn best."
│
├─→ /parent/feedback-review (Feedback history)
│   ├─ Previous feedback entries
│   ├─ Dates
│   └─ "View feedback summary"
│
└─→ /parent/metrics (Quick analytics)
    ├─ "How [Child] is progressing:"
    ├─ Engagement chart (activities per week)
    ├─ Completion chart (progress over time)
    ├─ Badge timeline (when badges earned)
    └─ "Is there anything you're concerned about?"
```

### Visual/UX Principles

**For parents:**
- ✅ Clear progress (not overwhelming with data)
- ✅ Actionable suggestions (specific conversation starters)
- ✅ Celebration (acknowledge child's growth)
- ✅ Simple language (no jargon)
- ✅ Privacy-respectful (child not surveilled)
- ✅ Optional depth (parents can learn more if interested)

### Components Used
- Page, PageHeader (layout)
- Card (child overview, competencies, decisions)
- Badge (achievement display)
- ProgressBar (savings goal visualization)
- States (loading, empty)

### Completion Criteria for Phase H

✅ **Functional dashboard exists**  
⚠️ **Needs enhancement:**
- Better conversation starters (more personalized)
- Trend visualization (showing improvement over time)
- Home activity suggestions (content tie-in)
- Achievement celebration (can parent congratulate child in app?)
- Alert system (if child is stuck/at-risk)
- Recommendation engine (based on child's decision patterns)

---

## SECTION 6: TATI ADMIN EXPERIENCE (OPERATIONS) ❌ MISSING

### Purpose
Enable TATI programme team to operate the pilot at scale: manage schools, facilitators, learners, assign content, monitor health, and generate reports.

### User Type
**Primary:** TATI programme/operations staff  
**Context:** Pilot programme management (5–10 schools, 50–500 learners)

### Admin MVP (Pilot Scope Only)

Do NOT build enterprise CMS. Build only what's needed to operate pilot.

```
/admin/login (Trusted admin-only)
  ↓
/admin (Admin home)
├─ PILOT OVERVIEW
│  ├─ Total schools: 5
│  ├─ Total cohorts: 12
│  ├─ Total learners: 237
│  ├─ Total facilitators: 15
│  ├─ Completion rate: 68%
│  └─ Errors/issues: 3 (with links)
│
├─ /admin/schools (School management)
│  ├─ Create school
│  │  ├─ School name
│  │  ├─ District/region
│  │  ├─ Contact person
│  │  ├─ School code (for facilitator self-provisioning?)
│  │  └─ Status (active, paused, completed)
│  │
│  ├─ View schools list
│  │  ├─ School name, location
│  │  ├─ Cohorts in school
│  │  ├─ Facilitators assigned
│  │  ├─ Learner count
│  │  └─ Quick link to details
│  │
│  └─ School detail
│     ├─ Overview
│     ├─ Assigned facilitators
│     ├─ Active cohorts
│     └─ Progress overview
│
├─ /admin/facilitators (Facilitator management)
│  ├─ Create facilitator account
│  │  ├─ Email
│  │  ├─ Name
│  │  ├─ School assignment
│  │  ├─ Temporary password
│  │  └─ Send invite email
│  │
│  ├─ Facilitator list
│  │  ├─ Name, email
│  │  ├─ School
│  │  ├─ Assigned cohorts
│  │  ├─ Learner count
│  │  └─ Activity (last login)
│  │
│  └─ Facilitator detail
│     ├─ Profile
│     ├─ Assigned school(s)
│     ├─ Cohort roster
│     └─ Session history
│
├─ /admin/cohorts (Cohort/class management)
│  ├─ Create cohort
│  │  ├─ Cohort name (e.g., "Class 4B")
│  │  ├─ School
│  │  ├─ Facilitator assignment
│  │  ├─ Grade/age range
│  │  ├─ Start date
│  │  └─ Expected end date
│  │
│  ├─ Cohort list
│  │  ├─ Name, school, facilitator
│  │  ├─ Learner count
│  │  ├─ Track assigned
│  │  ├─ Progress
│  │  └─ Status
│  │
│  └─ Cohort detail
│     ├─ Learner roster
│     ├─ Session history
│     └─ Group progress
│
├─ /admin/learners (Learner management)
│  ├─ Add learner (to cohort)
│  │  ├─ Child name
│  │  ├─ Age
│  │  ├─ Cohort assignment
│  │  ├─ Generate TATI ID + PIN
│  │  └─ Print learner card
│  │
│  ├─ Learner list (search by school/cohort)
│  │  ├─ Name, TATI ID, age
│  │  ├─ Cohort, school
│  │  ├─ Progress (track completion %)
│  │  ├─ Status (active, completed, absent)
│  │  └─ Quick link to learner detail
│  │
│  └─ Learner detail
│     ├─ Profile (name, TATI ID, age)
│     ├─ Family link (parent email, if provided)
│     ├─ Progress (track, days, GH₵ saved)
│     ├─ Competencies
│     ├─ Decision history
│     └─ Assessment results
│
├─ /admin/content (Content management)
│  ├─ Tracks available
│  │  ├─ SAVE (default)
│  │  ├─ SPEND (status: coming soon)
│  │  ├─ GIVE (status: coming soon)
│  │  └─ INVEST (status: coming soon)
│  │
│  ├─ Assign track to cohort
│  │  ├─ Select cohort
│  │  └─ Enable track (default: SAVE)
│  │
│  └─ Future: Deploy new content (scenarios, lessons, assessments)
│     └─ [Deferred to Phase 2]
│
├─ /admin/monitoring (Pilot health)
│  ├─ Error rates (failed saves, timeouts)
│  ├─ Engagement metrics
│  ├─ Completion trends
│  ├─ At-risk learners (not progressing)
│  └─ System health (uptime, performance)
│
└─ /admin/support (Issues/feedback)
    ├─ Bug reports
    ├─ User feedback
    ├─ Facilitator requests
    └─ Generate basic report
```

### Backend Ready / Frontend Missing

**What's ready:**
- ✅ Admin role defined
- ✅ Firestore rules allow admin universal access

**What's missing:**
- ❌ Admin authentication
- ❌ School/cohort/facilitator data model (schema may need clarification)
- ❌ All Admin routes
- ❌ All Admin components

### MVP Scope for Admin

**MUST HAVE (Pilot Operations):**
- Admin login
- Create school
- Create facilitator account
- Create cohort
- Add learners to cohort
- View all learners + progress
- Basic error monitoring

**SHOULD HAVE:**
- Generate learner cards (TATI ID + PIN for printing)
- Basic health dashboard
- Issue tracking

**CAN WAIT:**
- Advanced analytics
- Content deployment UI
- Enterprise reporting
- Automated alerts

---

## SECTION 7: DATA & INFORMATION FLOWS

### Information Hierarchy

```
TATI ADMIN
│
├─ Creates Schools
│  │
│  ├─ Assigns Facilitators to Schools
│  │  │
│  │  └─ Creates Cohorts (Classes)
│  │     │
│  │     └─ Assigns Learners to Cohorts
│  │        │
│  │        └─ [Learner uses Junior]
│  │           │
│  │           └─ Generates Progress Events
│  │              │
│  │              ├─ Visible to Facilitator (class + learner level)
│  │              │
│  │              └─ Visible to Parent (child level only)
│  │
│  └─ Monitors Overall Progress
│
[Parallel]
Parent
├─ Creates Family
├─ Adds Child to Family
└─ Views Child Progress (if child in school cohort, sees Academy context)
```

### Data Ownership & Access

| Data | Owner | Can Read | Can Write | Notes |
|------|-------|----------|-----------|-------|
| **Child profile** | Family | Parent, Facilitator, Admin | Family (self-service), Admin | Facilitator read for cohort |
| **Progress events** | Child | Parent, Facilitator (assigned), Admin | Server (never client) | G6.1 error recovery via server |
| **Assessment results** | Child | Parent, Facilitator, Admin | Server | Scores per assessment, hidden from child |
| **Scenario state** | Child | Parent, Facilitator, Admin | Server | Decision history, state machine |
| **Decisions** | Child | Parent (implied), Facilitator, Admin | Server | Cannot be modified after made |
| **Competency scores** | Child | Parent, Facilitator, Admin | Server | Hidden from child (education principle) |
| **Parent feedback** | Parent | Admin, facilitator (optional) | Parent (own) | For learning, not surveillance |
| **School** | Admin | Admin, facilitators assigned, parents (view) | Admin | Location, metadata |
| **Cohort** | Facilitator | Facilitator, admin | Admin, facilitator (limited) | Class info, learner list |
| **Family** | Parent | Parent, facilitator (optional), admin | Parent | Family name, members |

### Privacy Guardrails

**Child data is NOT:**
- ❌ Shown to other children
- ❌ Shown to other families
- ❌ Shown to facilitators outside assigned cohort
- ❌ Exposed in parent analytics (high-level only)

**Parent data is:**
- ✅ Private to own child viewing
- ✅ Shared with facilitator (in cohort context)
- ✅ Shared with admin (for support)

**Facilitator data:**
- ✅ Can see cohort progress (class-level aggregate)
- ✅ Can see learner-by-learner (in cohort only)
- ❌ Cannot see other cohorts' data
- ❌ Cannot see parent contact info (optional)

---

## SECTION 8: MVP CONTENT ARCHITECTURE

### Current Content (Minimal)

| Element | Count | Status | MVP Sufficiency |
|---------|-------|--------|-----------------|
| Tracks | 1 | Live | Minimal (need SPEND, GIVE by Phase 2) |
| Scenarios | 1 | Live | Minimum viable (14-day story works) |
| Assessments | 1 | Live | Minimum (need post-test, concept quizzes) |
| Lessons | ~7 | Partial | Needs media enrichment |
| Reflections | ~14 | Live | OK (scenario-specific) |

### Track Hierarchy

**JUNIOR TIER (Ages 8–12):**

```
Track 1: SAVE
├─ Scenario: School Reopening Challenge (14 days)
│  ├─ Goal: GH₵80 school bag
│  ├─ Starting capital: GH₵50
│  ├─ Competencies: saving, earning, needs-vs-wants, lending, safety, resilience
│  └─ Status: ✅ Complete
│
├─ Lessons: ~7
│  ├─ Meet Your Money (currency intro)
│  ├─ Set a Goal (target-setting)
│  ├─ Needs vs. Wants (distinction)
│  ├─ Stop-Think-Choose (decision framework)
│  ├─ Borrow and Lend (lending safety)
│  ├─ Money Safety (protection from loss/theft)
│  └─ Where to Save (options: box, bank, parent, etc.)
│
└─ Assessments: 1
   └─ Pre-test (5 questions, scenario-based)
      ├─ No grading language
      ├─ Competency attribution (hidden)
      └─ Achievement unlock

Track 2: SPEND (Deferred to Phase 2)
├─ Scenario: [To be designed]
├─ Theme: Thoughtful spending decisions
└─ Duration: ~10–14 days

Track 3: GIVE (Deferred to Phase 3)
├─ Scenario: [To be designed]
├─ Theme: Generosity, community, values
└─ Duration: ~10–14 days

Track 4: INVEST (Deferred to Phase 3+)
├─ Scenario: [To be designed]
├─ Theme: Growing money over time
└─ Duration: Variable
```

### Scenario Design Principles

Each scenario should:
- ✅ Be set in Ghana (culturally grounded)
- ✅ Feature relatable characters (family, friends, marketplace)
- ✅ Present 2–4 choices per decision point
- ✅ Show immediate money consequences (visible)
- ✅ Hide competency scoring
- ✅ Include delayed events (consequences on later days)
- ✅ Branch based on decision history
- ✅ Have a natural narrative ending
- ✅ Support 10–20 minute play sessions

### Assessment Design Principles

Each assessment should:
- ✅ Use scenario-based questions (not abstract)
- ✅ Have no grading language shown to child
- ✅ Attribute competencies (not grades)
- ✅ Be completable in 5 min (pre) or 10 min (post)
- ✅ Unlock achievements, not shame

### Workbook Connection

The TATI workbook (physical) should:
- Link to each scenario (workbook page references)
- Provide pre-session reflection
- Capture child decisions on paper
- Offer post-session activities
- Include family conversation starters
- Serve as permanent learning record

**Example integration:**
```
Digital: Play School Reopening Day 1
   ↓
Workbook: "What did you choose to do with GH₵50?" (record)
   ↓
Workbook: "Ask your parent: How do they decide what to save?" (home activity)
   ↓
Digital: Play Day 2
   ↓
Workbook: Reflect on Day 1 outcome
```

### MVP Content Requirements

**MUST HAVE for pilot:**
- ✅ School Reopening scenario (complete)
- ✅ Pre-assessment (question bank + UI)
- ✅ ~7 lessons (media poor, text-based OK for MVP)
- ✅ Workbook integration (page references)

**SHOULD HAVE for pilot:**
- Post-test assessment
- Richer lesson media (illustrations, interactions)
- Home activities (per lesson)

**CAN WAIT:**
- Multiple scenarios (SPEND, GIVE)
- Advanced branching
- Gamification (leaderboards, etc.)

---

## SECTION 9: PILOT OPERATING MODEL

### How a Real Pilot Would Work (Month 1)

**WEEK 0: Setup**
```
TATI Admin
├─ Creates schools (5 schools identified)
├─ Creates facilitator accounts
│  └─ Sends email invites with temporary passwords
├─ Creates cohorts (12 classes, 20–25 learners each)
└─ Generates learner TATI IDs + PINs
   └─ Prints learner cards for distribution
```

**WEEK 1: Facilitator Onboarding**
```
Facilitators
├─ Receive email invitation
├─ Log into Academy (/academy/login)
├─ Reset password
├─ View assigned cohorts
└─ Review Week 1 lesson resources
   ├─ Facilitator guide
   ├─ Discussion prompts
   ├─ Workbook pages
   └─ Troubleshooting FAQs
```

**WEEK 1–2: Learner Onboarding**
```
Facilitator in class
├─ Distributes learner TATI IDs
├─ Shows children how to login (/child/login)
├─ Explains the TATI programme
└─ Facilitates first activity (usually lesson)

Child at home
├─ Receives TATI ID card from school
├─ Logs in on first available device
├─ Completes onboarding (/onboarding)
│  └─ Picks avatar, confirms name
├─ Plays pre-assessment (/child/assessment/save-pre)
└─ Starts first scenario or lesson
```

**WEEK 2–6: Regular Programme**
```
Facilitator (before class)
├─ Logs into Academy
├─ Reviews today's session (/academy/session/:id)
├─ Checks learner progress from prior sessions
└─ Prints discussion prompts

Facilitator (during class)
├─ Launches scenario for cohort (/academy/session/live)
├─ Monitors learners logging in
├─ Facilitates discussion during scenario play
└─ Takes notes on learners' decisions

Facilitator (after class)
├─ Reviews class outcomes (/academy/cohort/results)
├─ Identifies struggling learners
├─ Plans next session

Parent (any time)
├─ Logs into Parent dashboard (/parent)
├─ Sees child progress
├─ Reads conversation starters
├─ Provides feedback (optional)
```

**WEEK 6–8: Completion**
```
Child
├─ Completes School Reopening Challenge
├─ Reaches GH₵80 goal
├─ Unlocks badge
└─ Views results (/child/results)

Facilitator
├─ Reviews class completion rates
├─ Identifies gaps (who didn't finish)
├─ Plans interventions or next track
└─ Gathers feedback from children/parents

Admin
├─ Monitors pilot progress
├─ Reviews completion rates and error logs
├─ Gathers facilitator feedback
└─ Plans next cohort or iteration
```

### Success Metrics (What Admin Monitors)

| Metric | Target | Alert if |
|--------|--------|----------|
| **Learner completion** | 80%+ complete track | < 60% |
| **Facilitator adoption** | 100% schools using Academy | Any school hasn't logged in for 2 weeks |
| **Parent engagement** | 50%+ parents view dashboard | < 30% |
| **Error rate** | < 1% save failures | > 2% |
| **Session duration** | 30–45 min per scenario | Consistently > 60 min |
| **Learner retention** | No dropoff mid-track | > 10% abandon before Day 7 |

---

## SECTION 10: MVP BOUNDARIES

### IN MVP

**Experiences:**
- ✅ TATI Junior (child learning)
- ✅ TATI Academy (facilitator delivery)
- ✅ TATI Parent (family reinforcement)
- ✅ TATI Admin (pilot operations)

**Content:**
- ✅ SAVE track (1 complete)
- ✅ School Reopening scenario (14-day story)
- ✅ Pre-assessment (5 questions)
- ✅ ~7 lessons
- ✅ Workbook connection (page refs)

**Features:**
- ✅ Child TATI ID + PIN login
- ✅ Parent email + Google OAuth
- ✅ Facilitator role (SSO)
- ✅ Admin role (trusted)
- ✅ Cohort-based delivery
- ✅ Progress tracking
- ✅ Competency development
- ✅ Error recovery (G6.1)
- ✅ Scenario integrity (G5.1)
- ✅ Family isolation (RLS)

### OUT OF MVP (Deferred)

**Experiences:**
- ❌ TEEN experience (ages 13–18)
- ❌ PLUS experience (parent-led financial literacy)
- ❌ Teacher professional development
- ❌ Government reporting/compliance

**Content:**
- ❌ SPEND, GIVE, INVEST tracks
- ❌ Multiple scenarios per track
- ❌ Advanced lessons (budgeting, investing, debt)
- ❌ Workbook (separate product)
- ❌ Parent education content

**Features:**
- ❌ Social/multiplayer (leaderboards, competition)
- ❌ Complex gamification (streaks, achievements beyond badges)
- ❌ Mobile Money integration
- ❌ Advanced reporting/analytics
- ❌ AI-driven recommendations (phase 2+)
- ❌ Offline app mode
- ❌ SMS/WhatsApp integration

### Explicitly Deferred: TEEN

**Why not in MVP:**
- Requires separate content (different scenarios, topics)
- Requires separate visual design (more mature)
- Pilot is focused on Junior (ages 8–12)
- Resource constraints

**When to revisit:**
- Phase H6+ (after Junior proven)
- Based on pilot learnings
- Only if demand justifies

**Architecture note:**
- System designed to support multiple tiers
- Tier selection logic can be added later
- No changes needed to core engine

---

## SECTION 11: PROTECTED TECHNICAL SYSTEMS

### DO NOT MODIFY (Immutable Foundations)

#### Authentication Layer
- ❌ Supabase Auth (parent email + Google)
- ❌ Child TATI ID + PIN (custom)
- ❌ Session management
- ❌ Token validation
- ❌ Firebase Auth integration (for child identity mapping)

#### Authorization Layer
- ❌ Firestore security rules (entire file)
- ❌ Supabase RLS policies
- ❌ Family isolation logic
- ❌ Role-based access control (parent, child, facilitator, admin)
- ❌ `canAccessChild()`, `isFamilyAdult()`, `isAssignedFacilitator()` functions

#### Core Business Logic
- ❌ Scenario engine (state machine, branching)
- ❌ Assessment scoring
- ❌ Competency attribution
- ❌ Decision consequences (money changes)
- ❌ G5.1 scenario output verification
- ❌ G6.1 error recovery (save feedback, retry, answer preservation)

#### Data Layer
- ❌ Firestore schema (collections, documents)
- ❌ Supabase schema (tables, columns)
- ❌ Database relationships
- ❌ Server functions that persist data
- ❌ RLS policies

### CAN Modify (Frontend Scope)

#### Routes & Components
- ✅ Component styling (colors, spacing, typography)
- ✅ Component layout (arrangement)
- ✅ Routes (add new, modify visual)
- ✅ Navigation structure
- ✅ Error UI (but not error recovery logic)
- ✅ Loading states
- ✅ Empty states

#### Content
- ✅ Lesson text/media
- ✅ Scenario narratives (not engine logic)
- ✅ Assessment questions (not scoring logic)
- ✅ Discussion prompts
- ✅ Home activities
- ✅ Facilitator resources

#### Theme
- ✅ Colors (CSS variables)
- ✅ Typography
- ✅ Spacing scale
- ✅ Border radius
- ✅ Component variations (dark mode, etc.)

---

## SECTION 12: DESIGN LANGUAGE (No Design Direction Found)

### Search Results

**Stitch Files:** NOT FOUND in repository  
**Lovable Prompts:** Not archived in codebase  
**Design Tokens:** Partially documented in src/lib/theme.ts  
**Previous Design Specs:** No previous H0-H8 planning docs found  

### Existing Design System (Reconstruction from Code)

**Type Hierarchy:**
```
Page titles:     28px, extrabold, leading-tight
Section titles:  18px, extrabold
Body:            16px, normal, leading-relaxed
Muted:           16px, muted-foreground
Caption:         14px, muted-foreground
```

**Spacing:**
```
Container:       max-w-md (mobile), sm:max-w-xl (tablet), lg:max-w-3xl (desktop)
Section gap:     space-y-4 (1rem = 16px)
Tap target:      min-h-[48px], min-w-[48px]
```

**Radius:**
```
Cards:           rounded-3xl (24px)
Controls:        rounded-2xl (16px)
Pills:           rounded-full
```

**Colors (Inferred from Tailwind + CSS vars):**
```
Primary:         teal/green
Success:         green
Warning:         yellow/orange
Danger:          red
Neutral:         gray
Soft variants:   light background + colored text
Solid variants:  colored background + white text
```

**Components:**
```
Avatar:          Circular, colored background, initials or icon
Badge:           Pill-shaped, semantic tone, optional icon
Button:          48px height, rounded-2xl, semantic tone
Card:            rounded-3xl, p-5 padding, shadow
Progress bar:    Horizontal, percentage-based, semantic tone
```

### Intended Design Principles (Reconstructed)

**For JUNIOR:**
- Playful, encouraging
- Age-appropriate (8–12)
- Emojis + illustrations
- Clear money visualization
- No shame/grades
- Mobile-first

**For ACADEMY:**
- Professional, clear
- Facilitator-focused (not child-like)
- Actionable information
- Resource-rich
- Session-oriented

**For PARENT:**
- Warm, supportive
- Simple information (not data-heavy)
- Conversation-focused
- Action-oriented
- Family-centric

**For ADMIN:**
- Functional, efficient
- Admin-oriented (not learner-facing)
- Data visibility
- Operational focus

### No Design Redesign Attempted

This phase does NOT define a new visual direction. Phase H1 will do that.

This section documents what exists and the inferred principles.

---

## SECTION 13: FRONTEND IMPLEMENTATION ROADMAP

### Evidence-Based Sequencing

NOT based on assumed H1–H8 order, but on actual dependencies and MVP requirements.

#### Phase H1: Foundation & Design System (2–3 weeks)
**Blocker for:** Everything else  
**Deliverables:**
1. Design System Documentation
   - Color palette (with hex values)
   - Typography scale
   - Spacing system
   - Component library
   - Accessibility guidelines
   - Responsive breakpoints

2. Design Direction (New Visual Brief)
   - Brand personality for each experience
   - Visual principles
   - Component variations
   - Mobile/responsive strategy

3. Route Consolidation
   - Merge duplicate routes (/_authenticated vs /child)
   - Clean architecture

4. Component Library
   - Storybook or similar
   - Existing 8 TATI components documented
   - 40+ shadcn components catalogued
   - Usage patterns

**Why first:** All downstream work depends on consistent foundation

---

#### Phase H2: Junior Polish (2–3 weeks)
**Blocker for:** Academy, content depth  
**Deliverables:**
1. Visual Enhancement
   - Home dashboard redesign
   - Scenario player polish
   - Assessment UI refinement
   - Lesson templates

2. Animation & Interaction
   - Loading states
   - Error states (keep G6.1 logic)
   - Transitions
   - Celebration flows (integrate CelebrationOverlay)

3. Mobile Optimization
   - Sticky action buttons
   - Tall tap targets
   - Landscape support
   - Performance

4. Accessibility Baseline
   - Contrast audit
   - Keyboard navigation
   - Screen reader testing
   - Focus indicators

**Why here:** Child experience must be solid before adding Academy/Parent refinement

---

#### Phase H3: Academy Foundation (2–3 weeks)
**Blocker for:** Facilitator use  
**Priority:** P0 (pilot cannot run without)  
**Deliverables:**
1. Facilitator Authentication
   - Login flow (/academy/login)
   - Email/password or SSO
   - Session management

2. Academy Home & Cohort View
   - /academy (dashboard)
   - /academy/cohort/:id (class roster)
   - Cohort progress overview

3. Today's Session Preparation
   - /academy/session/:id (lesson resources)
   - Facilitator guide display
   - Discussion prompts
   - Workbook references

4. Live Session Monitoring
   - /academy/session/live (real-time learner status)
   - Learner list + current node
   - Facilitator guidance

**Backend requirement:** Cohort/facilitator schema must be ready

---

#### Phase H4: Content & Results (2–3 weeks)
**Blocker for:** Completion experience  
**Deliverables:**
1. Lesson Content Enrichment
   - Interactive lesson templates
   - Illustration/media integration
   - Practice activities

2. Post-Test Assessment
   - Assessment questions beyond pre-test
   - Competency feedback display
   - Question variety

3. Results & Completion
   - Track completion screen (/child/results)
   - Badge presentation
   - Next track offer
   - Celebration animation

4. Progress Visualization
   - Enhanced progress page
   - Branching path visualization
   - Competency growth charts

---

#### Phase H5: Parent Experience Enhancement (2 weeks)
**Blocker for:** Home reinforcement  
**Deliverables:**
1. Parent Dashboard Polish
   - Better visual hierarchy
   - Enhanced child cards
   - Quick actions

2. Insights & Recommendations
   - Trend analysis (showing improvement)
   - Personalized conversation starters
   - Home activity suggestions

3. Engagement Features
   - Parent celebration/messaging
   - At-risk learner alerts
   - Parent feedback integration

4. Analytics Clarity
   - Simplified metrics dashboard
   - Engagement visualization

---

#### Phase H6: Academy Completion & Admin Foundation (3 weeks)
**Blocker for:** Facilitator advanced use, admin operations  
**Deliverables:**
1. Academy Session Results
   - /academy/cohort/results (session debrief)
   - Learner-by-learner outcomes
   - Decision heatmaps

2. Learner Management
   - /academy/learner/:id (individual view)
   - Competency growth
   - Decision history
   - Notes/observations

3. Admin Authentication & Dashboard
   - /admin/login (trusted)
   - /admin (overview)
   - Pilot health monitoring

4. Basic Admin Management
   - School management (/admin/schools)
   - Facilitator provisioning (/admin/facilitators)
   - Cohort creation (/admin/cohorts)
   - Learner assignment (/admin/learners)

---

#### Phase H7: Admin Advanced & Cross-Role Integration (2–3 weeks)
**Deliverables:**
1. Content & Programme Management
   - Track assignment
   - Content deployment UI
   - Future scenario/lesson management

2. Reporting & Analytics (Admin)
   - Pilot health dashboard
   - Completion rates
   - Error logs
   - Issue tracking

3. Cross-Role Visibility
   - Admin sees all roles' data
   - Facilitator sees cohort + learner
   - Parent sees child only
   - Child sees own progress

---

#### Phase H8: Accessibility, Mobile, & Polish (2 weeks)
**Deliverables:**
1. WCAG AA Compliance
   - Contrast audit + fixes
   - Keyboard navigation comprehensive test
   - Screen reader testing
   - Focus indicator refinement

2. Cross-Device Optimization
   - Tablet layout refinement
   - Landscape mode support
   - Performance optimization
   - Responsive images

3. User Research Integration
   - Real pilot feedback
   - Bug fixes from pilot
   - UX adjustments

---

### Implementation Dependencies

```
H1: Foundation (2–3 weeks)
  ↓
├─→ H2: Junior (2–3 weeks)
├─→ H3: Academy (2–3 weeks)
└─→ H4: Content (2–3 weeks)
  ↓
  ├─→ H5: Parent (2 weeks)
  └─→ H6: Admin (3 weeks)
  ↓
  ├─→ H7: Integration (2–3 weeks)
  └─→ H8: Polish (2 weeks)

Total: 10–14 weeks for complete MVP
Pilot ready: After H2 + H3 (~5–6 weeks)
```

---

## SECTION 14: RISK ASSESSMENT

### Product Risks

#### P0 (Critical)

| Risk | Impact | Mitigation |
|------|--------|-----------|
| **Academy not built by pilot start** | Cannot deliver in schools; pilot fails | Prioritize H3; authorize backend prep immediately |
| **Only 1 scenario** | Limited learning variety | Content team prepares SPEND track (Phase 2) |
| **Child privacy breach** | Legal, trust damage | Maintain RLS enforcement; audit access logs |
| **Scenario integrity broken** | Invalid results, pilot data unusable | Keep G5.1 verification; add integration tests |

#### P1 (High)

| Risk | Impact | Mitigation |
|------|--------|-----------|
| **Mobile experience breaks** | School use fails (children use phones/tablets) | Comprehensive mobile testing in H8 |
| **Parent engagement low** | No home reinforcement | Design conversation starters carefully (H5) |
| **Facilitator confusion** | Academy misused, poor class experience | Excellent facilitator onboarding; clear resources (H3) |
| **Accessibility issues** | Children with disabilities excluded | WCAG AA audit (H8) |

### Technical Risks

#### P0

| Risk | Impact | Mitigation |
|------|--------|-----------|
| **Firestore quota exceeded** | System down; pilot halted | Monitor usage; optimize queries |
| **Authentication downtime** | Children/facilitators locked out | Fallback plan; emergency reset procedure |
| **Backend schema mismatch** | Cohort/facilitator logic fails | Verify schema before H3 |

#### P1

| Risk | Impact | Mitigation |
|------|--------|-----------|
| **Save failures spike** | Children lose progress; frustration | G6.1 error recovery; monitoring alerts |
| **Performance degrades** | Slow UI; children abandon | Performance testing; optimization budget |

### Content Risks

#### P1

| Risk | Impact | Mitigation |
|------|--------|-----------|
| **Scenario not engaging** | Children don't finish; low completion | Pilot test School Reopening; gather feedback |
| **Lesson content too hard** | Children confused; facilitators overwhelmed | Readability testing; age-appropriate language |
| **Workbook not integrated** | Digital-physical experience feels disjointed | Reference workbook pages in digital (H3+) |

### Operational Risks

#### P1

| Risk | Impact | Mitigation |
|------|--------|-----------|
| **Facilitators struggle with Academy** | Poor facilitation; low quality | Comprehensive guide + support channel |
| **Schools exceed class size** | System performance/UX breaks at 40+ learners | Test cohort size; optimize if needed |
| **Admin tools missing** | Operations bottleneck | Prioritize admin core (H6) |

### Child Safety Risks

#### P0 (Critical)

| Risk | Impact | Mitigation |
|------|--------|-----------|
| **Unvetted facilitator/inappropriate access** | Child harm | Admin must vet facilitators before provisioning |
| **Child data exposed** | Privacy violation | RLS enforcement; regular audit |
| **Child identity stolen (TATI ID + PIN leaked)** | Unauthorized scenario play | Educate on PIN security; session expiry |

#### P1

| Risk | Impact | Mitigation |
|------|--------|-----------|
| **Inappropriate scenario content** | Offense, harm | Content review by educators; cultural testing |
| **Bullying via platform** | Psychological harm | No social features in MVP; blocks if added later |

---

## SECTION 15: H1 ENTRY CRITERIA

Before moving forward to Phase H implementation:

### Backend Readiness
- ✅ Firestore rules tested and verified (already done)
- ✅ Scenario engine stable (already done)
- ⚠️ **Clarify:** Cohort/facilitator schema in Firestore
- ⚠️ **Confirm:** Admin authentication method (email/password? Firestore-only?)
- ✅ School/cohort/facilitator/learner relationships documented

### Product Agreement
- ✅ Four-experience MVP model approved
- ✅ TEEN explicitly deferred
- ✅ Content architecture (SAVE only for pilot) approved
- ✅ Pilot operating model defined

### Resource Allocation
- ✅ Design lead assigned
- ✅ Frontend engineers allocated (recommend 2–3)
- ✅ Backend team available for schema/API questions
- ✅ Content team ready (Phase 2+)
- ✅ Timeline: 10–14 weeks for full H phases; 5–6 weeks to pilot readiness

### Design Direction
- ✅ Existing design system documented
- ⚠️ **Required:** New visual direction defined (brand, component variations, responsive strategy)

### Testing Plan
- ✅ Unit tests for routes/components
- ✅ Integration tests for auth/data flows
- ✅ E2E tests for user journeys (child, facilitator, parent, admin)
- ✅ Mobile testing (360px, 375px, 414px)
- ✅ Accessibility audit (WCAG AA target)
- ✅ Pilot user testing (real facilitators + children)

---

## SECTION 16: FINAL RECOMMENDATION

### TATI MVP Definition

#### What Is TATI?
TATI is a **connected learning ecosystem** that teaches financial literacy to children (ages 8–12) through decision-making in realistic scenarios, supported by facilitators in schools and parents at home, operated and measured by TATI administration.

#### Problem Solved
"Can we create a system where children learn by making real money decisions, facilitators can deliver the programme at scale, parents understand what's being learned, and the programme can be operated and measured?"

#### Four Experiences
1. **TATI JUNIOR** — Child learns through scenarios and makes money decisions
2. **TATI ACADEMY** — Facilitator delivers the programme in schools
3. **TATI PARENT** — Parent understands child's learning and reinforces at home
4. **TATI ADMIN** — TATI operations manages schools, facilitators, learners, and pilots

#### Minimum Complete Learning Journey
```
Child logs in → Takes pre-assessment → Completes lessons → Plays scenario (makes decisions)
→ Experiences consequences → Reflects → Progresses through 14-day story → Reaches goal →
Completes track → Earns badges → Parent receives insights → Facilitator monitors class
→ Admin measures pilot outcomes
```

#### What Must Be Ready Before Pilot
1. ✅ Junior experience functional (85% done, needs polish)
2. ❌ Academy experience complete (0% done, P0 priority)
3. ✅ Parent experience functional (75% done, needs insights)
4. ✅ SAVE track content (1 scenario, pre-test, lessons)
5. ✅ Backend authentication + authorization (done)
6. ✅ Error recovery (G6.1)
7. ✅ Scenario integrity (G5.1)
8. ✅ Mobile responsiveness

#### What Can Wait Until After Pilot
1. ❌ TEEN experience (separate tier)
2. ⚠️ Additional tracks (SPEND, GIVE, INVEST)
3. ⚠️ Advanced gamification
4. ⚠️ Complex analytics
5. ⚠️ AI recommendations

#### What Is Explicitly Deferred
- **TEEN experience** — Document as Phase H6+ future work; do NOT include in H1–H5

---

## NEXT STEP: AUTHORIZATION

This blueprint is complete and evidence-based. Awaiting authorization to proceed to Phase H implementation.

**If approved:**
1. Authorize Phase H1 (Foundation & Design System)
2. Confirm backend readiness for Academy
3. Allocate design + frontend resources
4. Schedule timeline

**If changes required:**
Identify gaps and update blueprint before proceeding.

---

**End of PHASE_H0_2_TATI_MVP_PRODUCT_BLUEPRINT.md**

Phase H0.2 Complete. Product architecture locked. Ready for Phase H authorization.
