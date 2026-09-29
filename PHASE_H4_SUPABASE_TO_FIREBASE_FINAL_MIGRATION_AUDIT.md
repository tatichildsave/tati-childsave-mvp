# PHASE H4: SUPABASE TO FIREBASE MIGRATION AUDIT
**Date**: 2026-09-29  
**Scope**: Complete Supabase dependency inventory and Firebase migration blueprint  
**Status**: READ-ONLY AUDIT - No code changes made

---

## EXECUTIVE SUMMARY

TATI ChildSave is currently in a **hybrid state** with two parallel backends:
- **Parent/Facilitator/Admin**: Firebase Auth ✅ MIGRATED
- **Child Data (Profiles, Credentials, Sessions, Progress)**: Supabase PostgreSQL ⚠️ STILL ACTIVE  

**There are currently NO real production users**, making this a clean architectural migration opportunity. The existing Firebase auth migration work is complete and must be preserved. **Supabase can be fully migrated to Firebase in 6-8 phases**.

---

## 1. SUPABASE DEPENDENCY CLASSIFICATION

### 1.1 Production Runtime Dependencies (MUST MIGRATE)

| Dependency | File(s) | Purpose | Runtime? | Classification |
|------------|---------|---------|----------|-----------------|
| **child_profiles table** | src/lib/auth/child-auth.functions.ts, child-identity.server.ts, child-session.server.ts, family.ts | Store child identity (name, age, TATI ID) | ✅ YES | **A1 - Critical** |
| **child_credentials table** | src/lib/auth/child-identity.server.ts | Store TATI ID → child mapping + PIN hash | ✅ YES | **A1 - Critical** |
| **child_sessions table** | src/lib/auth/child-identity.server.ts | Store session tokens for child auth | ✅ YES | **A1 - Critical** |
| **journey_progress table** | src/lib/auth/child-learning.functions.ts, src/lib/learning/progress.ts, src/lib/progress/service.ts | Store lesson/scenario/assessment completion | ✅ YES | **A2 - High** |
| **assessment_attempts table** | src/lib/assessment/attempts.ts, src/lib/auth/child-learning.functions.ts | Store assessment responses and scores | ✅ YES | **A2 - High** |
| **scenario_sessions table** | src/lib/scenario/session.ts | Store decision history + state for scenarios | ✅ YES | **A2 - High** |
| **learner_competencies table** | src/lib/auth/child-learning.functions.ts | Store competency scores and evidence | ✅ YES | **B - Server** |
| **learner_achievements table** | src/lib/gamification/achievements.ts, src/lib/auth/child-learning.functions.ts | Store unlocked achievements | ✅ YES | **B - Server** |
| **families table** | src/lib/family.ts | Store family records (parent-created) | ✅ YES | **A2 - High** |
| **family_members table** | src/lib/family.ts | Store family membership and roles | ✅ YES | **A2 - High** |
| **feedback table** | src/lib/feedback.ts | Store user feedback | ✅ YES | **B - Server** |
| **analytics_events table** | src/lib/analytics.ts | Store analytics/telemetry | ✅ YES | **B - Server** |
| **user_roles table** | src/lib/auth/roles.server.ts | Store facilitator role mappings | ✅ YES | **B - Server** |

### 1.2 Environment Variables (PRODUCTION CREDENTIALS)

| Variable | Current Value | Runtime | Removal Safe? |
|----------|---------------|---------|---------------|
| `VITE_SUPABASE_URL` | https://ggtjulmplujaqmsppque.supabase.co | Client | ❌ NO - in use |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | sb_publishable_3r... | Client | ❌ NO - in use |
| `SUPABASE_URL` | https://ggtjulmplujaqmsppque.supabase.co | Server | ❌ NO - in use |
| `SUPABASE_PROJECT_ID` | ggtjulmplujaqmsppque | Config | ❌ NO - in use |
| `SUPABASE_SERVICE_ROLE_KEY` | ⚠️ NOT IN .env.local (would be production secret) | Server | ⚠️ IN PRODUCTION ONLY |
| `SUPABASE_PUBLISHABLE_KEY` | sb_publishable_3r... | Server | ❌ NO - in use |

### 1.3 Dependencies in package.json

| Package | Version | Purpose | Can Remove? |
|---------|---------|---------|------------|
| `@supabase/supabase-js` | ^2.116.0 | Client & server SDK | ❌ NO - active use |
| `drizzle-orm` | ^0.45.2 (devDep) | PostgreSQL ORM | ✅ YES - migrations only |
| `drizzle-kit` | ^0.31.10 (devDep) | Migration CLI | ✅ YES - migrations only |
| `postgres` | ^3.4.9 (devDep) | Direct DB connection | ✅ YES - migrations only |
| `firebase` | ^12.19.0 | Client SDK | ✅ KEEP - used for parent auth |
| `firebase-admin` | ^14.4.0 (devDep) | Server SDK | ✅ KEEP - will expand usage |

### 1.4 Storage, Realtime, Functions

| Service | Used? | Evidence |
|---------|-------|----------|
| **Supabase Storage** | ❌ NO | No `.storage` references in codebase |
| **Supabase Realtime** | ❌ NO | No `.channel()` or `.subscribe()` patterns found |
| **Supabase Edge Functions** | ❌ NO | No `functions/` directory; all logic is Node.js |
| **Supabase RPC** | ❌ NO | No `.rpc()` calls found in code |

**CONCLUSION**: Only PostgreSQL database operations require migration. Storage/Realtime/Functions are not used.

---

## 2. AUTHENTICATION AUDIT

### 2.1 Current Authentication Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                   PARENT / FACILITATOR / ADMIN               │
├─────────────────────────────────────────────────────────────┤
│ Entry: /login or /academy/login                              │
│ Auth Method: Email/Password (Firebase Auth) ✅ MIGRATED     │
│ Session: Firebase Auth JWT (browser memory)                  │
│ Profile: Firestore /users/{uid}                             │
│ Authorization: Firestore rules + server-side checks         │
│ Status: PRODUCTION READY - no Supabase dependency           │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                          CHILD                               │
├─────────────────────────────────────────────────────────────┤
│ Entry: /child/login                                          │
│ Auth Method: TATI ID + PIN (Supabase PostgreSQL) ⚠️          │
│ Credential Storage: Supabase child_profiles + child_credentials │
│ Session: Custom HTTP-only session token                      │
│ Session Storage: Supabase child_sessions table               │
│ Profile: Cached locally + Supabase lookup                    │
│ Data Access: supabase.from() queries                         │
│ Status: REQUIRES MIGRATION - fully Supabase-dependent       │
└─────────────────────────────────────────────────────────────┘
```

### 2.2 Child Authentication Failure (Current Issue)

**Current Symptom**: Child login fails with "That TATI ID or PIN could not be verified"

**Root Cause**: child-auth.functions.ts calls `verifyChildCredential()` which queries Supabase:
```typescript
// src/lib/auth/child-identity.server.ts line 115-120
const { data: child } = await db()
  .from("child_profiles")  // ← Supabase call
  .select("id")
  .eq("tati_id", normalizedId)
  .maybeSingle();
```

**Architecture Mismatch**: 
- Test fixtures were created in **Firestore** (via create-test-fixtures.mjs)
- Child login looks in **Supabase** (via child-identity.server.ts)
- Two completely separate databases with no data sync
- Login validates against empty Supabase table

**Current Workaround**: test-child-login.server.ts reads from Firestore instead (test-only)

---

## 3. DATABASE AUDIT - TABLE MAPPING

### 3.1 Supabase Postgres → Firestore Mapping

| Supabase Table | Firestore Path | PK | Relationships | Status |
|---|---|---|---|---|
| **child_profiles** | families/{fid}/children/{id} | id | family_id → families | Ready |
| **child_credentials** | families/{fid}/children/{id}/credentials/current | child_profile_id | child_profile_id | Ready |
| **child_sessions** | families/{fid}/children/{id}/sessions/{id} | id | child_profile_id | Ready |
| **families** | families/{id} | id | created_by → users | Already in Firestore |
| **family_members** | families/{fid}/members/{uid} | (fid, uid) | family_id, user_id | Ready |
| **journey_progress** | families/{fid}/children/{cid}/progress/{id} | id | childId, familyId | Ready |
| **assessment_attempts** | families/{fid}/children/{cid}/assessments/{id} | id | childId, familyId | Ready |
| **scenario_sessions** | families/{fid}/children/{cid}/scenarios/{id} | id | childId, familyId | Ready |
| **learner_competencies** | families/{fid}/children/{cid}/competencies/{id} | id | childId | Ready |
| **learner_achievements** | families/{fid}/children/{cid}/achievements/{id} | id | childId | Ready |
| **feedback** | feedback/{id} | id | userId (parent) | Firestore exists |
| **analytics_events** | analytics/{date}/events/{id} | id | — | Firestore exists |
| **user_roles** | users/{uid}/roles/{roleId} | (uid, roleId) | userId | Ready |

**ASSESSMENT**:
- ✅ Hierarchical structure maps naturally to Firestore
- ✅ Family-based partitioning already matches Firestore security model
- ⚠️ No join tables needed (Firestore has implicit document relationships)
- ⚠️ `learner_*` collections are loosely joined; Firestore queries can replace

### 3.2 Data Isolation & Security Model

**Supabase RLS (Row-Level Security)**:
```sql
-- Example: child can only access their own progress
ALTER POLICY "children_can_read_own_progress"
  ON journey_progress
  FOR SELECT
  USING (child_id = auth.uid());
```

**Firestore Rules (Document-Level Security)**:
```javascript
match /families/{familyId}/children/{childId}/progress/{progressId} {
  allow read: if canAccessChild(familyId, childId);
  allow create: if isFamilyAdult(familyId);
  allow update: if canAccessChild(familyId, childId);
}
```

**Status**: ✅ Firestore rules already implement equivalent security (family-based access control)

---

## 4. RUNTIME SUPABASE DEPENDENCIES - DETAILED SCAN

### 4.1 Child Authentication Flow

**File**: `src/lib/auth/child-identity.server.ts`

| Function | Supabase Tables | Purpose | Status |
|----------|---|---|---|
| `verifyChildCredential()` | child_profiles, child_credentials | Validate TATI ID + PIN | ⚠️ MUST MIGRATE |
| `createChildSession()` | child_sessions | Create session record | ⚠️ MUST MIGRATE |
| `validateChildSession()` | child_sessions | Verify session token | ⚠️ MUST MIGRATE |
| `revokeChildSession()` | child_sessions | Invalidate session | ⚠️ MUST MIGRATE |
| `saveChildPin()` | child_credentials | Store hashed PIN | ⚠️ MUST MIGRATE |

**File**: `src/lib/auth/child-auth.functions.ts`

| Function | Supabase Tables | Purpose | Status |
|----------|---|---|---|
| `childLogin()` | child_profiles | Authenticate child + return profile | ⚠️ MUST MIGRATE |
| `getChildSession()` | child_profiles, child_sessions | Retrieve current child session | ⚠️ MUST MIGRATE |
| `childLogout()` | child_sessions | Revoke child session | ⚠️ MUST MIGRATE |

### 4.2 Journey Progress Recording

**File**: `src/lib/auth/child-learning.functions.ts`

| Operation | Supabase Tables | Code Line | Status |
|-----------|---|---|---|
| Record lesson completion | journey_progress | line 507 | ⚠️ MUST MIGRATE |
| Record scenario completion | journey_progress | line 507 | ⚠️ MUST MIGRATE |
| Record assessment response | assessment_attempts | line 545 | ⚠️ MUST MIGRATE |
| Update competencies | learner_competencies | line 455 | ⚠️ MUST MIGRATE |
| Award achievements | learner_achievements | line 459 | ⚠️ MUST MIGRATE |

### 4.3 Family Management

**File**: `src/lib/family.ts`

| Function | Supabase Tables | Purpose | Status |
|----------|---|---|---|
| `ensureFamily()` | families, family_members | Get/create family for parent | ⚠️ MUST MIGRATE |
| `useChildProfiles()` | child_profiles | List children in family | ⚠️ MUST MIGRATE |
| `useCreateChildProfile()` | child_profiles | Create new child profile | ⚠️ MUST MIGRATE |
| `assertChildInCurrentFamily()` | child_profiles | Verify child ownership | ⚠️ MUST MIGRATE |

### 4.4 Scenario & Assessment

**File**: `src/lib/scenario/session.ts`

| Operation | Supabase Table | Purpose | Status |
|---|---|---|---|
| Load scenario session | scenario_sessions | Get decision history | ⚠️ MUST MIGRATE |
| Save scenario state | scenario_sessions | Record decisions + outcome | ⚠️ MUST MIGRATE |

**File**: `src/lib/assessment/attempts.ts`

| Operation | Supabase Table | Purpose | Status |
|---|---|---|---|
| Record assessment attempt | assessment_attempts | Store responses | ⚠️ MUST MIGRATE |

### 4.5 Analytics & Feedback

**File**: `src/lib/analytics.ts`

| Operation | Supabase Table | Purpose | Runtime? |
|---|---|---|---|
| Track event | analytics_events | Record user event | ✅ YES |

**File**: `src/lib/feedback.ts`

| Operation | Supabase Table | Purpose | Runtime? |
|---|---|---|---|
| Submit feedback | feedback | Store user feedback | ✅ YES |

---

## 5. FIRESTORE RULES AUDIT

### 5.1 Current Firestore Rules Coverage

**File**: `firestore.rules` (103 lines)

| Rule | Scope | Status |
|------|-------|--------|
| `/users/{uid}` | Parent/Facilitator/Admin identity | ✅ ACTIVE |
| `/families/{familyId}` | Family container | ✅ ACTIVE |
| `/families/{familyId}/members/{uid}` | Family membership | ✅ ACTIVE |
| `/families/{familyId}/children/{childId}` | Child profile | ✅ ACTIVE |
| `/families/{familyId}/children/{childId}/journey/summary` | Child journey summary | ✅ ACTIVE |
| Child progress/sessions | ❌ NOT YET DEFINED | ⚠️ MUST ADD |

### 5.2 Security Functions Already Defined

```javascript
function canAccessChild(familyId, childId) {
  return isFamilyAdult(familyId) 
    || isAssignedFacilitator(familyId, childId) 
    || isAdmin();
}

function isFamilyAdult(familyId) {
  return isActiveFamilyMember(familyId)
    && get(memberPath(familyId)).data.role in ['parent', 'guardian'];
}
```

**Status**: ✅ Foundation exists; needs expansion for:
- Child progress access
- Scenario session access  
- Assessment attempt access
- Child credentials access (should be NONE - server-only)

---

## 6. TESTS AUDIT

### 6.1 Tests Using Supabase

| Test File | Dependency | Type | Must Migrate? |
|---|---|---|---|
| tests/auth/assessment-authorization.test.ts | Comments reference Supabase RLS | Semantic only | ✅ YES (rewrite for Firestore) |
| tests/g6_1/pilot-reliability.test.ts | Error message check "Supabase" | Semantic only | ✅ YES (update message) |

**Finding**: Tests don't directly call Supabase; they verify Firestore behavior. Comments reference Supabase but can be updated.

### 6.2 Test Infrastructure

| Type | Location | Status |
|---|---|---|
| Firestore emulator tests | tests/firebase/ | ✅ Already configured |
| Supabase emulator | None found | ⚠️ Not used locally |
| Auth tests | tests/auth/ | ✅ Can expand for child auth |

**Status**: Firebase Local Emulator Suite can be the authoritative test environment once migrations complete.

---

## 7. DRIZZLE & MIGRATIONS

### 7.1 Migration Files (9 total)

| File | Purpose | Uses Supabase? |
|---|---|---|
| 0000_tati_childsave_core.sql | Core schema (users, children, progress) | ✅ YES |
| 0001_tati_family_structure.sql | Families, members | ✅ YES |
| 0002_tati_progress_architecture.sql | Journey progress tables | ✅ YES |
| 0003_tati_security_and_journey.sql | RLS policies | ✅ YES |
| 0004_tati_feedback_mvp.sql | Feedback table | ✅ YES |
| 0005_tati_product_analytics.sql | Analytics events | ✅ YES |
| 0006_tati_security_hardening.sql | Enhanced RLS | ✅ YES |
| 0007_tati_privacy_integrity.sql | Privacy features | ✅ YES |
| 0008_tati_identity_and_roles.sql | User roles schema | ✅ YES |
| 0009_tati_identity_schema_fix.sql | Identity schema fixes | ✅ YES |

### 7.2 Schema Inventory

Lines per file:
- 0000: ~150 lines (schemas)
- 0001-0009: ~50-100 lines each (incremental)
- **Total**: ~900 lines of Postgres schema

**Status**: 
- ✅ All schemas can be represented as Firestore collections
- ✅ No Postgres-specific features (triggers, functions, arrays, JSON) that can't be replicated
- ✅ Migrations can be archived (not deleted) after Firestore schema is implemented
- ❌ Drizzle ORM no longer needed after migration

---

## 8. CURRENT STATE SUMMARY

### 8.1 What's Running on Supabase (ACTIVE)

| Component | Location | Critical? | Tests? |
|-----------|----------|-----------|--------|
| Child profiles | child_profiles table | ✅ YES | Manual testing only |
| Child credentials (PIN) | child_credentials table | ✅ YES | Manual testing only |
| Child sessions | child_sessions table | ✅ YES | Manual testing only |
| Journey progress | journey_progress table | ✅ YES | Covered by tests |
| Assessments | assessment_attempts table | ✅ YES | Covered by tests |
| Scenarios | scenario_sessions table | ✅ YES | Covered by tests |
| Competencies | learner_competencies table | ✅ YES | No direct tests |
| Achievements | learner_achievements table | ✅ YES | No direct tests |
| Families | families table | ✅ YES | Manual only |
| Family members | family_members table | ✅ YES | Manual only |
| Analytics | analytics_events table | ❌ NO | No tests |
| Feedback | feedback table | ❌ NO | No tests |
| User roles | user_roles table | ❌ NO | No tests |

### 8.2 What's Running on Firebase (COMPLETE)

| Component | Status | Coverage |
|-----------|--------|----------|
| Parent authentication | ✅ MIGRATED | All parent/facilitator/admin flows use Firebase Auth |
| Parent profiles (users/{uid}) | ✅ ACTIVE | In Firestore, populated on signup |
| Families document | ✅ ACTIVE | In Firestore |
| Family members | ✅ PARTIALLY | Firestore has members subcollection |
| Firestore rules | ✅ ACTIVE | 103 lines, family-based access control |
| Security functions | ✅ ACTIVE | canAccessChild(), isFamilyAdult(), etc |
| App routing | ✅ ACTIVE | All routes work with Firebase Auth |

### 8.3 Hybrid State Risks

| Risk | Impact | Severity |
|------|--------|----------|
| **Data duplication** | Families, members, users exist in both systems | Medium |
| **Sync inconsistency** | Parent creates family in Firestore but child lookup is Supabase | HIGH |
| **Child login failure** | Child auth only reads Supabase; test data in Firestore | HIGH |
| **No child sessions in Firestore** | Sessions only in Supabase; can't be validated offline | Medium |
| **Version mismatch** | Two backend versions could diverge during migration | Medium |

---

## 9. TARGET ARCHITECTURE

### 9.1 Post-Migration Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    CONSOLIDATED FIREBASE               │
├─────────────────────────────────────────────────────────┤
│ All Authentication:     Firebase Auth ✅                │
│ All User/Identity:      Firestore (users/{uid})         │
│ All Family Data:        Firestore (families/{fid}/...)  │
│ All Child Data:         Firestore (families/{fid}/children/{cid}/...) │
│ All Progress/Scenario:  Firestore (child collections)   │
│ All Sessions:           Firestore (ephemeral docs)      │
│ Authorization:          Firestore Rules + server checks │
│ Server Logic:           Cloud Functions (where needed)  │
│ Testing:                Firebase Emulator Suite (local)  │
└─────────────────────────────────────────────────────────┘

Supabase: ❌ REMOVED (archives kept for reference)
Postgres: ❌ REMOVED
Drizzle:  ❌ REMOVED
```

### 9.2 Firestore Schema Structure (Target)

```
/users/{firebaseUid}
  ├── uid: string
  ├── email: string
  ├── displayName: string
  ├── roles: ["parent" | "facilitator" | "admin"]
  ├── status: "pending" | "active" | "disabled"
  ├── createdAt: timestamp
  └── updatedAt: timestamp

/families/{familyId}
  ├── name: string
  ├── createdBy: uid
  ├── status: "active" | "disabled"
  ├── createdAt: timestamp
  ├── updatedAt: timestamp
  │
  ├── /members/{uid}
  │  ├── uid: string
  │  ├── role: "parent" | "guardian"
  │  ├── status: "active" | "invited" | "removed"
  │  └── createdAt: timestamp
  │
  └── /children/{childId}
     ├── id: string
     ├── tatiId: string (TATI-XXXXXXXX)
     ├── name: string
     ├── age: number (8-12)
     ├── avatar: emoji
     ├── tier: string
     ├── curriculumLevel: string
     ├── familyId: string
     ├── createdBy: uid
     ├── facilitatorUids: [uid]
     ├── onboardingCompleted: boolean
     ├── createdAt: timestamp
     ├── updatedAt: timestamp
     │
     ├── /credentials
     │  └── /current
     │     ├── pinHash: string (scrypt-based)
     │     ├── active: boolean
     │     ├── revokedAt: timestamp | null
     │     └── rotatedAt: timestamp
     │
     ├── /sessions
     │  └── /{sessionId}
     │     ├── tokenHash: string (sha256)
     │     ├── createdAt: timestamp
     │     ├── expiresAt: timestamp
     │     ├── revokedAt: timestamp | null
     │     └── lastSeenAt: timestamp | null
     │
     ├── /journey
     │  ├── /summary
     │  │  ├── currentItemKey: string | null
     │  │  ├── completedCount: number
     │  │  ├── completionPercent: number
     │  │  └── lastActivityAt: timestamp
     │  │
     │  └── /progress
     │     └── /{progressId}
     │        ├── kind: "lesson" | "scenario" | "reflection" | "assessment"
     │        ├── id: string (lesson/scenario ID)
     │        ├── status: "available" | "in-progress" | "completed"
     │        ├── score: number | null
     │        ├── maxScore: number | null
     │        ├── details: object
     │        ├── createdAt: timestamp
     │        └── updatedAt: timestamp
     │
     ├── /assessments
     │  └── /{attemptId}
     │     ├── assessmentId: string
     │     ├── assessmentType: "pre" | "post"
     │     ├── points: number
     │     ├── maxPoints: number
     │     ├── responses: {[questionId]: answer}
     │     ├── competencyScores: {[competencyId]: score}
     │     ├── completedAt: timestamp
     │     └── updatedAt: timestamp
     │
     ├── /scenarios
     │  └── /{sessionId}
     │     ├── scenarioId: string
     │     ├── currentNode: string
     │     ├── phase: string
     │     ├── dayNumber: number
     │     ├── walletState: {available, saved, total}
     │     ├── decisions: [...]
     │     ├── completedAt: timestamp | null
     │     └── updatedAt: timestamp
     │
     ├── /competencies
     │  └── /{competencyId}
     │     ├── competencyId: string
     │     ├── score: number
     │     ├── level: string
     │     ├── evidence: object
     │     └── updatedAt: timestamp
     │
     └── /achievements
        └── /{achievementId}
           ├── achievementId: string
           ├── celebrated: boolean
           └── awardedAt: timestamp

/schools/{schoolId}  (for facilitators)
  ├── name: string
  ├── ...
  └── /admins/{uid}

/feedback/{feedbackId}
  ├── userId: uid
  ├── message: string
  ├── createdAt: timestamp

/analytics/{date}/events/{eventId}
  ├── eventName: string
  ├── properties: object
  ├── timestamp: timestamp
```

### 9.3 Security Model (Firestore Rules)

**Auth-Related Rules to Add**:

```javascript
// Child credential storage (server-only read)
match /families/{familyId}/children/{childId}/credentials/{credentialId} {
  allow read: if false;  // Credentials never readable by client
  allow write: if false; // Credentials only written by server
}

// Child session storage (server-only read)
match /families/{familyId}/children/{childId}/sessions/{sessionId} {
  allow read: if false;  // Sessions never readable by client
  allow write: if false; // Sessions only written by server
}

// Child journey progress (child or parent can read)
match /families/{familyId}/children/{childId}/journey/progress/{progressId} {
  allow read: if canAccessChild(familyId, childId);
  allow create: if false; // Server-only
  allow update: if false; // Server-only
}

// Assessments (restricted access)
match /families/{familyId}/children/{childId}/assessments/{attemptId} {
  allow read: if canAccessChild(familyId, childId);
  allow create: if false;
  allow update: if false;
}
```

**Status**: Firestore rules already have the authorization foundation; these are additions.

---

## 10. MIGRATION PHASES & SEQUENCE

### Phase H4.A: Child Credential Migration
**Duration**: 2-3 days  
**Risk**: HIGH - affects child login

| Task | What | Where | Verification |
|------|------|-------|---------------|
| **A1** | Create `/families/{fid}/children/{cid}/credentials/current` collection | Firestore | Schema exists |
| **A2** | Migrate hashed PINs from `child_credentials` table | Firestore | PIN verification still works |
| **A3** | Rewrite `saveChildPin()` to use Firestore | child-identity.server.ts | Build passes, type-safe |
| **A4** | Rewrite `verifyChildCredential()` to use Firestore | child-identity.server.ts | Child login works |
| **A5** | Add Firestore rules for credentials (deny all reads) | firestore.rules | Rules deploy successfully |
| **A6** | Test child login with Firestore credentials | Emulator + manual | Fixture A logs in successfully |

**Rollback**: Keep Supabase credentials in parallel; route to Firebase first, fallback to Supabase

### Phase H4.B: Child Session Migration
**Duration**: 1-2 days

| Task | What | Where | Verification |
|------|------|-------|---------------|
| **B1** | Create `/families/{fid}/children/{cid}/sessions/{id}` collection | Firestore | Schema exists |
| **B2** | Rewrite `createChildSession()` to use Firestore | child-identity.server.ts | Session tokens created |
| **B3** | Rewrite `validateChildSession()` to use Firestore | child-identity.server.ts | Session validation works |
| **B4** | Rewrite `revokeChildSession()` to use Firestore | child-identity.server.ts | Logout revokes sessions |
| **B5** | Add Firestore rules (deny all client access) | firestore.rules | Rules deploy successfully |
| **B6** | Test child session lifecycle | Emulator | Login/logout cycle works |

**Validation**: Session token used in /child routes still works

### Phase H4.C: Child Profile Migration
**Duration**: 1-2 days

| Task | What | Where | Verification |
|------|------|-------|---------------|
| **C1** | Verify child_profiles data is in Firestore (from create-test-fixtures.mjs) | families/{fid}/children | Data structure correct |
| **C2** | Migrate real child profiles from Supabase to Firestore | One-time data transfer | Row count matches |
| **C3** | Rewrite `loadChildProfile()` to use Firestore | child-auth.functions.ts | Profiles load correctly |
| **C4** | Update child-session.server.ts to read from Firestore | child-session.server.ts | Build passes |
| **C5** | Update family.ts `useChildProfiles()` to read from Firestore | family.ts | Child list loads |
| **C6** | Test child profile access | Emulator | All child data accessible |

**Validation**: Parent can see all their children

### Phase H4.D: Journey Progress Migration
**Duration**: 2-3 days  
**Risk**: MEDIUM - affects progress tracking

| Task | What | Where | Verification |
|------|------|-------|---------------|
| **D1** | Create `/families/{fid}/children/{cid}/journey/progress/{id}` structure | Firestore | Schema matches spec |
| **D2** | Migrate journey_progress records from Supabase | One-time transfer | Data integrity check |
| **D3** | Rewrite progress recording in `child-learning.functions.ts` | lines 507 | Lessons can be marked complete |
| **D4** | Rewrite progress retrieval in `src/lib/learning/progress.ts` | line 33 | Progress snapshot computes correctly |
| **D5** | Add Firestore rules for progress access | firestore.rules | Parents can read child progress |
| **D6** | Test journey progression | Emulator | Fixture B shows correct progress |

**Validation**: Journey completions are persisted

### Phase H4.E: Assessment Migration
**Duration**: 2-3 days  
**Risk**: HIGH - affects assessment validation

| Task | What | Where | Verification |
|------|------|-------|---------------|
| **E1** | Create `/families/{fid}/children/{cid}/assessments/{id}` collection | Firestore | Schema exists |
| **E2** | Migrate assessment_attempts from Supabase | One-time transfer | Attempt count matches |
| **E3** | Rewrite assessment saving in `child-learning.functions.ts` | line 545 | Assessments save successfully |
| **E4** | Add competency recording to Firestore | assessments subcollection | Competency scores persist |
| **E5** | Add Firestore rules for assessments | firestore.rules | Parents can read results |
| **E6** | Test assessment workflow | Emulator | Pre/post assessments work |

**Validation**: Assessment scores are persisted and retrievable

### Phase H4.F: Scenario Migration
**Duration**: 2-3 days  
**Risk**: HIGH - affects decision history validation

| Task | What | Where | Verification |
|------|------|-------|---------------|
| **F1** | Create `/families/{fid}/children/{cid}/scenarios/{sessionId}` collection | Firestore | Schema matches spec |
| **F2** | Migrate scenario_sessions from Supabase | One-time transfer | Session count matches |
| **F3** | Rewrite scenario state save in `scenario/session.ts` | line 44, 60 | Decisions persist |
| **F4** | Implement scenario state replay verification (G5.1 feature) | child-learning.functions.ts | State integrity validated |
| **F5** | Add Firestore rules for scenarios | firestore.rules | Parents can read scenario results |
| **F6** | Test scenario decision flow | Emulator | Fixture C completes scenarios |

**Validation**: Decision history and consequences are correct

### Phase H4.G: Support Tables (Competencies, Achievements, Analytics)
**Duration**: 1-2 days  
**Risk**: LOW - non-critical data

| Task | What | Where | Verification |
|------|------|-------|---------------|
| **G1** | Create competencies/achievements subcollections | Firestore | Schema ready |
| **G2** | Migrate learner_competencies and learner_achievements | One-time transfer | Data migrated |
| **G3** | Update gamification/achievements.ts | src/lib/gamification/ | Achievements award correctly |
| **G4** | Create analytics collection | Firestore (or Cloud Logging) | Events tracked |
| **G5** | Create feedback collection | Firestore | Feedback stored |
| **G6** | Add Firestore rules for support data | firestore.rules | Access controlled |

**Validation**: Achievements display, analytics events recorded

### Phase H4.H: Cleanup & Decommission
**Duration**: 1 day  
**Risk**: LOW - after full validation

| Task | What | Where | Verification |
|------|------|-------|---------------|
| **H1** | Remove Supabase client imports | src/lib/ | No `@supabase` imports remain |
| **H2** | Uninstall Supabase SDK | package.json | Build completes |
| **H3** | Remove Supabase environment variables | .env.* | App runs without them |
| **H4** | Archive Drizzle migrations | drizzle/migrations (read-only) | Kept for reference |
| **H5** | Remove Drizzle from devDependencies | package.json | Build completes |
| **H6** | Update documentation | docs/ | Migration guide written |

**Validation**: App runs entirely on Firebase; Supabase not loaded

---

## 11. RISK ASSESSMENT

### 11.1 Critical Risks

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|-----------|
| **Child login breaks during migration** | HIGH | CRITICAL | Phase-by-phase rollback; parallel Supabase queries initially |
| **Progress data loss** | MEDIUM | CRITICAL | Full backup before migration; verify row counts |
| **Assessment integrity compromised** | MEDIUM | HIGH | Implement G5.1 state verification in Firestore first |
| **Scenario state corruption** | MEDIUM | HIGH | Replay all decisions after migration; validate outcomes |
| **Session token validation fails** | MEDIUM | HIGH | Test session lifecycle extensively in emulator |

### 11.2 Mitigation Strategy

**Parallel Running** (Weeks 1-2):
- Both Supabase and Firestore receive writes
- Reads from Firestore with Supabase fallback
- Allows verification without breaking production

**Verification Gates**:
- After each phase, run comprehensive tests
- Manual verification of sample data
- Comparison reports (Supabase vs Firestore row counts)

**Rollback Capability**:
- Keep Supabase running for 2-4 weeks after Firestore migration
- If issues found, revert to Supabase reads
- No data loss, just version switch

**Testing**:
- Emulator-based tests for all phases
- Manual end-to-end testing for each journey
- Parent/facilitator testing for family access

---

## 12. VERIFICATION CHECKLIST

### Pre-Migration (Week 0)
- [ ] Backup Supabase production database
- [ ] Verify Firebase Emulator can hold full dataset
- [ ] Create migration scripts for each table
- [ ] Set up parallel write infrastructure
- [ ] Train team on new architecture

### Phase A-C (Weeks 1-2)
- [ ] Child login works with Firestore credentials
- [ ] Child sessions validate correctly
- [ ] Child profiles load from Firestore
- [ ] All tests pass
- [ ] No errors in Firebase console

### Phase D-F (Weeks 3-4)
- [ ] Journey progress calculates correctly
- [ ] Pre/post assessments score correctly
- [ ] Scenarios replay decisions accurately
- [ ] Parent can see all child data
- [ ] Competencies and achievements work

### Phase G-H (Week 5)
- [ ] All analytics events recorded
- [ ] Feedback collection working
- [ ] No Supabase imports remain
- [ ] Build runs without Supabase SDK
- [ ] All routes work end-to-end

### Post-Migration (Weeks 6-8)
- [ ] Monitor error logs (0 Supabase errors)
- [ ] Run production load test
- [ ] Get real user feedback (pilot group)
- [ ] Keep Supabase running in standby
- [ ] Final decision to delete Supabase

---

## 13. CURRENT STATE vs TARGET STATE

### Current State (Today)

```
PARENTS:           Firebase Auth ✅ + Firestore ✅
FACILITATORS:      Firebase Auth ✅ + Firestore ✅
ADMINS:            Firebase Auth ✅ + Firestore ✅

CHILDREN:          ⚠️ HYBRID
  ├── Auth:        Supabase PostgreSQL (child_profiles + child_credentials)
  ├── Sessions:    Supabase PostgreSQL (child_sessions)
  ├── Profiles:    Supabase + Firestore (duplicated)
  ├── Progress:    Supabase PostgreSQL (journey_progress)
  ├── Assessments: Supabase PostgreSQL (assessment_attempts)
  ├── Scenarios:   Supabase PostgreSQL (scenario_sessions)
  └── Competencies: Supabase PostgreSQL (learner_competencies)

INFRASTRUCTURE:
  ├── Backend DB:   Supabase PostgreSQL (ggtjulmplujaqmsppque.supabase.co)
  ├── Firestore:    Google Cloud (tatichildsavemvp)
  ├── Auth:         Firebase Auth (all parents, facilitators, admins)
  ├── Rules:        Firestore rules (103 lines, family-based)
  └── Tests:        Firebase Emulator Suite + manual testing

RISK STATE:
  ├── Data consistency:  MEDIUM (two backends)
  ├── Auth consistency:  LOW (Firebase unified)
  ├── Scalability:       MEDIUM (PostgreSQL limits)
  └── Portability:       LOW (Supabase lock-in)
```

### Target State (After H4)

```
PARENTS:           Firebase Auth ✅ + Firestore ✅
FACILITATORS:      Firebase Auth ✅ + Firestore ✅
ADMINS:            Firebase Auth ✅ + Firestore ✅

CHILDREN:          Firebase Auth ✅ + Firestore ✅
  ├── Auth:        Firestore (children/{id}/credentials)
  ├── Sessions:    Firestore (children/{id}/sessions)
  ├── Profiles:    Firestore (families/{fid}/children)
  ├── Progress:    Firestore (children/{id}/journey/progress)
  ├── Assessments: Firestore (children/{id}/assessments)
  ├── Scenarios:   Firestore (children/{id}/scenarios)
  └── Competencies: Firestore (children/{id}/competencies)

INFRASTRUCTURE:
  ├── Backend DB:   Firebase Firestore (google cloud)
  ├── Auth:         Firebase Authentication (google cloud)
  ├── Rules:        Firestore rules (200+ lines, comprehensive)
  ├── Server Logic: Cloud Functions (where needed)
  ├── Storage:      Firebase Storage (if needed)
  └── Tests:        Firebase Emulator Suite (authoritative)

RISK STATE:
  ├── Data consistency:  LOW (single backend)
  ├── Auth consistency:  ZERO (Firebase unified)
  ├── Scalability:       HIGH (Firestore auto-scaling)
  ├── Portability:       HIGH (standard Google Cloud)
  └── Maintenance:       REDUCED (1 backend)
```

---

## 14. DEPENDENCIES TO REMOVE

### Can Remove (After Migration Complete)

```json
{
  "devDependencies": {
    "drizzle-orm": "^0.45.2",
    "drizzle-kit": "^0.31.10",
    "postgres": "^3.4.9"
  }
}
```

### Must Keep

```json
{
  "dependencies": {
    "firebase": "^12.19.0",
    "@supabase/supabase-js": "REPLACED BY FIREBASE"
  },
  "devDependencies": {
    "firebase-admin": "^14.4.0"
  }
}
```

### Environment Variables to Remove

```
SUPABASE_URL=
SUPABASE_PROJECT_ID=
SUPABASE_PUBLISHABLE_KEY=
SUPABASE_SERVICE_ROLE_KEY=
VITE_SUPABASE_URL=
VITE_SUPABASE_PROJECT_ID=
VITE_SUPABASE_PUBLISHABLE_KEY=
```

---

## 15. DELETION CHECKLIST (Never Delete, Archive Only)

**Important**: Do NOT delete Supabase migrations or Supabase configuration until 4+ weeks after production migration completes.

| Item | Action | Timeline |
|------|--------|----------|
| `drizzle/migrations/` | Archive (read-only) | Week 8+ |
| `drizzle/schema.ts` | Archive (read-only) | Week 8+ |
| Supabase client files | Remove from imports | Week 5 |
| Supabase environment variables | Move to .env.archived | Week 5 |
| Test fixtures using Supabase | Rewrite for Firestore | Week 3 |
| Supabase SDK package | npm uninstall @supabase/supabase-js | Week 5 |

**Keep Indefinitely**:
- Migration audit reports
- Supabase export/backup
- This H4 audit document
- Phase notes and verification logs

---

## 16. FINAL DEPENDENCIES TABLE

| Package | Production? | Current Version | After H4 | Reason |
|---------|-------------|---|---|---|
| firebase | ✅ YES | ^12.19.0 | Keep | Core authentication & Firestore |
| firebase-admin | ✅ YES | ^14.4.0 | Keep | Server functions & admin operations |
| @supabase/supabase-js | ✅ CURRENTLY | ^2.116.0 | REMOVE | Entirely replaced by Firebase |
| drizzle-orm | ❌ NO | ^0.45.2 | REMOVE | Migrations only; Firestore replaces |
| drizzle-kit | ❌ NO | ^0.31.10 | REMOVE | Migration CLI no longer needed |
| postgres | ❌ NO | ^3.4.9 | REMOVE | Direct DB client no longer used |

**Dependency count change**: 
- Before: 3 backend systems (Firebase + Supabase + Postgres)
- After: 1 backend system (Firebase only)
- **Reduction: 67% fewer backend integrations**

---

## CONCLUSION

### What Must Be Done

1. **Migrate child authentication** (A-B phases) - CRITICAL
2. **Migrate all child data** (C-G phases) - REQUIRED
3. **Update all Supabase queries** to Firestore
4. **Verify all tests pass** with Firestore
5. **Update Firestore rules** for all new collections
6. **Remove Supabase SDK** and dependencies
7. **Archive migrations** for historical reference

### What Has NOT Changed

✅ Firebase Auth migration work is PRESERVED  
✅ Firestore rules foundation is PRESERVED  
✅ Security model (family-based access) is PRESERVED  
✅ Test infrastructure can be ENHANCED  
✅ P0 components continue to work  

### Success Criteria

| Metric | Target |
|--------|--------|
| All Supabase imports removed | 0 matches in codebase |
| All child login tests passing | 100% |
| Firestore rule coverage | 100% of data access paths |
| Zero production errors in Firebase | 0 Supabase-related logs |
| No data loss during migration | Row count verification |
| Performance maintained | Sub-100ms journey queries |
| Type safety | All TypeScript tests pass |

---

## APPENDIX: FILE-BY-FILE SUPABASE USAGE

### Imports of Supabase

| File | Import Type | Purpose | Migration Target |
|------|---|---|---|
| src/lib/analytics.ts | supabase | Event logging | Firestore collection |
| src/lib/assessment/attempts.ts | supabase | Assessment records | Firestore collection |
| src/lib/auth/child-auth.functions.ts | supabaseAdmin | Child login | Firestore queries |
| src/lib/auth/child-identity.server.ts | supabaseAdmin | Credential verification | Firestore queries |
| src/lib/auth/child-learning.functions.ts | supabaseAdmin + types.Json | Progress recording | Firestore documents |
| src/lib/auth/child-session.server.ts | supabaseAdmin | Session management | Firestore queries |
| src/lib/auth/roles.server.ts | supabaseAdmin | Role lookups | Firestore queries |
| src/lib/family.ts | supabase | Family management | Firestore queries |
| src/lib/feedback.ts | supabase | Feedback collection | Firestore collection |
| src/lib/gamification/achievements.ts | supabase | Achievement tracking | Firestore collection |
| src/lib/learning/progress.ts | supabase | Progress queries | Firestore queries |
| src/lib/progress/service.ts | supabase | Progress updates | Firestore updates |
| src/lib/scenario/session.ts | supabase | Scenario state | Firestore documents |
| src/integrations/supabase/client.ts | @supabase/supabase-js | SDK initialization | Firestore SDK |
| src/integrations/supabase/client.server.ts | @supabase/supabase-js | Server SDK | Firebase Admin SDK |

**Total**: 15 source files use Supabase; all must be rewritten or removed.

---

## END OF AUDIT

**Document**: PHASE_H4_SUPABASE_TO_FIREBASE_FINAL_MIGRATION_AUDIT.md  
**Status**: READ-ONLY - NO CODE CHANGES MADE  
**Approval**: ⏳ Awaiting direction on Phase H4.A start  
**Next Step**: Execute Phase H4.A (Child Credential Migration)
