# ExamSaarthi V2 — Production Checklist

## Repository / CI evidence

- [x] Server-side grading and private question_answers boundary preserved.
- [x] Frozen question roster protection is present through migration 00014_questions_roster_rls.sql.
- [x] Exam and practice question discovery uses the server-side path.
- [x] English, Hindi, and Telugu registry parity is tested.
- [x] Checked-in content passes npm run verify:data in CI.
- [x] Vercel release deployments have reached READY.

## Manual / target-environment gates — NOT PASS

- [ ] Magic Link email delivery and callback.
- [ ] Google OAuth against the target Supabase project.
- [ ] NVDA / VoiceOver walkthrough.
- [ ] High-contrast and 150% font-scale walkthrough on a real browser/device.
- [ ] Network drop/reconnect during an active session.
- [ ] PWA install/update behavior.
- [ ] Full voice-only rehearsal across the major routes.
- [ ] Apply migrations through 00014_questions_roster_rls.sql to the target database.
- [ ] Ingest the canonical exam/practice data into the target database and run the count queries.
- [ ] Production HTTP checks for /, /manifest.json, /sw.js, and /auth/login.

## Evidence rule

Automated checks, CI, deployment status, code inspection, and manual target-environment observations are separate evidence classes. Never mark a manual gate PASS from source inspection alone.
