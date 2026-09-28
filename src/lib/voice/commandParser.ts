import { LANGUAGE_REGISTRY } from '../i18n/registry.ts';
import type { Locale } from '../i18n/registry.ts';

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
  | { type: 'DISMISS_GUIDE' }
  | { type: 'UNKNOWN' };

export function parseCommand(transcript: string, lang: Locale, context?: string): VoiceCommand {
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

  // Practice intent takes precedence whenever the utterance explicitly contains
  // a practice word. This prevents the generic exam/test catch-alls from winning.
  const practiceWords = lang === 'hi-IN'
    ? ['अभ्यास', 'प्रैक्टिस']
    : lang === 'te-IN'
      ? ['ప్రాక్టీస్', 'సాధన']
      : ['practice', 'practise', 'practicing', 'practising'];
  const containsPracticeWord = practiceWords.some((word) =>
    /[A-Za-z]/.test(word) ? matchesPhrase(normalized, word) : normalized.includes(word)
  );
  if (containsPracticeWord) return { type: 'DASHBOARD_PRACTICE' };

  // Hardcoded fallback for onboarding mode selection (English and transliterations)
  if (matchesPhrase(normalized, 'standard') || matchesPhrase(normalized, 'स्टैंडर्ड') || matchesPhrase(normalized, 'స్టాండర్డ్') || matchesPhrase(normalized, 'సాధారణం')) return { type: 'SELECT_MODE_STANDARD' };
  if (matchesPhrase(normalized, 'voice first') || matchesPhrase(normalized, 'voicefirst') || matchesPhrase(normalized, 'voice') || matchesPhrase(normalized, 'वॉइस फर्स्ट') || matchesPhrase(normalized, 'वॉइस') || matchesPhrase(normalized, 'వాయిస్ ఫస్ట్') || matchesPhrase(normalized, 'వాయిస్')) return { type: 'SELECT_MODE_VOICE' };

  // Natural-language shortcuts for common navigation and study intents.
  // Keep these deterministic and deliberately broad so normal speech does not
  // depend on the LLM intent service being available.
  if (/\b(i|i'd|i would|i want|i need|would like|can you|could you)\b.*\b(give|take|start|attempt|write)\b.*\b(exam|test|paper)\b/.test(normalized)) return { type: 'DASHBOARD_EXAM' };
  if (/\b(i|i'd|i would|i want|i need|would like|can you|could you)\b.*\b(practice|prepare|study)\b/.test(normalized)) return { type: 'DASHBOARD_PRACTICE' };
  if (/\b(take me|go to|open|show|bring me|send me|return to|back to|navigate to)\b.*\b(dashboard|home)\b/.test(normalized)) return { type: 'OPEN_DASHBOARD' };
  if (/\b(give me|show me|tell me|check|what is my|how is my)\b.*\b(progress|performance|score|result|results)\b/.test(normalized)) return { type: 'READ_PROGRESS' };
  if (/\b(i|i'd|i would|i want|i need|would like|can you|could you)\b.*\b(sign in|login|log in)\b/.test(normalized)) return { type: 'SIGN_IN' };
  if (/\b(i|i'd|i would|i want|i need|would like|can you|could you)\b.*\b(sign up|signup|register|create an account|create account)\b/.test(normalized)) return { type: 'SIGN_UP' };
  // Natural-language shortcuts for Hindi and Telugu voice flows.
  if (lang === 'hi-IN') {
    if (/(मैं|मुझे)\s+.*(परीक्षा|टेस्ट).*(देना|शुरू|लेना)/.test(normalized)) return { type: 'DASHBOARD_EXAM' };
    if (/(मैं|मुझे)\s+.*(अभ्यास|प्रैक्टिस).*(करना|शुरू|चाहिए|है)/.test(normalized)) return { type: 'DASHBOARD_PRACTICE' };
    if (/(मुझे|मैं).*(साइन इन|लॉग इन|लॉगिन)/.test(normalized)) return { type: 'SIGN_IN' };
    if (/(मुझे|मैं).*(साइन अप|अकाउंट बनाना|खाता बनाना)/.test(normalized)) return { type: 'SIGN_UP' };
    if (/(डैशबोर्ड|होम).*(जाएं|जाओ|खोलें|खोलो|वापस)/.test(normalized)) return { type: 'OPEN_DASHBOARD' };
  }

  if (lang === 'te-IN') {
    if (/(నేను|నాకు).*(పరీక్ష|టెస్ట్).*(రాయ|ప్రారంభ|తీసుకో)/.test(normalized)) return { type: 'DASHBOARD_EXAM' };
    if (/(నేను|నాకు).*(ప్రాక్టీస్).*(చేయ|ప్రారంభ)/.test(normalized)) return { type: 'DASHBOARD_PRACTICE' };
    if (/(సైన్ ఇన్|లాగిన్).*/.test(normalized)) return { type: 'SIGN_IN' };
    if (/(సైన్ అప్|ఖాతా సృష్టించ|అకౌంట్).*/.test(normalized)) return { type: 'SIGN_UP' };
    if (/(డాష్‌బోర్డ్|డాష్బోర్డ్|హోమ్).*(వెళ్ల|తెర|తిరిగి)/.test(normalized)) return { type: 'OPEN_DASHBOARD' };
  }

  if (matchesPhrase(normalized, 'skip guide') || matchesPhrase(normalized, 'dismiss guide') || matchesPhrase(normalized, 'close guide')) return { type: 'DISMISS_GUIDE' };

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
  const isExamContext = context === 'exam' || context === 'practice';
  const hasExplicitOptionKeyword =
    langDef.optionKeywords.some(keyword => matchesPhrase(normalized, keyword));

  // Bare words such as "first" are only answer selections inside the
  // exam/practice context. This prevents ordinary speech like "who is first"
  // from becoming SELECT_OPTION and then being rejected as an unavailable action.
  if (isExamContext || hasExplicitOptionKeyword) {
    const matchA = values.a.some(v => matchesPhrase(normalized, v));
    const matchB = values.b.some(v => matchesPhrase(normalized, v));
    const matchC = values.c.some(v => matchesPhrase(normalized, v));
    const matchD = values.d.some(v => matchesPhrase(normalized, v));

    if (matchA) return { type: 'SELECT_OPTION', index: 0 };
    if (matchB) return { type: 'SELECT_OPTION', index: 1 };
    if (matchC) return { type: 'SELECT_OPTION', index: 2 };
    if (matchD) return { type: 'SELECT_OPTION', index: 3 };
  }

  return { type: 'UNKNOWN' };
}
