'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { ChevronRight, Eye, Languages, Mic2, X } from 'lucide-react';
import { usePathname } from 'next/navigation';
import { useGlobalVoice } from './GlobalVoiceAssistant';
import { useI18n } from '@/lib/i18n/I18nProvider';

const SESSION_KEY = 'examsaarthi_demo_guide_seen';
const OPEN_EVENT = 'examsaarthi:voice-activated';

const guideIcons = [Mic2, Languages, Eye];

function hasSeenGuide() {
  try {
    return sessionStorage.getItem(SESSION_KEY) === 'true';
  } catch {
    return false;
  }
}

export function DemoGuide() {
  const pathname = usePathname();
  const { useVoiceAction } = useGlobalVoice();
  const { t } = useI18n();
  const guideItems = [
    { icon: guideIcons[0], title: t('demo_start_practice'), description: t('demo_start_practice_desc') },
    { icon: guideIcons[1], title: t('demo_try_languages'), description: t('demo_try_languages_desc') },
    { icon: guideIcons[2], title: t('demo_try_diagram'), description: t('demo_try_diagram_desc') },
  ];
  const [sessionSeen, setSessionSeen] = useState(() => hasSeenGuide());
  const [previousPathname, setPreviousPathname] = useState(pathname);
  const [open, setOpen] = useState(false);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const startButtonRef = useRef<HTMLButtonElement>(null);
  const returnFocusRef = useRef<HTMLElement | null>(null);

  if (pathname !== previousPathname) {
    setPreviousPathname(pathname);
    if (pathname !== '/welcome') {
      setOpen(false);
    }
  }

  const markGuideSeen = useCallback(() => {
    setSessionSeen(true);
    try {
      sessionStorage.setItem(SESSION_KEY, 'true');
    } catch {
      // Continue without session persistence if storage is unavailable.
    }
  }, []);

  const closeGuide = useCallback(() => {
    markGuideSeen();
    setOpen(false);
    window.requestAnimationFrame(() => {
      returnFocusRef.current?.focus();
    });
  }, [markGuideSeen]);

  useEffect(() => {
    if (pathname !== '/welcome' || sessionSeen) return;

    const openGuide = () => {
      if (sessionSeen || hasSeenGuide()) return;

      const activeElement = document.activeElement;
      returnFocusRef.current =
        activeElement instanceof HTMLElement && activeElement !== document.body
          ? activeElement
          : document.querySelector<HTMLElement>('#main-content button');

      markGuideSeen();
      setOpen(true);
    };

    window.addEventListener(OPEN_EVENT, openGuide);

    return () => window.removeEventListener(OPEN_EVENT, openGuide);
  }, [markGuideSeen, pathname, sessionSeen]);

  useEffect(() => {
    if (!open) return;

    closeButtonRef.current?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        closeGuide();
        return;
      }

      if (event.key !== 'Tab') return;

      const focusable = [closeButtonRef.current, startButtonRef.current].filter(
        (element): element is HTMLButtonElement => Boolean(element)
      );

      if (focusable.length === 0) return;

      const currentIndex = focusable.indexOf(document.activeElement as HTMLButtonElement);
      const nextIndex = event.shiftKey
        ? (currentIndex <= 0 ? focusable.length - 1 : currentIndex - 1)
        : (currentIndex >= focusable.length - 1 ? 0 : currentIndex + 1);

      event.preventDefault();
      focusable[nextIndex]?.focus();
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [closeGuide, open]);

  useVoiceAction((action) => {
    if (!open || action !== 'DISMISS_GUIDE') return false;
    closeGuide();
    return true;
  });

  if (pathname !== '/welcome' || !open) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 p-4 md:p-8" data-testid="demo-guide">
      <section
        role="dialog"
        aria-modal="true"
        aria-label={t('quick_demo_title')}
        aria-describedby="demo-guide-description"
        className="relative max-h-[calc(100dvh-1.5rem)] w-full max-w-5xl overflow-y-auto rounded-3xl border border-white/15 bg-zinc-950 p-6 shadow-2xl md:p-10"
      >
        <div className="flex items-start justify-between gap-6 border-b border-zinc-800 pb-6">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.22em] text-zinc-400">{t('quick_demo').toUpperCase()}</p>
            <h2 className="mt-3 text-3xl font-light tracking-tight text-white md:text-5xl">
              {t('quick_demo_title')}
            </h2>
            <p id="demo-guide-description" className="mt-3 max-w-3xl text-base text-zinc-400 md:text-lg">
              {t('quick_demo_desc')}
            </p>
          </div>
          <button
            ref={closeButtonRef}
            type="button"
            onClick={closeGuide}
            className="shrink-0 rounded-full border border-zinc-700 p-3 text-zinc-300 transition-colors hover:border-white hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950"
            aria-label={t('demo_skip')}
            title={t('demo_skip_title')}
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        <div className="mt-8 grid gap-4 md:grid-cols-3">
          {guideItems.map(({ icon: Icon, title, description }, index) => (
            <article key={title} className="rounded-2xl border border-zinc-800 bg-black p-5 md:p-6">
              <div className="flex items-center gap-3 text-zinc-400">
                <span className="text-xs font-black tracking-[0.2em]" aria-hidden="true">
                  0{index + 1}
                </span>
                <Icon className="h-5 w-5" aria-hidden="true" />
              </div>
              <h3 className="mt-5 text-xl font-medium text-white">{title}</h3>
              <p className="mt-3 text-base leading-relaxed text-zinc-400">{description}</p>
            </article>
          ))}
        </div>

        <div className="mt-8 flex flex-wrap items-center justify-between gap-4 border-t border-zinc-800 pt-6">
          <p className="text-sm font-medium text-zinc-400">
            {t('demo_skip')} · {t('demo_skip_title')}
          </p>
          <button
            ref={startButtonRef}
            type="button"
            onClick={closeGuide}
            className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-white px-6 text-xs font-black uppercase tracking-[0.18em] text-black transition-colors hover:bg-zinc-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950"
          >
            {t('demo_start')}
            <ChevronRight className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      </section>
    </div>
  );
}
