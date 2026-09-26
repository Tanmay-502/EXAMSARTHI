# Manual Accessibility Test Plan

Because automated tests (like Axe) can only catch ~30% of accessibility issues, this project requires human verification.

## 1. Screen Reader Flow (NVDA / VoiceOver)

**Goal:** Verify semantic meaning and silent visual content.

- [ ] **Onboarding:** Turn on screen reader. Navigate to `/`. Does it read "EXAMSAARTHI V2, The accessible..."?
- [ ] **Login:** Navigate to `/auth/login`. Does it announce inputs properly? Do errors read aloud?
- [ ] **Exam:** Start an exam. Does it announce "Question 1 of N"? Does it read the time remaining?
- [ ] **Options:** Traverse options using arrow keys in NVDA browse mode. Are they grouped as a radiogroup?
- [ ] **Submit:** At the end, does the submission dialog read the stats correctly?

## 2. Keyboard-Only Navigation

**Goal:** Verify no keyboard traps, visible focus, and logical order.

- [ ] **Tab Order:** Press `Tab` repeatedly from the landing page. Is there a "Skip to main content" link?
- [ ] **Focus Indicators:** Does every interactive element have a clear, high-contrast ring?
- [ ] **Custom Shortcuts:** Press `R` to repeat question. Press `Space` to select. Does it work without breaking input fields?
- [ ] **Dialogs:** When a modal opens, is focus trapped inside? Can you exit with `Escape`?

## 3. High Contrast & Zoom

**Goal:** Verify visual robustness for low-vision users.

- [ ] **Zoom:** Zoom browser to 200%. Does the layout break or require horizontal scrolling?
- [ ] **Contrast:** Enable Windows High Contrast mode. Are buttons and text boundaries still distinct?

## 4. Voice Interaction (Speech API)

**Goal:** Verify hands-free functionality.

- [ ] **Permissions:** Does the browser correctly request mic permissions?
- [ ] **Bilingual:** Does it understand Hindi commands (e.g. "अगला") when the app is in Hindi mode?
- [ ] **Confirmation:** When you say "Option A", does the TTS ask for confirmation?
- [ ] **Clashing:** Does the app's TTS clash with the user's running NVDA? (Requires testing both active at once).
