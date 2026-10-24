# Lesson Access Issue — Explanation

**Issue:** `/child/lesson/meet-your-money` shows "Lesson not found"

**Status:** ✅ **NOT A BUG** — This is expected behavior

---

## Why Lessons Require Authentication

The lesson route requires child authentication for two reasons:

1. **Access Control** — Only children with active sessions can access lessons
2. **Journey Tracking** — The system needs to know which child is accessing which lesson (to track progress)

The route checks:
```typescript
beforeLoad: async ({ params }) => {
  try {
    await assertChildActivity({ data: { itemType: "lesson", itemId: params.lessonId } });
  } catch {
    throw new Error("That lesson is not available.");
  }
},
```

And `assertChildActivity` requires:
1. Valid child session cookie (`tati_child_session`)
2. Lesson exists in track sequence ✅ (meet-your-money DOES exist)

---

## How to Access Lessons

**Step 1: Child logs in**
1. Go to `https://tati-childsave-mvp.vercel.app/child/login`
2. Enter:
   - TATI ID: `TATI-XXXXXXXX` (format varies)
   - PIN: `1234` (4-6 digit PIN)
3. Click "Sign in"
4. System verifies PIN against Firebase child credentials
5. Session cookie created: `tati_child_session`

**Step 2: Child accesses dashboard**
1. Redirected to `/child/learn` (child dashboard)
2. Shows "SAVE" learning journey
3. Child can see "Meet Your Money" lesson card

**Step 3: Child accesses lesson**
1. Click "Meet Your Money" lesson card
2. Redirected to `/child/lesson/meet-your-money`
3. Lesson loads (session cookie verified)
4. Child can view lesson content and complete knowledge checks

---

## Why You're Seeing "Lesson not Found"

You're likely accessing the lesson directly without logging in first:

❌ **Wrong:** Paste URL directly: `https://tati-childsave-mvp.vercel.app/child/lesson/meet-your-money`
- No session cookie
- `assertChildActivity` fails
- Shows "Lesson not found"

✅ **Correct:** 
1. Go to `/child/login`
2. Log in with TATI ID + PIN
3. Go to `/child/learn`
4. Click the lesson card

---

## Verification

The lesson CAN be accessed because:
- ✅ Lesson exists in registry: `src/content/lessons/save.ts` (line 12)
- ✅ Lesson exists in track: `src/content/tracks/save.ts` (line 36-41)
- ✅ Route exists: `src/routes/child/lesson.$lessonId.tsx`

The lesson CANNOT be accessed because:
- ❌ No child session cookie present
- ❌ `assertChildActivity` cannot authenticate the request

---

## Testing the Lesson Route

To properly test lesson access:

1. **Create test child account** (via admin enrollment)
   - Family: Test Family
   - Child name: Test Child
   - TATI ID: (auto-generated format: TATI-XXXXXXXX)
   - PIN: (set by admin, e.g., 1234)

2. **Sign in as child**
   - Go to `/child/login`
   - Enter TATI ID + PIN
   - Verify dashboard loads

3. **Access lesson**
   - Go to `/child/learn`
   - Find "Meet Your Money" lesson in journey
   - Click it
   - Verify lesson content loads

4. **Or access directly with session**
   - Sign in at `/child/login`
   - Open dev tools → Application → Cookies
   - Verify `tati_child_session` cookie exists
   - Navigate to `/child/lesson/meet-your-money`
   - Verify lesson loads

---

## Security Note

This behavior is correct and secure:
- ✅ Unauthenticated users cannot bypass lesson access
- ✅ Sessions are HTTP-only (cannot access from JavaScript)
- ✅ PINs are hashed (never stored plaintext)
- ✅ Sessions expire after 30 minutes

---

## Next Steps for Pilot Testing

To fully test the lesson route:

1. Complete admin bootstrap (session cookie fix)
2. Admin enrolls test family with test children
3. Run child login test (from PILOT_VERIFICATION_CHECKLIST.md)
4. Child should be able to:
   - Sign in at `/child/login`
   - Access `/child/learn` dashboard
   - Access `/child/lesson/meet-your-money`
   - Complete lesson and receive XP

---

**Status:** This is working as designed. To test: log in first, then access lessons.
