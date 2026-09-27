# Final Voice Verification Protocol — ExamSaarthi V2

Snapshot: 2026-09-27

Run with a real microphone in a supported browser. Record browser, OS, date, and observed result.

## Public flow
Landing → Voice-first → Language → Login / Create Account → Dashboard.

Verify:
- welcome and mode prompts are spoken once;
- selected language updates UI, speech recognition, and TTS;
- login/signup is a visible step even when the browser already has a session;
- voice email capture reads the normalized address back before sending.

## Exam selection
- Say `I want to give exam`.
- Say `list exams`.
- Say an exact exam title including titles containing `&`.
- Say `first exam` or `second exam`.
- Say `yes` to confirm.

## Practice
- Say `I want to practice`.
- Give a database-backed subject.
- Give a count such as `10` or `twenty`.
- Give `easy`, `medium`, or `hard`.
- Verify a server session is created only after the question set is loaded.

## Active exam
- Verify question and options are spoken.
- `option A/B/C/D` → confirmation → `confirm`.
- `next`, `back`, `repeat`, `time left`, `mark for review`, `review unanswered`, `review marked`, `jump to question 5`.
- Try dashboard/history/settings/analysis/practice/logout. Verify explicit safety response and no navigation.
- Ask the assistant to solve the live question. Verify refusal.

## Submission and persistence
- Submit and confirm.
- Verify results only appear after successful server submission.
- Disconnect the network briefly and reconnect.
- Verify local state remains available and pending answers can be replayed.
- Verify server rejects answer writes after the exam time window.

## Results / analysis / history
- `read results`, `repeat`.
- `give me my analysis`.
- `I want to practice my weakest subject`.
- `practice history`, `exam history`, `all history`.

## Accessibility
- Keyboard-only walkthrough.
- NVDA or VoiceOver walkthrough.
- Verify headings, focus order, labels, live announcements, contrast, reduced motion, and no audio clashing.

## PWA
- Verify manifest and installability on production.
- Verify static asset caching.
- Verify authenticated pages and API routes are not cached.