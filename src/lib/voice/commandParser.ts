import { LANGUAGE_REGISTRY, Locale } from '../i18n/registry';

export type VoiceCommand = 
  | { type: 'NEXT' }
  | { type: 'BACK' }
  | { type: 'REPEAT' }
  | { type: 'READ_QUESTION' }
  | { type: 'READ_OPTIONS' }
  | { type: 'TIME_LEFT' }
  | { type: 'MARK_REVIEW' }
  | { type: 'REMOVE_REVIEW' }
  | { type: 'SUBMIT' }
  | { type: 'HELP' }
  | { type: 'CONFIRM' }
  | { type: 'CHANGE' }
  | { type: 'REVIEW_UNANSWERED' }
  | { type: 'REVIEW_MARKED' }
  | { type: 'START' }
  | { type: 'JUMP_TO_QUESTION'; index: number }
  | { type: 'SELECT_OPTION'; index: number } // 0-based index
  | { type: 'SETTINGS' }
  | { type: 'HISTORY' }
  | { type: 'LOGOUT' }
  | { type: 'DASHBOARD_EXAM' }
  | { type: 'READ_PROGRESS' }
  | { type: 'OPEN_DASHBOARD' }
  | { type: 'DASHBOARD_PRACTICE' }
  | { type: 'SET_LANGUAGE_ENGLISH' }
  | { type: 'SET_LANGUAGE_HINDI' }
  | { type: 'SET_LANGUAGE_TELUGU' }
  | { type: 'SIGN_IN' }
  | { type: 'SIGN_UP' }
  | { type: 'SELECT_MODE_STANDARD' }
  | { type: 'SELECT_MODE_VOICE' }
  | { type: 'OPEN_ANALYSIS' }
  | { type: 'UNKNOWN' };

export function parseCommand(transcript: string, lang: Locale): VoiceCommand {
  const normalized = transcript.trim().toLowerCase().replace(/[.,!?।\-]/g, '');
  const langDef = LANGUAGE_REGISTRY[lang];
  
  if (!langDef) return { type: 'UNKNOWN' };

  // Helper to check if a phrase is present as whole words
  const matchesPhrase = (text: string, phrase: string) => {
    // Escape regex special chars in phrase just in case
    const escaped = phrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`(^|\\s)${escaped}(?=\\s|$)`, 'i');
    return regex.test(text);
  };

  // Hardcoded fallback for onboarding mode selection (English and transliterations)
  if (matchesPhrase(normalized, 'standard') || matchesPhrase(normalized, 'स्टैंडर्ड') || matchesPhrase(normalized, 'స్టాండర్డ్') || matchesPhrase(normalized, 'సాధారణం')) return { type: 'SELECT_MODE_STANDARD' };
  if (matchesPhrase(normalized, 'voice first') || matchesPhrase(normalized, 'voicefirst') || matchesPhrase(normalized, 'voice') || matchesPhrase(normalized, 'वॉइस फर्स्ट') || matchesPhrase(normalized, 'वॉइस') || matchesPhrase(normalized, 'వాయిస్ ఫస్ట్') || matchesPhrase(normalized, 'వాయిస్')) return { type: 'SELECT_MODE_VOICE' };

  // Natural-language shortcuts for common navigation and study intents.
  if (/\b(i|i'd|i would|i want|i need|would like)\b.*\b(give|take|start|attempt)\b.*\b(exam|test)\b/.test(normalized)) return { type: 'DASHBOARD_EXAM' };
  if (/\b(i|i'd|i would|i want|i need|would like)\b.*\b(practice|prepare)\b/.test(normalized)) return { type: 'DASHBOARD_PRACTICE' };
  if (/\b(take me|go to|open|show|bring me|send me|return to|back to)\b.*\b(dashboard|home)\b/.test(normalized)) return { type: 'OPEN_DASHBOARD' };
  if (/\b(give me|show me|tell me|check|what is my)\b.*\b(progress|performance|score)\b/.test(normalized)) return { type: 'READ_PROGRESS' };
  if (/\b(i|i'd|i would|i want|i need|would like)\b.*\b(sign in|login|log in)\b/.test(normalized)) return { type: 'SIGN_IN' };
  if (/\b(i|i'd|i would|i want|i need|would like)\b.*\b(sign up|signup|register|create an account)\b/.test(normalized)) return { type: 'SIGN_UP' };
  // Hardcoded fallback for analysis
  if (matchesPhrase(normalized, 'analysis') || matchesPhrase(normalized, 'show analysis') || matchesPhrase(normalized, 'open analysis') || matchesPhrase(normalized, 'give me the analysis') || matchesPhrase(normalized, 'tell me my analysis') || matchesPhrase(normalized, 'tell me the analysis of me') || matchesPhrase(normalized, 'analyse my preparation') || matchesPhrase(normalized, 'analyze my preparation') || matchesPhrase(normalized, 'show my performance') || matchesPhrase(normalized, 'how am i performing') || matchesPhrase(normalized, 'how is my preparation') || matchesPhrase(normalized, 'analyze') || matchesPhrase(normalized, 'analyse') || matchesPhrase(normalized, 'విశ్లేషణ') || matchesPhrase(normalized, 'విశ్లేషణ చూపించు') || matchesPhrase(normalized, 'నా విశ్లేషణ') || matchesPhrase(normalized, 'నా పనితీరు ఎలా ఉంది') || matchesPhrase(normalized, 'నా తయారీ ఎలా ఉంది') || matchesPhrase(normalized, 'పనితీరు')) return { type: 'OPEN_ANALYSIS' };

  // Collect all phrases and sort by length descending to match longest first
  const allPhrases: { commandType: string, phrase: string }[] = [];
  for (const [commandType, phrases] of Object.entries(langDef.voiceCommands)) {
    for (const phrase of phrases) {
      allPhrases.push({ commandType, phrase });
    }
  }
  allPhrases.sort((a, b) => b.phrase.length - a.phrase.length);

  // Check direct mappings
  for (const { commandType, phrase } of allPhrases) {
    if (matchesPhrase(normalized, phrase)) {
      if (commandType === 'JUMP_TO_QUESTION') {
        const match = normalized.match(/\d+/);
        if (match) {
          return { type: 'JUMP_TO_QUESTION', index: parseInt(match[0], 10) - 1 };
        }
        return { type: 'UNKNOWN' };
      }
      return { type: commandType } as VoiceCommand;
    }
  }

  // Check option selection
  const values = langDef.optionValues;
  const matchA = values.a.some(v => matchesPhrase(normalized, v));
  const matchB = values.b.some(v => matchesPhrase(normalized, v));
  const matchC = values.c.some(v => matchesPhrase(normalized, v));
  const matchD = values.d.some(v => matchesPhrase(normalized, v));

  if (matchA) return { type: 'SELECT_OPTION', index: 0 };
  if (matchB) return { type: 'SELECT_OPTION', index: 1 };
  if (matchC) return { type: 'SELECT_OPTION', index: 2 };
  if (matchD) return { type: 'SELECT_OPTION', index: 3 };

  return { type: 'UNKNOWN' };
}
