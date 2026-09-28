# EXAMSAARTHI V2 — Final Manual QA Protocol

## 1. Gateway
Open `/` while logged out. Verify one h1, one tagline, Log in and Sign up actions, a language switcher, no 3D hero, and no automatic speech. Verify `L` and `S` shortcuts and that they are ignored while typing.

## 2. Authentication
Verify `/auth/login` for existing accounts and `/auth/signup` for full name plus email. Verify Google OAuth, Magic Link -> `/auth/confirm`, and successful redirect to `/welcome`.

## 3. Returning user
For a user with saved mode and language, verify `/welcome` offers Continue to dashboard. Verify Sign out returns to `/`.

## 4. New user onboarding
Verify `/welcome` -> `/onboarding/mode` -> `/onboarding/language` -> `/dashboard`. Verify profile and localStorage persistence.

## 5. Accessibility
Run keyboard-only checks plus NVDA/VoiceOver through gateway, auth, welcome, onboarding, dashboard, exam, practice, results, history, analysis, and settings.

## 6. Security and PWA
Verify protected routes use `/auth/login?code=unauthenticated`. Verify `/manifest.json` and `/sw.js` remain reachable while logged out. Verify auth URLs do not accept free-form `message` text.