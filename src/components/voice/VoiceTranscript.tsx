'use client';

import React, { useEffect, useRef } from 'react';
import { useVoice } from '@/lib/voice/useVoice';
import { useI18n } from '@/lib/i18n/I18nProvider';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

export function VoiceTranscript({ className }: { className?: string }) {
  const { transcript } = useVoice();
  const { t, tParams } = useI18n();
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [transcript]);

  return (
    <div
      className={cn(
        'flex h-[min(40dvh,calc(45dvh-3.5rem))] max-h-none flex-col overflow-y-auto bg-zinc-950',
        'space-y-3 p-4 md:p-5',
        className
      )}
      ref={scrollRef}
      role="log"
      tabIndex={0}
      aria-live="off"
      aria-atomic="false"
      aria-label={t('live_transcript')}
    >
      <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
        <span className="text-xs font-black uppercase tracking-[0.2em] text-zinc-300">{t('live_transcript')}</span>
        <span className="text-xs font-medium text-zinc-400">{tParams('transcript_messages', { count: transcript.length })}</span>
      </div>

      <AnimatePresence initial={false}>
        {transcript.map((msg) => (
          <motion.div
            key={msg.id}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            className={cn(
              'max-w-[94%] rounded-2xl border px-4 py-3 text-sm leading-relaxed md:text-base',
              msg.sender === 'user'
                ? 'self-end rounded-br-sm border-purple-400/30 bg-purple-500/20 text-purple-50'
                : 'self-start rounded-bl-sm border-blue-400/30 bg-blue-500/20 text-blue-50'
            )}
          >
            <span className="sr-only">{msg.sender === 'user' ? t('you_said') : t('assistant_said')}</span>
            {msg.text}
          </motion.div>
        ))}
      </AnimatePresence>

      {transcript.length === 0 && (
        <div className="py-6 text-center text-sm italic text-zinc-400">
          {t('waiting_voice')}
        </div>
      )}
    </div>
  );
}
