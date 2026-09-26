# ARCHITECTURE & DESIGN DECISIONS

1. **Profile Provisioning (September 2026)**
   - *Problem:* Supabase Auth does not automatically create `profiles` rows for new PKCE magic link users. Starting an exam throws Foreign Key RLS violation because `exam_sessions` requires a valid candidate profile.
   - *Decision:* Implemented `ensureCandidateProfile` in `actions.ts`. We use `createAdminClient` (server-side ONLY) to bypass the missing INSERT policy on `profiles`. This is idempotent, uses only the trusted authenticated `user.id` from `auth.getUser()`, and safely ignores unique constraints (`23505`) on race conditions.
   - *Status:* **REAL / VERIFIED**

2. **Secret Grading Architecture (September 2026)**
   - *Problem:* `correct_answer_index` was stored in `questions`. The `questions` table RLS allowed any authenticated user to SELECT. A malicious candidate could read correct answers using browser dev tools.
   - *Decision:* Extracted `correct_answer_index` into a new strict table `question_answers`. Migration `00003` handles this. The new table has RLS enabled but NO access policies for `authenticated` users, blocking client-side reading completely. Grading runs exclusively server-side via `createAdminClient` which bypasses RLS to read the answers safely.
   - *Status:* **REAL / VERIFIED**

3. **Multilingual Architecture**
   - *Problem:* Hardcoded UI text breaks accessibility for non-English speakers.
   - *Decision:* Implemented strict localization dictionary structure (`I18nProvider`) scaling across UI, Text-to-Speech (TTS), and Speech-to-Text (STT) layers.
   - *Status:* **REAL / VERIFIED**
