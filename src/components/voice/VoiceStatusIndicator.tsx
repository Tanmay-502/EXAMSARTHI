'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import { useVoice } from '@/lib/voice/useVoice';
import { Mic, MicOff, Loader2, Volume2, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export function VoiceStatusIndicator({ className }: { className?: string }) {
  const { voiceState, micError } = useVoice();

  const getStatusContent = () => {
    switch (voiceState) {
      case 'IDLE':
        return { icon: Mic, label: 'Voice Assistant Ready', color: 'text-blue-500', bg: 'bg-blue-500/10' };
      case 'REQUESTING_PERMISSION':
        return { icon: Loader2, label: 'Requesting Microphone', color: 'text-amber-500', bg: 'bg-amber-500/10', spin: true };
      case 'LISTENING':
        return { icon: Mic, label: 'Listening...', color: 'text-purple-500', bg: 'bg-purple-500/10' };
      case 'PROCESSING':
        return { icon: Loader2, label: 'Processing...', color: 'text-indigo-500', bg: 'bg-indigo-500/10', spin: true };
      case 'SPEAKING':
        return { icon: Volume2, label: 'Speaking', color: 'text-emerald-500', bg: 'bg-emerald-500/10' };
      case 'PAUSED':
        return { icon: MicOff, label: 'Voice Paused', color: 'text-gray-400', bg: 'bg-gray-400/10' };
      case 'ERROR':
        return { icon: AlertCircle, label: micError === 'denied' ? 'Microphone Blocked' : 'Voice Error', color: 'text-red-500', bg: 'bg-red-500/10' };
      default:
        return { icon: Mic, label: 'Voice Assistant', color: 'text-gray-400', bg: 'bg-gray-500/10' };
    }
  };

  const status = getStatusContent();
  const Icon = status.icon;

  return (
    <div 
      className={cn(
        "flex items-center gap-2 px-3 py-1.5 rounded-full border border-white/5 backdrop-blur-sm transition-colors",
        status.bg,
        className
      )}
      role="status"
      aria-live="polite"
      aria-atomic="true"
    >
      <AnimatePresence mode="wait">
        <motion.div
          key={voiceState}
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.8, opacity: 0 }}
          transition={{ duration: 0.15 }}
        >
          <Icon className={cn("w-4 h-4", status.color, status.spin && "animate-spin")} aria-hidden="true" />
        </motion.div>
      </AnimatePresence>
      <span className={cn("text-xs font-medium tracking-wide", status.color)}>
        {status.label}
      </span>
    </div>
  );
}
