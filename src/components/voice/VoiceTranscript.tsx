'use client';

import React, { useEffect, useRef } from 'react';
import { useVoice } from '@/lib/voice/useVoice';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

export function VoiceTranscript({ className }: { className?: string }) {
  const { transcript } = useVoice();
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [transcript]);

  return (
    <div 
      className={cn("flex flex-col space-y-3 overflow-y-auto p-4 rounded-xl bg-black/40 border border-white/10 backdrop-blur-md", className)}
      ref={scrollRef}
      role="log"
      aria-live="polite"
      aria-atomic="false"
      aria-label="Conversation transcript"
    >
      <AnimatePresence initial={false}>
        {transcript.map((msg) => (
          <motion.div
            key={msg.id}
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            className={cn(
              "px-4 py-2.5 max-w-[85%] rounded-2xl text-sm leading-relaxed",
              msg.sender === 'user' 
                ? "self-end bg-purple-500/20 text-purple-50 border border-purple-500/30 rounded-br-sm" 
                : "self-start bg-blue-500/20 text-blue-50 border border-blue-500/30 rounded-bl-sm"
            )}
          >
            <span className="sr-only">{msg.sender === 'user' ? 'You said:' : 'Assistant said:'}</span>
            {msg.text}
          </motion.div>
        ))}
      </AnimatePresence>
      {transcript.length === 0 && (
        <div className="text-center text-sm text-gray-400 italic py-8">
          No conversation history yet.
        </div>
      )}
    </div>
  );
}
