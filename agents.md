# Wedding Friends Portal — Master Codex Build Specification

## 1. PROJECT OBJECTIVE

Build a private, invite-only web application for a group of friends attending and organizing a wedding.

The application should feel like a modern Netflix-inspired private community website:

* Dark, cinematic UI
* Large profile images
* Horizontal scrolling carousels
* Smooth animations
* Responsive design
* Mobile-first usability
* Desktop support
* Private authentication
* Friend profiles
* Shared memories/photos
* Wedding budget tracking
* Individual contribution tracking
* Payment submission and approval
* Admin dashboard

This is a temporary wedding website, but it must still be technically reliable and able to support many users accessing it simultaneously.

Do not over-engineer it into microservices or enterprise architecture.

Prefer a simple, maintainable monolithic Next.js application with a managed PostgreSQL database and object storage.

---

# 2. TECHNOLOGY REQUIREMENTS

Use:

* Next.js
* TypeScript
* App Router
* Tailwind CSS
* Supabase PostgreSQL
* Supabase Storage for images
* Recharts or another lightweight charting library
* Vercel deployment

Use the current stable versions compatible with the environment.

Before installing dependencies, inspect the repository and existing package configuration.

Do not introduce unnecessary libraries.

Do not use:

* Java/Spring Boot
* Microservices
* Kafka
* Redis
* Kubernetes
* Docker unless required by the development environment
* Separate backend server
* Unnecessary state-management frameworks
* Unnecessary authentication providers

Keep the architecture simple.

---

# 3. USER ROLES

There are exactly three application roles.

## SUPER_ADMIN

Gokul.

Capabilities:

* Everything an ADMIN can do
* Approve payments
* Reject payments
* Create friends
* Generate/reset temporary passwords
* Modify contribution amounts
* Manage expenses
* Manage photos
* Manage albums
* Manage profiles
* View audit logs
* Manage application settings if necessary

## ADMIN

Surya.

Capabilities:

* Create friends
* Generate/reset temporary passwords
* Manage friend profiles
* Upload/manage photos
* Manage albums
* Add/edit/delete expenses
* View budget
* View payment information necessary for administration

Restrictions:

* MUST NOT approve payments
* MUST NOT reject payments
* MUST NOT modify payment approval state

Only SUPER_ADMIN can approve or reject payments.

## FRIEND

All other users.

Capabilities:

* Log in
* View home page
* View public friend profiles
* Edit their own profile photo
* Edit allowed portions of their own profile
* View their own contribution
* View their own payment history
* Submit a payment
* Upload payment proof
* View payment status

Restrictions:

* Cannot create users
* Cannot create expenses
* Cannot modify expenses
* Cannot approve payments
* Cannot reject payments
* Cannot modify their required contribution
* Cannot modify approved payments
* Cannot access another friend's private financial information
* Cannot access admin functionality

---

# 4. INITIAL ADMIN USERS

The application must support bootstrapping the two administrators.

Required administrators:

* Gokul → SUPER_ADMIN
* Surya → ADMIN

Do not hard-code administrator passwords into source code.

Provide a secure initial setup/seed mechanism using environment variables or a documented setup process.

Passwords must never be stored in plaintext.

---

# 5. AUTHENTICATION

Authentication intentionally uses only:

* Name
* Password

There is NO:

* Email
* Username
* Phone number
* OTP
* Social login
* Email verification

## Name matching

Name matching must be:

* Case-insensitive
* Whitespace-normalized
* Exact after normalization

Examples:

"Gokul"

"gokul"

"GOKUL"

" GoKuL "

must resolve to the same account.

However, partial matching is NOT allowed.

For example:

"go"

must not match:

"Gokul"

Reason: partial matching creates ambiguity and security problems.

Store a normalized name field for reliable lookup.

Recommended normalization:

* trim leading/trailing whitespace
* convert to lowercase
* collapse repeated whitespace where appropriate

The normalized name must have a unique database constraint.

---

# 6. PASSWORD SECURITY

Passwords must be securely hashed.

Never store plaintext passwords.

Never store temporary passwords in the database as plaintext.

Use a secure password hashing mechanism appropriate for the selected authentication implementation.

Use secure HTTP-only session cookies or the appropriate secure authentication/session mechanism.

Do not expose password hashes to the client.

Do not put secrets in client-side environment variables.

---

# 7. FIRST LOGIN FLOW

When an administrator creates a friend account:

Example:

Name:

Rahul

The account is created with:

* role = FRIEND
* must_change_password = true

The administrator can click:

"Generate Temporary Password"

The system generates a cryptographically secure random temporary password.

Example:

R7kP92Lm

The temporary password should be displayed to the administrator so they can communicate it to the friend.

Do not persist the plaintext temporary password.

Store only the secure hash.

The friend logs in using:

Name + temporary password.

If must_change_password = true:

DO NOT allow access to the normal application.

Redirect to:

/change-password

The friend must create a new password.

After successful password change:

must_change_password = false

The temporary password becomes invalid because the password hash has been replaced.

---

# 8. PASSWORD RESET

Because there is no email system, password recovery is administrator-controlled.

Admin can select:

"Reset Password"

System generates a new temporary password.

Set:

must_change_password = true

The user must change the password after login.

Do not implement email password recovery.

---

# 9. FRIEND PROFILE

Each friend profile should contain at minimum:

* Name
* Profile photo
* Optional bio
* Role

A friend can change their own profile photo.

A friend MUST NOT be able to change:

* Name
* Role
* Required contribution
* Payment records
* Approval status

Administrators can manage profiles.

Images must be stored in object storage, not directly in PostgreSQL.

The database should store the image/storage reference.

Validate uploaded images:

* File type
* File size
* Reasonable dimensions
* Reject unsupported files

Prevent arbitrary file uploads.

---

# 10. HOME PAGE

The home page is shared by all users, with personal financial information shown according to the logged-in user.

The page should include:

## Hero section

Wedding-themed cinematic hero area.

## Friends carousel

Horizontally scrolling friend profiles.

Show:

* Profile photo
* Name
* Optional short bio

The carousel must work with many friends.

Do not render all images at maximum resolution simultaneously.

Use responsive image loading and appropriate image sizing.

## Wedding budget summary

Show:

* Total budget
* Total approved expenses
* Remaining budget

These values must be calculated from database data.

Do not maintain duplicate manually updated totals.

## Expense chart

Show spending by category.

Example:

* Food
* Accommodation
* Transportation
* Decoration
* Music
* Photography
* Gifts
* Miscellaneous

The chart must be generated from expense records.

## My contribution

For the logged-in friend:

* Required contribution
* Approved amount paid
* Pending amount
* Remaining amount

For administrators, show their own contribution if applicable.

---

# 11. FINANCIAL DATA MODEL — IMPORTANT

Never maintain manually editable derived financial values.

For a user:

required contribution = configured contribution amount

approved paid amount = SUM of APPROVED payments for that user

pending amount = SUM of PENDING payments for that user

remaining amount = required contribution - approved paid amount

Do not store:

paid_amount

remaining_amount

as manually editable authoritative fields.

They must be derived from payment records.

This ensures that an approved payment automatically updates:

* Paid amount
* Remaining amount
* Contribution progress
* Dashboard statistics

No synchronization button should exist.

No background job should be required for this.

---

# 12. CONTRIBUTION

Each user may have a required contribution amount.

Example:

Rahul:

Required = ₹10,000

This amount is managed by administrators.

Friends cannot change it.

SUPER_ADMIN and ADMIN may manage contribution values as appropriate.

---

# 13. PAYMENT SUBMISSION

A friend can submit a payment.

Form:

* Amount
* Payment screenshot
* Optional notes

Optionally support:

* Payment method
* Transaction/reference ID

Validate:

* Amount must be positive
* Amount must be within reasonable limits
* Screenshot must be a valid image
* File size must be limited
* User must be authenticated
* User can submit only for themselves

When submitted:

status = PENDING

Do NOT increase the user's approved paid amount.

---

# 14. PAYMENT STATE MACHINE

Payment states:

PENDING

APPROVED

REJECTED

Allowed transitions:

PENDING → APPROVED

PENDING → REJECTED

REJECTED → PENDING

Do not allow:

APPROVED → PENDING

APPROVED → REJECTED

unless an explicit future administrative correction feature is implemented.

For V1, approved payments are immutable.

---

# 15. PAYMENT APPROVAL

Only Gokul / SUPER_ADMIN can approve or reject payments.

The approval operation must be enforced server-side.

Do NOT rely only on hiding UI buttons.

When SUPER_ADMIN approves a payment:

Within the same logical operation:

payment.status becomes APPROVED

approved_at is recorded

approved_by is recorded

The user's contribution calculations automatically reflect the approved payment.

The system must not require a second update operation.

The approval operation should be atomic.

Prevent double approval caused by:

* double clicking
* simultaneous requests
* browser retries
* duplicate API requests

The server must verify the payment's current state before approving.

---

# 16. PAYMENT REJECTION

Only SUPER_ADMIN can reject.

When rejected:

* status = REJECTED
* rejection reason should be recorded
* rejected_at should be recorded if appropriate
* rejected_by should be recorded if appropriate

The user's approved amount must NOT change.

The friend can see the rejection status and reason.

The friend may submit a new payment.

---

# 17. PAYMENT SCREENSHOT STORAGE

Payment screenshots must be stored in private object storage.

Do not make financial proof images publicly accessible.

Use authenticated/authorized access to retrieve them.

A friend can only access their own payment screenshots.

Administrators can access payment screenshots according to their role.

Only SUPER_ADMIN can perform approval/rejection.

Do not expose storage credentials to the browser.

---

# 18. EXPENSE TRACKING

Administrators can create expenses.

Expense fields:

* Amount
* Category
* Description
* Notes
* Created by
* Created timestamp

Timestamp must be generated server-side.

Do not trust the client's timestamp.

Example:

Amount:

₹12,500

Category:

Food

Description:

Dinner catering

Notes:

Advance payment

The system records created_at automatically.

---

# 19. EXPENSE CALCULATIONS

Total spent:

SUM(all valid expense amounts)

Remaining budget:

total budget - total spent

Category spending:

GROUP BY category

Do not manually update these totals.

If Gokul adds:

Food ₹5,000

the dashboard must automatically reflect the new amount.

---

# 20. EXPENSE EDITING

Administrators may edit or delete expenses.

All modifications should be validated server-side.

Because financial records are involved, maintain an audit record for:

* create
* update
* delete

If practical, prefer soft deletion for financial records rather than permanently deleting them.

Do not silently lose financial history.

---

# 21. BUDGET DASHBOARD

Admin dashboard must show:

* Total budget
* Total spent
* Remaining budget
* Spending by category
* Recent expenses
* Payment approvals pending
* Total contributions received
* Pending contributions

Provide useful charts:

* Donut/pie chart by category
* Optional spending-over-time chart
* Contribution progress

Avoid excessive charts.

Prioritize readability.

---

# 22. PHOTOS AND MEMORIES

Administrators can upload:

* Friend profile photos
* Wedding photos
* Memory photos

Support albums/categories.

Example:

* Wedding Prep
* College Days
* Trips
* Friends
* Random Chaos

Home page can display horizontal photo carousels.

Images must be optimized.

Use object storage.

Do not store image binaries in PostgreSQL.

Support deletion and management by authorized administrators.

---

# 23. ADMIN DASHBOARD

Create a clear admin dashboard.

Sections:

Dashboard

Friends

Payments

Expenses

Photos

Albums

Activity/Audit

## Friends

Admin can:

* Create friend
* View friend
* Edit profile
* Change contribution
* Generate temporary password
* Reset password
* Manage profile photo

## Payments

SUPER_ADMIN:

* View pending
* View payment screenshot
* Approve
* Reject

ADMIN:

* View payment information as permitted
* Cannot approve
* Cannot reject

## Expenses

Admin can:

* Add
* Edit
* Delete/soft-delete
* View history

## Photos

Admin can:

* Upload
* Delete
* Organize albums

---

# 24. AUTHORIZATION

Authorization must be enforced server-side.

Every protected operation must verify:

1. User is authenticated.
2. User has required role.
3. User is allowed to access the requested resource.

Examples:

A FRIEND requesting another friend's payment:

→ DENY

A FRIEND calling an expense creation endpoint:

→ DENY

SURYA attempting payment approval:

→ DENY

GOKUL approving payment:

→ ALLOW

A friend editing another friend's profile:

→ DENY

A friend editing their own profile photo:

→ ALLOW

Do not depend on client-side UI restrictions.

---

# 25. DATABASE SECURITY

Use database-level security policies where appropriate, especially for Supabase access.

Do not assume that application UI restrictions are sufficient.

Review all database access paths.

Ensure a user cannot bypass the application UI and query another user's private data.

Use server-side privileged access only where required.

Keep privileged credentials server-only.

---

# 26. CONCURRENCY AND MULTI-USER REQUIREMENTS

This is important.

The application may have many friends using it at the same time.

Design database operations safely.

Examples:

* Multiple friends may submit payments simultaneously.
* Multiple admins may add expenses simultaneously.
* Gokul may approve a payment while another request attempts to modify it.
* A user may double-click Submit.
* A browser may retry a request.
* Multiple users may upload photos simultaneously.

Do not depend on in-memory variables.

Do not maintain application state that must be shared between server instances.

All authoritative state must live in the database/object storage.

Use database constraints and transactions where appropriate.

Prevent duplicate operations where necessary.

---

# 27. PAYMENT IDEMPOTENCY

Payment submission must protect against duplicate submissions.

If a user double-clicks the submit button or the browser retries the request, the same payment should not accidentally be created twice.

Implement appropriate server-side protection.

Use a client-generated idempotency key or equivalent mechanism where appropriate.

Do not rely only on disabling the submit button in React.

---

# 28. DATABASE CONSTRAINTS

Use database constraints for important invariants.

Examples:

* Normalized user name must be unique.
* Payment amount must be positive.
* Required contribution must not be negative.
* Expense amount must be positive.
* Role must be valid.
* Payment status must be valid.

Do not rely only on frontend validation.

---

# 29. INPUT VALIDATION

Validate every user-controlled input server-side.

Validate:

* Names
* Passwords
* Amounts
* Notes
* Descriptions
* Categories
* File uploads
* IDs
* Query parameters

Reject malformed input.

Do not trust data sent by the browser.

Use a validation library if useful, but do not add one unnecessarily.

---

# 30. SECURITY REQUIREMENTS

Protect against:

* Unauthorized access
* Privilege escalation
* IDOR/insecure direct object references
* SQL injection
* XSS
* CSRF where relevant
* Unsafe file uploads
* Excessive file sizes
* Exposed secrets
* Client-side authorization bypass
* Manipulation of payment status
* Manipulation of contribution amounts

Never trust client-provided:

* user ID
* role
* payment approval state
* approved amount
* created_by
* timestamps
* contribution amount

Derive these server-side.

---

# 31. RATE LIMITING

Because authentication uses only names and passwords, implement reasonable rate limiting for login attempts.

Protect against brute-force attempts.

Do not make the login system unnecessarily complicated.

Use a simple approach compatible with the selected deployment/database architecture.

---

# 32. SESSION SECURITY

Sessions must:

* Be server-verifiable
* Use secure cookies
* Be HTTP-only
* Have appropriate expiration
* Not expose secrets to JavaScript unnecessarily

Logout must invalidate the session appropriately.

---

# 33. UI REQUIREMENTS

Design should feel premium.

Visual direction:

* Netflix-inspired
* Dark theme
* Cinematic
* Large imagery
* Rounded cards
* Subtle gradients
* Smooth transitions
* Horizontal scrolling
* Responsive
* Modern typography

Do NOT copy Netflix branding, logos, exact UI, or copyrighted assets.

The design should be original but inspired by the concept of a streaming-service interface.

---

# 34. MOBILE FIRST

The application must work properly on:

* Mobile phones
* Tablets
* Desktop

Pay particular attention to:

* Touch-friendly buttons
* Horizontal carousels
* Image sizes
* Payment forms
* Admin tables
* Charts

Admin pages should remain usable on mobile.

---

# 35. LOADING AND ERROR STATES

Every asynchronous operation needs proper states.

Examples:

Login:

Loading → Success/Error

Payment submission:

Uploading → Processing → Success/Error

Photo upload:

Uploading → Success/Error

Payment approval:

Approving → Approved/Error

Expense creation:

Saving → Success/Error

Do not allow accidental duplicate actions while an operation is in progress.

---

# 36. ERROR HANDLING

Do not expose raw server/database errors to users.

Show useful messages.

Example:

Bad:

"PostgrestError: duplicate key violates unique constraint..."

Good:

"A profile with this name already exists."

Log detailed errors server-side.

---

# 37. AUDIT LOG

Record important actions.

Examples:

* User created
* Password reset
* Profile updated
* Payment submitted
* Payment approved
* Payment rejected
* Expense created
* Expense updated
* Expense deleted
* Photo uploaded
* Photo deleted

Audit record should include:

* Actor
* Action
* Entity type
* Entity ID
* Timestamp
* Relevant metadata

Audit timestamps must be server/database generated.

---

# 38. IMPORTANT FINANCIAL INVARIANTS

These must always remain true.

For each user:

approved_paid =
SUM(payment.amount WHERE status = APPROVED)

remaining =
required_contribution - approved_paid

Pending payments do not count as paid.

Rejected payments do not count as paid.

For the wedding budget:

total_spent =
SUM(valid expenses)

remaining_budget =
total_budget - total_spent

Never maintain duplicate manually editable totals.

---

# 39. TESTING REQUIREMENTS

Do not consider the project complete merely because it builds.

Create automated tests for critical business logic.

At minimum test:

## Authentication

* Valid login
* Invalid password
* Case-insensitive name
* Whitespace normalization
* Duplicate normalized name
* First login
* Password change
* Reset password
* Logout

## Authorization

* Friend cannot access admin
* Friend cannot access another friend's payment
* Friend cannot approve
* Surya cannot approve
* Gokul can approve

## Payments

* Submit payment
* Duplicate submission protection
* Pending payment does not affect paid amount
* Approved payment affects paid amount
* Rejected payment does not affect paid amount
* Remaining amount updates automatically
* Double approval is prevented

## Expenses

* Create expense
* Edit expense
* Delete/soft delete expense
* Total updates automatically
* Category totals update automatically

## Profiles

* User can change own photo
* User cannot change another user's photo
* User cannot change own role/contribution

## File uploads

* Valid image accepted
* Unsupported file rejected
* Oversized file rejected
* Unauthorized access denied

---

# 40. END-TO-END TEST SCENARIO

The project must include an end-to-end test covering this complete scenario:

1. Create Rahul.
2. Assign contribution ₹10,000.
3. Generate temporary password.
4. Login as Rahul.
5. Verify forced password change.
6. Change password.
7. Upload Rahul's profile photo.
8. Verify photo appears.
9. Submit ₹4,000 payment with screenshot.
10. Verify payment is PENDING.
11. Verify Rahul's approved paid amount remains ₹0.
12. Login as Surya.
13. Verify Surya cannot approve payment.
14. Login as Gokul.
15. View pending payment.
16. View screenshot.
17. Approve payment.
18. Verify payment becomes APPROVED.
19. Verify Rahul's paid amount automatically becomes ₹4,000.
20. Verify Rahul's remaining contribution becomes ₹6,000.
21. Add a ₹20,000 food expense.
22. Verify total spending increases automatically.
23. Verify food category chart updates.
24. Verify remaining wedding budget updates.
25. Verify audit logs were created.

---

# 41. PERFORMANCE

This is a multi-user website.

Do not implement inefficient patterns such as:

* Fetching all users repeatedly
* Fetching full-resolution images unnecessarily
* N+1 database queries
* Loading all photos at maximum resolution
* Recalculating huge datasets in the browser
* Polling aggressively
* Storing shared state in server memory

Use:

* Database aggregation
* Pagination where appropriate
* Lazy loading
* Responsive images
* Proper indexes
* Efficient queries
* Server-side authorization
* Appropriate caching where safe

The application should comfortably support the expected wedding friend group and substantially more users without architectural changes.

Do not optimize prematurely, but do not create obviously non-scalable implementations.

---

# 42. DATABASE INDEXES

Add indexes for frequently queried fields.

At minimum consider:

users.name_normalized

payments.user_id

payments.status

payments.created_at

expenses.category

expenses.created_at

photos.album_id

audit_logs.created_at

Create indexes based on actual query patterns rather than blindly indexing every column.

---

# 43. IMAGE PERFORMANCE

Images are expected to be a significant part of this application.

Use:

* Next.js Image where appropriate
* Object storage
* Appropriate image dimensions
* Lazy loading
* Thumbnails where appropriate
* Avoid loading original high-resolution images into carousels

Profile carousel should remain smooth with many users.

---

# 44. NO SECRET EXPOSURE

Review:

* .env files
* client bundles
* source code
* Git history
* API responses

Never expose:

* Database service-role keys
* Password hashes
* Private storage credentials
* Authentication secrets

Only public client-safe variables may be exposed to the browser.

---

# 45. ENVIRONMENT CONFIGURATION

Create:

.env.example

Document all required environment variables.

Do not commit actual secrets.

README must explain:

1. Create Supabase project.
2. Configure database.
3. Configure storage.
4. Configure environment variables.
5. Run migrations.
6. Seed initial admins.
7. Start development server.
8. Deploy to Vercel.

---

# 46. DATABASE MIGRATIONS

Use proper migration files.

Do not rely on manually clicking around the Supabase dashboard to create the production schema.

The repository must contain reproducible database setup.

A fresh Supabase project should be able to recreate the database from migrations.

---

# 47. SEED DATA

Provide development seed data.

Include:

* Gokul
* Surya
* Several example friends
* Example expenses
* Example payment records
* Example albums/photos if practical

Do not use real production passwords in seed data.

Clearly document development credentials.

---

# 48. README

Create a beginner-friendly README explaining:

* What the application does
* Architecture
* Folder structure
* Database structure
* Authentication
* Roles
* Payment flow
* Expense flow
* Image storage
* Local development
* Supabase setup
* Environment variables
* Database migrations
* Seed data
* Vercel deployment
* How to create/reset users
* How to troubleshoot common problems

Explain technical concepts in simple language.

---

# 49. CODE QUALITY

This project will be maintained by a beginner.

Therefore:

* Prefer readable code.
* Prefer explicit code.
* Avoid unnecessary abstractions.
* Avoid premature design patterns.
* Avoid deeply nested architecture.
* Avoid clever one-liners when they reduce readability.
* Use meaningful names.
* Keep components reasonably small.
* Keep business logic separate from presentation where practical.
* Add comments only where they explain non-obvious business logic.

Do not create unnecessary abstraction layers.

---

# 50. DEVELOPMENT LOOP

Do NOT stop after implementing the first version.

Follow this loop:

PLAN

↓

Inspect repository

↓

Implement

↓

Run formatting

↓

Run lint

↓

Run TypeScript/type checks

↓

Run unit tests

↓

Run integration tests

↓

Run end-to-end tests

↓

Run production build

↓

Inspect generated application

↓

Review authorization

↓

Review financial calculations

↓

Review concurrency behavior

↓

Review file upload/security behavior

↓

Fix every issue discovered

↓

Run all checks again

↓

Repeat until clean

Do not declare completion simply because the application compiles.

---

# 51. SELF-REVIEW CHECKLIST

Before declaring the project complete, perform a dedicated review for:

### Authentication

* Can an unauthorized user bypass login?
* Can partial names cause account confusion?
* Can a temporary password be reused after password change?
* Are passwords hashed?
* Are sessions secure?

### Authorization

* Can FRIEND call admin APIs directly?
* Can SURYA approve payments directly through an API request?
* Can a FRIEND modify another user's data?
* Can a FRIEND manipulate user IDs in requests?

### Payments

* Can a payment be approved twice?
* Can a FRIEND mark their own payment approved?
* Can pending payments incorrectly increase paid amount?
* Can rejected payments affect balances?
* Can double submission create duplicate payments?

### Money

* Are all totals derived from authoritative records?
* Can a user manipulate amounts through browser requests?
* Are financial operations transactional where required?

### Storage

* Can users access private payment screenshots belonging to others?
* Can users upload executable files?
* Are file sizes restricted?

### Database

* Are important constraints present?
* Are common queries indexed?
* Are migrations reproducible?

### Performance

* Are images optimized?
* Are queries efficient?
* Are there N+1 queries?
* Is the application dependent on server memory for shared state?

### UI

* Does mobile work?
* Are loading states present?
* Are error states useful?
* Can buttons be double-clicked into duplicate operations?

---

# 52. BROWSER/REAL APPLICATION TESTING

If browser automation or visual inspection is available in the environment, use it.

Do not only inspect source code.

Actually exercise:

* Login
* Password change
* Friend creation
* Profile photo upload
* Payment submission
* Payment approval
* Expense creation
* Dashboard
* Mobile layout
* Admin authorization

Inspect screenshots where useful.

Fix visual and functional issues found.

---

# 53. FINAL COMPLETION CRITERIA

The project is NOT complete until:

* Application builds successfully.
* TypeScript passes.
* Lint passes.
* Tests pass.
* Critical end-to-end flows pass.
* Database migrations work from a clean database.
* Authentication works.
* Authorization works server-side.
* Payment workflow works.
* Automatic financial calculations work.
* Image upload works.
* Admin roles work.
* Mobile UI works.
* No known critical security issue remains.
* No secrets are committed.
* README is complete.
* .env.example exists.

At the end, provide a concise report containing:

1. What was built.
2. Architecture.
3. Database tables.
4. Important security decisions.
5. Tests executed.
6. Test results.
7. Any remaining known limitations.
8. Exact steps required for Vercel deployment.
9. Any manual Supabase configuration still required.

Do not claim something was tested if it was not actually tested.

Do not claim deployment succeeded unless it was actually verified.

---

# 54. IMPORTANT WORKING RULE

If you encounter an ambiguity:

1. First inspect the existing requirements and code.
2. Choose the simplest behavior consistent with the specification.
3. Do not silently invent major functionality.
4. Document the assumption.
5. Continue implementation when the assumption is low-risk.
6. Only stop and ask for clarification when the ambiguity could materially affect security, financial correctness, data integrity, or architecture.

The goal is a complete, reliable, simple application — not maximum complexity.

Build the application end-to-end and continuously validate your work.
