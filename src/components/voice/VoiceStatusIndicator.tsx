'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import { useVoice } from '@/lib/voice/useVoice';
import { useI18n } from '@/lib/i18n/I18nProvider';
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
  const { voiceState, micError, speechWarning } = useVoice();
  const { t, tParams } = useI18n();

  const getStatusContent = (): StatusContent => {
    switch (voiceState) {
      case 'IDLE':
        return micError === 'network'
          ? {
              icon: AlertCircle,
              label: t('voice_connection_issue'),
              shortLabel: t('ready'),
              color: 'text-amber-300',
              border: 'border-amber-300/50',
            }
          : {
              icon: Mic,
              label: t('voice_ready'),
              shortLabel: t('ready'),
              color: 'text-blue-400',
              border: 'border-zinc-700',
            };
      case 'REQUESTING_PERMISSION':
        return {
          icon: Loader2,
          label: t('voice_requesting_permission'),
          shortLabel: t('requesting'),
          color: 'text-amber-300',
          border: 'border-amber-300/50',
          spin: true,
        };
      case 'LISTENING':
        return {
          icon: Mic,
          label: t('voice_listening'),
          shortLabel: t('listening'),
          color: 'text-purple-300',
          border: 'border-purple-300/50',
        };
      case 'PROCESSING':
        return {
          icon: Loader2,
          label: t('voice_processing'),
          shortLabel: t('processing'),
          color: 'text-indigo-300',
          border: 'border-indigo-300/50',
          spin: true,
        };
      case 'SPEAKING':
        return {
          icon: Volume2,
          label: t('voice_speaking'),
          shortLabel: t('speaking'),
          color: 'text-emerald-300',
          border: 'border-emerald-300/50',
        };
      case 'PAUSED':
        return {
          icon: MicOff,
          label: t('voice_paused'),
          shortLabel: t('paused'),
          color: 'text-zinc-300',
          border: 'border-zinc-700',
        };
      case 'ERROR':
        return {
          icon: AlertCircle,
          label:
            micError === 'denied'
              ? t('voice_mic_blocked')
              : micError === 'not-supported'
                ? t('voice_unavailable')
                : t('voice_error'),
          shortLabel: t('error'),
          color: 'text-red-300',
          border: 'border-red-300/60',
        };
      default:
        return {
          icon: Mic,
          label: t('voice_assistant'),
          shortLabel: t('ready'),
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
        aria-live={shouldAnnounce ? 'assertive' : 'off'}
        aria-atomic="true"
        aria-label={tParams('voice_state_label', { state: status.shortLabel })}
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
        {speechWarning && <span className="sr-only">{speechWarning}</span>}
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
      aria-live={shouldAnnounce ? 'assertive' : 'off'}
      aria-atomic="true"
      aria-label={`Voice state: ${voiceState}. ${status.label}.`}
    >
      <Icon className={cn('h-5 w-5', status.color, status.spin && 'animate-spin')} aria-hidden="true" />
      <div className="min-w-0">
        <span className={cn('block text-xs font-black uppercase tracking-[0.16em]', status.color)}>
          {status.shortLabel}
        </span>
        <span className="block truncate text-sm font-medium text-zinc-200">{status.label}</span>
        {speechWarning && <span className="block text-xs text-amber-200">{speechWarning}</span>}
      </div>
    </div>
  );
}
