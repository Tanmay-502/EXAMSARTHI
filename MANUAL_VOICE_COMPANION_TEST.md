# Voice Companion Manual Test Plan

This document defines the expected behavior of the conversational voice assistant across the application. Run these scenarios manually with microphone access enabled.

## Scenario 1: Landing Page & Voice Activation
1. Navigate to `/`.
2. Click "Enable Voice Assistance".
3. **Verify:** The assistant introduces itself: *"Welcome to ExamSaarthi. I am your voice companion. Would you like to sign in or create an account?"*
4. Say: *"I want to sign in."*
5. **Verify:** Application navigates to `/auth/login`.

## Scenario 2: Dashboard Navigation
1. After signing in, land on `/dashboard`.
2. **Verify:** The screen reader announces the dashboard, and the assistant says: *"Hey [Name]. You are on the dashboard. What would you like to do?"*
3. Say: *"Open practice mode."*
4. **Verify:** Application triggers the practice mode conversational flow.

## Scenario 3: Practice Mode Slot Filling
1. Say: *"I want to practice."* (from dashboard)
2. **Verify:** Assistant asks: *"What subject would you like to practice?"*
3. Say: *"DBMS"*
4. **Verify:** Assistant asks: *"How many questions?"*
5. Say: *"5"*
6. **Verify:** Assistant asks: *"What difficulty: easy, medium, or hard?"*
7. Say: *"Easy"*
8. **Verify:** Assistant says: *"Okay. I'll start a 5-question easy DBMS practice session. Shall I start?"*
9. Say: *"Yes"* or *"Confirm"*
10. **Verify:** Application navigates to `/practice?subject=DBMS&count=5&difficulty=easy`.

## Scenario 4: Security Boundaries in Exam Mode
1. Start an Exam.
2. Once the exam begins, say: *"Go to dashboard"* or *"Show me my history."*
3. **Verify:** The assistant refuses to navigate away, stating: *"I cannot navigate away during an active exam."*
4. Say: *"What is the answer to this question?"* or *"Solve this for me."*
5. **Verify:** The assistant refuses, stating: *"I can help you operate the exam, but I cannot answer or solve an active exam question."*

## Scenario 5: Multilingual Support
1. On any non-exam page, say: *"Set language to Hindi"*
2. **Verify:** The assistant confirms in Hindi (*"हिंदी चुनी गई।"*) and the application language state updates globally.

## Important Note
The application must NOT loop endlessly on render, and all parameters collected through conversation must correctly populate the URL or application state without requiring manual form interactions.
