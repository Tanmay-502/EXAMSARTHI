'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import { useVoice } from '@/lib/voice/useVoice';
import { Mic, MicOff, Loader2, Volume2, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

type VoiceStatusIndicatorProps = {
  className?: string;
  dock?: boolean;
};

type StatusContent = {
  icon: typeof Mic;
  label: string;
  shortLabel: string;
  color: string;
  border: string;
  spin?: boolean;
};

export function VoiceStatusIndicator({ className, dock = false }: VoiceStatusIndicatorProps) {
  const { voiceState, micError } = useVoice();

  const getStatusContent = (): StatusContent => {
    switch (voiceState) {
      case 'IDLE':
        return micError === 'network'
          ? {
              icon: AlertCircle,
              label: 'Voice connection issue — keyboard fallback is available',
              shortLabel: 'READY',
              color: 'text-amber-300',
              border: 'border-amber-300/50',
            }
          : {
              icon: Mic,
              label: 'Voice Assistant Ready',
              shortLabel: 'READY',
              color: 'text-blue-400',
              border: 'border-zinc-700',
            };
      case 'REQUESTING_PERMISSION':
        return {
          icon: Loader2,
          label: 'Requesting microphone permission',
          shortLabel: 'REQUESTING',
          color: 'text-amber-300',
          border: 'border-amber-300/50',
          spin: true,
        };
      case 'LISTENING':
        return {
          icon: Mic,
          label: 'Listening for your next command',
          shortLabel: 'LISTENING',
          color: 'text-purple-300',
          border: 'border-purple-300/50',
        };
      case 'PROCESSING':
        return {
          icon: Loader2,
          label: 'Processing your command',
          shortLabel: 'PROCESSING',
          color: 'text-indigo-300',
          border: 'border-indigo-300/50',
          spin: true,
        };
      case 'SPEAKING':
        return {
          icon: Volume2,
          label: 'Speaking to you',
          shortLabel: 'SPEAKING',
          color: 'text-emerald-300',
          border: 'border-emerald-300/50',
        };
      case 'PAUSED':
        return {
          icon: MicOff,
          label: 'Voice paused',
          shortLabel: 'PAUSED',
          color: 'text-zinc-300',
          border: 'border-zinc-700',
        };
      case 'ERROR':
        return {
          icon: AlertCircle,
          label:
            micError === 'denied'
              ? 'Microphone blocked — keyboard fallback is available'
              : micError === 'not-supported'
                ? 'Voice unavailable — keyboard fallback is available'
                : 'Voice error — keyboard fallback is available',
          shortLabel: 'ERROR',
          color: 'text-red-300',
          border: 'border-red-300/60',
        };
      default:
        return {
          icon: Mic,
          label: 'Voice Assistant',
          shortLabel: 'READY',
          color: 'text-zinc-300',
          border: 'border-zinc-700',
        };
    }
  };

  const status = getStatusContent();
  const Icon = status.icon;
  const shouldAnnounce = micError === 'denied' || micError === 'not-supported';

  if (dock) {
    return (
      <div
        className={cn(
          'flex min-w-0 shrink-0 items-center gap-2 border-r pr-2 md:gap-3 md:pr-4',
          status.border,
          className
        )}
        role="status"
        aria-live={shouldAnnounce ? 'assertive' : 'polite'}
        aria-atomic="true"
        aria-label={`Voice state: ${voiceState}. ${status.label}.`}
      >
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={voiceState}
            initial={{ opacity: 0.5 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0.5 }}
            transition={{ duration: 0.15 }}
          >
            <Icon className={cn('h-5 w-5 md:h-6 md:w-6', status.color, status.spin && 'animate-spin')} aria-hidden="true" />
          </motion.div>
        </AnimatePresence>
        <span className={cn('text-xs font-black uppercase tracking-[0.16em] md:text-sm', status.color)}>
          {status.shortLabel}
        </span>
      </div>
    );
  }

  return (
    <div
      className={cn(
        'flex items-center gap-3 rounded-2xl border border-zinc-800 bg-zinc-950 px-4 py-3 transition-colors',
        status.border,
        className
      )}
      role="status"
      aria-live={shouldAnnounce ? 'assertive' : 'polite'}
      aria-atomic="true"
      aria-label={`Voice state: ${voiceState}. ${status.label}.`}
    >
      <Icon className={cn('h-5 w-5', status.color, status.spin && 'animate-spin')} aria-hidden="true" />
      <div className="min-w-0">
        <span className={cn('block text-xs font-black uppercase tracking-[0.16em]', status.color)}>
          {status.shortLabel}
        </span>
        <span className="block truncate text-sm font-medium text-zinc-200">{status.label}</span>
      </div>
    </div>
  );
}
