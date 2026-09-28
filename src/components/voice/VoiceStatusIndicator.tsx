'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import { useVoice } from '@/lib/voice/useVoice';
import { Mic, MicOff, Loader2, Volume2, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export function VoiceStatusIndicator({ className, prominent = false }: { className?: string; prominent?: boolean }) {
  const { voiceState, micError } = useVoice();

  const getStatusContent = () => {
    switch (voiceState) {
      case 'IDLE':
        return micError === 'network'
          ? { icon: AlertCircle, label: 'Voice connection issue — keyboard fallback is available', color: 'text-amber-300', bg: 'bg-amber-500/10' }
          : { icon: Mic, label: 'Voice Assistant Ready', color: 'text-blue-400', bg: 'bg-blue-500/10' };
      case 'REQUESTING_PERMISSION':
        return { icon: Loader2, label: 'Requesting Microphone', color: 'text-amber-300', bg: 'bg-amber-500/10', spin: true };
      case 'LISTENING':
        return { icon: Mic, label: 'Listening for your next command', color: 'text-purple-300', bg: 'bg-purple-500/10' };
      case 'PROCESSING':
        return { icon: Loader2, label: 'Processing your command', color: 'text-indigo-300', bg: 'bg-indigo-500/10', spin: true };
      case 'SPEAKING':
        return { icon: Volume2, label: 'Speaking to you', color: 'text-emerald-300', bg: 'bg-emerald-500/10' };
      case 'PAUSED':
        return { icon: MicOff, label: 'Voice Paused', color: 'text-zinc-300', bg: 'bg-zinc-500/10' };
      case 'ERROR':
        return {
          icon: AlertCircle,
          label: micError === 'denied' ? 'Microphone Blocked — keyboard fallback is available' : 'Voice Error — keyboard fallback is available',
          color: 'text-red-300',
          bg: 'bg-red-500/10'
        };
      default:
        return { icon: Mic, label: 'Voice Assistant', color: 'text-zinc-300', bg: 'bg-zinc-500/10' };
    }
  };

  const status = getStatusContent();
  const Icon = status.icon;

  return (
    <div
      className={cn(
        'flex items-center gap-4 rounded-2xl border backdrop-blur-sm transition-colors',
        prominent
          ? 'w-full min-h-[72px] justify-between border-white/15 px-5 py-4 bg-black/95 shadow-[0_12px_40px_rgba(0,0,0,0.45)]'
          : 'px-3 py-1.5 border-white/5',
        status.bg,
        className
      )}
      role="status"
      aria-live="polite"
      aria-atomic="true"
      aria-label={`Voice state: ${voiceState}. ${status.label}.`}
    >
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={voiceState}
          initial={prominent ? { opacity: 0.4 } : { scale: 0.8, opacity: 0 }}
          animate={prominent ? { opacity: 1 } : { scale: 1, opacity: 1 }}
          exit={prominent ? { opacity: 0.4 } : { scale: 0.8, opacity: 0 }}
          transition={{ duration: 0.15 }}
        >
          <Icon className={cn(prominent ? 'h-8 w-8' : 'h-4 w-4', status.color, status.spin && !prominent && 'animate-spin')} aria-hidden="true" />
        </motion.div>
      </AnimatePresence>
      <div className="flex min-w-0 flex-1 items-center gap-4">
        <span className={cn(
          'font-black uppercase tracking-[0.22em]',
          prominent ? 'text-xl md:text-2xl' : 'text-xs',
          status.color
        )}>
          {voiceState}
        </span>
        <span className={cn(
          'truncate font-medium tracking-wide',
          prominent ? 'text-base md:text-xl text-white' : 'text-xs',
          prominent ? '' : status.color
        )}>
          {status.label}
        </span>
      </div>
      {prominent && (
        <span className="hidden shrink-0 rounded-full border border-zinc-700 px-3 py-1 text-xs font-bold uppercase tracking-[0.16em] text-zinc-300 sm:inline-flex">
          Live voice
        </span>
      )}
    </div>
  );
}
