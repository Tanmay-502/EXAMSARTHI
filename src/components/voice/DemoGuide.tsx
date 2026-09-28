'use client';

import { useEffect, useRef, useState } from 'react';
import { ChevronRight, Eye, Languages, Mic2, X } from 'lucide-react';
import { usePathname } from 'next/navigation';
import { useGlobalVoice } from './GlobalVoiceAssistant';

const guideItems = [
  {
    icon: Mic2,
    title: "Say “start practice”",
    description: "Use your voice to open practice and talk through subject, question count, and difficulty.",
  },
  {
    icon: Languages,
    title: "Try Hindi or Telugu",
    description: "Change language and hear the interface, voice commands, and spoken responses adapt.",
  },
  {
    icon: Eye,
    title: "Try a diagram question",
    description: "When an exam question contains a visual, ExamSaarthi can describe it without solving it.",
  },
];

export function DemoGuide() {
  const pathname = usePathname();
  const { useVoiceAction } = useGlobalVoice();
  const [open, setOpen] = useState(pathname === '/');
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (pathname !== '/') setOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!open) return;
    closeButtonRef.current?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open]);

  useVoiceAction((action) => {
    if (!open || action !== 'DISMISS_GUIDE') return false;
    setOpen(false);
    return true;
  });

  if (pathname !== '/' || !open) return null;

  return (
    <div className="fixed inset-3 z-[60] flex items-center justify-center md:inset-6" aria-hidden={!open}>
      <div
        className="absolute inset-0 bg-black/75 backdrop-blur-sm"
        aria-hidden="true"
      />
      <section
        role="dialog"
        aria-label="Quick demo guide"
        aria-describedby="demo-guide-description"
        className="relative w-full max-w-5xl rounded-3xl border border-white/15 bg-zinc-950 p-6 shadow-2xl md:p-10"
      >
        <div className="flex items-start justify-between gap-6 border-b border-zinc-800 pb-6">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.22em] text-zinc-400">QUICK DEMO</p>
            <h2 className="mt-3 text-3xl font-light tracking-tight text-white md:text-5xl">
              Try the voice-first experience.
            </h2>
            <p id="demo-guide-description" className="mt-3 max-w-3xl text-base text-zinc-400 md:text-lg">
              Three fast demos a sighted judge can follow visually while the candidate operates the app by voice.
            </p>
          </div>
          <button
            ref={closeButtonRef}
            type="button"
            onClick={() => setOpen(false)}
            className="shrink-0 rounded-full border border-zinc-700 p-3 text-zinc-300 hover:border-white hover:text-white focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-white/30"
            aria-label="Skip quick demo guide"
            title="Skip quick demo guide (Escape)"
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
            Voice: say “skip guide”. Keyboard: press Escape.
          </p>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-white px-6 text-xs font-black uppercase tracking-[0.18em] text-black hover:bg-zinc-200 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-white/30"
          >
            Start demo
            <ChevronRight className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      </section>
    </div>
  );
}
