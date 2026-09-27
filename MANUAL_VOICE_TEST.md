# Voice Testing Protocol — ExamSaarthi V2

All voice tests below must be run in a real browser with a real microphone. Record browser, OS, date, and observed result.

## Public flow
1. Open `/`.
2. Verify the welcome is spoken and voice listening starts.
3. Say `voice first`.
4. Say `English`.
5. Verify the visible Login / Sign Up screen opens.
6. Say `I want to sign in`.
7. Say an email such as `tanmay at gmail dot com`.
8. Verify the app reads the normalized email back.
9. Say `yes` and verify the existing Magic Link form is submitted.

## Exam selection
1. After authentication, say `I want to give exam`.
2. Verify the app lists only database-backed exams with available questions.
3. Say the full exam name, including titles containing `&`.
4. Verify the exact database exam is selected.
5. Say `yes` or `start` and verify the device check begins.

## Practice
1. Say `I want to practice`.
2. Say a real subject.
3. Say a count such as `10` or `twenty`.
4. Say `easy`, `medium`, or `hard`.
5. Verify the server creates the session with the exact question roster shown.

## Active session
1. Say `option B`; verify the candidate gets a confirmation prompt.
2. Say `confirm`; verify the answer is persisted.
3. Say `next`, `back`, `time left`, `mark for review`, and `repeat`.
4. Try `go to dashboard`, `history`, `analysis`, `settings`, and `logout` during the active exam.
5. Verify these navigation actions are blocked with an explicit spoken boundary.
6. Ask the assistant to solve the active question and verify it refuses.

## Submission
1. Say `submit`.
2. Verify unanswered/marked counts are announced.
3. Say `no`; verify the exam remains active.
4. Say `submit`, then `yes`.
5. Verify only a successful server response transitions the session to submitted and opens results.
6. Simulate a submission failure and verify the app remains in a retryable state rather than falsely showing results.

## Results, analysis, history
1. Say `read results` or `repeat`.
2. Say `give me my analysis`.
3. Say `I want to practice` from analysis; verify `/practice` opens.
4. Open history and test `practice history`, `exam history`, and `all history`.

## Languages
Repeat the key flow in Hindi and Telugu. Changing the spoken language should only change application language when the candidate explicitly requests a language change.

## Final manual gates
- NVDA or VoiceOver walkthrough.
- Network drop/reconnect during a live session.
- Real Magic Link delivery and callback.
- PWA installability and update behavior.