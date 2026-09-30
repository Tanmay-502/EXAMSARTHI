'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

export type InteractionMode = 'standard' | 'voice-first'

const STORAGE_KEY = 'examsarthi_mode'

/** Narrows an unknown stored preference to a supported interaction mode. */
function isInteractionMode(value: unknown): value is InteractionMode {
  return value === 'standard' || value === 'voice-first'
}

/**
 * Loads the profile interaction mode, falling back to local storage and then standard mode.
 * The setter does not persist the preference to the server.
 * @returns The current mode, a setter for state and local storage, and whether initial loading has finished.
 */
export function usePreferredMode(): {
  mode: InteractionMode
  setMode: (mode: InteractionMode) => void
  isLoaded: boolean
} {
  const [mode, setModeState] = useState<InteractionMode>('voice-first')
  const [isLoaded, setIsLoaded] = useState(false)

  useEffect(() => {
    let cancelled = false

    /** Resolves the authenticated profile preference with a local fallback, ignoring results after cleanup. */
    const loadPreference = async () => {
      let localMode: InteractionMode | null = null

      try {
        const saved = localStorage.getItem(STORAGE_KEY)
        if (isInteractionMode(saved)) {
          localMode = saved
        }
      } catch {
        // Continue with the server-backed preference when storage is unavailable.
      }

      /** Applies the resolved mode and marks loading complete unless the effect has been cancelled. */
      const applyMode = (nextMode: InteractionMode) => {
        if (cancelled) return
        setModeState(nextMode)
        setIsLoaded(true)
      }

      try {
        const supabase = createClient()
        const {
          data: { user },
        } = await supabase.auth.getUser()

        if (!user) {
          applyMode(localMode ?? 'voice-first')
          return
        }

        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('accessibility_prefs')
          .eq('id', user.id)
          .maybeSingle()

        if (profileError) {
          applyMode(localMode ?? 'voice-first')
          return
        }

        const profilePrefs =
          profile?.accessibility_prefs &&
          typeof profile.accessibility_prefs === 'object' &&
          !Array.isArray(profile.accessibility_prefs)
            ? (profile.accessibility_prefs as { preferred_mode?: unknown })
            : null
        const profileMode = profilePrefs?.preferred_mode
        const nextMode = isInteractionMode(profileMode) ? profileMode : (localMode ?? 'voice-first')

        if (cancelled) return

        try {
          localStorage.setItem(STORAGE_KEY, nextMode)
        } catch {
          // The server-backed preference remains authoritative for this session.
        }

        applyMode(nextMode)
      } catch {
        // Local storage remains the fallback when the authenticated profile is unavailable.
        applyMode(localMode ?? 'voice-first')
      }
    }

    void loadPreference()

    return () => {
      cancelled = true
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
