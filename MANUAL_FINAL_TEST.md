# EXAMSAARTHI V2 — Final Manual QA Protocol

## 1. Voice gateway
Open `/` while logged out. Verify the primary voice-start control is focused and the page clearly explains that voice is the main interaction path. Keyboard and screen-reader controls must remain available.

## 2. Voice authentication
Open `/auth/login`. Verify the agent asks for the user ID, reads it back for confirmation, then asks for the numeric PIN one digit at a time. Verify password/PIN speech does not appear in the transcript.

Demo credential: `tanmay09` / `12345`.

Verify `/auth/signup` redirects back to voice login.

## 3. Stateful voice recovery
From login and authenticated routes, say “help”, “repeat that”, and “where am I”. Verify the response matches the current context. Verify the visible voice dock stop control interrupts speech cleanly.

## 4. Authenticated flow
After voice login, verify protected routes open normally and the requested destination is preserved. Verify logout returns to the public gateway.

## 5. Accessibility
Run keyboard-only checks plus NVDA/VoiceOver through gateway, voice auth, dashboard, exam, practice, results, history, analysis and settings. Verify focus order, live announcements, 150% text scaling and no content covered by the voice dock.

## 6. Reliability
Test microphone permission denied, temporary speech-network interruption, repeated no-speech events, low-confidence recognition, and a second attempt after an unknown command. Verify the user always gets an actionable spoken recovery instead of a dead end.

## 7. Security and PWA
Verify protected routes return controlled unauthenticated responses, `/manifest.json`, `/sw.js` and the voice transcription endpoint are reachable where expected, answer keys never enter the client payload, and active sessions cannot navigate away through unsafe voice commands.
