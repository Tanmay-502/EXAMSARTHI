# Architecture: EXAMSAARTHI V2

## Overview

EXAMSAARTHI V2 is a voice-first, highly accessible examination and practice platform for visually impaired candidates. The architectural mandate prioritizes independent operation via screen readers, keyboard, and voice above all else, while still offering a premium visual experience for low-vision or sighted users.

## Layers

1. **Accessibility Core**
   - Headless state management for a11y preferences.
   - ARIA live region announcer service.
   - Focus trap and management utility.

2. **Internationalization (i18n)**
   - Context-based dictionary providing UI strings in English (`en-IN`) and Hindi (`hi-IN`).
   - Ensures all text, including dynamic screen reader announcements and speech synthesis output, are properly translated.

3. **Voice Engine**
   - Abstraction over the Web Speech API (SpeechRecognition and SpeechSynthesis).
   - Pluggable interface for future migration to cloud-based speech services (e.g., Google Cloud Speech-to-Text).
   - Global command listener for Voice Commands (Next, Back, Repeat, Mark, Time Left).

4. **Keyboard Navigation**
   - Global keyboard shortcuts mapping to application actions.
   - Visible focus indicators.
   - Skip-to-content links and landmarks (`<main>`, `<nav>`, `<aside>`).

5. **Screen Reader Semantics**
   - Strictly semantic HTML structure (correct heading hierarchy, semantic buttons/inputs).
   - Minimal reliance on custom ARIA roles if native HTML elements suffice.
   - Clear and concise `aria-labels` or visually hidden text for icon-only buttons or interactive graphs.

6. **Candidate UI**
   - Built with React (Next.js App Router).
   - Styled with Tailwind CSS and shadcn/ui components (accessible by default).
   - Themeable (High Contrast, Dark, Light) and respectful of `prefers-reduced-motion`.

7. **Practice & Exam Engines**
   - Practice Engine: Immediate feedback, voice-guided explanations.
   - Exam Engine: Strict timing, auto-progression, lock-down features.
   - Shared business logic for question presentation, navigation, and option selection.

8. **Persistence/Recovery**
   - `IndexedDB` (via idb or localforage) for offline support and auto-saving exam states.
   - Ensures an exam can be resumed exactly where left off in case of network or browser failure.

9. **Vision Accessibility**
   - "Vision AI" service abstraction.
   - Extracts descriptive text from images, graphs, and diagrams to be read aloud by the Voice Engine.

10. **Results**
    - Post-exam analysis presented in screen-reader-friendly data tables.
    - Performance insights described structurally (not just visually in charts).

11. **Authentication**
    - Supabase Auth.
    - Email/Password and optional Passkeys (WebAuthn).
    - Authentication flow fully accessible via voice and keyboard.

12. **Security/Audit**
    - Server-side validation of all exam answers.
    - Audit logs for significant candidate actions (started exam, answered, marked for review).

## Directory Structure (Next.js App Router)

```text
src/
├── app/                  # App Router pages and layouts
├── components/           # UI Components (shadcn, composite widgets)
├── lib/                  # Utilities, Supabase client
├── services/             # Voice, Accessibility, Vision abstractions
├── stores/               # State management (Zustand or Context)
├── i18n/                 # Translation dictionaries
└── types/                # TypeScript definitions
```
