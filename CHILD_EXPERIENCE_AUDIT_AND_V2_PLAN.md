# TATI ChildSave: Child Learning Experience Audit and V2 Plan

Scope: the junior learner experience (ages 8–12), read-only. No application code, Firebase data, security rules, commits, pushes or deployments were changed.

Labels used throughout:

- **[C] Confirmed**: verified by reading the code in this audit.
- **[V] Verify**: likely from the code, but needs a runtime check (browser or emulator) before it is treated as fact.
- **[R] Recommendation**: a proposal, not an existing fact.

---

## 1. Executive summary

- **[C]** The live child experience is the `/child/*` route tree. It has its own login (TATI ID + 4-digit PIN), a route guard, a home, a learning trail, progress, results, and lesson, scenario, reflection and assessment screens. All of it talks to Firebase through server functions. Children never get a Firebase user.
- **[C]** The SAVE track has 24 stops in a strictly linear sequence: 2 assessments (pre and post), 16 lessons, 4 scenarios (`kind: "scenario"`) and 2 reflections. Lessons, scenarios and reflections are marked done when the child completes them. Assessments are the only activities scored by the server.
- **[C]** XP and savings are based on completed stops, not on the score a child submits. Parent insights use the server-scored assessments. The client-supplied lesson and scenario scores are not used for rewards, and I found no parent view of them in the insights code.
- **[C] Biggest risks:** the child PIN can be brute-forced because there is no rate limit or lockout; child TATI IDs and session objects are written to logs; a test-only login ships in the production bundle; and some child-facing links point to parent-only routes.
- **[C] Biggest UX gaps:** the child home is text-heavy and uses emoji as icons; the "Your current challenge" card looks tappable but does nothing; there is no character-led storytelling on the home screen that I could confirm; and the 30-minute session has no refresh, so a child can be logged out mid-lesson.
- **[R] Recommendation:** fix the security and link bugs first (phase 0), then build Child Dashboard V2 on the existing `/child/*` routes and the existing `computeProgressSnapshot` logic.

---

## 2. Existing child routes and features

### Routes

| Route | File | Purpose | Status |
|---|---|---|---|
| `/child/login` | [src/routes/child/login.tsx](/C:/Users/Y%20O%20G%20A/tati-childsave-mvp/src/routes/child/login.tsx) | TATI ID + 4-digit PIN login | [C] Working code path |
| `/child` layout | [src/routes/child/route.tsx](/C:/Users/Y%20O%20G%20A/tati-childsave-mvp/src/routes/child/route.tsx) | Session guard (`getChildSession`), bottom navigation | [C] |
| `/child/home` | [src/routes/child/home.tsx](/C:/Users/Y%20O%20G%20A/tati-childsave-mvp/src/routes/child/home.tsx) | Greeting, XP, goal, next step, trail summary, achievements | [C] |
| `/child/learn` | [src/routes/child/learn.tsx](/C:/Users/Y%20O%20G%20A/tati-childsave-mvp/src/routes/child/learn.tsx) | The 24-stop trail | [C] |
| `/child/progress` | [src/routes/child/progress.tsx](/C:/Users/Y%20O%20G%20A/tati-childsave-mvp/src/routes/child/progress.tsx) | Badges and progress | [C] Linked from home |
| `/child/results` | [src/routes/child/results.tsx](/C:/Users/Y%20O%20G%20A/tati-childsave-mvp/src/routes/child/results.tsx) | Results after the journey | [C] Linked from next-step card |
| `/child/lesson/$lessonId` | [src/routes/child/lesson.$lessonId.tsx](/C:/Users/Y%20O%20G%20A/tati-childsave-mvp/src/routes/child/lesson.$lessonId.tsx) | Lesson player | [C] |
| `/child/scenario/$scenarioId` | [src/routes/child/scenario.$scenarioId.tsx](/C:/Users/Y%20O%20G%20A/tati-childsave-mvp/src/routes/child/scenario.$scenarioId.tsx) | Scenario player (wraps `ScenarioPlayer`) | [C] Has a broken back link, see §5 |
| `/child/reflection/$reflectionId` | [src/routes/child/reflection.$reflectionId.tsx](/C:/Users/Y%20O%20G%20A/tati-childsave-mvp/src/routes/child/reflection.$reflectionId.tsx) | Reflection | [C] |
| `/child/assessment/$assessmentId` | [src/routes/child/assessment.$assessmentId.tsx](/C:/Users/Y%20O%20G%20A/tati-childsave-mvp/src/routes/child/assessment.$assessmentId.tsx) | Pre and post check-ins | [C] Server-scored |

### Parent and facilitator journey routes (not for children)

- **[C]** `/_authenticated/learn/$childId/*` (hub, lesson, scenario, reflection, assessment, summary, feedback) is guarded by [src/routes/_authenticated/route.tsx](/C:/Users/Y%20O%20G%20A/tati-childsave-mvp/src/routes/_authenticated/route.tsx). That guard only accepts a Firebase `currentUser`, so a child is redirected to `/login`.
- **[C]** These routes are used by parents and facilitators, for example from `/_authenticated/dashboard` and [src/routes/parent/child.$childId.tsx](/C:/Users/Y%20O%20G%20A/tati-childsave-mvp/src/routes/parent/child.$childId.tsx).
- **[C]** `itemPath` in [src/lib/learning/track.ts](/C:/Users/Y%20O%20G%20A/tati-childsave-mvp/src/lib/learning/track.ts) builds `/learn/...` paths. The child `learn` route maps items to `/child/...` itself, so the trail is correct. The `continuePath` field in [src/lib/progress/snapshot.ts](/C:/Users/Y%20O%20G%20A/tati-childsave-mvp/src/lib/progress/snapshot.ts) still builds `/learn/...` paths, but I found no child-facing consumer of it. `NextStepCard` builds its own `/child/...` routes.

### Learning data

- **[C]** The SAVE track is defined in [src/content/tracks/save.ts](/C:/Users/Y%20O%20G%20A/tati-childsave-mvp/src/content/tracks/save.ts). It has a goal (`goal.target`, `goal.daysTotal`) and per-stop `reward` values (for example 0, 5, 10 or 15 cedis).
- **[C]** Progress and gamification come from [src/lib/progress/snapshot.ts](/C:/Users/Y%20O%20G%20A/tati-childsave-mvp/src/lib/progress/snapshot.ts) (`computeProgressSnapshot`) and [src/lib/gamification/engine.ts](/C:/Users/Y%20O%20G%20A/tati-childsave-mvp/src/lib/gamification/engine.ts) (`computeGamification`). The child reaches them through [src/lib/auth/use-child-learning.ts](/C:/Users/Y%20O%20G%20A/tati-childsave-mvp/src/lib/auth/use-child-learning.ts).

---

## 3. Current user journey

1. **[C]** The child opens `/child/login`, enters a TATI ID (`TATI-XXXXXXXX` format) and a 4-digit PIN, and is sent to `/child/home`.
2. **[C]** `/child/home` shows a greeting with the avatar, the XP level, a savings goal, a "next step" card, a "current challenge" card, a trail summary ("X of 24 activities complete") and up to three badges.
3. **[C]** Tapping "Continue my journey" opens `/child/learn`. The trail is strictly linear: the first unfinished stop is current, and all later stops are locked.
4. **[C]** The child completes a stop (lesson, scenario, reflection or assessment). Each stop calls a server function and returns to the trail.
5. **[C]** Completing stops adds XP and savings and can earn badges. Completing the post-check-in ends the journey.
6. **[C]** The child signs out from home, which calls `childLogout` and clears the cookie.

### Gaps in this journey

- **[C]** The "current challenge" card on home has no `onClick` and no link. It looks tappable but does nothing.
- **[C]** The scenario back link goes to a parent-only route (§5).
- **[V]** If the 30-minute session expires during a lesson, the child is sent to login. Lesson drafts are kept in `localStorage` ([src/components/lesson/LessonPlayer.tsx](/C:/Users/Y%20O%20G%20A/tati-childsave-mvp/src/components/lesson/LessonPlayer.tsx)), so partial recovery may be possible. This needs a browser check.

---

## 4. Functional assessment

### What works (by code reading)

| Feature | Evidence | Assessment |
|---|---|---|
| Child login (TATI ID + PIN) | [child/login.tsx](/C:/Users/Y%20O%20G%20A/tati-childsave-mvp/src/routes/child/login.tsx), `childLogin` | Works in code. Calls the server, sets an httpOnly cookie, goes to home. |
| Route guard | [child/route.tsx](/C:/Users/Y%20O%20G%20A/tati-childsave-mvp/src/routes/child/route.tsx) | Calls `getChildSession()` and redirects when there is no session. |
| Session cookie | [child-auth.functions.ts](/C:/Users/Y%20O%20G%20A/tati-childsave-mvp/src/lib/auth/child-auth.functions.ts) | httpOnly, sameSite lax, secure in production. Revoked on logout. |
| Child data scoping | `getCurrentChildContext` in [child-learning.functions.ts](/C:/Users/Y%20O%20G%20A/tati-childsave-mvp/src/lib/auth/child-learning.functions.ts) | Each server function uses the authenticated child's ID, not one from the request. |
| Lesson, scenario, reflection recording | `recordChildProgress` | Works. Validates the item exists in the track, but takes the score from the client (§6). |
| Assessments | `saveChildAssessment` | Works. The score is calculated on the server and the client score is ignored. |
| Trail and progress | `computeProgressSnapshot` | Works. Linear sequence, current and locked states, XP, savings and badges. |
| Next step card | [components/tati/NextStepCard.tsx](/C:/Users/Y%20O%20G%20A/tati-childsave-mvp/src/components/tati/NextStepCard.tsx) | Works. Routes use `/child/...`. |
| Sign out | `childLogout` | Works. Clears the query cache and returns to login. |

### Incomplete, broken or unreliable

| # | Issue | Status | Evidence |
|---|---|---|---|
| F1 | Scenario back link goes to `/learn/$childId`, a parent-only route. A child is sent to `/login`. | [C] in code, [V] at runtime | [ScenarioPlayer.tsx](/C:/Users/Y%20O%20G%20A/tati-childsave-mvp/src/components/scenario/ScenarioPlayer.tsx) line ~91. Used by [child/scenario](/C:/Users/Y%20O%20G%20A/tati-childsave-mvp/src/routes/child/scenario.$scenarioId.tsx). |
| F2 | "Your current challenge" card has no action. | [C] | [child/home.tsx](/C:/Users/Y%20O%20G%20A/tati-childsave-mvp/src/routes/child/home.tsx), "Your current challenge" section. |
| F3 | TATI ID key mismatch: the child profile reads `tatiId` only. Some records are written with `tati_id` only. | [V] | [child-session.server.ts](/C:/Users/Y%20O%20G%20A/tati-childsave-mvp/src/lib/auth/child-session.server.ts) line ~100 reads `childData["tatiId"]`. [repositories.server.ts](/C:/Users/Y%20O%20G%20A/tati-childsave-mvp/src/lib/backend/firebase/repositories.server.ts) line ~208 writes `tati_id`. [provisioning.functions.ts](/C:/Users/Y%20O%20G%20A/tati-childsave-mvp/src/lib/backend/provisioning.functions.ts) line ~665 patches one key from the other, which suggests the mismatch is known. If a child's profile lacks the field, the home screen may show a blank TATI ID. Login itself uses the credential document, so it may still work. |
| F4 | Child session is 30 minutes with no refresh. | [C] | [child-auth-firebase.server.ts](/C:/Users/Y%20O%20G%20A/tati-childsave-mvp/src/lib/auth/child-auth-firebase.server.ts) (TTL constant, no refresh). |
| F5 | The child login page writes the TATI ID and PIN length to the browser console. | [C] | [child/login.tsx](/C:/Users/Y%20O%20G%20A/tati-childsave-mvp/src/routes/child/login.tsx) lines ~23–25. |
| F6 | Two client progress helpers still exist: `lib/progress/service.ts` (`useRecordProgress`, which sends client scores) and `lib/learning/progress.ts` (Supabase `journey_progress` query). | [C] that they exist; [V] whether any child screen uses them | I found no `/child/*` route that imports either. The Supabase one is used by the parent dashboard path. |
| F7 | `progressQuery` and `useChild` in `lib/learning/progress.ts` use Supabase. | [C] | Used by the `_authenticated` (parent) dashboard, not the child. |
| F8 | Lesson, scenario and reflection scores are stored but not shown in the insights I read. | [C] for insights; [V] for parent journey pages | [insights.ts](/C:/Users/Y%20O%20G%20A/tati-childsave-mvp/src/lib/learning/insights.ts) uses only the `pre` and `post` assessments. |
| F9 | No test file covers the live child auth or learning code. | [C] | `authorization.test.ts` tests pure role helpers and the legacy [child-identity.server.ts](/C:/Users/Y%20O%20G%20A/tati-childsave-mvp/src/lib/auth/child-identity.server.ts) module, which is backed by Supabase. No test imports `child-auth-firebase.server.ts`, `child-session.server.ts` or `child-learning.functions.ts`. |

### Stored and retrieved data

- **[C]** Child credentials: `childCredentials/{tatiId}` (server-only, client read and write denied in [firestore.rules](/C:/Users/Y%20O%20G%20A/tati-childsave-mvp/firestore.rules)). The PIN is stored as a scrypt hash.
- **[C]** Child sessions: `families/{familyId}/children/{childId}/sessions/{id}` (client denied). The token is stored as a SHA-256 hash.
- **[C]** Progress: `journeyProgress/{itemKey}` (client create and update denied; read allowed for family members with `canAccessChild`). Writes come from the Admin SDK.
- **[C]** Assessments: `assessmentAttempts` (client writes denied). Scenarios: `scenarioSessions` (client writes denied). Competencies and achievements: server-only writes.
- **[C]** Child reads go through server functions, not client Firestore rules, because children have no Firebase user.

### Age appropriateness (by code and copy)

- **[C]** The copy is short and mostly plain English. It uses "cedis" and words like "adventure trail", "Pause and think" and "Keep going".
- **[C]** Tasks are discrete: one stop at a time, with a clear next action.
- **[V]** Reading level, the pacing of scenario choices, and whether each screen works for a child who reads slowly need a review with real 8–12-year-olds.

---

## 5. UI/UX weaknesses

### What already helps

- **[C]** Large touch targets: buttons use `min-h-[48px]` to `min-h-[56px]`, and the PIN field accepts digits only.
- **[C]** Shared child components: `Page`, `Card`, `Avatar`, `XPIndicator`, `GoalWidget`, `NextStepCard`, `ListenButton` (text-to-speech), `BottomNavigation`.
- **[C]** Motion is reduced for users who prefer it (`motion-reduce:transition-none` on the assessment button).
- **[C]** The sign-out button has an `aria-label`.

### Weaknesses

| # | Area | Observation | Status |
|---|---|---|---|
| U1 | First impression | Home opens with a plain-text header ("TATI ChildSave") and a list of cards. There is no visible hero or TATI character. | [C] for the code; [V] for visuals |
| U2 | Tappability | The "current challenge" card looks like a button but is not one (F2). | [C] |
| U3 | Icons | Emoji are used as icons (📖, 🏅, 👋). These render differently across devices and are not a consistent icon set. | [C] |
| U4 | Scenario exit | The back arrow on scenarios leads to a parent route (F1). A child who taps it is stuck. | [C] in code |
| U5 | Motivation | Achievements show only three badges and a count. There is no visible "next badge" goal and no celebration on completion, as far as the code shows. | [C] for code |
| U6 | Trail | The trail is strictly linear, so a child cannot see what is ahead except through locked items. | [C] |
| U7 | Session | Sudden logout after 30 minutes with no warning. | [C] in code |
| U8 | Level label | The home screen shows "Primary {age − 5} learner" when `curriculum_level` is missing. This is computed from age, so it may be wrong for a child's actual class. | [C] |
| U9 | Brand | I did not review the official logo asset or the character illustrations in this audit. Any brand statement must wait until those are checked. | Not checked |
| U10 | Responsiveness | The layout uses `Page` and `BottomNavigation`. I did not test it at tablet or desktop widths. | [V] |

---

## 6. Authentication and security assessment

### Confirmed strengths

- **[C]** Child PINs are hashed with scrypt (N=16384) and are not sent back in the login response.
- **[V]** The child profile payload has no PIN hash field, but I did not check every field of the Firestore document (see S6).
- **[C]** Session tokens are random 32-byte values. Only the SHA-256 hash is stored.
- **[C]** Child sessions expire after 30 minutes and are revoked on logout.
- **[C]** The session cookie is httpOnly, sameSite lax, and secure in production.
- **[C]** Firestore client access is denied for `childCredentials`, `childSessions`, the child `sessions` subcollection, and child `journeyProgress` writes. Writes go through the Admin SDK.
- **[C]** Every child server function derives the child from the session (`getCurrentChildContext`), not from the request. Test coverage for this is in `authorization.test.ts` (pure helpers only).
- **[C]** Assessment scores are calculated on the server, and the client score is ignored.

### Findings

| # | Severity | Finding | Status | Evidence |
|---|---|---|---|---|
| S1 | High | **No PIN rate limit or lockout.** A 4-digit PIN has about 10,000 combinations. Without a limit, anyone who knows a TATI ID can brute-force the PIN. | [C] | `verifyChildCredential` in [child-auth-firebase.server.ts](/C:/Users/Y%20O%20G%20A/tati-childsave-mvp/src/lib/auth/child-auth-firebase.server.ts) has no attempt counter. |
| S2 | High | **Logs contain identifiers and session details.** Child login logs the TATI ID and PIN length in the browser. The server logs the TATI ID in `verifyChildCredential`, and session objects in `childLogin`/`getChildSession`. Some logs include the token hash. | [C] for the browser and TATI ID logs; [C] for session-object logging; [V] for token hash in production logs | [child/login.tsx](/C:/Users/Y%20O%20G%20A/tati-childsave-mvp/src/routes/child/login.tsx), [child-auth.functions.ts](/C:/Users/Y%20O%20G%20A/tati-childsave-mvp/src/lib/auth/child-auth.functions.ts), [child-learning.functions.ts](/C:/Users/Y%20O%20G%20A/tati-childsave-mvp/src/lib/auth/child-learning.functions.ts) (`[H4.B]` logs). |
| S3 | Medium | **Test-only login ships in the production bundle.** [test-child-login.functions.ts](/C:/Users/Y%20O%20G%20A/tati-childsave-mvp/src/lib/auth/test-child-login.functions.ts) is only blocked at runtime by an env check (`FIRESTORE_EMULATOR_HOST`). It queries `tatiId` through `collectionGroup("children")`. | [C] | The code is compiled into the app. |
| S4 | Medium | **Client-supplied progress scores are accepted.** `recordChildProgress` accepts any non-negative integer `score` and `maxScore`, with no check that `score ≤ maxScore`. `details` is an unbounded record. | [C] | `progressInput` in [child-learning.functions.ts](/C:/Users/Y%20O%20G%20A/tati-childsave-mvp/src/lib/auth/child-learning.functions.ts) lines ~15–21. |
| S5 | Low | Child sessions are not refreshed. A stolen cookie is valid for at most 30 minutes, which limits the risk. | [C] | `child-auth-firebase.server.ts` TTL. |
| S6 | Low | The child home route fetches all learning data and profile fields. I did not find any PIN or token field in the response, but I did not check every field of the Firestore document. | [V] | `getChildLearningData` returns `profile`, `progress`, `competencies`, `achievements`, `assessments`. |
| S7 | Info | Legacy Supabase code is still in the repository: `child-identity.server.ts` (used only by tests), `lib/analytics.ts`, `lib/assessment/attempts.ts`, `lib/learning/progress.ts`, `lib/auth/roles.server.ts`, and an `Json` type import in `child-learning.functions.ts`. None of the `/child/*` routes import these. | [C] | Grep results. |

---

## 7. SAVE curriculum and progress integration

### Structure (confirmed)

- **24 stops** in [save.ts](/C:/Users/Y%20O%20G%20A/tati-childsave-mvp/src/content/tracks/save.ts): 2 assessments (`save-pre`, `save-post`), 16 lessons, 4 scenarios, 2 reflections.
- **Linear.** The current stop is the first one not done. Later stops are locked.
- **Rewards.** Each stop has a `reward` (cedis), and savings are the sum of rewards for completed stops.
- **XP.** `xpFor(kind)` per completed stop, plus a bonus when the journey is complete. XP does not depend on the score.

### Integration with parent and facilitator views

- **[C]** The parent insights ([parent-insights.ts](/C:/Users/Y%20O%20G%20A/tati-childsave-mvp/src/lib/learning/parent-insights.ts), [insights.ts](/C:/Users/Y%20O%20G%20A/tati-childsave-mvp/src/lib/learning/insights.ts)) use the server-scored `pre` and `post` assessments and the completion counts. This is the trustworthy part.
- **[C]** Lesson, scenario and reflection scores are stored in `journeyProgress` but do not feed insights.
- **[V]** Parent and facilitator screens read the same `journeyProgress` collection, so the progress shown there matches what the child completed. The score fields may show client-supplied values (S4) if any screen displays them.

### Consistency (confirmed)

- **[C]** The child, parent and facilitator screens all use `computeProgressSnapshot`, so completion, savings and XP are calculated the same way. This is a strength.
- **[C]** The child's TATI ID display depends on field naming (F3), which may show a blank ID in some records.

---

## 8. Proposed Child Dashboard V2 features

All items are **[R] recommendations**. Each must be built on the existing routes and the existing `computeProgressSnapshot` logic. None of them needs a new backend operation unless noted.

1. **A clear "Today's adventure" hero** on home, showing the current stop as a large, tappable card with a character. Fixes F2 and U1.
2. **Session continuity.** A warning at about 5 minutes before expiry and a "keep me signed in" refresh when the child is active. Needs a product decision (see §12).
3. **Consistent iconography.** Replace emoji icons with the project's icon set (Lucide, if it is compatible with the existing components).
4. **Badge goals.** Show the next badge and how far the child is from it. Uses existing `game.earnedBadges` data.
5. **Completion celebrations.** A short, reduced-motion-safe animation when a stop is completed. Visual only; no new data.
6. **Character and story moments.** Use the approved TATI characters at key points (first login, a completed lesson, the journey complete). Requires confirming the character assets first (U9).
7. **Savings view.** A child-friendly goal meter using the existing `GoalWidget` and `journey.savedCedis`.
8. **Scenario exit that returns to `/child/learn`.** Fixes F1 and U4.
9. **Accessibility pass.** Keyboard focus, contrast, and text-to-speech coverage for each screen.
10. **Responsive layout check** at phone, tablet and desktop widths (U10).

---

## 9. Recommended navigation and learning journey

- **Bottom navigation:** Home, Learn, Badges (Progress), and Sign out inside Home.
- **Home:** hero (current stop), XP and level, savings goal, next badge, trail summary.
- **Learn:** the 24-stop trail with clear current, done and locked states. Unchanged structure.
- **Stop screens:** one clear action at a time, a visible back button to `/child/learn`, and a completion screen that returns to the trail.
- **Session:** warning before expiry and a safe exit that keeps lesson drafts.

---

## 10. Implementation phases and priorities

### Phase 0: Security and broken links (highest priority)

1. Add PIN attempt limiting and a temporary lockout in `verifyChildCredential` (S1). Needs product decision on the policy (§12).
2. Remove the console logging of TATI IDs, PIN length and session objects (S2, F5).
3. Remove the test-only child login from the production bundle, or exclude it from the build (S3).
4. Fix the scenario back link to `/child/learn` (F1, U4).
5. Make the "current challenge" card a link to the current stop, or remove its tap styling (F2, U2).
6. Resolve the `tatiId` / `tati_id` key mismatch in `child-session.server.ts` (F3), after checking real records.
7. Validate scores on the server: reject `score > maxScore`, cap `details` size, or stop storing lesson and scenario scores if they are not needed (S4).

### Phase 1: Session and reliability

1. Session warning and refresh (F4, U7, S5).
2. Confirm lesson draft recovery after logout (§3).

### Phase 2: Child Dashboard V2 UI

1. Home hero, next badge, completion celebration, icon set (§8 items 1–5).
2. Character moments and savings view (§8 items 6–7), after asset review.
3. Accessibility and responsive passes (§8 items 9–10).

### Phase 3: Cleanup

1. Remove or isolate Supabase code that is not used by the parent or child flows (S7, F6, F7).
2. Remove the unused `continuePath` helper or switch it to `/child/...` (§2).

---

## 11. Testing requirements

### Automated

- **Unit:** `verifyChildCredential` lockout behaviour; TATI ID normalisation; PIN hash round trip; score validation in `progressInput`.
- **Integration:** child login → home → one lesson → back to trail; session expiry redirects to `/child/login`; a child cannot read another child's progress (extend `authorization.test.ts` with the live Firebase path, not only the legacy module).
- **Rules tests:** `childCredentials`, `childSessions`, child `sessions`, and `journeyProgress` client writes are denied. Use the existing rules test pattern in `src/lib/academy/__tests__/`.
- **E2E (Playwright, emulator):** login with a valid and an invalid PIN; scenario back link; "current challenge" tap.

### Manual

- Phone (360–414 px), tablet (768–1024 px) and desktop widths: no horizontal overflow, readable text, usable buttons.
- Keyboard-only navigation through login, home and one stop.
- Screen reader check on login and the trail.
- Real-user review with 8–12-year-olds for language and pacing.

### Production safety

- Confirm no TATI ID, PIN or token appears in the browser console or server logs after the Phase 0 changes.
- Confirm the test-only login is absent from the production bundle.

---

## 12. Key decisions requiring product-owner approval

1. **PIN lockout policy.** How many failed attempts before a lockout, and how long should it last? Who can reset it (parent, facilitator or admin)?
2. **Session length.** Is 30 minutes right for young children? Should it refresh while they are active, and what should the warning say?
3. **Test login.** Remove it from the production build entirely, or keep it only for development?
4. **Lesson and scenario scores.** Keep them (and cap them), or stop recording them since they do not feed rewards or insights?
5. **Parent visibility.** Should parents see lesson and scenario scores, or only completion and the assessment results?
6. **Legacy Supabase code.** Remove now, or after the parent dashboard is redesigned?
7. **Brand assets.** Which TATI character illustrations are approved for the child experience? I did not verify them in this audit.
8. **Age band.** Is the target 8–12 for all screens, or should the copy and layout differ for younger and older children?

---

## Coverage and limits of this audit

- Read: the child login, route guard, child session and auth functions, the child learning server functions, the progress snapshot and gamification engine, the SAVE track definition (stop count), the Firestore rules for child data, the child home, the next-step card, the scenario back link, and the authorization tests.
- Not read in detail: lesson, scenario and reflection content; the progress and results pages; the avatar and character assets; the bottom navigation; the logo asset; and any end-to-end test folder outside `src`.
- No runtime testing was done. Items marked [V] need a browser or emulator check.
