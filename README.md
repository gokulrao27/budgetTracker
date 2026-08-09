# Wedding Friends Portal

A private, invite-only wedding community and budget tracker built with Next.js App Router, TypeScript, Tailwind CSS, Supabase PostgreSQL/Storage, and Recharts.

## What it includes
- Name + password authentication with normalized names and forced first-login password changes.
- Roles: `SUPER_ADMIN` (Gokul), `ADMIN` (Surya), and `FRIEND`.
- Server-side authorization for admin actions, payment approval, profile updates, and financial records.
- Friend carousel, cinematic dark UI, dashboard cards, contribution progress, and expense category charts.
- Payment submission with image validation, private proof paths, pending/approved/rejected state machine, and idempotency keys.
- Expense tracking with soft-delete-ready schema, automatic budget totals, category totals, and audit logs.
- Reproducible Supabase migration and seed documentation.

## Local setup
1. Install dependencies: `npm install`.
2. Copy `.env.example` to `.env.local` and fill in values.
3. Run development server: `npm run dev`.
4. Open `http://localhost:3000`.

Development fallback credentials are only used when no database has been wired: `Gokul / GokulDev123!` and `Surya / SuryaDev123!`. Replace with environment variables before real use.

## Supabase setup
1. Create a Supabase project.
2. In SQL editor or Supabase CLI, run `supabase/migrations/001_initial_schema.sql`.
3. Create private buckets: `profile-photos`, `payment-proofs`, and `memory-photos`.
4. Keep `SUPABASE_SERVICE_ROLE_KEY` server-only in `.env.local` and Vercel environment variables.
5. Use environment passwords `INITIAL_GOKUL_PASSWORD` and `INITIAL_SURYA_PASSWORD` during seeding; never commit real passwords.

## Vercel deployment
1. Push this repository to GitHub.
2. Import it in Vercel as a Next.js project.
3. Add `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SESSION_SECRET`, `INITIAL_GOKUL_PASSWORD`, and `INITIAL_SURYA_PASSWORD`.
4. Run Supabase migrations before first production login.
5. Deploy. Use Vercel HTTPS so session cookies are secure in production.

## Database tables
- `app_users`: users, roles, password hashes, profile photo paths, required contributions.
- `payments`: payment records, proof paths, idempotency key, and immutable approval fields.
- `expenses`: financial expenses with creator and soft-delete timestamp.
- `albums` / `photos`: memory photo organization.
- `audit_logs`: security and financial action trail.

## Security notes
- Passwords are bcrypt hashed; plaintext temporary passwords are shown once and not stored.
- Sessions use signed HTTP-only cookies.
- Only `SUPER_ADMIN` can approve or reject payments, enforced server-side.
- Financial totals are derived from payment and expense records, never manually edited totals.
- Supabase RLS migration defaults tables to service-role-only access because the app performs authorization on the server.

## Validation loop
Run: `npm run lint`, `npm run typecheck`, `npm test`, `npm run test:e2e`, and `npm run build`.
