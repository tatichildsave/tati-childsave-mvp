# Lovable dependency audit

Date: 2026-10-24. Baseline: `e72cd1c`. Branch: `fix/lovable-dependency-removal`.
This audit was completed before migration edits. Line numbers below refer to
the baseline, not the subsequently edited files.

## Scope and findings

Inspected application source, public assets, API adapters, Firebase Functions
source and tracked compiled output, Supabase/Drizzle configuration and migrations,
scripts, package manifests/lockfiles, Vite, Vercel, Firebase configuration,
environment documentation, hidden project metadata, historical reports and git
history. Generated build/cache output and installed third-party packages are not
authoritative source; production output will be rebuilt and scanned separately.
Local environment files were inspected for relevant key names and service
hostnames only; no secret values are reproduced here.

The previous improvement summary was inaccurate about the current state:

- All eleven asset URLs already point to tracked local JPEGs.
- The cron authentication module is absent, with no caller or job to migrate.
- No Vercel Cron, Firebase scheduled function, SQL cron registration, cron API
  route, GitHub Actions workflow or external scheduler configuration exists in
  the repository. A deployed scheduler outside the repository cannot be
  established by local inspection.
- A Supabase preview authentication broker remains wired into the client.
- An obsolete Bun lockfile still includes Lovable packages and private cache URLs.

## Runtime/configuration inventory and replacements

| File and baseline lines | Classification | Finding / intended treatment |
| --- | --- | --- |
| `src/integrations/supabase/previewAuthStorage.ts:3,9-11,27,29,31-32,40-42,82,85,101,105` | Active runtime / authentication dependency, conditional on editor hostname + iframe | Sends session storage messages to a Lovable editor. Imported by the active client. Replace with the same browser-local storage already used outside the editor; remove broker module. Keep SSR storage undefined. |
| `src/integrations/supabase/client.ts:4,45,55` | Authentication/configuration dependency | Broker import/storage hook; missing-configuration advice incorrectly requires Lovable Cloud. Preserve Supabase configuration, fetch headers, session persistence and refresh; remove only editor integration/advice. |
| `src/integrations/supabase/client.server.ts:44` | Configuration guidance, not an external call | Replace Lovable-specific setup advice; do not change privileged-client behavior. |
| `src/routes/__root.tsx:79,84` | Runtime metadata, not a service dependency | Lovable author and Twitter attribution. Use TATI author; remove unsupported Twitter handle. No layout change. |
| `bun.lock:9,65,133` | Development/install dependency | Obsolete Lovable packages inconsistent with current npm manifest. Remove obsolete lockfile; npm remains authoritative. |
| `bun.lock` other matching lines (appendix) | Development/install dependency | Package tarballs resolve through `europe-west1-npm.pkg.dev/lovable-core-prod/sandbox-npm-cache`. Vercel already explicitly uses npm; do not regenerate a second dependency graph. |
| `bunfig.toml:7` | Development-only dependency | Lovable packages exempted from release-age checks. Remove exemptions, preserve guard. |
| `.lovable/project.json:1-5` | Development-only metadata | Template revision only; no URL, token, execution hook or runtime import. Retain. |
| `AGENTS.md:1,4,6,9,12` | Development-only instructions | Git history/sync warning, not execution. Retain. |
| `README.md:5,7,9,11-13` | Developer documentation | Prior Lovable workflow. Update current npm/Vercel guidance while retaining provenance. |
| `verify-lovable-forensic.ps1:1,5-9,14,36,38,44,46` | Development-only historical verification script | Search literals and a now-outdated broker exception, not a runtime call. Retain as historical tooling; new automated tests are the current gate. |
| `verify-asset-json.ps1:49-51` | Development-only verification | Detects forbidden asset references; no service dependency. Retain. |
| `lint-output.json` | Historical generated diagnostic snapshot | Contains old code/messages and paths; not a runtime module. Retain. |
| `package.json`, `package-lock.json`, `functions/package.json`, `functions/package-lock.json` | Verified package configuration | No Lovable packages or registry references. No dependency upgrade needed. |
| `vercel.json:2-17`, `api/index.ts`, `api/[...slug].ts`, `src/server.ts`, `vite.config.ts` | Verified deployment/runtime | npm build/install, local static output and TanStack server adapter. No Lovable middleware or cron schedule. Preserve. |
| `drizzle.config.ts:9` | Independent database configuration | Uses `DATABASE_URL`, not `LOVABLE_DB_MIGRATION_URL`. Preserve. |
| `.env.example:1-16` | Environment documentation | Firebase and optional legacy Supabase variables; no Lovable/cron key. Clarify standalone configuration. |

## Eleven-asset inventory

Each `src/assets/<name>.png.asset.json:5` already resolves to
`/assets/<name>.jpeg` in `public/assets/`. Metadata lines 3-4 and 6-8 retain
original IDs, object keys and names for provenance, not remote retrieval.
Consumers read `.url`; there is no asset resolver that uses those IDs.

All eleven files decoded successfully using System.Drawing; their MIME signature
is JPEG and their sizes match metadata. SHA-256 values were recorded before
changes for regression checks. No new artwork or duplicate files are needed.

| Name | Bytes | Dimensions | Current usage / source imports |
| --- | ---: | --- | --- |
| checkin-20 | 186180 | 1024 x 572 | Assessment intro and SAVE lessons: `src/content/assessments/save-junior.ts:2`, `src/content/lessons/save.ts:2` |
| checkin-21 | 92741 | 1024 x 572 | Assessment questions and SAVE lessons: same files, line 3 |
| checkin-22 | 92609 | 1024 x 559 | Assessment outro and SAVE lessons: same files, line 4 |
| journey-hero | 158568 | 1024 x 572 | Parent-authenticated child journey: `src/routes/_authenticated/learn.$childId.index.tsx:13,104` |
| scene-77 | 142440 | 1024 x 572 | SAVE scenario: `src/content/scenarios/school-reopening.ts:5` |
| scene-78 | 110617 | 1024 x 572 | SAVE scenario: same file, line 6 |
| scene-79 | 115491 | 1024 x 572 | SAVE scenario: same file, line 7 |
| scene-83 | 118348 | 1024 x 572 | SAVE scenario intro/nodes: same file, line 2 |
| scene-84 | 103262 | 1024 x 559 | SAVE scenario nodes: same file, line 3 |
| scene-85 | 87922 | 1024 x 572 | SAVE scenario nodes: same file, line 4 |
| tati-avatars | 102368 | 1024 x 572 | Shared avatar component: `src/components/tati/Avatar.tsx:2,87,107` |

**Original-source limitation:** commit `73c886f` already integrated these JPEGs.
`TATI_RECREATED_ASSET_INTEGRATION_REPORT.md:11-17,31-41` identifies them as
TATI-supplied recreated artwork. `H5.2_LOVABLE_EXIT_FORENSIC_GATE.md:128-150`
records failed recovery of the original CDN artwork. The original PNGs cannot
be authenticated/recovered from the current local files; historical URLs and IDs
remain in `H5.2_LOVABLE_EXIT_FINAL_VERIFICATION.md:50-60` and asset metadata.
Existing JPEGs are not represented as originals. Preserve them byte-for-byte
and preserve rendering/alt text/responsiveness. Original artwork recovery, if
required, needs an owner-supplied original export, not screenshots or regeneration.

## Scheduling and authorization decision

There is **no active scheduled job** to authorize. Neither `CRON_SECRET` nor
`TATI_CRON_SECRET` should be introduced as a guessed replacement.
`LOVABLE_CRON_SECRET` and `LOVABLE_CRON_SECRET_PREVIOUS` occur in historical
documentation/verification search terms, not executable job code.
`functions/src/index.ts` exports account/role management functions only.
`/academy/schedule` represents class bookings; scenario `schedule` values are
in-game delayed events, not external background execution.

No production scheduling/authentication configuration changes are necessary for
these edits. Missing-secret/invalid-secret/valid-secret HTTP tests are not
applicable without an endpoint. Add regression checks that no cron configuration
or secret consumer exists. If an operator identifies an out-of-repository job,
stop and establish its endpoint, owner and authentication before deployment.
For a future Vercel job: use server-only `CRON_SECRET`, fail closed with HTTP 401,
validate authorization before any work and verify the current plan's schedule
and invocation limits. No new schedule is proposed here.

## Other services / hidden-dependency boundary

Firebase authentication and Firestore code does not call Lovable. Google Fonts
and Firebase/Google infrastructure are independent non-Lovable external services.
Legacy Supabase clients remain in analytics, feedback, onboarding, achievements,
assessment attempts, learning progress and server identity/role helpers.
Configured Supabase URLs use `ggtjulmplujaqmsppque.supabase.co`, not a Lovable URL.
**Project ownership/billing/export control cannot be proved from the hostname.**
The owner must confirm this Supabase project's continued independent availability.
Do not delete clients or migrate data on the assumption that all routes use
Firebase. Doing so would exceed this task and risk existing records/workflows.

Local ignored environment files contained no Lovable/cron key names. Actual
Vercel settings, external scheduler dashboards and Supabase ownership were not
accessed or changed. This audit does not certify those uninspected systems.

## Historical-document reference inventory

All entries below are classified **historical documentation**, except the
developer instructions/README classified above. They are retained, even where
their conclusions contradict current source. The three prior improvement
documents were already untracked at task start and are not this task's edits.
No matching references were found in the two tracked `docs/` documents.

| File | Matching baseline lines |
| --- | --- |
| `DEV_SERVER_FIX_SUMMARY.md` | 18,105 |
| `FIREBASE_AUTH_MIGRATION_COMPLETION_REPORT.md` | 34,40,115,128,311,325,326,331,333,543 |
| `FIREBASE_AUTH_MIGRATION_FINAL_COMPREHENSIVE_VERIFICATION.md` | 243,255,258,261,263 |
| `FIREBASE_AUTH_MIGRATION_VERIFICATION_GATE_REPORT.md` | 514,517,659 |
| `H5.2_AND_LOVABLE_EXIT_PHASE_0_AUDIT_REPORT.md` | 1,14,129,135,136,137,143,151,155,159,165,166,168,170,195,200,207,216,221,224,233,241,255,259,261,262,270,276,282,283,289,295,296,297,298,304,362,366,367,374,380,386,403,418,420,421,430,434,449,451,452,453,454,481,512,526,527,528,529,530,531,532,533,534,535,536,537,538,570,571,572,573,574 |
| `H5.2_BLOCKER_RESOLUTION_REPORT.md` | 1,4,5,13,14,16,20,24,25,56,61,73,74,81,82,83,84,85,86,87,88,89,90,91,100,101,102,117,124,138,150,154,156,162,210,217,222,225,229,233,234,240,254,268,269,273,306,309,312,317,343,344,364,368,369,370,374,375,376,377,381,389,405,407,408,409,410,428,430,434,435,441,446,450,451,458,460 |
| `H5.2_FINAL_ASSET_VISUAL_QA_REPORT.md` | 4,28,85,302,304,308,309,310,311,312,318,321,322,323,324,338,339,340,341,343,486,497,523 |
| `H5.2_LOVABLE_EXIT_FINAL_VERIFICATION.md` | 1,3,4,12,14,15,17,23,33,34,39,40,41,47,48,50,51,52,53,54,55,56,57,58,59,60,67,78,79,80,81,87,88,90,95,104,112,117,131,134,148,155,246,252,258,262,280,299,325,338,344,348,350,362,367,375,376,377,378,379,380,381,382,383,384,385,401,415,434,448,449,458,459,467,469,471,478,499,507,509,513,514,515,520,521,522,523,538,552,556,563,577,594,605,612,613,614,618,627,633,635,637,643,645,652,656,664,669,674,719,724 |
| `H5.2_LOVABLE_EXIT_FORENSIC_GATE.md` | 1,5,57,140,146,150,219,228,233,248,249,250,251,252,254,307,308,310,312,316,329,353,369,383,387,399,424,428,464,474,476,477,493,499,503,515 |
| `IMPROVEMENTS_ANALYSIS_2026_10.md` | 14,24,30,33,42,43,44,45,46,47,48,49,50,51,52,63,64,89,98,103,104,110,113,123,133,139,510,583,584,603,606,607,609,615 |
| `IMPROVEMENTS_PRIORITY_MATRIX.md` | 48,51,53,61,69,79,101,102,115,124,125,160,161,163,197,212,213,218 |
| `PHASE_6_RECOVERY_PLAN.md` | 448 |
| `PHASE_7C4C_GATE_B_COMPLETION_REPORT.md` | 346 |
| `PHASE_A_PARENT_SIGNUP_AUDIT.md` | 721 |
| `PHASE_G6_PILOT_READINESS_AUDIT.md` | 1112,1122,1190,1191 |
| `PHASE_H0_2_TATI_MVP_PRODUCT_BLUEPRINT.md` | 1522 |
| `PHASE_H0_DESIGN_RECOVERY_AUDIT.md` | 1221 |
| `PHASE_H1_0_TATI_DESIGN_SYSTEM_SPEC.md` | 1907,1911 |
| `PHASE_H3_2_3_LEARNER_DETAIL_COMPLETION_REPORT.md` | 510 |
| `PILOT_READINESS_AUDIT_2026_10.md` | 532 |
| `TATI_AUTHENTICATION_ARCHITECTURE_AUDIT.md` | 48 |
| `TATI_FIREBASE_AUTH_MIGRATION_AUDIT.md` | 45,72,73,653,717,722,745,859,860,1062 |
| `TATI_PILOT_FINAL_RELEASE_GATE.md` | 180 |
| `TATI_PROCESS_INTEGRITY_AUDIT.md` | 693 |
| `TATI_RECREATED_ASSET_INTEGRATION_REPORT.md` | 5,15,17,31,32,33,34,35,36,37,38,39,40,41,116,138,142,143,206,216,257 |
| `WHAT_LEFT_TO_IMPROVE_SUMMARY.md` | 6,12,14,15,16,18,22,23,24,26,86,140,142,144 |

### Bun lockfile remaining matching lines

Development/install references, all removed with the obsolete file:
141,143,145,147,149,151,153,155,157,159,161,163,165,167,169,171,173,175,177,
179,181,183,185,187,189,191,193,195,245,247,443,445,447,449,451,453,455,
623,699,701,715,777,797,921,965,991,1017,1073,1123,1125,1127,1129,1131,
1133,1135,1137,1139,1141,1143,1145,1147,1149,1151,1153,1155,1157,1159,
1161,1163,1165,1167,1169,1195,1197,1199,1201,1203,1205,1207,1209,1211,
1213,1215,1217,1219,1221,1223,1225,1227,1229,1231,1233,1235,1237,1239,
1241,1243,1245.

## Safe implementation boundary

Remove only the broker, stale install references and misleading setup metadata.
Add tests for storage behavior, local assets and absence of runtime dependencies
or cron consumers. Preserve images, UI, Firebase/Supabase records, schemas,
authentication/authorization and deployment adapters. Run emulator-backed tests
only against local demo data, with production credentials removed from the test
process environment. Record real outcomes, including baseline failures and
manual checks not executed, in the completion report.
