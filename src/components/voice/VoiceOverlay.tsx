'use client';

import React, { useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import { VoiceStatusIndicator } from './VoiceStatusIndicator';
import { VoiceTranscript } from './VoiceTranscript';
import { DemoGuide } from './DemoGuide';
import { useVoice } from '@/lib/voice/useVoice';

const STORAGE_KEY = 'examsaarthi_voice_dock_expanded';

export function VoiceOverlay() {
  const pathname = usePathname();
  const { transcript } = useVoice();
  const [expanded, setExpanded] = useState(false);
  const dockRef = useRef<HTMLDivElement>(null);

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
      document.documentElement.style.setProperty('--voice-dock-h', `${height}px`);
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

  const latestMessage = transcript[transcript.length - 1];
  const latestUtterance = latestMessage?.text?.trim() || 'No voice interaction yet.';
  const latestSender = latestMessage?.sender === 'user' ? 'You' : 'ExamSaarthi';

  return (
    <>
      <aside
        ref={dockRef}
        data-testid="voice-dock"
        aria-label="Voice assistant status and transcript"
        className="fixed inset-x-0 bottom-0 z-50 w-full"
      >
        <div className="mx-auto w-full max-w-6xl">
          {expanded && (
            <div
              id="voice-transcript-panel"
              className="max-h-[40vh] overflow-hidden border-x border-t border-zinc-800 bg-zinc-950 shadow-[0_-16px_50px_rgba(0,0,0,0.35)]"
            >
              <VoiceTranscript />
            </div>
          )}

          <div className="flex h-16 min-h-16 w-full items-center gap-2 border-t border-zinc-800 bg-zinc-950 px-3 shadow-[0_-8px_24px_rgba(0,0,0,0.35)] md:gap-3 md:px-5">
            <VoiceStatusIndicator dock />

            <div
              className="min-w-0 flex-1 truncate text-sm font-medium tracking-wide text-zinc-200 md:text-base"
              title={latestUtterance}
              aria-label={`${latestSender}: ${latestUtterance}`}
            >
              <span className="font-bold text-zinc-400">{latestSender}:</span>{' '}
              {latestUtterance}
            </div>

            <button
              type="button"
              id="voice-transcript-toggle"
              className="inline-flex min-h-11 shrink-0 items-center justify-center rounded-full border border-zinc-700 px-4 text-xs font-black uppercase tracking-[0.16em] text-zinc-100 transition-colors hover:border-zinc-400 hover:bg-zinc-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950 md:px-5"
              onClick={() => setExpandedAndPersist(!expanded)}
              aria-expanded={expanded}
              aria-controls="voice-transcript-panel"
            >
              Transcript
            </button>
          </div>
        </div>
      </aside>
      <DemoGuide key={pathname} />
    </>
  );
}
