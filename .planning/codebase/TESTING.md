# Testing Patterns

Snapshot: 2026-09-27

## Test framework
- Playwright 1.63.0 for end-to-end and accessibility checks.
- Axe Core 4.13.0 for automated accessibility scans.
- Node native `node:test` for deterministic parser/unit checks.

## Playwright server
`playwright.config.ts` launches the production app on port `3001` with a dedicated server process. This avoids collisions with a developer `npm run dev` process commonly running on port `3000`.

## Run commands
```bash
npm test
npx playwright test e2e/accessibility.spec.ts
npx playwright test e2e/voice-security.spec.ts
npx playwright test e2e/pwa.spec.ts
node --test src/lib/voice/__tests__/commandParser.test.ts
npm run typecheck
npm run lint
```

## Evidence boundaries
- Playwright voice tests use synthetic SpeechRecognition/SpeechSynthesis because headless Chromium does not provide native speech APIs.
- Auth tests exercise UI and server-action failure/success states; real email receipt and callback remain manual verification.
- Manual NVDA/VoiceOver tests remain necessary.
- Real network interruption/reconnect remains a manual persistence check.
