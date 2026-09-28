import { create } from 'zustand'

export type VoiceAppContext =
  | 'landing'
  | 'mode_selection'
  | 'language_selection'
  | 'onboarding'
  | 'auth'
  | 'settings'
  | 'dashboard'
  | 'exam_lobby'
  | 'exam_active'
  | 'practice_setup'
  | 'practice_active'
  | 'results'
  | 'history'
  | 'analysis'
  | 'unknown'

type VoiceContextState = {
  context: VoiceAppContext
  setContext: (context: VoiceAppContext) => void
}

export const useVoiceAppContext = create<VoiceContextState>((set) => ({
  context: 'unknown',
  setContext: (context) => set({ context }),
}))
