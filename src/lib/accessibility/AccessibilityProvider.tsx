'use client'

import React, { createContext, useContext, useState, ReactNode, useCallback, useRef, useEffect } from 'react';

type AccessibilityContextType = {
  announce: (message: string, politeness?: 'polite' | 'assertive') => void;
};

const AccessibilityContext = createContext<AccessibilityContextType | undefined>(undefined);

export function AccessibilityProvider({ children }: { children: ReactNode }) {
  const [announcement, setAnnouncement] = useState<{ message: string; politeness: 'polite' | 'assertive' }>({ message: '', politeness: 'polite' });
  const clearTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const announce = useCallback((message: string, politeness: 'polite' | 'assertive' = 'polite') => {
    if (!message.trim()) return;
    if (clearTimeoutRef.current) clearTimeout(clearTimeoutRef.current);
    setAnnouncement({ message, politeness });
    clearTimeoutRef.current = setTimeout(() => {
      setAnnouncement({ message: '', politeness });
      clearTimeoutRef.current = null;
    }, 3000);
  }, []);

  useEffect(() => () => {
    if (clearTimeoutRef.current) clearTimeout(clearTimeoutRef.current);
  }, []);

  return (
    <AccessibilityContext.Provider value={{ announce }}>
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

export function useAccessibility() {
  const context = useContext(AccessibilityContext);
  if (!context) throw new Error('useAccessibility must be used within AccessibilityProvider');
  return context;
}
