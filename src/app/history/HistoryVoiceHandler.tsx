'use client';

import { useEffect, useRef } from 'react';
import { useVoice } from '@/lib/voice/VoiceProvider';
import { useI18n } from '@/lib/i18n/I18nProvider';
import { useGlobalVoice } from '@/components/voice/GlobalVoiceAssistant';
import { useRouter } from 'next/navigation';

export default function HistoryVoiceHandler({ totalSessions }: { totalSessions: number }) {
  const { speak, isContinuous } = useVoice();
  const { lang } = useI18n();
  const hasSpoken = useRef(false);
  const router = useRouter();
  const { useVoiceAction } = useGlobalVoice();

  useVoiceAction((action, _payload, transcript) => {
    if (action !== 'RAW_TRANSCRIPT' || !transcript) return false;

    const text = transcript.toLowerCase();
    const wantsHistory = /(history|attempt|attempts|sessions)/.test(text);

    if (!wantsHistory) return false;

    if (/(practice|practise)/.test(text)) {
      router.replace('/history?filter=practice');
      speak(
        lang === 'hi-IN'
          ? 'आपके प्रैक्टिस प्रयास दिखा रहा हूँ।'
          : lang === 'te-IN'
            ? 'మీ ప్రాక్టీస్ ప్రయత్నాలను చూపిస్తున్నాను.'
            : 'Showing your practice history.'
      );
      return true;
    }

    if (/(exam|exams|test|tests)/.test(text)) {
      router.replace('/history?filter=exam');
      speak(
        lang === 'hi-IN'
          ? 'आपके परीक्षा प्रयास दिखा रहा हूँ।'
          : lang === 'te-IN'
            ? 'మీ పరీక్ష ప్రయత్నాలను చూపిస్తున్నాను.'
            : 'Showing your exam history.'
      );
      return true;
    }

    if (/\b(all|everything)\b/.test(text)) {
      router.replace('/history?filter=all');
      speak(
        lang === 'hi-IN'
          ? 'आपका पूरा इतिहास दिखा रहा हूँ।'
          : lang === 'te-IN'
            ? 'మీ మొత్తం చరిత్రను చూపిస్తున్నాను.'
            : 'Showing all of your history.'
      );
      return true;
    }

    return false;
  });

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
