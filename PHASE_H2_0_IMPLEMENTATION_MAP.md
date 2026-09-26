# PHASE H2.0: Implementation Map & Protected Systems Analysis

**Status:** READ-ONLY ANALYSIS (No code modifications yet)  
**Date:** 2026-09-26  
**Phase:** H2.0 MVP Experience Shell Implementation  

---

## EXECUTIVE SUMMARY

This document maps the complete TATI MVP architecture (4 experiences) to existing code:

- **JUNIOR:** 85% implemented (visual redesign needed)
- **PARENT:** 75% implemented (enhancement needed)
- **ACADEMY:** 0% implemented (missing - P0 blocker for pilot)
- **ADMIN:** 0% implemented (missing - P1 needed for operations)

All existing authentication, authorization, scenario integrity (G5.1), and error recovery (G6.1) systems are **PROTECTED** and will not be modified.

---

## SECTION 1: PROTECTED SYSTEMS (IMMUTABLE)

### 1.1 Child Authentication (DO NOT MODIFY)

**Location:** `src/lib/auth/child-auth.functions.ts`, `src/lib/auth/child-session.server.ts`

**Mechanism:**
- HTTP-only session cookie: `tati_child_session`
- ChildSession: Supabase child_credentials + child_sessions tables
- Validation: `validateChildSession()` server-side
- Profile: Loaded from Supabase child_profiles table

**Routes Protected:**
- All `/child/*` routes have `beforeLoad` that checks session

**Why Immutable:**
- Session security is cryptographic
- Changing cookie handling breaks authentication
- Child identity must remain server-validated

**Verification:** Do NOT touch these files:
- ❌ `src/lib/auth/child-auth.functions.ts`
- ❌ `src/lib/auth/child-session.server.ts`
- ❌ `src/lib/auth/child-identity.server.ts`

---

### 1.2 Parent Authentication (DO NOT MODIFY)

**Location:** `src/integrations/supabase/client.ts` (Supabase Auth integration)

**Mechanism:**
- Supabase Auth (email/password + Google OAuth)
- User profile linked to parent profiles
- Authorization via Firestore roles

**Routes Protected:**
- `/login`, `/signup` use Supabase Auth
- `/onboarding` links child to parent

**Why Immutable:**
- Supabase Auth is managed service
- OAuth scopes and configuration externalized
- Parent-child linking must be consistent

**Verification:** Do NOT modify:
- ❌ Supabase Auth integration logic
- ❌ `src/integrations/supabase/` (read-only reference)
- ❌ OAuth/email configuration

---

### 1.3 Authorization & Roles (DO NOT MODIFY)

**Location:** `src/lib/auth/authorization.server.ts`, `src/lib/auth/roles.server.ts`

**System:**
- AppRole type: "parent" | "child" | "facilitator" | "admin"
- Functions: `requireRole()`, `requireParent()`, `requireFacilitator()`, `requireAdmin()`
- Roles stored in Firestore `user_roles` collection
- Context type: AuthenticatedUser (parent/facilitator/admin) | ChildSession (child)

**Why Immutable:**
- Authorization gates security
- Changing role requirements breaks access control
- Firestore rules depend on this logic

**Verification:** Do NOT modify:
- ❌ `src/lib/auth/authorization.server.ts`
- ❌ `src/lib/auth/roles.server.ts`
- ❌ Role checking functions
- ❌ Firestore rules files

---

### 1.4 G5.1: Scenario Integrity Verification (DO NOT MODIFY)

**Location:** `src/lib/auth/child-learning.functions.ts` (lines 325–692)

**Purpose:** Verify that submitted scenario state was actually produced by scenario engine

**Implementation:**
1. `validateScenarioState()` - Structural validation
2. `validateChildContext()` - Session + identity validation
3. `replayScenarioDecisions()` - Replay all decisions through engine and compare result
4. Server-side verification on every save

**Functions Protected:**
- `validateScenarioState()`
- `validateChildContext()`
- `validateChoice()`
- `validateNodeReachability()`
- `validateDay()`
- `replayScenarioDecisions()`

**Why Immutable:**
- G5.1 prevents scenario state tampering
- Ensures learning outcomes are authentic
- Required for pilot integrity

**Verification:** Do NOT modify:
- ❌ `src/lib/auth/child-learning.functions.ts` (G5.1 section)
- ❌ Scenario engine replay logic
- ❌ State validation functions

---

### 1.5 G6.1: Error Recovery (DO NOT MODIFY)

**Location:** Implicit in assessment save and scenario save functions

**Purpose:** Save feedback, preserve answers, enable retry on failure

**Implementation:**
- Save partial progress before committing
- Preserve user input on network errors
- Allow resume/retry without data loss

**Why Immutable:**
- Error recovery is critical UX feature
- Changing error handling breaks user experience
- Pilot expects data preservation

**Verification:** Do NOT modify error handling in:
- ❌ Scenario save functions
- ❌ Assessment save functions
- ❌ Feedback save functions

---

### 1.6 Firestore Security Rules (DO NOT MODIFY)

**Location:** `firestore.rules`

**Rules Enforced:**
- Family data isolation (only parent + children can access)
- Child learner data read-only to self
- Assessment results access control
- Facilitator access to cohort data

**Why Immutable:**
- Firestore rules are security boundary
- Pilot data must be protected
- Family privacy must be enforced

**Verification:** Do NOT modify `firestore.rules`

---

### 1.7 Database Schema (DO NOT MODIFY)

**Location:** Supabase schema (migrations), Firestore collections

**Collections/Tables:**
- Supabase: child_profiles, child_credentials, child_sessions, families, family_members, profiles
- Firestore: users, families/members/children, journeyProgress, assessmentAttempts, scenarioSessions, childSessions

**Why Immutable:**
- Schema changes break migrations
- Existing data structure must be preserved
- Pilot data integrity depends on consistency

**Verification:** Do NOT modify:
- ❌ `drizzle/schema.ts`
- ❌ `drizzle/migrations/`
- ❌ Firestore collection names/structure
- ❌ Database types

---

## SECTION 2: EXISTING WORKING COMPONENTS & ROUTES (85%)

### 2.1 TATI Custom Components (8 Total, PRODUCTION READY)

All components in `src/components/tati/`:

| Component | Status | Use Case | H2 Action |
|-----------|--------|----------|-----------|
| **Button.tsx** | ✅ Working | CTAs, form submission | Style enhancements (hover, active) |
| **Card.tsx** | ✅ Working | Content containers | Add hover lift animation |
| **Avatar.tsx** | ✅ Working | Child/parent identity | Use as-is, no changes needed |
| **Badge.tsx** | ✅ Working | Status labels, XP display | Use as-is, enhance celebration variant |
| **Progress.tsx** | ✅ Working | Bars and rings | Enhance animation smoothness |
| **Layout.tsx** | ✅ Working | Page, PageHeader, BottomNav | Refine nav patterns for Academy/Admin |
| **Cards.tsx** | ✅ Working | Lesson/Scenario/Stat cards | Polish styling, add variants |
| **States.tsx** | ✅ Working | Loading, Error, Empty | Use as-is, accessible by default |

**Action:** All 8 components can be used as-is. Minor style enhancements in H2.

---

### 2.2 JUNIOR Routes (10 Total, 85% Complete)

**Location:** `src/routes/child/`

| Route | File | Status | Needs |
|-------|------|--------|-------|
| `/child/login` | `login.tsx` | ✅ Working | Visual polish |
| `/child/home` | `home.tsx` | ✅ Working | Dashboard enhancement |
| `/child/learn` | `learn.tsx` | ✅ Working | Lesson/scenario list styling |
| `/child/scenario/:id` | `scenario.$scenarioId.tsx` | ⚠️ Functional | Major UI redesign (H1 spec) |
| `/child/lesson/:id` | `lesson.$lessonId.tsx` | ⚠️ Functional | Add media support, templates |
| `/child/assessment/:id` | `assessment.$assessmentId.tsx` | ⚠️ Functional | Polish questions, results |
| `/child/reflection/:id` | `reflection.$reflectionId.tsx` | ✅ Working | Styling polish |
| `/child/progress` | `progress.tsx` | ✅ Working | Add competency breakdown |
| `/child/results` | `results.tsx` | ✅ Working | Integrate celebration overlay |
| `/child/route.tsx` | `route.tsx` | ✅ Working | BottomNavigation (hides on focused) |

**Legacy Duplicate Routes (Do Not Use):**
- `src/routes/_authenticated/` — Redundant copy of `/child/` routes (10 routes)
- Action: Keep but don't modify; eventually remove in H3

---

### 2.3 PARENT Routes (5 Total, 75% Complete)

**Location:** `src/routes/parent/`

| Route | File | Status | Needs |
|-------|------|--------|-------|
| `/parent/` | `index.tsx` | ⚠️ Basic | Enhance with insights, actions |
| `/parent/child/:childId` | `child.$childId.tsx` | ✅ Working | Add more insights + conversation starters |
| `/parent/feedback` | `feedback.tsx` | ✅ Working | Visual polish |
| `/parent/feedback-review` | `feedback-review.tsx` | ✅ Working | Display improvements |
| `/parent/metrics` | `metrics.tsx` | ✅ Working | Enhanced charts |

---

### 2.4 Public Routes (5 Total, 100% Working)

| Route | File | Status | Notes |
|-------|------|--------|-------|
| `/` | `index.tsx` | ✅ Complete | Landing page, use as-is |
| `/login` | `login.tsx` | ✅ Complete | Parent login (Supabase Auth) |
| `/signup` | `signup.tsx` | ✅ Complete | Parent registration |
| `/onboarding` | `onboarding.tsx` | ✅ Complete | Parent → child linking |
| `/auth` | `auth.tsx` | ✅ Complete | OAuth callback handler |

---

## SECTION 3: MISSING EXPERIENCES (0%)

### 3.1 TATI ACADEMY (Facilitator, P0 Blocker)

**Status:** ❌ COMPLETELY MISSING (0 lines of code)

**Routes Needed:**
```
/academy/                    → Dashboard (overview, cohorts, quick links)
/academy/cohort/:cohortId    → Cohort view (roster, progress, start session)
/academy/session/:sessionId  → Session prep (objectives, resources, guides)
/academy/session/:id/live    → Live monitor (real-time learner status)
/academy/cohort/:id/results  → Debrief (session summary, outcomes)
/academy/learner/:learnerId  → Learner detail (progress, decisions, competencies)
```

**Authentication Needed:**
- Facilitator login (email/password or SSO)
- Role-based access: facilitator → assigned cohorts only
- No backend changes needed (role exists in Firestore)

**Components Needed (New):**
```
src/components/academy/FacilitatorDashboard.tsx
src/components/academy/CohortRoster.tsx
src/components/academy/SessionPlanner.tsx
src/components/academy/LearnerProgressCard.tsx
src/components/academy/LiveMonitor.tsx
src/components/academy/FacilitatorGuide.tsx
src/components/academy/ResultsDebrief.tsx
```

**Navigation Shell:**
- Top header (logo + "Academy" label)
- Could add sidebar on desktop (not MVP)
- Mobile responsive: hamburger menu

**Desktop-First Design:**
- Optimize for 1024px+ (classroom displays)
- Tablet fallback: single column
- Mobile: basic readability (no optimization)

**Design from H1.0 Spec:**
- Professional blue tones
- Structured tables/lists
- Print-friendly styling
- Minimal motion (classroom focus)

---

### 3.2 TATI ADMIN (Operations, P1)

**Status:** ❌ COMPLETELY MISSING (0 lines of code)

**Routes Needed:**
```
/admin/                     → Overview (stats, quick links, system health)
/admin/schools              → School management (list, create, edit)
/admin/schools/:schoolId    → School detail (info, facilitators, cohorts)
/admin/facilitators         → Facilitator management (provisioning)
/admin/cohorts              → Cohort management (assignment, tracking)
/admin/learners             → Learner search + card generation
/admin/learner/:learnerId   → Individual learner card
/admin/content              → Track deployment, scenario assignment
/admin/monitoring           → Error rates, engagement, health
```

**Authentication Needed:**
- Admin login (email/password, possible 2FA)
- Role-based access: admin → all schools
- No backend changes needed (role exists)

**Components Needed (New):**
```
src/components/admin/AdminDashboard.tsx
src/components/admin/SchoolForm.tsx
src/components/admin/SchoolList.tsx
src/components/admin/FacilitatorForm.tsx
src/components/admin/CohortForm.tsx
src/components/admin/LearnerList.tsx
src/components/admin/LearnerCardGenerator.tsx
src/components/admin/SystemMonitoring.tsx
```

**Navigation Shell:**
- Sidebar navigation (left, collapsible on mobile)
- Top header (logo + "Admin" label)
- Primary nav: Schools, Facilitators, Cohorts, Learners, Content, Monitoring

**Desktop-First Design:**
- Optimize for 1280px+ (admin desk work)
- Tables with pagination/sorting
- Data-dense layouts
- Form-heavy interfaces

**Design from H1.0 Spec:**
- Professional structure
- Blue + gray tones
- Efficient navigation
- Keyboard-friendly

---

## SECTION 4: H2 IMPLEMENTATION SEQUENCE

### Phase 1: Shared Foundation (Week 1)

**1.1 Enhanced Theme & Tokens**
- Ensure `src/lib/theme.ts` exports all H1.0 tokens
- Add motion tokens (Tailwind duration, easing)
- Add focus ring styles (high contrast for accessibility)
- Verify OKLCH colors are correctly mapped

**1.2 Layout & Navigation Refactor**
- Create role-specific layout wrappers:
  - `JuniorLayout` (mobile-first, BottomNav)
  - `ParentLayout` (mobile-first, TopBar)
  - `AcademyLayout` (desktop-first, sidebar or TopBar)
  - `AdminLayout` (desktop-first, sidebar)
- Preserve existing functionality (no breaking changes)

**1.3 Accessibility Pass**
- Ensure focus indicators visible (2–3px ring)
- Verify ARIA labels on all icon buttons
- Check color contrast (4.5:1 text)
- Test keyboard navigation (Tab, Enter, Esc)

**Action Files to Modify:**
- `src/lib/theme.ts` (add tokens)
- `src/components/tati/Layout.tsx` (refactor)
- `src/components/tati/*.tsx` (hover/focus enhancements)

---

### Phase 2: JUNIOR Polish (Week 1–2)

**2.1 Child Routes Visual Enhancement**
- `/child/home` → Apply H1.0 dashboard spec (avatar, track card, next activity)
- `/child/learn` → Apply H1.0 lesson/scenario list spec
- `/child/scenario/:id` → Complete redesign per H1.0 anatomy (scene, narration, choices)
- `/child/lesson/:id` → Add media support templates
- `/child/assessment/:id` → Polish question UI, integrate celebration
- `/child/progress` → Add competency display, badge grid
- `/child/results` → Integrate CelebrationOverlay for badge unlocks

**2.2 Child Authentication UI Polish**
- `/child/login` → TATI ID + PIN input with clear labeling

**2.3 Micro-interactions**
- Button press feedback (scale-down active state)
- Progress bar fill animation (500ms smooth)
- Badge unlock animation (scale-in celebration)
- Choice select feedback (highlight on select)

**Action Files to Create/Modify:**
- New: `src/components/tati/ScenarioPlayer.tsx`
- New: `src/components/tati/MoneyLedger.tsx`
- New: `src/components/tati/CelebrationOverlay.tsx`
- Modify: `src/routes/child/*.tsx` (all routes)
- Enhance: `src/components/gamification/CelebrationOverlay.tsx` (if exists)

---

### Phase 3: PARENT Enhancement (Week 2)

**3.1 Parent Dashboard Redesign**
- `/parent/` → Add insights, action cards, warm messaging
- `/parent/child/:childId` → Add conversation starters, home activities
- Enhance visual warmth (colors, messaging, icons)

**3.2 Insight Cards**
- Create new component: `ParentInsightCard`
- Show learning highlights (not problems)
- Suggest home conversations

**Action Files to Modify:**
- `src/routes/parent/*.tsx` (all routes)
- New: `src/components/parent/InsightCard.tsx`
- New: `src/components/parent/ConversationStarter.tsx`

---

### Phase 4: ACADEMY Foundation (Week 3–4)

**4.1 Facilitator Authentication**
- Create `/academy/login` route
- Implement email/password login via Supabase
- Redirect to `/academy` on success

**4.2 Academy Routes & Components**
- Create all Academy routes
- Build dashboard, cohort view, session prep, live monitor, results

**4.3 Academy Navigation**
- TopBar with "Academy" label
- Optional sidebar (can defer to H3 if time)

**Action Files to Create:**
- New: `src/routes/academy/` directory + all route files
- New: `src/components/academy/` directory + all components
- New: `src/lib/academy/` helper functions

---

### Phase 5: Testing & Integration (End of Week 4)

**5.1 End-to-End Testing**
- Child: Login → Home → Learn → Scenario → Results
- Parent: Login → Dashboard → Child Progress
- Responsive testing: 320px, 430px, 768px, 1024px

**5.2 Accessibility Audit**
- Keyboard navigation (Tab, Enter, Esc)
- Screen reader testing (VoiceOver, NVDA)
- Color contrast verification
- Motion/reduced-motion testing

**5.3 Performance**
- Bundle size check
- Lighthouse score verification
- Mobile performance (Network: 4G)

---

## SECTION 5: CODE ORGANIZATION REFERENCE

### Route Structure (Will Not Change)

```
src/routes/
├── __root.tsx              (root layout, Outlet)
├── index.tsx               (landing page, public)
├── login.tsx               (parent login)
├── signup.tsx              (parent signup)
├── onboarding.tsx          (parent → child link)
├── auth.tsx                (OAuth callback)
├── child/                  (JUNIOR experience)
│   ├── route.tsx           (child layout + auth guard)
│   ├── login.tsx           (TATI ID + PIN)
│   ├── home.tsx            (dashboard)
│   ├── learn.tsx           (activity list)
│   ├── scenario.$scenarioId.tsx
│   ├── lesson.$lessonId.tsx
│   ├── assessment.$assessmentId.tsx
│   ├── reflection.$reflectionId.tsx
│   ├── progress.tsx        (badges + competencies)
│   └── results.tsx         (completion)
├── parent/                 (PARENT experience)
│   ├── route.tsx           (parent layout + auth guard)
│   ├── index.tsx           (dashboard)
│   ├── child.$childId.tsx  (child detail)
│   ├── feedback.tsx        (form)
│   ├── feedback-review.tsx (list)
│   └── metrics.tsx         (charts)
├── academy/                (ACADEMY experience) [NEW]
│   ├── route.tsx           (layout + auth guard) [NEW]
│   ├── login.tsx           (facilitator login) [NEW]
│   ├── index.tsx           (dashboard) [NEW]
│   ├── cohort.$cohortId.tsx
│   ├── session.$sessionId.tsx
│   ├── session.$id.live.tsx
│   └── [more Academy routes]
├── admin/                  (ADMIN experience) [NEW]
│   ├── route.tsx           (layout + auth guard) [NEW]
│   ├── login.tsx           (admin login) [NEW]
│   ├── index.tsx           (dashboard) [NEW]
│   ├── schools.tsx
│   ├── facilitators.tsx
│   ├── cohorts.tsx
│   └── [more Admin routes]
└── _authenticated/         (LEGACY, KEEP FOR NOW)
    ├── route.tsx
    ├── learn.$childId.*.tsx [10 routes]
    └── dashboard.tsx
```

### Component Structure (Will Change)

```
src/components/
├── tati/                   (CORE DESIGN SYSTEM)
│   ├── Avatar.tsx          (✅ no change)
│   ├── Badge.tsx           (✅ minor style)
│   ├── Button.tsx          (✅ minor style)
│   ├── Card.tsx            (✅ minor style)
│   ├── Cards.tsx           (✅ polish)
│   ├── Layout.tsx          (⚠️ refactor for 4 roles)
│   ├── Progress.tsx        (✅ minor style)
│   ├── States.tsx          (✅ no change)
│   ├── ScenarioPlayer.tsx  (🆕 new)
│   ├── MoneyLedger.tsx     (🆕 new)
│   └── index.ts            (export all)
├── ui/                     (shadcn/ui components)
│   └── [42 components, mostly unused]
├── assessment/             (assessment-specific)
│   └── AssessmentRunner.tsx
├── learning/               (learning-specific)
│   └── primitives.tsx
├── gamification/           (gamification)
│   ├── CelebrationOverlay.tsx
│   ├── BadgeGrid.tsx
│   ├── XPCard.tsx
│   ├── SkillBars.tsx
│   └── [other gamification]
├── academy/                (ACADEMY components) [NEW]
│   ├── FacilitatorDashboard.tsx
│   ├── CohortRoster.tsx
│   ├── SessionPlanner.tsx
│   ├── LiveMonitor.tsx
│   └── [other Academy]
├── parent/                 (PARENT components) [NEW]
│   ├── InsightCard.tsx
│   ├── ConversationStarter.tsx
│   └── [other Parent]
└── admin/                  (ADMIN components) [NEW]
    ├── AdminDashboard.tsx
    ├── SchoolForm.tsx
    ├── CohortForm.tsx
    └── [other Admin]
```

### Library Structure (Will NOT Change)

```
src/lib/
├── auth/                   (🔒 PROTECTED - DO NOT MODIFY)
│   ├── authorization.server.ts
│   ├── child-auth.functions.ts
│   ├── child-identity.server.ts
│   ├── child-session.server.ts
│   ├── roles.server.ts
│   ├── child-learning.functions.ts  (contains G5.1)
│   └── use-child-learning.ts
├── backend/                (🔒 PROTECTED)
│   └── firebase/
│       └── [Firebase functions]
├── scenario/               (🔒 PROTECTED)
│   ├── engine.ts           (scenario state machine)
│   ├── session.ts
│   └── types.ts
├── assessment/             (🔒 PROTECTED)
│   ├── engine.ts           (scoring logic)
│   ├── types.ts
│   └── useAssessmentRunner.ts
├── learning/               (🔒 PROTECTED)
│   ├── track.ts            (SAVE track definition)
│   └── [other learning]
├── family.ts               (🔒 PROTECTED - parent/child queries)
├── feedback.ts             (🔒 PROTECTED - feedback logic)
├── theme.ts                (✅ OK to enhance with tokens)
├── utils.ts                (✅ general utilities)
└── [other lib files]
```

---

## SECTION 6: VERIFICATION CHECKLIST

Before beginning Phase H2, verify:

### Protected Systems Verified
- ❌ DO NOT modify any `src/lib/auth/*.ts` files
- ❌ DO NOT change Firestore rules
- ❌ DO NOT alter database schema
- ❌ DO NOT modify scenario/assessment engines
- ❌ DO NOT touch Supabase Auth configuration

### Git Clean
- ❌ All changes committed
- ❌ No uncommitted modifications
- ❌ No merge conflicts
- ❌ Main branch clean

### Tests Passing
- ❌ Run `npm run test` or similar
- ❌ All existing tests pass (0 failures)
- ❌ No lint errors

### Backup Created (Optional)
- ❌ Tag current state: `git tag -a v0.1.0-h1-complete -m "H1.0 spec complete, before H2 implementation"`

---

## NEXT STEP

✅ **Implementation Map Complete**

Ready to proceed with Phase H2.0 implementation:
1. Enhance shared theme & tokens
2. Polish JUNIOR experience
3. Enhance PARENT experience
4. Build ACADEMY foundation
5. Test and verify

**Progress:** Analysis complete. No code changes yet. Awaiting next instruction to begin Phase H2 implementation.

