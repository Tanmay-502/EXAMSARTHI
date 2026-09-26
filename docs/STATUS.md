# EXAMSAARTHI V2 - STATUS

## REAL / VERIFIED

- **Next.js App Router**: Application properly routed with middleware protection.
- **Supabase Authentication**: PKCE Magic Link correctly configured and redirects reliably.
- **Database Migrations**: 00000_schema, 00001_multilingual, 00002_demo_data, 00003_secure_answers applied.
- **Profiles**: Automatically and securely provisioned via admin client on exam start, preserving data integrity (Foreign Keys).
- **Security / RLS**: Fully restricted RLS policies exist on all tables.
- **Secret Grading**: `correct_answer_index` dropped from public `questions` table and migrated to restricted `question_answers` table. Client cannot cheat.
- **Multilingual Support**: English, Hindi, and Telugu fully supported across UI, TTS, STT, commands, and content.
- **Voice System**: Deterministic command parser running independently without fallback errors.
- **Accessibility**: Semantic HTML and Axe automation validated.

## PARTIAL

- **Offline Resilience**: Autosave is integrated via IndexedDB, but needs manual validation on harsh network failure conditions.
- **Testing**: Playwright Auth testing exists, but complex E2E voice testing is strictly manual for now.

## UNVERIFIED

- Edge cases of unsupported browser speech engines gracefully falling back.
- Heavy concurrent load on server actions (grading).

## DEVELOPMENT-ONLY

- Fake local mock grading removed! 100% real Supabase flow active.
