# Manual Accessibility Test Plan

## 1. Screen Reader Flow
- **Gateway:** `/` exposes one h1, one tagline, Log in, Sign up, and Language. No automatic speech.
- **Authentication:** `/auth/login` exposes email/send controls; `/auth/signup` exposes full name/email/create-account controls.
- **Welcome:** `/welcome` is the first authenticated description page and the start point for the voice-first experience.
- **Onboarding:** `/onboarding/mode` and `/onboarding/language` expose explicit buttons and status announcements, then finish at `/dashboard`.
- **Application:** Verify dashboard, exam, practice, results, history, analysis, and settings semantics.

## 2. Keyboard
Verify focus order, visible focus, Escape handling, and that gateway shortcuts do not fire while typing.

## 3. Voice
Verify voice email capture only activates for saved `voice-first` users. Verify email read-back and explicit confirmation before sending.

## 4. Verification
Automated axe checks are supplementary. Complete NVDA/VoiceOver verification in the target browser before release.

## 5. Active exam keyboard shortcuts
During an active exam or practice session, verify these shortcuts are visible and work when focus is outside form controls:

- Esc: stop speech
- R: repeat the current prompt/question
- T: read time remaining
- M: toggle mark for review
- N / P: next / previous question
- 1–4: select answer option and enter the existing confirmation flow
- ?: read help

Shortcuts must be ignored while focus is inside an input, select, textarea, or editable element.
