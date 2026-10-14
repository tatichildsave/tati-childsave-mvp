# TATI ChildSave — Admin Enrolment Quick Start Guide

## How to Enrol a New Family

### Prerequisites
- You are logged in as an admin
- You have a parent's email address
- You have each child's name and age (5-18)

### Step 1: Navigate to Enrolment

1. Go to Admin Dashboard: `/admin`
2. Click **"Enrol New Family"** button (in Quick Actions section)
3. Or navigate directly to: `/admin/enroll`

---

## The 4-Step Enrolment Process

### STEP 1: Family Details
![Progress: 25%]

**What to enter:**
- **Family Name** (Required): e.g., "Johnson Family"
- **Notes** (Optional): Any special notes about the family (language preferences, contact info, etc.)

**Click NEXT** to continue

---

### STEP 2: Parent Details
![Progress: 50%]

**What to enter:**
- **Email Address** (Required): Parent's email address
  - Must be valid email format
  - Must be unique (no duplicate enrollments)
- **Display Name** (Required): Parent's name or preferred name
- **Phone Number** (Optional): Parent's phone number

**What happens:**
- System creates a Firebase Auth account for this parent
- Parent will receive a temporary login prompt
- Parent sets their own password on first login (most secure)

**Click NEXT** to continue

---

### STEP 3: Children Provisioning
![Progress: 75%]

**Add at least one child:**

For each child, enter:
- **Child Name** (Required): Full name
- **Age** (Required): Between 5 and 18 years old
- **Date of Birth** (Optional): Child's DOB
- **Preferred Name** (Optional): E.g., "Sam" if full name is "Samuel"

**Then click: "Generate TATI ID & PIN"**

System will:
1. Generate unique TATI ID (e.g., TATI-A1B2C3D4)
2. Generate 4-digit PIN (e.g., 5738)
3. Display TATI ID and PIN
4. Add child to the enrollment list

**⚠️ IMPORTANT**: Write down the PIN immediately. It will only be shown once.

**Can add multiple children:** Click "Add Another Child" to repeat for siblings

**Click NEXT** to continue

---

### STEP 4: Review & Confirm
![Progress: 100%]

**Review all information:**
- Family name and notes
- Parent email, name, phone
- Each child with their TATI ID and PIN

**Before confirming:**
- Print the credentials page (button: 🖨️ Print)
- Download as text file (button: 📥 Download as Text)
- Or copy the credentials from the screen

**Then click: "Confirm & Complete Enrollment"**

System will:
1. Create the family record
2. Activate the parent account
3. Register all children with their TATI IDs
4. Lock in the PINs (cannot be changed)

**Success!** You'll see a confirmation screen and be redirected to the admin dashboard.

---

## What the Parent Sees

1. Parent receives email: "Your TATI ChildSave account is ready"
2. Parent clicks link to login page
3. Parent enters email and sets a password
4. Parent is logged into their account and can:
   - View assigned children
   - Monitor children's progress
   - View learning milestones

---

## What the Child Sees

1. Child is given TATI ID and PIN (by parent or admin)
2. Child goes to child login screen
3. Child enters:
   - TATI ID (e.g., TATI-A1B2C3D4)
   - 4-digit PIN (e.g., 5738)
4. Child is logged in and can:
   - Start lessons
   - Complete scenarios
   - Take assessments
   - Progress is saved automatically

---

## After Enrolment: Managing Families

### View All Families

1. Go to: `/admin/families`
2. Or click **"View All Families"** from Admin Dashboard
3. See list of all enrolled families

### Search & Filter Families

- **Search by**: Family name, parent name, or email
- **Filter by**: Status (Active, Inactive, Pending)

### View Family Details

1. Click on a family card
2. View three tabs:
   - **Overview**: Summary of family + parent + children
   - **Parent**: Parent details, reset password, deactivate account
   - **Children**: List of children, reset PIN, view activity

### Reset a Child's PIN

1. Open family details
2. Click **Children** tab
3. Find the child
4. Click **"Reset PIN"** button
5. New PIN will be displayed for 10 seconds
6. Write it down immediately

### Reset Parent Password

1. Open family details
2. Click **Parent** tab
3. Click **"Reset Password"** button
4. Parent will get password reset email

---

## Credentials: Secure Distribution

### Parent Email & Password

**How delivered:**
- Parent receives email: "Your account is ready"
- Parent sets their own password (most secure)
- Email should NOT contain password (parent creates it)

### Child TATI ID & PIN

**Recommended distribution:**
1. **Print** the credentials page from Step 4
2. **Physically hand** to parent in person
3. OR **Email** to parent (secure channel)
4. NOT displayed in public areas

**Never:**
- Share via unsecured messaging apps
- Display on public screens
- Write down without secure storage

---

## Common Tasks

### "A parent forgot their password"
→ Go to family detail, click **Parent** tab → **Reset Password**

### "A child forgot their PIN"
→ Go to family detail, click **Children** tab → Find child → **Reset PIN**

### "I need to change family information"
→ Currently not available in Phase 5A (contact support)

### "I need to deactivate a family account"
→ Go to family detail, click **Parent** tab → **Deactivate Account**

### "A child completed pilot, can I enrol another child?"
→ Go to family detail, click **Children** tab → **Add Another Child**

---

## Troubleshooting

### "System says email already exists"
- Another family is already enrolled with that email
- Use a different email address or contact support

### "System says invalid email"
- Check email format: must contain @ and domain
- Example: parent@example.com (correct)
- Example: parentexample.com (wrong)

### "Age validation error"
- Child must be between 5 and 18 years old
- Check the age entered

### "PIN not showing"
- Pin is displayed for only 10 seconds in Step 3
- If you miss it, you must:
  1. Complete enrollment
  2. Go to family detail → Children
  3. Find child → Reset PIN
  4. New PIN will be generated and displayed

### "Parent can't log in"
- Parent should click "Forgot Password" on login screen
- Parent will receive password reset email
- If still not working, contact support

### "Child can't log in"
- Verify TATI ID format: TATI-XXXXXXXX (8 hex characters)
- Verify PIN is 4 digits
- Check parent entered it correctly
- If still not working, go to family → Reset PIN

---

## Security Best Practices

✅ **DO:**
- Store credentials in secure location until parent picks up
- Verify parent identity before handing over credentials
- Use secure, encrypted channels to share credentials
- Document when family was enrolled and by whom

❌ **DON'T:**
- Share credentials via unencrypted email
- Write credentials on paper left on desk
- Share credentials with anyone except parent/child
- Store credentials in unprotected files
- Screenshot and save credentials

---

## Quick Reference

| What | Where |
|------|-------|
| **Enrol new family** | `/admin/enroll` or Dashboard Quick Actions |
| **View all families** | `/admin/families` |
| **View family details** | `/admin/families/[familyId]` |
| **Admin dashboard** | `/admin` |
| **Parent login** | `/parent-login` |
| **Child login** | `/child-login` |

---

## Support

**Questions about enrolling families?**
- See this guide: `/admin/guides/enrolment`

**Issues during enrollment?**
- Check troubleshooting section above
- Contact technical support

**Need to modify family after enrollment?**
- Contact support (not available in Phase 5A)

---

*Updated: October 14, 2026*  
*Version: 1.0 (Phase 5A)*
