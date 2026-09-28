# EXAMSAARTHI V2 - PRODUCTION DEPLOYMENT CHECKLIST

Ensure the following steps are verified before deploying to Vercel/Production.

## Environment Variables

**Client-Side (Safe for Browser):**

- [ ] `NEXT_PUBLIC_SUPABASE_URL` is set to the production Supabase project URL.
- [ ] `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` is set to the production Supabase `anon` / publishable key.

**Server-Side (STRICTLY CONFIDENTIAL):**

- [ ] `SUPABASE_SECRET_KEY` is set to the production Supabase `service_role` key.
- [ ] **Critical:** Verify `SUPABASE_SECRET_KEY` does NOT have the `NEXT_PUBLIC_` prefix.

## Security Validations

- [ ] No secrets are hardcoded in the codebase.
- [ ] `.env.local` is present in `.gitignore` and has not been committed.
- [ ] `adminClient` is exclusively used within `'use server'` files (e.g., `actions.ts`).

## Database Configuration (Supabase Dashboard)

- [ ] Production database has all required migrations through `00012_practice_subjects.sql` successfully applied.
- [ ] Row Level Security (RLS) is ENFORCED on `profiles`, `exams`, `questions`, `exam_sessions`, `answers`, `audit_logs`, and `question_answers`.
- [ ] Auth Email Templates use the PKCE configuration: **Magic Link:** `{{ .RedirectTo }}?token_hash={{ .TokenHash }}&type=email`; **Confirm Signup:** `{{ .RedirectTo }}?token_hash={{ .TokenHash }}&type=signup`.

## Build Verification

- [ ] `npm run typecheck` passes cleanly.
- [ ] `npm run lint` passes cleanly.
- [ ] `npm run build` generates static/dynamic routes successfully without build errors.
