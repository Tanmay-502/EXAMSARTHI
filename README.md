# ExamSaarthi V2

ExamSaarthi V2 is an accessible, voice-first, multilingual examination platform designed primarily for visually impaired candidates. It enables fully independent exam completion through keyboard and voice interfaces.

## Current State (Stabilization Pass - September 2026)

- **Auth**: Fully functional PKCE Magic Link via Supabase.
- **Database**: Remote Supabase architecture with strict Row Level Security (RLS) enforcement. Secure server-side grading.
- **Voice System**: Deterministic multilingual voice command parser (English, Hindi, Telugu) using the Web Speech API.
- **Accessibility**: Semantic HTML, screen reader announcements (`aria-live`), high contrast modes, and 100% keyboard navigation support.

## Documentation

- `docs/STATUS.md`: Current granular feature status.
- `docs/DECISIONS.md`: Architectural decisions and rationale.
- `MANUAL_FINAL_TEST.md`: Complete QA checklist for validating the core candidate journey.
- `PRODUCTION_CHECKLIST.md`: Verification steps before deploying to production.

## Getting Started

1. Create a `.env.local` file (do NOT commit this file). See `PRODUCTION_CHECKLIST.md` for required keys.
2. Run migrations via `npx supabase db push`.
3. Start the server:

```bash
npm run dev
```

## Testing

Run automated checks:

```bash
npm run typecheck
npm run lint
npm run build
npx playwright test
```
