'use client';

import React from 'react';
import { VoiceStatusIndicator } from './VoiceStatusIndicator';
import { VoiceTranscript } from './VoiceTranscript';
import { usePathname } from 'next/navigation';

export function VoiceOverlay() {
  const pathname = usePathname();
  // Don't show global overlays if we're on the landing page (where VoiceCore is giant)
  // Actually, maybe show status indicator everywhere except landing?
  const isLanding = pathname === '/';

  return (
    <>
      {!isLanding && (
        <div className="fixed top-4 right-4 z-50">
          <VoiceStatusIndicator />
        </div>
      )}
      
      {!isLanding && (
        <div className="fixed bottom-4 right-4 w-80 h-96 z-40 hidden md:block">
          <VoiceTranscript className="w-full h-full" />
        </div>
      )}
    </>
  );
}
