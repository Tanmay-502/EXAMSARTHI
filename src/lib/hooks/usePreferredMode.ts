'use client'

import { useState, useEffect } from 'react'

export type InteractionMode = 'standard' | 'voice-first'

const STORAGE_KEY = 'examsarthi_mode'

export function usePreferredMode(): {
  mode: InteractionMode
  setMode: (mode: InteractionMode) => void
  isLoaded: boolean
} {
  const [mode, setModeState] = useState<InteractionMode>('standard')
  const [isLoaded, setIsLoaded] = useState(false)

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY) as InteractionMode | null
      if (saved === 'standard' || saved === 'voice-first') {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setModeState(saved)
      }
    } catch {
      // Continue with the safe default when storage is unavailable.
    } finally {
      setIsLoaded(true)
    }
  }, [])

  const setMode = (newMode: InteractionMode) => {
    setModeState(newMode)
    try {
      localStorage.setItem(STORAGE_KEY, newMode)
    } catch {
      // In-memory preference still applies for the current session.
    }
  }

  return { mode, setMode, isLoaded }
}
