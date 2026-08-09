# Wedding Friends Portal

A private, invite-only wedding community and budget tracker built with Next.js App Router, TypeScript, Tailwind CSS, Supabase PostgreSQL, Supabase Storage, and Recharts.

## Architecture

Next.js server routes are stateless. Persistent data is stored in Supabase PostgreSQL and uploaded images are stored in Supabase Storage. The service-role key is used only in server-side modules and is never exposed to browser code.

## What it includes
- Name + password authentication with exact normalized-name matching and forced first-login password changes.
- Roles: `SUPER_ADMIN` (Gokul), `ADMIN` (Surya), and `FRIEND`.
- Server-side authorization for admin actions, payment approval, profile updates, private proof access, and financial records.
- Supabase Storage uploads for profile photos, private payment proofs, and memory photos.
- Payment submission with image validation, private proof paths, pending/approved/rejected state machine, database idempotency keys, and atomic approval RPC.
- Expense tracking, persistent total budget setting, automatic budget/category totals, and audit logs.

## Database tables
- `app_users`: users, roles, password hashes, profile photo paths, required contributions, and profile metadata.
- `payments`: payment records, private proof storage paths, idempotency key, approval/rejection metadata.
- `expenses`: wedding spending records with soft-delete timestamp.
- `application_settings`: single persisted wedding budget row.
- `albums` / `photos`: memory photo organization.
- `audit_logs`: persisted action trail.
- `login_attempts`: database-backed login rate limiting.

## Local setup
1. Install dependencies: `npm install`.
2. Copy `.env.example` to `.env.local`.
3. Fill in Supabase URL/service-role key and a long random `SESSION_SECRET`.
4. Run the migration in `supabase/migrations/001_initial_schema.sql`.
5. Create the required private storage buckets.
6. Seed initial admins with hashed passwords using your secure seed process.
7. Start the app with `npm run dev`.

There is no production fallback to in-memory users. Missing Supabase configuration fails clearly.

## Required environment variables
- `NEXT_PUBLIC_SUPABASE_URL`: Supabase project URL.
- `SUPABASE_SERVICE_ROLE_KEY`: server-only key for trusted server routes.
- `SESSION_SECRET`: 32+ random characters for signed HTTP-only cookies.
- `INITIAL_GOKUL_PASSWORD` / `INITIAL_SURYA_PASSWORD`: only for your intentional admin seeding flow; do not commit real values.
- `NEXT_PUBLIC_APP_URL`: local or deployed app URL.

## Supabase setup
1. Create a Supabase project.
2. Run `supabase/migrations/001_initial_schema.sql`.
3. Create private buckets: `profile-photos`, `payment-proofs`, and `memory-photos`.
4. Keep `SUPABASE_SERVICE_ROLE_KEY` server-only.
5. Run `supabase/seed/seed.sql` only for development/demo budget and album data.
6. Create Gokul as `SUPER_ADMIN` and Surya as `ADMIN` with bcrypt-hashed passwords through an intentional seed script or SQL process that never stores plaintext passwords.

## Vercel deployment
1. Push this repository to GitHub.
2. Import the project in Vercel as a Next.js app.
3. Add all required environment variables in Vercel project settings.
4. Run Supabase migrations and create private buckets before first production login.
5. Deploy on Vercel HTTPS so secure cookies are used in production.

## Security decisions
- Password hashes are never returned by UI APIs.
- Sessions use signed HTTP-only cookies.
- Only `SUPER_ADMIN` can approve/reject payments, enforced server-side.
- Contributions and budget totals are derived from authoritative payment/expense rows.
- Payment approval uses an atomic PostgreSQL `UPDATE ... WHERE status='PENDING'` RPC.
- RLS is enabled and public browser access is not granted; server routes mediate authorization.

## Validation loop
Run `npm run lint`, `npm run typecheck`, `npm test`, `npm run test:e2e`, and `npm run build`.

## Testing note
Automated tests verify pure financial invariants and inspect the migration/source for the database-backed persistence, idempotency, RLS, and atomic transition requirements. Full Supabase integration/E2E tests require real test Supabase credentials and `RUN_SUPABASE_INTEGRATION=1`; they were not run without those credentials.
