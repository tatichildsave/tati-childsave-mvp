# TATI ChildSave: remaining Supabase dependency audit

Date: 2026-10-24  
Branch: `fix/lovable-dependency-removal`  
Scope: current local working tree, including the uncommitted Lovable cleanup.

## Executive decision

**Do not remove Supabase or its environment variables yet.**

Firebase is the primary authentication, provisioning and learning backend, but
Supabase still serves reachable feedback, analytics/reviewer pages and the
parent-led journey's achievement-history reader. A legacy exported family
provisioning server function also queries Supabase roles.

Other references are unused imports, disabled implementations, type-only
dependencies or historical database/tooling artifacts. They must not be treated
as equivalent to live queries. Conversely, an unused application query does not
prove its historical database records are disposable.

Recommended direction: retain the existing service temporarily; migrate the
remaining live features through authorized Firebase server functions; reconcile
historical identities/data separately; remove genuinely dead code last or in
small independently verified steps. Do not restore Supabase authentication or
broaden database permissions as a shortcut.

**Ownership remains unverified.** Local configuration identifies a Supabase
project, but does not establish its organization, billing owner or whether
administrative access depends on Lovable Cloud.

## 1. Method, classification and limits

Read application routes, consumer imports, query implementations, authentication
boundaries, Firebase counterparts/rules, SQL migrations, generated Supabase
types, backend-provider scaffolding, environment documentation, deployment
configuration and local operational scripts.

Only relevant environment key names and endpoint hostnames were inspected.
No credentials are reproduced. No Supabase/Firebase/SQL service was contacted,
no production data or management API was accessed, and no browser page was
navigated. No test, build, migration, seed or deployment command was run.
This avoids both production access and incidental generated code changes.

Classifications:

- **Active:** reachable route/hook/server handler has an executable operation.
  This does not claim the operation currently succeeds in production.
- **Active legacy:** still reachable older UI, even if newer Firebase UI exists.
- **Dormant/unused:** no production caller found, or import never accessed.
  External consumers cannot be disproved by repository inspection.
- **Disabled:** implementation explicitly refuses execution.
- **Firebase implemented:** counterpart exists and is wired into specified
  workflows; historical SQL data migration is a separate, unverified question.

Line references below describe the current working files. Runtime row counts,
actual deployed schemas/RLS, service availability and migration completeness
were not verified. Historical reports are corroborating evidence only.

## 2. Feature-by-feature inventory

| ID | Feature and dependency | Actual caller / path | Classification and Firebase comparison | Recommendation / removal consequence |
| --- | --- | --- | --- | --- |
| S1 | Parent feedback: browser INSERT into `feedback` | Current Parent Dashboard V2 quick link -> `/parent/feedback` -> `submitFeedback()` | **Active current UI.** Firebase has feedback rules, not a wired replacement service. | **Retain, then migrate.** Removing Supabase breaks pilot feedback submission. Preserve answers, message, context, audience, child relation and submission time. |
| S2 | Learner post-journey feedback: same INSERT | `/learn/$childId/summary` -> `/learn/$childId/feedback` | **Active legacy parent-session UI.** Not a child-cookie-only feedback endpoint. No wired Firebase replacement found. | Migrate alongside S1, preserving how the submitter and child are authorized. Do not invent a Firebase Auth identity for a child-cookie session. |
| S3 | Feedback review: SELECT from `feedback` | `/parent/feedback-review` -> `getFeedbackForReview()` | **Active registered internal route.** Route guard uses Firebase login; SQL reviewer policy controls returned data. No current navigation link found. | Migrate reviewer access and historical feedback, not just writes. Do not assume all parents or all Firebase admins should inherit the SQL reviewer allowlist. |
| S4 | Product event recording: INSERT into `analytics_events` | `trackEvent()` from family creation, older parent dashboard/lesson/journey screens, shared scenario runner and feedback submission | **Active, best-effort.** Firebase analytics rules exist but no equivalent wired data service was found. | Retain while adding an independent Firebase service. Removing it silently loses future events because existing errors return `undefined`. |
| S5 | Internal metrics: SELECT from `analytics_events` | `/parent/metrics` -> `getAnalyticsForReview()` | **Active registered internal route**, no current navigation link found. SQL reviewer-controlled; no wired Firebase replacement. | Migrate event history, authorized review and funnel queries together. A functioning landing page does not validate this feature. |
| S6 | Persistent achievement history: SELECT from `learner_achievements` | `/learn/$childId/` -> `useBadgeCelebrations()` -> `achievementsQuery()` | **Active legacy UI; split backend.** Reads SQL, but award/celebrated writes already use Firebase. Current `/child/*` learning reads Firebase achievements separately. | **Migrate early.** Use an appropriately parent-/child-authorized Firestore reader and reconcile old awards. Removing the query loses celebration history; changing only the reader without reconciliation can repeat celebrations. |
| S7 | Journey progress: SELECT from `journey_progress` in `lib/learning/progress.ts` | Exported `progressQuery()` / `useProgress()` | **Dormant SQL implementation.** No external production caller of those exports found. Actual dashboards use `lib/progress/service.ts`, which calls Firebase. | Candidate to remove the dead SQL reader, not the entire module: other exports and types are used extensively. Historical progress still needs retention/reconciliation. |
| S8 | Family-provisioning role lookup: SELECT from `user_roles` | Exported `ensureFamilyFn` -> SQL `getUserRoles()` -> Firebase family repository | **Legacy callable server surface.** No UI caller found. Normal admin enrollment uses Firebase authorization, not this path. | Decide whether to retire this endpoint or migrate its authorization to the existing trusted Firebase model. Do not remove its authorization check and leave execution enabled. |
| S9 | SQL role assignment/revocation: UPSERT/DELETE `user_roles` | `assignRole()` / `revokeRole()` in `roles.server.ts` | **Dormant exports.** No callers found. Current admin/facilitator checks use Firestore `users/{uid}.roles`. | Removal candidate after confirming no external/tooling caller. Preserve/archive old grants and validate identity mapping before any transfer. |
| S10 | Old child PIN/session persistence: `child_profiles`, `child_credentials`, `child_sessions` | Database functions in `child-identity.server.ts` | **Legacy unused DB implementation.** Only the module's pure ID/hash helpers are imported by an authorization test. Actual child login/session uses `child-auth-firebase.server.ts`. | Separate/move or retarget tests for pure helpers before retiring the module. Do not import old sessions automatically. Historical credentials/learners require reconciliation first. |
| S11 | Parent assessment attempt submission | `saveAssessmentAttempt()` in `assessment/attempts.ts` | **Disabled, no callers found.** Function immediately throws; Supabase import is unused. Parent assessment route displays a child-device notice. Actual child assessment persistence uses Firebase. | Remove unused import/disabled module only after checking tests and API expectations. Do not re-enable parent submissions during cleanup. |
| S12 | Onboarding Supabase import | `/onboarding`, line 3 | **Unused import only.** Drafts use localStorage; profile creation uses `useCreateChildProfile()` -> Firebase. | Safely removable import in a later implementation change. Keep current onboarding workflow unchanged. No SQL migration is needed for this import alone. |
| S13 | SQL schema, auth triggers, historical learning tables | Drizzle migrations and generated types | **Historical/tooling dependency**, not evidence of live route queries or completed Firebase backfill. | Retain migration history; owner-approved archive/reconciliation before decommissioning SQL. Do not run schema generation against the empty schema file. |
| S14 | Manual Supabase child-data seeder | `seed-test-child.mjs` | **Development/operations script**, not invoked by current package scripts. Uses a privileged key and writes SQL profiles/credentials. | Retire or quarantine after verifying replacement fixtures. Never run against the configured cloud project during this audit/migration planning. |

### Source anchors

- Feedback operations: [feedback.ts](src/lib/feedback.ts), lines 30-74.
  Callers: [parent feedback](src/routes/parent/feedback.tsx), lines 7, 52-72;
  [learner feedback](src/routes/_authenticated/learn.$childId.feedback.tsx),
  lines 6-7, 30-45;
  [review](src/routes/parent/feedback-review.tsx), lines 6-9.
  Current navigation: [DashboardSections.tsx](src/components/parent/DashboardSections.tsx),
  line 512. Parent route guard: [route.tsx](src/routes/parent/route.tsx), lines 5-12.
- Analytics operations: [analytics.ts](src/lib/analytics.ts), lines 35-78.
  Metrics: [metrics.tsx](src/routes/parent/metrics.tsx), lines 7, 18, 24-62.
  Producers: [family.ts](src/lib/family.ts), line 122;
  [older dashboard](src/routes/_authenticated/dashboard.tsx), lines 43, 156;
  [lesson route](src/routes/_authenticated/learn.$childId.lesson.$lessonId.tsx),
  lines 42, 78;
  [journey](src/routes/_authenticated/learn.$childId.index.tsx), line 78;
  [scenario runner](src/lib/scenario/useScenarioRunner.ts), lines 376, 393, 400, 410;
  [feedback.ts](src/lib/feedback.ts), line 50.
- Achievement query/writes: [achievements.ts](src/lib/gamification/achievements.ts),
  lines 15-30, 35-69, 78-112.
  Consumer: [useBadgeCelebrations.ts](src/components/gamification/useBadgeCelebrations.ts),
  lines 25-77; [journey route](src/routes/_authenticated/learn.$childId.index.tsx),
  lines 6, 56-60.
- Dormant progress reader: [learning/progress.ts](src/lib/learning/progress.ts),
  lines 28-39, 51-53. Active replacement:
  [progress/service.ts](src/lib/progress/service.ts), lines 75-99, 139-190.
- SQL roles: [roles.server.ts](src/lib/auth/roles.server.ts), lines 10-52.
  Remaining handler: [family.functions.ts](src/lib/backend/firebase/family.functions.ts),
  lines 254-273. This is distinct from `getFamilyId()` at lines 67-81 and the
  client wrapper named `ensureFamily()` in [family.ts](src/lib/family.ts), lines 38-41.
- Legacy credentials/sessions: [child-identity.server.ts](src/lib/auth/child-identity.server.ts),
  lines 101-176; pure test imports:
  [authorization.test.ts](src/lib/auth/authorization.test.ts), lines 14-19.
- Disabled assessment: [attempts.ts](src/lib/assessment/attempts.ts), lines 5-22;
  [parent-led assessment notice](src/routes/_authenticated/learn.$childId.assessment.$assessmentId.tsx).
- Onboarding: [onboarding.tsx](src/routes/onboarding.tsx), lines 3, 64-72, 109-125;
  [family.ts](src/lib/family.ts), lines 94-125.
- Seeder: [seed-test-child.mjs](seed-test-child.mjs), lines 16-38, 97-178.
  It contains hardcoded fixture identifiers and PIN material; those values are
  intentionally not reproduced in this report.

## 3. Client, authentication and service integration inventory

### Browser/SSR client

[client.ts](src/integrations/supabase/client.ts), lines 30-69, lazily creates
`@supabase/supabase-js` on first proxy property access. It uses public URL/key
configuration, browser-local session storage, persisted sessions and automatic
token refresh. On SSR the explicit storage option is undefined. A custom fetch
wrapper sets `apikey` and handles opaque Supabase API keys.

There is **no remaining explicit Supabase sign-in, OAuth, sign-out, password-reset,
setSession or auth-state listener call in application source**. Nevertheless,
an existing browser Supabase session may still be loaded/refreshed by the SDK
when an active query initializes the client. Removing the SDK/client changes
that behavior; absence of explicit login calls does not mean absence of an
implicit Auth service dependency.

Current parent/admin/facilitator login is Firebase. The visible Supabase client
configuration does not pass Firebase ID tokens via an `accessToken` callback or
exchange them for Supabase sessions. `submitFeedback()` and `trackEvent()` use
Firebase `currentUser.uid` as SQL identifiers; that alone does not authenticate
PostgREST as that user.

SQL migrations expect `auth.uid()`, authenticated policies, UUID profile IDs
and foreign keys. See [feedback policies](drizzle/migrations/0004_tati_feedback_mvp.sql),
lines 15-65, and [analytics schema/policies](drizzle/migrations/0005_tati_product_analytics.sql),
lines 22-47. Firebase UIDs need not be SQL UUIDs. **Authentication/identity
compatibility is unproven**, not a confirmed successful integration and not a
claim about deployed authorization behavior. A pre-existing SQL session or
externally configured identity integration cannot be verified locally.

Do not fix this by using the service-role key in the browser, relaxing RLS,
accepting arbitrary actor/child IDs, or duplicating accounts without an ID map.

### Privileged server client

[client.server.ts](src/integrations/supabase/client.server.ts), lines 34-70,
lazily constructs a service-role client with no persisted session or token
refresh. Its operational consumers are the SQL role and legacy child-identity
modules above. It bypasses SQL RLS; authorization must be maintained by trusted
server handlers during retirement or migration.

### Other Supabase service surfaces

| Surface | Repository evidence | Conclusion / limit |
| --- | --- | --- |
| PostgREST/database | Six query-bearing modules: feedback, analytics, achievements, learning progress, SQL roles, legacy child identity | Live and dormant operations distinguished above. |
| Storage | No bucket/object API call, storage URL, upload/download flow or storage configuration found in application/tooling source | No active application integration found. This does **not** establish that the remote project contains no buckets/objects. |
| Edge Functions | No `functions.invoke`, `/functions/v1` endpoint or Supabase function implementation/configuration found; `supabase/` contains project config only | No repository integration found. Remote dashboard functions/external consumers remain unknown. |
| Realtime | No channel/subscription or database-change subscription found | SDK transitive support is not an active feature. |
| RPC | No application `.rpc()` call found | SQL helper functions exist for RLS, rather than direct client RPC calls. |
| SQL triggers | Migrations create auth-user/profile and signup-analytics triggers, updated-at triggers and integrity protections | Backend behavior could remain active even without application queries if those migrations are deployed. |
| Scheduled jobs | No source-controlled Supabase job, SQL cron registration or Vercel cron configuration found | Out-of-repository jobs not inspected. |
| Firebase Cloud Functions | Account/role-management source under `functions/src/`, not Supabase Edge Functions | Preserve; not a Supabase removal target. |

The [initial auth trigger](drizzle/migrations/0000_tati_childsave_core.sql),
lines 14-25, creates a profile for a Supabase Auth user. The
[analytics migration](drizzle/migrations/0005_tati_product_analytics.sql),
lines 54-74, changes that trigger function to also record signup events.
Removing only JavaScript analytics calls does not retire these SQL behaviors.

### Provider/type scaffolding is not a migration switch

[provider.ts](src/lib/backend/provider.ts), lines 6, 16-18, advertises both
providers but returns `"firebase"`. No production provider registration/caller
was found that reroutes the direct Supabase operations above. Selecting Firebase
does not intercept `supabase.from(...)`.

[contracts.ts](src/lib/backend/contracts.ts) defines interfaces, including
feedback/analytics; interface existence is not implementation. Generated
[types.ts](src/integrations/supabase/types.ts) also supplies the type-only `Json`
imports in child-learning and Firebase family server code. Move that shared type
before deleting the integration directory. `child_credentials`, `child_sessions`
and `user_roles` exist in SQL migrations but are absent from these generated
table types; generated types are not a complete deployed-schema inventory.

## 4. Firebase coverage and authorization gaps to resolve

| Workflow | Existing Firebase implementation | What remains before SQL retirement |
| --- | --- | --- |
| Parent sign-in/session | [login.tsx](src/routes/(public)/login.tsx), lines 72-78, 103-109; [parent-auth.server.ts](src/lib/backend/firebase/parent-auth.server.ts), lines 28-109 | No Supabase Auth replacement needed for current login. Reconcile historical SQL identity references separately. |
| Child ID/PIN/session | [child-auth.functions.ts](src/lib/auth/child-auth.functions.ts), lines 4-10, 52-82; `child-auth-firebase.server.ts` | Preserve current PIN lockout/reset/session behavior. Do not revive old SQL auth implementation or carry unverified sessions. |
| Admin enrollment/family linking | [provisioning.functions.ts](src/lib/backend/provisioning.functions.ts), lines 16-46, 52-102; [provisioning.server.ts](src/lib/backend/provisioning.server.ts), lines 21-42, 249-334 | Current core path is Firebase. Retire/migrate the separate legacy `ensureFamilyFn` SQL-role lookup deliberately. |
| Facilitator roles/academy | [facilitator-auth.functions.ts](src/lib/auth/facilitator-auth.functions.ts), lines 19-37, 71-116; [academy/data-access.ts](src/lib/academy/data-access.ts) | Current role/learner/cohort data is Firestore; do not confuse its `getUserRoles()` with the identically named SQL helper. Preserve assignment/family restrictions. |
| Learning progress | [FirebaseJourneyProgressRepository](src/lib/backend/firebase/repositories.server.ts), lines 281-342; parent-scoped `getChildJourneyProgress`; child-cookie `recordChildProgress` | Verify historical SQL rows were retained/backfilled before claiming data equivalence. |
| Assessments/scenarios | Firebase repositories at [repositories.server.ts](src/lib/backend/firebase/repositories.server.ts), lines 427-800; child handlers at [child-learning.functions.ts](src/lib/auth/child-learning.functions.ts), lines 658-860 | Reconcile old attempts/responses and scenario decisions/state. Current Firebase persistence is not evidence that historical SQL content was copied. |
| Achievements | Same repository, lines 365-416; child learning reader at [child-learning.functions.ts](src/lib/auth/child-learning.functions.ts), lines 199-233 | Replace the parent-led route's SQL reader with a correctly authorized reader; merge historical award/celebrated state. |
| Feedback | [firestore.rules](firestore.rules), lines 169-174, defines `/feedback` access using `submittedByUid` and admin checks | Rules only: no wired replacement feedback read/write service found. SQL reviewer capability and snake_case payloads do not map automatically. |
| Analytics | [firestore.rules](firestore.rules), lines 176-185, defines `/analyticsEvents` with `actorUid` and a field allowlist | Rules only: no wired replacement tracker/reviewer service found. Build authorized queries, indexes, time mapping and event idempotency. |

Feedback/reviewer migration needs an explicit access decision: current SQL
reviewers are listed in `feedback_reviewers`; current Firestore rules use admin
access. Neither silently expanding reviewer access to every parent nor silently
removing an approved reviewer's access preserves behavior.

The learner feedback route sits behind the Firebase **parent** route context.
The normal `/child/*` application uses a separate HTTP-only child session cookie.
A child cookie is not Firebase `request.auth`; direct client writes allowed by
`signedIn()` rules are not a drop-in replacement for child-session workflows.
Use server-derived family/child context if child-only submission is added later.

Current analytics is also partial: event names in the catalog are not proof that
all current screens emit them. For example, Parent Dashboard V2 has no direct
`trackEvent()` call; the older `/dashboard` does. A child-only session may have no
Firebase `currentUser`, causing `trackEvent()` to skip. Preserve known semantics
first, then separately approve any expanded instrumentation.

## 5. Data at risk and preservation requirements

No row counts were read. The following is a **potential data inventory derived
from schema/code**, not a claim that every table is deployed or populated.

| SQL data family | Potential loss if service/data is removed | Proposed target / preservation condition |
| --- | --- | --- |
| `auth.users`, `profiles`, `user_roles`, `feedback_reviewers` | Historical adult identity, names, role grants, reviewer access and relationship references | Secure archive and explicit old-UUID -> Firebase-UID mapping. Do not merge users by name or assume UID equality. |
| `families`, `family_members`, `child_profiles` | Historical family ownership/membership, child IDs, TATI IDs, onboarding state | Map to Firestore families, members, per-user memberships and children. Verify cross-family boundaries and TATI-ID collisions. |
| `child_credentials`, `child_sessions` | Legacy credential/active/revoked state and sessions | Restricted retention only as justified; validate hash format/identity compatibility before any credential transfer. Prefer controlled reauthentication, not session copying. Never export plaintext PINs or tokens into reports. |
| `journey_progress` (renamed from `learning_progress`), old `progress_events` | Completions, scores, details, reflections and timestamps | Reconcile against Firestore `journeyProgress`; retain original IDs/timestamps and conflict provenance. No overwrite of newer progress. |
| Old `children` | Pre-family-model learner records and their progress references | Check archive/backfill scope, not simply current route usage. |
| `assessment_attempts`, `assessment_responses` | Baseline/post results, per-question answers, competency evidence and completion times | Map to Firebase attempt/response layout only after verifying uniqueness and atomicity requirements; archive unsupported historical fields. |
| `scenario_sessions`, `scenario_decisions` | Resume state, choice history, day/status, reflection/financial choices | Map to current Firebase scenario state/version layout; a separate SQL decision row is not automatically equivalent to embedded current state. |
| `learner_achievements`, `learner_competencies`, `parent_insights` | Badge awards/celebration flags, competency evidence, private notes/read state | Reconcile with Firebase achievements/competencies and preserve private insights/evidence even if currently derived UI no longer reads the SQL tables. |
| `feedback` | Parent/learner pilot responses, free text, ratings, context, timestamps | Migrate with explicit family access and reviewer parity, or retain a restricted approved archive. |
| `analytics_events` | Historical adoption/funnel data and event keys/times | Migrate or retain approved analytics archive; preserve dedup semantics and timestamps. |
| Remote buckets/functions/external jobs | Unknown, not inspected | Owner-managed inventory required before service shutdown; local absence of callers is insufficient. |

SQL foreign keys frequently use `ON DELETE CASCADE`, including links from
Supabase Auth to profiles and related records. See
[0003](drizzle/migrations/0003_tati_security_and_journey.sql), lines 4-22,
[0005](drizzle/migrations/0005_tati_product_analytics.sql), lines 22-23, and
[0009](drizzle/migrations/0009_tati_identity_schema_fix.sql), lines 8-11.
**Do not delete SQL Auth users as a client-cleanup step.**
Removing an npm dependency does not itself delete rows, but decommissioning the
project or deleting identities may make data unavailable or cascade deletion.

Migration reconciliation must preserve original SQL IDs separately from
destination IDs, verified family membership, event/award uniqueness, timestamps,
revocation state and reviewer permissions. Never use a blind last-write-wins
backfill over newer Firestore data. Use owner-approved counts/checksums and
orphan/conflict reports in an isolated environment first.

## 6. Configuration and operational dependencies

| Item | Actual consumer / status | Removal guidance |
| --- | --- | --- |
| `VITE_SUPABASE_URL` | Browser client, preferred over server fallback | Retain until S1-S6 callers are migrated. Public build-time setting. |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Browser client | Public key only; never replace with privileged credentials. |
| `SUPABASE_URL` | Server client, browser-client SSR fallback, manual seeder | Retain until server lookup/tooling consumers retire. |
| `SUPABASE_PUBLISHABLE_KEY` | Browser-client SSR fallback | Retain while relevant client is used. |
| `SUPABASE_SERVICE_ROLE_KEY` | Privileged client and seeder | Server-only. Remove/rotate only after active server/tooling dependencies are verified retired; never expose it in client variables. |
| `SUPABASE_PROJECT_ID`, `VITE_SUPABASE_PROJECT_ID` | Names found in local environment files; no executable source consumer found | Configuration metadata, not proven runtime requirements. Candidate removal only after deployment/tooling review. |
| `DATABASE_URL` | [drizzle.config.ts](drizzle.config.ts), line 8 | Tooling-only PostgreSQL setting; actual target/ownership not inspected. No runtime Drizzle query path found. |
| `supabase/config.toml` | Line 1 identifies project ref `ggtjulmplujaqmsppque` | CLI metadata, not ownership proof. |
| `@supabase/supabase-js` | [package.json](package.json), line 47; active client modules | Keep until the last runtime consumer is migrated. Its transitive Auth/Storage/Realtime packages do not prove use of those features. |
| `drizzle-kit`, `drizzle-orm`, `postgres` | Package devDependencies and historical migrations/config | No application SQL driver use found. Assess tooling retirement separately after archive; retain migration history. |
| `drizzle/schema.ts` | Intentionally empty | Do not use it as authoritative live schema or run destructive schema diff/push based on it. |

The public/server keys are documented in [.env.example](.env.example), lines
11-18. Local environment files contain Supabase public/project key names;
`.env.local` URL hostnames match `ggtjulmplujaqmsppque.supabase.co`.
Production environment values, management tokens and billing configuration
were not inspected. Local settings do not establish deployed configuration.

## 7. Ownership and Lovable Cloud evidence

### What the repository establishes

1. `supabase/config.toml:1` names project `ggtjulmplujaqmsppque`.
2. Local endpoint hostnames identify that project's `supabase.co` endpoint.
3. [Historical QA documentation](PHASE_2_3_EMULATOR_LIMITATION_BLOCKING_QA.md),
   lines 135-155, explicitly described this as a production cloud instance and
   recorded lack of dashboard access at that time. It is not proof of current
   ownership or current permissions.
4. The current application makes Supabase calls directly via the SDK, not a
   visible Lovable proxy. Source scans found no remaining Lovable service URL,
   editor-session broker or `LOVABLE_*` runtime configuration.
5. No organization ID, ownership transfer record, billing owner, account-access
   proof or complete remote resource inventory was found in inspected local
   evidence. API key possession does not establish organization ownership.

### What remains unknown

The project could be independently managed, or its administration/billing might
still depend on a Lovable-managed environment. A `supabase.co` hostname alone
cannot settle this. Thus:

- **Direct code-level Lovable service dependency:** none found.
- **Direct code-level Supabase runtime dependency:** present.
- **Operational independence from Lovable Cloud:** **not verified**.

Owner actions, using administrative metadata without sharing secrets or
production records:

- Confirm the project is visible under a TATI-controlled Supabase organization,
  identify its organization owner and billing contact, and confirm access does
  not require a Lovable editor session.
- Confirm TATI can administer keys, schema, backups/restore, storage, functions
  and integrations after any Lovable disconnection.
- Obtain organization/project ownership or transfer confirmation where needed.
- Inventory remote function names, bucket names, configured JWT integrations,
  jobs and external consumers. Do not infer they are absent from local source.
- If management is available only via Lovable Cloud, plan a supported transfer
  or separate data migration before cancelling/deleting that environment.

No dashboard login, management API call or production read is necessary or
authorized as part of this local audit.

## 8. Workflow-specific migration risk

| Workflow | Current SQL-removal risk | Principal safeguards |
| --- | --- | --- |
| Parent | **High** for feedback/reviewer pages and parent-led badge celebrations; current sign-in, V2 family/progress reads are Firebase | Preserve feedback entry points, review authorization, family scope, history and cache behavior. Do not delete the shared learning module just because its SQL reader is dormant. |
| Child | **Medium for current core runtime; high for unreconciled historical learning data** | Keep Firebase ID/PIN, lockout/reset, cookie sessions, scenario resume and assessment transaction paths unchanged. Parent-led learner feedback/badges remain separate migration work. |
| Facilitator | **Low direct Supabase dependency in current Academy UI; high if shared identity/data mappings are changed incorrectly** | Preserve Firestore roles, school/cohort assignments, read-only learning access and denial of parent-private data. Do not redirect its role reader to SQL. |
| Administrator | **Low direct dependency for current enrollment; elevated for legacy `ensureFamilyFn`, historical role data and reviewer access** | Preserve Firebase Admin authorization, enrollment/PIN reset and family-link repair. Retire/migrate legacy handlers with fail-closed authorization, never remove the check alone. |
| Product reviewer/operator | **High** | Preserve SQL reviewer allowlist intent, historical feedback/funnel visibility and operational backup/ownership access. |

These risks assess source dependency and data semantics, not production
availability or a vulnerability assessment. No exploit testing was performed.

## 9. Recommended migration sequence and release gates

### Stage 0: confirm control and freeze destructive actions

- Keep current service/configuration operational.
- Obtain ownership/resource metadata and a signed-off feature/data retention
  inventory. Confirm whether hidden consumers exist.
- Define an owner-approved backup/export and rollback plan; this audit performs
  neither. Use synthetic local/emulator fixtures for implementation.
- Establish an explicit identity mapping and canonical record/conflict policy.
  Never assume a Supabase UUID equals a Firebase UID or match children by name.

### Stage 1: isolated dead-reference cleanup

- Remove unused Supabase imports in onboarding and disabled assessment code.
- Remove only unused SQL progress-query exports after confirming references;
  retain the active child/family wrappers and shared types.
- Relocate or retarget the pure cryptographic-helper tests before removing the
  unused SQL child-identity persistence implementation.
- Review `assignRole`/`revokeRole`, old provider labels and the seeder for safe
  retirement. Preserve migration history and archives.
- Independently decide whether `ensureFamilyFn` has supported external callers.
  Retire the endpoint, or use trusted Firebase role authorization; do not revive
  parent self-enrollment or grant broad provisioning rights.

Gate: all existing routes and server authorization behavior unchanged; tests
cover removed exports/callers. No service/env removal yet.

### Stage 2: fix the achievement read/write split

- Reuse `FirebaseAchievementRepository.getAchievements`, exposed through the
  correct authenticated family/child server context, not a client-supplied
  family ID.
- Reconcile historic SQL awards and celebrated flags with newer Firestore state.
  Existing award writes can set `celebrated: false`; do not re-award blindly.
- Preserve badge computation, once-only celebrations and query invalidation.

Gate: badges/celebrations work after refresh/new device for the parent-led
journey and normal child flow; cross-family access remains denied; no SQL query
is needed by this feature.

### Stage 3: migrate feedback and review together

- Implement typed Firebase server functions with server-derived actor and
  authorized optional child/family links. Preserve all payload fields.
- Explicitly choose/map approved reviewer capability before changing rules.
  Avoid replacing an allowlist with broad parent access.
- Add scoped review queries, indexes/pagination and real success/error states.
- Backfill/retain historic feedback using stable migration IDs, original
  timestamps and idempotent retries. Verify counts and missing relationships in
  an approved isolated migration rehearsal.

Gate: current parent quick link, learner parent-session feedback, own-submission
access, approved review, denied review and historical visibility all match the
approved policy.

### Stage 4: migrate analytics ingestion and metrics

- Implement server-validated events without free-text assessment answers,
  secrets or unnecessary personal data. Preserve best-effort/non-blocking UX.
- Preserve event keys/time and dedup behavior; SQL unique constraints involving
  nullable fields do not automatically map to Firestore document IDs.
- Migrate authorized metric/reviewer reads and historic event data or retain an
  approved restricted archive.
- Decide separately whether to improve currently incomplete instrumentation.
  Do not silently treat missing old events as zero use or invent historical
  events during backfill.

Gate: approved events are recorded once as intended; metrics remain comparable;
unauthorized review is denied; missing analytics never blocks learning.

### Stage 5: reconcile historical SQL data before shutdown

- Owner-approved snapshot/export, schema verification, row counts and dependency
  graph; no copying production data into the repository.
- Rehearse mappings for legacy families, users, child IDs/TATI IDs, progress,
  assessments, decisions, awards, insights and reviewer grants.
- Preserve unknown/unsupported fields in a restricted archive rather than
  discarding them. Do not overwrite newer Firestore progress.
- Explicitly retire old sessions with an approved reauthentication plan.
  Avoid unnecessary credential copying; never log hashes/tokens/PINs.
- Use checkpointed idempotent backfills and reconcile orphans/conflicts before
  changing readers. Avoid uncoordinated dual writes; if overlap is required,
  specify source-of-truth, dedup, failure recovery and rollback first.

### Stage 6: remove runtime client/configuration, then consider decommission

- Only after zero live readers/writers/handlers remain, relocate shared `Json`
  and domain types, remove clients and SDK/package-lock dependencies.
- Remove env variables only after deployed code and external tooling no longer
  require them. Review obsolete browser-session storage cleanup separately.
- Scan source and built client/server output for SQL/Auth/Storage/Edge/Realtime
  calls. Validate with Supabase unavailable in an isolated test environment.
- Keep SQL exports, ownership evidence and migration history under the approved
  retention policy. Delay service cancellation/deletion until acceptance and
  rollback windows expire; require explicit owner approval.

### Required verification for a future implementation

- Parent login/logout, family-child relationships, V2 progress and feedback.
- Child ID/PIN, incorrect/locked/reset PINs, expired sessions, SAVE
  lessons/assessments/scenario save-resume-reload and once-only achievements.
- Facilitator login, school/cohort assignment boundaries and read-only access.
- Admin login, family/parent/child enrollment, PIN reset and family-link repair.
- Feedback/analytics accepted/denied cases, server-derived actor identity,
  cross-family denial, reviewer parity and duplicate submission retry.
- Backfill idempotency, field/count reconciliation, timestamps, no new-session
  trust from legacy data, no overwrite of newer results.
- Source scans, production build, type/lint checks and browser smoke checks with
  Supabase deliberately unreachable on a synthetic test deployment.

No such tests were run for this documentation-only audit. Prior Lovable-cleanup
test results are not presented as new Supabase migration verification.

## 10. Audit outcome

The safe conclusion is **partial migration, not redundant service**.
Current Firebase core workflows can coexist with live Supabase secondary
features and historical SQL data. Remove only proven unused code first; migrate
achievement reads, feedback/review and analytics/metrics with their authorization
and historical-data requirements intact.

This audit created only this document. It did not change application code,
configuration, environment values, database data or existing cleanup edits.
No commit, push, merge or deployment was performed.
