# Admin Dashboard Setup and Usage Guide

## Overview

The TATI ChildSave admin dashboard provides global administrators with comprehensive system management capabilities. This document outlines:
- How to log in as an admin
- Available admin operations
- How to create users with different roles
- Managing schools and facilitators

## Admin Authentication

### Admin Login Page

Admins access the system via a dedicated login page:
- **URL**: `/admin-login`
- **Authentication**: Firebase Email/Password or Google OAuth
- **Role Verification**: After authentication, the system verifies admin role in Firestore

### Access Flow

1. Navigate to `/admin-login`
2. Sign in with email/password or Google OAuth
3. System checks user's `roles` array in Firestore `/users/{uid}` document
4. If user has "admin" role, redirected to `/admin` dashboard
5. If user lacks admin role, shown error message and redirected to `/`

## Admin Dashboard Routes

### Main Admin Page
- **Route**: `/admin/`
- **Protection**: Firebase authentication + admin role verification
- **Access**: Only authenticated users with "admin" role

### Admin Login
- **Route**: `/admin-login`
- **Protection**: None (pre-authentication)
- **Purpose**: Dedicated login page for administrators

## Core Admin Features

### 1. System Overview
**Tab**: Overview
- Total system users count
- Total schools count
- Total families count
- Total children in system
- Real-time statistics dashboard

### 2. User Management
**Tab**: Users

#### Create Admin User
- **Form Fields**:
  - Email address
  - Temporary password
- **Process**:
  1. Admin submits email and password
  2. `createAdminUser()` Cloud Function called
  3. User created in Firebase Authentication
  4. Firestore document created with roles: ["admin"]
  5. Custom claims set: { admin: true }
- **Response**: UID, email, and confirmation message
- **Next Step**: Share temporary password with new admin (recommend password reset on first login)

#### View All Users
- **Information Displayed**:
  - Email address
  - Assigned roles (parent, child, facilitator, admin, schoolAdmin)
  - Account status (active, pending, inactive)
- **Sort/Filter**: Available via table columns
- **Bulk Operations**: For future use

### 3. School Management
**Tab**: Schools

#### Create School
- **Form Fields**:
  - School name
- **Process**:
  1. Admin submits school name
  2. New Firestore document created at `/schools/{schoolId}`
  3. Document includes: name, status, createdAt timestamp
- **Auto-ID**: System generates unique school ID
- **Next Steps**: Assign school administrators to manage this school

#### View All Schools
- **Information Displayed**:
  - School name
  - School ID
  - Status (active, inactive)
  - Creation date
- **Edit/Delete**: For future implementation
- **Facilitator Count**: Shows how many facilitators are assigned

### 4. Facilitator Management
**Tab**: Facilitators

#### Create Facilitator User
- **Form Fields**:
  - Email address
  - School (dropdown, schools from database)
- **Process**:
  1. Admin selects school and enters email
  2. `createFacilitatorUser()` Cloud Function called
  3. User created in Firebase Authentication with temporary password
  4. Firestore document created at `/users/{uid}` with:
     - roles: ["facilitator"]
     - schoolId: {selected school}
  5. Facilitator profile created at `/schools/{schoolId}/facilitators/{uid}`
- **Response**: UID, email, temporary password, schoolId
- **Security**: Facilitators can only access their assigned school

#### View All Facilitators
- **Information Displayed**:
  - Email address
  - Assigned school
  - Status (active, pending)
  - Join date
- **School Isolation**: Facilitators from different schools cannot see each other's data

### 5. Family Management
**Tab**: Families

#### View All Families
- **Information Displayed**:
  - Family name
  - Family ID
  - Number of adult members
  - Number of children
  - Created date
- **Details**: Can drill down into family data for support/troubleshooting

## Cloud Functions (Backend)

### createAdminUser
**Location**: `functions/src/admin.ts`

```typescript
createAdminUser(data: {
  email: string;
  password: string;
}): {
  success: boolean;
  uid: string;
  email: string;
}
```

**Permissions**:
- Only callable by authenticated users
- Caller must have "admin" role
- Creates user in Firebase Auth
- Creates Firestore document with admin role

**Error Handling**:
- Validates email format
- Validates password length (min 6 characters)
- Returns clear error messages

### createFacilitatorUser
**Location**: `functions/src/admin.ts`

```typescript
createFacilitatorUser(data: {
  email: string;
  schoolId: string;
}): {
  success: boolean;
  uid: string;
  email: string;
  tempPassword: string;
  schoolId: string;
}
```

**Permissions**:
- Only callable by authenticated users
- Caller must have "admin" role
- Validates school exists in Firestore
- Creates facilitator profile in school subcollection

**Error Handling**:
- Validates school exists
- Generates secure temporary password
- Returns password for admin to communicate

### assignSchoolAdmin
**Location**: `functions/src/admin.ts`

```typescript
assignSchoolAdmin(data: {
  schoolId: string;
  adminUid: string;
}): {
  success: boolean;
  schoolId: string;
  adminUid: string;
}
```

**Permissions**:
- Only callable by authenticated users
- Caller must have "admin" role

**Effects**:
- Creates admin profile in school's admins subcollection
- Adds "schoolAdmin" role to user's roles array in Firestore

## Security Architecture

### Authentication Layers
1. **Firebase Auth**: Verifies user identity
2. **Firestore Rules**: Enforce collection-level security
3. **Role Verification**: Custom "admin" role check in beforeLoad hook
4. **Cloud Functions**: Server-side permission checks before operations

### Admin-Only Collections
- All admin operations protected by Firebase function permission checks
- Firestore rules prevent direct collection access from client
- Users can only create other users if they have admin role in Firestore

### Audit Trail
- All admin operations logged with:
  - `createdBy`: UID of admin who performed action
  - `createdAt`: Server timestamp
  - Operation type (e.g., "create admin", "create facilitator")

## Configuration

### Environment Variables
Admins need these Firebase/Functions configuration:

```env
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=demo-tati
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=
VITE_FIREBASE_FUNCTIONS_EMULATOR_HOST=localhost:5001  # Local development
```

### Firestore Rules
Admin protection is enforced by rules at `firestore.rules`:
- `isAdmin()` - checks user has admin role
- `requiresAdmin()` - enforces admin role in rule conditions
- Functions calls validate caller is admin

## Typical Admin Workflows

### Onboarding a New Administrator
1. Navigate to Admin Dashboard > Users tab
2. Click "Create Admin User"
3. Enter email and generate secure temporary password
4. Share login credentials with new admin
5. New admin logs in and resets password

### Setting Up a New School
1. Navigate to Admin Dashboard > Schools tab
2. Click "Create School"
3. Enter school name
4. School automatically activated
5. Proceed to assign school administrators

### Assigning Facilitators to Schools
1. Navigate to Admin Dashboard > Facilitators tab
2. Click "Create Facilitator"
3. Select school from dropdown
4. Enter facilitator email
5. Share temporary password with facilitator
6. Facilitator logs in and can begin managing children

### System Auditing
1. Navigate to Admin Dashboard > Overview
2. Review system statistics
3. Users tab: Check account statuses
4. Schools tab: Verify all schools are active
5. Families tab: Monitor family sign-ups and data

## Future Admin Features

Planned for implementation:
- [ ] Bulk user import (CSV)
- [ ] User role management (edit existing users)
- [ ] School administration assignment
- [ ] Facilitator reassignment
- [ ] System activity logs and audit reports
- [ ] Password reset for users
- [ ] Account deactivation
- [ ] Report generation (usage, completion rates)
- [ ] System health monitoring

## Troubleshooting

### Admin Can't Log In
- Verify user has "admin" role in `/users/{uid}/roles` array
- Check Firebase Authentication user exists
- Verify email is correct
- Ensure using `/admin-login` route, not regular `/login`

### Error: "You do not have admin privileges"
- User authenticated successfully but lacks admin role
- Admin must manually add "admin" to user's roles array in Firestore
- Verify user ID matches authentication UID

### School Won't Create
- Firestore write permissions issue
- Verify Firestore is accessible (emulator running in development)
- Check if school name is empty

### Facilitator Creation Fails
- Verify school exists and ID is correct
- Check email format is valid
- Ensure no duplicate email exists in Firebase Auth
- Verify functions are deployed correctly

## Support and Questions

For issues or questions about admin features:
1. Check Firestore rules at `firestore.rules`
2. Review Cloud Functions code at `functions/src/admin.ts`
3. Check browser console for error messages
4. Review server logs from Cloud Functions execution

---

**Last Updated**: [Current Date]
**Admin Version**: 1.0.0
**Compatibility**: TATI H3.4+
