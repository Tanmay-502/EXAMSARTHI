'use client';

import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useVoice } from '@/lib/voice/VoiceProvider';
import { useI18n } from '@/lib/i18n/I18nProvider';
import { AnalyticsData } from './actions';
import { useGlobalVoice } from '@/components/voice/GlobalVoiceAssistant';

/** Announces an analytics summary during continuous listening and handles voice requests to practice the weakest subject. */
export default function AnalysisVoiceHandler({ data }: { data: AnalyticsData }) {
  const { speak, isContinuous } = useVoice();
  const { t, tParams } = useI18n();
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
        speak(t('analysis_no_focus_subject'));
        return true;
      }

      speak(tParams('analysis_open_practice', { subject: weakest }));
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
      
      const summaryParts = [
        tParams('analysis_overall_accuracy', { accuracy }),
        ...(strongSubjects.length > 0 ? [tParams('analysis_strong_subjects', { subjects: strongSubjects.join(', ') })] : []),
        ...(weakSubjects.length > 0 ? [tParams('analysis_weak_subjects', { subjects: weakSubjects.join(', ') })] : []),
      ];
      const summary = summaryParts.join(' ');

      speak(summary);
    }
  }, [isContinuous, data, speak, t, tParams]);

  return null;
}
