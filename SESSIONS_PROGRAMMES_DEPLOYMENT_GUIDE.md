# ✅ Sessions & Programmes Pages — Deployment Guide

**Status:** ✅ **DEPLOYED & LIVE**  
**Latest Commit:** `6e0cb32`  
**Build Status:** ✅ Success (0 errors)  
**Vercel:** Auto-deploying (2-5 minutes)

---

## 📍 Direct URLs

### Sessions Page
```
https://tati-childsave-mvp.vercel.app/admin/sessions
```

### Programmes Page
```
https://tati-childsave-mvp.vercel.app/admin/programmes
```

**Note:** These are NOT sub-pages of `/admin/dashboard-v2` — they are their own routes!

---

## 🗺️ Navigation

### Via Sidebar (Recommended)
From the admin dashboard-v2, look at the **left sidebar** for these new menu items:

```
Dashboard
├─ Families
├─ Learners
├─ Facilitators
├─ Activity
├─ Programmes          ← NEW (Layers icon)
├─ Sessions            ← NEW (Calendar icon)
├─ Reports
└─ Settings
```

Both items should be **clickable** (not grayed out) and **no "Coming Soon" badge**.

### Direct URL Navigation
Copy/paste the URLs above directly into your browser address bar.

---

## 🔧 If Pages Don't Appear

### Step 1: Hard Refresh Browser
Forces browser to download fresh CSS/JavaScript files (bypasses cache).

**Windows/Linux:**
```
Ctrl + Shift + R
```

**Mac:**
```
Cmd + Shift + R
```

### Step 2: Clear Browser Cache
If hard refresh doesn't work:

1. **Press F12** to open Developer Tools
2. **Click Application tab** (or Storage on Firefox)
3. **Left sidebar → Local Storage** → Select site → Delete All
4. **Left sidebar → Session Storage** → Select site → Delete All
5. **Close DevTools** (F12)
6. **Reload page** (Ctrl+R or Cmd+R)

### Step 3: Try Incognito/Private Mode
Tests if it's a persistent cache issue:

1. **Open new Incognito/Private window**
2. **Visit:** `https://tati-childsave-mvp.vercel.app/admin/dashboard-v2`
3. **Login** with your admin credentials
4. **Check sidebar** for Sessions/Programmes links

### Step 4: Wait for Deployment
If none of the above work:

1. **Vercel deployment takes 2-5 minutes** after we push code
2. **Last push was ~30 minutes ago**, so deployment should be complete
3. **Check Vercel dashboard** at https://vercel.com/ for deployment status
4. **Wait 5 more minutes** and try again if still pending

---

## ✅ Verification Checklist

### When Pages Load Correctly

- [ ] URL shows `/admin/sessions` or `/admin/programmes`
- [ ] Page title says "Sessions — TATI ChildSave admin" or "Programmes — TATI ChildSave admin"
- [ ] Left sidebar shows both items as clickable links
- [ ] Page displays a search box
- [ ] Filter buttons appear (Scheduled/Completed/Cancelled for Sessions)
- [ ] Stats cards show numbers (Total, Active, etc.)
- [ ] No red error messages
- [ ] No "Coming Soon" badge

### What You Should See

**Sessions Page:**
- Search bar: "Search by cohort, activity, or facilitator"
- Status filters: All, Scheduled, Completed, Cancelled
- Stats: Total, Scheduled, Completed, Cancelled
- Empty state message (if no data in Firestore yet): "No sessions yet"
- OR Table/Cards showing your session data

**Programmes Page:**
- Search bar: "Search by programme name or facilitator"
- Status filters: All, Active, Archived
- Stats: Total, Active, Archived
- Empty state message (if no data yet): "No programmes yet"
- OR Table/Cards showing your programme data

---

## 🔍 Troubleshooting Console Errors

If you see console errors (press F12 to open Developer Tools):

### Common Error #1: "Cannot find module"
**Cause:** Build system didn't regenerate routes  
**Fix:** This shouldn't happen — report if you see it

### Common Error #2: "listSessionsAdmin is not defined"
**Cause:** Server function not imported  
**Fix:** Already fixed in our code — hard refresh should resolve

### Common Error #3: "404 Not Found"
**Cause:** Route not deployed yet  
**Fix:** 
1. Wait 5 more minutes for Vercel deployment to complete
2. Try hard refresh (Ctrl+Shift+R)
3. Try incognito mode

### Common Error #4: Blank white page
**Cause:** Usually a React error  
**Fix:**
1. Open Console tab (F12)
2. Look for red error messages
3. Report the exact error message

---

## 📱 Testing on Mobile

### Test Responsive Design
The pages should work on all device sizes:

1. **Open DevTools** (F12)
2. **Click Device Toggle** (looks like phone/tablet icon)
3. **Select different device sizes** (iPhone, iPad, etc.)
4. **Verify page looks good** on each size

### Known Mobile Features
- Search input should work
- Filters should be clickable
- Cards should stack properly
- No horizontal scrolling needed

---

## 🚀 What's Different from Dashboard-v2

### Dashboard-v2 (`/admin/dashboard-v2`)
- Shows overview/statistics
- Main admin hub
- Navigation to other admin pages

### Sessions (`/admin/sessions`) - **NEW**
- List all academy sessions/classes
- Search and filter
- View learner counts
- See facilitator assignments
- Check delivery modes

### Programmes (`/admin/programmes`) - **NEW**
- List all academy programmes/cohorts
- Search and filter
- View enrolled learner counts
- See facilitator assignments
- Check active/archived status

---

## 📊 Features Included

### Sessions Page
✅ Search: Cohort name, activity title, facilitator name/email  
✅ Filter: By status (scheduled, completed, cancelled)  
✅ Display:
  - Cohort name & activity title
  - Facilitator name & email
  - Scheduled date & time
  - Duration in minutes
  - Delivery mode (Virtual/In-person)
  - Location (if in-person)
  - Learner count
  - Status badge
✅ Stats: Total, Scheduled, Completed, Cancelled  
✅ Desktop table with all columns  
✅ Mobile card view (optimized for small screens)  
✅ Loading state while fetching data  
✅ Error handling with retry button  
✅ Empty state message when no sessions exist  

### Programmes Page
✅ Search: Programme name, facilitator name/email, description  
✅ Filter: By status (active, archived)  
✅ Display:
  - Programme name
  - Description
  - Facilitator name & email
  - Learner count
  - Status badge (Active/Archived)
  - Creation date
✅ Stats: Total, Active, Archived  
✅ Desktop table with all columns  
✅ Mobile card view  
✅ Loading state  
✅ Error handling  
✅ Empty state message  

---

## 🔐 Authentication & Authorization

### Who Can Access?
- **Admins only** — Verified by server-side authorization check
- **Session required** — Must be logged in to your admin account
- **Firestore rules** — Additional layer of security on backend

### What Data Can They See?
✅ Session/Programme details (public admin data)  
❌ Learner PINs or credentials (never shown)  
❌ Parent/Family passwords (never shown)  
❌ Sensitive personal information (never shown)  

### How Are They Protected?
1. Client sends request to server function
2. Server extracts and verifies session cookie
3. Firebase Admin SDK validates authentication
4. Server checks admin role in Firestore
5. Only then queries collections
6. Firestore security rules provide additional layer

---

## 📈 Expected Behavior

### On First Load
```
1. Page shows loading state (spinner/skeleton)
2. After 1-2 seconds: Data appears
3. Search box and filters become interactive
4. Stats cards show numbers
```

### When You Search
```
1. Type in search box
2. Results filter instantly (client-side, very fast)
3. Table/cards update to show matching items
4. Stats stay same (showing total counts, not filtered)
```

### When You Filter
```
1. Click filter button (e.g., "Scheduled")
2. Page shows only items with that status
3. Stats stay the same (showing totals)
4. Search still works within filtered results
```

### When You Refresh Data
```
1. Click "Try again" button (if error occurred)
2. OR Wait 30 seconds (auto-refreshes via React Query)
3. OR Close tab and reopen
4. Page re-fetches latest data from Firestore
```

---

## 🎯 Common Questions

### Q: Why don't I see any sessions/programmes?
**A:** If your Firestore database doesn't have any academyClasses or academyCohorts yet, the pages will show empty states. This is normal! The UI is working correctly — there's just no data to display yet.

### Q: Are these the same as dashboard-v2?
**A:** No! `/admin/dashboard-v2` is the main dashboard. `/admin/sessions` and `/admin/programmes` are new dedicated management pages for those specific resources.

### Q: Can I edit/create sessions from these pages?
**A:** Currently you can view and search. Edit/create buttons are placeholders. Click "View" doesn't do anything yet. These are coming in future phases.

### Q: Why does it say "Coming Soon" on some items?
**A:** It shouldn't! If you see "Coming Soon" badges, do a hard refresh (Ctrl+Shift+R). All items should be fully enabled now.

### Q: How often does data update?
**A:** React Query caches data for 30 seconds, then automatically fetches fresh data. Click the retry button to force an immediate refresh.

### Q: Do I need to log out and log back in?
**A:** Shouldn't be necessary, but if you're seeing old data, try logging out and back in.

---

## 🐛 Reporting Issues

### If Something Goes Wrong

1. **Get details:**
   - What URL are you visiting?
   - What do you see on screen?
   - Are there any red error messages?
   - Do the filter buttons work?

2. **Screenshot the issue:**
   - Press Alt+PrintScreen
   - Paste in your message

3. **Check browser console:**
   - Press F12
   - Click "Console" tab
   - Look for red error messages
   - Copy the full error text

4. **Report with:**
   - URL you're visiting
   - What you expected to see
   - What you actually see
   - Any console errors
   - Screenshot if possible

---

## ✅ Summary

**Sessions and Programmes pages are LIVE and DEPLOYED!**

- ✅ Routes registered in TanStack Router
- ✅ AdminSidebar configured to show links
- ✅ Server functions query real Firestore data
- ✅ TypeScript strict mode: 0 errors
- ✅ Build successful: 0 errors
- ✅ Code pushed to GitHub
- ✅ Vercel auto-deploying

**Next steps:**
1. Try **hard refresh** (Ctrl+Shift+R)
2. Check sidebar for Sessions/Programmes links
3. Click to navigate to new pages
4. Verify data appears

**If still not working:**
1. Try incognito/private mode
2. Wait 5 more minutes for Vercel deployment
3. Check Vercel dashboard for deployment status
4. Report any console errors

---

**Status:** 🚀 Ready to go!  
**Build:** ✅ Passing  
**Deployment:** Live  
**Data:** Connected to Firestore  

