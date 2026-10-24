# TATI Improvements — Priority Matrix

## Visual Priority Map

```
                                    EFFORT/COMPLEXITY
                    LOW                    MEDIUM                  HIGH
            (< 2 hrs)             (2-4 hrs)            (> 4 hrs)
         ┌────────────────────┬────────────────────┬────────────────────┐
    CRIT │ Quick Wins         │ Must Do Soon       │ Plan Ahead         │
    ICAL │                    │                    │                    │
    I    │ • Code Cleanup     │ • Cron Auth        │ • Asset Migration  │
    T    │   (I-011)          │   (I-002) ⚠️      │   (I-001) ⚠️       │
    I    │   1 hr             │   1-2 hrs          │   3-4 hrs          │
    C    │                    │                    │                    │
    A    ├────────────────────┼────────────────────┼────────────────────┤
    L    │ Do This Phase      │ Do During Pilot    │ Post-Pilot Sprint  │
         │                    │                    │                    │
    H    │ • Playbook         │ • Error Sanitize   │ • Test Fixtures    │
    I    │   (I-012)          │   (I-004)          │   (I-006)          │
    G    │   2 hrs            │   2 hrs            │   3-4 hrs          │
    H    │                    │ • Analytics Priv   │ • Onboarding       │
         │                    │   (I-005)          │   Offline (I-008)  │
         │                    │   2-3 hrs          │   4-6 hrs          │
         │                    │ • Reduce Motion    │ • Code Splitting   │
         │                    │   (I-003)          │   (I-010)          │
         │                    │   2-3 hrs          │   2-3 hrs          │
         │                    │ • Cleanup          │                    │
         │                    │   (I-007)          │                    │
         │                    │   1-2 hrs          │                    │
         │                    │                    │                    │
    M    ├────────────────────┼────────────────────┼────────────────────┤
    E    │ Nice to Have Later │ Gather Feedback    │ Longer-Term Plan   │
    D    │                    │ First               │                    │
    IUM  │ • Sentry Expand    │ • Tablet Testing   │ (None currently)   │
         │   (I-013)          │   (I-009)          │                    │
         │   2-3 hrs          │   2-3 hrs          │                    │
         │                    │                    │                    │
         └────────────────────┴────────────────────┴────────────────────┘
```

---

## Execution Strategy

### 🚨 BLOCKING ISSUES (Must Fix Before Full Independence)
```
IF Lovable is being decommissioned:
├─ I-001: Asset Migration (3-4 hrs) ← Do first
├─ I-002: Cron Auth (1-2 hrs) ← Do parallel
└─ Unlocks: True independence from Lovable

IF Lovable remains available indefinitely:
└─ Both become lower priority; can defer to Phase 4-5
```

### 📍 CURRENT PHASE (Pilot Launch)
**Focus**: Keep pilot stable, gather user feedback
```
├─ Monitor I-001 (CDN) — Is it working? When sunset?
├─ Schedule I-002 (Cron Auth) — Pre-Lovable-sunset
├─ Collect feedback on I-003 (Accessibility), I-009 (Tablet)
└─ Document I-004, I-005 (Privacy) implementation plan
```

### 🎯 NEXT PHASE (During Pilot, 4-6 weeks)
**Focus**: Privacy & Security compliance
```
1. Deploy I-002 (Cron Auth) — Eliminate Lovable dependency
2. Implement I-004 (Error Sanitization) — Prevent data leaks
3. Implement I-005 (Analytics Privacy) — GDPR compliance
4. Monitor I-001 (Asset CDN) — Is it still working?
5. Gather user feedback for Phase 4
```

### 🚀 PHASE 4 (Post-Pilot, 6-12 weeks)
**Focus**: Independence & Infrastructure
```
1. Complete I-001 (Asset Migration) — Full Lovable exit
2. Implement I-006 (Test Fixtures) — Dev velocity improvement
3. Implement I-007 (Progress Cleanup) — Cost optimization
4. Address tablet issues (I-009) — Based on pilot feedback
5. Implement onboarding offline (I-008) — UX improvement
```

### 💎 PHASE 5 (Polish & Optimization, 3-6 months)
**Focus**: Performance & Observability
```
1. I-010 (Code Splitting) — 15-20% faster on slow networks
2. I-013 (Sentry Expansion) — Better error tracking
3. I-011 (Code Cleanup) — Technical debt reduction
4. Performance audit — Lighthouse score improvement
```

---

## Quick Reference: Which Items Block Pilot?

| Item | Blocks Pilot? | Blocks Production? | Timeline |
|------|---------------|-------------------|----------|
| I-001 (Asset CDN) | ❌ NO | ⚠️ ONLY if Lovable shuts down | TBD by Lovable |
| I-002 (Cron Auth) | ❌ NO | ⚠️ ONLY if Lovable auth removed | Before sunset |
| I-003 (Accessibility) | ❌ NO | ❌ NO | During/after pilot |
| I-004 (Error Sanitize) | ❌ NO | ⚠️ RECOMMENDED | During pilot |
| I-005 (Analytics Privacy) | ❌ NO | ⚠️ GDPR if in EU | Before production |
| I-006 (Test Fixtures) | ❌ NO | ❌ NO | Post-pilot |
| I-007 (Progress Cleanup) | ❌ NO | ❌ NO | Post-pilot |
| I-008 (Offline Onboarding) | ❌ NO | ❌ NO | Phase 4 |
| I-009 (Tablet Testing) | ❌ NO | ❌ NO | Phase 4 |
| I-010 (Code Splitting) | ❌ NO | ❌ NO | Phase 5 |
| I-011 (Code Cleanup) | ❌ NO | ❌ NO | Phase 5 |
| I-012 (Playbook) | ❌ NO | ✅ RECOMMENDED | Post-pilot |
| I-013 (Sentry) | ❌ NO | ❌ NO | Phase 5 |

**Conclusion**: ✅ **NO BLOCKING ISSUES FOR PILOT** (assuming Lovable CDN stays available)

---

## Cost-Benefit Analysis

### Low Effort, High Impact (Do First)
```
I-002: Cron Auth (1-2 hrs)
├─ Impact: Eliminates Lovable dependency
├─ Blocker: Only if Lovable auth sunset
├─ ROI: ~100% (dependencies removed)
└─ Priority: ✅ HIGH

I-007: Progress Cleanup (1-2 hrs)
├─ Impact: ~20-30% Firestore storage savings
├─ Cost Savings: $100-200/month on large scale
├─ ROI: ~150% in year 1
└─ Priority: ✅ MEDIUM
```

### Medium Effort, High Impact (Do Soon)
```
I-004: Error Sanitization (2 hrs)
├─ Impact: Privacy/security compliance
├─ Risk Reduced: Data leakage prevention
├─ Effort: Minimal
└─ Priority: ✅ HIGH

I-005: Analytics Privacy (2-3 hrs)
├─ Impact: GDPR/CCPA compliance
├─ Legal Risk Reduced: Privacy violations
├─ Effort: Minimal
└─ Priority: ✅ HIGH (if using analytics)

I-003: Reduce Motion (2-3 hrs)
├─ Impact: Accessibility for ~5-10% users
├─ User Experience: Improved for vestibular disorders
├─ Effort: Minimal
└─ Priority: ✅ HIGH
```

### High Effort, High Impact (Plan Ahead)
```
I-001: Asset Migration (3-4 hrs)
├─ Impact: True independence from Lovable
├─ Timeline: Before Lovable shutdown (TBD)
├─ Effort: Moderate (manual asset export + upload)
└─ Priority: ⚠️ CRITICAL (if Lovable shutting down)

I-006: Test Fixtures (3-4 hrs)
├─ Impact: 2-3x faster test development
├─ Long-term ROI: Hours saved per new test
├─ Effort: Moderate
└─ Priority: ✅ HIGH (dev velocity)
```

### Lower Priority Items
```
I-008: Offline Onboarding (4-6 hrs) — Nice UX, not critical
I-009: Tablet Testing (2-3 hrs) — Depends on pilot feedback
I-010: Code Splitting (2-3 hrs) — Performance polish
I-011: Code Cleanup (1 hr) — Technical debt
I-012: Playbook (2 hrs) — Ops improvement
I-013: Sentry (2-3 hrs) — Observability
```

---

## Decision Framework

**When you discover a bug or missing feature in pilot:**

1. **Is it affecting pilot users?**
   - YES → Fix immediately (even if not on this list)
   - NO → Add to appropriate phase

2. **Will it affect production?**
   - YES → Prioritize based on risk/effort
   - NO → Nice to have, schedule for later

3. **Is it on the Critical list?**
   - YES (I-001, I-002) → Fix before Lovable changes
   - NO → Follow the phase roadmap

4. **User feedback suggests improvement?**
   - I-003 (Motion) → Collect data, add to Phase 4
   - I-008 (Offline) → Collect data, add to Phase 4
   - I-009 (Tablets) → Collect data, add to Phase 4

---

## How to Track Progress

Use this checklist as pilot progresses:

### Week 1 (Pilot Launch)
- [ ] Confirm Lovable CDN availability (impacts I-001)
- [ ] Confirm Lovable auth timeline (impacts I-002)
- [ ] Monitor error rates (for I-004 prioritization)
- [ ] Collect accessibility feedback (for I-003 prioritization)

### Week 2-4 (Pilot Running)
- [ ] Deploy I-002 (Cron Auth) if Lovable sunset announced
- [ ] Implement I-004 (Error Sanitization) based on errors seen
- [ ] Implement I-005 (Analytics Privacy) if using analytics
- [ ] Gather mobile/tablet feedback (for I-009)

### Week 5-6 (Pilot Winding Down)
- [ ] Compile user feedback for Phase 4 prioritization
- [ ] Finalize timeline for I-001 (Asset Migration)
- [ ] Schedule post-pilot work based on feedback
- [ ] Celebrate pilot success! 🎉

---

**Document Purpose**: Guide decision-making for improvement prioritization  
**Last Updated**: October 24, 2026  
**Owner**: TATI Engineering
