'use client';

import React from 'react';
import { motion, Variants, useReducedMotion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { useVoice } from '@/lib/voice/useVoice';

export type VoiceState = 'IDLE' | 'REQUESTING_PERMISSION' | 'LISTENING' | 'PROCESSING' | 'SPEAKING' | 'PAUSED' | 'ERROR';

interface VoiceCoreProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'hero';
}

const sizeMap = {
  sm: 'w-12 h-12',
  md: 'w-24 h-24',
  lg: 'w-40 h-40',
  hero: 'w-64 h-64'
};

const stateColors: Record<VoiceState, { core: string; glow: string }> = {
  IDLE: { core: 'from-blue-500 to-cyan-400', glow: 'bg-blue-500/20' },
  REQUESTING_PERMISSION: { core: 'from-amber-400 to-orange-500', glow: 'bg-amber-400/20' },
  LISTENING: { core: 'from-purple-500 to-pink-500', glow: 'bg-purple-500/30' },
  PROCESSING: { core: 'from-indigo-500 to-purple-600', glow: 'bg-indigo-500/30' },
  SPEAKING: { core: 'from-emerald-400 to-cyan-400', glow: 'bg-emerald-400/30' },
  PAUSED: { core: 'from-gray-400 to-gray-500', glow: 'bg-gray-400/20' },
  ERROR: { core: 'from-red-500 to-orange-500', glow: 'bg-red-500/30' },
};

export function VoiceCore({ className, size = 'md' }: VoiceCoreProps) {
  const { voiceState } = useVoice();
  const reduceMotion = useReducedMotion();
  const colors = stateColors[voiceState as VoiceState] || stateColors.IDLE;

  const coreVariants: Variants = {
    IDLE: { scale: [1, 1.05, 1], transition: { repeat: Infinity, duration: 4, ease: 'easeInOut' } },
    REQUESTING_PERMISSION: { scale: [1, 1.1, 1], opacity: [1, 0.5, 1], transition: { repeat: Infinity, duration: 1.5 } },
    LISTENING: { scale: [1, 1.15, 1], transition: { repeat: Infinity, duration: 2, ease: 'easeInOut' } },
    PROCESSING: { rotate: [0, 180, 360], scale: [1, 0.95, 1], transition: { rotate: { repeat: Infinity, duration: 3, ease: 'linear' }, scale: { repeat: Infinity, duration: 1.5 } } },
    SPEAKING: { scale: [1, 1.2, 1.05, 1.15, 1], transition: { repeat: Infinity, duration: 1.5, ease: 'easeInOut' } },
    PAUSED: { scale: 1, opacity: 0.8 },
    ERROR: { scale: [1, 1.1, 0.9, 1], transition: { repeat: Infinity, duration: 0.5 } }
  };

  const outerRingVariants: Variants = {
    IDLE: { rotate: 360, scale: [1.1, 1.2, 1.1], opacity: [0.3, 0.1, 0.3], transition: { rotate: { repeat: Infinity, duration: 20, ease: 'linear' }, scale: { repeat: Infinity, duration: 4 } } },
    REQUESTING_PERMISSION: { rotate: 360, scale: [1, 1.3, 1], opacity: [0.5, 0, 0.5], transition: { rotate: { repeat: Infinity, duration: 10, ease: 'linear' }, scale: { repeat: Infinity, duration: 1.5 } } },
    LISTENING: { rotate: -360, scale: [1.2, 1.5, 1.2], opacity: [0.4, 0.1, 0.4], transition: { rotate: { repeat: Infinity, duration: 10, ease: 'linear' }, scale: { repeat: Infinity, duration: 2 } } },
    PROCESSING: { rotate: 360, scale: [1.1, 1.3, 1.1], opacity: [0.4, 0.8, 0.4], transition: { rotate: { repeat: Infinity, duration: 4, ease: 'linear' }, scale: { repeat: Infinity, duration: 1.5 } } },
    SPEAKING: { rotate: 360, scale: [1.2, 1.8, 1.3, 1.6, 1.2], opacity: [0.5, 0.2, 0.6, 0.2, 0.5], transition: { rotate: { repeat: Infinity, duration: 8, ease: 'linear' }, scale: { repeat: Infinity, duration: 1.5 } } },
    PAUSED: { scale: 1.1, opacity: 0.2 },
    ERROR: { scale: [1.1, 1.4, 1.1], opacity: [0.5, 0, 0.5], transition: { repeat: Infinity, duration: 0.5 } }
  };

  const innerRingVariants: Variants = {
    IDLE: { rotate: -360, scale: [1.05, 1.1, 1.05], opacity: [0.5, 0.2, 0.5], transition: { rotate: { repeat: Infinity, duration: 15, ease: 'linear' }, scale: { repeat: Infinity, duration: 3 } } },
    REQUESTING_PERMISSION: { rotate: -360, scale: [1, 1.2, 1], opacity: [0.6, 0.1, 0.6], transition: { rotate: { repeat: Infinity, duration: 8, ease: 'linear' }, scale: { repeat: Infinity, duration: 1.5 } } },
    LISTENING: { rotate: 360, scale: [1.1, 1.3, 1.1], opacity: [0.6, 0.2, 0.6], transition: { rotate: { repeat: Infinity, duration: 8, ease: 'linear' }, scale: { repeat: Infinity, duration: 2 } } },
    PROCESSING: { rotate: -360, scale: [1.05, 1.2, 1.05], opacity: [0.6, 1, 0.6], transition: { rotate: { repeat: Infinity, duration: 3, ease: 'linear' }, scale: { repeat: Infinity, duration: 1.5 } } },
    SPEAKING: { rotate: -360, scale: [1.1, 1.4, 1.2, 1.5, 1.1], opacity: [0.7, 0.3, 0.8, 0.3, 0.7], transition: { rotate: { repeat: Infinity, duration: 6, ease: 'linear' }, scale: { repeat: Infinity, duration: 1.5 } } },
    PAUSED: { scale: 1.05, opacity: 0.3 },
    ERROR: { scale: [1.05, 1.2, 1.05], opacity: [0.6, 0, 0.6], transition: { repeat: Infinity, duration: 0.5 } }
  };

  if (reduceMotion) {
    return (
      <div className={cn('relative flex items-center justify-center', sizeMap[size], className)} aria-hidden="true">
        <div className={cn('absolute inset-3 rounded-full bg-linear-to-br shadow-[0_0_24px_rgba(255,255,255,0.12)]', colors.core)} />
        <div className="absolute inset-0 rounded-full border border-white/20" />
        <div className="absolute inset-5 rounded-full border border-white/10" />
      </div>
    );
  }

  return (
    <div className={cn('relative flex items-center justify-center', sizeMap[size], className)} aria-hidden="true">
      <motion.div
        className={cn('absolute inset-[-50%] rounded-full blur-2xl opacity-40 mix-blend-screen transition-colors duration-1000', colors.glow)}
        animate={{ scale: [1, 1.1, 1], opacity: [0.3, 0.5, 0.3] }}
        transition={{ repeat: Infinity, duration: 4 }}
      />
      <motion.div
        className={cn('absolute inset-0 rounded-full border border-white/20 border-l-white/60 border-r-white/10 shadow-[0_0_15px_rgba(255,255,255,0.1)]', colors.glow)}
        variants={outerRingVariants}
        animate={voiceState as string}
        initial="IDLE"
        style={{ transformStyle: 'preserve-3d' }}
      />
      <motion.div
        className={cn('absolute inset-2 rounded-full border-2 border-white/10 border-t-white/50 border-b-transparent shadow-[inset_0_0_10px_rgba(255,255,255,0.2)]', colors.glow)}
        variants={innerRingVariants}
        animate={voiceState as string}
        initial="IDLE"
        style={{ transformStyle: 'preserve-3d' }}
      />
      <motion.div
        className={cn('absolute inset-4 rounded-full bg-linear-to-br shadow-[inset_-10px_-10px_20px_rgba(0,0,0,0.5),0_0_30px_rgba(255,255,255,0.2)] backdrop-blur-md overflow-hidden', colors.core)}
        variants={coreVariants}
        animate={voiceState as string}
        initial="IDLE"
      >
        <div className="absolute top-[10%] left-[15%] w-[40%] h-[30%] bg-white/40 blur rounded-[50%] transform -rotate-45" />
        <div className="absolute bottom-[10%] right-[10%] w-[50%] h-[40%] bg-black/40 blur-md rounded-[50%]" />
        {(voiceState === 'LISTENING' || voiceState === 'SPEAKING') && (
          <div className="absolute inset-0 flex items-center justify-center gap-0.5 opacity-60 mix-blend-overlay">
            {[1, 2, 3, 4, 5].map((i) => (
              <motion.div
                key={i}
                className="w-1 bg-white rounded-full"
                animate={{ height: ['20%', '80%', '20%'] }}
                transition={{
                  repeat: Infinity,
                  duration: voiceState === 'SPEAKING' ? 0.5 : 1,
                  delay: i * 0.1,
                  ease: 'easeInOut'
                }}
              />
            ))}
          </div>
        )}
      </motion.div>
    </div>
  );
}
