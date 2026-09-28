export type SayMode = 'standard' | 'voice-first'

export function say(
  text: string,
  mode: SayMode,
  speak: (text: string) => void,
  announce: (text: string, politeness?: 'polite' | 'assertive') => void,
  politeness: 'polite' | 'assertive' = 'polite',
) {
  if (mode === 'voice-first') {
    speak(text)
  } else {
    announce(text, politeness)
  }
}
