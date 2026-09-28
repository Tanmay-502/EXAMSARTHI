# ExamSaarthi V2 — Manual Voice Test

## Public gateway
1. Open `/`.
2. Confirm the page is screen-reader accessible but does not auto-speak.
3. Confirm Log in is focused first.
4. Press `S` outside any input and confirm `/auth/signup`.
5. Return to `/` and press `L`; confirm `/auth/login`.
6. Change the language with the LanguageSwitcher.

## Authentication
1. `/auth/login` is for existing accounts; `/auth/signup` is for new accounts.
2. First-time users should remain keyboard/screen-reader-first on auth pages.
3. For a saved `voice-first` user, verify spoken email capture, read-back, and explicit confirmation.
4. Verify Google OAuth from the auth entry points.

## Post-auth flow
1. Open `/auth/confirm` from a valid Magic Link and confirm `/welcome`.
2. On `/welcome`, confirm the hero, “how it works”, “Just speak”, voice activation prompt, and DemoGuide are present.
3. Select Get started -> `/onboarding/mode` -> `/onboarding/language` -> `/dashboard`.
4. Confirm mode and language persist to the profile and localStorage.
5. With saved preferences, `/welcome` should offer “Continue to dashboard”.