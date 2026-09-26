# Accessibility Requirements: EXAMSAARTHI V2

## Philosophy

Accessibility is not a feature added at the end; it is the core interaction model. The application must be fully usable by a candidate without sight, without any assistance.

## 1. Supported Assistive Technologies

- NVDA (Windows)
- JAWS (Windows)
- VoiceOver (macOS / iOS)
- TalkBack (Android)

## 2. Keyboard Navigation

- **No Keyboard Traps:** The user must be able to navigate into and out of all components.
- **Focus Indicators:** Highly visible focus outlines (e.g., `focus-visible:ring-2 focus-visible:ring-offset-2`).
- **Logical Tab Order:** DOM structure must match visual reading order.
- **Skip Links:** "Skip to main content" link at the very top of the page.
- **Custom Controls:** Any custom interactive element (like a complex selector) must implement full keyboard events (Space to activate, Arrow keys for list traversal).

## 3. Screen Reader Semantics

- **Headings:** Correct `h1` through `h6` hierarchy without skipping levels.
- **Landmarks:** Use `<header>`, `<main>`, `<nav>`, `<footer>`, `<aside>` correctly.
- **ARIA Live Regions:** Use `aria-live="polite"` or `aria-live="assertive"` for dynamic state changes (e.g., time remaining warnings, answer selected confirmations).
- **Accessible Names:** All interactive elements must have a discernible name (`aria-label`, `aria-labelledby`, or visually hidden text).
- **State Announcements:** Toggle buttons, checkboxes, and tabs must announce their state (`aria-expanded`, `aria-checked`, `aria-selected`).

## 4. Visual Accessibility

- **Color Contrast:** Minimum WCAG AA compliance (4.5:1 for normal text, 3:1 for large text and UI components). AAA preferred.
- **Color Independence:** Information conveyed with color must also be conveyed with text or icons.
- **Typography:** Scalable text. Users must be able to zoom up to 200% without loss of content or functionality.
- **Reduced Motion:** Respect `prefers-reduced-motion` media query for all animations.
- **Touch Targets:** Minimum 44x44 CSS pixels for interactive elements on touch devices.

## 5. Voice Interaction (Speech Synthesis & Recognition)

- **Language Tags:** Use correct `lang` attribute on the `<html>` element and any inline element that changes language (e.g., `<html lang="hi-IN">`).
- **Audio Clashing:** Ensure custom TTS does not overlap with native screen reader announcements. This is often solved by providing a setting to disable custom TTS if a screen reader is active, or relying entirely on semantic HTML for screen readers.
- **Clear Pronunciation:** Ensure text strings sent to Speech Synthesis are punctuated properly so the voice sounds natural and understandable.

## 6. Complex Content (Vision Accessibility)

- **Images/Graphs:** Must have comprehensive `alt` text or `aria-describedby` linking to a detailed text description.
- **Tables:** Data tables must use `<caption>`, `<thead>`, `<th>` (with `scope="col"` or `row`), and `<tbody>`.

## 7. Testing Requirements

- Automated testing with `axe-core`.
- Manual testing using keyboard only.
- Manual testing with NVDA or VoiceOver.
