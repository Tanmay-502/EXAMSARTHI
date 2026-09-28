'use client';

import React, { useEffect, useRef, useState } from 'react';
import { VoiceStatusIndicator } from './VoiceStatusIndicator';
import { VoiceTranscript } from './VoiceTranscript';
import { DemoGuide } from './DemoGuide';
import { useVoice } from '@/lib/voice/useVoice';
import { useI18n } from '@/lib/i18n/I18nProvider';

const STORAGE_KEY = 'examsaarthi_voice_dock_expanded';

export function VoiceOverlay() {
  const { transcript } = useVoice();
  const { t, tParams } = useI18n();
  const [expanded, setExpanded] = useState(false);
  const dockRef = useRef<HTMLElement>(null);
  const toggleRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    let savedExpanded = false;
    try {
      savedExpanded = sessionStorage.getItem(STORAGE_KEY) === 'true';
    } catch {
      // Session storage can be unavailable in restricted browser contexts.
    }

    const frame = window.requestAnimationFrame(() => {
      setExpanded(savedExpanded);
    });

    return () => window.cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    const dock = dockRef.current;
    if (!dock) return;

    const updateHeight = () => {
      const height = Math.ceil(dock.getBoundingClientRect().height);
      document.documentElement.style.setProperty('--voice-dock-height', height + 'px');
    };

    updateHeight();

    if (typeof ResizeObserver !== 'undefined') {
      const observer = new ResizeObserver(updateHeight);
      observer.observe(dock);
      return () => observer.disconnect();
    }

    window.addEventListener('resize', updateHeight);
    return () => window.removeEventListener('resize', updateHeight);
  }, [expanded, transcript.length]);

  const setExpandedAndPersist = (nextExpanded: boolean) => {
    setExpanded(nextExpanded);
    try {
      sessionStorage.setItem(STORAGE_KEY, String(nextExpanded));
    } catch {
      // Keep the dock usable without persistence.
    }
  };

  const collapseAndRestoreFocus = () => {
    setExpandedAndPersist(false);
    window.requestAnimationFrame(() => {
      toggleRef.current?.focus();
    });
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLElement>) => {
    if (event.key === 'Escape' && expanded) {
      event.preventDefault();
      collapseAndRestoreFocus();
    }
  };

  const latestAssistantMessage = [...transcript]
    .reverse()
    .find((message) => message.sender === 'assistant');
  const latestAssistantLine = latestAssistantMessage?.text?.trim() || t('voice_ready');

  return (
    <>
      <aside
        ref={dockRef}
        data-testid="voice-dock"
        aria-label={t('voice_status_label')}
        onKeyDown={handleKeyDown}
        className="pointer-events-none fixed bottom-2 left-2 right-2 z-50 w-auto md:bottom-4 md:left-auto md:right-4 md:w-full md:max-w-[28rem]"
      >
        <div className="pointer-events-auto w-full">
          <div
            id="voice-transcript-panel"
            hidden={!expanded}
            className="max-h-[calc(45dvh-3.5rem)] overflow-hidden rounded-t-2xl border border-zinc-800 bg-zinc-950 shadow-[0_-16px_50px_rgba(0,0,0,0.35)]"
          >
            <VoiceTranscript />
          </div>

          <div className="flex h-14 min-h-14 w-full items-center gap-2 rounded-t-2xl border border-zinc-800 bg-zinc-950 px-3 shadow-[0_-8px_24px_rgba(0,0,0,0.35)] md:gap-3 md:px-4">
            <VoiceStatusIndicator dock />

            <div
              className="min-w-0 flex-1 truncate text-sm font-medium tracking-wide text-zinc-200 md:text-base"
              title={latestAssistantLine}
              aria-label={tParams('assistant_message', { message: latestAssistantLine })}
            >
              {latestAssistantLine}
            </div>

            <button
              ref={toggleRef}
              type="button"
              id="voice-transcript-toggle"
              className="inline-flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-full border border-zinc-700 px-3 text-xs font-black uppercase tracking-[0.12em] text-zinc-100 transition-colors hover:border-zinc-400 hover:bg-zinc-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950 md:px-4"
              onClick={() => setExpandedAndPersist(!expanded)}
              aria-expanded={expanded}
              aria-controls="voice-transcript-panel"
            >
              {expanded ? t('hide_transcript') : t('live_transcript')}
            </button>
          </div>
        </div>
      </aside>
      <DemoGuide />
    </>
  );
}
