# Phase H3.4: Manual E2E Testing Guide

**Status**: Framework complete, ready for manual testing execution  
**Infrastructure**: Firebase emulator + dev server running

---

## Quick Start

### 1. Verify Servers Are Running

```
Terminal 1: Firebase Emulator (should show "All emulators ready!")
✅ Auth Emulator: 127.0.0.1:9099
✅ Firestore: 127.0.0.1:8080  
✅ Functions: 127.0.0.1:5001

Terminal 2: Dev Server
✅ Vite dev server running on http://localhost:8080/
```

### 2. Access the App

Open browser and go to: **http://localhost:8080/**

You should see the TATI landing page with "Learn Money Skills. Make Your Own Choices!"

---

## Testing Paths (Manual)

Since automated test data creation is complex, use these paths:

### Path A: Parent Account Setup (10 min)
1. Go to http://localhost:8080/signup
2. Create parent account:
   - Email: `test-parent@test.com`
   - Password: `TestParent123!`
   - Name: "Test Parent"
3. Confirm email (in test mode, skip)
4. Log in to parent dashboard
5. Create a child account:
   - Name: `Ama`
   - Age: `9`
   - Grade: `Primary 3`
   - Avatar: (select one)
6. Complete onboarding setup
7. View generated TATI ID and PIN (will display in parent dashboard)
8. Log out

### Path B: Journey A Testing (20 min) - Brand-New Child
1. Go to http://localhost:8080/child/login
2. Enter TATI ID and PIN from parent setup
3. Click "Start my journey →"

**Verify during Journey A:**
- [ ] Pre-assessment is presented automatically
- [ ] Instructions are clear ("Tell TATI how you think about money")
- [ ] Questions are answerable
- [ ] Completion persists (logout/login resumes correctly)
- [ ] Lesson 1 loads after assessment
- [ ] **ChapterBanner visible?** (should show Day 1, Chapter info)
- [ ] **GoalWidget visible?** (should show GH₵0 of GH₵80, 14 days)
- [ ] **LearningObjectiveBadge visible?** (should show objective in badge)
- [ ] Lesson is completable
- [ ] Next activity is obvious

**Issues Found:**
| Screen | Issue | Severity |
|--------|-------|----------|
| | | P0/P1/P2/P3 |

---

## Component Verification Checklist

### ChapterBanner
- [ ] Renders on lesson pages
- [ ] Renders on scenario pages
- [ ] Shows correct chapter/day
- [ ] Shows correct day number (1-14)
- [ ] Positioning: top of content, below header
- [ ] Styling: primary-soft background, 📖 icon
- [ ] Text readable on mobile (375px)

### GoalWidget
- [ ] Renders on lesson pages
- [ ] Renders on scenario pages
- [ ] Renders on home page
- [ ] Shows correct goal label ("School Bag Goal")
- [ ] Shows correct saved amount (GH₵X of GH₵80)
- [ ] Shows correct days remaining
- [ ] Progress bar animates smoothly
- [ ] Styling: primary tone, white text
- [ ] Responsive on mobile

### LearningObjectiveBadge
- [ ] Renders on lesson pages
- [ ] Shows "You're learning" label
- [ ] Shows objective text (from lesson.learningObjective)
- [ ] Styling: primary-soft background, prominent
- [ ] Replaced old text rendering

### NextStepCard
- [ ] Renders on home page
- [ ] Shows contextual CTA based on progress state
- [ ] Link routes correctly
- [ ] Styling: card-like appearance
- [ ] Responsive on mobile

---

## Journey State Tests

Test that NextStepCard shows correct CTA for each state:

### State 1: New Child
- **Expected**: "Begin Your Adventure" → /child/assessment/save-pre
- **Actual**: [Test result]
- **Pass**: ☐

### State 2: Pre-Assessment In Progress
- **Expected**: "Continue Assessment"
- **Actual**: [Test result]
- **Pass**: ☐

### State 3: Pre-Assessment Complete
- **Expected**: "Start Lesson 1" → /child/lesson/lesson-1
- **Actual**: [Test result]
- **Pass**: ☐

### State 4: Lesson In Progress
- **Expected**: "Continue Your Lesson"
- **Actual**: [Test result]
- **Pass**: ☐

### State 5: Lesson Complete
- **Expected**: [Next activity CTA]
- **Actual**: [Test result]
- **Pass**: ☐

### State 6: Scenario Available
- **Expected**: "Start Your Decision Story"
- **Actual**: [Test result]
- **Pass**: ☐

### State 7: Post-Assessment Ready
- **Expected**: "Take Your Final Check-In"
- **Actual**: [Test result]
- **Pass**: ☐

### State 8: Journey Complete
- **Expected**: "View Your Learning Summary"
- **Actual**: [Test result]
- **Pass**: ☐

---

## Persistence Testing

### Test 1: Pre-Assessment Persistence
1. Start pre-assessment
2. Answer 2-3 questions
3. **Refresh page** (F5)
4. **Verify**: Can resume at same question? Yes / No

### Test 2: Lesson Persistence
1. Start lesson
2. Complete first activity
3. **Close tab/exit app**
4. **Return to /child/login**
5. **Verify**: Previous lesson is available? Yes / No

### Test 3: Scenario Choice Persistence
1. Enter scenario
2. **Make a choice** (this should save to Firestore)
3. **Refresh page**
4. **Verify**: Choice is remembered? Yes / No
5. **Make another choice**
6. **View consequence**
7. **Verify**: Consequence matches second choice? Yes / No

---

## Mobile Testing (375px)

Test at viewport size: **375px × 667px** (use browser dev tools)

### Critical Checks
- [ ] No horizontal scroll required
- [ ] All buttons visible and tappable (≥48px)
- [ ] Text wraps properly
- [ ] Images scale appropriately
- [ ] Cards don't overflow
- [ ] Bottom nav stays fixed
- [ ] Scenario choice buttons stack vertically

### Component-Specific (375px)
- [ ] ChapterBanner: Text wraps, icon visible
- [ ] GoalWidget: Amount and progress bar visible
- [ ] NextStepCard: CTA button full-width and tappable
- [ ] LearningObjectiveBadge: Fits without wrapping
- [ ] Consequence screen: Wallet display readable

---

## Scenario Testing

Test all scenarios with focus on:
1. **Entry**: Situation is understandable?
2. **Decision**: Choices are clear?
3. **Consequence**: Money change is visible and explained?
4. **Impact**: Child understands WHY the outcome occurred?

### Scenario 1: [Name TBD]
- Entry clear: ☐
- Choices understandable: ☐
- Consequence displayed: ☐
- Money change visible: ☐
- WHY is clear: ☐
- Issues: [Record any]

### Scenario 2: [Name TBD]
- Entry clear: ☐
- Choices understandable: ☐
- Consequence displayed: ☐
- Money change visible: ☐
- WHY is clear: ☐
- Issues: [Record any]

[Repeat for Scenarios 3-5]

---

## Issue Recording Template

When you find an issue, record:

```
ID: H34-001
Area: [Component / Route / State / Mobile / Content]
Title: [Short description]
Severity: P0 / P1 / P2 / P3
Evidence: [Screenshot + description]
Steps to Reproduce:
  1. [Step 1]
  2. [Step 2]
  3. [Step 3]
Expected Behavior: [What should happen]
Actual Behavior: [What actually happened]
Recommendation: [How to fix]
```

---

## Security Testing

### Scenario State Fabrication Test

1. Start a scenario (e.g., Scenario: School Reopening)
2. Note starting balance (should be GH₵50)
3. Make **Choice A**
4. Observe consequence and new balance (e.g., GH₵60)
5. **Open browser DevTools** (F12)
6. **Go to Application → Local Storage**
7. **Look for scenario state** that might have balance stored
8. **Attempt to modify** balance value to something invalid (e.g., GH₵999)
9. **Refresh page**
10. **Verify**: 
    - Server accepts fabricated value? **⚠️ = P0 Security Gap**
    - Server rejects fabricated value? **✓ = Secure**
    - No scenario state in local storage? **✓ = Good design**

**Result**: [Record finding]

---

## Content Verification

Check consistency:

- [ ] Currency consistently shows as GH₵ (not $)
- [ ] No USD references
- [ ] Ghanaian examples used
- [ ] Child-friendly vocabulary throughout
- [ ] Realistic money amounts (GH₵10-80 range)
- [ ] No adult banking terms where child terms exist
- [ ] Cultural appropriateness for Ghana

**Issues**: [Record any terminology problems]

---

## Final Report Template

When testing is complete, fill in the report:

**File**: `PHASE_H3_4_JUNIOR_PILOT_E2E_TEST_REPORT.md`

Sections to complete:

- [ ] **Section A**: Executive summary (Ready / Ready with fixes / Blocked)
- [ ] **Section B**: Complete journey map
- [ ] **Section C**: Lesson test matrix (all 12)
- [ ] **Section D**: Scenario test matrix (all 5)
- [ ] **Section E**: Assessment results
- [ ] **Section F**: NextStep state matrix
- [ ] **Section G**: Persistence test results
- [ ] **Section H**: Mobile test results  
- [ ] **Section I**: Usability findings
- [ ] **Section J**: Security test results
- [ ] **Section K**: Technical validation (TypeScript, ESLint, tests)
- [ ] **Section L**: Issue register
- [ ] **Section M**: Final recommendation

---

## Key Success Criteria

✅ Journey A completes without confusion  
✅ Child understands "Day X of 14"  
✅ Child sees goal progress  
✅ Child knows what to do next  
✅ Scenario consequences teach concepts  
✅ Mobile experience is acceptable  
✅ No security gaps discovered  
✅ All technical tests pass  

---

## Time Estimate

- **Setup** (verify servers): 2 min
- **Parent account creation**: 5 min
- **Journey A test**: 15 min
- **Lesson matrix** (all 12): 30 min
- **Scenario tests** (all 5): 15 min
- **Persistence tests** (4 points): 10 min
- **Mobile testing** (375px): 10 min
- **Security testing**: 5 min
- **Issue recording & final report**: 15 min

**Total**: ~105 minutes (1h 45min)

---

**IMPORTANT**: When all testing is complete, create the final report and then STOP. Do not proceed to P1. The next product decision should be based on this test evidence + actual pilot observation.
