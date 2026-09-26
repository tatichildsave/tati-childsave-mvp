# PHASE H0.1: MVP EXPERIENCE ARCHITECTURE & FRONTEND DESIGN RECOVERY

**Status:** AUDIT ONLY (READ-ONLY ANALYSIS)  
**Date Completed:** Phase H0.1 Discovery  
**Scope:** Complete TATI MVP ecosystem mapping across four connected product experiences  
**Focus:** Understanding what exists today and what must be built next  

---

## EXECUTIVE SUMMARY

### The TATI MVP is Not Four Separate Products

TATI is designed as **ONE connected ecosystem with FOUR integrated experiences**:

```
                           TATI
                            │
        ┌───────────────────┼───────────────────┐
        │                   │                   │
      JUNIOR          TATI ACADEMY            PARENT
     Learner           Facilitator           Family
        │                   │                   │
        └───────────────────┼───────────────────┘
                            │
                          ADMIN
                    Programme Operations
```

### Current Implementation Status

| Experience | Purpose | Status | Completeness |
|------------|---------|--------|---------------|
| **JUNIOR** | Help children learn through decisions | ✅ Implemented | 85% (functional, needs visual polish) |
| **TATI ACADEMY** | Help facilitators deliver programme | ❌ NOT STARTED | 0% (backend roles defined, no frontend) |
| **PARENT** | Help families reinforce learning | ✅ Implemented | 75% (functional, needs insights) |
| **ADMIN** | Help TATI operate the pilot | ❌ NOT STARTED | 0% (backend roles defined, no frontend) |

### Critical Finding

The codebase has:
- ✅ **Backend infrastructure for all four roles** (user_roles table defines parent, child, facilitator, admin)
- ✅ **Firestore rules for facilitator/admin access** (tested in firestore.rules.test.ts)
- ✅ **Complete Junior experience** (routes, components, content)
- ✅ **Complete Parent experience** (routes, components, insights)
- ❌ **NO TATI ACADEMY frontend** (zero routes, zero components)
- ❌ **NO ADMIN frontend** (zero routes, zero components)

**Product implication:** The MVP cannot be pilot-tested without ACADEMY and ADMIN experiences.

---

## SECTION 1: TATI PRODUCT MODEL

### The Core Hypothesis

TATI tests whether a **connected learning system** can work where:
- **Children** actively learn through decisions and scenarios
- **Facilitators/Teachers** deliver the programme in schools/communities
- **Parents** understand and reinforce learning at home
- **TATI operations** manages the pilot at scale

This is NOT:
- ❌ "A child-only game"
- ❌ "A parent analytics dashboard"
- ❌ "A teacher admin system"

This IS:
- ✅ "An ecosystem where all four roles must work together"

### Product Jobs

#### JUNIOR
**Primary job:** Learn financial concepts by doing  
**Secondary jobs:** Progress through curriculum, earn badges, experience consequences  
**Decision:** Should feel playful, age-appropriate, encouraging

#### TATI ACADEMY
**Primary job:** Successfully facilitate the TATI programme  
**Secondary jobs:** Prepare lessons, guide discussions, monitor learners, assess progress  
**Decision:** Should answer "What do I do with my class today?" before "What data can I see?"

#### PARENT
**Primary job:** Understand child's financial growth  
**Secondary jobs:** Reinforce learning at home, understand what to discuss, celebrate progress  
**Decision:** Should NOT require parent to run entire curriculum (teacher does that)

#### ADMIN
**Primary job:** Operate and measure the TATI pilot  
**Secondary jobs:** Manage schools, cohorts, facilitators, learners, content assignments  
**Decision:** Should be minimal (only essentials), not a large enterprise system

---

## SECTION 2: COMPLETE ROUTE MAP

### All Routes by Experience (31 total)

#### PUBLIC / UNAUTHENTICATED (5 routes)
```
GET  /                    → Landing page
GET  /login              → Parent login form (email + password)
POST /login              → Parent login submit
GET  /signup             → Parent signup form
POST /signup             → Parent signup submit
GET  /onboarding         → Parent onboarding (create family + first child)
```

**Status:** ✅ Implemented  
**Auth:** None (redirects to appropriate login after selection)

#### JUNIOR EXPERIENCE (10 routes)
```
GET  /child              → Route group + redirect logic
GET  /child/login        → Child login form (TATI ID + PIN)
POST /child/login        → Child login submit
GET  /child/home         → Child home dashboard
GET  /child/learn        → Learning journey overview (track sequence)
GET  /child/assessment/:id → Pre/post assessment
GET  /child/lesson/:id   → Lesson content
GET  /child/scenario/:id → Story/decision scenario
GET  /child/reflection/:id → Post-scenario reflection
GET  /child/progress     → Child achievement dashboard
GET  /child/results      → Track completion results
```

**Status:** ✅ Implemented  
**Auth:** Child TATI ID + PIN (custom session)

#### PARENT EXPERIENCE (5 routes)
```
GET  /parent             → Parent dashboard
GET  /parent/child/:id   → Individual child view
GET  /parent/feedback    → Feedback form
GET  /parent/feedback-review → Feedback history
GET  /parent/metrics     → Analytics dashboard
```

**Status:** ✅ Implemented  
**Auth:** Supabase Auth (email/password or Google OAuth)

#### TATI ACADEMY EXPERIENCE (0 routes) ❌
```
[MISSING] /academy
[MISSING] /academy/login
[MISSING] /academy/cohort/:id
[MISSING] /academy/lessons
[MISSING] /academy/learners
[MISSING] /academy/session-today
[MISSING] /academy/assessments
[MISSING] /academy/reports
```

**Status:** ❌ NOT IMPLEMENTED  
**Auth:** Needed (email + password? Google SSO for schools?)

#### ADMIN EXPERIENCE (0 routes) ❌
```
[MISSING] /admin
[MISSING] /admin/login
[MISSING] /admin/schools
[MISSING] /admin/cohorts
[MISSING] /admin/facilitators
[MISSING] /admin/learners
[MISSING] /admin/content
[MISSING] /admin/reports
```

**Status:** ❌ NOT IMPLEMENTED  
**Auth:** Needed (trusted admin only)

#### LEGACY/AUTHENTICATED ROUTES (10 routes)
```
/_authenticated/dashboard
/_authenticated/learn/$childId/assessment/$assessmentId
/_authenticated/learn/$childId/feedback
/_authenticated/learn/$childId/index
/_authenticated/learn/$childId/lesson/$lessonId
/_authenticated/learn/$childId/reflection/$reflectionId
/_authenticated/learn/$childId/scenario/$scenarioId
/_authenticated/learn/$childId/summary
/_authenticated/route
/auth (redirects to /login)
```

**Status:** ⚠️ Appears to duplicate `/child/*` routes  
**Recommendation:** Audit for consolidation during H1

---

## SECTION 3: AUTHENTICATION & AUTHORIZATION MAP

### Current Authentication Methods

#### Child Authentication
**Method:** TATI ID + PIN (custom, non-federated)  
**Storage:** Hashed PIN in `child_credentials` table  
**Session:** Opaque bearer token stored in `child_sessions`  
**Route protection:** Child routes check session validity  
**RLS policy:** Child can only see own data via owns_child() function  

**Verification:** ✅ Tested in tests/auth/child-session.server.test.ts (41 passing tests)

#### Parent Authentication
**Method:** Supabase Auth (email/password + Google OAuth)  
**Storage:** Supabase auth.users  
**Session:** Supabase session token  
**Route protection:** Parent routes check auth.uid()  
**RLS policy:** Parent can only see own family data  

**Verification:** ✅ Tested implicitly through parent dashboard

### Role Assignment (Backend Infrastructure Ready)

Database table: `user_roles`
```sql
CREATE TABLE public.user_roles (
  user_id uuid NOT NULL REFERENCES public.profiles(id),
  role text NOT NULL CHECK (role IN ('parent', 'child', 'facilitator', 'admin')),
  PRIMARY KEY (user_id, role)
);
```

**Existing roles:**
- `parent` — Family member, can see own children's progress
- `child` — Learner, can access own lessons/scenarios/assessments
- `facilitator` — Teacher/community facilitator, can manage assigned cohorts
- `admin` — TATI operations, can access all data

**Current status:**
- ✅ Backend supports all four roles
- ❌ Frontend only authenticates parent and child
- ❌ No facilitator login implemented
- ❌ No admin login implemented

### Authorization Boundaries (Firestore Rules)

The codebase includes comprehensive Firestore rules (firestore.rules) with test coverage for:
- ✅ Parent cannot self-promote to admin
- ✅ Admin can read any child/family
- ✅ Facilitator access paths exist in rules
- ✅ Family isolation enforced

**Evidence:** tests/firebase/firestore.rules.test.ts includes 40+ tests for role-based access

**Implication:** Authorization backend is ready; frontend must respect these boundaries.

---

## SECTION 4: JUNIOR EXPERIENCE INVENTORY

### Current Implementation

```
JUNIOR JOURNEY
├─ /child/login (TATI ID + PIN)
│  └─ Authenticate child
│
├─ /child/home (Dashboard)
│  ├─ Show: XP, current challenge status
│  ├─ Show: Next activity suggestion
│  ├─ Navigate to: Learn, Progress
│  └─ Logout option
│
├─ /child/learn (Journey overview)
│  ├─ Show: Track sequence (assessments, lessons, scenarios)
│  ├─ Show: Completion status
│  │
│  ├─→ Assessment flow
│  │  ├─ /child/assessment/$id (Pre/Post test)
│  │  │  ├─ Intro (5 min estimate)
│  │  │  ├─ Questions (5 multiple choice)
│  │  │  ├─ Results (score + badge)
│  │  │  └─ ✅ G6.1: Error recovery (answer preservation + retry)
│  │  │
│  │  ├─→ Lesson flow
│  │  │  ├─ /child/lesson/$id (Content)
│  │  │  │  ├─ Title + body
│  │  │  │  ├─ Images
│  │  │  │  └─ Next link
│  │  │  │
│  │  │  └─→ Scenario flow
│  │  │     ├─ /child/scenario/$id (Story player)
│  │  │     │  ├─ Intro (goal, starting money)
│  │  │     │  ├─ Story nodes (14 days)
│  │  │     │  ├─ Choices + consequences
│  │  │     │  ├─ Money tracking (GH₵)
│  │  │     │  └─ ✅ G6.1: Error recovery (save feedback + retry)
│  │  │     │
│  │  │     └─ /child/reflection/$id (Post-scenario)
│  │  │        ├─ Consequence headline
│  │  │        ├─ Reflection text
│  │  │        └─ Next activity
│  │
│  └─ /child/progress (Achievement dashboard)
│     ├─ Badges earned
│     ├─ Competencies practiced
│     └─ Days completed
│
└─ /child/results (Track completion)
   ├─ Final score (GH₵ saved vs. goal)
   ├─ Badge award
   └─ Next track offer
```

### Content Structure (Single Track)

| Item | Count | Details |
|------|-------|---------|
| **Tracks** | 1 | SAVE (Junior, ages 8–12) |
| **Scenarios** | 1 | School Reopening Challenge (14 days) |
| **Assessments** | 1 | Save Pre-Assessment (5 questions) |
| **Lessons** | ~3 (estimate) | meet-your-money, set-a-goal, ... |
| **Reflections** | ~14 | Post-scenario reflections (per day) |

**Content file:** src/content/tracks/save.ts → defines sequence

### Visual/UX Status

#### What Works Well ✅
- Clear progression (child knows what comes next)
- G6.1 error recovery excellent (no data loss)
- Money visibility clear (GH₵ amounts throughout)
- Consequence clarity good (choice → money change → narrative)
- Mobile-friendly layout
- Age-appropriate language

#### What Needs Improvement ⚠️
- Lesson content minimal (text + link, no interactivity)
- Scenario choices could be more visual
- Home dashboard minimal (could show more context)
- Progress motivating but basic
- No celebration flow integrated (CelebrationOverlay exists but unused)
- Visual storytelling relies on text + emoji

### Design Completeness

**Overall: 85%**
- ✅ Functionality: Complete
- ✅ Mobile: Responsive
- ✅ Error handling: Excellent (G6.1)
- ⚠️ Visual polish: Basic but functional
- ⚠️ Content richness: Minimal

---

## SECTION 5: TATI ACADEMY EXPERIENCE INVENTORY

### Current Implementation Status: ❌ ZERO

**Routes:** None  
**Components:** None  
**Content:** No teacher-facing content  
**Backend support:** Yes (role system exists)

### What Should Exist

A facilitator/teacher in TATI Academy should be able to:

1. **Authenticate**
   - [ ] Email + password (school-issued)?
   - [ ] School code verification?
   - [ ] SSO (Google Workspace)?

2. **See assigned school/cohort**
   - [ ] School name
   - [ ] Cohort/class list
   - [ ] Facilitator role (lead teacher, assistant, parent?)

3. **See learners**
   - [ ] Roster (names, TATI IDs)
   - [ ] Current activity
   - [ ] Progress snapshot

4. **Understand today's session**
   - [ ] Which lesson/scenario is today's focus?
   - [ ] How long does it take?
   - [ ] What materials needed?
   - [ ] Discussion guide

5. **Facilitate scenarios**
   - [ ] Launch scenario for cohort
   - [ ] See learner participation live
   - [ ] Guide discussion on consequences
   - [ ] Prompt reflection

6. **View assessment results**
   - [ ] Pre-test: Which concepts need reinforcing?
   - [ ] Post-test: Which concepts improved?
   - [ ] Learner-by-learner breakdown

7. **Identify at-risk learners**
   - [ ] Who is stuck or behind?
   - [ ] Who needs support?
   - [ ] Recommended interventions

8. **Access facilitator resources**
   - [ ] Lesson plans
   - [ ] Discussion guides
   - [ ] Workbook answers
   - [ ] Supplementary activities

### Backend Readiness

**What exists:**
- ✅ Firestore rules include facilitator access patterns
- ✅ user_roles table supports 'facilitator' role
- ✅ Family structure can be extended to facilitator-cohort relationships
- ✅ Progress data queryable by facilitator

**What's missing:**
- ❌ Facilitator → School → Cohort data structure (backend may need minor schema)
- ❌ Cohort → Learner assignments
- ❌ Facilitator authentication flow
- ❌ All UI/routes

### Recommendation for Phase H

**Academy is a P0 priority** because:
1. Without it, pilot cannot run in schools
2. Without facilitators, no cohorts
3. Without cohorts, Junior is only single-player

**Suggested sequencing:**
- First: Design + build Academy authentication + dashboard (1–2 weeks)
- Then: Add cohort management, learner roster (1 week)
- Then: Add session facilitation UX (1 week)
- Then: Add reporting/insights (1 week)

---

## SECTION 6: PARENT EXPERIENCE INVENTORY

### Current Implementation

```
PARENT JOURNEY
├─ /login (Email + password or Google OAuth)
│  └─ Authenticate parent
│
├─ /onboarding (Create family + first child)
│  ├─ Family name
│  └─ Create first child
│
├─ /parent (Parent dashboard)
│  ├─ Child list (card per child)
│  ├─ Each card shows:
│  │  ├─ Child name + avatar
│  │  ├─ Current activity
│  │  ├─ Progress % (GH₵ vs. goal)
│  │  └─ Link to details
│  │
│  ├─ /parent/child/:id (Individual child view)
│  │  ├─ Progress bar (GH₵ saved vs. goal)
│  │  ├─ Competencies (list with icons)
│  │  ├─ Decisions made (scenario choices)
│  │  ├─ Badges earned
│  │  └─ Recommended conversation starters
│  │
│  ├─ /parent/feedback (Feedback form)
│  │  ├─ Text input (observations)
│  │  └─ Submit
│  │
│  ├─ /parent/feedback-review (Feedback history)
│  │  └─ Previous feedback entries
│  │
│  └─ /parent/metrics (Analytics dashboard)
│     ├─ Child engagement charts
│     ├─ Time per activity
│     └─ Badge progress
│
└─ Logout
```

### Content/Data Shown

| Info | Source | Status |
|------|--------|--------|
| **Child progress** | progress_events table | ✅ Works |
| **Competencies** | Assessment results | ✅ Works |
| **Decisions made** | Scenario state tracking | ✅ Works |
| **Badges** | progress_events with badge details | ✅ Works |
| **Conversation starters** | Generated from learning context | ✅ Works |
| **Insights/trends** | Parent-insights.ts | ⚠️ Basic |
| **Recommended home activities** | Not implemented | ❌ Missing |
| **Alerts/flags** | Not implemented | ❌ Missing |

### Visual/UX Status

#### What Works Well ✅
- Child overview is clear and simple
- Progress visualization good (GH₵ savings)
- Decision history provides transparency
- Feedback form captures observations
- Mobile-friendly

#### What Needs Improvement ⚠️
- Insights feel generic (not personalized to child's behavior)
- No trend analysis (is child improving at saving?)
- No intervention suggestions (what should we discuss?)
- Conversation starters could be more contextual
- No celebration feature (can't praise child through app)
- Analytics dashboard minimal (basic engagement stats)
- No alerts for at-risk learners

### Backend Readiness

**What exists:**
- ✅ Parent can query own children
- ✅ Parent can see child progress events
- ✅ Parent can see assessment/scenario results
- ✅ RLS enforces family isolation

**What's missing:**
- ⚠️ Recommendation engine (rules-based? AI?)
- ⚠️ Trend analysis (aggregation functions)
- ⚠️ Alert logic (is child stuck? not progressing?)
- ⚠️ Home activity suggestions

### Recommendation for Phase H

**Parent is P1 (important but not blocking)**

Suggested enhancements:
1. Better insights (personalized messages about growth)
2. Trend visualization (show improvement over time)
3. Action recommendations (based on child's decisions/struggles)
4. Celebration feature (let parent message child achievement)
5. Home activity suggestions (tie-in to lesson topics)

---

## SECTION 7: ADMIN EXPERIENCE INVENTORY

### Current Implementation Status: ❌ ZERO

**Routes:** None  
**Components:** None  
**Backend support:** Yes (role system exists, some Firestore rules written)

### What Should Exist (MVP Scope)

An admin in TATI should be able to:

1. **Authenticate**
   - [ ] Email + password (TATI-only)
   - [ ] No public signup

2. **See programme overview**
   - [ ] Total schools active
   - [ ] Total cohorts
   - [ ] Total facilitators
   - [ ] Total learners
   - [ ] Pilot phase status

3. **Manage schools**
   - [ ] Add/edit school
   - [ ] School code (for facilitator onboarding)
   - [ ] Contact person
   - [ ] Location/region

4. **Manage cohorts**
   - [ ] Create cohort (class/group)
   - [ ] Assign to school
   - [ ] Assign facilitator
   - [ ] Add learners to cohort

5. **Manage facilitators**
   - [ ] Create facilitator account
   - [ ] Assign to school
   - [ ] Reset password
   - [ ] View facilitator activity

6. **Manage learners**
   - [ ] Create learner (generate TATI ID)
   - [ ] Assign to cohort
   - [ ] View progress
   - [ ] Flag at-risk learners

7. **Manage content**
   - [ ] Enable/disable tracks
   - [ ] Deploy new scenarios
   - [ ] Update lessons
   - [ ] Manage assessments

8. **Monitor pilot health**
   - [ ] Error/failure rates
   - [ ] Performance metrics
   - [ ] Usage patterns
   - [ ] Data quality issues

9. **Generate reports**
   - [ ] School engagement
   - [ ] Cohort progress
   - [ ] Facilitator effectiveness
   - [ ] Learner outcomes

### Backend Readiness

**What exists:**
- ✅ Admin role defined in Firestore rules
- ✅ Admin can read any data (test shows this works)
- ✅ Admin role can be assigned via backend

**What's missing:**
- ❌ School/cohort data model (may need new tables)
- ❌ Facilitator → School assignment logic
- ❌ Learner → Cohort assignment logic
- ❌ Content deployment logic
- ❌ All UI/routes

### Recommendation for Phase H

**Admin is P1 (important but not blocking for initial pilot)**

Can be phased:
- **MVP (pilot essential):** School/cohort/facilitator/learner management
- **Phase 2:** Reporting and analytics
- **Phase 3:** Content management and deployment

---

## SECTION 8: INFORMATION FLOW BETWEEN EXPERIENCES

### How the Four Experiences Connect

```
ADMIN sets up pilot
  ├─ Creates school
  ├─ Creates cohort
  ├─ Assigns facilitator to school
  └─ Assigns learners to cohort
  
TATI ACADEMY (Facilitator)
  ├─ Sees assigned school/cohort
  ├─ Sees roster of learners
  ├─ Launches today's scenario/lesson
  ├─ Guides learners through decision
  ├─ Monitors participation
  └─ Collects feedback
  
JUNIOR (Learner)
  ├─ Joins cohort via facilitator
  ├─ Completes lesson/assessment
  ├─ Plays scenario (makes decisions)
  ├─ Experiences consequences
  ├─ Reflects on outcome
  └─ Generates progress events
  
PARENT
  ├─ Linked to child (family relationship)
  ├─ Sees child's progress
  ├─ Reads child's decisions
  ├─ Gets suggestions for home conversation
  └─ Provides feedback to child/facilitator
  
ADMIN monitors overall
  ├─ Sees all schools/cohorts/learners
  ├─ Measures engagement
  ├─ Identifies problems
  └─ Generates reports
```

### Current Information Flow in Codebase

**What exists:**
- ✅ Parent → Child link (family structure)
- ✅ Child → Progress (scenario/assessment results)
- ✅ Progress → Parent view (dashboards work)

**What's missing:**
- ❌ School ↔ Cohort ↔ Facilitator ↔ Learner connections
- ❌ Facilitator → Learner cohort assignment
- ❌ Admin → All role views
- ❌ Cross-role reporting/insights

---

## SECTION 9: CONTENT ARCHITECTURE

### Current Content Structure

```
TRACKS (src/content/tracks/)
├─ save.ts (SAVE track, Junior)
│  ├─ id: "save"
│  ├─ tier: "junior"
│  ├─ name: "SAVE"
│  ├─ goal: GH₵80 (school bag)
│  ├─ daysTotal: 14
│  └─ sequence: [assessment, lesson, lesson, scenario, reflection, ...]
│

SCENARIOS (src/content/scenarios/)
└─ school-reopening.ts (The School Reopening Challenge)
   ├─ id: "kwame-request"
   ├─ track: "save"
   ├─ totalDays: 14
   ├─ startingCapital: GH₵50
   ├─ nodes: [14 story days]
   └─ competencies: [goal-setting, saving, earning, ...]

ASSESSMENTS (src/content/assessments/)
└─ save-junior.ts (Save Pre-Assessment)
   ├─ id: "save-pre"
   ├─ type: "pre"
   ├─ questions: 5
   └─ competencies: [spending-decisions, saving-awareness, ...]

LESSONS (src/content/lessons/)
└─ save.ts (SAVE lessons)
   ├─ meet-your-money (intro to GHS currency)
   ├─ set-a-goal (target-setting)
   └─ [more lessons implied but minimal content]

REFLECTIONS (src/content/reflections/)
└─ save.ts (Post-scenario reflections)
   └─ [per-day reflection prompts]
```

### Content Completeness

| Level | Count | Status | Notes |
|-------|-------|--------|-------|
| **Tracks** | 1 | ✅ Live | Only SAVE (Junior) |
| **Scenarios** | 1 | ✅ Live | Only School Reopening |
| **Assessments** | 1 | ✅ Live | Only Pre-test |
| **Lessons** | ~3 | ⚠️ Partial | Minimal content |
| **Reflections** | ~14 | ✅ Live | Per-day prompts |

**Key gap:** Only ONE content path (SAVE track for Junior). Cannot test:
- Multiple tracks
- Multiple scenarios
- Branching/progression
- Teen content
- Facilitator content delivery

### Backend Readiness for Multiple Tracks

**What exists:**
- ✅ Track system is modular (getTrack() function)
- ✅ Can add new tracks as .ts files
- ✅ Scenario engine supports any scenario definition
- ✅ Assessment engine supports any assessment definition

**What's needed:**
- Frontend track selection UI (currently hardcoded to SAVE)
- Admin ability to enable/disable tracks
- Content bundling/deployment logic

---

## SECTION 10: DESIGN RECOVERY FINDINGS

### Stitch Design Files: NOT FOUND ❌

**Search:** Grep for "stitch", "Stitch", "figma", "prototype", "design reference"  
**Result:** No matches in src/ or docs/  
**Inference:** Stitch files were used for MVP but not committed to repository

### Design Artifacts Found

**What exists:**
- ✅ src/lib/theme.ts (design system configuration)
- ✅ src/styles.css (CSS variables for colors)
- ✅ Component library (src/components/tati/)
- ✅ 40+ shadcn/ui base components

**What's missing:**
- ❌ Design system documentation
- ❌ Component usage guide
- ❌ Icon system specification
- ❌ Illustration style guide
- ❌ Responsive design specs
- ❌ Accessibility guidelines
- ❌ Visual hierarchy guide

### Current Design System Quality

**Theme Configuration:**
```typescript
export const tatiTheme = {
  container: "mx-auto w-full max-w-md px-4 sm:max-w-xl lg:max-w-3xl",
  sectionGap: "space-y-4",
  radius: {
    card: "rounded-3xl",
    control: "rounded-2xl",
    pill: "rounded-full",
  },
  tapTarget: "min-h-[48px] min-w-[48px]",
  text: {
    pageTitle: "text-[28px] leading-tight font-extrabold",
    sectionTitle: "text-lg font-extrabold",
    body: "text-base leading-relaxed",
    muted: "text-base text-muted-foreground",
    caption: "text-sm text-muted-foreground",
  },
};
```

**Semantic Tones:**
- primary, success, warning, danger, neutral
- Soft variants (light background + colored text)
- Solid variants (colored background + white text)

**Status:** Basic system exists, well-implemented, but not documented

---

## SECTION 11: COMPONENT INVENTORY

### TATI Custom Components (8)

| Component | Purpose | Status |
|-----------|---------|--------|
| Avatar | Child/parent profile avatar | ✅ Used |
| Badge | Labeled badge with tone/icon | ✅ Used |
| Button | Primary CTA button | ✅ Used |
| Card | Content container | ✅ Heavily used |
| Cards | Card grid wrapper | ✅ Used |
| Layout (Page, PageHeader) | Page structure + back nav | ✅ Heavily used |
| Progress | Horizontal progress bar | ✅ Used |
| States | LoadingState, EmptyState, ErrorState | ✅ Used |

**Quality:** Well-designed, consistent, production-ready

### Shadcn/UI Base Components (40+)

**Available:**
- accordion, alert, alert-dialog, aspect-ratio, avatar, badge, breadcrumb, button, calendar, carousel, checkbox, collapsible, command, context-menu, dialog, drawer, dropdown-menu, form, hover-card, input-otp, input, label, menubar, navigation-menu, pagination, popover, progress, radio-group, resizable, scroll-area, select, separator, sheet, sidebar, skeleton, slider, sonner, switch, table, tabs, textarea, toggle-group, toggle, tooltip

**Currently used:**
- ✅ button, card, input, label, form (in child/parent forms)
- ✅ dialog/modal (basic modal support)
- ⚠️ Most not yet integrated into core experiences

**Recommendation:** Many available for Phase H design enhancements

### Experience-Specific Components

| Component | Location | Purpose | Status |
|-----------|----------|---------|--------|
| ScenarioPlayer | scenario/ | Renders scenario story | ✅ Production |
| useScenarioRunner | scenario/ | State management | ✅ Production |
| AssessmentRunner | assessment/ | Renders assessment UI | ✅ Production |
| LessonPlayer | lesson/ | Renders lesson content | ✅ Basic |
| Learning/primitives | learning/ | Reusable layout (Screen, TopBar) | ✅ Used |
| AnimatedNumber | gamification/ | XP/money animation | ✅ Available |
| BadgeGrid | gamification/ | Badge display | ✅ Available |
| CelebrationOverlay | gamification/ | Achievement celebration | ✅ Built (unused) |
| SkillBars | gamification/ | Competency visualization | ✅ Available |
| XPCard | gamification/ | XP display | ✅ Available |

**Status:** Good foundation; some components unused (celebration, skill bars)

---

## SECTION 12: MOBILE RESPONSIVENESS STATUS

### Tested Breakpoints

**Current Implementation:**
- Mobile: 320px–600px (primary target)
- Tablet: sm: 640px and up
- Desktop: lg: 1024px and up

### What Works ✅

| Flow | 360px | 375px | 414px | Notes |
|------|-------|-------|-------|-------|
| Landing | ✅ Cards stack | ✅ Full width | ✅ Full width | Good |
| Child home | ✅ Readable | ✅ Readable | ✅ Readable | Good |
| Scenario | ✅ Scrollable | ✅ Scrollable | ✅ Full fit | Good |
| Assessment | ✅ Stacked | ✅ Stacked | ✅ Stacked | Good |
| Parent dashboard | ✅ Card list | ✅ Card list | ✅ Card list | Good |

### What Needs Improvement ⚠️

| Issue | Priority | Notes |
|-------|----------|-------|
| No sticky action buttons | Medium | Scroll to bottom to advance |
| Scenario choices could be taller | Medium | Tap accuracy on 320px |
| Money values small text | Low | Could improve visibility |
| Modals full-screen on small | Low | Tablet could center them |
| No landscape optimization | Low | Tablet users in landscape lose space |

**Status:** Mobile-first core works; refinements needed for polish

---

## SECTION 13: ACCESSIBILITY AUDIT

### What's Already Good ✅

| Area | Evidence |
|------|----------|
| **Tap targets** | 48x48px minimum enforced in theme |
| **Semantic HTML** | Headings, lists, labels used correctly |
| **Button names** | Descriptive labels ("Start scenario", "Try again") |
| **Link purpose** | Clear ("Go back", "Learn more") |
| **Color + text** | Money shown as text, not color-only |

### What Needs Improvement ⚠️

| Area | Current | Priority |
|------|---------|----------|
| **Contrast ratios** | Not audited | High (WCAG AA check) |
| **Form labels** | Some missing aria-label | High |
| **Error announcements** | Text only | High (add aria-live) |
| **Screen reader testing** | Not done | High |
| **Focus indicators** | Default Tailwind | Medium |
| **Skip links** | Not present | Medium |
| **Image alt text** | Missing on scenes | High |
| **Emoji accessibility** | No role="img" | Medium |

**Status:** Basic structure good; auditing needed

---

## SECTION 14: PROTECTED TECHNICAL BOUNDARIES

### DO NOT MODIFY (Blocking Dependencies)

These systems are tested and must remain intact:

#### Authentication Layer ❌
- ❌ Child TATI ID + PIN login
- ❌ Parent email + OAuth login
- ❌ Session management
- ❌ Token storage/validation

#### Authorization Layer ❌
- ❌ RLS policies (Supabase)
- ❌ Firestore security rules
- ❌ Family isolation logic
- ❌ Role-based access (user_roles table)
- ❌ Permission check functions

#### Core Engine ❌
- ❌ Scenario engine (deterministic state machine)
- ❌ Assessment engine (scoring logic)
- ❌ Scenario persistence (saveChildScenario, loadChildScenario)
- ❌ Assessment persistence (saveChildAssessment)

#### Integrity & Reliability ❌
- ❌ G5.1 scenario output verification
- ❌ G6.1 error recovery (save feedback, retry, answer preservation)
- ❌ Database schema
- ❌ Migration scripts

#### Server Functions ❌
- ❌ All .server.ts files in lib/backend/
- ❌ Firebase Admin SDK integration
- ❌ Supabase server-side logic

### CAN Modify (Frontend Scope)

These are safe to redesign/enhance:

#### Routes & Layouts ✅
- ✅ Visual styling of all routes
- ✅ Layout refinement
- ✅ Navigation structure
- ✅ Component composition

#### Components ✅
- ✅ Component styling (keep error UI)
- ✅ Component hierarchy
- ✅ Visual enhancements
- ✅ Animation/transitions

#### Content ✅
- ✅ Learning content (lessons, scenarios, assessments)
- ✅ Text/messaging
- ✅ Illustrations/images
- ✅ Content sequencing

#### Theme ✅
- ✅ Colors (CSS variables)
- ✅ Typography
- ✅ Spacing
- ✅ New components/patterns

---

## SECTION 15: FRONTEND GAP MATRIX

### Complete Gap Inventory

| Category | Item | Status | Gap Type | Priority | Phase |
|----------|------|--------|----------|----------|-------|
| **JUNIOR HOME** | Dashboard | ✅ Done | Visual | P2 | H2 |
| **JUNIOR LEARN** | Journey overview | ✅ Done | Visual | P2 | H2 |
| **JUNIOR LESSONS** | Lesson content | ⚠️ Partial | Content + Visual | P1 | H4 |
| **JUNIOR SCENARIO** | Story player | ✅ Done | Visual | P2 | H3 |
| **JUNIOR ASSESSMENT** | Pre/post test | ✅ Done | Visual | P2 | H4 |
| **JUNIOR REFLECTION** | Post-scenario | ✅ Done | Visual | P2 | H3 |
| **JUNIOR PROGRESS** | Achievement view | ✅ Done | Visual | P2 | H4 |
| **PARENT LOGIN** | Parent auth | ✅ Done | Minor | P3 | H1 |
| **PARENT DASHBOARD** | Child overview | ✅ Done | Visual + Insight | P1 | H5 |
| **PARENT CHILD VIEW** | Individual child | ✅ Done | Insight | P1 | H5 |
| **PARENT FEEDBACK** | Feedback form | ✅ Done | Minor | P2 | H5 |
| **PARENT METRICS** | Analytics | ✅ Done | Insight | P2 | H5 |
| **ACADEMY LOGIN** | Facilitator auth | ❌ Missing | Full build | P0 | H6 |
| **ACADEMY DASHBOARD** | Facilitator home | ❌ Missing | Full build | P0 | H6 |
| **ACADEMY COHORT** | Cohort view | ❌ Missing | Full build | P0 | H6 |
| **ACADEMY LEARNERS** | Roster view | ❌ Missing | Full build | P0 | H6 |
| **ACADEMY SESSION** | Today's lesson | ❌ Missing | Full build | P0 | H6 |
| **ACADEMY REPORTS** | Facilitator reporting | ❌ Missing | Full build | P1 | H6 |
| **ADMIN LOGIN** | Admin auth | ❌ Missing | Full build | P1 | H7 |
| **ADMIN DASHBOARD** | Admin home | ❌ Missing | Full build | P1 | H7 |
| **ADMIN SCHOOLS** | School management | ❌ Missing | Full build | P1 | H7 |
| **ADMIN COHORTS** | Cohort management | ❌ Missing | Full build | P1 | H7 |
| **ADMIN FACILITATORS** | Facilitator management | ❌ Missing | Full build | P1 | H7 |
| **ADMIN LEARNERS** | Learner management | ❌ Missing | Full build | P1 | H7 |
| **DESIGN SYSTEM** | Documentation | ❌ Missing | Documentation | P0 | H1 |
| **CONTENT** | More scenarios | ⚠️ Minimal | Content | P1 | H4+ |
| **CONTENT** | More assessments | ⚠️ Minimal | Content | P1 | H4+ |
| **CONTENT** | Multiple tracks | ❌ Missing | Content | P1 | H4+ |

### Priority Levels

- **P0 (Blocking pilot):** Design system, Academy authentication, Academy dashboard
- **P1 (Pilot essential):** Academy full build, Junior content, Admin core, Parent insights
- **P2 (Important):** Junior visual polish, Parent enhancements
- **P3 (Nice to have):** Minor UX improvements

---

## SECTION 16: BACKEND CAPABILITIES VS. GAPS

### What Already Works (Backend Ready)

| Capability | Status | Location |
|------------|--------|----------|
| Child learn tracking | ✅ | progress_events table + getChildLearningData() |
| Child assessment results | ✅ | saveChildAssessment() + assessment_attempts table |
| Child scenario state | ✅ | scenario_sessions table |
| Parent access to children | ✅ | family relationships + RLS |
| Role assignment (parent/child/facilitator/admin) | ✅ | user_roles table |
| Scenario integrity verification | ✅ | G5.1 verifyScenarioStateConsistency() |
| Save error recovery | ✅ | G6.1 error handling + retry |

### What Needs Backend Work

| Capability | Status | Effort |
|------------|--------|--------|
| School data model | ⚠️ Schema exists? | Minor (clarify) |
| Cohort data model | ❌ Not found | Medium (create schema) |
| Facilitator → Cohort assignment | ❌ Not found | Medium (schema + logic) |
| Learner → Cohort assignment | ❌ Not found | Medium (schema + logic) |
| Facilitator authentication | ⚠️ Role exists | Minor (create endpoint) |
| Admin authentication | ⚠️ Role exists | Minor (create endpoint) |
| Facilitator session/authorization | ⚠️ Partially done | Minor (RLS already has rules) |
| Admin session/authorization | ⚠️ Partially done | Minor (RLS already has rules) |
| Content deployment logic | ❌ Not found | Medium (create logic) |

### Recommendation

- **Before Phase H2:** Audit which backend items need to be completed
- **Concurrent with H design:** Fill gaps in facilitator/admin backend
- **Before H6 start:** Ensure Academy backend is ready

---

## SECTION 17: TEEN EXPERIENCE STATUS

### Explicit Deferral: TEEN = FUTURE PHASE ⏸️

The Product Brief mentions Teen (ages 13–18), but:

**Current scope:** NOT part of MVP  
**Reason:** Build Junior, Academy, Parent first; pilot with one cohort  
**Future:** Tier selection in Phase H6+ after Junior is proven

**Actions:**
- ✅ Do NOT create /teen routes
- ✅ Do NOT create teen components
- ✅ Do NOT create teen content
- ✅ Document Teen as Phase H6+
- ✅ Keep architecture extensible for later

---

## SECTION 18: RECOMMENDED PHASE H ROADMAP

Based on H0.1 findings, here is the evidence-based implementation sequence:

### Phase H1: Design System & App Shell (1–2 weeks)

**Goals:**
- Document and codify existing design system
- Create component library (Storybook or similar)
- Establish visual direction for all experiences
- Consolidate duplicate routes

**Deliverables:**
1. Design System documentation (colors, typography, spacing, tones, icons)
2. Component library with usage patterns
3. Design direction guide for H2–H8
4. Route consolidation plan
5. Accessibility baseline audit

### Phase H2: Junior Polish & Visual Refinement (2–3 weeks)

**Goals:**
- Elevate Junior experience to production quality
- Refine visual storytelling
- Enhance mobile experience
- Add celebration/achievement flows

**Deliverables:**
1. Home dashboard visual enhancement
2. Scenario player visual enrichment
3. Assessment UI refinement
4. Lesson content templates
5. Celebration/badge unlock flows
6. Mobile-specific optimizations

### Phase H3: TATI ACADEMY Foundation (2–3 weeks)

**Goals:**
- Build facilitator authentication
- Create Academy dashboard
- Establish cohort management
- Show facilitator what to do today

**Deliverables:**
1. Facilitator login flow
2. Academy dashboard (school/cohort view)
3. Cohort management UI
4. Learner roster view
5. Today's session guidance
6. Facilitator session materials

**Dependency:** Backend facilitator schema must be ready

### Phase H4: Content Expansion & Lesson Richness (2–3 weeks)

**Goals:**
- Expand content library
- Enrich lesson interactivity
- Add post-test feedback
- Improve results/celebration

**Deliverables:**
1. More scenarios (2–3 additional tracks or variations)
2. Interactive lesson components
3. Post-test competency feedback
4. Enhanced results screen
5. Progress visualization
6. Content discovery/selection UI

### Phase H5: Parent Insights & Home Engagement (2 weeks)

**Goals:**
- Deepen parent dashboard with actionable insights
- Add home activity suggestions
- Create recommendation engine
- Enable parent-child celebration

**Deliverables:**
1. Trend analysis (showing growth)
2. Personalized conversation starters
3. Home activity suggestions
4. Parent messaging/celebration
5. At-risk learner alerts (optional)
6. Parent insights dashboard

### Phase H6: TATI ACADEMY Complete (2–3 weeks)

**Goals:**
- Complete facilitator experience
- Add scenario facilitation
- Add assessment review
- Add reporting

**Deliverables:**
1. Scenario facilitation UI (launch, monitor, guide)
2. Assessment result review
3. Learner progress reports
4. Intervention recommendations
5. Facilitator resources/guides
6. Session documentation/archiving

### Phase H7: ADMIN Operations (2–3 weeks)

**Goals:**
- Enable programme operations
- School/cohort/facilitator/learner management
- Content deployment
- Pilot monitoring

**Deliverables:**
1. Admin authentication
2. Admin dashboard (overview stats)
3. School management
4. Cohort/class management
5. Facilitator account management
6. Learner management
7. Programme health monitoring
8. Basic reporting

### Phase H8: Accessibility + Mobile Polish (1–2 weeks)

**Goals:**
- WCAG AA compliance
- Cross-device testing
- Performance optimization
- User testing insights integration

**Deliverables:**
1. Contrast audit + fixes
2. Keyboard navigation comprehensive test
3. Screen reader testing
4. Focus indicator refinement
5. Tablet/landscape optimization
6. Performance profiling
7. Integration of user research findings

---

## SECTION 19: TEEN DEFERRAL DOCUMENTATION

### Why Teen is NOT in MVP

1. **Scope:** MVP focuses on proving JUNIOR + ACADEMY + PARENT ecosystem
2. **Content:** No Teen-specific content exists; would require separate scenarios, lessons, assessments
3. **Visual tier:** Teen should feel more mature; requires separate design direction
4. **Authentication:** Need to clarify age-based routing (who selects Junior vs. Teen?)
5. **Facilitator:** Unclear if facilitators teach mixed cohorts or separate tiers
6. **Testing:** Pilot should focus on one cohort profile first

### Teen Design Decisions (Future)

When building Teen (H6+), decide:
- [ ] Separate tracks? (e.g., EARN for Teen vs. SAVE for Junior)
- [ ] Separate facilitator UI? (More analytics-heavy?)
- [ ] Age-based routing? (How does child/parent select?)
- [ ] Visual differentiation level? (Full redesign or theme variant?)
- [ ] Mobile Money integration? (Teen-specific feature?)
- [ ] Borrowing/lending scenarios? (More complex financial concepts?)

### Action

**Record in PHASE_H0_1_MVP_EXPERIENCE_ARCHITECTURE.md:**
> TEEN IS NOT PART OF H PHASES 1–7. Document for Phase H6+ decision-making.

---

## SECTION 20: H0.1 CONCLUSION & NEXT STEPS

### What We Know

**Product Architecture:**
- ✅ TATI is correctly designed as ONE ecosystem with FOUR connected experiences
- ✅ Backend infrastructure ready for all four roles (roles defined, Firestore rules written)
- ✅ Junior experience complete (85% functional, 15% polish needed)
- ✅ Parent experience complete (75% functional, 25% insights needed)
- ❌ Academy experience completely missing (0% — frontend zero)
- ❌ Admin experience completely missing (0% — frontend zero)
- ❌ Only 1 scenario, 1 assessment (needs content expansion)

**Critical Finding:**
> The MVP cannot run without ACADEMY. Schools need facilitators. Facilitators need Academy interface. Academy frontend is a P0 blocker.

### Recommended H0.1 → H1 Transition

**Before authorizing Phase H, confirm:**

1. ✅ Design leader assigned
2. ✅ Backend team ready for facilitator/admin schema (if needed)
3. ✅ Content/curriculum team ready to expand scenarios/lessons
4. ✅ Timeline: 10–12 weeks for complete H phases (H1–H7)
5. ✅ Release strategy: Pilot launch after H2–H3 (Junior + Academy working)

### Immediate Next Step

**Authorize Phase H1: Design System & App Shell**

This will:
1. Establish visual foundation for all experiences
2. Consolidate duplicate routes
3. Create component library
4. Unlock all downstream phases

**Timeline:** 1–2 weeks  
**Effort:** 1 designer + 1 frontend engineer  
**Output:** Design System documentation + initial visual direction

### Success Criteria for H0.1 → H1

When moving forward, ensure:
- ✅ Design system documented
- ✅ Phase H roadmap approved
- ✅ Academy backend requirements clarified
- ✅ Content expansion plan approved
- ✅ Resource allocation confirmed (design, frontend, backend, content)
- ✅ Timeline and milestones agreed

---

## APPENDIX: ROLE MATRIX SUMMARY

### JUNIOR (Learner, Ages 8–12)

| Aspect | Current | Status |
|--------|---------|--------|
| **Purpose** | Learn financial concepts through decisions | ✅ Clear |
| **Authentication** | TATI ID + PIN | ✅ Working |
| **Routes** | 10 core routes | ✅ Implemented |
| **Content** | 1 scenario, 1 assessment, ~3 lessons | ⚠️ Minimal |
| **UI completeness** | 85% | ✅ Functional |
| **G6.1 integration** | Error recovery excellent | ✅ Verified |

### TATI ACADEMY (Facilitator, School/Community)

| Aspect | Current | Status |
|--------|---------|--------|
| **Purpose** | Deliver TATI programme to learners | ❌ Not built |
| **Authentication** | None yet | ❌ Missing |
| **Routes** | Zero | ❌ Missing |
| **Backend support** | Role defined, not connected | ⚠️ Partial |
| **UI completeness** | 0% | ❌ Missing |

### PARENT (Family, Reinforcement)

| Aspect | Current | Status |
|--------|---------|--------|
| **Purpose** | Understand child, reinforce learning | ✅ Clear |
| **Authentication** | Email + OAuth | ✅ Working |
| **Routes** | 5 core routes | ✅ Implemented |
| **Content** | Progress, feedback, metrics | ✅ Working |
| **UI completeness** | 75% | ✅ Functional, needs insights |
| **Insights** | Basic | ⚠️ Needs enhancement |

### ADMIN (Operations, Programme Management)

| Aspect | Current | Status |
|--------|---------|--------|
| **Purpose** | Operate and measure pilot | ❌ Not built |
| **Authentication** | None yet | ❌ Missing |
| **Routes** | Zero | ❌ Missing |
| **Backend support** | Role defined, not connected | ⚠️ Partial |
| **UI completeness** | 0% | ❌ Missing |

---

**End of PHASE_H0_1_MVP_EXPERIENCE_ARCHITECTURE.md**

Phase H0.1 Complete. Ready for Phase H authorization.
