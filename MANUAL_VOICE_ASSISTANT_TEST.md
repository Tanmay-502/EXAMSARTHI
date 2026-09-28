# Manual Voice Assistant Test Plan

## Gateway and auth
1. Open `/`; do not expect automatic voice activation.
2. Use gateway actions or `L` / `S`.
3. For a saved `voice-first` user, verify auth voice email capture.
4. Verify email read-back and explicit confirmation before sending.

## Welcome
1. After authentication, open `/welcome`.
2. Confirm the voice welcome message and continuous listening behavior.
3. Confirm DemoGuide opens from the voice activation event and supports dismissal.

## Onboarding
1. Use voice or keyboard to choose mode.
2. Select English, Hindi, or Telugu.
3. Confirm spoken confirmation says preferences were saved and dashboard navigation follows.
4. Confirm returning users can continue directly to `/dashboard`.

## Safety
Verify voice actions remain constrained by SafeActionRegistry and the assistant never solves active exam questions.