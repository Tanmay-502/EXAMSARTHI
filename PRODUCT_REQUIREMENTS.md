# Product Requirements: EXAMSAARTHI V2

## 1. Goal

Provide a comprehensive, completely accessible examination and practice environment for visually impaired candidates, ensuring they can operate the entire application independently from start to finish.

## 2. Target Audience

- Visually Impaired Candidates (Primary)
- Low Vision Candidates (Primary)
- Sighted Candidates (Secondary)

## 3. Core Features & Capabilities

### 3.1 Voice & Audio Interaction

- **Voice-first Interface:** All critical actions can be executed via voice commands.
- **Spoken Output:** Instructions, questions, answer options, timer, and confirmations are read aloud.
- **Answer Selection:** Answers can be selected using voice.
- **Voice Commands:** Commands include `next`, `back`, `repeat`, `mark for review`, `time left`, `submit`.

### 3.2 Visual & Structural Accessibility

- **Screen Reader Compatibility:** Full compatibility with NVDA, JAWS, VoiceOver, and TalkBack.
- **Keyboard Navigation:** 100% of the app must be operable via keyboard (Tab, Enter, Space, Arrows, standard shortcuts).
- **Vision AI:** Capability to describe images, graphs, and diagrams using AI vision models.
- **Visual Design:** Premium, modern, distraction-free UI. No visual effects should impede accessibility.

### 3.3 Application Workflows

1. **Landing & Onboarding:**
   - Open website.
   - Initial greeting and instruction (spoken).
   - Choose language (English/Hindi).
2. **Authentication:**
   - Sign in via accessible forms (Email/Password or Passkeys).
3. **Dashboard & Configuration:**
   - Configure accessibility settings (Speech rate, Voice selection, High contrast, Font scaling).
   - Select Practice or Exam modes.
4. **Practice Engine:**
   - Safe environment to learn the interface and test voice commands.
   - Provides immediate feedback.
5. **Exam Engine:**
   - Start exam.
   - Listen to instructions.
   - Navigate and answer questions.
   - Ask for time remaining.
   - Mark questions for review.
   - Review unanswered/marked questions.
   - Submit safely with confirmation.
6. **Results & Analytics:**
   - Accessible presentation of score and performance insights.

### 3.4 Language Support

- **Languages:** English (`en-IN`) and Hindi (`hi-IN`).
- **Scope:** Complete UI, voice commands, TTS output, and speech recognition must support both languages based on user selection.

### 3.5 Security & Data

- **Audit Logs:** Track user actions for security and debugging.
- **Persistence:** Autosave progress locally (`IndexedDB`) to recover from crashes.
- **No Fake Systems:** Do not implement fake biometric/speaker verification.

## 4. Non-Functional Requirements

- **Performance:** Fast loading times, offline PWA capabilities.
- **Robustness:** Fail gracefully if Speech API is unavailable (fallback to keyboard/screen reader).
- **Usability:** Do not require visual-only interaction. Avoid relying on color alone for critical information. Avoid mouse dependency.
