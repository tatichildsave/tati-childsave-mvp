# Facilitator Dashboard: Readiness Report and Plan

**Prepared:** 22 October 2026
**Scope:** The existing facilitator experience (TATI Academy, `/academy/*`), its data and permissions, and a plan for a Facilitator Dashboard V2 that matches the Admin and Parent dashboards.

---

## 1. Summary

The facilitator experience is more complete than the Admin and Parent dashboards were before their redesigns. It already has login, a dashboard, cohort management, per-learner progress pages, a step-by-step facilitator guide for all 24 SAVE activities, and a live "start and monitor a session" flow. Security rules already restrict facilitators to their assigned learners.

However, **in production it will show nothing useful today**, for two main reasons:

1. **Learners can't be assigned to facilitators.** No code anywhere creates the assignment records that facilitator access depends on, and the admin "Facilitators" menu item is still "Coming soon". Facilitator accounts can't be created from the app either.
2. **The progress numbers it shows are wrong.** They're measured against a hardcoded 14 steps (the real SAVE track has 24), dates are read incorrectly, and the "current activity" is a raw ID instead of a title.

**Recommendation:** fix these foundations first (section 6, stage A), then do the visual redesign (stages B and C) using the same shared layout as the Admin and Parent dashboards.

---

## 2. What exists today

### Routes (14)

| Route | Purpose | State |
|---|---|---|
| `/academy/login` | Facilitator sign-in (email and password, then a facilitator role check) | Works |
| `/academy/forgot-password`, `/academy/reset-password` | Password recovery | Works |
| `/academy/dashboard` | Greeting, "Today's Activity", learners needing support, learner count, average progress | Partly works (see section 4) |
| `/academy/cohorts` | Create, edit and archive cohorts; roster; class progress | Works, if learners have been assigned |
| `/academy/cohorts/$childId` | Learner detail: journey, skills, assessments, support info | Works, if assigned |
| `/academy/session` | Facilitator guide for one activity (why it matters, opening, discussion, key learning) | Works |
| `/academy/session/start` | Confirm learners and start a live session | Works |
| `/academy/session/monitor` | Live learner status (working, completed, not started) and finishing the session | Works |
| `/academy/profile` | Account settings | Works |
| `/academy/admin`, `/academy/admin/schools/*` | School administration (schools, school admins) | Works for TATI admins and school admins |

### Data layer (`src/lib/academy/`)
- **`data-access.ts`:** assigned learners, progress, skills, assessments, scenario sessions, dashboard summary and support signals.
- **`session-data.ts`:** creating sessions, attendance, notes and completion.
- **`cohort-data.ts`:** cohorts.
- **`school-data.ts`, `school-queries.ts`:** schools, school admins and school-wide views.
- **`facilitator-guide.ts`:** guide content for all 24 SAVE activities (`save-pre` … `save-post`). This content is a strong asset.
- **`hooks.ts`:** React Query hooks for all of the above.
- **Tests:** about 8 test files in `src/lib/academy/__tests__/`, including security-rule tests that need the Firebase emulator.

### UI components (`src/components/academy/`)
`AcademyShell`, `AcademyHeader` and `AcademySidebar` are the older design: emoji icons, the old SVG logo, and no navigation at all on mobile. There are also `ActivityCard`, `CohortForm`, `CohortList`, `CohortDetail`, `LearnerRoster` and `SupportSignalBadge`.

---

## 3. Security and permissions (current model)

| Area | How it works | Assessment |
|---|---|---|
| Sign-in | Client-side Firebase sign-in, then the app checks `users/{uid}.roles` includes `facilitator`; non-facilitators are signed out | OK, but **no server session cookie**, so facilitators can't use server functions |
| Route protection | Each page checks on load and redirects; **there's no `/academy` layout guard**, unlike `/admin` and `/parent` | Should add a guard |
| Learner access | `facilitatorAssignments` records (readable only by their own facilitator) **and** a `facilitatorUids` list on each child, checked by the rules | Good model, with double checks |
| Progress, assessments, skills | Rules allow reads for an assigned facilitator; writes are server-only | Good |
| Parent insights | Facilitators are denied by the rules (`parentInsights` is family and admin only) | Good |
| Academy sessions and cohorts | Facilitators own their own records; sessions can't be deleted | Good |
| Assigning learners | Rules allow **admins only** to create assignments, but **nothing in the app does it** | **Blocking gap** |
| Creating facilitator accounts | No provisioning function or admin UI | **Blocking gap** |

The Parent Dashboard redesign added no new permissions for facilitators.

---

## 4. Defects and gaps found

### Blocking
1. **No way to assign learners to facilitators.** `facilitatorAssignments` and the child's `facilitatorUids` are only ever read. The dashboard says "Contact your administrator to assign learners", but administrators have no tool to do it.
2. **No way to create facilitator accounts.** Admin enrolment only creates parents and children.

### Data correctness (wrong numbers shown to facilitators)
3. **Hardcoded total of 14 steps.** Progress, "Overall Progress" and support signals assume 14, but the SAVE track has 24. The Parent Dashboard uses the shared progress calculation (`computeProgressSnapshot`); facilitators should use it too.
4. **Dates read incorrectly.** `updatedAt` is a Firestore Timestamp, but the code does `new Date(timestamp)`, which gives an invalid date. "Last activity" and the "needs support after 2 days inactive" rule are unreliable.
5. **"Current activity" shows a raw ID** (for example `kwame-request--ch2`) instead of the activity title. It's also taken from the first incomplete record found rather than the learner's real next step.
6. **Older admin-enrolled children have no TATI ID here.** The code reads only `tati_id`; enrolments from before 22 Oct 2026 stored `tatiId`. The family-link repair adds `tati_id`, but the code should also fall back to `tatiId`.

### UX and functionality
7. **"Today's Activity" is never filled in.** There's a TODO in `loadAcademyDashboard`, so the card always says "No activity scheduled today".
8. **Dead buttons:** "Start session" and "View guide" on the dashboard do nothing.
9. **Starting a session includes every assigned learner,** not the learners in the cohort you're teaching.
10. **No mobile navigation:** the sidebar is hidden below tablet width and there's no menu.
11. **Slow dashboard:** progress is loaded one learner at a time, which gets slow for large cohorts.
12. **Header:** it uses the old SVG logo (not the original TATI logo), and logout doesn't clear cached data.

---

## 5. Data available for a Facilitator Dashboard V2

| Dashboard element | Source | Available? |
|---|---|---|
| Greeting with facilitator name | Firebase Auth `displayName` | ✅ |
| Assigned learners (count, list, avatars) | `facilitatorAssignments` + children | ✅ once assignments exist |
| Learner progress (x of 24, % complete) | `journeyProgress` + `computeProgressSnapshot` | ✅ after fix 3 |
| Current activity title per learner | Track step titles | ✅ after fix 5 |
| Learners needing support / not started / on track | Support signal (needs fixes 3 and 4) | ✅ after fixes |
| Badges per learner | Badge rules via `computeProgressSnapshot` | ✅ |
| Cohorts (count, names, learner counts) | `academyCohorts` | ✅ |
| Recent sessions (date, activity, attendance, duration) | `academySessions` | ✅ |
| Active (in-progress) session | `academySessions` with status `active` | ✅ (shown as a "Resume session" card) |
| Facilitator guide per activity | `facilitator-guide.ts` | ✅ |
| **Scheduled / upcoming classes** | Nothing stores a schedule | ❌ needs a new feature (would also fill the parents' "Next Class" card) |
| School affiliation | `schools` + `facilitatorAssignments.schoolId` | ⚠️ optional field |

---

## 6. Recommended plan

### Stage A: Foundations (do these first)
1. **Admin: create facilitator accounts.** An admin-only server function, modelled on `provisionParent`, that creates the login and a `users` record with the `facilitator` role. Its UI goes on a new admin **Facilitators** page, which would make that menu item live.
2. **Admin: assign learners to facilitators.** An admin-only server function that writes `facilitatorAssignments` **and** the child's `facilitatorUids` in a single atomic write, plus an un-assign version. UI: on the Facilitators page ("Assign learners") and on Family detail ("Assigned facilitator").
3. **Fix the facilitator data layer** (defects 3–6): use `computeProgressSnapshot`, convert Timestamps properly, read `tati_id` with a `tatiId` fallback, and load learners in parallel.
4. **Add an `/academy` layout guard** (role check on load, like `/admin`) and remove the per-page redirect code.
5. **Optional:** create the same server session cookie at facilitator login. That lets facilitators use server functions later (for example faster server-side summaries).

### Stage B: Facilitator Dashboard V2 (visual)
Built on the **shared workspace layout** (`WorkspaceShell`, the same sidebar and top bar as Admin and Parent, with role label "Facilitator"), the TATI palette and the original logo:
- **Sidebar:** Dashboard, My Learners, Cohorts, Sessions, Facilitator Guide, Profile, with honest "Coming soon" items only where nothing exists.
- **Welcome hero:** time-of-day greeting and a short line about today.
- **Stat tiles:** Assigned learners · Active cohorts · Need support · Sessions this week.
- **Session card:** "Resume active session" if one is running; otherwise "Start a session", which picks a cohort and an activity, then opens the guide. No made-up "today's activity".
- **Learners needing support:** list with avatar, progress, current activity title and last active date, linking to the learner detail page.
- **Cohorts overview:** each cohort's name, learner count and average progress.
- **Recent sessions:** last 5 sessions with activity, date, attendance and duration.
- **Quick links:** Facilitator Guide, Start Session, My Cohorts.
- **Responsive:** full sidebar on desktop, slide-out menu on tablet and mobile, and the same breakpoints as the Parent Dashboard.

### Stage C: Restyle the remaining Academy pages
Move Cohorts, Learner detail, Session guide, Start and Monitor onto the new layout and card styles. Also make "Start session" use the selected cohort's learners (defect 9).

### Possible later feature: class scheduling
Let facilitators (or admins) schedule a session for a cohort with date, time and location. That would fill the facilitator's "Upcoming sessions" **and** the parent's "Next Class / Academy" card, which currently shows an honest empty state. It needs a new collection and new rules, so it's a separate decision.

---

## 7. Decisions needed from you

1. **Design reference:** please share an approved Facilitator Dashboard design image (as you did for the Parent Dashboard). Without one, I'll follow the stage B layout in the Admin/Parent visual style.
2. **Assignment model:** should admins assign facilitators **per child**, **per family**, or **per school or cohort**? (The data model supports per child; the others can be built on top.)
3. **Who can assign:** TATI admins only, or school admins too (for their own school)?
4. **Scheduling:** include the class-scheduling feature now, or later?
5. **Facilitator server session:** OK to add one at login (stage A5)?

---

## 8. Testing approach
- Unit tests for the fixed progress and support-signal logic (24 steps, Timestamp handling, title lookup).
- Run the existing Academy tests in `src/lib/academy/__tests__/`. The rule tests need the Firebase emulator.
- New rule and server-function tests: only admins can assign or create facilitators; a facilitator can't read an unassigned learner or `parentInsights`.
- Manual checks: an admin creates a facilitator and assigns learners → the facilitator signs in → sees the right learners and progress → starts and finishes a session.
- Responsive checks at 390, 768, 1024 and 1440px.
