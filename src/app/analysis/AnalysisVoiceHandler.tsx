'use client';

import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useVoice } from '@/lib/voice/VoiceProvider';
import { useI18n } from '@/lib/i18n/I18nProvider';
import { AnalyticsData } from './actions';
import { useGlobalVoice } from '@/components/voice/GlobalVoiceAssistant';

export default function AnalysisVoiceHandler({ data }: { data: AnalyticsData }) {
  const { speak, isContinuous } = useVoice();
  const { lang } = useI18n();
  const hasSpoken = useRef(false);
  const router = useRouter();
  const { useVoiceAction } = useGlobalVoice();

  useVoiceAction((action, payload) => {
    if (
      (action === 'OPEN_PRACTICE' || action === 'START_PRACTICE') &&
      payload?.subject === 'weakest'
    ) {
      const weakest = data.weakSubjects[0] || data.subjectAccuracy
        .slice()
        .sort((a, b) => a.accuracy - b.accuracy || a.subject.localeCompare(b.subject))[0]?.subject;

      if (!weakest) {
        speak(
          lang === 'hi-IN'
            ? 'अभी कमजोर विषय चुनने के लिए पर्याप्त डेटा नहीं है।'
            : lang === 'te-IN'
              ? 'ఇప్పటివరకు బలహీనమైన సబ్జెక్ట్ ఎంచుకోవడానికి తగిన డేటా లేదు.'
              : 'I do not have enough subject data to choose a focus subject yet.'
        );
        return true;
      }

      speak(
        lang === 'hi-IN'
          ? `${weakest} के लिए अभ्यास खोल रहा हूँ।`
          : lang === 'te-IN'
            ? `${weakest} కోసం ప్రాక్టీస్ తెరుస్తున్నాను.`
            : `Opening practice for ${weakest}.`
      );
      router.push(`/practice?subject=${encodeURIComponent(weakest)}`);
      return true;
    }

    return false;
  });

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
