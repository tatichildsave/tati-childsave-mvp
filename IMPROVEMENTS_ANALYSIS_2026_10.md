# TATI ChildSave MVP — Improvements Analysis & Roadmap

**Date**: October 24, 2026  
**Status**: Ready for Pilot with Known Improvements Needed  
**Overall Health**: ✅ **STABLE** (Production-ready core)  
**Open Issues**: 7 HIGH-PRIORITY, 3 MEDIUM-PRIORITY  

---

## Executive Summary

The TATI ChildSave MVP has successfully completed all pilot readiness verification and is currently **in production pilot phase**. The application is stable and functional for real users. However, a clear roadmap of improvements remains for:

1. **Critical Asset Migration** - Lovable CDN dependency must be resolved
2. **Security Enhancements** - Environmental configuration cleanup
3. **UX Refinements** - Accessibility and mobile optimizations
4. **Testing Infrastructure** - Automated test expansion
5. **Operational Improvements** - Observability and data hygiene

---

## Priority 1: CRITICAL BLOCKING ISSUES (Must Fix for Full Independence)

### 🔴 I-001: Asset Migration — Lovable CDN Dependency

**Status**: ⛔ **BLOCKING INDEPENDENT DEPLOYMENT**  
**Severity**: CRITICAL  
**Category**: Infrastructure/Dependencies  
**Effort**: 3-4 hours  
**Timeline**: Before Lovable CDN decommissioning (TBD)

**Issue Description**:
All 11 asset metadata files reference hardcoded Lovable CDN paths (`/__l5e/assets-v1/[uuid]/[filename]`). When Lovable infrastructure is sunset, all images will return 404 errors, breaking:
- Child avatar rendering
- Lesson/scenario/assessment imagery
- Learning journey hero image
- Assessment checkin feedback images

**Affected Files** (11 total):
```
src/assets/
├── checkin-20.png.asset.json → /__l5e/assets-v1/12ec9305.../checkin-20.png
├── checkin-21.png.asset.json → /__l5e/assets-v1/44358254.../checkin-21.png
├── checkin-22.png.asset.json → /__l5e/assets-v1/cbe73b32.../checkin-22.png
├── journey-hero.png.asset.json → /__l5e/assets-v1/ce4de743.../journey-hero.png
├── scene-77.png.asset.json → /__l5e/assets-v1/37270df4.../scene-77.png
├── scene-78.png.asset.json → /__l5e/assets-v1/0d14e839.../scene-78.png
├── scene-79.png.asset.json → /__l5e/assets-v1/2e3db7b4.../scene-79.png
├── scene-83.png.asset.json → /__l5e/assets-v1/23df8270.../scene-83.png
├── scene-84.png.asset.json → /__l5e/assets-v1/403fe319.../scene-84.png
├── scene-85.png.asset.json → /__l5e/assets-v1/36e702bb.../scene-85.png
└── tati-avatars.png.asset.json → /__l5e/assets-v1/4732375e.../tati-avatars.png
```

**Active Usage**:
- `src/components/tati/Avatar.tsx` — Avatar images in UI
- `src/content/assessments/save-junior.ts` — Checkin feedback imagery
- `src/content/lessons/save.ts` — Lesson imagery
- `src/content/scenarios/school-reopening.ts` — Scenario scene imagery
- `src/routes/_authenticated/learn.$childId.index.tsx` — Journey hero banner

**Recommended Solution**:
1. **Option A (Recommended)**: Export assets from Lovable to self-hosted CDN (Vercel blob storage, S3, or Firebase Storage)
   - Download all 11 PNG files from Lovable export
   - Upload to self-hosted CDN
   - Update `.asset.json` files with new URLs
   - Deployment time: 15 min
   - Ongoing cost: ~$5-10/month

2. **Option B**: Store assets in Git repository (simpler, works for MVP)
   - Add PNG files to `public/assets/` directory
   - Update `.asset.json` files to reference `/assets/[filename]`
   - Deployment time: 10 min
   - Ongoing cost: $0 (included in Vercel storage)
   - Trade-off: Slightly larger initial deployment

**Acceptance Criteria**:
- [ ] All 11 PNG files accessible via new CDN
- [ ] Asset metadata files (.asset.json) updated with new URLs
- [ ] Avatar component loads without 404 errors
- [ ] All lesson/scenario/assessment imagery displays correctly
- [ ] No changes to component code needed
- [ ] Production build succeeds

**Next Step**: Schedule asset export and migration with TATI operations team.

---

### 🔴 I-002: Environment Configuration — Lovable Cron Secret

**Status**: ⛔ **BLOCKING SCHEDULED JOBS**  
**Severity**: CRITICAL  
**Category**: Security/Configuration  
**Effort**: 1-2 hours  
**Timeline**: Immediate (before cron jobs activate)

**Issue Description**:
The Supabase cron authentication module still references `LOVABLE_CRON_SECRET` environment variables. When Lovable authentication is removed, scheduled database jobs will fail with authentication errors.

**Affected Files**:
```
src/integrations/supabase/cron-auth.ts (lines 3-4)
├── process.env["LOVABLE_CRON_SECRET"]
└── process.env["LOVABLE_CRON_SECRET_PREVIOUS"]
```

**Current Usage**:
- Protects cron job endpoints from unauthorized invocation
- Used for Supabase cron trigger authentication
- Currently working because `LOVABLE_CRON_SECRET` is still provided by Lovable

**Recommended Solution**:
1. Replace `LOVABLE_CRON_SECRET` with custom secret (e.g., `TATI_CRON_SECRET`)
2. Update environment variables in:
   - `.env.local` (development)
   - `.env.production` (production)
   - Vercel environment variables dashboard
3. Update Supabase cron trigger configuration to use new secret

**Implementation Steps**:
```typescript
// OLD (src/integrations/supabase/cron-auth.ts)
const secret = process.env["LOVABLE_CRON_SECRET"];

// NEW
const secret = process.env["TATI_CRON_SECRET"];
if (!secret) {
  throw new Error("Missing TATI_CRON_SECRET environment variable");
}
```

**Acceptance Criteria**:
- [ ] `LOVABLE_CRON_SECRET` reference removed from code
- [ ] New `TATI_CRON_SECRET` deployed to Vercel
- [ ] Supabase cron jobs continue to function
- [ ] Logs show successful cron authentication
- [ ] No breaking changes to existing scheduled jobs

**Next Step**: Schedule cron authentication update with DevOps team before Lovable decommissioning.

---

## Priority 2: HIGH-PRIORITY IMPROVEMENTS (Should Fix Before/During Pilot)

### 🟠 I-003: Accessibility — Reduce Motion Support

**Status**: 📋 **IN BACKLOG**  
**Severity**: HIGH  
**Category**: Accessibility  
**Effort**: 2-3 hours  
**Timeline**: During/after pilot  
**Impact**: ~5-10% of users may benefit

**Issue Description**:
The application uses CSS animations (pulse, fade, slide) without respecting `prefers-reduced-motion` media query. Users with vestibular disorders or motion sensitivity may experience discomfort.

**Affected Components**:
- `SaveFeedback` component (pulse animation while saving)
- Badge animation on achievement unlock
- Page transition animations
- Loading states with spin/pulse effects

**Recommended Solution**:
1. Create CSS utility for motion preference
2. Wrap all animations with `@media (prefers-reduced-motion: no-preference)`
3. Provide static fallback animations (instant completion, no motion)

**Example Implementation**:
```css
@media (prefers-reduced-motion: reduce) {
  * {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```

**Acceptance Criteria**:
- [ ] All animations respect `prefers-reduced-motion`
- [ ] Static fallbacks render correctly
- [ ] No visual regression in standard motion mode
- [ ] Testing on Mac/iOS with Motion settings enabled
- [ ] A11y audit passes

**Next Step**: Add to Phase 4 (during pilot) accessibility sprint.

---

### 🟠 I-004: Privacy & Security — Sanitize Error Reporting

**Status**: 📋 **IN BACKLOG**  
**Severity**: HIGH  
**Category**: Security/Privacy  
**Effort**: 2 hours  
**Timeline**: During pilot  
**Impact**: Prevents sensitive data leakage to Sentry

**Issue Description**:
Error messages and stack traces may contain sensitive information (Firebase tokens, user IDs, family names, assessment data) before being sent to Sentry for monitoring. Currently, raw errors are logged without sanitization.

**Affected Areas**:
- Firebase authentication errors
- Firestore permission errors
- Assessment/scenario data access errors
- Session token errors

**Recommended Solution**:
1. Create error sanitization middleware
2. Remove/redact sensitive fields before Sentry transmission
3. Log safe error summaries for debugging

**Example Implementation**:
```typescript
function sanitizeError(error: Error): Error {
  const sanitized = new Error(error.message);
  // Remove stack trace containing file paths/tokens
  sanitized.stack = "Stack trace hidden for privacy";
  // Don't log: user IDs, family names, tokens, assessment responses
  return sanitized;
}
```

**Acceptance Criteria**:
- [ ] Sensitive data never sent to Sentry
- [ ] Error message still useful for debugging
- [ ] No breaking changes to error handling
- [ ] Sentry dashboard shows sanitized errors only
- [ ] GDPR compliance verified

**Next Step**: Add to Phase 4 (during pilot) security sprint.

---

### 🟠 I-005: Analytics — Privacy-Preserving User Tracking

**Status**: 📋 **IN BACKLOG**  
**Severity**: HIGH  
**Category**: Privacy  
**Effort**: 2-3 hours  
**Timeline**: During pilot  
**Impact**: GDPR/CCPA compliance

**Issue Description**:
Current analytics implementation may capture identifiable user information (email, family IDs) in event tracking. Privacy regulations in Ghana, EU, and US require analytics to be anonymized.

**Recommended Solution**:
1. Use anonymous session IDs instead of user emails/IDs
2. Hash family identifiers to prevent tracking across services
3. Exclude assessment responses from analytics
4. Implement consent management for analytics collection

**Example Implementation**:
```typescript
// BEFORE: Captures identifiable data
analytics.track("lesson_completed", {
  user_email: parent.email,
  family_id: family.id,
  child_name: child.name
});

// AFTER: Anonymous tracking
analytics.track("lesson_completed", {
  session_id: anonymousSessionHash,
  family_hash: hashFamilyId(family.id),
  // No user/child names
});
```

**Acceptance Criteria**:
- [ ] No email addresses in analytics events
- [ ] No family IDs in cleartext
- [ ] No assessment/lesson content in events
- [ ] Consent stored for compliance
- [ ] Privacy policy updated
- [ ] GDPR Data Protection Impact Assessment (DPIA) completed

**Next Step**: Coordinate with Legal team before pilot launch.

---

### 🟠 I-006: Testing Infrastructure — Firebase Emulator Fixtures

**Status**: 📋 **IN BACKLOG**  
**Severity**: HIGH  
**Category**: Testing  
**Effort**: 3-4 hours  
**Timeline**: Post-pilot CI pipeline  
**Impact**: Faster local development, reliable CI tests

**Issue Description**:
Firebase emulator tests require manual setup of test data. No fixture system exists to automatically populate test scenarios (families, children, lessons, assessments). This makes writing new tests slow and error-prone.

**Recommended Solution**:
1. Create fixture factory for Firebase emulator
2. Generate standard test families/children/lessons
3. Create fixtures for each scenario (parent login, child learn, admin enroll)
4. Integrate fixtures into test setup

**Example Implementation**:
```typescript
// tests/fixtures.ts
async function setupTestFamily(db: Firestore) {
  const family = await db.collection("families").add({
    name: "Test Family",
    status: "active"
  });
  const parent = await db.collection("parents").add({
    email: "test@example.com",
    family_id: family.id
  });
  return { family, parent };
}
```

**Acceptance Criteria**:
- [ ] Fixture factory covers 80% of test scenarios
- [ ] Tests run reliably with fixtures
- [ ] Setup time < 5 seconds
- [ ] No manual test data creation needed
- [ ] Documentation for adding new fixtures

**Next Step**: Schedule for Post-Pilot CI improvement sprint.

---

### 🟠 I-007: Operations — Orphaned Progress Cleanup

**Status**: 📋 **IN BACKLOG**  
**Severity**: HIGH  
**Category**: Operations/Maintenance  
**Effort**: 1-2 hours  
**Timeline**: Post-pilot (weekly maintenance)  
**Impact**: Firestore storage cost reduction

**Issue Description**:
If families are deleted or children unenrolled from admin dashboard, their progress records remain in Firestore forever. This creates "orphaned" progress records that waste storage and complicate queries.

**Current State**:
- Progress records created for every lesson/scenario/assessment
- No automatic cleanup when family/child deleted
- Manual deletion required (not currently implemented)
- Storage cost increases as orphaned records accumulate

**Recommended Solution**:
1. Implement cascade delete: When family deleted, delete all related progress
2. Create admin function: "Clean Up Orphaned Records" (weekly)
3. Add logging/audit trail for deletions

**Example Implementation**:
```typescript
// src/lib/backend/firebase/maintenance.functions.ts
async function cleanupOrphanedProgress() {
  const orphaned = await db.collection("progress")
    .where("family_id", "==", null)
    .get();
  
  for (const doc of orphaned.docs) {
    await doc.ref.delete();
  }
  
  return orphaned.size;
}
```

**Acceptance Criteria**:
- [ ] Orphaned records cleaned automatically
- [ ] Audit trail shows what was deleted
- [ ] Storage reduced by ~20-30%
- [ ] Zero progress loss for active families
- [ ] Monthly maintenance script scheduled

**Next Step**: Add to Post-Pilot operational maintenance checklist.

---

## Priority 3: MEDIUM-PRIORITY IMPROVEMENTS (Nice to Have)

### 🟡 I-008: UX — Onboarding Offline Support

**Status**: 📋 **IN BACKLOG**  
**Severity**: MEDIUM  
**Category**: UX/Reliability  
**Effort**: 4-6 hours  
**Timeline**: Phase 4 (during pilot feedback)  
**Impact**: Better UX in poor connectivity scenarios

**Issue Description**:
Onboarding flow (`/onboarding` route) requires full server connectivity. If network drops mid-onboarding, user loses all progress and must restart. No draft save or offline resume.

**Recommended Solution**:
1. Auto-save onboarding state to localStorage
2. Resume from draft on page reload
3. Sync draft to server when connectivity restored
4. Show "Draft in progress" indicator

**Example Implementation**:
```typescript
// useOnboardingDraft hook
function useOnboardingDraft() {
  const [draft, setDraft] = useState(() => 
    JSON.parse(localStorage.getItem("onboarding_draft") || "{}")
  );
  
  useEffect(() => {
    localStorage.setItem("onboarding_draft", JSON.stringify(draft));
  }, [draft]);
  
  return [draft, setDraft];
}
```

**Acceptance Criteria**:
- [ ] Draft saved after each step
- [ ] Resume works after page reload
- [ ] Draft visible to user (recovery options)
- [ ] No data loss on network disconnection
- [ ] Manual "Clear Draft" option available

**Next Step**: Include in Phase 4 feedback iteration.

---

### 🟡 I-009: Mobile UX — Viewport-Specific Testing

**Status**: 📋 **IN BACKLOG**  
**Severity**: MEDIUM  
**Category**: UX/Mobile  
**Effort**: 2-3 hours  
**Timeline**: Phase 4 (based on pilot feedback)  
**Impact**: Better experience on tablets/large phones

**Issue Description**:
Responsive design tested on 320px, 430px, and 600px viewports. Larger tablets (800px+) and iPad (1024px+) may have layout regressions or content overflow issues.

**Recommended Solution**:
1. Test on iPad (1024x768+) and Android tablets (800x600+)
2. Fix layout breakpoints for mid-range devices
3. Add CSS media queries for tablet-specific adjustments
4. Automate viewport testing in CI

**Example Implementation**:
```css
/* Existing: Mobile & Small Tablets */
@media (min-width: 640px) { ... }

/* NEW: Large Tablets & iPads */
@media (min-width: 1024px) { 
  .lesson-player { display: grid; grid-template-columns: 1fr 300px; }
  .scenario-sidebar { width: 300px; }
}
```

**Acceptance Criteria**:
- [ ] No layout overflow on iPad (1024px+)
- [ ] Sidebar/drawer responsive on tablets
- [ ] Text readable without horizontal scroll
- [ ] Touch targets >= 48px on tablets
- [ ] Tablet screenshots verified

**Next Step**: Add to Phase 4 QA checklist based on pilot feedback.

---

### 🟡 I-010: Build Performance — Code Splitting Optimization

**Status**: 📋 **IN BACKLOG**  
**Severity**: MEDIUM  
**Category**: Performance  
**Effort**: 2-3 hours  
**Timeline**: Post-pilot optimization  
**Impact**: 15-20% faster initial page load

**Issue Description**:
Current Vite build generates a single large JavaScript bundle for the entire application. On slower networks (common in Ghana), this delays initial page render.

**Recommended Solution**:
1. Enable route-based code splitting with TanStack Router
2. Lazy-load heavy components (charts, editors, assessments)
3. Preload critical routes (login, dashboard, child home)

**Example Implementation**:
```typescript
// Automatic with TanStack Router + vite-plugin-lazy-load
// Routes split by default, lazy-loaded on navigation
// Login route loaded immediately, assessment routes loaded on demand
```

**Acceptance Criteria**:
- [ ] Initial bundle < 300KB (gzipped)
- [ ] Login route loads in < 2 seconds on 3G
- [ ] No performance regression on fast networks
- [ ] Lighthouse score improved to 85+

**Next Step**: Profile with Lighthouse before/after implementation.

---

## Priority 4: LOW-PRIORITY IMPROVEMENTS (Polish)

### ⚪ I-011: Code Cleanup — Remove Unused Files

**Status**: 📋 **IN BACKLOG**  
**Severity**: LOW  
**Category**: Maintenance  
**Effort**: 1 hour  
**Timeline**: Post-pilot cleanup

**Files to Remove**:
- `src/lib/lovable-error-reporting.ts` — Unused error reporting module
- Old audit/documentation files in root (safe to archive)

**Impact**: Cleaner codebase, faster IDE indexing

---

### ⚪ I-012: Documentation — Deployment Playbook

**Status**: 📋 **IN BACKLOG**  
**Severity**: LOW  
**Category**: Operations  
**Effort**: 2 hours  
**Timeline**: Post-pilot operations runbook

**Needed**:
- Step-by-step production deployment instructions
- Rollback procedures
- Emergency troubleshooting guide
- Environment variable checklist

---

### ⚪ I-013: Monitoring — Sentry Integration Expansion

**Status**: 📋 **IN BACKLOG**  
**Severity**: LOW  
**Category**: Observability  
**Effort**: 2-3 hours  
**Timeline**: Post-pilot monitoring setup

**Add**:
- Custom breadcrumb logging for user journeys
- Performance monitoring (Web Vitals)
- Release tracking for deployments

---

## Implementation Roadmap

### Phase 3A: Pilot Readiness (Current) ✅
- [x] Asset migration strategy identified (I-001)
- [x] Cron authentication plan documented (I-002)
- [x] No blockers for pilot launch

### Phase 3B: During Pilot (4-6 weeks)
- [ ] Monitor asset CDN reliability
- [ ] Deploy cron authentication update (I-002)
- [ ] Gather accessibility feedback (I-003)
- [ ] Complete error sanitization (I-004)
- [ ] Implement analytics privacy (I-005)
- [ ] Address mobile viewport issues (I-009)

### Phase 4: Post-Pilot (6-12 weeks)
- [ ] Complete asset migration (I-001)
- [ ] Build Firebase fixture system (I-006)
- [ ] Implement progress cleanup (I-007)
- [ ] Optimize code splitting (I-010)
- [ ] Remove unused files (I-011)
- [ ] Create operations playbook (I-012)

### Phase 5: Long-Term (3-6 months)
- [ ] Onboarding offline support (I-008)
- [ ] Comprehensive tablet testing (I-009)
- [ ] Sentry monitoring expansion (I-013)
- [ ] Performance optimization pass

---

## Summary Table

| ID    | Issue | Priority | Effort | Status | Blocker |
|-------|-------|----------|--------|--------|---------|
| I-001 | Asset migration (Lovable CDN) | 🔴 CRITICAL | 3-4 hrs | 📋 Backlog | ⚠️ YES |
| I-002 | Cron auth (Lovable env vars) | 🔴 CRITICAL | 1-2 hrs | 📋 Backlog | ⚠️ YES |
| I-003 | Accessibility (reduce motion) | 🟠 HIGH | 2-3 hrs | 📋 Backlog | ❌ NO |
| I-004 | Error sanitization (Sentry) | 🟠 HIGH | 2 hrs | 📋 Backlog | ❌ NO |
| I-005 | Analytics privacy | 🟠 HIGH | 2-3 hrs | 📋 Backlog | ❌ NO |
| I-006 | Test fixtures (Firebase) | 🟠 HIGH | 3-4 hrs | 📋 Backlog | ❌ NO |
| I-007 | Orphaned progress cleanup | 🟠 HIGH | 1-2 hrs | 📋 Backlog | ❌ NO |
| I-008 | Onboarding offline | 🟡 MEDIUM | 4-6 hrs | 📋 Backlog | ❌ NO |
| I-009 | Tablet viewport testing | 🟡 MEDIUM | 2-3 hrs | 📋 Backlog | ❌ NO |
| I-010 | Code splitting (perf) | 🟡 MEDIUM | 2-3 hrs | 📋 Backlog | ❌ NO |
| I-011 | Remove unused files | ⚪ LOW | 1 hr | 📋 Backlog | ❌ NO |
| I-012 | Deployment playbook | ⚪ LOW | 2 hrs | 📋 Backlog | ❌ NO |
| I-013 | Sentry expansion | ⚪ LOW | 2-3 hrs | 📋 Backlog | ❌ NO |

---

## Recommendation

**Current Status**: ✅ **PILOT-READY**

The MVP is stable and suitable for controlled pilot launch. The two CRITICAL blockers (asset migration, cron auth) only matter if Lovable infrastructure is decommissioned. If Lovable remains available, the application can continue in production indefinitely.

**Action Items**:
1. **Before Pilot Goes Live**: Confirm Lovable CDN availability timeline with Lovable
2. **During Pilot**: Prioritize I-002 (cron auth) to eliminate Lovable dependency
3. **First Pilot Cycle**: Gather user feedback on I-003 (accessibility) and I-009 (mobile)
4. **Post-Pilot**: Execute full I-001 (asset migration) to complete independence from Lovable

---

## Questions for TATI Leadership

1. **Asset Migration**: When is Lovable CDN being decommissioned? Should we migrate proactively?
2. **Cron Jobs**: Are scheduled database tasks (I-007 progress cleanup) critical for pilot?
3. **Pilot Duration**: How long is the controlled pilot (weeks vs. months)?
4. **User Feedback**: How will we collect and prioritize user feedback from pilots?

---

**Document Owner**: TATI Engineering  
**Last Updated**: October 24, 2026  
**Next Review**: After first pilot cohort completes (4-6 weeks)
