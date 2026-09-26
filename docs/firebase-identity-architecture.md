# TATI Firebase Identity Architecture

Phase D is architecture and contract preparation only. Supabase remains the active provider. No Firebase Auth cutover, Firestore repository, Cloud Function deployment, user migration, or route change is part of this phase.

## Adult Authentication

Parents, guardians, facilitators, and admins are adult identities and will eventually use Firebase Authentication.

MVP providers:

- Email/password for the existing parent account flow.
- Google OAuth only if the existing OAuth product requirement remains enabled during the Firebase cutover.

The adult session is represented by the Firebase Auth ID token and refreshed by the Firebase client SDK. Server calls must verify the token before using its UID. Logout clears the client session and invalidates server-side cached identity; password reset and email verification are Firebase Auth operations.

Account status is application data, not a client-controlled field:

- `pending`: account setup or email verification is incomplete.
- `active`: normal access is allowed.
- `disabled`: sign-in or protected operations are rejected.

The existing Supabase login, signup, OAuth, middleware, and route guards remain active until a later cutover.

## Adult Roles

Adult roles are:

- `parent`
- `guardian`
- `facilitator`
- `admin`

Use a hybrid model:

- Firebase custom claims for coarse authorization checks needed by server functions and rules.
- `users/{uid}` for profile, status, audit metadata, and role display data.
- Family membership documents for family-scoped roles such as parent and guardian.

Clients must never assign or revoke roles. Role changes go through trusted server code and update claims and Firestore membership data together. Claims are not the source of family membership; membership documents remain authoritative for family access.

## Family Authorization

Target shape:

```text
users/{uid}
families/{familyId}
families/{familyId}/members/{uid}
families/{familyId}/children/{childId}
```

Rules:

- A user can belong to multiple families only if the product later requires it.
- A child belongs to exactly one family in the MVP.
- A family can contain multiple adult members and multiple children.
- Parent and guardian access requires an active membership document.
- Facilitator access requires an explicit assignment document or server-side assignment check.
- Admin access requires the admin role; it is not inferred from family membership.
- Every child-specific read/write is scoped through the child document's family ID.

## Child Authentication

Children do not receive Firebase Auth accounts.

The existing model remains:

```text
TATI ID + PIN
  -> trusted server verification
  -> child profile resolution
  -> short-lived child session
  -> server-derived child identity
```

Requirements:

- Store only a salted PIN hash.
- Never return PIN hashes to the browser.
- Return one generic failure for unknown TATI IDs, invalid PINs, inactive credentials, and revoked credentials.
- Rate-limit failed attempts in the trusted server boundary.
- Store session state server-side and expose only an HttpOnly session cookie to the browser.
- Enforce expiry and revocation on every child operation.
- Resolve the child from the session, never from a URL or request body.
- Do not create a Firebase Auth UID for a child.

The current Supabase child session behavior remains unchanged until a later Firebase server implementation.

## Authorization Matrix

| Resource             | Parent/Guardian                                               | Facilitator                                                        | Admin                       | Child                                         |
| -------------------- | ------------------------------------------------------------- | ------------------------------------------------------------------ | --------------------------- | --------------------------------------------- |
| Own user profile     | View/update own                                               | View/update own                                                    | View/update own             | No adult profile                              |
| Family               | View/manage member family within membership                   | No general family access                                           | View/manage as authorized   | No direct access                              |
| Family members       | View family members; manage only permitted membership actions | No                                                                 | Manage                      | No                                            |
| Child profiles       | View/create/update children in own family                     | View assigned children only                                        | Manage as authorized        | View own profile only                         |
| Journey progress     | View/manage children in own family                            | View assigned children; write only permitted observations/progress | Manage/report               | Read/write own journey through child session  |
| Assessments          | View children in own family                                   | View assigned children; launch/record assigned work                | Manage/report               | Complete/read own assessment only             |
| Assessment responses | View family child responses                                   | View assigned child responses                                      | Manage/report               | Create/read own responses only                |
| Scenarios            | View family child results                                     | View assigned child results                                        | Manage/report               | Run/read own scenarios only                   |
| Scenario sessions    | View family child sessions                                    | View assigned child sessions                                       | Manage/report               | Own session only                              |
| Scenario decisions   | View family child decisions                                   | View assigned child decisions                                      | Manage/report               | Own decisions only                            |
| Achievements         | View family child achievements                                | View assigned child achievements                                   | Manage/report               | Own achievements only                         |
| Competencies         | View family child competencies                                | View assigned child competencies                                   | Manage/report               | Own competency view only                      |
| Parent insights      | View family child insights                                    | No parent-private access unless explicitly authorized              | Manage/report               | No parent-private content                     |
| Feedback             | Submit and view own; review only if authorized                | Submit/view permitted feedback                                     | Review/manage as authorized | Submit child feedback; no broad review access |
| Analytics            | No raw global analytics                                       | No raw global analytics                                            | Aggregate/review access     | No analytics access                           |

Role assignment is server-only for every adult role.

## Client vs Server Boundary

### Direct Firebase SDK and Firestore Rules

Suitable for later implementation:

- Reading the signed-in user's own profile.
- Reading family membership documents where rules can prove membership.
- Reading family child summaries where the family path proves ownership.
- Low-risk parent-facing reads with immutable ownership paths.

### Trusted server/Cloud Functions

Required for:

- Role assignment and claim updates.
- Admin operations.
- Child TATI ID/PIN verification.
- Child session creation, validation, expiry, and revocation.
- Child progress and assessment writes where the child identity comes from the session.
- Cross-document writes requiring atomic ownership checks.
- Facilitator assignment checks.
- Sensitive analytics and reporting.
- Any operation that must not trust a client-supplied user ID, family ID, or child ID.

## Phase E Requirements

Before Firebase Auth implementation begins, decide and configure:

- Firebase Auth providers and authorized domains.
- Email verification policy.
- Password reset UX and email templates.
- Google OAuth redirect configuration, if retained.
- Firebase Admin SDK deployment-secret mechanism.
- Custom claim refresh and role-change propagation.
- Cloud Functions runtime and rate-limiting store.
- Child session cookie signing/storage strategy.
- Emulator coverage for adult roles, family isolation, facilitator assignments, and child isolation.
