'use client';

import React, { useEffect, useRef } from 'react';
import { useVoice } from '@/lib/voice/useVoice';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

export function VoiceTranscript({ className, prominent = false }: { className?: string; prominent?: boolean }) {
  const { transcript } = useVoice();
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [transcript]);

  return (
    <div
      className={cn(
        'flex flex-col overflow-y-auto rounded-2xl border bg-black/95 backdrop-blur-md',
        prominent
          ? 'max-h-48 space-y-3 border-white/10 p-4 md:max-h-56 md:p-5 shadow-[0_12px_40px_rgba(0,0,0,0.4)]'
          : 'space-y-3 border-white/10 p-4',
        className
      )}
      ref={scrollRef}
      role="log"
      tabIndex={-1}
      aria-live="polite"
      aria-atomic="false"
      aria-label="Conversation transcript"
    >
      {prominent && (
        <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
          <span className="text-xs font-black uppercase tracking-[0.2em] text-zinc-300">Live transcript</span>
          <span className="text-xs font-medium text-zinc-500">{transcript.length} messages</span>
        </div>
      )}
      <AnimatePresence initial={false}>
        {transcript.map((msg) => (
          <motion.div
            key={msg.id}
            initial={prominent ? { opacity: 0, y: 4 } : { opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            className={cn(
              'max-w-[94%] rounded-2xl border px-4 py-3 leading-relaxed',
              prominent ? 'text-base md:text-lg' : 'text-sm',
              msg.sender === 'user'
                ? 'self-end rounded-br-sm border-purple-400/30 bg-purple-500/20 text-purple-50'
                : 'self-start rounded-bl-sm border-blue-400/30 bg-blue-500/20 text-blue-50'
            )}
          >
            <span className="sr-only">{msg.sender === 'user' ? 'You said:' : 'Assistant said:'}</span>
            {msg.text}
          </motion.div>
        ))}
      </AnimatePresence>
      {transcript.length === 0 && (
        <div className={cn('text-center italic text-zinc-400', prominent ? 'py-4 text-base' : 'py-8 text-sm')}>
          Waiting for voice interaction...
        </div>
      )}
    </div>
  );
}
