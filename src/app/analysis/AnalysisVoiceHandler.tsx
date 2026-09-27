'use client';

import { useEffect, useRef } from 'react';
import { useVoice } from '@/lib/voice/VoiceProvider';
import { useI18n } from '@/lib/i18n/I18nProvider';

export default function AnalysisVoiceHandler({ data }: { data: any }) {
  const { speak, isContinuous } = useVoice();
  const { lang } = useI18n();
  const hasSpoken = useRef(false);

  useEffect(() => {
    if (isContinuous && !hasSpoken.current) {
      hasSpoken.current = true;
      const { overall, strongSubjects, weakSubjects } = data;
      const accuracy = overall.avgPercentage;
      
      let summary = '';
      if (lang === 'hi-IN') {
         summary = `आपका कुल एक्यूरेसी ${accuracy} प्रतिशत है। `;
         if (strongSubjects.length > 0) {
            summary += `आपका मजबूत विषय ${strongSubjects.join(' और ')} है। `;
         }
         if (weakSubjects.length > 0) {
            summary += `आपको ${weakSubjects.join(' और ')} में अभ्यास की आवश्यकता है।`;
         }
      } else if (lang === 'te-IN') {
         summary = `మీ మొత్తం ఖచ్చితత్వం ${accuracy} శాతం. `;
         if (strongSubjects.length > 0) {
            summary += `మీ బలమైన సబ్జెక్టులు ${strongSubjects.join(' మరియు ')}. `;
         }
         if (weakSubjects.length > 0) {
            summary += `మీరు ${weakSubjects.join(' మరియు ')} లో ప్రాక్టీస్ చేయాలి.`;
         }
      } else {
         summary = `Your overall accuracy is ${accuracy} percent. `;
         if (strongSubjects.length > 0) {
            summary += `Your strong subjects are ${strongSubjects.join(' and ')}. `;
         }
         if (weakSubjects.length > 0) {
            summary += `You need to improve in ${weakSubjects.join(' and ')}.`;
         }
      }
      
      speak(summary);
    }
  }, [isContinuous, data, lang, speak]);

  return null;
}
