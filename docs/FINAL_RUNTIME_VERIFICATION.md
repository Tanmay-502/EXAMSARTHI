# Runtime & Security Verification Matrix

**Snapshot:** 2026-09-27
**Canonical audit:** docs/AUDIT_RESOLUTION_2026-09-27.md

This file separates code-backed implementation from observations that still need to be executed manually.

| Area | Current implementation | Verification state |
|---|---|---|
| Authentication | Supabase Magic Link + protected-route proxy | Manual end-to-end email verification required |
| Exam session creation | Privileged server action; client INSERT policy removed in migration 00008 | Apply migration and verify in target Supabase |
| Correct-answer protection | Client question query excludes answer key; grading uses server/admin context | Code path implemented |
| Answer autosave | IndexedDB + incremental saveAnswer + reconnect replay | Manual network-drop test required |
| Submission integrity | Ownership check + status = in_progress on final update | Code path implemented |
| Practice results breakdown | Subject stats derived through answers.session_id | Code path implemented |
| History filters | Promise-based Next.js 16 searchParams handling | Code path implemented |
| Voice safety | Context allowlists + explicit spoken blocked-action feedback | Automated/unit coverage added; manual voice rehearsal required |
| Telugu voice coverage | Deterministic mode + analysis phrases added | Unit coverage added |
| Question randomisation | Candidate/exam-seeded deterministic shuffle | Code path implemented |
| Gemini key handling | Unified getGeminiKey + provider instance with resolved key | Code path implemented |
| PWA | Manifest + production static-asset service worker | Browser installability check required |
| Accessibility | Semantic UI, focus/live-region support, reduced motion, WCAG 2.1 AA automated target | Manual NVDA/VoiceOver audit required |

## Evidence discipline

Do not label a row PASS until the target environment has produced an observed result. Build output, static inspection, automated tests, and manual browser testing are separate evidence classes.
