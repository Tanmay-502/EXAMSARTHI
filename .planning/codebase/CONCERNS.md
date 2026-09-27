# Codebase Concerns

Analysis snapshot: 2026-09-27

Resolved audit items are recorded in docs/AUDIT_RESOLUTION_2026-09-27.md.

## Remaining technical considerations

### Browser-native Web Speech API
- SpeechRecognition and SpeechSynthesis behavior varies by browser and may depend on browser/network implementation.
- VoiceProvider remains the abstraction boundary so a server STT provider can be introduced later without changing page-level voice actions.

### Client-supplied context for semantic intent
- /api/intent receives a context hint from the client, but final action authorization is performed against the actual route context in GlobalVoiceAssistant and SafeActionRegistry.
- Active-exam actions remain restricted by the registry and page state.

### Network answer outbox
- The exam store persists answers to IndexedDB and ExamEngine attempts immediate server persistence plus replay on reconnect.
- A dedicated durable mutation outbox with retry metadata would further improve behavior during long offline intervals; this is an enhancement, not the current correctness path.

### Production gates
- Verify Magic Link delivery with the target Supabase project.
- Apply migration 00008_lock_exam_session_inserts.sql to the target database.
- Run NVDA/VoiceOver accessibility checks.
- Run a real network interruption/reconnect test.
- Verify PWA installability and update behavior in the target browser.

### Dependency policy
- Next.js is pinned to 16.3.6 in package.json.
- Re-run typecheck, lint, build, and Playwright after dependency changes.
