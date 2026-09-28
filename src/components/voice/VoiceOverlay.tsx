'use client';

import React from 'react';
import { VoiceStatusIndicator } from './VoiceStatusIndicator';
import { VoiceTranscript } from './VoiceTranscript';
import { DemoGuide } from './DemoGuide';

export function VoiceOverlay() {
  return (
    <>
      <div className="pointer-events-none fixed inset-x-3 bottom-3 z-50 md:inset-x-6 md:bottom-5">
        <div className="pointer-events-auto mx-auto w-full max-w-5xl space-y-2">
          <VoiceStatusIndicator prominent />
          <VoiceTranscript prominent />
        </div>
      </div>
      <DemoGuide />
    </>
  );
}
