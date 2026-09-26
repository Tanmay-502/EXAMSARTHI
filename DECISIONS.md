# Decisions Log: EXAMSAARTHI V2

## 1. Framework: Next.js App Router

**Decision:** Use Next.js with the App Router.
**Rationale:** Provides robust server/client component separation, simple routing, excellent SEO/Accessibility out of the box, and easy integration with Tailwind CSS.
**Status:** [REAL] - Next.js 15+ App Router is configured and functioning.

## 2. State Management: React Context / Zustand

**Decision:** Start with React Context for global providers (Voice, A11y, i18n), and use a lightweight library like Zustand if complex exam state necessitates it.
**Rationale:** Avoids the boilerplate of Redux. Context is sufficient for global preferences (language, voice settings). The exam state might require Zustand to prevent unnecessary re-renders when the timer ticks.
**Status:** [PARTIAL] - Context providers for A11y, Voice, and i18n are REAL. Zustand state for Exam Session is currently STUB/PARTIAL.

## 3. UI Components: shadcn/ui

**Decision:** Utilize `shadcn/ui` alongside standard Tailwind CSS.
**Rationale:** `shadcn/ui` uses Radix UI under the hood, which provides unstyled, accessible primitives (Dialogs, Radio Groups, Selects). This ensures our components meet accessibility requirements without reinventing complex ARIA interactions.
**Status:** [REAL] - Tailwind CSS is configured, shadcn initialization complete. Native semantic HTML utilized for forms and radio groups.

## 4. Speech Capabilities: Web Speech API

**Decision:** Abstract the native browser Web Speech API (SpeechRecognition and SpeechSynthesis) behind a `VoiceEngine` service.
**Rationale:** It allows immediate development and testing without incurring cloud costs or managing API keys. The abstraction ensures we can easily swap it out for Google Cloud Speech or Azure Cognitive Services in a production environment if the native APIs prove too inconsistent across browsers.
**Status:** [PARTIAL] - TTS implemented and working. Command parsing STUBBED in Phase 2.

## 5. Persistence: IndexedDB (idb-keyval)

**Decision:** Use `idb-keyval` or standard `IndexedDB` for saving candidate progress locally.
**Rationale:** Exams are high-stakes. If the network drops, the candidate's answers must be preserved locally so they can resume safely when the connection is restored. `localStorage` is synchronous and limited in size; IndexedDB is asynchronous and scalable.
**Status:** [STUB] - IndexedDB sync queue layer planned for Phase 2.

## 6. Authentication: Supabase

**Decision:** Use Supabase for Auth and initial database.
**Rationale:** Provides secure, ready-to-use authentication and PostgreSQL database with Row Level Security (RLS). Easy to integrate with Next.js. Avoids writing custom backend boilerplate.
**Status:** [PARTIAL] - DB Schema designed. Magic Link auth being integrated in Phase 2.

## 7. i18n: Custom lightweight provider or next-intl

**Decision:** Implement a lightweight dictionary-based Context, or use a simple established library.
**Rationale:** We only need `en-IN` and `hi-IN`. A complex i18n routing setup might overcomplicate the MVP. We will evaluate a simple Context-based approach first for dynamic UI string swapping.
**Status:** [REAL] - Custom dictionary provider built and actively swapping strings and `lang` attrs.
