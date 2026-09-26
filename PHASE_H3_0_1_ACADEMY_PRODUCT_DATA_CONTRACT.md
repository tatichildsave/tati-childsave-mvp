# PHASE H3.0.1 — TATI ACADEMY PRODUCT & DATA CONTRACT
**Status:** READ-ONLY DISCOVERY & SPECIFICATION  
**Date:** 2026-09-26  
**Scope:** Complete facilitator operating model, school/cohort/session relationships, data ownership, security implications  

---

## EXECUTIVE SUMMARY

Academy exists because:

> **Parents may not have sufficient time to personally facilitate the TATI programme every day. A facilitator (teacher, community educator) must be able to deliver TATI effectively in a school/classroom setting.**

This contract defines:
- ✅ How facilitators operate (their jobs, decisions, context)
- ✅ School/cohort/session/learner hierarchy (data structure)
- ✅ Data ownership boundaries (who creates, who reads, privacy)
- ✅ Firebase/Firestore collections & documents (complete model)
- ✅ Authorization matrix (facilitator vs parent vs child vs admin)
- ✅ Required security rules (no existing rules modified, new rules for cohorts)
- ✅ Critical data flows (how data moves through the ecosystem)

**No code changes in this phase.** This document specifies the complete data contract before implementation.

---

## SECTION 1: CORE HYPOTHESIS & SYSTEM MODEL

### 1.1 Why Academy Exists

**Scenario:**
- Parent Ama wants her child Kwame (age 10) to develop financial capability
- Parent Ama is a trader in Kumasi; she's at the market 10+ hours/day
- She cannot personally guide Kwame through 14-day TATI journey
- Solution: Teacher Kofi at Kwame's school uses TATI in the classroom

**TATI Academy enables:**
- Teacher Kofi to deliver TATI to 25 learners in one Grade 5 cohort
- Teacher Kofi to see who understands, who is stuck, who needs support
- Teacher Kofi to facilitate class discussions (scenario outcomes, money decisions)
- Parent Ama to understand what Kwame is learning in class
- Parent Ama to reinforce at home (conversation starters from Kwame's competencies)
- TATI admin to measure: Did the programme work? Which cohorts succeeded?

### 1.2 The Four-Role Ecosystem

```
┌─────────────────────────────────────────────────────────────────────┐
│                    TATI CONNECTED ECOSYSTEM                         │
└─────────────────────────────────────────────────────────────────────┘

                            ADMIN
                       (Operates pilot)
                            │
                 ┌──────────┼──────────┐
                 │          │          │
              ACADEMY     SCHOOL    FAMILY
           (Facilitator) (cohorts)  (Parents)
                 │          │          │
                 │      ┌───┼───┐      │
                 │      │       │      │
               Lesson  JUNIOR  Home
              (Teacher) Learn  Reinforce
                 │      (Child) │
                 └──────┬───────┘
                        │
                    DATA FLOW
```

**Relationships:**
- 1 SCHOOL → many FACILITATORS
- 1 FACILITATOR → 1+ COHORTS
- 1 COHORT → 25+ LEARNERS
- 1 LEARNER → 1 CHILD (in Junior)
- 1 LEARNER → 1 PARENT FAMILY (at home)
- 1 COHORT → 1 PROGRAMME (e.g., SAVE track, 14-day journey)

### 1.3 Fundamental Principles

**Principle 1: Child Autonomy**
- Child makes decisions in scenarios
- Child earns/saves money through choices
- Data about child's learning comes FROM child's actions
- Facilitator sees results; does NOT manipulate them

**Principle 2: Parent Partnership**
- Parent is NOT responsible for daily instruction (teacher is)
- Parent IS responsible for home reinforcement
- Parent sees what child learned, not granular classroom data
- Parent receives actionable conversation starters

**Principle 3: Facilitator Leadership**
- Facilitator decides WHEN to do each activity (day 1, day 2, etc)
- Facilitator guides class discussion on scenario consequences
- Facilitator identifies learners needing support
- Facilitator is NOT a data analyst (insights must be clear)

**Principle 4: Data Integrity**
- Scenario choices (G5.1) verified server-side before saving
- No facilitator can modify child's progress/assessments
- All data writes are audited (who, when, what)
- Privacy: Facilitator never sees parent-private information

---

## SECTION 2: FACILITATOR OPERATING MODEL

### 2.1 Facilitator Primary Job

**"I have 25 learners in my Grade 5 class. Help me teach them financial capability in a way that is engaging, measurable, and connected to home."**

### 2.2 Facilitator Decision Points

**Daily:**
1. **Session preparation** — Which activity runs today?
2. **Participation** — Who's here, who's present, who needs support?
3. **Group facilitation** — How do I guide the class discussion?
4. **Feedback** — Who understood, who struggled?

**Weekly:**
5. **Learner identification** — Which children are behind or at-risk?
6. **Parent communication** — What should parents know/discuss at home?
7. **Adjustment** — Do we need more time on this concept?

**At end of journey:**
8. **Reflection** — What worked well, what would I change?
9. **Measurement** — Did learners grow in financial capability?

### 2.3 Facilitator Data Needs

**Before Session:**
- Today's activity (what, how long, materials needed)
- Who completed last activity (pacing awareness)
- Learner roster (names, TATI IDs for check-in)
- Session guide (what to discuss, when to pause)

**During Session:**
- Live participation tracking (who's progressing, who's stuck)
- Scenario consequence visualization (what happens to their money)
- Class-wide status (is everyone moving forward?)

**After Session:**
- Participation summary (who was present, who engaged, who struggled)
- Outcome snapshot (common learner choices, competency gains)
- At-risk alerts (who needs one-on-one support?)

**For Parent Communication:**
- Learner competencies (growth areas to discuss at home)
- Recent decisions (what did learner choose in scenarios?)
- Conversation starters (specific prompts for home)

### 2.4 Facilitator Cannot See

**❌ BLOCKED (Privacy boundaries):**
- Parent names, emails, contact information
- Parent feedback submitted to parents
- Parent-only insights
- Family financial data beyond the child's learning context
- Other cohort facilitators' data
- Other schools' data

**Why:** Parent relationship is separate from school relationship. Facilitator focus is teaching, not managing families.

---

## SECTION 3: SCHOOL/COHORT/SESSION/LEARNER HIERARCHY

### 3.1 Data Structure Overview

```
TATI ECOSYSTEM
│
├─ SCHOOL/ORGANIZATION
│  │  ├─ Id: unique identifier
│  │  ├─ Name: school name
│  │  ├─ Location: region/district
│  │  ├─ Contact: school contact person
│  │  ├─ Code: for facilitator enrollment (if needed)
│  │  └─ Status: active/inactive
│  │
│  └─ COHORT/CLASS (1+ per school)
│     │  ├─ Id: unique identifier
│     │  ├─ Name: class name (Grade 5A, etc)
│     │  ├─ Academic year
│     │  ├─ Facilitator UIDs: [uid1, uid2, ...] (lead + assistants)
│     │  ├─ Programme: "save" (track id)
│     │  ├─ Session schedule: [activity, date, time]
│     │  ├─ Status: active/completed
│     │  └─ Enrollment: [childId, childId, ...]
│     │
│     └─ LEARNER ENROLLMENT (1+ per cohort)
│        ├─ childId: points to Junior learner
│        ├─ familyId: points to parent family
│        ├─ enrolledAt: timestamp
│        └─ status: active/completed
│
└─ SESSION (facilitator-led activity)
   ├─ cohortId: which cohort
   ├─ sessionDate: when
   ├─ activity: which item (lesson/scenario/assessment)
   ├─ duration: how long
   ├─ facilitatorNotes: text field
   └─ participation: [childId: {present, engaged, score}]
```

### 3.2 Key Relationships

**School → Cohort → Learner Chain:**
```
Ashanti School (schoolId)
  ├─ Grade 5A (cohortId) — 25 learners — Teacher Kofi
  │   ├─ Kwame (childId: child-123) → Parent Ama
  │   ├─ Ama (childId: child-456) → Parent Yaw
  │   └─ [23 more learners]
  │
  └─ Grade 5B (cohortId) — 24 learners — Teacher Adwoa
      ├─ Akos (childId: child-789) → Parent Comfort
      └─ [23 more learners]
```

**Facilitator Authorization:**
```
Teacher Kofi (facilitator-uid-1)
  ├─ Can READ: Ashanti School data (school-level)
  ├─ Can READ: Grade 5A cohort (assignment)
  ├─ Can READ: All Grade 5A learners' progress
  ├─ Can READ: All Grade 5A learners' assessments/scenarios
  └─ CANNOT: See Grade 5B (not assigned)
  └─ CANNOT: See parent names/emails
  └─ CANNOT: Modify learner progress (read-only)
```

**Parent Authorization:**
```
Parent Ama (parent-uid-2)
  ├─ Can READ: Own family data
  ├─ Can READ: Own child (Kwame) progress
  ├─ Can READ: Insights about Kwame
  ├─ CANNOT: See other families
  ├─ CANNOT: See cohort details
  ├─ CANNOT: See facilitator names/data
```

**Admin Authorization:**
```
Admin (admin-uid-1)
  ├─ Can READ/WRITE: All schools
  ├─ Can READ/WRITE: All cohorts
  ├─ Can MANAGE: Facilitator assignments
  ├─ Can VIEW: All learners, all progress
  ├─ Can GENERATE: Reports across all data
```

---

## SECTION 4: DATA OWNERSHIP & VISIBILITY BOUNDARIES

### 4.1 Data Ownership Model

**Who Creates What:**

| Data | Created By | Owned By | Readable By | Modifiable By |
|------|---|---|---|---|
| **School record** | Admin | Admin | Admin, assigned facilitators | Admin |
| **Cohort record** | Admin | Admin | Admin, assigned facilitators | Admin |
| **Learner enrollment** | Admin or parent | Cohort | Facilitator, Parent, Admin | Admin |
| **Child profile** | Parent | Parent | Parent, assigned facilitators, Admin | Parent, Admin |
| **TATI ID** | System | Child | Facilitator (for roster), Parent, Admin | Never |
| **Child session** | Child | Child | Child, Parent, Admin | Child (revoke only) |
| **Journey progress** | Child (through activity) | Child | Child, Parent, assigned facilitators, Admin | System only (via activity) |
| **Assessment result** | Child (through test) | Child | Child, Parent, assigned facilitators, Admin | System only (via test engine) |
| **Scenario session** | Child (through choices) | Child | Child, Parent, assigned facilitators, Admin | Child (via scenario choices only) |
| **Competency record** | System (via assessment) | Child | Child, Parent, assigned facilitators, Admin | System only (via assessment) |
| **Parent insights** | System | Parent | Parent, Admin | System only |
| **Facilitator notes** | Facilitator | Facilitator | Facilitator, Admin | Facilitator only |
| **Session record** | Facilitator | Facilitator | Facilitator, Admin | Facilitator |

### 4.2 Privacy Boundaries (What Facilitators CANNOT Access)

**Firestore Rule: Parent-Private Data**

```firestore
match /families/{familyId}/children/{childId}/parentInsights/{insightId} {
  allow read: if isFamilyAdult(familyId) || isAdmin();
  // BLOCK: isAssignedFacilitator() does NOT get access
}
```

**Parent-only collections:**
- parentInsights (conversation starters, growth summaries)
- parentFeedback (parent-to-parent notes)
- familyNotes (home-specific observations)

**Why:** Parent relationship is distinct from facilitator relationship. Facilitator knows learner as student; parent knows child as family. They see different things.

### 4.3 Facilitator-Specific Visibility

**What Facilitators SEE in learner profile:**
- Name (for classroom roster)
- TATI ID (for non-identifying learner lookup)
- Age (developmental context)
- Curriculum level (teaching context)
- Tier: "junior" (classification only)

**What Facilitators SEE in progress:**
- Journey progress (which lessons/scenarios done)
- Assessment results (scores, competency breakdown)
- Scenario outcomes (money earned/saved, choices made)
- Competencies (which skills developed, at what level)
- Achievements (badges earned)
- Engagement (time spent, activity sequence)

**What Facilitators DO NOT SEE:**
- Parent names, emails, phone numbers
- Family address or location (privacy)
- Any parent-submitted data
- Any parent-only notes
- Reasons parent created child (family context)
- Family financial data beyond child's learning
- Sibling data

---

## SECTION 5: COMPLETE FIRESTORE DATA CONTRACT

### 5.1 Existing Collections (No Changes)

**Users:**
```firestore
users/{uid}
{
  "uid": "user-uuid",
  "email": "kwame.owusu@gmail.com",
  "displayName": "Kwame Owusu",
  "roles": ["parent"],  // or ["facilitator"], ["admin"], or ["child"] (not used in Firestore)
  "status": "active",   // or "pending", "disabled"
  "photoURL": "...",
  "createdAt": timestamp,
  "updatedAt": timestamp
}
```

**Families:**
```firestore
families/{familyId}
{
  "id": "family-uuid",
  "familyId": "family-uuid",
  "name": "Owusu Family",
  "createdBy": "parent-uid",
  "createdAt": timestamp,
  "updatedAt": timestamp
}
```

**Family Members:**
```firestore
families/{familyId}/members/{uid}
{
  "uid": "user-uuid",
  "role": "parent",  // or "guardian"
  "status": "active",
  "joinedAt": timestamp
}
```

**Children (Family-scoped):**
```firestore
families/{familyId}/children/{childId}
{
  "id": "child-uuid",
  "familyId": "family-uuid",
  "tatiId": "TATI-A1B2C3D4",
  "name": "Kwame",
  "age": 10,
  "avatar": "🧒",
  "tier": "junior",
  "curriculum_level": "Primary 5",
  "onboarding_step": 0,
  "onboarding_completed": true,
  "created_by": "parent-uid",
  "facilitatorUids": ["facilitator-uid-1"],  // ← EXISTING, used for authorization
  "cohortId": "cohort-uuid",  // ← NEW: facilitator can use this to find cohort
  "createdAt": timestamp,
  "updatedAt": timestamp
}
```

**Journey Progress (per child):**
```firestore
families/{familyId}/children/{childId}/journeyProgress/{itemKey}
{
  "id": "lesson:meet-your-money",  // or "scenario:kwame-request--ch1", etc
  "familyId": "family-uuid",
  "childId": "child-uuid",
  "child_profile_id": "child-uuid",
  "track_id": "save",
  "item_type": "lesson",  // or "scenario", "assessment", "reflection"
  "item_id": "meet-your-money",
  "status": "completed",  // or "started", "not-started"
  "score": null,
  "max_score": null,
  "details": {
    // Scenario-specific data
    "scenario_id": "kwame-request",
    "chapter": "ch1",
    "day": 1,
    "available": 50,
    "saved": 40,
    "goal": 80,
    "decisions": [
      { "choiceId": "save-40", "consequence": "A strong start..." }
    ],
    "competencies": {
      "goal-setting": 3,
      "saving": 2
    }
  },
  "createdAt": timestamp,
  "updatedAt": timestamp
}
```

**Assessment Attempts (per child):**
```firestore
families/{familyId}/children/{childId}/assessmentAttempts/{attemptId}
{
  "id": "save-pre-1",
  "familyId": "family-uuid",
  "childId": "child-uuid",
  "child_profile_id": "child-uuid",
  "assessment_id": "save-pre",
  "assessment_type": "pre",  // or "post"
  "points": 15,
  "max_points": 25,
  "responses": {
    "p1": "b",  // question id → answer id
    "p2": "a"
  },
  "competency_scores": {
    "goal-setting": 2,
    "needs-vs-wants": 3
  },
  "completed_at": timestamp
}
```

**Scenario Sessions (per child):**
```firestore
families/{familyId}/children/{childId}/scenarioSessions/{scenarioKey}
{
  "id": "kwame-request",
  "familyId": "family-uuid",
  "childId": "child-uuid",
  "scenario_id": "kwame-request",
  "status": "completed",  // or "in-progress"
  "nodeId": "market-finale",
  "phase": "chapter-5",
  "day": 14,
  "available": 72,  // current money available
  "saved": 82,      // money in savings
  "goalTarget": 80,
  "decisions": [
    {
      "choiceId": "save-40",
      "day": 1,
      "competencies": { "goal-setting": 3, "saving": 2 }
    },
    // ... more decisions
  ],
  "endingId": "bag-purchased",
  "updatedAt": timestamp
}
```

**Scenario Decisions (per scenario session):**
```firestore
families/{familyId}/children/{childId}/scenarioSessions/{scenarioKey}/decisions/{decisionId}
{
  "id": "decision-1",
  "choiceId": "save-40",
  "day": 1,
  "competencies": { "goal-setting": 3 }
}
```

**Competencies (per child):**
```firestore
families/{familyId}/children/{childId}/competencies/{competencyId}
{
  "id": "goal-setting",
  "competency_id": "goal-setting",
  "score": 2.5,  // 0-3 scale
  "level": "growing",  // or "strong"
  "evidence": [
    { "itemId": "kwame-request--ch1", "score": 3 },
    { "itemId": "set-a-goal", "score": 2 }
  ]
}
```

**Achievements (per child):**
```firestore
families/{familyId}/children/{childId}/achievements/{achievementId}
{
  "id": "super-saver",
  "achievement_id": "super-saver",
  "title": "Super Saver",
  "icon": "🏆",
  "celebrated": true,
  "awarded_at": timestamp
}
```

**Parent Insights (per child - parent-only):**
```firestore
families/{familyId}/children/{childId}/parentInsights/{insightId}
{
  "id": "insight-1",
  "child_name": "Kwame",
  "competencies": [
    {
      "competency": "saving",
      "level": "growing",
      "sentence": "Kwame is still building the habit of keeping a little back.",
      "action": "Ask what they would do if they received GH₵50 today."
    }
  ],
  "recentDecisions": [
    "Chose to save GH₵40 in the savings box (strong start)"
  ],
  "generatedAt": timestamp
}
```

### 5.2 NEW Collections for Academy (Schema Only)

**Schools/Organizations:**
```firestore
academyOrganizations/{orgId}
{
  "id": "org-uuid",
  "name": "Ashanti School",
  "location": "Kumasi, Ashanti Region",
  "contactName": "Mr. Boateng",
  "contactEmail": "principal@ashanti-school.edu.gh",
  "schoolCode": "ASH-001",  // for facilitator enrollment
  "status": "active",  // or "inactive", "pending"
  "academicYear": "2026",
  "createdBy": "admin-uid",
  "createdAt": timestamp,
  "updatedAt": timestamp
}
```

**Cohorts (per school):**
```firestore
academyOrganizations/{orgId}/cohorts/{cohortId}
{
  "id": "cohort-uuid",
  "orgId": "org-uuid",
  "name": "Grade 5A",
  "facilitatorUids": ["facilitator-uid-1", "facilitator-uid-2"],  // lead + assistants
  "programme": "save",  // track id
  "academicYear": "2026",
  "startDate": timestamp,  // expected start of 14-day journey
  "status": "active",  // or "completed", "planned"
  "description": "Financial literacy class for Grade 5A (ages 10-11)",
  "createdBy": "admin-uid",
  "createdAt": timestamp,
  "updatedAt": timestamp
}
```

**Cohort Enrollments:**
```firestore
academyOrganizations/{orgId}/cohorts/{cohortId}/enrollments/{childId}
{
  "childId": "child-uuid",
  "familyId": "family-uuid",
  "status": "active",  // or "completed", "dropped"
  "enrolledAt": timestamp,
  "completedAt": timestamp (optional)
}
```

**Cohort Sessions (facilitator-led activities):**
```firestore
academyOrganizations/{orgId}/cohorts/{cohortId}/sessions/{sessionId}
{
  "id": "session-uuid",
  "cohortId": "cohort-uuid",
  "date": timestamp,  // when session occurred
  "activity": "scenario:kwame-request--ch1",  // which item from track
  "activityLabel": "Days 1–2 · Plan and earn",
  "duration": 45,  // minutes
  "facilitatorUid": "facilitator-uid-1",  // who ran it
  "facilitatorNotes": "Class was engaged. Three learners needed extra support with goal-setting.",
  "attendance": {
    "child-uuid-1": { "present": true, "engaged": true },
    "child-uuid-2": { "present": true, "engaged": false },
    "child-uuid-3": { "present": false, "engaged": null }
  },
  "outcomes": {
    "participated": 23,
    "stuck": 2,
    "commonChoices": {
      "save-40": 8,
      "save-30": 12,
      "save-20": 3
    },
    "competencyGains": {
      "goal-setting": 2.1,
      "saving": 1.9
    }
  },
  "createdAt": timestamp,
  "updatedAt": timestamp
}
```

### 5.3 Data Relationships (Complete Map)

```
Supabase Tier (Auth/Credentials)
│
├─ profiles/{userId}
│   └─ user_roles (parent, facilitator, admin)
│       └─ child_credentials (if child)
│           └─ child_sessions (active sessions)
│
└─ [Families moved to Firestore for flexibility]


Firestore Tier (Learning & Cohorts)
│
├─ academyOrganizations/{orgId}  ← Admin provisions
│   │
│   └─ cohorts/{cohortId}  ← Admin creates
│       │   ├─ facilitatorUids: [uid1, uid2]  ← Facilitator authorized here
│       │   └─ programme: "save"
│       │
│       ├─ enrollments/{childId}  ← Learner enrolled
│       │   └─ points to: families/{familyId}/children/{childId}
│       │
│       └─ sessions/{sessionId}  ← Facilitator logs each activity
│           ├─ attendance: {childId: present, engaged}
│           ├─ outcomes: commonChoices, competencyGains
│           └─ facilitatorNotes
│
├─ families/{familyId}  ← Parent-created
│   │
│   └─ children/{childId}
│       │   ├─ cohortId: points to academyOrganizations/{orgId}/cohorts/{cohortId}
│       │   └─ facilitatorUids: [facilitator-uid-1]  ← Authorization array
│       │
│       ├─ journeyProgress/{itemKey}  ← Child actions recorded
│       ├─ assessmentAttempts/{id}   ← Assessment results
│       ├─ scenarioSessions/{id}     ← Scenario outcomes
│       ├─ competencies/{id}         ← Derived from assessments
│       ├─ achievements/{id}         ← Badge system
│       └─ parentInsights/{id}       ← Parent-only (blocked from facilitators)
│
└─ users/{uid}  ← All roles (parent, facilitator, admin)
    ├─ roles: ["parent", "facilitator"]
    └─ status: "active"
```

---

## SECTION 6: AUTHORIZATION MATRIX (COMPLETE)

### 6.1 Access Control by Resource

| Resource | JUNIOR (Child) | PARENT | FACILITATOR | ADMIN |
|---|---|---|---|---|
| **Own user profile** | View/Update own | View/Update own | View/Update own | View/Update any |
| **academyOrganizations** | ❌ | ❌ | Read assigned school | Read/Write/Delete |
| **cohorts** | ❌ | ❌ | Read assigned cohorts | Read/Write/Delete |
| **cohort enrollments** | ❌ | ❌ | Read (view roster) | Read/Write/Delete |
| **cohort sessions** | ❌ | ❌ | Create/Read/Update own | Read/Write/Delete |
| **Family record** | ❌ | Read/Update own | ❌ | Read/Write/Delete |
| **Own child profile** | Read own | Read/Update own | ❌ (see via enrollment) | Read/Write/Delete |
| **Assigned child profile** | ❌ | ❌ | Read only | Read/Write/Delete |
| **journeyProgress** | Create/Read own | Read own child | Read assigned children | Read/Write/Delete |
| **assessmentAttempts** | Read own | Read own child | Read assigned children | Read/Write/Delete |
| **scenarioSessions** | Create/Read own | Read own child | Read assigned children | Read/Write/Delete |
| **competencies** | Read own | Read own child | Read assigned children | Read/Write/Delete |
| **achievements** | Read own | Read own child | Read assigned children | Read/Write/Delete |
| **parentInsights** | ❌ | Read own child | ❌ **BLOCKED** | Read/Write/Delete |
| **Facilitator notes** | ❌ | ❌ | Create/Read/Update own | Read/Write/Delete |
| **Feedback** | Create own | Create own | Create own | Read/Write/Delete |

### 6.2 Firestore Rules Implementation

**New Function: Facilitator Access**

```firestore
function isFacilitatorOfCohort(orgId, cohortId) {
  return signedIn() && hasRole('facilitator')
    && 'facilitatorUids' in get(/databases/$(database)/documents/academyOrganizations/$(orgId)/cohorts/$(cohortId)).data
    && get(/databases/$(database)/documents/academyOrganizations/$(orgId)/cohorts/$(cohortId)).data.facilitatorUids.hasAny([request.auth.uid]);
}

function isFacilitatorOfEnrolledLearner(orgId, cohortId, childId) {
  return isFacilitatorOfCohort(orgId, cohortId)
    && exists(/databases/$(database)/documents/academyOrganizations/$(orgId)/cohorts/$(cohortId)/enrollments/$(childId));
}
```

**Rules for Academy Cohorts (NEW):**

```firestore
match /academyOrganizations/{orgId} {
  allow read: if isAdmin() || isFacilitatorOfAnyCohort(orgId);
  allow create, update, delete: if isAdmin();

  match /cohorts/{cohortId} {
    allow read: if isAdmin() || isFacilitatorOfCohort(orgId, cohortId);
    allow create, update, delete: if isAdmin();

    match /enrollments/{childId} {
      allow read: if isAdmin() || isFacilitatorOfCohort(orgId, cohortId);
      allow create, update, delete: if isAdmin();
    }

    match /sessions/{sessionId} {
      allow read: if isAdmin() || isFacilitatorOfCohort(orgId, cohortId);
      allow create: if isFacilitatorOfCohort(orgId, cohortId)
        && request.resource.data.facilitatorUid == request.auth.uid
        && request.resource.data.cohortId == cohortId;
      allow update: if isAdmin() || (request.auth.uid == resource.data.facilitatorUid && isFacilitatorOfCohort(orgId, cohortId));
      allow delete: if isAdmin();
    }
  }
}
```

**Rules for Parent Insights (BLOCK from facilitators - UNCHANGED):**

```firestore
match /families/{familyId}/children/{childId}/parentInsights/{insightId} {
  allow read: if isFamilyAdult(familyId) || isAdmin();
  // ❌ NO facilitator access
  allow write: if false;
}
```

---

## SECTION 7: DATA FLOWS & CRITICAL SEQUENCES

### 7.1 Enrollment Flow

**Who creates what, in what order:**

```
1. ADMIN ACTION: Create school
   POST /admin/schools
   → academyOrganizations/{orgId}
   
2. ADMIN ACTION: Create cohort + assign facilitator
   POST /admin/cohorts
   → academyOrganizations/{orgId}/cohorts/{cohortId}
   → Set facilitatorUids: [facilitator-uid-1]
   
3. PARENT ACTION: Create family + child
   POST /parent/family/children
   → families/{familyId}/children/{childId}
   → Set tatiId, name, age, etc
   
4. ADMIN ACTION: Enroll child in cohort
   POST /admin/cohorts/{cohortId}/enroll
   → academyOrganizations/{orgId}/cohorts/{cohortId}/enrollments/{childId}
   → Also set families/{familyId}/children/{childId}/cohortId = cohortId
   → Also set families/{familyId}/children/{childId}/facilitatorUids = [uid1]
   
5. FACILITATOR SEES: Cohort roster at /academy/cohorts/{cohortId}
   GET /academyOrganizations/{orgId}/cohorts/{cohortId}/enrollments
   → List of all children, with journeyProgress summary
```

### 7.2 Session Execution Flow

**A classroom session from start to finish:**

```
DAY 1: Morning (8:00 AM)

1. FACILITATOR: Opens /academy/cohorts/{cohortId}/session/new
   Sees: "Today's activity: Days 1–2 · Plan and earn (Scenario)"
   
2. FACILITATOR: Clicks "Start session"
   POST /cohorts/{cohortId}/sessions
   → Creates academyOrganizations/{orgId}/cohorts/{cohortId}/sessions/{sessionId}
   → Sets activity: "scenario:kwame-request--ch1"
   → Opens /academy/cohorts/{cohortId}/session/active/{sessionId}
   
3. FACILITATOR: Guides class discussion
   "You have 14 days, GH₵50, want a GH₵80 school bag.
    How much goes in the savings box?"
   
4. CHILDREN (in classroom at individual devices):
   - Open /child/home
   - Navigate to /child/scenario/kwame-request
   - Make choice (e.g., save-40: put GH₵40 in savings box)
   - Receive consequence: "A strong start with a thin pocket"
   - POST to server: scenario decision saved + verified (G5.1)
   → families/{familyId}/children/{childId}/scenarioSessions/kwame-request
   → decision recorded: { choiceId: "save-40", competencies: {...} }
   
5. FACILITATOR: Real-time monitoring
   GET /academy/cohorts/{cohortId}/session/active (polling every 3s)
   Sees:
   - Kwame: ✓ completed (chose save-40)
   - Ama: ✓ completed (chose save-30)
   - Akos: ⏳ in progress
   - [23 more learners with status]
   
6. FACILITATOR: Waits for 23/25 to complete
   (Some faster, some slower - facilitator pauses class discussion)
   
7. CHILDREN: Submit choices
   Last learner finishes at 8:35 AM
   
8. FACILITATOR: Session monitor shows all done
   "Results: 8 chose save-40, 12 chose save-30, 5 chose save-20"
   
9. FACILITATOR: Facilitates discussion
   "Why did more of you choose save-30? What does that tell us?"
   (Class discusses decision rationale)
   
10. FACILITATOR: Adds notes
    POST /sessions/{sessionId}
    facilitatorNotes: "Class engaged. Interesting split between save-40
    (bold savers) and save-30 (balanced). Three learners needed clarification
    on goal-setting."
    
11. FACILITATOR: Ends session
    PATCH /sessions/{sessionId}
    → Sets status: completed
    → Calculates outcomes:
       - Participation: 25/25 present, 23/25 engaged
       - Common choices: {save-40: 8, save-30: 12, save-20: 5}
       - Competency gains: avg goal-setting +2.1, saving +1.9
    
12. FACILITATOR: Views /academy/cohorts/{cohortId}/session/debrief
    Sees summary:
    - "85% engagement (21/25)"
    - "Average competency growth: +2.0"
    - "At risk: 2 learners"
    - "Next: Watch for retention on saving habit"
    
13. SYSTEM: Triggers parent updates
    For each learner:
    → Recompute parentInsights
    → Generate conversation starters
    → New competency sentence: "Kwame is becoming more confident..."
    
14. PARENT (at home, evening):
    Opens /parent/child/child-123
    Sees:
    - New badge earned? (if scenario completed)
    - Journey progress: "Days 1–2: Goal-setting · Completed"
    - Competency insight: "Kwame is becoming more confident..."
    - Conversation starter: "Ask what they would do with GH₵50"
```

### 7.3 At-Risk Detection Flow

**Facilitator identifies struggling learners:**

```
1. FACILITATOR: Views /academy/cohorts/{cohortId}/learners
   Table shows all learners with "At-risk?" indicator:
   - Status: "In-progress", "Behind", "Stuck", "Completed"
   - Last activity: timestamp (who hasn't done anything recently?)
   - Engagement: "High", "Medium", "Low" (based on decisions/time)
   - Competencies: which are weak?
   
2. FACILITATOR: Sees Akos marked "STUCK"
   (No progress in 3 days, repeated wrong choices, low competency)
   
3. FACILITATOR: Clicks Akos card → /academy/cohorts/{cohortId}/learner/child-xyz
   Sees:
   - Journey progress: Pre-assessment (5/25 pts) → Lesson 1 done → Scenario ch1 in progress
   - Scenario state: Day 1, saved GH₵5 (very conservative), made 1 choice
   - Assessment insight: "Struggling with goal-setting (0.5/3)"
   - Competency: "needs-vs-wants" not yet practiced
   
4. FACILITATOR: Recognizes the pattern
   "Akos is over-cautious. Probably anxious about money. Needs one-on-one support."
   
5. FACILITATOR: Adds note
   /learners/child-xyz
   facilitatorNotes: "Follow up with Akos. Seems anxious about money safety.
   Recommend: Show how savings box works, practice with real cedis."
   
6. SYSTEM: Flags for admin
   → If 5+ learners stuck, school may need intervention
   → Triggers alert: "Class struggling with goal-setting (avg 1.2/3)"
   
7. PARENT (Akos's mother):
   Opens /parent/child/child-xyz
   Sees:
   - Journey progress: In chapter 1
   - Competency: "goal-setting growing"
   - Conversation starter: "Ask about their savings plan. What amount felt scary?"
   (No mention of "stuck" - parent frame is supportive, not alarming)
```

---

## SECTION 8: SESSION DEFINITION & CLASSROOM MODEL

### 8.1 What is a "Session"?

**NOT:**
- ❌ Individual child activity (that's independent learning)
- ❌ Just data collection (that's surveillance)
- ❌ Teacher delivering lecture (that's traditional teaching)

**IS:**
- ✅ Guided group experience where facilitator orchestrates TATI activity
- ✅ Facilitator prepares, contextualizes, discusses outcomes
- ✅ Learners make autonomous choices in TATI, facilitator doesn't prescribe answers
- ✅ Classroom discussion on consequences (what does each choice mean?)
- ✅ Optional: One-on-one support for stuck learners

### 8.2 Session Structure

**Pre-Session (Facilitator prep):**
1. **Open**: /academy/cohorts/{cohortId}/session/new
2. **See**: Today's activity (lesson/scenario/assessment) + guide
3. **Decide**: Timing, pacing, discussion points
4. **Brief class**: "Today we're doing Days 1–2 of the School Reopening story..."

**During Session (Group + Individual):**
1. **Introduce**: Scenario context (e.g., "You have 14 days, GH₵50...")
2. **Release**: Children work individually at own pace (devices)
3. **Monitor**: Facilitator watches participation (polling or live)
4. **Support**: 1:1 help for stuck learners
5. **Facilitate**: Stop, check in, discuss interim results

**Post-Session (Group debrief):**
1. **Reveal**: What choices did the class make?
2. **Discuss**: Why did you choose that? What happened?
3. **Reflect**: What did you learn about money today?
4. **Note**: Facilitator logs outcomes + notes

**Recording:**
```firestore
academyOrganizations/{orgId}/cohorts/{cohortId}/sessions/{sessionId}
{
  activity: "scenario:kwame-request--ch1",
  date: timestamp,
  facilitatorNotes: "Class engaged, good discussion on needs vs wants",
  attendance: { childId: {present, engaged} },
  outcomes: { participated, stuck, commonChoices, competencyGains }
}
```

### 8.3 Session Data Collection (Privacy-Preserving)

**What Gets Recorded:**
- ✅ Who was present (name needed for attendance)
- ✅ Who engaged (did they make choices, ask questions?)
- ✅ Common outcomes (not individual comparisons)
- ✅ Facilitator observations (narrative, not grading)
- ✅ Competency growth (aggregated, not ranked)

**What DOESN'T:**
- ❌ Compare learners publicly (no leaderboards)
- ❌ Shame or highlight struggling learners
- ❌ Rank children by speed or correctness
- ❌ Create competition

**Why:** Children ages 8-12 are sensitive to comparison. TATI focuses on growth and autonomy, not ranking.

---

## SECTION 9: ACADEMY INFORMATION ARCHITECTURE

### 9.1 Facilitator Navigation Model

**Mental Model:**
```
"I have a class. I need to teach them financial capability.
 What do I do today? How are they doing? Who needs help?"
```

**Navigation Structure:**

```
/academy/login
  ↓
/academy/dashboard
  ├─ Welcome message ("Hello, Teacher Kofi")
  ├─ Quick summary:
  │  ├─ My cohorts (2 active, 1 completed)
  │  ├─ Today's activity (Grade 5A: Days 1–2 scenario)
  │  ├─ Class status: 25/25 present, 23/25 engaged
  │  └─ At-risk learners: 2 stuck, 1 behind
  │
  └─ Quick links:
     ├─ "Start today's session" → new session
     ├─ "View cohort roster" → learner list
     ├─ "See results" → debrief view

/academy/cohorts
  └─ List of my cohorts (click to expand)
     ├─ Grade 5A (lead teacher Kofi, assistant Ama)
     │  └─ 25 learners enrolled
     │
     └─ Grade 5B (lead teacher Adwoa)
        └─ 24 learners enrolled

/academy/cohorts/{cohortId}
  ├─ Cohort overview
  │  ├─ Class name & info
  │  ├─ Overall progress: 8/28 activities completed
  │  ├─ Average competency: goal-setting 2.1/3, saving 1.8/3
  │  ├─ At-risk indicators: 3 learners stuck
  │  └─ Session schedule (activities by date)
  │
  ├─ Learner roster (table)
  │  ├─ Name, TATI ID
  │  ├─ Status: "In-progress", "Stuck", "Behind"
  │  ├─ Progress: "Days 1–2" (current activity)
  │  ├─ Engagement: "High", "Medium", "Low"
  │  ├─ Competencies (quick view)
  │  └─ Last activity: timestamp
  │
  ├─ Start today's session
  │  ├─ Activity preview: "Days 1–2 · Plan and earn (Scenario)"
  │  ├─ Duration: 45 min estimate
  │  ├─ "Open session guide" → PDF/markdown
  │  └─ "Start session" button
  │
  └─ Session history
     ├─ Day 1: Days 1–2 scenario (25 present, 23 engaged)
     ├─ Day 2: Reflection (25 present, 22 engaged)
     └─ [more sessions]

/academy/cohorts/{cohortId}/learner/{childId}
  ├─ Learner profile
  │  ├─ Name, TATI ID, age, grade level
  │  └─ Enrollment date
  │
  ├─ Journey progress
  │  ├─ Timeline: Pre-assessment → Lessons → Scenarios → Post-assessment
  │  ├─ Current: Scenario Days 1–2 (day 1 of 2)
  │  └─ Timeline with dates
  │
  ├─ Assessment results
  │  ├─ Pre-test: 5/25 (needs support on goal-setting)
  │  └─ Post-test: (not yet)
  │
  ├─ Competencies (detailed)
  │  ├─ goal-setting: 1.5/3 (growing)
  │  │  └─ Evidence: Pre-assessment (1.0), Scenario ch1 (2.0)
  │  ├─ saving: 1.0/3 (growing)
  │  └─ needs-vs-wants: not yet
  │
  ├─ Scenario outcomes (if applicable)
  │  └─ "School Reopening: Day 1: Chose save-40 (bold start)"
  │
  └─ Facilitator notes
     └─ "Follow up: Akos is over-cautious about money. Anxious?"

/academy/cohorts/{cohortId}/session/active/{sessionId}
  ├─ Session header
  │  ├─ Activity: "Days 1–2 · Plan and earn"
  │  ├─ Duration: Started 8:05 AM, 20 min elapsed
  │  └─ Facilitator: Kofi
  │
  ├─ Participation monitor
  │  ├─ 23/25 have submitted choices
  │  ├─ 2 still in progress
  │  ├─ 0 offline/stuck
  │  └─ Real-time progress bar
  │
  ├─ Interim results
  │  └─ Common choices:
  │     ├─ save-40: 8 learners (bold start)
  │     ├─ save-30: 12 learners (balanced)
  │     └─ save-20: 3 learners (cautious)
  │
  ├─ Facilitator actions
  │  ├─ "Message class" (send note, not interrupt)
  │  ├─ "End session" (mark complete)
  │  └─ "Add note"
  │
  └─ Help me (contextual support)
     ├─ "What should I do if learner is stuck?"
     ├─ "How do I discuss consequences?"

/academy/cohorts/{cohortId}/session/debrief/{sessionId}
  ├─ Session summary
  │  ├─ Activity: "Days 1–2 · Plan and earn"
  │  ├─ Date: Sept 26
  │  ├─ Attendance: 25/25 (100%)
  │  └─ Engagement: 23/25 (92%)
  │
  ├─ Outcomes
  │  ├─ Participation: 23 submitted choices
  │  ├─ Common choices (frequency):
  │  │  ├─ save-40: 8 (32%)
  │  │  ├─ save-30: 12 (48%)
  │  │  └─ save-20: 3 (20%)
  │  │
  │  ├─ Competency growth (average):
  │  │  ├─ goal-setting: +1.8
  │  │  └─ saving: +1.5
  │  │
  │  └─ Insights:
  │     ├─ Balanced savers (save-30) most popular
  │     ├─ Suggests class understands risk/reward
  │     └─ Watch: 3 bold savers may run out of pocket money
  │
  ├─ At-risk learners
  │  ├─ Akos: chose save-20 (very cautious)
  │  │  └─ Recommended: 1:1 conversation about goal-setting
  │  │
  │  └─ [learner 2]: not engaged
  │     └─ Recommended: Check if technical issue
  │
  ├─ Facilitator reflections (optional)
  │  ├─ What went well: "Excellent discussion on risk"
  │  ├─ What could improve: "Need more time for last 2 learners"
  │  └─ Next session prep: "Prepare to discuss 'needs vs wants'"
  │
  └─ "Mark session complete" button

/academy/profile
  ├─ Account settings
  ├─ Change password
  └─ View my schools/cohorts
```

---

## SECTION 10: CRITICAL DATA OWNERSHIP RULES

### 10.1 The Five Immutable Principles

**1. Children Own Their Choices**
- Child makes every decision in scenarios
- No facilitator, parent, or admin can undo or modify a choice
- Choices are immutable once recorded (write-once)

**2. Facilitators Own Sessions, Not Progress**
- Facilitator records WHO ATTENDED, not who succeeded
- Facilitator cannot modify child's journey progress
- Facilitator CAN add notes (narrative context only)

**3. Parents Own Family Context**
- Parent sets child's profile (name, age, avatar)
- Parent decides when child starts/pauses programme
- Parent sees insights, but cannot see facilitator context

**4. System Owns Outcomes**
- Competency scores derived automatically from choices + assessments
- Badges awarded by rule, not by facilitator discretion
- No manual score adjustment (preserves integrity)

**5. Admin Owns Operations**
- Admin creates schools, cohorts, assigns facilitators
- Admin provisions accounts (no self-service for facilitators in MVP)
- Admin can see all data, modify structure, generate reports

### 10.2 Conflict Resolution (What Happens When?)

**Scenario: Facilitator says "Learner didn't understand, redo assessment"**
- ❌ Facilitator cannot modify score
- ✅ Facilitator CAN facilitate re-attempts (child takes assessment again)
- ✅ Both attempts recorded; learner starts with highest score

**Scenario: Parent says "Child is too stressed, pause programme"**
- ✅ Parent can set child's onboarding_completed = false
- ✅ Child account remains active, but journeys disabled
- ✅ Facilitator sees child in cohort but inactive

**Scenario: Facilitator says "Network error, child's choice didn't save"**
- ✅ Child retries at /child/scenario/{scenarioId}
- ✅ Previous choices still there (G6.1 error recovery)
- ✅ If duplicate submission, server deduplicates (first wins)

**Scenario: Admin detects data corruption**
- ✅ Admin can manually correct Firestore (atomic operation)
- ✅ Audit log records the change (who, when, why)
- ✅ No facilitator or parent involvement

---

## SECTION 11: SECURITY IMPLICATIONS

### 11.1 New Firestore Rules Required

**Current Rules (Unchanged):**
- ✅ Family isolation preserved
- ✅ Parent-only data (parentInsights) blocked from facilitators
- ✅ Child session immutability preserved
- ✅ G5.1 scenario integrity checks preserved

**New Rules (Must Be Added):**

```firestore
// Academy organizations
match /academyOrganizations/{orgId} {
  // Only admin creates/modifies schools
  allow read: if isAdmin() || hasFacilitatorInOrg(orgId);
  allow create, update, delete: if isAdmin();
  
  // Cohorts and sessions
  match /cohorts/{cohortId} {
    allow read: if isAdmin() || isFacilitatorOfCohort(orgId, cohortId);
    allow create, update, delete: if isAdmin();
    
    match /sessions/{sessionId} {
      // Facilitator can create and read own sessions
      allow create: if isFacilitatorOfCohort(orgId, cohortId)
        && request.resource.data.facilitatorUid == request.auth.uid;
      allow read: if isAdmin() || isFacilitatorOfCohort(orgId, cohortId);
      allow update: if request.resource.data.facilitatorUid == request.auth.uid;
      allow delete: if isAdmin();
    }
  }
}
```

### 11.2 Authorization Boundaries (Enforced at Firestore Rules Level)

**Facilitator CANNOT:**
- ❌ Read other schools' data
- ❌ Modify child assessments or progress
- ❌ Access parent-private data
- ❌ Delete cohort or learner records
- ❌ Assign other facilitators
- ❌ Create or modify cohorts (admin only)

**Facilitator CAN:**
- ✅ Read assigned cohort(s) and all learners in it
- ✅ Create session records (with own facilitatorUid)
- ✅ Add notes/observations (own records)
- ✅ View learner progress (journey, assessments)
- ✅ Monitor live participation (polling/subscription)

### 11.3 Data Lifecycle & Audit

**What Must Be Logged:**
- ✅ Every choice a child makes (immutable record)
- ✅ Every session a facilitator facilitates
- ✅ Every update to learner enrollment
- ✅ Every role assignment (facilitator provisioning)

**What Must Be Protected:**
- ✅ PIN hash (never exposed to browser)
- ✅ Parent email (never exposed to facilitator)
- ✅ Session tokens (HttpOnly cookies)
- ✅ TATI IDs (non-identifying, but tracked)

**Retention Policy (Needs Product Decision):**
- Q: How long do we keep session data after cohort completes?
- Q: Can learner data be exported by parent?
- Q: Can facilitator access completed cohorts' data?

---

## SECTION 12: REQUIRED COLLECTIONS (COMPLETE SCHEMA)

### 12.1 Supabase (Unchanged for MVP)

```sql
-- Existing tables (do not modify)
user_roles (user_id, role)
child_profiles (id, tati_id, name, age, avatar, ...)
child_credentials (child_profile_id, pin_hash, ...)
child_sessions (id, child_profile_id, token_hash, expires_at, ...)
profiles (id, email, displayName, ...)
```

**New Tables (NOT NEEDED for MVP - use Firestore)**
- ~~academies~~ (moved to Firestore)
- ~~cohorts~~ (moved to Firestore)
- ~~facilitator_assignments~~ (moved to Firestore)

### 12.2 Firestore (Academy + Enhanced)

**New Collections:**

```firestore
academyOrganizations/{orgId}
  ├─ name: string
  ├─ location: string
  ├─ contactName: string
  ├─ schoolCode: string
  ├─ status: "active"|"pending"|"inactive"
  ├─ createdBy: uid
  └─ createdAt: timestamp

academyOrganizations/{orgId}/cohorts/{cohortId}
  ├─ name: string
  ├─ facilitatorUids: [uid, uid]
  ├─ programme: "save"
  ├─ status: "active"|"completed"
  └─ createdAt: timestamp

academyOrganizations/{orgId}/cohorts/{cohortId}/enrollments/{childId}
  ├─ childId: string
  ├─ familyId: string
  └─ enrolledAt: timestamp

academyOrganizations/{orgId}/cohorts/{cohortId}/sessions/{sessionId}
  ├─ activity: "scenario:kwame-request--ch1"
  ├─ date: timestamp
  ├─ facilitatorUid: uid
  ├─ facilitatorNotes: string
  ├─ attendance: {childId: {present, engaged}}
  └─ outcomes: {participated, commonChoices, competencyGains}
```

**Enhanced Existing Collections:**

```firestore
families/{familyId}/children/{childId}
  └─ ADD:
     ├─ cohortId: string (points to academyOrganizations/orgId/cohorts/cohortId)
     ├─ facilitatorUids: [uid] (for authorization)
     └─ enrolledAt: timestamp (when added to cohort)
```

---

## SECTION 13: CRITICAL SUCCESS CRITERIA

Academy data contract is ready for implementation when:

✅ **Hierarchy Clear**
- Schools exist in Firestore
- Cohorts assigned to schools with facilitators
- Learners enrolled in cohorts
- Sessions record facilitator-led activities

✅ **Authorization Tight**
- Facilitators can only read assigned cohorts
- Facilitators cannot modify child progress
- Parent-private data blocked from facilitators
- Admin can see all data

✅ **Privacy Preserved**
- Facilitator never sees parent names/emails
- Child names protected (TATI ID for roster)
- Sensitive competency data shared warmly (not as raw scores)
- Family relationships kept distinct from school relationships

✅ **Sessions Trackable**
- Every facilitator activity recorded
- Attendance recorded per session
- Engagement measured (not ranked)
- Facilitator notes captured for context

✅ **Data Integrity Maintained**
- Child choices immutable
- Progress owned by child, not facilitator
- Assessments scored by system, not facilitator
- G5.1, G6.1 protections active

✅ **Parent Connection Preserved**
- Parent can see child learned in school
- Parent gets conversation starters based on competencies
- Parent never sees facilitator/cohort data
- Parent can reinforce at home independently

---

## SECTION 14: EXPLICIT NON-REQUIREMENTS

### What Academy Does NOT Include in MVP

**NOT:** Grading/ranking children
- No "top performer" leaderboard
- No grades (only competency levels: growing/strong)
- No percentage scores shown to other parents

**NOT:** Attendance enforcement
- Facilitator notes who attended; no penalties
- Absence does not prevent future learning
- No truancy system

**NOT:** Mastery gates
- Child can move forward regardless of score
- Optional challenge materials for extension
- No child left behind by pace

**NOT:** Teacher productivity metrics
- Facilitator's performance NOT measured
- No "best teacher" comparison
- Focus: Did the cohort learn? Not: How efficient is the teacher?

**NOT:** Advanced LMS features
- No lesson authoring by facilitators
- No content customization
- No syllabus builder
- No gradebook
- No messaging platform (MVP)
- No parent-facilitator messaging (Phase 2)

**NOT:** Certificates/degrees
- No course completion certificates (Phase 2)
- No credentials issued
- Focus: Growth, not credentials

---

## SECTION 15: DESIGN PRINCIPLES FOR ACADEMY UI

### Principle 1: "What Do I Do Today?"

Every facilitator's first question: **"What's the next activity for my class?"**

- App opens to today's activity
- Clear, 1-sentence instruction
- No hunting for information
- Session start is 2 clicks away

### Principle 2: Calm, Not Analytics-Heavy

Facilitators are teachers, not data analysts.

- 3-5 key metrics, not 50
- Charts show trends, not minutiae
- Language is warm, not technical
- Insights are actionable, not just informative

### Principle 3: Support Learning, Not Compliance

Academy serves the learning, not the other way around.

- Session records facilitate reflection, not audit compliance
- Facilitator notes are narrative, not scoring rubrics
- Indicators highlight who needs support, not judgment
- Default tone: "How can I help?" not "Why didn't they learn?"

### Principle 4: Respect Autonomy

Children make their own choices; facilitator provides context.

- Facilitator guides discussion; doesn't give "right answers"
- Outcomes are visible; comparisons are not
- Learner agency is core; monitoring is secondary
- Facilitator role: enabler, not overseer

---

## SECTION 16: OPEN DECISIONS FOR IMPLEMENTATION PHASE

**These must be decided BEFORE H3.1 begins:**

1. **Facilitator Account Provisioning**
   - Q: Self-service signup or admin-only?
   - Recommendation: Admin-only (more controlled, better for pilot)
   - Impact: Need minimal Admin UI to invite facilitators

2. **Real-Time Session Monitoring**
   - Q: Firestore subscriptions (instant updates) or polling (3-5s)?
   - Recommendation: Polling for MVP (simpler, lower Firestore cost)
   - Impact: Session monitor will have slight latency

3. **Session Guide Format**
   - Q: PDF, markdown, in-app?
   - Recommendation: Markdown + in-app (faster iteration)
   - Impact: No session guide PDF feature

4. **At-Risk Detection Algorithm**
   - Q: Automatic flags (if stuck > 3 days) or manual?
   - Recommendation: Automatic (data-driven, consistent)
   - Impact: Need rule-based system to flag learners

5. **Facilitator Notes Format**
   - Q: Structured (checkboxes, templates) or free-form (text)?
   - Recommendation: Free-form (flexible for real classrooms)
   - Impact: Notes are text, not searchable/aggregate-able in MVP

6. **Parent Visibility of Facilitator**
   - Q: Can parent see facilitator's name/notes?
   - Recommendation: Facilitator name only; no notes (privacy)
   - Impact: Parent sees "Grade 5A (Teacher Kofi)" but not session notes

7. **Multi-Cohort Facilitators**
   - Q: Can one facilitator teach 2+ cohorts simultaneously?
   - Recommendation: Yes (each cohort independent)
   - Impact: Facilitator UI must support cohort switching

8. **Cohort Duplication Across Years**
   - Q: Can "Grade 5A from 2024" be reused for "Grade 5A from 2025"?
   - Recommendation: No (separate cohorts, clean slate)
   - Impact: New cohort setup each year

---

## CONCLUSION: READY FOR IMPLEMENTATION

This product & data contract defines:

✅ **Why Academy exists** (parents can't facilitate alone)  
✅ **How facilitators operate** (9 decision points, specific data needs)  
✅ **School/cohort/session hierarchy** (complete Firestore schema)  
✅ **Data ownership & privacy** (immutable principles)  
✅ **Authorization matrix** (facilitator vs parent vs child vs admin)  
✅ **Required collections** (what must be created in Firestore)  
✅ **Security implications** (new rules, no existing rule changes)  
✅ **Session definition** (guided group experience, not surveillance)  
✅ **Information architecture** (8 key screens)  
✅ **Critical success criteria** (how to know it works)  

**No code has been modified. No Firestore rules changed. No authentication touched.**

This contract is ready for product approval and can guide H3.1 implementation immediately.

---

# END PHASE H3.0.1 — PRODUCT & DATA CONTRACT

**Status:** SPECIFICATION COMPLETE ✅  
**Decision Gate:** Ready for approval before H3.1 begins  
**Next Step:** Approve data contract, then proceed to H3.1 (Facilitator Authentication)  

*"The best software is built on a clear contract. This is ours."*
