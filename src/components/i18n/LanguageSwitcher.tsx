'use client'

import { useI18n } from '@/lib/i18n/I18nProvider'

type LanguageOption = {
  value: 'en-IN' | 'hi-IN' | 'te-IN'
  label: string
}

const LANGUAGES: LanguageOption[] = [
  { value: 'en-IN', label: 'English' },
  { value: 'hi-IN', label: 'हिन्दी' },
  { value: 'te-IN', label: 'తెలుగు' },
]

export function LanguageSwitcher() {
  const { lang, setLang } = useI18n()
  return (
    <label className="inline-flex items-center gap-2 text-sm text-zinc-400">
      <span className="sr-only">Language</span>
      <select
        aria-label="Language"
        value={lang}
        onChange={(event) => setLang(event.target.value as LanguageOption['value'])}
        className="rounded-full border border-zinc-800 bg-black px-3 py-2 text-sm text-zinc-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
      >
        {LANGUAGES.map((language) => (
          <option key={language.value} value={language.value}>{language.label}</option>
        ))}
      </select>
    </label>
  )
}