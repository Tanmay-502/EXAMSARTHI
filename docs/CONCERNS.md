# Current Concerns & Release Gates

**Snapshot:** 2026-09-27

Resolved items from the earlier audit are documented in docs/AUDIT_RESOLUTION_2026-09-27.md.

## Remaining release gates

### Magic-link email delivery
Real email delivery, callback exchange, and authenticated redirect must be verified with the target Supabase project and demo email account.

### Screen-reader verification
Automated accessibility checks target WCAG 2.1 AA. NVDA and/or VoiceOver walkthroughs are still required on every major route.

### Network recovery
The application now has incremental server-backed answer persistence plus IndexedDB recovery/replay. A real browser network drop/reconnect test is still required.

### Supabase migration
Migration 00009_practice_question_roster.sql (which includes 00008 protection) must be applied to the target Supabase project. It removes the client-side exam_sessions INSERT policy because session creation is performed by authenticated server actions.

### PWA verification
The manifest and production static-asset service worker are implemented. Browser installability and update behavior still need target-deployment verification. Authenticated pages, API routes, and navigation responses are intentionally not cached.


### Supabase migration history
The repository currently contains two migration files with the same version prefix, `00006_*.sql`. Supabase documentation says migration versions/timestamps must be unique and are the identifiers used for migration history. Do not rename either file blindly if it may already be applied remotely; first compare local and remote history with `supabase migration list`, then repair or rename through a controlled migration-history procedure.
