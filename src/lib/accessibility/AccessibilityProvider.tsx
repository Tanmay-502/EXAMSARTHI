'use client'

import React, {
  createContext,
  useContext,
  useState,
  ReactNode,
  useCallback,
  useEffect,
  useRef,
  useSyncExternalStore,
} from 'react';

type AccessibilityPreferences = {
  speechRate: number;
  voiceURI: string;
  highContrast: boolean;
  fontScale: number;
};

const DEFAULT_ACCESSIBILITY_PREFERENCES: AccessibilityPreferences = {
  speechRate: 1,
  voiceURI: '',
  highContrast: false,
  fontScale: 1,
};

const ACCESSIBILITY_STORAGE_KEY = 'accessibility_prefs';

let preferencesSnapshot = DEFAULT_ACCESSIBILITY_PREFERENCES;
let storageHydrated = false;
const preferenceListeners = new Set<() => void>();

function normalizePreferences(value: Partial<AccessibilityPreferences> | null | undefined): AccessibilityPreferences {
  const speechRate = typeof value?.speechRate === 'number'
    ? Math.min(1.5, Math.max(0.75, value.speechRate))
    : DEFAULT_ACCESSIBILITY_PREFERENCES.speechRate;
  const fontScale = typeof value?.fontScale === 'number'
    ? Math.min(1.5, Math.max(1, value.fontScale))
    : DEFAULT_ACCESSIBILITY_PREFERENCES.fontScale;

  return {
    speechRate,
    voiceURI: typeof value?.voiceURI === 'string' ? value.voiceURI : '',
    highContrast: value?.highContrast === true,
    fontScale,
  };
}

function applyVisualPreferences(preferences: AccessibilityPreferences) {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  root.dataset.highContrast = preferences.highContrast ? 'true' : 'false';
  root.dataset.fontScale = String(preferences.fontScale);
}

function notifyPreferenceListeners() {
  preferenceListeners.forEach((listener) => listener());
}

function hydrateAccessibilityPreferences() {
  if (storageHydrated || typeof window === 'undefined') return;
  storageHydrated = true;

  try {
    const stored = window.localStorage.getItem(ACCESSIBILITY_STORAGE_KEY);
    if (stored) {
      preferencesSnapshot = normalizePreferences(JSON.parse(stored) as Partial<AccessibilityPreferences>);
    }
  } catch {
    preferencesSnapshot = DEFAULT_ACCESSIBILITY_PREFERENCES;
  }

  applyVisualPreferences(preferencesSnapshot);
  notifyPreferenceListeners();
}

function updateAccessibilityPreferences(patch: Partial<AccessibilityPreferences>) {
  preferencesSnapshot = normalizePreferences({
    ...preferencesSnapshot,
    ...patch,
  });

  if (typeof window !== 'undefined') {
    try {
      window.localStorage.setItem(
        ACCESSIBILITY_STORAGE_KEY,
        JSON.stringify(preferencesSnapshot)
      );
    } catch {
      // Continue with in-memory preferences if storage is unavailable.
    }
  }

  applyVisualPreferences(preferencesSnapshot);
  notifyPreferenceListeners();
}

function subscribeToAccessibilityPreferences(listener: () => void) {
  preferenceListeners.add(listener);
  return () => preferenceListeners.delete(listener);
}

function getAccessibilityPreferencesSnapshot() {
  return preferencesSnapshot;
}

type AccessibilityContextType = {
  announce: (message: string, politeness?: 'polite' | 'assertive') => void;
  speechRate: number;
  voiceURI: string;
  highContrast: boolean;
  fontScale: number;
  updateAccessibilityPreferences: (patch: Partial<AccessibilityPreferences>) => void;
};

const AccessibilityContext = createContext<AccessibilityContextType | undefined>(undefined);

export function AccessibilityProvider({ children }: { children: ReactNode }) {
  const [announcement, setAnnouncement] = useState<{ message: string; politeness: 'polite' | 'assertive' }>({ message: '', politeness: 'polite' });
  const clearTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const announce = useCallback((message: string, politeness: 'polite' | 'assertive' = 'polite') => {
    if (clearTimeoutRef.current) {
      clearTimeout(clearTimeoutRef.current);
    }

    setAnnouncement({ message, politeness });
    clearTimeoutRef.current = setTimeout(() => {
      setAnnouncement({ message: '', politeness });
      clearTimeoutRef.current = null;
    }, 3000);
  }, []);

  const preferences = useSyncExternalStore(
    subscribeToAccessibilityPreferences,
    getAccessibilityPreferencesSnapshot,
    () => DEFAULT_ACCESSIBILITY_PREFERENCES
  );

  useEffect(() => {
    hydrateAccessibilityPreferences();
  }, []);

  useEffect(() => {
    return () => {
      if (clearTimeoutRef.current) {
        clearTimeout(clearTimeoutRef.current);
      }
    };
  }, []);

  return (
    <AccessibilityContext.Provider value={{ announce, ...preferences, updateAccessibilityPreferences }}>
      <a 
        href="#main-content" 
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:p-4 focus:bg-background focus:text-foreground focus:ring-2 focus:ring-primary focus:outline-none rounded-md"
      >
        Skip to main content
      </a>
      {children}
      <div
        aria-live={announcement.politeness === 'polite' ? 'polite' : 'off'}
        className="sr-only"
        role="status"
      >
        {announcement.politeness === 'polite' ? announcement.message : ''}
      </div>
      <div
        aria-live={announcement.politeness === 'assertive' ? 'assertive' : 'off'}
        className="sr-only"
        role="alert"
      >
        {announcement.politeness === 'assertive' ? announcement.message : ''}
      </div>
    </AccessibilityContext.Provider>
  );
}

export function useAccessibilityPreferences() {
  const preferences = useSyncExternalStore(
    subscribeToAccessibilityPreferences,
    getAccessibilityPreferencesSnapshot,
    () => DEFAULT_ACCESSIBILITY_PREFERENCES
  );
  return { ...preferences, updateAccessibilityPreferences };
}

export function useAccessibility() {
  const context = useContext(AccessibilityContext);
  if (!context) throw new Error('useAccessibility must be used within AccessibilityProvider');
  return context;
}
