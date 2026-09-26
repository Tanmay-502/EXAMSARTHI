# ExamSaarthi V2 Multilingual Support

## Overview

ExamSaarthi V2 supports multilingual content natively across the UI, text-to-speech (TTS) announcements, and deterministic voice command parsing.

Currently supported languages:

- **English** (`en-IN`)
- **Hindi** (`hi-IN`)
- **Telugu** (`te-IN`)

## Architecture

1. **State Management**:
   The current language is managed globally by the `I18nProvider` via `src/lib/i18n/I18nProvider.tsx`.
   It relies on an internal React context and persists the preference in `localStorage`.

2. **String Registry**:
   All translations, voice commands, and TTS announcement templates are stored in `src/lib/i18n/registry.ts`.
   This is the single source of truth. **No strings should be hardcoded in the React components**.

3. **Database Schema**:
   Questions and options support multilingual translations via JSONB columns in the `questions` table:
   - `content_translations`: E.g., `{"hi-IN": "भारत की राजधानी क्या है?", "te-IN": "భారతదేశ రాజధాని ఏమిటి?"}`
   - `options_translations`: E.g., `{"hi-IN": ["मुंबई", "नई दिल्ली", "कोलकाता", "चेन्नई"]}`

4. **Translation Application**:
   When fetching questions (`src/app/exam/actions.ts`), the backend overrides the English default strings with the translated strings matching the user's selected language before serving them to the frontend. Correct answers are never sent to the frontend; grading occurs securely on the server via `submitExamAnswers`.

## Voice Commands

Deterministic voice commands map entirely to the strings defined in `registry.ts`. When the user switches languages:

- The UI language updates.
- The `lang` attribute on the `<html>` element changes.
- The browser SpeechSynthesis engine respects the new language code (for TTS).
- The `commandParser` recognizes spoken commands matching the selected language's translations in `registry.ts`.

## How to add a new language

1. **Update `Lang` type**: Add the new language code (e.g. `'mr-IN'` for Marathi) to the `Lang` type in `src/lib/i18n/registry.ts`.
2. **Add translations**: Create a new dictionary in `LANGUAGE_REGISTRY` in `registry.ts`. Ensure all UI keys and voice command trigger arrays are populated.
3. **Update UI**: Add a language selection button in `src/app/settings/page.tsx` for the new language.
4. **Database updates**: Add the translations for the new language code directly into the `content_translations` and `options_translations` JSONB columns in the database.
