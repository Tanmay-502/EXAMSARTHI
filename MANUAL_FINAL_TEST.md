# EXAMSAARTHI V2 - Final Manual QA Protocol

This document outlines the strict manual testing protocol required to verify the EXAMSAARTHI V2 Voice-First candidate lifecycle. Automated tests (Playwright) verify the DOM, but manual testing is essential for verifying Voice (SpeechRecognition and SpeechSynthesis) behavior.

## Prerequisites

- Chromium-based browser (Chrome/Edge).
- Microphone available and permissions clear.
- Do NOT use a screen reader (VoiceOver, NVDA) while testing this flow, as the app provides its own self-voicing.

---

## 1. Landing & Authentication Flow

1. Navigate to `/`.
2. **Observe**: The application should announce: "Welcome to ExamSaarthi. This is a voice-first accessible examination platform. You can control the application using your voice or keyboard. You can say English, Hindi, or Telugu to choose your language. You can also say help at any time."
3. **Action**: Say "English" (or select via Keyboard).
4. **Observe**: The application says "English selected. Going to login." and navigates to `/auth/login`.
5. **Action**: At `/auth/login`, wait for the announcement: "You need to sign in before continuing. Enter your email address and choose Send Magic Link..."
6. **Action**: Enter a valid email address using the keyboard and click "Send Magic Link".
7. **Action**: Click the magic link in your email to authenticate.

---

## 2. Dashboard Orientation

1. Navigate to `/dashboard` (auto-redirect after login).
2. **Observe**: The application announces: "Dashboard. You can say Start Exam for a timed examination. You can say Start Practice for practice mode..."
3. **Action**: Say "Start Exam".
4. **Observe**: The application says "Loading..." and navigates to `/exam`.

---

## 3. Exam Initialization & Microphone Check

1. **Observe**: The application announces: "Let's check your microphone. Please say: next".
2. **Action**: Do nothing for 10 seconds.
3. **Observe**: The application should NOT repeatedly play the full mic check prompt. It may play a short retry message if configured, or just silently wait.
4. **Action**: Say "Next".
5. **Observe**: The application announces: "Voice control is ready." and proceeds to the orientation.
6. **Observe**: The application announces the exam orientation: "Exam. X questions. Time limit: Y minutes..."
7. **Action**: Say "Start".

---

## 4. Exam Execution & Session Purity

1. **Observe**: The application announces: "You are on the first question." followed by the question text and options.
2. **Action**: Say "Option A".
3. **Observe**: The application announces "You selected option A. Say confirm or change."
4. **Action**: Say "Confirm".
5. **Observe**: The application announces "Answer saved. Say next to continue."
6. **Action**: Say "Next".
7. **Observe**: The application reads the next question.
8. **Action**: Say "Submit".
9. **Observe**: The application gives a warning message (e.g., "You answered 1 of N questions...").
10. **Action**: Say "Yes".
11. **Observe**: The application submits the exam and navigates to `/results`.

---

## 5. Results & Weakness Analysis

1. **Observe**: The application announces: "Exam submitted successfully. You answered 1 out of X questions. You are on the results page."
2. **Observe**: The application then reads a detailed summary: "You scored X out of Y. That is Z percent. C correct, I incorrect, and U unanswered. Your weakest area was [Subject] with [Percentage] percent accuracy. You can say Dashboard or History."
3. **Action**: Verify that the "Weakest Area" matches the on-screen subject statistics (lowest percentage of correct answers out of total attempted + unattempted for that subject).
4. **Action**: Say "Dashboard".
5. **Observe**: Navigates back to dashboard.

---

## 6. Exam State Reset Verification

1. **Action**: From the dashboard, say "Start Exam".
2. **Observe**: Proceed through the Mic Check and Orientation.
3. **Action**: Say "Start".
4. **Observe**: Check the first question visually or auditorily.
5. **CRITICAL VERIFICATION**: The selected option from the PREVIOUS session MUST NOT be pre-selected. The state must be entirely fresh. The timer must start from the full duration.

---
End of Protocol
