# Manual Voice Assistant Test Plan

This document outlines the testing procedure to verify that the Voice Assistant provides a deterministic, secure, accessible, and continuous conversational experience.

## Prerequisites
1. Connect a working microphone.
2. Ensure you have network connectivity to access the LLM endpoint (for fallback queries).

## Test 1: Global Voice Lifecycle
1. Load `/` (Landing Page).
2. Click the voice microphone button or press the keyboard shortcut to start listening.
3. Say: "Go to practice mode."
4. **Expected**: The app navigates to `/practice`. The microphone remains active/listening in the new context if possible, or gracefully transitions.

## Test 2: Practice Mode Conversational Setup
1. On the `/practice` page, the assistant should ask: "What subject would you like to practice?"
2. Say: "Math"
3. The assistant should ask: "How many questions would you like?"
4. Say: "10"
5. The assistant should ask: "What difficulty?"
6. Say: "Medium"
7. **Expected**: The assistant says "Starting a 10-question medium Math practice session" and the exam engine begins.

## Test 3: History & Weak Subject Practice
1. Say: "Open my history"
2. **Expected**: Navigates to `/history` (or results if history isn't fully implemented).
3. Say: "Practice my weakest subject"
4. **Expected**: The intent parser identifies `{ type: 'START_PRACTICE', payload: { subject: 'weakest' } }`. Navigates to `/practice?subject=weakest`.

## Test 4: Anti-Cheating Bounds (Exam Mode)
1. Start an actual exam from `/dashboard`.
2. Once the exam starts, ask: "Can you solve this?" or "What is the answer to the first question?"
3. **Expected**: The system intercepts this as `QUESTION_SOLVING` intent and REJECTS it, returning an error message (e.g., "I cannot help you solve questions during an active exam.") and does not reveal the answer.
4. Try to navigate away via voice: "Go to dashboard."
5. **Expected**: Action blocked by `SafeActionRegistry` in the `exam` context.

## Test 5: Language Switching
1. Say: "Speak in Hindi" or "Change language to Hindi"
2. **Expected**: The application language switches to `hi-IN` and TTS responds in Hindi.

## Test 6: Fallback Determinism
1. Disconnect the network (offline mode).
2. Say: "Next question"
3. **Expected**: The app still moves to the next question using local deterministic parsing (`commandParser.ts`), without relying on the LLM.
