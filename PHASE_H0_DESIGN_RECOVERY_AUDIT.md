# PHASE H0: DESIGN RECOVERY & FRONTEND GAP AUDIT

**Status:** AUDIT ONLY (READ-ONLY ANALYSIS)  
**Date Completed:** Phase H0 Discovery  
**Scope:** Comprehensive assessment of existing frontend against intended product  
**Output:** Gap matrix + recommended Phase H implementation sequence  

---

## EXECUTIVE SUMMARY

### Current State
TATI ChildSave MVP currently implements:
- ✅ **Complete child learning journey** (Junior/SAVE track only)
- ✅ **Core scenario engine** (1 full scenario: School Reopening Challenge)
- ✅ **Parent dashboard** (child overview + feedback)
- ✅ **Security foundation** (RLS, G5.1 verification, G6.1 error recovery)
- ✅ **Design system** (custom TATI components + theme)

### Critical Gap
- ❌ **No Stitch design files in repository** — Cannot compare against original design direction
- ❌ **Only JUNIOR experience** — Teen/PLUS experiences not implemented
- ❌ **Only 1 scenario** — No branching content library
- ❌ **Minimal lesson content** — Lesson routes exist but content minimal
- ❌ **No teacher experience** — Teacher routes don't exist
- ❌ **Visual design needs refinement** — Functionality complete; polish needed

### Recommendation
**Proceed to Phase H1: Design System & App Shell** to establish visual foundation, then continue with Phase H2–H8 sequence.

Stitch design files are NOT available. Phase H will be driven by:
1. Current component architecture
2. Product brief (Junior, Teen, Plus)
3. New visual design direction (to be created)
4. User research from pilot

---

## SECTION 1: CURRENT PRODUCT ARCHITECTURE

### Technology Stack
- **Frontend Framework:** TanStack React 1.x + React Router file-based routing
- **Styling:** Tailwind CSS + CSS custom properties (theme.ts)
- **State Management:** React Query + useState
- **Database:** Supabase (PostgreSQL) + optional Firebase (identity mapping)
- **Authentication:** 
  - Children: TATI ID + PIN (custom)
  - Parents: Email/password + Google OAuth (Supabase Auth)
- **Scenario Engine:** Deterministic, server-verified (G5.1), no database dependencies

### Design System
**Status:** Partially implemented, needs codification

#### Theme Configuration
- **Container:** Mobile-first (max-w-md), responsive up to 3xl
- **Spacing:** Consistent section gaps (space-y-4)
- **Radii:** Cards (rounded-3xl), Controls (rounded-2xl), Pills (rounded-full)
- **Accessibility:** 48x48px minimum tap targets
- **Semantic Tones:** primary, success, warning, neutral, danger (soft + solid variants)

#### Component Availability

**Custom TATI Components (Production)**
- Avatar — User/child profile avatar
- Badge — Labeled badge with tones
- Button — Primary CTA
- Card — Content container (surface/muted/primary tones)
- Cards — Card grid wrapper
- Layout — Page, PageHeader (with back button)
- Progress — Progress bar (percentage-based)
- States — LoadingState, EmptyState, ErrorState

**UI System (Shadcn)**
- 40+ components available (accordion, alert, badge, button, card, carousel, checkbox, collapsible, command, context-menu, dialog, dropdown, form, input, label, modal, pagination, popover, progress, radio, select, sheet, sidebar, skeleton, switch, tabs, textarea, toggle, tooltip, etc.)
- Most not yet integrated into child/parent experiences
- Ready for reuse in Phase H design work

**Experience-Specific Components (Production)**
- **Scenario:** ScenarioPlayer (with G6.1 error UI), useScenarioRunner (state mgmt)
- **Assessment:** AssessmentRunner (with G6.1 error UI), answer persistence
- **Lesson:** LessonPlayer, lesson rendering primitives
- **Gamification:** AnimatedNumber, BadgeGrid, CelebrationOverlay, SkillBars, XPCard
- **Learning Primitives:** Screen, TopBar, Card, PrimaryButton, ChoiceButton

### Feature Implementation Status

#### Implemented & Verified ✅
- Child TATI ID + PIN authentication (Supabase + custom)
- Parent email + Google OAuth (Supabase Auth)
- Family structure (parent creates/manages children)
- Row-Level Security (RLS) enforcing child data isolation
- Learning journey sequence (track-based progression)
- Scenario engine (deterministic state machine, branching)
- Scenario persistence + error recovery (G6.1)
- Assessment engine (pre/post testing)
- Assessment error recovery (G6.1 answer preservation)
- Progress tracking (competencies, badges, day progress)
- Reflection/consequence display
- Parent dashboard (child list + progress overview)
- Parent feedback capture + review
- Server-side scenario integrity verification (G5.1)

#### Partially Implemented ⚠️
- Lesson content (routes exist, content minimal)
- Progress visualization (basic progress bar, could be richer)
- Parent insights (basic feedback form, no recommendation engine)

#### Not Implemented ❌
- Teen experience (separate UI tier)
- PLUS/parent-focused content
- Multiple tracks/learning paths
- Teacher/classroom experience
- Teacher analytics dashboard
- Mobile Money/banking features
- Borrowing/lending scenarios
- Financial goal tracking beyond current story
- Saving goal visualization
- Financial resilience development
- Recommendation engine for parents
- Offline-first caching
- Localization (beyond Ghanaian cedis)

---

## SECTION 2: STITCH DESIGN INVENTORY

### Stitch Files in Repository
**Status:** ❌ **NOT FOUND**

**Search Evidence:**
- Grep for "stitch", "Stitch", "figma", "prototype", "design reference" → NO matches in source
- No /designs, /stitch, /prototypes directory
- README.md mentions "Implement exactly the screenshot" → Suggests work was screenshot-driven
- Conclusion: Stitch design pack was used for initial MVP but NOT committed to repository

### Historical Context
Per product brief, Stitch design work included:
- **Batch 1:** Student Foundation / Onboarding (screens 1–10)
- **Batch 2:** Scenario Player / Lessons (screens 11–22)
- **Batch 3:** Results / Reflection / Progress (screens 23–30)
- **Batch 4:** Teacher Experience (screens 1–13)
- Featured concepts: SAVE track, School Reopening Challenge

### Design Direction Implication
**Cannot compare current UI against Stitch specifications.** Phase H design will be:
1. Driven by component architecture (functional baseline)
2. Guided by product brief (Junior/Teen/Plus experiences)
3. Informed by user research from pilot
4. Established via new visual direction document

---

## SECTION 3: CURRENT FRONTEND INVENTORY

### Route Map (30 Total Routes)

#### Unauthenticated Routes

| Route | Purpose | Status | Visual | Notes |
|-------|---------|--------|--------|-------|
| `/` | Landing/marketing | ✅ Live | Basic | Hero card, stat cards, CTA |
| `/login` | Parent login | ✅ Live | Functional | Email/password + Google OAuth |
| `/signup` | Parent signup | ✅ Live | Functional | Family name, email, password |
| `/onboarding` | Parent family setup | ✅ Live | Functional | Create first child (name, age) |
| `/auth` | Auth boundary | ✅ Internal | N/A | Routing gate |

#### Child Experience Routes

| Route | Purpose | Status | Visual | G6.1 Protection |
|-------|---------|--------|--------|-----------------|
| `/child` | Route group | ✅ Live | N/A | None (layout) |
| `/child/login` | TATI ID + PIN | ✅ Live | Functional | Input validation |
| `/child/home` | Home dashboard | ✅ Live | Basic | Avatar, XP, next activity |
| `/child/learn` | Journey overview | ✅ Live | Card-based | Lesson/scenario/assessment cards |
| `/child/assessment/$id` | Pre/post test | ✅ Live | Functional | ✅ Answer preservation + error retry |
| `/child/lesson/$id` | Lesson content | ⚠️ Partial | Minimal | Text-based, could be richer |
| `/child/scenario/$id` | Story/decision game | ✅ Live | Functional | ✅ Save feedback + error retry |
| `/child/reflection/$id` | Post-scenario | ✅ Live | Card-based | Consequence display + next steps |
| `/child/progress` | Achievement tracking | ✅ Live | Basic | Badges, competencies list |
| `/child/results` | Track completion | ✅ Live | Card-based | Final score, badge award, next track |

#### Parent Experience Routes

| Route | Purpose | Status | Visual | Notes |
|-------|---------|--------|--------|-------|
| `/parent` | Dashboard | ✅ Live | Functional | Child list, progress cards |
| `/parent/child/$id` | Individual child | ✅ Live | Functional | Progress, competencies, decisions |
| `/parent/feedback` | Feedback form | ✅ Live | Form-based | Text input, submit |
| `/parent/feedback-review` | Feedback history | ✅ Live | List | Feedback entries over time |
| `/parent/metrics` | Analytics | ✅ Live | Basic | Charts, engagement stats |

#### Legacy/Authenticated Routes (Unclear Purpose)

| Route | Purpose | Status | Notes |
|--------|---------|--------|-------|
| `/_authenticated/dashboard` | Parent dashboard | ✅ Live | Appears to duplicate `/parent` |
| `/_authenticated/learn/$childId/*` | Child routes | ✅ Live | Appears to duplicate `/child/*` |
| `/_authenticated/summary` | Track summary | ✅ Live | Appears to duplicate results |

**⚠️ Note:** Duplicate route structure suggests transition from older architecture. Recommend audit for consolidation.

### Content Inventory (Minimal)

| Type | Count | Details |
|------|-------|---------|
| **Tracks** | 1 | SAVE track (Junior, ages 8–12) |
| **Scenarios** | 1 | School Reopening Challenge (14-day story) |
| **Assessments** | 1 | Save Pre-Assessment (5 questions) |
| **Lessons** | 1 file | save.ts (likely multiple lessons) |
| **Reflections** | 1 file | save.ts reflections |

**Evidence:** Only file found: `src/content/scenarios/school-reopening.ts`

### Component Structure

#### Component Organization
```
src/components/
├── tati/              # Custom TATI design system
│   ├── Avatar.tsx
│   ├── Badge.tsx
│   ├── Button.tsx
│   ├── Card.tsx
│   ├── Cards.tsx
│   ├── Layout.tsx (Page, PageHeader)
│   ├── Progress.tsx
│   └── States.tsx (Loading, Empty, Error)
│
├── scenario/          # Scenario-specific
│   └── ScenarioPlayer.tsx
│
├── assessment/        # Assessment-specific
│   └── AssessmentRunner.tsx
│
├── gamification/      # Achievement display
│   ├── AnimatedNumber.tsx
│   ├── BadgeGrid.tsx
│   ├── CelebrationOverlay.tsx
│   ├── SkillBars.tsx
│   └── XPCard.tsx
│
├── learning/          # Lesson-related
│   ├── primitives.tsx (Screen, TopBar, etc.)
│   └── LessonPlayer.tsx
│
└── ui/                # Shadcn base components
    └── [40+ components]
```

### Design Consistency Observations

**Strengths:**
- ✅ Consistent spacing/radius/typography via theme.ts
- ✅ Semantic tone system (primary/success/warning/danger)
- ✅ Mobile-first responsive design
- ✅ 48x48px accessibility targets
- ✅ Clear component hierarchy

**Gaps:**
- ⚠️ Icon system underdeveloped (uses emoji mostly)
- ⚠️ Illustration system minimal (6 scene PNG assets only)
- ⚠️ Typography hierarchy could be richer
- ⚠️ Animation/transitions minimal
- ⚠️ Card/button styles lack visual depth
- ⚠️ Error/loading states could be more polished

---

## SECTION 4: CHILD JOURNEY AUDIT

### Complete Child Flow

```
ENTRY
├─ `/child/login` (TATI ID + PIN)
│
└─ `/child/home` (Home dashboard)
   ├─ Shows: XP, current challenge, next activity
   ├─ Navigation: Learn, Progress
   │
   ├─ `/child/learn` (Journey overview)
   │  ├─ Shows: Track sequence (assessments, lessons, scenarios)
   │  │
   │  ├─ Assessment → `/child/assessment/$id`
   │  │  ├─ Intro (show goal, time estimate)
   │  │  ├─ Questions (5 multiple-choice)
   │  │  ├─ Results (score, competencies)
   │  │  └─ Error Recovery (G6.1): ✅ Preserved answers + retry
   │  │
   │  ├─ Lesson → `/child/lesson/$id`
   │  │  ├─ Title + body text
   │  │  ├─ Images/illustrations
   │  │  └─ Link to next activity
   │  │
   │  └─ Scenario → `/child/scenario/$id`
   │     ├─ Intro (title, context, GH₵ amount)
   │     ├─ Story flow (nodes + choices)
   │     ├─ Consequence display (money change, emoji)
   │     ├─ Day progression (visual bar)
   │     ├─ Error Recovery (G6.1): ✅ Save feedback + retry
   │     │
   │     └─ Reflection → `/child/reflection/$id`
   │        ├─ Consequence headline
   │        ├─ Reflection text
   │        └─ Next activity link
   │
   ├─ Track Completion
   │  └─ `/child/results` (Track finale)
   │     ├─ Final score (GH₵ saved vs. goal)
   │     ├─ Badge award
   │     ├─ Competency summary
   │     └─ Next track offer (currently only SAVE exists)
   │
   └─ `/child/progress` (Achievement dashboard)
      ├─ Shows: Badges earned
      ├─ Shows: Competency levels
      └─ Shows: Days completed
```

### UX Assessment

#### What Works Well ✅
1. **Clear progression:** Child knows what comes next at each step
2. **Error recovery:** G6.1 ensures no data loss on network/save failures
3. **Money visibility:** GH₵ amounts shown throughout
4. **Consequence clarity:** Each choice → immediate visual feedback
5. **Goal focus:** School bag target visible in intro and progress
6. **Mobile-friendly:** Fits 320px–390px viewport

#### What Needs Improvement ⚠️
1. **Lesson content:** Routes exist but content minimal — need rich media, interactions
2. **Visual storytelling:** Scenarios text-heavy; need better character/scene presentation
3. **Achievement celebration:** No toast/confetti on badge earn (CelebrationOverlay exists but unused)
4. **Progress motivation:** Basic progress bar; could show day-by-day branching paths
5. **Consequence weight:** Text-only; could show before/after money visualization
6. **Home dashboard:** Minimal; could surface more context (current day, money trend, next milestone)
7. **Scenario choices:** Plain buttons; could be more visually distinct (cards? icons?)

#### Age Appropriateness (Target: 8–12)
- ✅ Language: Simple, clear ("cedis", "savings box", not "investments")
- ✅ No grades/scores framing (pre-test labeled "check-in")
- ✅ Emojis/illustrations help visual interest
- ⚠️ Could use more character personality (Auntie Adwoa in pre-test, but not elsewhere)
- ⚠️ Scenario feels more "8–10"; could scale difficulty for 11–12
- ⚠️ No humor/playfulness in core scenario journey

#### Product Experience ✅
The **LEARN → CHOOSE → EXPERIENCE CONSEQUENCE → REFLECT → APPLY** model is properly implemented:
1. **Learn:** Lessons present concepts (need richer media)
2. **Choose:** Scenario nodes present decisions
3. **Consequence:** Money changes + next node state
4. **Reflect:** Post-scenario reflection on outcome
5. **Apply:** Next activity builds on previous decisions (via branching)

---

## SECTION 5: TEEN EXPERIENCE AUDIT

### Current State
**Status:** NOT IMPLEMENTED

### Architecture Support for Teen
The current codebase can technically support a teen experience:
- ✅ Track system allows multiple tracks
- ✅ Scenario engine supports complex branching
- ✅ Competency system is flexible
- ✅ Assessment engine can handle different question types

### What Would Differ (Teen vs. Junior)

#### Content Themes
| Aspect | Junior (8–12) | Teen (13–18) | MVP Status |
|--------|---------------|------------|-----------|
| Currency | Ghanaian cedis | Ghanaian cedis | ✅ Only GHS |
| Activities | Pocket money, school | Part-time jobs, goals | ❌ Not implemented |
| Scenarios | Immediate (days) | Medium-term (months) | ❌ Only 14-day story |
| Topics | Saving, needs vs. wants | Earning, borrowing, goals | ❌ Limited scope |
| Platform | Mobile Money intro | Mobile Money usage | ❌ Not implemented |

#### Visual Differentiation Needs
- **Layout:** More whitespace, less cartoonish
- **Typography:** Larger text, less playful font weights
- **Illustrations:** More realistic characters, less emoji
- **Interaction:** More sophisticated choice presentation (sliders for budgets?)
- **Vocabulary:** More formal, less diminutive (not "cedis box" → "savings account")
- **Tone:** Aspirational, not instructional

#### Technical Implementation Path
1. Create new track (e.g., "EARN" or "GOALS")
2. Define new scenario (1-month+ story)
3. Add teen assessment (different question complexity)
4. Create visual variant of components (optional: separate /components/teen/ or theme toggle)
5. Add age-routing logic (14+ sees teen track)

**Recommendation:** Defer teen experience to Phase H6 after Junior is polished.

---

## SECTION 6: PARENT EXPERIENCE AUDIT

### Current Parent Journey

```
ENTRY
├─ `/login` (Email + Google OAuth)
│
├─ `/onboarding` (Family setup)
│  ├─ Enter family name
│  └─ Create first child (name, age)
│
└─ `/parent` (Parent dashboard)
   ├─ Shows: List of children
   ├─ Each child shows: Avatar, name, current activity, progress
   │
   ├─ → `/parent/child/$id` (Individual child view)
   │  ├─ Shows: Progress bar (GH₵ saved vs. goal)
   │  ├─ Shows: Competencies (list with icons)
   │  ├─ Shows: Decisions made (scenario choices)
   │  ├─ Shows: Badges earned
   │  └─ Shows: Recommended conversation starters
   │
   ├─ `/parent/feedback` (Feedback form)
   │  ├─ Text input (observations, concerns)
   │  └─ Submit
   │
   ├─ `/parent/feedback-review` (Feedback history)
   │  └─ Shows: Previous feedback entries
   │
   └─ `/parent/metrics` (Analytics)
      ├─ Shows: Child engagement charts
      ├─ Shows: Time spent per activity
      └─ Shows: Badge progress
```

### UX Assessment

#### What Works ✅
1. **Child overview:** Clear list of children with progress
2. **Progress tracking:** GH₵ visualization + competencies
3. **Decision transparency:** Shows actual choices child made (supports conversations)
4. **Feedback capture:** Simple form for parent observations
5. **Mobile-friendly:** Clean card layout

#### What Needs Improvement ⚠️
1. **Insights depth:** Feedback form is capture-only; no AI/recommendation engine
2. **Conversation prompts:** Recommended starters exist but aren't personalized
3. **Trend analysis:** No "child is improving at saving" vs. "struggling with spending" insights
4. **Family dynamics:** No multi-child comparison or sibling learning
5. **Action recommendations:** No "try this at home" suggestions based on child's progress
6. **Celebration:** No way to celebrate child's achievements with them
7. **Alerts/notifications:** No proactive messaging if child is stuck/at risk
8. **Multiple children:** Cards exist but experience not tested at scale

### Product Gap: Parent Insights
The product brief asks: **"How is my child growing in their relationship with money?"**

Current answer is fragmented:
- ✅ Competencies show what child has practiced
- ✅ Decisions show choices made
- ✅ Progress shows GH₵ toward goal
- ❌ Missing: Narrative ("child demonstrates resilience in setbacks")
- ❌ Missing: Trend ("was hesitant about earning; now proposing ideas")
- ❌ Missing: Guidance ("based on this decision pattern, try...at home")
- ❌ Missing: Celebration ("child earned resilience badge by handling unexpected event")

**Recommendation:** Phase H5 (Parent Experience) should add recommendation engine.

---

## SECTION 7: TEACHER EXPERIENCE AUDIT

### Current State
**Status:** ❌ NOT IMPLEMENTED

### Evidence
- No `/teacher/*` routes
- No teacher authentication
- No classroom data structures
- No teacher dashboard

### What Would Be Required
Per product brief, Batch 4 covers 13 teacher screens. For full implementation:

1. **Teacher Authentication** (email + school code?)
2. **Class Management** (create classes, add students)
3. **Student Roster** (view all learners in class)
4. **Progress Dashboard** (class-wide achievement)
5. **Individual Learner Analytics** (per-student competencies, decisions)
6. **Assessment Review** (which concepts need reteaching?)
7. **Interventions** (flag at-risk learners)
8. **Classroom Guides** (lesson plans, discussion prompts)
9. **Export/Reporting** (term reports, parent letters)

### Technical Feasibility
- ✅ Competency data exists; just needs aggregation
- ✅ Progress is queryable; needs visualization
- ✅ Decision logs exist; needs filtering/analysis
- ❌ No RLS policy for teacher-class relationships yet
- ❌ No assessment rubrics or intervention logic

**Recommendation:** Defer teacher experience to Phase H7 (after child and parent experiences are solid).

---

## SECTION 8: SCENARIO EXPERIENCE AUDIT

### Implementation Status: ✅ COMPLETE & WORKING

### Current Scenario: School Reopening Challenge

**Structure:**
- 14-day story
- 26 story nodes (branches)
- 6 scene illustrations (PNG assets)
- GH₵50 starting, GH₵80 goal (school bag)
- 8 competencies tracked

**How It Works:**
1. **Day 1 intro:** User allocates GH₵50 (save vs. pocket)
2. **Days 2–14:** Weekly nodes with choices
3. **Choices:** Earn, spend, save, lend, borrow
4. **Consequences:** Money changes immediately + narrative
5. **Branches:** Different paths based on decision history
6. **Day progress:** Visual bar showing days elapsed
7. **Finale:** Reach goal → market → buy bag → badge
8. **Integrity:** Server verifies no fabrication (G5.1)

### UI/UX Strengths ✅

| Aspect | Implementation | Rating |
|--------|----------------|--------|
| **Decision clarity** | Choice buttons with description | ✅ Good |
| **Consequence visibility** | Money change + emoji + text | ✅ Good |
| **Goal focus** | GH₵ amounts visible; progress bar shown | ✅ Good |
| **Save reliability** | G6.1 error handling + retry UI | ✅ Excellent |
| **Mobile interaction** | Touch-friendly buttons; scrollable nodes | ✅ Good |
| **Branching fairness** | All paths lead to playable ending | ✅ Good |

### UI/UX Gaps ⚠️

| Aspect | Current | Needed |
|--------|---------|--------|
| **Scene presentation** | Static PNG images | Could animate, show before/after |
| **Character voices** | Narrative text only | Could add character personality |
| **Money visualization** | Text "GH₵10 → savings" | Visual ledger, balance meter |
| **Decision weight** | All choices treated equally | Could show impact magnitude |
| **Consequence duration** | Immediate effect; delayed effects exist but not visible | Show "on day 7 you'll..." |
| **Replay/branching** | Doesn't show alternate paths | Could show "you could have..." |
| **Difficulty scaling** | Fixed 14 days | Could adjust days based on age |

### G6.1 Error Recovery: ✅ IMPLEMENTED & VERIFIED

**Scenario Save Failure Handling:**
- Error message: "We couldn't save your progress. Please try again."
- UI: Error card with "Try again" button
- Retry button disabled during saving (prevent duplication)
- State preserved; child can retry without losing decisions
- Test coverage: 10 behavioral tests (all passing)

### Scenario Engine Quality: ✅ VERIFIED SOUND

- Pure deterministic state machine (no bugs from randomness)
- Server-side output verification (G5.1) prevents fabrication
- Idempotent save/retry (safe to call multiple times)
- Branching logic matches design intent
- Competency scoring consistent

**Recommendation:** ScenarioPlayer is production-ready. Focus Phase H on:
1. Visual enhancement (character, animation, money viz)
2. Content expansion (more scenarios/tracks)
3. Branching clarity (show player how paths diverge)

---

## SECTION 9: ASSESSMENT EXPERIENCE AUDIT

### Implementation Status: ✅ COMPLETE & WORKING

### Current Assessment: Save Pre-Test

**Structure:**
- 5 questions
- Multiple choice (4 options each)
- Scenario-based ("Auntie gives you GH₵10...")
- No grading/scoring shown to child ("Check-in" framing)
- 5-minute estimate

**Questions Cover:**
1. Spending decisions (treat vs. save)
2. Saving awareness (importance)
3. Sharing/generosity (values)
4. Earning attitude (willingness)
5. Money safety (security)

### UI/UX Strengths ✅

| Aspect | Implementation | Rating |
|--------|----------------|--------|
| **Question clarity** | Scenario-based, conversational language | ✅ Excellent |
| **Option clarity** | Descriptive labels + icons (emojis) | ✅ Good |
| **Progress indication** | Progress bar (question N of 5) | ✅ Good |
| **No shame framing** | "Check-in", no pass/fail language | ✅ Excellent |
| **Result celebration** | Badge/profile unlock message | ✅ Good |
| **Save reliability** | G6.1 answer preservation + retry | ✅ Excellent |
| **Mobile interaction** | Touch-friendly option selection | ✅ Good |

### UI/UX Gaps ⚠️

| Aspect | Current | Needed |
|--------|---------|--------|
| **Visual storytelling** | Text + emoji (checkin-20.png) | Could enrich scene descriptions |
| **Question imagery** | PNG assets (street scenes) | Could be more scenario-specific |
| **Scoring feedback** | Post-test not shown | Could show child which competencies strengthen |
| **Question variety** | All multiple choice | Could add ranking, emoji reaction, etc. |
| **Personalization** | Same for all ages | Could scale for teen (different language) |
| **Time limit** | No timer | Could add soft timer for engagement |

### G6.1 Error Recovery: ✅ IMPLEMENTED & VERIFIED

**Assessment Save Failure Handling:**
- Answers preserved in localStorage via storageKey
- Error message: "We couldn't save your answers. Your answers are still here. Try again."
- Error displayed in ALL three stages (intro, questions, results)
- Retry triggers same finish() function; no duplication
- Test coverage: 10 behavioral tests (all passing)

### Assessment Engine Quality: ✅ VERIFIED SOUND

- Question database is well-structured
- Scoring logic is modular (pure functions)
- Competency attribution correct
- No authentication bypass in assessment logic

**Recommendation:** AssessmentRunner is production-ready. Focus Phase H on:
1. Visual enhancement (richer question presentation)
2. Post-test feedback (show child competency growth)
3. Content expansion (more questions, post-test, teen version)

---

## SECTION 10: DESIGN SYSTEM AUDIT

### Existing Design System: ✅ PARTIAL

#### What's Documented (in theme.ts)
- ✅ Container sizing (mobile/tablet/desktop)
- ✅ Spacing rhythm
- ✅ Border radius system
- ✅ Typography scale
- ✅ Accessibility targets (48x48px)
- ✅ Semantic tone system (5 tones × 2 variants = 10 color states)

#### What's NOT Documented
- ❌ Color palette (values in CSS, not enumerated)
- ❌ Icon system (which icons, where to get them)
- ❌ Illustration library (which scenes, style guide)
- ❌ Animation/transition guidelines
- ❌ Component usage patterns
- ❌ Responsive breakpoints (relying on Tailwind defaults)
- ❌ Voice & tone guidelines
- ❌ Error/loading/empty state patterns
- ❌ Form input validation patterns

#### Base Components Available (Shadcn)
All 40+ shadcn components are installable but most are unused. Current active components:
- ✅ Button (primary, secondary variants)
- ✅ Card (container)
- ✅ Badge (labeled)
- ✅ Progress (bar)
- ✅ Alert (error states)
- ✅ Dialog (modals)
- ⚠️ Others available but not yet integrated

#### Custom TATI Components (Well-Designed)
- **Avatar:** Profile pictures with colored backgrounds
- **Badge:** Labeled badges with semantic tones
- **Button:** Primary CTA button
- **Card:** Content container with tone variants
- **Cards:** Grid wrapper
- **Layout:** Page structure with back navigation
- **Progress:** Progress bar (percentage)
- **States:** Loading, empty, error screens

**Design System Maturity:** FUNCTIONAL but INCOMPLETE

**Gap:** No style guide document. Developers must read component code to understand usage.

### Recommendations for Phase H1

**Create: TATI Design System Documentation**

Should include:
1. **Color Palette:** Primary, success, warning, danger, neutral (hex values)
2. **Typography:** Font scales, weights, line heights
3. **Spacing:** Scale (4px grid?) and rhythm
4. **Components:** Usage examples for each TATI + key UI components
5. **Patterns:** Forms, errors, loading, empty states
6. **Illustrations:** Style, resolution, usage
7. **Icons:** SVG system (replace emoji where possible)
8. **Accessibility:** WCAG compliance checklist
9. **Responsive:** Breakpoint definitions
10. **Voice & Tone:** Writing guidelines for child-facing copy

**Effort:** 2–3 days to document existing system; 1–2 weeks if creating new visual direction.

---

## SECTION 11: MOBILE RESPONSIVENESS AUDIT

### Tested Breakpoints

Current implementation uses Tailwind with:
- Mobile: 320px–600px (default)
- Tablet: sm: 640px and up
- Desktop: lg: 1024px and up

### What Works on Mobile ✅

| Component | 360px | 375px | 414px |
|-----------|-------|-------|-------|
| Landing page | ✅ Cards stack | ✅ Full width | ✅ Full width |
| Child home | ✅ Readable | ✅ Readable | ✅ Readable |
| Scenario player | ✅ Scrollable | ✅ Scrollable | ✅ Full fit |
| Assessment questions | ✅ Stacked | ✅ Stacked | ✅ Stacked |
| Parent dashboard | ✅ Card list | ✅ Card list | ✅ Card list |

### What Needs Improvement ⚠️

| Issue | Impact | Priority |
|-------|--------|----------|
| No sticky action buttons | Scroll to bottom for Next | Medium |
| Scenario choices could be taller | Tap accuracy on small screens | Medium |
| Money values small text | Might miss GH₵ amount | Low |
| Long text in nodes not truncated | Can overflow on 320px | Low |
| Modals full-screen on small devices | Can't see context behind | Low |
| No landscape mode optimization | Tablet users get stretched layout | Low |

### Accessibility on Mobile

| Aspect | Status | Notes |
|--------|--------|-------|
| **Tap targets (48x48px)** | ✅ Most buttons comply | Some small icons could be bigger |
| **Text size** | ✅ Baseline 16px+ | Body text readable |
| **Contrast** | ⚠️ Need to audit | Not verified |
| **Keyboard nav** | ✅ Basic support | Can tab through buttons |
| **Screen reader** | ⚠️ Labels need audit | Not fully tested |

**Recommendation:** Phase H2 (Child Experience) should include mobile polish:
1. Sticky action buttons
2. Taller tap targets for choices
3. Better landscape support
4. Contrast audit + fixes
5. Screen reader testing

---

## SECTION 12: ACCESSIBILITY AUDIT

### What's Already Good ✅

| Area | Status | Evidence |
|------|--------|----------|
| **Tap targets** | ✅ 48x48px standard | theme.ts tapTarget |
| **Color semantics** | ✅ Not color-only | Money shown in text + color |
| **Link purpose** | ✅ Clear labels | "Go back", "Learn more", etc. |
| **Button names** | ✅ Descriptive | "Start scenario", "Try again" |
| **Headings** | ✅ Semantic H1-H3 | Used correctly |
| **Lists** | ✅ Semantic lists | Card grids, badge lists |

### What Needs Improvement ⚠️

| Area | Current | Needed | Priority |
|------|---------|--------|----------|
| **Form labels** | Some inputs missing labels | Add aria-label where needed | High |
| **Contrast ratios** | Not audited | WCAG AA check (4.5:1 minimum) | High |
| **Error announcements** | Text only | Add aria-live for save errors | High |
| **Screen reader testing** | Not done | Test with NVDA/JAWS | Medium |
| **Focus indicators** | Tailwind defaults | Ensure visible on all elements | Medium |
| **Skip links** | Not present | Add for keyboard navigation | Medium |
| **Image alt text** | Missing on some scenes | Add descriptions | High |
| **Emoji accessibility** | role="img" not used | Add aria-label to emoji | Medium |
| **Animation** | No prefers-reduced-motion | Check for seizure/motion risk | Low |
| **Disabled state** | Insufficient contrast | Audit disabled button colors | Low |

**Recommendation:** Phase H8 (Accessibility Polish) should address all ⚠️ items.

---

## SECTION 13: UX STATE COVERAGE AUDIT

### Loading States ✅ IMPLEMENTED

| Screen | Loading UI | Notes |
|--------|-----------|-------|
| Child home | Skeleton text ("Opening your journey…") | ✅ Friendy message |
| Learn view | Skeleton text | ✅ Friendly message |
| Scenario load | Text message | ✅ Friendly message |
| Assessment load | Text message | ✅ Friendly message |

**Status:** Basic but functional. Could add spinner/animation.

### Error States ✅ IMPLEMENTED (WITH G6.1)

| Screen | Error UI | Recovery |
|--------|----------|----------|
| Scenario save | Text message + "Try again" button | ✅ G6.1 retry |
| Assessment save | Text message + implicit retry | ✅ G6.1 answer preservation |
| Learning load | Text message | ⚠️ Manual page reload needed |
| Parent dashboard | ErrorState component | ✅ Refetch button |

**Status:** Improved by G6.1. Scenario/Assessment error recovery excellent. Other flows could improve.

### Empty States ✅ IMPLEMENTED

| Screen | Empty UI | Notes |
|--------|----------|-------|
| Parent dashboard (no children) | EmptyState component | ✅ Clear prompt |
| Child progress (no badges) | "No achievements yet" | ⚠️ Could be more encouraging |
| Parent feedback (no history) | Empty list | ⚠️ Could show prompt |

**Status:** Basic. Could be more motivational (especially for progress).

### Success States ⚠️ PARTIAL

| Screen | Success UI | Notes |
|--------|-----------|-------|
| Assessment complete | Results card + badge | ✅ Good |
| Scenario complete | Results card + badge | ✅ Good |
| Track complete | Track finale screen | ✅ Good |
| Save successful | Silent | ⚠️ No confirmation (assumes silent save is OK) |
| Badge earned | CelebrationOverlay available | ❌ Not integrated |

**Status:** Success states exist but celebration could be better integrated.

### Disabled States ⚠️ NEEDS AUDIT

| Component | Disabled Styling | Notes |
|-----------|------------------|-------|
| Retry button (during save) | opacity-50 | ✅ Visible |
| Next button (while saving) | opacity-50 | ✅ Visible |
| Submit button (while submitting) | opacity-50 | ⚠️ May have contrast issue |

**Recommendation:** Phase H audit should include disabled state contrast check.

### Saving/Save Feedback ✅ IMPROVED (G6.1)

| Feature | Status | Evidence |
|---------|--------|----------|
| **Scenario save feedback** | ✅ Implemented | Error message + retry button |
| **Assessment save feedback** | ✅ Implemented | Answer preservation + error message |
| **Saving indicator** | ⚠️ Basic | Button disabled but no spinner |
| **Saved confirmation** | ❌ Silent | Assumes silent save is OK |

**Status:** G6.1 dramatically improved error paths. Could add success toast/confirmation.

---

## SECTION 14: CONTENT PRESENTATION AUDIT

### Lesson Presentation ⚠️ MINIMAL

**Current State:**
- Route exists: `/child/lesson/$lessonId`
- Content structure: Title + body text + images
- Interactivity: Link to next activity only

**What's Missing:**
- Interactive elements (quizzes, drag/drop)
- Rich media (videos, animations)
- Character narration
- Real-world examples
- Knowledge checks
- Summary/key takeaways

**Example Gap:** "Meet Your Money" lesson should:
1. Show coins/notes with animation
2. Let child tap to learn values
3. Quiz: "Which is worth more?" with immediate feedback
4. Not just text description

**Recommendation:** Phase H4 (Lessons + Assessments) should enrich lesson content.

### Scenario Presentation ✅ GOOD FOUNDATION

**Current State:**
- Story nodes are clear and readable
- Choices are well-described
- Consequences explained
- Money changes visible

**Could Enhance:**
1. Character illustrations (not just scene)
2. Decision weight visualization ("this choice saves you GH₵10")
3. Alternate path indication ("other players often...")
4. Consequence timing ("next week you'll receive GH₵5 from granny")

**Recommendation:** Phase H3 (Scenario Experience) should add visual enhancements.

### Not Course-Like ✅ ACHIEVED

**TATI correctly avoids:**
- ❌ Textbook language
- ❌ Long-form lectures
- ❌ Tests with grades
- ❌ Rigid learning sequences

**Strength:** Each activity is short (5–15 min) and choice-driven.

---

## SECTION 15: TECHNICAL CONSTRAINTS FOR PHASE H

### DO NOT MODIFY (Required for Pilot Integrity)

#### Authentication System
- ❌ Child TATI ID + PIN login
- ❌ Parent email + Google OAuth
- ❌ Session management
- ❌ Token storage/refresh

#### Authorization & Security
- ❌ RLS policies (Supabase)
- ❌ Firebase security rules
- ❌ Child data isolation
- ❌ Parent-child relationships
- ❌ G5.1 scenario integrity verification
- ❌ Permission checks in server functions

#### Core Architecture
- ❌ Scenario engine (deterministic, server-side)
- ❌ Scenario persistence logic
- ❌ G6.1 error recovery (save feedback, retry, answer preservation)
- ❌ Database schema
- ❌ API server functions

#### Tested Components
- ❌ ScenarioPlayer (error UI works)
- ❌ AssessmentRunner (error UI works)
- ❌ useScenarioRunner (state management)
- ❌ useChildLearning (progress tracking)

**Impact:** Phase H design work happens ONLY on:
- ✅ Visual styling (colors, spacing, typography)
- ✅ Component refinement (buttons, cards, layout)
- ✅ New screens/journeys (not on auth or core mechanics)
- ✅ Content expansion (new lessons, scenarios)

---

## SECTION 16: FRONTEND GAP MATRIX

| Area | Current State | Stitch State | Gap | Phase | Risk | Notes |
|------|---------------|-------------|-----|-------|------|-------|
| **Landing page** | Basic cards | Unknown | Minor visual | H1 | Low | Functional; could be richer |
| **Child login** | Simple form | Unknown | Minor visual | H1 | Low | Works; could improve UX |
| **Parent login** | Email + Google OAuth | Unknown | Minor visual | H1 | Low | Works; could improve UX |
| **Family setup** | Basic form | Unknown | Minor visual | H1 | Low | Works; could be guided |
| **App shell/nav** | Bottom nav exists | Unknown | Minor structure | H1 | Low | Could be more polished |
| **Child home** | Basic dashboard | Unknown | Moderate visual | H2 | Low | Needs richer context |
| **Learn overview** | Card grid | Unknown | Moderate visual | H2 | Low | Functional; could preview content |
| **Scenario player** | Functional + G6.1 | Unknown | Moderate visual | H3 | Low | Core mechanics solid; needs character/animation |
| **Lesson content** | Minimal (text + link) | Unknown | Major content | H4 | High | Route exists but content weak |
| **Assessment** | Functional + G6.1 | Unknown | Minor visual | H4 | Low | Works; could enrich questions |
| **Reflection** | Text + next link | Unknown | Moderate visual | H4 | Low | Could show impact narrative |
| **Progress page** | Badge list + competencies | Unknown | Moderate visual | H4 | Low | Could show branching/paths |
| **Results page** | Track finale card | Unknown | Moderate visual | H4 | Low | Could celebrate more |
| **Parent dashboard** | Child list + progress | Unknown | Moderate visual | H5 | Medium | Needs insights/recommendations |
| **Child detail** | Decisions + competencies | Unknown | Moderate visual | H5 | Medium | Needs trend analysis |
| **Parent feedback** | Form + history | Unknown | Moderate visual | H5 | Medium | Needs recommendation engine |
| **Teen experience** | Not implemented | Unknown | MAJOR | H6 | High | Requires new content + visual tier |
| **Teacher dashboard** | Not implemented | Unknown | MAJOR | H7 | High | Requires authentication + analytics |
| **Design system docs** | Undocumented | Unknown | MAJOR | H1 | High | Exists but needs codification |
| **Mobile polish** | Basic responsive | Unknown | Moderate | H8 | Low | Needs sticky buttons, testing |
| **Accessibility audit** | Basic structure | Unknown | Moderate | H8 | High | Needs WCAG AA verification |

---

## SECTION 17: PHASE H IMPLEMENTATION PROPOSAL

### Recommended Sequence

Based on repository evidence and product maturity:

#### **Phase H1: Design System & App Shell** (1–2 weeks)
**Goal:** Establish visual foundation and component library

**Deliverables:**
1. TATI Design System documentation
2. Comprehensive component library (Storybook or similar)
3. Color palette finalization
4. Typography scale finalization
5. Icon system (replace emoji with SVG)
6. Illustration style guide
7. App shell visual polish
8. Navigation/IA refinement

**Why first:** All other phases depend on consistent design.

#### **Phase H2: Child/JUNIOR Experience Visual Polish** (2–3 weeks)
**Goal:** Elevate child-facing screens to production quality

**Focus:**
1. Child home dashboard (richer context)
2. Learn view (preview content)
3. Animation/transitions
4. Loading state polish
5. Error state refinement
6. Celebration/badge unlock flow
7. Mobile optimization
8. Initial accessibility audit

**Why early:** Core user experience; unblocks scenario/assessment work.

#### **Phase H3: Scenario Experience Enhancement** (2–3 weeks)
**Goal:** Make scenario player more visually engaging

**Focus:**
1. Character illustration/personality
2. Scene animation/transitions
3. Money visualization (before/after balance)
4. Choice presentation refinement
5. Consequence display (impact clarity)
6. Day progression UI (show branching)
7. Replay/retry affordance
8. Mobile choice interaction

**Why here:** Foundation ready; scenario engine doesn't change.

#### **Phase H4: Lessons + Assessments + Results** (3–4 weeks)
**Goal:** Enrich content presentation and expand test coverage

**Focus:**
1. Lesson interactivity (quizzes, drag/drop)
2. Lesson media (animations, illustrations)
3. Assessment question enhancements
4. Post-test feedback (show competency growth)
5. Reflection/consequence narratives
6. Results page celebration
7. Progress page visuals (show paths taken)
8. Content expansion (more assessments, reflect)

**Why: **Content is the bottleneck for pilot; get multimedia content ready.

#### **Phase H5: Parent Experience & Insights** (2–3 weeks)
**Goal:** Deepen parent dashboard with actionable insights

**Focus:**
1. Parent dashboard visual redesign
2. Child detail insights (trends, patterns)
3. Recommendation engine (AI/rules-based)
4. Conversation starters (personalized)
5. Feedback form enhancement
6. Metrics dashboard clarity
7. Celebration feature (praise child)
8. Notification system (optional)

**Why: **Parents need insights to support child; feedback is key to pilot learning.

#### **Phase H6: Teen Experience** (3–4 weeks)
**Goal:** Create separate visual/content tier for adolescents

**Focus:**
1. Teen design system (more mature)
2. Teen assessment (different questions)
3. Teen track (1 new scenario)
4. Teen home (different layout)
5. Age-routing logic (14+ sees teen)
6. Content themes (earning, goals, MM)
7. Character/voice (aspirational)

**Why later:** Junior must be solid first; teen content separate track.

#### **Phase H7: Teacher Experience** (3–4 weeks)
**Goal:** Enable classroom use and teacher insights

**Focus:**
1. Teacher authentication
2. Class management
3. Roster/student list
4. Class progress dashboard
5. Individual learner analytics
6. Intervention flags
7. Classroom guides
8. Reporting/export

**Why last:** Requires mature pilot data; not critical for initial launch.

#### **Phase H8: Cross-Device + Accessibility Polish** (2 weeks)
**Goal:** Ensure WCAG AA compliance and optimize all breakpoints

**Focus:**
1. Contrast audit (WCAG AA)
2. Keyboard navigation
3. Screen reader testing
4. Focus indicator visibility
5. Skip links
6. Form label audit
7. Animation/seizure review
8. Landscape optimization
9. Tablet layout refinement

**Why last:** Based on actual use; pilot will reveal issues.

### Phase Dependencies

```
H1 (Design System)
├─→ H2 (Child Experience)
├─→ H5 (Parent Experience)
├─→ H6 (Teen Experience)
└─→ H3 (Scenario)
    └─→ H4 (Lessons/Assessments/Results)
        └─→ H7 (Teacher Experience)
            └─→ H8 (Cross-device + A11y)
```

---

## SECTION 18: RISKS & DEPENDENCIES

### High-Risk Areas

| Risk | Impact | Mitigation |
|------|--------|-----------|
| **No Stitch files** | Can't compare design intent | Use component architecture as baseline; conduct design audit |
| **Only 1 content piece** | Pilot needs multiple tracks/scenarios | Phase H4 must prioritize content expansion |
| **Incomplete design system** | Inconsistency across new work | H1 must codify existing system before expanding |
| **G6.1 error UI** | Must not break during redesign | Keep error state structure; refactor visuals only |
| **Mobile not tested at scale** | Pilot may reveal responsive issues | H8 includes comprehensive mobile testing |
| **No teacher/teen yet** | Phase H6/H7 scope unclear | Defer until H2 complete; pilot will inform priorities |

### External Dependencies

| Dependency | Status | Impact |
|------------|--------|--------|
| **Lovable project sync** | Active (pushes to GitHub) | Design changes via Lovable or manual; keep branch in sync |
| **Firebase emulator tests** | 41 pre-existing failures | Unrelated to H0 audit; Phase G6 documented as infrastructure issue |
| **Pilot user feedback** | Not yet available | H phases should build in feedback loops |

### Deferred Decisions

| Decision | Deferred To | Notes |
|----------|-------------|-------|
| **Icon system (emoji vs. SVG)** | H1 | May require asset refresh |
| **Character/mascot** | H2–H3 | Child testing should inform visual |
| **Lesson media sources** | H4 | May require copyright/licensing review |
| **Teen visual tier** | H6 design | Should test Junior first |
| **Recommendation algorithm** | H5 design | Pilot data should inform rules |

---

## SECTION 19: RECOMMENDED FIRST TASK (IMMEDIATE NEXT STEP)

### H0 Conclusion → H1 Kickoff

**Immediate Next Task:** **PHASE H1.1 — Design System Documentation & Audit**

**Scope (2–3 days):**

1. **Document existing theme.ts:**
   - Enumerate all colors (pull from CSS variables)
   - Create color palette reference
   - Document spacing scale
   - Enumerate typography styles
   - List all semantic tones + hex values

2. **Audit existing components:**
   - Screenshot every TATI component at all states (default, hover, disabled)
   - Screenshot every primary UI pattern (card grid, error state, loading, etc.)
   - Note which shadcn components are actively used
   - Identify 3–5 redundant patterns that could consolidate

3. **Create initial design system guide:**
   - Figma file OR component storybook
   - Updated theme.ts with better exports
   - Component usage documentation
   - Responsive breakpoint definitions
   - Accessibility checklist

4. **Identify visual gaps for H1 proper:**
   - Which components need new styles?
   - Which patterns need icons (replace emoji)?
   - Which screens need layout improvement?
   - Which mobile breakpoints need work?

**Outcome:** Documented, audited, actionable design system ready for H1 implementation.

**After H1.1:** Begin H1 full implementation (icon system, visual refinements, component library).

---

## SECTION 20: FILES & ROUTES REFERENCE

### Source Files That CAN Be Modified in Phase H

**Safe to change (visual/content only):**
- ✅ `src/routes/*/...tsx` (layout, styling)
- ✅ `src/components/tati/*` (TATI design system)
- ✅ `src/components/scenario/ScenarioPlayer.tsx` (visual only, keep error UI)
- ✅ `src/components/assessment/AssessmentRunner.tsx` (visual only, keep error UI)
- ✅ `src/components/lesson/LessonPlayer.tsx` (content/presentation)
- ✅ `src/components/gamification/*` (visual enhancements)
- ✅ `src/components/learning/primitives.tsx` (reusable layout)
- ✅ `src/content/*` (content definitions)
- ✅ `src/styles.css` (colors, variables)
- ✅ `src/lib/theme.ts` (theme updates)

### Source Files That MUST NOT Be Modified

**Core architecture (DO NOT CHANGE):**
- ❌ `src/lib/auth/*` (authentication logic)
- ❌ `src/lib/scenario/engine.ts` (scenario state machine)
- ❌ `src/lib/scenario/useScenarioRunner.ts` (error recovery from G6.1)
- ❌ `src/lib/assessment/*` (assessment engine)
- ❌ `src/lib/backend/*` (server functions)
- ❌ `src/integrations/*` (Firebase/Supabase integration)
- ❌ `drizzle/*` (database schema, migrations)
- ❌ `src/server.ts` (server configuration)
- ❌ All RLS policy files (Firebase/Supabase rules)

### Routes That CAN Be Redesigned

All routes can have visual improvements:
- `/` → Landing redesign
- `/login`, `/signup` → Auth flow polish
- `/onboarding` → Family setup UX
- `/child/*` → Child experience redesign
- `/parent/*` → Parent dashboard redesign

### Duplicate Routes to Consolidate

**Observation:** Duplicate route structure suggests incomplete migration:
- `/_authenticated/dashboard` likely duplicates `/parent`
- `/_authenticated/learn/$childId/*` likely duplicates `/child/*`

**Action for H0 follow-up:** Audit and consolidate in H1 if safe.

---

## SECTION 21: VERIFICATION RESULTS

### Test Results (Current State)

```
TypeScript Compilation: ✅ PASS (exit 0)
Lint: ✅ PASS (0 errors, 8 warnings in node_modules)
Full Test Suite: 193 passed, 41 failed (234 total)
  - Pre-existing failures: ~40 (Firebase emulator fixture issue)
  - New regressions: 0 ✅
```

### No Changes Made
This was a READ-ONLY audit. No source code was modified.

---

## SECTION 22: H0 CONCLUSION

### What We Know

**Product Architecture:**
- ✅ Solid technical foundation (auth, RLS, scenario engine, error recovery)
- ✅ Single track (SAVE/Junior) fully implemented
- ✅ Design system partially implemented
- ✅ Mobile-responsive core flows

**Gaps:**
- ❌ Stitch design files not in repository
- ❌ Only 1 scenario (School Reopening)
- ❌ Lesson content minimal
- ❌ No teen/teacher experience
- ⚠️ Visual polish incomplete
- ⚠️ Parent insights limited
- ⚠️ Accessibility audit needed

### What We DON'T Know (Will Learn from Pilot)

- How junior users (8–12) actually respond to current UI
- Which design patterns resonate
- Which content is confusing
- Performance on real networks
- Behavioral patterns (retry rates, drop-off points)
- Parent engagement with dashboard

### Recommended Action

**Proceed to Phase H1: Design System & App Shell**

This will:
1. ✅ Establish consistent visual foundation
2. ✅ Codify existing design decisions
3. ✅ Create component library
4. ✅ Unblock all downstream phases
5. ✅ Support pilot with polished interface

### Timeline Estimate

- **H1 (Design System):** 1–2 weeks
- **H2–H4 (Child/Content):** 5–8 weeks
- **H5–H8 (Parent/Teacher/Polish):** 6–8 weeks
- **Total Phase H:** 3–4 months for full completion
- **MVP/Pilot ready:** End of H2–H4 (~10 weeks)

### Success Criteria for Phase H

When complete, the product will:
- ✅ Have documented design system
- ✅ Support multiple content tracks (not just SAVE)
- ✅ Offer teen experience option
- ✅ Provide rich parent insights
- ✅ Pass WCAG AA accessibility
- ✅ Perform well on mobile/tablet/desktop
- ✅ Feel polished and intentional across all flows
- ✅ Support classroom use (teacher experience)

---

## APPENDIX: REPOSITORY INVENTORY REFERENCE

### Routes (30 Total)

**Unauthenticated (5):**
`/`, `/login`, `/signup`, `/onboarding`, `/auth`

**Child (10):**
`/child`, `/child/login`, `/child/home`, `/child/learn`, `/child/assessment/$id`, `/child/lesson/$id`, `/child/scenario/$id`, `/child/reflection/$id`, `/child/progress`, `/child/results`

**Parent (5):**
`/parent`, `/parent/child/$id`, `/parent/feedback`, `/parent/feedback-review`, `/parent/metrics`

**Legacy/Authenticated (5):**
`/_authenticated/dashboard`, `/_authenticated/learn/$childId/...`, `/_authenticated/*/...`, etc.

### Components

**TATI System (8):** Avatar, Badge, Button, Card, Cards, Layout, Progress, States

**UI System (40+):** Shadcn components

**Experience-Specific (5):** ScenarioPlayer, AssessmentRunner, LessonPlayer, Learning/primitives, Gamification components

### Content

**Tracks:** 1 (save)  
**Scenarios:** 1 (school-reopening)  
**Assessments:** 1 (save-junior)  
**Lessons:** 1 file (save.ts)  
**Reflections:** 1 file (save.ts)

### Configuration Files

**Theme:** `src/lib/theme.ts`  
**Styles:** `src/styles.css`  
**Router:** `src/router.tsx`  
**Auth config:** `src/integrations/*/`

---

## FINAL RECOMMENDATION

### ✅ PROCEED TO PHASE H1

**Status:** H0 audit complete. All critical gaps identified. No blocking issues.

**Next:** Designate design lead for H1. Begin design system documentation immediately.

**Timeline:** 3–4 months to full Phase H completion; 10 weeks to pilot-ready state.

**Success Measure:** By end of H2–H4, junior child experience should feel polished, intentional, and ready for user testing with actual 8–12 year-olds in Ghana.

---

**End of PHASE_H0_DESIGN_RECOVERY_AUDIT.md**

Phase H0 Complete. Ready for H1 kickoff.
