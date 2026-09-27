# Runtime & Security Verification Matrix

Snapshot: 2026-09-27

| Area | Implementation | Verification state |
|---|---|---|
| Authentication | Supabase Magic Link + protected-route proxy | Real email/callback verification required |
| Auth redirect | Same-origin next-path validation in auth confirm | Code-backed |
| Exam creation | Server action + server-defined question roster | Code-backed; apply migrations |
| Practice creation | Server action + exact question roster + subject/difficulty validation | Code-backed; apply migrations |
| Correct-answer protection | question_answers isolated from client question payloads | Code-backed |
| Answer persistence | IndexedDB + incremental server saveAnswer + reconnect replay | Network-drop test required |
| Exam timing | Server-side answer-write deadline based on exam duration | Boundary/manual test required |
| Submission integrity | Server grading + frozen roster + in_progress conditional update | Code-backed |
| Results analysis | Full roster denominator including unanswered | Code-backed |
| Voice routing | GlobalVoiceAssistant + SafeActionRegistry + deterministic parser | Full voice rehearsal required |
| Voice auth | Spoken email normalization + read-back confirmation | Real browser microphone test required |
| Semantic intent | Gemini fallback bounded by 5s client timeout | Code-backed; API availability test |
| AI insights | Consent and active-exam checks before Gemini | Code-backed |
| Security headers | X-Content-Type-Options, Referrer-Policy, X-Frame-Options, Permissions-Policy | Deployment header check |
| PWA | Manifest + static-only service worker | Browser installability test |
| Accessibility | Semantic UI, live announcements, focus support, reduced motion | NVDA/VoiceOver manual test |

Do not mark manual rows PASS until the target environment produces the corresponding observation.
