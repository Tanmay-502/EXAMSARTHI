# Voice Testing Protocol - ExamSaarthi V2

This document defines the manual testing procedure to verify the deterministic voice-first exam experience for ExamSaarthi V2. These tests must be executed with a real microphone.

## Pre-requisites

1. Application is running (`npm run dev`).
2. Microphone permissions are granted to the browser.
3. Test candidate is authenticated and has started an exam session.

## Test Cases

### Scenario 1: Starting the Exam

1. Navigate to `/practice` or `/exam`.
2. Wait for the announcement: "Welcome to the Mock exam... Say start when you are ready."
3. **Action:** Say "start".
4. **Expected Result:** The exam begins. Question 1 is announced along with its options.

### Scenario 2: Answering a Question

1. Wait for Question 1 to finish reading.
2. **Action:** Say "Option B" (or "Option A", "Option C", "Option D").
3. **Expected Result:** The system announces: "You selected option 2... Say confirm or change." The UI enters `CONFIRM_ANSWER` mode.
4. **Action:** Say "Confirm".
5. **Expected Result:** The system announces "Answer saved. Say next to continue." The UI returns to the exam view, and the answer is persisted.

### Scenario 3: Changing an Answer

1. Move to Question 2.
2. **Action:** Say "Option A".
3. **Expected Result:** The system asks to confirm or change.
4. **Action:** Say "Change".
5. **Expected Result:** The system announces "Canceled." The UI returns to the exam view, and the answer is NOT saved.

### Scenario 4: Navigation

1. **Action:** Say "Next".
2. **Expected Result:** The exam moves to Question 3 and reads it out.
3. **Action:** Say "Back".
4. **Expected Result:** The exam moves back to Question 2 and reads it out.

### Scenario 5: Review Features

1. **Action:** Say "Mark for review".
2. **Expected Result:** The system announces "Marked for review" and the flag is toggled on.
3. **Action:** Say "Review unanswered".
4. **Expected Result:** The system jumps to the first unanswered question and reads it.
5. **Action:** Say "Review marked".
6. **Expected Result:** The system jumps to the first marked question and reads it.
7. **Action:** Say "Jump to question 5".
8. **Expected Result:** The system jumps to question 5 and reads it.

### Scenario 6: Other Commands

1. **Action:** Say "Time left".
2. **Expected Result:** The system announces the remaining time.
3. **Action:** Say "Help".
4. **Expected Result:** The system reads the list of available commands.
5. **Action:** Say "Repeat".
6. **Expected Result:** The system repeats the current question and options.

### Scenario 7: Safe Submission

1. **Action:** Say "Submit".
2. **Expected Result:** The system announces the submission summary (e.g. "You answered 5 of 10 questions... Are you sure you want to permanently submit..."). The UI enters `CONFIRM_SUBMIT` mode.
3. **Action:** Say "No" or "Change".
4. **Expected Result:** Submission is cancelled, return to exam view.
5. **Action:** Say "Submit", wait for confirmation prompt, then say "Yes" or "Confirm".
6. **Expected Result:** The exam is submitted, and the candidate is redirected to the `/results` page.

## Multilingual Support

Repeat the above scenarios using Hindi and Telugu locales, ensuring that local commands (e.g., "शुरू करें", "पुष्टि करें", "ప్రారంభించండి") work perfectly and the text-to-speech output uses the correct language voice.
