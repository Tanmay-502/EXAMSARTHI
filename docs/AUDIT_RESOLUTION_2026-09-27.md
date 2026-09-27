# Full Repository Audit — 2026-09-27

This checkpoint records actionable code-level fixes found by the repository scan.

## Fixed

- Exam sessions are frozen to a server-defined question roster.
- Practice sessions are frozen to a validated question roster, subject, and difficulty.
- Client answer writes are validated against session ownership, question membership, option count, and server exam time.
- Submission no longer falls back to a fake local submitted state after server failure.
- Results and analysis use roster-backed denominators so unanswered questions are not silently excluded.
- Exam metadata is resolved from the live database; hardcoded demo exam catalog entries were removed.
- Exam selection tolerates spoken punctuation/conjunction differences and supports natural exam commands.
- Practice subject buttons come from live question data.
- Voice command handling no longer swallows common global commands during setup.
- Voice recognition restart races and duplicate callbacks are guarded.
- Spoken auth email capture is deterministic, readable back, and confirmation-gated.
- Auth callback next paths are same-origin constrained.
- Auth input email is server-side validated; Magic Link origin can be pinned with NEXT_PUBLIC_SITE_URL.
- Gemini intent/vision/insights routes use shared key resolution and validate incoming data.
- Vision image sources require HTTPS.
- Learning-profile generation is bound to the authenticated candidate and requires consent.
- Dashboard insights are skipped when consent is disabled.
- Browser security headers are enabled.
- PWA shell and service-worker coverage are present.
- Unused/stale fake test coverage and stale documentation were removed/refreshed.
- Protected-route Playwright server runs on an isolated port.

## Remaining manual gates

- Real Magic Link delivery/callback.
- NVDA/VoiceOver walkthrough.
- Real network interruption/reconnect.
- Target Supabase migrations through 00009.
- PWA installability/update behavior.
- End-to-end voice-only rehearsal.

No manual gate is considered PASS merely because the code path exists.
