'use client'

const MODE_KEY = 'examsarthi_mode'
const LANG_KEY = 'examsarthi_lang'

export type SavedPreferences = {
  mode: 'standard' | 'voice-first'
  lang: 'en-IN' | 'hi-IN' | 'te-IN'
}

export function hasSavedPreferences(): boolean {
  return getSavedPreferences() !== null
}

export function getSavedPreferences(): SavedPreferences | null {
  try {
    const mode = localStorage.getItem(MODE_KEY)
    const lang = localStorage.getItem(LANG_KEY)
    if (
      (mode === 'standard' || mode === 'voice-first') &&
      (lang === 'en-IN' || lang === 'hi-IN' || lang === 'te-IN')
    ) {
      return { mode, lang }
    }
  } catch {
    // Treat unavailable browser storage as a first-time user.
  }
  return null
}