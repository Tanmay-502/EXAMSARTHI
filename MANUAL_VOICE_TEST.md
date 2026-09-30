# ExamSaarthi V2 — Manual Voice Test

## Public gateway
1. Open `/`.
2. Confirm the page is screen-reader accessible and the primary voice action is easy to reach.
3. Activate voice access and confirm the agent explains the next step.
4. Say “login” and verify `/auth/login`.
5. Change the language with the LanguageSwitcher and verify spoken prompts follow the selected locale.
6. Say “help”, “repeat that”, and “where am I” from the gateway.

## Voice authentication
1. Verify the agent asks for a user ID.
2. Say `tanmay zero nine` and verify it reads back `tanmay09` for confirmation.
3. Say “yes”, then say `one two three four five` for the PIN.
4. Verify the password/PIN is not shown in the transcript and is not re-transcribed.
5. Verify successful authentication enters the requested destination.
6. Verify `/auth/signup` redirects to voice login rather than showing a second account-creation flow.

## Post-login voice flow
1. Say “where am I” on dashboard, exam lobby, active exam, practice setup, practice, results, history, analysis and settings.
2. Say “help” and verify instructions match the current context.
3. Say “repeat that” and verify the last spoken response is replayed.
4. Verify “next”, “back”, “option A/B/C/D”, review commands, time-left, submission confirmation, history, analysis and settings actions remain context-gated.
5. During an active exam, verify unsafe navigation remains blocked.

## Reliability rehearsal
1. Briefly interrupt speech, pause, and speak again.
2. Test a low-confidence/noisy utterance and verify transcription recovery before action.
3. Deny microphone permission and verify a clear keyboard/screen-reader fallback.
4. Trigger a temporary speech-network failure and verify the agent recovers without a dead-end screen.
