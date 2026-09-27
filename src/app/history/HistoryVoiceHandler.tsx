'use client';

import { useEffect, useRef } from 'react';
import { useVoice } from '@/lib/voice/VoiceProvider';
import { useI18n } from '@/lib/i18n/I18nProvider';

export default function HistoryVoiceHandler({ totalSessions }: { totalSessions: number }) {
  const { speak, isContinuous } = useVoice();
  const { lang } = useI18n();
  const hasSpoken = useRef(false);

  useEffect(() => {
    if (isContinuous && !hasSpoken.current) {
      hasSpoken.current = true;
      let summary = '';
      if (lang === 'hi-IN') {
         summary = `आपका इतिहास यहाँ है। आपने कुल ${totalSessions} सत्र पूरे किए हैं।`;
      } else if (lang === 'te-IN') {
         summary = `మీ చరిత్ర ఇక్కడ ఉంది. మీరు మొత్తం ${totalSessions} సెషన్లను పూర్తి చేసారు.`;
      } else {
         summary = `Here is your exam history. You have completed ${totalSessions} sessions in total.`;
      }
      speak(summary);
    }
  }, [isContinuous, totalSessions, lang, speak]);

  return null;
}
