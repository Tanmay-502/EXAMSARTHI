# Voice Companion Manual Test Plan

Snapshot: 2026-09-28

## Scenario 1 — Gateway
1. Open `/`.
2. Confirm silent, keyboard/screen-reader-first gateway.
3. Confirm `L` and `S` routes.
4. Confirm language changes with LanguageSwitcher.

## Scenario 2 — Authentication
1. Use `/auth/login` for existing accounts and `/auth/signup` for new accounts.
2. Verify voice email capture only when saved mode is `voice-first`.
3. Verify read-back and explicit confirmation.
4. Verify successful Magic Link -> `/auth/confirm` -> `/welcome`.

## Scenario 3 — Welcome and onboarding
1. Confirm voice guidance starts on `/welcome`.
2. Confirm new users reach mode and language onboarding.
3. Confirm preferences are persisted to profile and localStorage.
4. Confirm the final route is `/dashboard`.
5. Confirm saved-preference users see Continue to dashboard.

## Scenario 4 — Recovery
Use `/auth/login?code=link_invalid`, `/auth/login?code=unauthenticated`, and the other allowlisted auth codes. Confirm each renders only application-controlled localized text.