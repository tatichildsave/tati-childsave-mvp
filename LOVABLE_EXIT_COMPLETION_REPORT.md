# Lovable exit completion report

Date: 2026-10-24  
Baseline: `e72cd1c`  
Branch: `fix/lovable-dependency-removal`  
Release decision: **HOLD unconditional production approval; outstanding gates below.**

## 1. Original dependency inventory

The [pre-migration audit](./LOVABLE_DEPENDENCY_AUDIT.md) contains the baseline
filename/line inventory and classification of runtime, asset, authentication,
development and historical references.

The earlier improvement reports overstated the current blockers. Already at
baseline, all eleven image URLs were local and the unused cron authentication
module had been removed. No scheduled job or scheduler configuration was found.
The actual remaining integration was a conditional Lovable editor session-storage
broker imported by the active Supabase client. The obsolete Bun lockfile also
contained Lovable packages and private package-cache URLs.

## 2. Changes made

| File | Change |
| --- | --- |
| `src/integrations/supabase/client.ts` | Remove editor broker; use browser-local storage directly, undefined on SSR. Keep session persistence, refresh, endpoints and fetch behavior. Replace Lovable-specific setup advice. |
| `src/integrations/supabase/previewAuthStorage.ts` | Delete editor postMessage session broker. |
| `src/integrations/supabase/client.server.ts` | Replace setup advice only; retain server-only privileged-client behavior. |
| `src/routes/__root.tsx` | Correct author to TATI ChildSave; remove unsupported `@Lovable` handle. No layout change. |
| `bun.lock` | Remove obsolete graph containing Lovable packages/private registry URLs. Vercel already installs with npm. |
| `bunfig.toml` | Remove Lovable release-age exemptions; retain age guard. |
| `.env.example` | Document direct Firebase/Supabase configuration and server-only credentials. |
| `README.md` | Document npm workflow and current audit/release guidance; retain provenance. |
| `tests/lovable-exit/assets.test.ts` | Thirteen tests for local paths, MIME/signatures, sizes, unchanged hashes, distinct content and content wiring. |
| `tests/lovable-exit/supabase-storage.test.ts` | Three tests for browser storage, SSR and explicit configuration errors. |
| `tests/lovable-exit/runtime-independence.test.ts` | Two tests for runtime/install independence and absence of cron consumers/configuration. |
| `LOVABLE_DEPENDENCY_AUDIT.md` | Requested pre-migration audit. |
| `LOVABLE_EXIT_COMPLETION_REPORT.md` | This report. |

No images, UI layouts, onboarding, Firebase authentication/provisioning logic,
Firestore rules, schemas or records were changed. No packages were installed or
upgraded. Generated route-tree changes were excluded from the final content diff.
The three pre-existing untracked improvement reports were left untouched.

Intentional behavior change: embedded Lovable previews no longer share Supabase
sessions through the editor. Each browser origin uses local storage, as Vercel
already did. Existing Vercel session keys and Firebase cookies are unchanged.

## 3. Asset migration inventory

No active CDN asset remained to migrate. These eleven existing JPEGs are
byte-identical to baseline, at unchanged paths:

| Existing local URL | Bytes | Decoded dimensions | Result |
| --- | ---: | --- | --- |
| `/assets/checkin-20.jpeg` | 186180 | 1024 x 572 | Preserved, HTTP 200 |
| `/assets/checkin-21.jpeg` | 92741 | 1024 x 572 | Preserved, HTTP 200 |
| `/assets/checkin-22.jpeg` | 92609 | 1024 x 559 | Preserved, HTTP 200 |
| `/assets/journey-hero.jpeg` | 158568 | 1024 x 572 | Preserved, HTTP 200 |
| `/assets/scene-77.jpeg` | 142440 | 1024 x 572 | Preserved, HTTP 200 |
| `/assets/scene-78.jpeg` | 110617 | 1024 x 572 | Preserved, HTTP 200 |
| `/assets/scene-79.jpeg` | 115491 | 1024 x 572 | Preserved, HTTP 200 |
| `/assets/scene-83.jpeg` | 118348 | 1024 x 572 | Preserved, HTTP 200 |
| `/assets/scene-84.jpeg` | 103262 | 1024 x 559 | Preserved, HTTP 200 |
| `/assets/scene-85.jpeg` | 87922 | 1024 x 572 | Preserved, HTTP 200 |
| `/assets/tati-avatars.jpeg` | 102368 | 1024 x 572 | Preserved, HTTP 200 |

All responses were `image/jpeg`. Metadata sizes match; SHA-256 hashes are pinned
in the new tests. Built static copies match byte-for-byte. There is no duplicate
content among these eleven files. Existing archival copies in `recreated-assets/`
were not deleted or published as new duplicates.

**Original-art limitation:** historical reports identify these as TATI-supplied
recreated artwork, already integrated in commit `73c886f`. This task did not
recreate, compress, screenshot, replace or recover artwork. Original PNG sources
remain unavailable/unverified locally; their object IDs/keys remain in metadata
and historical reports. If restoring exact historical artwork is required, obtain
an authentic original export from the owner. Existing visuals remain unchanged.

## 4. Cron authentication design

**No active cron endpoint or scheduler exists in the repository.** There is no
authorization path to replace and no `CRON_SECRET` to configure for this change.
Introducing an unused handler/secret/schedule would create new behavior.
Class bookings and in-game delayed scenario events are not background jobs.

Unauthorized/missing-secret/valid-secret HTTP cases are therefore **not
applicable and were not claimed as passing**. A regression check verifies the
absence of Vercel cron configuration and executable cron secret consumers.

Do not delete an existing production secret on this report's authority. First
check Vercel Cron, external scheduler dashboards and database job registrations.
If a job is discovered outside source control, stop rollout and establish its
ownership, endpoint and authentication. A future Vercel job should use server-only
`CRON_SECRET`, return 401 for missing/invalid authorization, fail closed when
configuration is missing and run only after authorization. Verify current
Vercel plan/schedule limits before adding a job. No scheduler was added here.

## 5. Vercel environment configuration

**No new variable or changed value is required by this migration.** Verify these
existing settings are independently provisioned and retained:

| Variables | Visibility / purpose |
| --- | --- |
| `VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_AUTH_DOMAIN`, `VITE_FIREBASE_PROJECT_ID`, `VITE_FIREBASE_STORAGE_BUCKET`, `VITE_FIREBASE_MESSAGING_SENDER_ID`, `VITE_FIREBASE_APP_ID` | Public Firebase client configuration; needed at build time. Keep existing project settings. |
| `VITE_FIREBASE_MEASUREMENT_ID` | Optional existing analytics setting; not enabled/changed here. |
| `FIREBASE_PROJECT_ID` | Server identity; existing production guard expects `tatichildsavemvp`. Never switch production to `demo-tati`. |
| `FIREBASE_SERVICE_ACCOUNT` | Server-only service-account JSON in secure Vercel settings. Never use a `VITE_` variable. |
| `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY` | Public browser configuration for remaining legacy features. |
| `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY` | Existing SSR/client-fallback configuration. |
| `SUPABASE_SERVICE_ROLE_KEY` | Server-only privileged legacy Supabase access. |
| `DATABASE_URL` | Existing optional Drizzle/migration tooling, not newly required for runtime. |

No `LOVABLE_*`, `CRON_SECRET` or `TATI_CRON_SECRET` is required by executable
code. Never configure emulator variables in production. No production secret was
generated, disclosed, committed or changed.

## 6. Tests performed and actual results

### Passing checks

| Check | Actual result |
| --- | --- |
| `npm test -- tests/lovable-exit` | 3 files, **18/18 passed** |
| Scoped ESLint of changed runtime files and new tests | **0 errors, 0 warnings**, 6 files |
| `npm run build` | **Passed**, client and SSR bundles generated |
| Built JS/CSS/HTML/JSON scan for Lovable/editor/old CDN strings | **No matches** in client/server output |
| System.Drawing decoding | All eleven valid JPEGs at recorded dimensions |
| Static production asset comparison | Eleven byte-identical copies |
| Production-preview asset HTTP requests | Eleven HTTP 200 `image/jpeg` responses, correct sizes |
| Browser at actual widths 375, 768, 1440 | Eleven images decode at each width; landing images load; no landing-page horizontal overflow |
| Browser sign-in smoke checks | Child, parent, admin and facilitator forms render; no Lovable requests observed |
| Admin enrollment integration retry, `--testTimeout=15000` | **15/15 passed** on this branch |

### Full emulator run: not green

Executed the complete suite plus new tests with:

```sh
npm test -- --fileParallelism=false --reporter=default --reporter=json --outputFile=.vitest/lovable-exit-tests.json
```

Firebase Auth and Firestore ran locally for `demo-tati`, with production Admin
credentials cleared in the test process and Supabase endpoints replaced with
an unreachable loopback address. Fixture creation/cleanup affected disposable
emulator data only. No production database operation was performed.

**42 files: 36 passed, 6 failed. Collected tests: 680 passed, 1 failed,
681 total, 0 skipped.** Five files failed during collection; their uncollected
cases are not included in 681.

Relevant passing suites:

- Child authentication: 22; PIN lockout unit: 9; lockout/reset emulator: 7;
  child session authorization: 15.
- Core administrator enrollment: 17; family authorization: 14;
  parent authorization: 9; timestamp/progress normalization: 5.
- Firestore security rules: **49/49**, including parent/facilitator/admin
  restrictions, family boundaries and child access.
- Journey tests: 23; assessment authorization: 32; scenario authorization: 61;
  child progress validation: 12; scenario security: 8.
- Academy school/cohort/session/learner suites passed, including facilitator
  authorization coverage. Existing suites include unit/source-inspection tests;
  they do not prove every signed-in browser workflow.

The one collected failure was an admin integration test exceeding its default
**5000 ms** limit during initial emulator use. The same test exceeded **15000 ms**
on untouched baseline source. A focused retry of the full 15-test admin
integration file on this branch passed at 15000 ms. That is a retry result, not
a retroactive green full-suite run.

Five collection failures:

1. `tests/firebase/assessment-input-sanitization.test.ts`
2. `tests/firebase/assessment-persistence.test.ts`
3. `tests/firebase/assessment-repository.emulator.test.ts`
4. `tests/firebase/scenario-repository.emulator.test.ts`
5. `tests/firebase/scenario-workflow.integration.test.ts`

All import `@/lib/backend/firebase/repositories`, while the current module is
`repositories.server.ts`. All five errors were reproduced in an untouched
`e72cd1c` worktree. These pre-existing migration/test issues were not silently
repaired in the dependency-removal task.

### Type checking: not green

`npx --no-install tsc --noEmit --pretty false` exited 2:
**112 diagnostics here and 112 on untouched `e72cd1c`**. Normalized messages
matched after removing location differences. Examples include missing Firebase
Auth declarations, existing strict-type errors and the root error-component
signature. No new diagnostic was introduced. A successful transpiling production
build does not constitute a passing type check.

### Evidence / unexecuted checks

Raw JSON reports, lint/type output and build logs are retained in the session's
`files/` directory outside the repository. Repository-local scratch test output
was moved there. Temporary preview/emulator services were stopped after use.

Not performed: deployment, production settings inspection, external scheduler
inspection, Supabase ownership/billing verification, original-art recovery, or
signed-in browser journeys with real accounts. Browser asset decoding and
unchanged component/image files do not substitute for full authenticated
desktop/tablet/mobile visual acceptance.

## 7. Outstanding issues and remaining dependencies

1. **Confirm Supabase ownership/control.** Legacy features still call
   `ggtjulmplujaqmsppque.supabase.co`. It is not a Lovable URL, but the hostname
   does not establish who owns/bills/controls the project. If access exists only
   through Lovable Cloud, operational independence requires an owner-approved
   transfer/migration with backups and a separate plan. No data was moved.
2. **Resolve or explicitly accept baseline verification failures.** Five test
   files cannot collect; TypeScript has 112 existing diagnostics. The full suite
   is not green.
3. **Owner acceptance testing.** Verify all four roles, enrollment,
   family-child linking, SAVE progress persistence/reload and logout against an
   isolated preview backend, not destructive QA against production.
4. **External scheduling check.** Confirm no job exists outside source control.
5. **Original-art provenance.** Existing local artwork is preserved, not
   certified as the original historical PNGs.

Historical documentation, `AGENTS.md`, verification-script search literals and
`.lovable/project.json` are intentionally retained non-runtime references.
Image metadata IDs/keys are inert provenance. GitHub/editor synchronization is
not a runtime dependency and was not disabled.

## 8. Deployment instructions: explicit approval required

1. Review the audit and diff on `fix/lovable-dependency-removal`. Changes are
   saved but not committed/pushed. Keep unrelated pre-existing untracked reports
   out of a release commit unless intentionally approved.
2. Close ownership/scheduler checks and decide how baseline test/type failures
   will be addressed. Do not approve production unconditionally with unresolved
   gates.
3. After approval, commit only intended files to this branch and open a PR.
   Never commit to main or rewrite published history.
4. Use an approved preview deployment with isolated Firebase/Supabase test
   projects. Keep current npm install/build commands and Vercel adapter.
   Verify server-only secrets and public build-time `VITE_` settings.
5. Repeat tests/build and verify `/assets/*.jpeg` on Vercel: local Vite preview
   does not fully emulate Vercel's rewrite/static-file behavior.
6. Perform signed-in role/journey/visual checks, including persistence after
   refresh, logout, role restrictions and cross-family denial.
7. Only with approval, merge normally and deploy. No production variable changes
   are needed just for this cleanup.
8. Monitor authentication, provisioning, progress-save and legacy Supabase
   errors. Confirm no Lovable network traffic.

No push, merge, deployment or production configuration change was performed.

## 9. Rollback procedure

- Before merge: do not deploy the branch; existing production and data are
  untouched.
- After an approved deployment: promote the previous known-good Vercel
  deployment using the established rollback procedure; retain environment values.
- For source rollback, use a normal revert commit for the eventual cleanup
  commit/PR. Do not reset/amend/force-push published history. Restoring the broker
  and obsolete lockfile also restores their Lovable integration.
- No database migration or data rollback is needed. Do not delete accounts,
  storage objects or progress as part of rollback.

## 10. Independence evidence and merge recommendation

Executable source and production output contain no Lovable service/editor/CDN
references. npm graphs contain no Lovable package/private registry dependency.
All eleven assets are locally served and byte-preserved. No runtime cron
consumer or job exists.

**Code-level cleanup is complete within the verified repository scope. Full
operational independence remains conditional on Supabase control and external
configuration checks.**

The patch is narrow and no new behavioral test failure was identified, but it is
**not unconditionally cleared for production merge** until the baseline
verification and operator acceptance gates are addressed. Nothing was pushed,
merged or deployed.
