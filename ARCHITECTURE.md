# Architecture: EXAMSAARTHI V2

## Overview

EXAMSAARTHI V2 is a voice-first accessible examination and practice platform built with Next.js 16.3.6, React 19, Supabase, browser Web Speech APIs, Zustand/IndexedDB, and optional Gemini services.

## Core layers

1. **Accessibility** — semantic HTML, live-region announcements, focus management, keyboard support, reduced motion.
2. **Internationalisation** — English, Hindi, and Telugu dictionaries and speech locales.
3. **Voice** — browser STT/TTS through VoiceProvider, deterministic parser, Gemini fallback, global action dispatcher, contextual SafeActionRegistry.
4. **Exam & Practice** — shared ExamEngine with strict state transitions and voice confirmation.
5. **Persistence** — Zustand + IndexedDB for immediate local recovery; incremental server autosave through saveAnswer.
6. **Backend** — Next.js Server Actions + Supabase SSR/Admin clients.
7. **Vision** — Gemini vision route for objective diagram descriptions, with database alt-text preferred when present.
8. **Results & Analysis** — server-derived metrics, subject breakdown, history, and learning insights.
9. **PWA** — manifest plus production service worker for static assets only.

## Security

Correct-answer data is isolated from the exam client. Client writes to exam_sessions and answers are restricted; privileged server actions validate candidate ownership and session/question boundaries before writing.

Real biometric/speaker verification is intentionally not faked.

## Authentication

Supabase Auth Magic Links are the implemented authentication method. Passkeys are not currently implemented.

## Verification standard

Automated accessibility checks target WCAG 2.1 AA. Full accessibility and production auth claims still require manual target-environment verification.
