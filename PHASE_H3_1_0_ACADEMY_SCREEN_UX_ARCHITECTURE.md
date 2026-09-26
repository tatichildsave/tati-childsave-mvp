# PHASE H3.1.0 — TATI ACADEMY SCREEN & UX ARCHITECTURE
**Status:** READ-ONLY UX/PRODUCT ARCHITECTURE PHASE  
**Date:** 2026-09-26  
**Scope:** Complete Academy information architecture, screen design, component specification  
**Deliverable:** Definitive MVP screen set and UX patterns for H3.1+ implementation  

---

## EXECUTIVE SUMMARY

### What Academy Is

**Academy is the facilitator experience within the TATI connected ecosystem.** It enables teachers/community educators to deliver TATI effectively in group settings (schools, classrooms, learning centers).

**NOT:**
- ❌ An analytics dashboard
- ❌ A generic LMS
- ❌ A surveillance system
- ❌ A grading platform
- ❌ A parent-teacher communication tool

**IS:**
- ✅ A facilitator support system for daily class management
- ✅ A learner monitoring dashboard (read-only, for support)
- ✅ A session planning and debrief tool
- ✅ A bridge between teacher delivery and learner autonomy

### Core Question Academy Answers

> **"What should I do today with my learners?"**

Every screen, every feature, every component serves this primary question.

### Design Philosophy

**Principle 1: Clarity Over Comprehensiveness**  
Facilitators are educators, not data analysts. Three key metrics beat fifty detailed charts.

**Principle 2: Support Over Judgment**  
Facilitators use Academy to help learners, not to evaluate them. All signals are neutral ("needs support" not "failing").

**Principle 3: Autonomy Over Control**  
Children make their own choices in scenarios. Facilitators guide discussion and context, not outcomes.

**Principle 4: Privacy Over Access**  
Facilitators see enough to teach; never see parent relationships or family data.

---

## SECTION 1: INFORMATION ARCHITECTURE

### 1.1 Navigation Hierarchy (MVP)

Academy contains **9 core screens** organized in a primary navigation model:

```
/academy
├─ /login                    ← Facilitator login
├─ /dashboard               ← Primary entry point (if logged in)
│  └─ Quick actions to:
│     ├─ Start today's session
│     ├─ View my cohorts
│     └─ Check at-risk learners
├─ /cohorts                 ← List of assigned cohorts
├─ /cohorts/{cohortId}      ← Cohort overview + learner roster
├─ /cohorts/{cohortId}/learner/{childId}
│                           ← Individual learner profile
├─ /cohorts/{cohortId}/curriculum
│                           ← Track structure and activities
├─ /cohorts/{cohortId}/curriculum/activity/{itemId}
│                           ← Session guide (before session)
├─ /cohorts/{cohortId}/session/active/{sessionId}
│                           ← Session monitoring (during session)
├─ /cohorts/{cohortId}/session/debrief/{sessionId}
│                           ← Session review (after session)
└─ /profile                 ← Facilitator account settings
```

### 1.2 Information Architecture Rationale

**Why these screens?**

| Screen | Serves | Question It Answers |
|--------|--------|---|
| **Dashboard** | Primary entry | What should I do today? Where's the quickest action? |
| **Cohorts** | Overview | Which classes do I teach? |
| **Cohort Overview** | Class context | Who's in this cohort? How are they progressing? |
| **Learner Profile** | Individual support | How is this learner doing? What do they need? |
| **Curriculum** | Activity planning | What activities does this cohort have? In what order? |
| **Session Guide** | Preparation | How should I facilitate today's activity? |
| **Active Session** | Live monitoring | Who's completed? Who needs support? |
| **Session Debrief** | Reflection | What happened? What's next? |
| **Profile** | Account | My login, my information |

### 1.3 What's NOT in MVP

**NOT INCLUDED:**
- ❌ Lesson authoring interface
- ❌ Curriculum builder or drag-and-drop
- ❌ Detailed analytics dashboard
- ❌ Parent-teacher messaging
- ❌ Attendance tracking/marking
- ❌ Facilitator performance metrics
- ❌ Advanced scheduling tools
- ❌ Multi-school administration

---

## SECTION 2: ACADEMY SHELL ARCHITECTURE

### 2.1 Desktop Shell (Primary Experience)

**Layout Model:**

```
┌─────────────────────────────────────────────────────────────────┐
│  ACADEMY HEADER                                                 │
│  Logo    Breadcrumb / Title              Profile  Logout        │
├─────────────────────────────────────────────────────────────────┤
│     │                                                            │
│ SIDEBAR  MAIN CONTENT                                           │
│     │    (Responsive grid, 1-2 columns)                         │
│     │                                                            │
│  Dashboard                                                      │
│  My Cohorts                                                     │
│  My Profile                                                     │
│     │                                                            │
│     └─ Cohort 1 (Grade 5A)                                     │
│     └─ Cohort 2 (Grade 5B)                                     │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 2.2 Header Structure

**Left:** TATI logo (clickable to /academy/dashboard)
**Center:** Breadcrumb trail + page title
**Right:** 
- Facilitator name / school
- Profile icon (click → /academy/profile)
- Logout button

**Example:**
```
TATI    Home / Grade 5A / Learner Details         Kofi Mensah    Sign out
```

### 2.3 Sidebar (Desktop + Tablet)

**Sticky left sidebar (200-240px width):**

```
┌─ ACADEMY ────────────┐
├─ Dashboard           │
├─ My Cohorts          │
│  ├─ Grade 5A         │
│  ├─ Grade 5B         │
│  └─ (inactive: ≤5)   │
├─ ──────────────      │
├─ My Profile          │
├─ Help & Docs         │
└───────────────────────┘
```

**Behavior:**
- Expand on hover to show full text
- Current section highlighted
- Cohort list auto-expands if only 1-2 cohorts
- Collapse to icons on screens < 1024px
- Hidden on mobile (hamburger menu instead)

### 2.4 Mobile/Tablet Adaptations

**Tablet (768px-1024px):**
- Sidebar collapses to icons
- Main content expands
- Bottom navigation appears for key actions
- Cohort navigation moves to primary content area

**Mobile (< 768px):**
- Hamburger menu (no persistent sidebar)
- Full-width main content
- Bottom navigation with 3-4 primary actions:
  - Dashboard
  - My Cohorts
  - Profile
  - (Cohort-specific nav if in cohort view)

### 2.5 Bottom Navigation (Mobile + Tablet)

**Mobile bottom nav (4 items):**
```
┌─────────────────────────────────────┐
│ Dashboard  |  Cohorts  |  Profile   │
└─────────────────────────────────────┘
```

**Context-aware:** If viewing a cohort, bottom nav includes:
```
┌─────────────────────────────────────────┐
│ Overview  |  Learners  |  Curriculum   │
└─────────────────────────────────────────┘
```

### 2.6 Breadcrumbs

**Format:** Home / Cohort / Page / Optional Detail

**Examples:**
```
Home / My Cohorts
Home / Grade 5A
Home / Grade 5A / Learner Details
Home / Grade 5A / Session / Active
```

**Behavior:**
- Clickable navigation (each level is a link)
- Ellipsis (...) if breadcrumb is too long
- Not shown on mobile (replaced with back button)

### 2.7 Page Title Hierarchy

**H1 (28px, extrabold):** Primary page title  
**H2 (20px, bold):** Section headers  
**H3 (16px, semibold):** Subsection headers  
**Label (12px, uppercase, tracking-widest):** Eyebrow/category

**Example Dashboard:**
```
[Dashboard icon] ← Eyebrow: "Today"
What should I do today?  ← H1: Page title
"Grade 5A · Days 1–2 scenario ready to go" ← Subtitle
```

### 2.8 Status & Notification Areas

**Alert locations (in priority order):**

1. **Top banner** — Critical alerts (e.g., "Cohort full, can't add learners")
2. **Session header** — Session-specific info (e.g., "3/25 learners not started")
3. **Card badges** — Status indicators (e.g., "At-risk", "Needs attention")
4. **Empty/error states** — Page-level messaging

**Tone:** Never use red for learner data. Use:
- ✅ Green: Success, completion
- ⚠️ Yellow/Amber: Needs attention, incomplete
- 🔵 Blue: Info, neutral status
- ❌ Red: System errors only (not learner performance)

### 2.9 Loading States

**Full page load:**
```
┌─────────────────────────────────────┐
│ [Skeleton Header]                   │
│                                     │
│ [Skeleton Card]  [Skeleton Card]   │
│                                     │
│ [Skeleton Card]  [Skeleton Card]   │
└─────────────────────────────────────┘
```

**Incremental load:**
```
[Header] Loaded
[Primary content area] Skeleton, then real
[Secondary info] Loads after primary
```

**Progressive disclosure:** Show most important info first (facilitator's immediate need), secondary data loads after.

### 2.10 Error States

**Network error example:**
```
┌──────────────────────────────────────┐
│ ⚠️  Can't load cohort                 │
│ Check your connection and try again. │
│ [Retry] button                       │
└──────────────────────────────────────┘
```

**Permission denied example:**
```
┌──────────────────────────────────────┐
│ 🔒 You don't have access             │
│ You're not assigned to this cohort.  │
│ [Go back] button                     │
└──────────────────────────────────────┘
```

### 2.11 Empty States

**Empty cohorts list:**
```
┌────────────────────────────────────┐
│ 🏫 No cohorts yet                  │
│ You aren't assigned to any         │
│ classes yet. Check with your       │
│ administrator.                     │
└────────────────────────────────────┘
```

**Empty session results (first session of cohort):**
```
┌────────────────────────────────────┐
│ 📊 No sessions yet                 │
│ You haven't facilitated any        │
│ sessions with this cohort yet.     │
│ Start with: Days 1–2 activity →   │
└────────────────────────────────────┘
```

---

## SECTION 3: COMPLETE SCREEN INVENTORY

### 3.1 Screen List with Data Requirements

| # | Screen | Route | Purpose | Key Data | Users | Mobile |
|---|--------|-------|---------|----------|-------|--------|
| 1 | Academy Login | `/academy/login` | Facilitator authentication | None | Unauthenticated | ✅ |
| 2 | Dashboard | `/academy/dashboard` | Primary entry point | Cohorts, today's activity, at-risk | Facilitators | ✅ |
| 3 | My Cohorts | `/academy/cohorts` | List assigned cohorts | All facilitator's cohorts | Facilitators | ✅ |
| 4 | Cohort Overview | `/academy/cohorts/{cohortId}` | Class context | Cohort, learners, progress, schedule | Facilitators | ✅ |
| 5 | Learner Roster | Part of Cohort Overview | Learner table | All enrolled learners, status | Facilitators | ⚠️ |
| 6 | Learner Profile | `/academy/cohorts/{cohortId}/learner/{childId}` | Individual learner | Progress, assessments, competencies | Facilitators | ✅ |
| 7 | Curriculum View | `/academy/cohorts/{cohortId}/curriculum` | Activity sequence | Track structure, activities, schedule | Facilitators | ✅ |
| 8 | Session Guide | `/academy/cohorts/{cohortId}/curriculum/activity/{itemId}` | Facilitation prep | Activity objectives, guide, tips | Facilitators | ✅ |
| 9 | Active Session | `/academy/cohorts/{cohortId}/session/active/{sessionId}` | Live monitoring | Participation, progress, facilitator actions | Facilitators | ⚠️ |
| 10 | Session Debrief | `/academy/cohorts/{cohortId}/session/debrief/{sessionId}` | Reflection & review | Session outcomes, insights, next steps | Facilitators | ✅ |
| 11 | Profile | `/academy/profile` | Account settings | Name, email, school, cohorts | Facilitators | ✅ |

---

## SECTION 4: DASHBOARD SPECIFICATION

### 4.1 Dashboard Purpose

**Primary question:** "What should I do today?"

**Secondary questions:**
- Which cohort should I work with?
- What's next in the programme?
- Is anyone struggling?

### 4.2 Dashboard Information Hierarchy

```
┌─────────────────────────────────────────┐
│ [HEADER]                                │
│ Today's Facilitator Greeting            │
│ "Hello, Kofi. Grade 5A learning today." │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│ 🎯 TODAY'S SESSION                      │
│                                         │
│ [Activity Card]                         │
│ ├─ Activity: Days 1–2 · Plan and earn  │
│ ├─ Type: Scenario                      │
│ ├─ Duration: ~45 min                   │
│ ├─ Cohort: Grade 5A (25 learners)      │
│ ├─ Last prep: Yesterday at 2:35 PM     │
│ └─ [Start Session →]  [View Guide →]  │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│ 📊 CLASS AT A GLANCE                    │
│                                         │
│ Grade 5A Cohort                         │
│ ├─ Progress: 8 of 28 activities        │
│ ├─ Engagement: 23/25 present today     │
│ ├─ At-risk: 2 learners                 │
│ └─ [View cohort →]                     │
│                                         │
│ Grade 5B Cohort (secondary)             │
│ ├─ Status: Days 3–4 scenario           │
│ └─ [View cohort →]                     │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│ ⚠️  LEARNERS NEEDING SUPPORT             │
│                                         │
│ Akos (Grade 5A)                         │
│ ├─ Status: Behind (day 2 of 14)        │
│ ├─ Last activity: 2 days ago           │
│ └─ [View learner →]                    │
│                                         │
│ Ama (Grade 5A)                          │
│ ├─ Status: Stuck on scenario           │
│ ├─ Support signal: Low engagement       │
│ └─ [View learner →]                    │
└─────────────────────────────────────────┘
```

### 4.3 Dashboard Cards & Sections

**Section 1: Today's Session (if session scheduled)**

- **Activity Card** (prominent)
  - Activity name + type icon
  - Duration
  - Cohort name
  - [Start Session] primary button
  - [View Guide] secondary button
  - Status: "Ready to start" or "Already started" or "Session complete"

**If no session scheduled:**
```
No session scheduled today

Grade 5A's next activity is Days 3–4 (Sept 28)
[View curriculum →]
```

**Section 2: Class at a Glance**

For each facilitator's cohort (up to 3 on dashboard):
- Cohort name
- Progress bar (8/28 activities)
- Quick metrics:
  - Engagement: "23/25 here today"
  - At-risk: "2 learners"
  - Avg competency: "2.1/3 goal-setting"
- [View Cohort →] link

**Section 3: Learners Needing Support**

Auto-generated list of learners with support signals:
- Learner name
- Cohort
- Support signal (e.g., "Behind", "Stuck", "Low engagement")
- Last activity time
- [View learner →] link

**Max 3 on dashboard; [See all →] link to full list**

### 4.4 Dashboard Load Behavior

**Priority load order:**
1. Header + greeting
2. Today's session card (highest priority)
3. Cohorts overview
4. At-risk learners list
5. Secondary cohorts (if multiple)

**Progressive disclosure:** Prioritize today's action, then expand context.

### 4.5 Dashboard Refresh

- Auto-refresh participation data every 5 seconds (polling)
- Manual [Refresh] button
- Timestamp: "Updated just now" or "Updated 2 min ago"

---

## SECTION 5: MY COHORTS EXPERIENCE

### 5.1 My Cohorts List Screen

**Purpose:** Show all assigned cohorts at a glance

**Layout:**

```
┌──────────────────────────────────────┐
│ MY COHORTS                            │
│ "You are assigned to 2 classes"      │
└──────────────────────────────────────┘

[Cohort Card 1]
├─ Grade 5A
├─ 25 learners enrolled
├─ Progress: 8/28 activities
├─ Current: Days 1–2 scenario
├─ Status badge: "In progress"
└─ [View →]

[Cohort Card 2]
├─ Grade 5B
├─ 24 learners enrolled
├─ Progress: 12/28 activities
├─ Current: Scenario days 3–4
├─ Status badge: "In progress"
└─ [View →]

[Completed Cohort - Dimmed]
├─ Grade 4C (2025)
├─ 20 learners enrolled
├─ Progress: 28/28 activities
├─ Completed: Sept 15
├─ Status badge: "Completed"
└─ [View →]
```

### 5.2 Cohort Card Components

Each cohort card displays:
- **Cohort name** (Grade 5A, Grade 4C, etc)
- **Learner count** ("25 learners enrolled")
- **Progress bar** (visual + "8/28 activities")
- **Current activity** ("Days 1–2 scenario")
- **Status badge** ("In progress" | "Completed" | "Not started")
- **[View →]** link to cohort overview

**On hover:** Slight lift/shadow, slight color change

### 5.3 Cohort Status States

| State | Badge Color | Meaning |
|-------|-------------|---------|
| **Not started** | Gray | No sessions held yet |
| **In progress** | Blue | Cohort is active, 1-27 of 28 activities done |
| **Completed** | Green | All 28 activities done |

### 5.4 Filtering (If Multiple Cohorts)

**Not MVP:** Hide advanced filtering
**MVP simple sort:**
- Default: In progress first, then not started, then completed
- "Show completed cohorts" toggle

---

## SECTION 6: COHORT OVERVIEW SPECIFICATION

### 6.1 Cohort Overview Purpose

**Primary question:** "How is this class doing?"

**Secondary questions:**
- How many learners? Where are they in the journey?
- Who's struggling? Who's ahead?
- When's the next session?

### 6.2 Cohort Overview Layout

```
┌───────────────────────────────────────────┐
│ [BREADCRUMB: Home / Grade 5A]             │
│ COHORT HEADER                             │
│ Grade 5A · 25 learners · Teacher Kofi    │
│ "Started Sept 1, currently on days 1–2" │
└───────────────────────────────────────────┘

┌───────────────────────────────────────────┐
│ 📊 COHORT OVERVIEW                        │
│                                           │
│ Progress: 8 of 28 activities             │
│ [████████░░░░░░░░░░] 29%                │
│                                           │
│ Engagement: 23/25 present (92%)          │
│ Avg competency:                          │
│  • goal-setting: 2.1/3 (growing)        │
│  • saving: 1.8/3 (growing)              │
│  • needs-vs-wants: 1.2/3 (beginning)    │
│                                           │
│ At-risk: 2 learners                      │
│ [View details →]                         │
└───────────────────────────────────────────┘

┌───────────────────────────────────────────┐
│ 📅 SESSION SCHEDULE (Next 5)              │
│                                           │
│ Today (Sept 26) — Days 1–2 scenario       │
│ • Duration: ~45 min                      │
│ • Status: Ready to start                 │
│ • [Start session →] [View guide →]       │
│                                           │
│ Sept 28 — Days 3–4 scenario              │
│ • Duration: ~45 min                      │
│ • [View →]                               │
│                                           │
│ Sept 30 — Reflection activity            │
│ • Duration: ~20 min                      │
│ • [View →]                               │
└───────────────────────────────────────────┘

┌───────────────────────────────────────────┐
│ 👥 LEARNER ROSTER (Expandable)           │
│                                           │
│ [Search/Filter bar]                      │
│                                           │
│ Learner Name  Progress  Status           │
│ ────────────────────────────────────────   │
│ Kwame         Days 1–2  ✓ On track      │
│ Ama           Days 1–2  ✓ On track      │
│ Akos          Day 1     ⚠️ Behind        │
│ [23 more rows]                           │
│                                           │
│ [Scroll or expand full roster]           │
└───────────────────────────────────────────┘
```

### 6.3 Cohort Header Section

**Information displayed:**
- Cohort name (large, bold)
- Facilitator name
- Learner count
- Cohort status (active/completed)
- Start date + current activity

**Optional actions:**
- [View curriculum] — Go to activity sequence
- [Manage cohort] — Edit (admin only)

### 6.4 Cohort Overview Cards

**Progress Card:**
- Progress bar (visual)
- "8 of 28 activities" text
- Percentage
- Current activity name

**Engagement Card:**
- "23/25 present" (or "Not started")
- Sessions held: 3
- Avg time per session: 42 min

**Competency Overview:**
- List of competencies (5-8 max)
- Score 0-3 scale
- Level label (growing/strong)
- Visual indicator (bar or colored dot)
- No comparison between learners

**At-Risk Summary:**
- Count of learners needing support
- Brief description ("Behind schedule", "Low engagement", etc)
- [View details] link to full list

### 6.5 Learner Roster Table

**Columns (Desktop):**
- Learner name
- Current activity (e.g., "Days 1–2")
- Status badge (on track | behind | stuck)
- Engagement (present in last session?)
- Last activity (e.g., "2 hours ago")
- [View] link

**Mobile:** Card-based layout instead of table
```
[Learner Card]
Name: Kwame
Progress: Days 1–2
Status: ✓ On track
Last: 2 hours ago
[View →]
```

**Sorting:** Default by name, can sort by:
- Progress
- Status
- Engagement

**Filtering:** Show only:
- All
- On track
- Needs support / Behind
- Not started

---

## SECTION 7: LEARNER DETAIL SPECIFICATION

### 7.1 Learner Profile Purpose

**Primary question:** "How can I support this learner?"

**Secondary:**
- Where are they in the journey?
- What assessments have they taken?
- What decisions did they make?
- What competencies are developing?

### 7.2 Learner Profile Layout

```
┌──────────────────────────────────────────┐
│ [BREADCRUMB: Home / Grade 5A / Learner] │
│ LEARNER HEADER                           │
│ 👧 Kwame Owusu                           │
│ TATI ID: TATI-A1B2C3D4                  │
│ "Age 10 · Grade 5 · On track"           │
└──────────────────────────────────────────┘

┌──────────────────────────────────────────┐
│ 📍 JOURNEY PROGRESS                      │
│                                          │
│ [Timeline visualization]                 │
│                                          │
│ Pre-test          Lesson 1      Scenario│
│   ✓              ✓            → Currently
│   5 days ago     4 days ago     here
│                                          │
│ Timeline: 14-day journey                │
│ • Days completed: 1–2 of 14             │
│ • Estimated completion: Oct 10           │
└──────────────────────────────────────────┘

┌──────────────────────────────────────────┐
│ 🎯 COMPETENCIES                          │
│                                          │
│ goal-setting: 2.0/3 ▰▰░ Growing        │
│ "Learned to set a target through        │
│  pre-test and scenario decisions"       │
│                                          │
│ saving: 1.5/3 ▰░░ Growing              │
│ "Practiced making saving decisions"     │
│                                          │
│ needs-vs-wants: 0.5/3 ▰░░ Beginning   │
│ "Has not practiced this concept yet"    │
└──────────────────────────────────────────┘

┌──────────────────────────────────────────┐
│ 📊 ASSESSMENT RESULTS                    │
│                                          │
│ Pre-Assessment (Days 1–2)                │
│ Score: 5/25 points                      │
│ • Goal-setting: 1/3                     │
│ • Needs-vs-wants: 0/3                   │
│ • [View responses →]                    │
│                                          │
│ Post-Assessment                          │
│ (Not yet taken)                          │
└──────────────────────────────────────────┘

┌──────────────────────────────────────────┐
│ 🔄 RECENT DECISIONS (Last 3 Scenarios)  │
│                                          │
│ Days 1–2 Scenario                        │
│ Choice: "Save GH₵40"                    │
│ Result: "A strong start with thin pocket│
│ Competencies gained: goal-setting +2    │
│                                          │
│ [Show more decisions →]                  │
└──────────────────────────────────────────┘

┌──────────────────────────────────────────┐
│ 💭 FACILITATOR NOTES                     │
│                                          │
│ [Facilitator can add/edit notes here]   │
│ "Kwame seems confident about saving.    │
│  Watch for understanding on             │
│  needs-vs-wants in next lesson."        │
│                                          │
│ Last updated: Today at 2:35 PM          │
│ By: Kofi                                 │
└──────────────────────────────────────────┘
```

### 7.3 Learner Header Section

**Displays:**
- Learner avatar/name
- TATI ID (for cross-reference)
- Age, grade level
- Status badge ("On track" | "Behind" | "Stuck")
- Cohort name
- Enrollment date

**Actions:**
- [Back to roster]
- (Admin only: Remove from cohort)

### 7.4 Journey Progress Section

**Shows:**
- Timeline of key milestones (pre-test → lessons → scenarios → post-test)
- Visual progress (dots/checkmarks for completed)
- Current position highlight
- Estimated completion date
- "Days in journey" counter (e.g., "on day 3 of 14")

**On click:** Expands to show all 28 activities with status

### 7.5 Competencies Section

For each competency (5-8 total):
- **Name** (e.g., "goal-setting")
- **Score** (0-3 scale, visual bar)
- **Level** ("Beginning" | "Growing" | "Strong")
- **Evidence** (which activities contributed)
- **Plain-language description** (e.g., "Practiced making saving decisions")

**No comparisons** between learners
**No rankings** by competency

### 7.6 Assessment Results Section

**Pre-Assessment:**
- Timestamp
- Score (X/25 points)
- Breakdown by competency
- [View responses] link (if facilitator should see detailed answers)

**Post-Assessment:**
- Status: "Not yet taken"
- Expected completion: (if applicable)

### 7.7 Recent Decisions Section

Shows last 3 scenario decisions:
- Scenario name
- Choice made (plain language)
- Consequence description
- Competencies gained
- [Show all decisions] link

### 7.8 Facilitator Notes Section

**Text input field:**
- Placeholder: "Add notes about this learner..."
- Max 500 characters
- Auto-save on blur
- Shows last update time + facilitator name

**Example:** "Over-cautious on money. Needs reassurance that trying and learning is OK."

### 7.9 Support Signals

**What triggers a "needs support" signal:**
- ❌ No progress for 3+ days
- ❌ Same activity repeated 3+ times
- ❌ Very low assessment scores (< 40%)
- ❌ All scenario choices very conservative (all minimum decisions)

**Signals displayed as badge, never as judgment:**
- ⚠️ "Needs attention"
- "Consider checking in"
- "Not started" (neutral)

---

## SECTION 8: CURRICULUM VIEW SPECIFICATION

### 8.1 Curriculum Purpose

**Primary question:** "What activities will my class do, in what order?"

**Secondary:**
- What's each activity?
- How long does it take?
- What are we teaching?

### 8.2 Curriculum Layout (Track View)

```
┌──────────────────────────────────────────┐
│ [BREADCRUMB: Home / Grade 5A / Learning]│
│ LEARNING JOURNEY                         │
│ "The School Reopening Challenge"        │
│ SAVE Track · 14 days · 28 activities    │
└──────────────────────────────────────────┘

┌──────────────────────────────────────────┐
│ ACTIVITY SEQUENCE                        │
│                                          │
│ 1. Pre-Assessment (Day 1)               │
│    ├─ Type: Assessment                  │
│    ├─ Duration: ~20 min                 │
│    ├─ Objective: Baseline understanding │
│    ├─ Status: ✓ Complete (Sept 26)     │
│    └─ [View / Facilitation guide →]    │
│                                          │
│ 2. Meet Your Money (Day 2)              │
│    ├─ Type: Lesson                      │
│    ├─ Duration: ~15 min                 │
│    ├─ Objective: Currency introduction  │
│    ├─ Status: ✓ Complete (Sept 27)     │
│    └─ [View / Facilitation guide →]    │
│                                          │
│ 3. Set a Goal (Days 2–3)                │
│    ├─ Type: Lesson                      │
│    ├─ Duration: ~20 min                 │
│    ├─ Objective: Target-setting        │
│    ├─ Status: → In progress (today)    │
│    └─ [View / Facilitation guide →]    │
│                                          │
│ 4. Plan and Earn (Days 1–2 Scenario)   │
│    ├─ Type: Scenario                    │
│    ├─ Duration: ~45 min (2 sessions)   │
│    ├─ Objective: Scenario intro         │
│    ├─ Status: → In progress             │
│    └─ [View / Start session →]          │
│                                          │
│ [... 24 more activities]                │
│                                          │
│ 28. Post-Assessment (Day 14)            │
│     ├─ Type: Assessment                 │
│     ├─ Duration: ~25 min                │
│     ├─ Objective: Learning verification │
│     ├─ Status: ○ Not started            │
│     └─ [View / Facilitation guide →]    │
└──────────────────────────────────────────┘
```

### 8.3 Activity Card Components

Each activity card shows:
- **Number + Name** (e.g., "3. Set a Goal")
- **Type icon** (📝 Lesson, 🎬 Scenario, ❓ Assessment, 🤔 Reflection)
- **Duration** (e.g., "~20 min" or "~45 min across 2 sessions")
- **Objective** (1-line description of what learner will learn)
- **Status badge** (✓ Complete | → In progress | ○ Not started)
- **Completion date** (if complete; e.g., "Sept 26")
- **[View guide]** link (pre-session facilitation guide)
- **[Start session]** link (only if current activity)

### 8.4 Activity Status States

| State | Icon | Meaning | Next Action |
|-------|------|---------|---|
| **Not started** | ○ | Cohort hasn't reached yet | Start session |
| **In progress** | → | Cohort currently on it | Continue / Complete |
| **Complete** | ✓ | Cohort finished it | Review or move on |
| **Skipped** | ⊘ | Facilitator skipped it | (Can't undo in MVP) |

### 8.5 Filtering & Sorting (MVP)

**Not included:** No complex filtering
**MVP simple view:**
- Show all 28 activities in order
- Visual grouping by module (if applicable)
- Can collapse/expand sections if large number

---

## SECTION 9: SESSION GUIDE SPECIFICATION

### 9.1 Session Guide Purpose

**Primary question:** "How should I facilitate this activity?"

**Secondary:**
- What's the learning goal?
- What will learners do?
- What should I discuss?
- How long will it take?
- What might go wrong?

### 9.2 Session Guide Layout

```
┌──────────────────────────────────────────────┐
│ [BREADCRUMB: Home / Grade 5A / Curriculum   │
│            / Session Guide]                  │
│ SESSION GUIDE                                │
│ Days 1–2 · Plan and Earn                    │
│ Scenario Activity                            │
│ Est. duration: 45 min (may span 2 sessions) │
└──────────────────────────────────────────────┘

┌──────────────────────────────────────────────┐
│ 🎯 LEARNING OBJECTIVE                        │
│                                              │
│ "Learners set a goal and make first saving  │
│  decision. Develop goal-setting and basic   │
│  saving competencies."                      │
│                                              │
│ Key competencies:                            │
│ • Goal-setting (will develop)               │
│ • Saving (will develop)                     │
│ • Needs-vs-wants (introduced)               │
└──────────────────────────────────────────────┘

┌──────────────────────────────────────────────┐
│ 📋 FACILITATION STEPS                        │
│                                              │
│ STEP 1: INTRODUCTION (5 min)                │
│ "Set the scene"                              │
│                                              │
│ Say to learners:                             │
│ "Today we start the School Reopening        │
│  Challenge. Imagine: You have GH₵50 pocket │
│  money. You want a GH₵80 school bag for    │
│  next term. You have 14 days to figure out │
│  how to reach that goal. Let's start!"     │
│                                              │
│ Facilitator tip:                             │
│ • Draw a simple goal line on whiteboard    │
│ • Show the money (GH₵50 vs GH₵80)          │
│ • Make it real and relatable               │
│                                              │
│ STEP 2: LEARNER ACTIVITY (25 min)          │
│ "Learners make their first choice"          │
│                                              │
│ Instructions:                                │
│ 1. Learners open TATI Junior on device     │
│ 2. Navigate to scenario                     │
│ 3. Read situation (it appears on screen)    │
│ 4. Choose: How much to save? (40, 30, 20)  │
│ 5. Consequence appears (immediate)          │
│                                              │
│ What you'll see on monitoring:               │
│ • Each learner's name when they start      │
│ • Checkmark when they submit               │
│ • Choice they made (if provided)            │
│                                              │
│ Facilitator tip:                             │
│ • Circulate: "Tell me about your choice"   │
│ • Don't influence: "There's no right       │
│   answer; let's see what happens."         │
│ • If stuck: "Try one and see what        │
│   happens. You'll learn!"                   │
│                                              │
│ STEP 3: GROUP DEBRIEF (15 min)             │
│ "Discuss choices and consequences"          │
│                                              │
│ Once most have completed (aim for 80%+):    │
│                                              │
│ Show results to class:                      │
│ • "8 of you chose save-40"                  │
│ • "12 of you chose save-30"                │
│ • "5 of you chose save-20"                 │
│                                              │
│ Discussion prompts:                          │
│ • "Why did more choose save-30?"            │
│ • "What's the difference between 40 and   │
│    30? What happens next?"                  │
│ • "Was there a 'best' choice? Or did     │
│    different choices lead to different    │
│    journeys?"                              │
│                                              │
│ Facilitator tip:                             │
│ • Don't rank choices ("save-40 is better") │
│ • Frame as: "Each choice teaches us"       │
│ • Encourage: "We'll find out over 14 days"│
│                                              │
│ STEP 4: WRAP-UP (3 min)                    │
│ "Set expectations for next activity"        │
│                                              │
│ "Tomorrow we'll see what happens next in   │
│  your journey. Your choice creates your    │
│  own unique story."                        │
│                                              │
│ Logistics:                                   │
│ • Collect devices                           │
│ • Remind: Same time tomorrow                │
└──────────────────────────────────────────────┘

┌──────────────────────────────────────────────┐
│ 📦 MATERIALS NEEDED                          │
│                                              │
│ • 25 devices (phones/tablets) with TATI   │
│ • Facilitator device (for monitoring)       │
│ • Whiteboard or poster (optional, visual)   │
│ • No printed handouts needed               │
└──────────────────────────────────────────────┘

┌──────────────────────────────────────────────┐
│ ⚠️  COMMON FACILITATION CHALLENGES          │
│                                              │
│ "A learner is stuck on choosing"            │
│ → Say: "Try the first option and we'll see  │
│   what happens. Remember, this is learning │
│   by doing."                               │
│                                              │
│ "Two learners haven't started after 10 min" │
│ → Technical issue likely. Check devices.   │
│   They can try again later or after class. │
│                                              │
│ "Everyone finished in 10 minutes"           │
│ → Extend discussion. Ask deeper questions: │
│   "What made you choose that?" "What would │
│   you do differently?"                     │
│                                              │
│ "Some learners are comparing choices"      │
│ → Redirect: "Your choice is part of YOUR   │
│   unique story. Let's focus on your       │
│   decisions and learning."                │
└──────────────────────────────────────────────┘

┌──────────────────────────────────────────────┐
│ 💡 FACILITATION PHILOSOPHY                  │
│                                              │
│ This is NOT about:                          │
│ ❌ Telling them the "right" answer         │
│ ❌ Ranking choices or learners             │
│ ❌ Grading their decision                  │
│                                              │
│ This IS about:                              │
│ ✅ Creating safe space to explore choices │
│ ✅ Generating real discussion on          │
│    consequences                            │
│ ✅ Building confidence in decision-making │
│                                              │
│ Remember:                                   │
│ "You're the guide. The story and the      │
│  journey are theirs."                     │
└──────────────────────────────────────────────┘

[Button: "Start session →"]  [Back to curriculum →]
```

### 9.3 Session Guide Components

**Header:**
- Activity name, type, duration
- Learning objective (1-2 sentences)
- Key competencies developed

**Facilitation Steps:**
- Clear sequence (Intro → Activity → Debrief → Wrap-up)
- Timing for each step
- Exact language ("Say to learners:")
- Facilitator tips (non-prescriptive suggestions)
- Discussion prompts (open-ended questions)

**Materials Section:**
- What's needed
- What's NOT needed
- Tech setup (if applicable)

**Troubleshooting Section:**
- Common challenges
- Suggested responses (not scripts)
- What to watch for

**Philosophy Note:**
- How this activity fits the learning model
- Why we facilitate this way, not traditionally

### 9.4 Session Guide Tone

**NOT:** Step-by-step script
**IS:** Guidance + confidence-building

Tone should feel like: "You're the expert on your class. Here's context to help you guide this activity."

### 9.5 Session Guide Actions

**[Start session]** — Takes facilitator to /academy/cohorts/{cohortId}/session/active/{sessionId}  
**[Back to curriculum]** — Returns to activity list

---

## SECTION 10: ACTIVE SESSION SPECIFICATION

### 10.1 Active Session Purpose

**Primary question:** "Who's progressing? Who needs help?"

**Secondary:**
- How many have started?
- How many have completed?
- What's the status right now?

### 10.2 Active Session Layout

```
┌────────────────────────────────────────────┐
│ GRADE 5A · DAYS 1–2 SCENARIO              │
│ Session started: 2:15 PM · 18 min elapsed  │
│ Facilitator: Kofi                         │
│ [Progress bar: 23/25 submitted] 92%        │
└────────────────────────────────────────────┘

┌────────────────────────────────────────────┐
│ 📊 LIVE PARTICIPATION                      │
│                                            │
│ Submitted choices: 23/25 (92%)             │
│ ├─ Still working: 2                       │
│ ├─ Not started: 0                         │
│ └─ Auto-refreshes every 3 seconds         │
│                                            │
│ [Timeline showing progress curve]          │
│ • 0-5 min: 5 completed                    │
│ • 5-10 min: 15 completed                  │
│ • 10-18 min: 23 completed                 │
└────────────────────────────────────────────┘

┌────────────────────────────────────────────┐
│ 🎯 INTERIM RESULTS (Real-time)             │
│                                            │
│ Choice Distribution:                       │
│ save-40 (Bold savers): 8 learners 35%      │
│ save-30 (Balanced): 12 learners 52%        │
│ save-20 (Cautious): 3 learners 13%         │
│                                            │
│ [Visual breakdown showing split]           │
│                                            │
│ Avg competency gained (estimated):         │
│ • goal-setting: +1.8                      │
│ • saving: +1.5                            │
│                                            │
│ Note: "Results update as learners submit" │
└────────────────────────────────────────────┘

┌────────────────────────────────────────────┐
│ 👥 LEARNER STATUS (Sortable)               │
│                                            │
│ Sort by: Status | Name | Time              │
│                                            │
│ ✓ Kwame — Submitted save-40 (2 min ago)   │
│ ✓ Ama — Submitted save-30 (1 min ago)    │
│ ✓ Akos — Submitted save-20 (3 min ago)   │
│ [19 more completed]                       │
│                                            │
│ → Kofi — In progress (started 4 min ago)  │
│ → Nana — In progress (started 2 min ago)  │
│                                            │
│ ○ (None not started)                       │
│                                            │
│ [Scroll or paginate]                       │
└────────────────────────────────────────────┘

┌────────────────────────────────────────────┐
│ 🔧 FACILITATOR ACTIONS                     │
│                                            │
│ [Refresh] (manual update)                  │
│ [Add note] (capture real-time observation)│
│ [End session] (mark complete, view results)│
│                                            │
│ Or keep monitoring...                      │
│                                            │
│ Last updated: Just now                     │
└────────────────────────────────────────────┘
```

### 10.3 Live Participation Section

**Displays:**
- Progress: "23/25 submitted" + percentage
- Status breakdown:
  - Submitted choices
  - Still working
  - Not started (if any)
- Auto-refresh indicator: "Updates every 3 seconds"
- [Pause/Resume] if needed

**Progress visualization:**
- Horizontal progress bar (visual + numeric)
- Timeline curve showing progression over time (if data available)

### 10.4 Interim Results Section

**Shows (in real-time):**
- Choice distribution (for scenarios)
  - Which choices are most popular
  - Count and percentage
  - Visual breakdown (bar chart or pie)
- Estimated competency gains (if applicable)
- "Results update as learners submit" note

**NOT SHOWN:**
- Individual learner names next to choices
- Rankings or comparisons
- Praise/shame language

### 10.5 Learner Status Table/List

**Columns (Desktop):**
- Status icon (✓ submitted | → in progress | ○ not started)
- Learner name
- Choice made (if scenario) or status (if assessment/lesson)
- Time submitted / time elapsed

**Mobile:** Card layout
```
✓ Kwame
Choice: save-40
Submitted 2 min ago
```

**Sorting options:**
- By status (completed first, then in progress)
- By name (A-Z)
- By time (fastest first)

**Filtering (optional):**
- Show all
- Show submitted only
- Show still working
- Show not started

### 10.6 Facilitator Actions Section

**[Refresh]** — Manual update (in case auto-refresh lags)  
**[Add note]** — Quick note capture without ending session
**[End session]** — Completes session, goes to debrief

**Also available:**
- Timer (if needed for timing clarity)
- [Pause session] (rare, if technical issue)
- Help tooltip (?)

### 10.7 Active Session Behavior

**Auto-refresh:** Every 3-5 seconds
**Polling method:** HTTP polling (simpler for MVP than WebSocket)
**Timestamp:** "Updated just now" or "Updated 2 min ago"

**If learner drops offline:**
- Stays in "still working" status
- Can retry after session if needed (G6.1 error recovery)

---

## SECTION 11: SESSION DEBRIEF SPECIFICATION

### 11.1 Session Debrief Purpose

**Primary question:** "What happened? What's next?"

**Secondary:**
- Who engaged? Who struggled?
- What did we learn?
- Any follow-up needed?

### 11.2 Session Debrief Layout

```
┌────────────────────────────────────────────┐
│ SESSION DEBRIEF                             │
│ Grade 5A · Days 1–2 Scenario                │
│ Completed Sept 26 at 2:45 PM               │
│ Duration: 30 minutes                        │
│ Attendance: 25/25 (100%) | Engaged: 23/25  │
└────────────────────────────────────────────┘

┌────────────────────────────────────────────┐
│ ✓ SESSION COMPLETE                         │
│                                            │
│ All learners submitted their choices.      │
│ Class engaged well on scenario.            │
│ Good discussion on needs-vs-wants.         │
└────────────────────────────────────────────┘

┌────────────────────────────────────────────┐
│ 📊 SESSION OUTCOMES                        │
│                                            │
│ Attendance: 25/25 (100%)                   │
│ Engagement: 23/25 engaged (92%)            │
│ Completion: All 25 submitted (100%)        │
│                                            │
│ Choice Distribution:                       │
│ • save-40 (Bold savers): 8 learners (32%) │
│ • save-30 (Balanced): 12 learners (48%)   │
│ • save-20 (Cautious): 5 learners (20%)    │
│                                            │
│ Average Competency Growth:                 │
│ • goal-setting: +1.8                      │
│ • saving: +1.5                            │
│                                            │
│ Insights:                                  │
│ "Class split roughly into three groups   │
│  based on risk appetite. Good diversity   │
│  for discussion on different strategies." │
└────────────────────────────────────────────┘

┌────────────────────────────────────────────┐
│ ⚠️  LEARNERS NEEDING FOLLOW-UP             │
│                                            │
│ Akos (save-20, very cautious)              │
│ → Recommended: 1:1 check-in                │
│ → Question: "What made you worried?"      │
│ → Note: "Watch for anxiety about money"   │
│                                            │
│ Kofi (still in progress, didn't submit)   │
│ → Technical issue likely                  │
│ → Recommended: Tech troubleshoot           │
│ → Can retry after class                   │
│                                            │
│ [View all learner data →]                  │
└────────────────────────────────────────────┘

┌────────────────────────────────────────────┐
│ 💭 FACILITATOR REFLECTION (Optional)      │
│                                            │
│ What went well?                            │
│ "Class understood goal-setting quickly.   │
│  Discussion on strategy choices was       │
│  better than expected."                   │
│                                            │
│ What could improve?                       │
│ "Two learners needed more tech support.   │
│  Consider pre-testing devices."           │
│                                            │
│ Notes for next session:                   │
│ "Prepare activity 2-3 in advance.         │
│  Make sure all devices charged."          │
│                                            │
│ [Save notes]                               │
└────────────────────────────────────────────┘

┌────────────────────────────────────────────┐
│ 📅 NEXT STEPS                              │
│                                            │
│ Next activity: Days 3–4 Scenario          │
│ Scheduled: Sept 28 at 2:00 PM              │
│ Duration: ~45 min (may span 2 sessions)    │
│                                            │
│ Facilitator prep:                          │
│ [ ] View session guide                    │
│ [ ] Prepare materials (if any)            │
│ [ ] Brief class on timeline               │
│                                            │
│ [View next session guide →]                │
│ [Schedule for next activity →]             │
└────────────────────────────────────────────┘

┌────────────────────────────────────────────┐
│ 🔄 PARENT CONNECTION (Info Only)          │
│                                            │
│ System is now generating parent insights  │
│ based on this session outcomes:            │
│                                            │
│ For Kwame's parent:                        │
│ "Kwame is becoming more confident about   │
│  saving. Ask: 'What would you do with     │
│  GH₵50? How much would you save?'"       │
│                                            │
│ This message will appear on parent        │
│ dashboard under "Conversation Starters".  │
└────────────────────────────────────────────┘

[Print/Export (if needed)]  [Back to cohort]  [Next session →]
```

### 11.3 Session Complete Confirmation

**Displays:**
- "Session complete" confirmation
- Timestamp
- Duration
- Who was present/engaged

### 11.4 Session Outcomes Section

**Displays:**
- Attendance (count + %)
- Engagement (count + %)
- Completion rate
- Choice distribution (for scenarios)
- Competency growth (average)
- Key insights (auto-generated insight, 1-2 sentences)

**Example insight:**
> "Class split roughly into three groups based on risk appetite. Good diversity for discussion on different strategies."

### 11.5 Learner Follow-up Section

Lists learners who may need support:
- Learner name
- Issue/signal (e.g., "Cautious saver", "Didn't complete", "Tech issue")
- Recommended action
- Facilitator note suggestion

**Limited to 3-5 most significant**

### 11.6 Facilitator Reflection Section

Optional text fields for facilitator to capture thinking:
- **"What went well?"** (open text)
- **"What could improve?"** (open text)
- **"Notes for next session?"** (open text)

**Auto-saves on blur**
**[Save] button**

### 11.7 Next Steps Section

**Shows:**
- Next activity name + type
- Scheduled date (if assigned)
- Duration
- [View session guide] link
- [Schedule for next activity] link (if not yet scheduled)

### 11.8 Parent Connection Notice

**Info-only note:**
"System is now generating parent insights based on this session. Parents will see conversation starters in their next dashboard view."

This keeps facilitator aware of parent communication without needing access to parent dashboards.

---

## SECTION 12: SUPPORT SIGNAL MODEL

### 12.1 What Are Support Signals?

**Support signals** are **neutral, data-driven indicators** that a learner might benefit from facilitator attention.

**NOT:**
- ❌ Judgments ("failing", "behind")
- ❌ Rankings
- ❌ Diagnoses
- ❌ Penalties

**IS:**
- ✅ Patterns observed
- ✅ Opportunities to help
- ✅ Suggestions, not mandates
- ✅ Non-shaming language

### 12.2 Signal Types & Triggers

| Signal | Triggers | Example | Facilitator Action |
|--------|----------|---------|---|
| **Not started** | 0 activities completed + enrolled 3+ days | Kwame enrolled but no login | Welcome/tech check |
| **Behind** | Completed < 60% expected activities for days elapsed | On day 5, completed day 1-2 items only | Catch-up discussion |
| **Stuck** | Same activity attempted 3+ times OR no progress 3+ days | Attempted scenario 3 times, same choice | 1:1 check-in |
| **Low engagement** | Submitted but minimal interaction (quick guess, no exploration) | Chose first option in 10 seconds, moved on | Encourage reflection |
| **Curious** | Retries/explores beyond minimum (positive signal) | Tried multiple scenario outcomes | Praise autonomy |

### 12.3 How Signals Appear in Academy

**Dashboard:** "2 learners need support" (overview)
**Cohort roster:** Badge per learner (⚠️ icon, not text)
**Learner profile:** Signal explanation (e.g., "Behind schedule")

**Language never shaming:**
- ❌ "Struggling"
- ✅ "Needs support"
- ✅ "Consider checking in"

### 12.4 Facilitator Response Model

**Academy suggests actions; facilitator decides:**

```
Signal: "Akos: Needs support (low engagement)"
  ↓
Facilitator decides: "I'll ask about their thinking"
  ↓
Facilitator checks: "Akos, tell me about your choice"
  ↓
Akos explains: "I was scared to lose the money"
  ↓
Facilitator responds: "That makes sense. Let's try again..."
```

**Academy doesn't make judgments. Facilitator brings the wisdom.**

---

## SECTION 13: PRIVACY & ROLE MATRIX

### 13.1 Complete Data Access Matrix

| Data | JUNIOR (Child) | PARENT | FACILITATOR | ADMIN |
|------|---|---|---|---|
| **Own learner profile** | Read | N/A | N/A | Read/Write |
| **Assigned learner profile** | N/A | Read own child | Read assigned learners | Read/Write all |
| **Parent-private data** | ❌ | Read own | ❌ **BLOCKED** | Read/Write |
| **Learner progress** | Read/Create own | Read own child | Read assigned cohort | Read/Write all |
| **Scenario decisions** | Create/Read own | Read own child | Read assigned cohort | Read/Write all |
| **Assessment results** | Read own | Read own child | Read assigned cohort | Read/Write all |
| **Competencies** | Read own | Read own child | Read assigned cohort | Read/Write all |
| **Facilitator notes** | ❌ | ❌ | Read/Create/Edit own | Read/Write all |
| **Session records** | ❌ | ❌ | Create/Read/Edit own | Read/Write all |
| **Cohort management** | ❌ | ❌ | ❌ Read only | Read/Write |
| **Facilitator assignments** | ❌ | ❌ | ❌ | Read/Write |

### 13.2 Firestore Rule Implications

**NO changes to existing rules for:**
- ✅ Family isolation
- ✅ Parent-private data blocking
- ✅ Child session immutability
- ✅ G5.1 scenario integrity

**NEW rules required for Academy:**
- ✅ academyOrganizations/* collections (admin-only, except facilitator reads)
- ✅ cohorts/* collections (facilitator access control)
- ✅ sessions/* collections (facilitator CRUD own sessions)
- ✅ enrollments/* collections (facilitator reads enrolled learners)

**Rules to verify unchanged:**
- families/{familyId}/children/{childId}/parentInsights — facilitators have NO access
- families/{familyId}/children/{childId}/scenarioSessions — read-only to facilitators
- families/{familyId}/children/{childId}/assessmentAttempts — read-only to facilitators

---

## SECTION 14: COMPONENT ARCHITECTURE

### 14.1 Existing Components to Reuse

**From src/components/tati/:**
- `Page` (with role="academy" support ✅ exists)
- `PageHeader` (with breadcrumbs, back button)
- `Card` (tone: surface/muted/primary)
- `Button` (size: sm/md/lg, variants)
- `Avatar` (for learner/facilitator display)
- `Badge` (for status indicators)
- `ProgressRing` (for journey progress)
- `Input` / `Textarea` (for notes)
- `LoadingState`, `EmptyState`, `ErrorState` (state patterns)

**From src/components/ui/:** Tabs, Select, Dialog, etc. (use as needed)

### 14.2 New Academy Components

**High-level components:**
```
src/components/academy/
├─ AcademyShell.tsx        ← Main layout wrapper
├─ AcademySidebar.tsx      ← Left navigation
├─ DashboardCard.tsx       ← Card for dashboard items
├─ CohortCard.tsx          ← Cohort summary card
├─ LearnerRoster.tsx       ← Table of learners
├─ LearnerStatusBadge.tsx  ← Support signal badge
├─ ProgressTimeline.tsx    ← Journey progress visual
├─ SessionCard.tsx         ← Activity/session card
├─ SessionMonitor.tsx      ← Live participation display
├─ SessionGuide.tsx        ← Guide content + steps
├─ SessionDebrief.tsx      ← Debrief summary
├─ FacilitatorNote.tsx     ← Note input + display
├─ CompetencyDisplay.tsx   ← Competency score visualization
├─ ChoiceDistribution.tsx  ← Scenario choice chart
├─ SupportSignalList.tsx   ← List of learners needing help
└─ AcademyEmpty

State.tsx ← Empty states for Academy
```

**Primitive components:**
- `MetricCard` (displays single metric: number + label)
- `ProgressBar` (horizontal progress visualization)
- `StatusBadge` (status indicator badge)
- `TimelineNode` (for journey visualization)

### 14.3 Component Composition Example

**Dashboard:**
```tsx
<AcademyShell>
  <DashboardCard>
    <SessionCard activity={today} />
  </DashboardCard>
  <DashboardCard>
    <CohortCard cohort={primary} />
  </DashboardCard>
  <SupportSignalList learners={atRisk} />
</AcademyShell>
```

**Cohort Overview:**
```tsx
<AcademyShell>
  <PageHeader title="Grade 5A" breadcrumb={...} />
  <MetricCard label="Progress" value="8/28" bar={0.29} />
  <LearnerRoster cohort={cohort} />
  <SessionSchedule cohort={cohort} />
</AcademyShell>
```

### 14.4 Component API Design

**Example: LearnerRoster**
```tsx
<LearnerRoster
  learners={[{id, name, progress, status, engagement, lastActivity}]}
  onSelectLearner={(childId) => navigate(...)}
  sortBy="status" | "name" | "time"
  filter="all" | "on-track" | "needs-support"
/>
```

---

## SECTION 15: RESPONSIVE DESIGN STRATEGY

### 15.1 Breakpoint Definitions

| Breakpoint | Size | Device | Priority |
|---|---|---|---|
| **Mobile** | 320-424px | Phone (old) | Usable but not optimized |
| **Mobile+** | 425-767px | Phone (modern) | ✅ Fully supported |
| **Tablet** | 768-1023px | iPad, tablets | ✅ Fully supported |
| **Desktop** | 1024-1279px | Laptop | ✅ Primary experience |
| **Desktop+** | 1280px+ | Large screens | ✅ Optimized |

### 15.2 Layout Adaptations by Breakpoint

**Mobile (< 425px):**
- Single column
- Hamburger menu (no sidebar)
- Bottom navigation
- Full-width cards
- Table → Card layout
- Collapsed sections (expandable)

**Mobile+ (425-767px):**
- Single column
- Hamburger menu
- Bottom navigation
- Full-width cards
- Slightly larger text
- Improved touch targets (48px minimum)

**Tablet (768-1023px):**
- Sidebar (collapsed/icons) + main content
- Two-column layout possible
- Table view available
- Bottom navigation + top header
- Sidebar toggleable

**Desktop (1024px+):**
- Sidebar (expanded) + main content
- Two-three column layouts
- Table view with horizontal scroll if needed
- No bottom navigation (or sticky)
- Optimal reading width (max 1200px content)

### 15.3 Component-Level Responsiveness

**Dashboard cards:**
- Mobile: Stack vertically
- Tablet: 2-column grid
- Desktop: 3-column or 2-column + sidebar

**Learner roster:**
- Mobile: Card layout (one per card)
- Tablet: Table with fewer columns (name, status, action)
- Desktop: Full table (name, progress, status, engagement, action)

**Session monitor:**
- Mobile: Live progress + single learner list (scrollable)
- Desktop: Progress + learner list side-by-side

### 15.4 Touch Target Sizing

**Mobile minimum:** 48px × 48px (buttons, tappable areas)
**Tablet minimum:** 44px × 44px
**Desktop:** 40px × 40px

**Academy uses TATI theme minimums; verify consistency**

### 15.5 Responsive Typography

| Element | Mobile | Tablet | Desktop |
|---------|--------|--------|---------|
| H1 | 24px | 26px | 28px |
| H2 | 18px | 19px | 20px |
| Label | 11px | 12px | 12px |
| Body | 14px | 15px | 16px |

---

## SECTION 16: ACCESSIBILITY STRATEGY

### 16.1 WCAG 2.2 AA Target

Academy maintains all TATI Junior/Parent accessibility standards:
- ✅ Color contrast (4.5:1 normal text, 3:1 large text)
- ✅ Focus indicators (2px, high contrast)
- ✅ Keyboard navigation (Tab, Enter, Escape)
- ✅ Screen reader support (semantic HTML, ARIA labels)
- ✅ Motion accessibility (respects prefers-reduced-motion)
- ✅ Touch accessibility (48px minimum on mobile)

### 16.2 Semantic HTML

**Use:**
- `<button>` for buttons
- `<a>` for links
- `<h1-h6>` for headings
- `<table>` for tabular data (with `<th>`, `<thead>`, `<tbody>`)
- `<form>` for forms
- `<label>` for form inputs
- `<nav>` for navigation
- `<main>` for main content

**Avoid:**
- ❌ `<div>` for buttons (use `<button>`)
- ❌ `<div>` for links (use `<a>`)
- ❌ Skipped heading levels (h1 → h3)
- ❌ Tables for layout

### 16.3 Keyboard Navigation

**Academy must be fully keyboard-navigable:**

- **Tab:** Move through interactive elements
- **Shift+Tab:** Reverse
- **Enter:** Activate buttons/links
- **Space:** Checkbox/radio toggle
- **Arrow keys:** Within components (tables, dropdowns)
- **Escape:** Close dialogs/modals

**Tab order:** Should match visual reading order

### 16.4 Focus Management

**Focus ring:**
- 2px outline, high-contrast color
- Visible on all interactive elements
- Rounded to match component shape

**Focus states should:**
- ✅ Be visible and high-contrast
- ✅ Not be removed without replacement
- ✅ Use theme's focus ring (already defined in TATI)

### 16.5 Color Independence

**Status should NOT be conveyed by color alone:**

❌ Bad:
```
Red = Error, Green = Success
```

✅ Good:
```
Icon + Color + Text:
❌ "Error" in red
✓ "Success" in green
⚠️ "Warning" in yellow with icon
```

### 16.6 Form Accessibility

**Labels:**
- Each input must have associated `<label>`
- For checkboxes/radios, label wraps input

**Error messages:**
- Associated with form field via aria-describedby
- Text, not just color
- Clear and actionable

### 16.7 Screen Reader Support

**Use ARIA labels where content is visual-only:**
- Status badges: `aria-label="At-risk learner"`
- Icons without text: `aria-label="Sort ascending"`
- Live regions: `aria-live="polite"` for dynamic updates (session monitor)

**Example:**
```jsx
<button aria-label="Start session">
  <PlayIcon /> Start
</button>
```

### 16.8 Motion Accessibility

**Respect prefers-reduced-motion:**
```css
@media (prefers-reduced-motion: reduce) {
  * { animation: none !important; transition: none !important; }
}
```

**Academy animations should:**
- ✅ Be applied via CSS class
- ✅ Respect motion preference
- ✅ Not distract from core content

---

## SECTION 17: SCREEN → DATA CONTRACT MAPPING

### 17.1 Dashboard Data Requirements

```typescript
{
  facilitatorId: string;
  facilitatorName: string;
  schoolName: string;
  
  todayActivity?: {
    itemId: string;
    itemName: string;
    itemType: "lesson" | "scenario" | "assessment" | "reflection";
    cohortId: string;
    cohortName: string;
    duration: number; // minutes
    scheduledTime?: timestamp;
  };
  
  cohorts: [
    {
      cohortId: string;
      name: string;
      learnerCount: number;
      progress: { completed: number; total: number };
      engagement: { present: number; total: number };
      atRiskCount: number;
      currentActivity: string;
      status: "not-started" | "in-progress" | "completed";
    }
  ];
  
  atRiskLearners: [
    {
      childId: string;
      name: string;
      cohortId: string;
      cohortName: string;
      signal: "behind" | "stuck" | "low-engagement" | "not-started";
      lastActivityTime?: timestamp;
    }
  ];
}
```

### 17.2 Cohort Overview Data Requirements

```typescript
{
  cohortId: string;
  cohortName: string;
  facilitatorName: string;
  learnerCount: number;
  startDate: timestamp;
  
  progress: {
    completed: number;
    total: number;
    percentage: number;
  };
  
  engagement: {
    present: number;
    total: number;
    percentage: number;
    sessionsHeld: number;
    avgTimePerSession: number; // minutes
  };
  
  competencies: [
    {
      id: string;
      name: string;
      score: number; // 0-3
      level: "beginning" | "growing" | "strong";
      description: string;
    }
  ];
  
  atRiskCount: number;
  
  learners: [
    {
      childId: string;
      name: string;
      currentActivity: string;
      status: "on-track" | "behind" | "stuck";
      engagement: "high" | "medium" | "low";
      lastActivityTime: timestamp;
    }
  ];
  
  nextSessions: [
    {
      sessionId: string;
      activity: string;
      scheduledDate: timestamp;
      duration: number;
    }
  ];
}
```

### 17.3 Learner Profile Data Requirements

```typescript
{
  childId: string;
  name: string;
  tatiId: string;
  age: number;
  gradeLevel: string;
  cohortId: string;
  cohortName: string;
  enrollmentDate: timestamp;
  
  status: "on-track" | "behind" | "stuck";
  
  journey: {
    currentActivity: string;
    daysInJourney: number;
    totalDays: number;
    estimatedCompletion: timestamp;
    completedActivities: number;
    totalActivities: number;
  };
  
  competencies: [
    {
      id: string;
      name: string;
      score: number; // 0-3
      level: "beginning" | "growing" | "strong";
      description: string;
      evidence: [{ itemId: string; score: number }];
    }
  ];
  
  assessments: [
    {
      assessmentId: string;
      type: "pre" | "post";
      score: number;
      maxScore: number;
      timestamp: timestamp;
      responses?: object; // if facilitator needs to review
    }
  ];
  
  recentDecisions: [
    {
      scenarioId: string;
      scenarioName: string;
      choiceId: string;
      choiceName: string;
      consequence: string;
      competenciesGained: { [competencyId]: number };
      timestamp: timestamp;
    }
  ];
  
  facilitatorNotes?: {
    text: string;
    updatedAt: timestamp;
    updatedBy: string;
  };
}
```

### 17.4 Active Session Data Requirements

```typescript
{
  sessionId: string;
  cohortId: string;
  cohortName: string;
  activityId: string;
  activityName: string;
  activityType: "scenario" | "lesson" | "assessment";
  
  startedAt: timestamp;
  elapsedMinutes: number;
  
  participation: {
    total: number;
    submitted: number;
    inProgress: number;
    notStarted: number;
    percentage: number;
  };
  
  learnerStatus: [
    {
      childId: string;
      name: string;
      status: "submitted" | "in-progress" | "not-started";
      choiceId?: string; // if scenario
      submittedAt?: timestamp;
      elapsedSeconds?: number;
    }
  ];
  
  interimResults?: {
    choiceDistribution?: [
      { choiceId: string; choiceName: string; count: number; percentage: number }
    ];
    estimatedCompetencyGains?: [
      { competencyId: string; competencyName: string; gain: number }
    ];
  };
}
```

### 17.5 Backend Queries Needed

**To be implemented in H3.1+ phases:**

```graphql
# Get dashboard data
query GetFacilitatorDashboard($uid: String!) {
  facilitator(uid: $uid) { name, school }
  todayActivity(facilitatorId: $uid)
  myCohortsOverview(facilitatorId: $uid)
  atRiskLearners(facilitatorId: $uid)
}

# Get cohort overview
query GetCohortOverview($cohortId: String!) {
  cohort(id: $cohortId)
  enrollments(cohortId: $cohortId)
  sessionHistory(cohortId: $cohortId)
}

# Get learner profile
query GetLearnerProfile($childId: String, $cohortId: String) {
  child(id: $childId)
  progress(childId: $childId)
  competencies(childId: $childId)
  assessments(childId: $childId)
}

# Poll active session
query GetSessionProgress($sessionId: String!) {
  session(id: $sessionId)
  participation(sessionId: $sessionId) # Refreshed every 3s
  interimResults(sessionId: $sessionId)
}
```

---

## SECTION 18: IMPLEMENTATION SEQUENCE

### 18.1 Recommended Phasing

**Phase H3.1:** Academy Authentication + Shell  
**Duration:** 2-3 days  
**Deliverables:**
- `/academy/login` route
- Academy shell layout
- Sidebar navigation
- Role authorization check
- Session persistence

**Phase H3.2:** Dashboard + My Cohorts  
**Duration:** 2-3 days  
**Deliverables:**
- `/academy/dashboard` screen
- `/academy/cohorts` screen
- Dashboard cards
- Cohort list + cards
- Quick session CTA

**Phase H3.3:** Cohort Overview + Roster  
**Duration:** 2-3 days  
**Deliverables:**
- `/academy/cohorts/{cohortId}` screen
- Cohort header + metrics
- Learner roster (table + filtering)
- Session schedule
- Progress visualization

**Phase H3.4:** Learner Profile + Details  
**Duration:** 2-3 days  
**Deliverables:**
- `/academy/cohorts/{cohortId}/learner/{childId}` screen
- Journey progress timeline
- Competencies display
- Assessment results
- Facilitator notes

**Phase H3.5:** Curriculum + Session Guide  
**Duration:** 2-3 days  
**Deliverables:**
- `/academy/cohorts/{cohortId}/curriculum` screen
- Activity sequence
- `/academy/curriculum/activity/{itemId}` session guide
- Guide content + steps
- Session guide actions

**Phase H3.6:** Active Session + Monitoring  
**Duration:** 3-4 days  
**Deliverables:**
- `/academy/cohorts/{cohortId}/session/active/{sessionId}` screen
- Real-time participation monitoring
- Interim results display
- Learner status list
- Polling infrastructure (3s refresh)

**Phase H3.7:** Session Debrief + Reflection  
**Duration:** 2-3 days  
**Deliverables:**
- `/academy/cohorts/{cohortId}/session/debrief/{sessionId}` screen
- Session outcomes summary
- Learner follow-up indicators
- Facilitator reflection section
- Parent connection notice

**Phase H3.8:** Profile + QA/Security/Accessibility  
**Duration:** 2-3 days  
**Deliverables:**
- `/academy/profile` screen
- End-to-end QA (all flows)
- Security audit (Firestore rules)
- Accessibility audit (WCAG AA)
- Performance optimization

**Total: 17-25 days** (assuming 1 developer, sequential phases)

### 18.2 Dependencies & Sequencing

```
H3.1 (Auth + Shell)
  ↓
H3.2 (Dashboard)  [requires auth, shell]
  ↓
H3.3 (Cohort)     [requires dashboard]
  ↓
H3.4 (Learner)    [requires cohort]
  ↓
H3.5 (Curriculum) [requires cohort]
  ↓
H3.6 (Session)    [requires curriculum + data]
  ↓
H3.7 (Debrief)    [requires session]
  ↓
H3.8 (QA + Polish) [requires all above]
```

**Parallelizable:**
- H3.4 (Learner) and H3.5 (Curriculum) can overlap
- Component extraction can happen in parallel

---

## SECTION 19: TEST STRATEGY

### 19.1 Authentication Tests

```
✓ Facilitator can login with email + password
✓ Facilitator can login with Google OAuth
✓ Child cannot access /academy/*
✓ Parent cannot access /academy/*
✓ Unauthorized facilitator (no cohort assigned) sees "no cohorts" state
✓ Facilitator session persists across page reloads
✓ Facilitator can logout
✓ After logout, redirects to /academy/login
```

### 19.2 Authorization Tests

```
✓ Facilitator can only see assigned cohorts
✓ Facilitator cannot access other facilitators' cohorts
✓ Facilitator cannot access parent-private data
✓ Facilitator cannot modify child progress
✓ Facilitator cannot modify learner assessments
✓ Admin can see all cohorts and facilitators
✓ Firestore rules enforce all above
```

### 19.3 Dashboard Tests

```
✓ Dashboard loads assigned cohorts
✓ Today's session CTA shows if activity scheduled
✓ Cohort cards display progress, engagement, at-risk count
✓ At-risk learner list shows correct signals
✓ [Start session] navigates to active session screen
✓ Refreshes every 5 seconds (participation data)
```

### 19.4 Cohort Overview Tests

```
✓ Cohort header displays name, facilitator, learner count
✓ Progress bar shows correct completion %
✓ Competencies display with scores and levels
✓ Learner roster displays all enrolled learners
✓ Can filter roster by status (on-track, behind, stuck)
✓ Can sort roster by name, progress, status
✓ Next session schedule shows upcoming activities
```

### 19.5 Learner Profile Tests

```
✓ Journey progress timeline displays correctly
✓ Competencies show scores, levels, evidence
✓ Assessment results show scores (pre + post)
✓ Recent decisions display choice + consequence
✓ Facilitator can add notes and they persist
✓ Learner status badge displays correctly
```

### 19.6 Session Tests

```
✓ Active session shows live participation (polling)
✓ Interim results update as learners submit
✓ Learner status list updates correctly
✓ Can end session → goes to debrief
✓ Session debrief shows outcomes
✓ Facilitator can add reflection notes
✓ Next activity link works
```

### 19.7 Responsive Tests

```
✓ Mobile (< 425px): Single column, hamburger menu, bottom nav
✓ Tablet (768px): Sidebar icons, main content, table view
✓ Desktop (1024px+): Full sidebar, optimized layout
✓ Touch targets are 48px minimum
✓ Tables convert to cards on mobile
✓ Text sizes adjust per breakpoint
```

### 19.8 Accessibility Tests

```
✓ All interactive elements keyboard-navigable
✓ Focus ring visible on all elements
✓ Color contrast 4.5:1 (normal), 3:1 (large)
✓ All status conveyed by icon + color + text
✓ Forms have labels associated with inputs
✓ Error messages clear and actionable
✓ Screen reader reads all content
✓ Respects prefers-reduced-motion
```

### 19.9 Privacy Tests

```
✓ Facilitator cannot view parent email/names
✓ Facilitator cannot view parent feedback
✓ Facilitator cannot view other families' data
✓ Facilitator cannot modify learner decisions
✓ Facilitator cannot assign themselves to cohorts
✓ Firestore rules block unauthorized access
```

---

## SECTION 20: MVP EXCLUSIONS (DO NOT BUILD)

### 20.1 Explicitly Out of Scope

**❌ NOT IN MVP:**

**Advanced Features:**
- ❌ Lesson authoring interface
- ❌ Curriculum builder / drag-and-drop
- ❌ Advanced analytics dashboard
- ❌ Detailed reports + exports
- ❌ Parent-teacher messaging
- ❌ Real-time notifications
- ❌ Attendance tracking (mark present/absent)
- ❌ Attendance report generation
- ❌ Multiple facilitators per cohort (v1: single lead)
- ❌ Multi-school view for admin

**Compliance Features:**
- ❌ GDPR data deletion tools
- ❌ Data export per child
- ❌ Audit logs for facilitator
- ❌ Certificates of completion
- ❌ Advanced role-based access control

**Surveillance:**
- ❌ Keystroke logging
- ❌ Screen recording
- ❌ Webcam monitoring
- ❌ Behavioral tracking (beyond scenario choices)
- ❌ Biometric data

**Grading:**
- ❌ Grades or scoring by facilitator
- ❌ Pass/fail determinations
- ❌ Child rankings or comparisons
- ❌ Performance metrics for facilitators

**LMS Features:**
- ❌ Discussion forums
- ❌ Peer collaboration tools
- ❌ Threaded comments
- ❌ Attendance marking
- ❌ Gradebook
- ❌ Assignment submission

**Teen Experience:**
- ❌ Teen-specific routes
- ❌ Teen dashboard
- ❌ Teen progress tracking

### 20.2 Why These Are Out

**Simplicity:** MVP must answer "What should I do today?" without enterprise overhead  
**Privacy:** No features that enable surveillance or family data exposure  
**Scope:** 9-11 screens is ambitious; authoring/reporting adds complexity  
**Pilot:** TATI is testing a hypothesis, not building a full LMS  
**Timeline:** 3-4 weeks doesn't allow for advanced features  

---

## SECTION 21: DEPENDENCIES & ASSUMPTIONS

### 21.1 External Dependencies

**Required:**
- ✅ Supabase Auth (parent + facilitator login)
- ✅ Firebase Auth (child identity)
- ✅ Firestore (learner data, cohorts, sessions)
- ✅ TanStack Router (routing)
- ✅ React Query (data fetching)
- ✅ Tailwind CSS (styling)
- ✅ TATI design system (components)

**NOT required for MVP:**
- ❌ WebSocket infrastructure (polling sufficient)
- ❌ Background jobs (sync data manually)
- ❌ Email service (later phases)
- ❌ PDF generation (guides as markdown)

### 21.2 Data Assumptions

**Assumed available by H3.1:**
- ✅ academyOrganizations, cohorts, enrollments collections in Firestore
- ✅ Facilitator role in user_roles table
- ✅ Cohort assignments (facilitatorUids array in cohort doc)
- ✅ Learner enrollments (childId in cohort/enrollments)
- ✅ Facilitator assignments (faciliatatorUids in child profile)

**Assumed NOT available (use defaults):**
- ❌ Student IDs or enrollment numbers (use TATI ID)
- ❌ Grade distribution data (show competencies, not grades)
- ❌ Attendance history (start fresh with sessions)

### 21.3 Technical Assumptions

**Assumed working:**
- ✅ Firestore rules support facilitator access
- ✅ Child session model unchanged (G6.1 intact)
- ✅ Scenario integrity verification (G5.1 intact)
- ✅ Parent privacy blocking (parentInsights blocked)

**Polling strategy:**
- 3-5 second refresh on session monitor (HTTP, not WebSocket)
- Should not exceed Firestore read quota for MVP cohorts (< 100 learners)

---

## SECTION 22: OPEN DECISIONS FOR APPROVAL

**Before H3.1 implementation, resolve:**

### Decision 1: Facilitator Account Provisioning
**Question:** Self-service signup vs admin-only provisioning?  
**Options:**
- **A)** Self-service: Facilitator signs up independently
- **B)** Admin-only: Admin invites facilitator + creates account

**Recommendation:** B (Admin-only for MVP control)  
**Impact:** Need minimal admin UI to invite; no signup flow for facilitators

**APPROVE:** ☐ A | ☐ B | ☐ Other:

---

### Decision 2: Real-Time Monitoring
**Question:** Real-time subscriptions (WebSocket) vs polling (HTTP)?  
**Options:**
- **A)** WebSocket subscriptions (instant updates, complex)
- **B)** HTTP polling every 3-5s (simpler, slight latency)

**Recommendation:** B (Polling for MVP simplicity)  
**Impact:** Session monitor updates every 3-5 seconds, not instant

**APPROVE:** ☐ A | ☐ B | ☐ Other:

---

### Decision 3: At-Risk Detection
**Question:** Automatic algorithmic signals vs manual facilitator flagging?  
**Options:**
- **A)** Automatic: System flags "behind", "stuck", etc based on rules
- **B)** Manual: Facilitator manually flags learners as needing support

**Recommendation:** A (Automatic, data-driven, consistent)  
**Impact:** Requires rule-based system; reduces facilitator burden

**APPROVE:** ☐ A | ☐ B | ☐ Other:

---

### Decision 4: Facilitator Notes Format
**Question:** Structured templates vs free-form text?  
**Options:**
- **A)** Structured: Checklists, predefined options (better analysis)
- **B)** Free-form text: Open text field (more flexible)

**Recommendation:** B (Free-form for MVP, more natural for facilitators)  
**Impact:** Notes not searchable/aggregatable in MVP

**APPROVE:** ☐ A | ☐ B | ☐ Other:

---

### Decision 5: Parent Visibility of Facilitator
**Question:** What can parents see about facilitator and sessions?  
**Options:**
- **A)** Facilitator name only (no session details)
- **B)** Facilitator name + facilitator notes (full transparency)
- **C)** No facilitator info (parent sees only child progress)

**Recommendation:** A (Name only; notes remain facilitator-private)  
**Impact:** Parent dashboard shows "Grade 5A (Teacher Kofi)" but no session notes

**APPROVE:** ☐ A | ☐ B | ☐ C | ☐ Other:

---

### Decision 6: Multi-Cohort Support
**Question:** Can one facilitator manage 2+ cohorts?  
**Options:**
- **A)** Yes: Facilitator switches between cohorts (more code)
- **B)** No: Each facilitator has 1 cohort (simpler)

**Recommendation:** A (Yes, expected in real schools)  
**Impact:** UI must support cohort switching; dashboard handles multiple

**APPROVE:** ☐ A | ☐ B | ☐ Other:

---

### Decision 7: Session Guide Format
**Question:** PDF vs markdown vs in-app interactive?  
**Options:**
- **A)** PDF: Downloadable, offline, printed
- **B)** Markdown: In-app, easier to iterate, plain text
- **C)** In-app interactive: Guided steps with checkboxes

**Recommendation:** B (Markdown in-app for faster iteration)  
**Impact:** No PDF export in MVP; facilitators see guide in browser

**APPROVE:** ☐ A | ☐ B | ☐ C | ☐ Other:

---

### Decision 8: Cohort Duplication Across Years
**Question:** Can "Grade 5A 2025" copy settings/enrollments from "Grade 5A 2024"?  
**Options:**
- **A)** Yes: Template/duplicate feature
- **B)** No: Admin creates fresh cohort each year

**Recommendation:** B (No duplication; fresh cohort each year)  
**Impact:** Admin must recreate cohorts yearly, but ensures clean data

**APPROVE:** ☐ A | ☐ B | ☐ Other:

---

## SECTION 23: H3.1 IMPLEMENTATION ACCEPTANCE CRITERIA

Academy MVP is complete when:

### Functional Criteria

**Authentication:**
- ✅ Facilitator can login with email + password or Google
- ✅ Child/parent cannot access /academy/*
- ✅ Facilitator session persists across reloads
- ✅ Logout works

**Navigation:**
- ✅ All 9 screens accessible
- ✅ Breadcrumbs work
- ✅ Back button works
- ✅ Sidebar navigation works
- ✅ Mobile hamburger menu works

**Dashboard:**
- ✅ Shows today's activity (if scheduled)
- ✅ Shows assigned cohorts
- ✅ Shows at-risk learners
- ✅ [Start session] CTA works

**Cohorts:**
- ✅ Lists all assigned cohorts
- ✅ Shows progress, engagement, at-risk count
- ✅ Links to cohort overview

**Cohort Overview:**
- ✅ Shows all learners
- ✅ Displays progress, competencies
- ✅ Shows session schedule
- ✅ Can filter/sort roster

**Learner Profile:**
- ✅ Shows journey progress
- ✅ Shows competencies
- ✅ Shows assessments
- ✅ Shows recent decisions
- ✅ Facilitator can add notes

**Curriculum:**
- ✅ Lists all activities in order
- ✅ Shows activity types, duration, objectives
- ✅ Links to session guide

**Session Guide:**
- ✅ Shows learning objective
- ✅ Shows facilitation steps
- ✅ Shows materials needed
- ✅ Shows troubleshooting tips
- ✅ [Start session] button works

**Active Session:**
- ✅ Shows live participation (polling)
- ✅ Interim results update
- ✅ Learner status list works
- ✅ [End session] button works

**Session Debrief:**
- ✅ Shows session outcomes
- ✅ Shows learners needing follow-up
- ✅ Facilitator can add reflection notes
- ✅ Shows next steps

### Security Criteria

- ✅ Facilitator cannot access other facilitators' cohorts
- ✅ Facilitator cannot access parent-private data
- ✅ Facilitator cannot modify learner progress
- ✅ Firestore rules enforced correctly
- ✅ No sensitive data in browser local storage

### UX Criteria

- ✅ All screens load in < 3 seconds
- ✅ Session monitor polling causes no lag
- ✅ No confusing error states
- ✅ Empty states helpful
- ✅ Loading states clear

### Accessibility Criteria

- ✅ All screens keyboard-navigable
- ✅ Focus indicators visible
- ✅ Color contrast 4.5:1+
- ✅ Form labels associated
- ✅ Screen reader friendly
- ✅ Mobile touch targets 48px+

### Responsive Criteria

- ✅ Works on 375px (mobile)
- ✅ Works on 768px (tablet)
- ✅ Works on 1024px+ (desktop)
- ✅ No horizontal scroll on mobile
- ✅ Tables convert to cards

### Performance Criteria

- ✅ Dashboard loads in < 2s
- ✅ Cohort roster loads in < 2s
- ✅ Session monitor doesn't exceed Firestore quota
- ✅ No unnecessary re-renders

### Privacy Criteria

- ✅ Facilitator never sees parent email/names
- ✅ Facilitator never sees parent-only insights
- ✅ Facilitator notes stay private to facilitator
- ✅ Child progress only shown to assigned facilitator

---

## SECTION 24: DEPENDENCIES ON OTHER PHASES

### On Completed Phases

**H0-H2.0 (Complete):**
- ✅ TATI design system (used as-is)
- ✅ Component library (reused)
- ✅ Junior experience (unmodified)
- ✅ Parent experience (unmodified)

**H3.0.1 (Just Complete):**
- ✅ Product & data contract (this is the specification)
- ✅ Role/privacy model (defines authorization)
- ✅ Firestore schema (defines data structures)

### On Parallel/Future Phases

**Firebase/Firestore (Parallel):**
- 🔲 academyOrganizations, cohorts collections must exist
- 🔲 Facilitator firestore.rules must be in place
- 🔲 Learner enrollment flow must work

**Backend Functions (Parallel):**
- 🔲 Facilitator role assignment
- 🔲 Session recording (on child activity)
- 🔲 Competency calculation (continuous)

**Auth System (Parallel):**
- 🔲 Facilitator login in Supabase
- 🔲 Role assignment in user_roles table

---

## SECTION 25: FINAL SUMMARY & NEXT STEPS

### What This Architecture Delivers

✅ **9-11 complete screen specifications** with data requirements  
✅ **Component architecture** (existing + new)  
✅ **Responsive strategy** across all breakpoints  
✅ **Accessibility roadmap** (WCAG AA)  
✅ **Implementation sequence** (8 phases, 17-25 days)  
✅ **Test strategy** (auth, privacy, functional, UX, responsive, accessibility)  
✅ **8 open decisions** for approval  

### What This Doesn't Include (Out of Scope for H3.1.0)

- ❌ Component code
- ❌ Route implementation  
- ❌ Backend API modifications
- ❌ Firestore rule changes
- ❌ Database schema changes
- ❌ Detailed wireframes/mockups
- ❌ Design tokens (uses existing TATI theme)

### Next Steps (After Approval)

1. **Review this architecture** — Does it answer the questions facilitators ask?
2. **Approve/modify the 8 decisions** — Set implementation constraints
3. **Verify Firestore schema** — Confirm academyOrganizations/cohorts/enrollments exist
4. **Verify Firestore rules** — Confirm facilitator authorization rules in place
5. **Begin H3.1** — Academy Authentication + Shell Foundation

---

## APPENDIX: KEY TERMINOLOGY

**Academy:** Facilitator experience (teachers/educators delivering TATI in groups)

**Cohort:** A group of learners (e.g., "Grade 5A"), typically a school classroom

**Facilitator:** Teacher or educator who guides learners through TATI in a cohort

**Learner:** Child participating in TATI via Academy (same as Junior learner)

**Session:** A facilitator-led group activity (e.g., scenario discussion)

**Journey:** 14-day TATI learning progression (pre-test → lessons → scenarios → post-test)

**Competency:** Financial skill being developed (e.g., goal-setting, saving)

**Support signal:** Data-driven indicator that learner may need help (not a judgment)

**Facilitator notes:** Narrative observations added by facilitator for context

**Session guide:** Facilitation instructions for an activity (intro, activity, debrief, wrap-up)

**Debrief:** Reflection after a session (outcomes, insights, next steps)

---

# END PHASE H3.1.0 — ACADEMY SCREEN & UX ARCHITECTURE

**Status:** ARCHITECTURE COMPLETE ✅  
**Ready for:** Implementation (H3.1 onwards)  
**Waiting for:** Approval + decision gate responses  

*"Academy is not a dashboard. It's a facilitator support system."*
