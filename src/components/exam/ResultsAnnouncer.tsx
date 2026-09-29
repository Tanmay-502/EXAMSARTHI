'use client'

import { useI18n } from '@/lib/i18n/I18nProvider';
import { useAccessibility } from '@/lib/accessibility/AccessibilityProvider';
import { useVoice } from '@/lib/voice/VoiceProvider';
import { useGlobalVoice } from '@/components/voice/GlobalVoiceAssistant';
import { usePreferredMode } from '@/lib/hooks/usePreferredMode';
import { say } from '@/lib/voice/say';
import React, { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';

type ResultsAnnouncerProps = {
  score: number;
  total: number;
  percentage: number;
  correct: number;
  incorrect: number;
  unanswered: number;
  subjectStats?: Record<string, { total: number; correct: number; incorrect: number; unanswered: number }>;
};

/** Announces localized results after the interaction mode loads and handles voice requests to repeat results or practice the weakest subject. */
export function ResultsAnnouncer({ score, total, percentage, correct, incorrect, unanswered, subjectStats }: ResultsAnnouncerProps) {
  const { announce } = useAccessibility();
  const { speak, isContinuous } = useVoice();
  const { mode: interactionMode, isLoaded: modeLoaded } = usePreferredMode();
  const { useVoiceAction } = useGlobalVoice();
  const router = useRouter();
  const { t, tParams } = useI18n();
  const headingRef = useRef<HTMLHeadingElement>(null);

  const hasSpokenRef = useRef(false);

  const getSummaryMessage = React.useCallback(() => {
    let msg = tParams('results_summary', { score, total, percentage, correct, incorrect, unanswered });
    
    if (subjectStats && Object.keys(subjectStats).length > 0) {
      let weakestSubj = '';
      let lowestPerc = 100;
      
      Object.entries(subjectStats).forEach(([subj, stats]) => {
        if (stats.total > 0) {
          const perc = Math.round((stats.correct / stats.total) * 100);
          if (perc < lowestPerc) {
            lowestPerc = perc;
            weakestSubj = subj;
          }
        }
      });
      
      if (weakestSubj) {
        msg += " " + tParams('weakest_subject', { subject: weakestSubj, percentage: lowestPerc });
      }
    }
    
    msg += " " + tParams('say_dashboard_or_history', {});
    return msg;
  }, [tParams, score, total, percentage, correct, incorrect, unanswered, subjectStats]);

  useEffect(() => {
    if (!modeLoaded || hasSpokenRef.current) return;
    hasSpokenRef.current = true;
    headingRef.current?.focus();
    
    const msg = getSummaryMessage();
    say(msg, interactionMode, speak, announce, 'assertive');
  }, [announce, speak, getSummaryMessage, interactionMode, modeLoaded]);

  useVoiceAction((action, payload) => {
    if (action === 'READ_RESULTS' || action === 'REPEAT') {
      const msg = getSummaryMessage();
      speak(msg, { dedupe: false });
      return true;
    }

    if (
      (action === 'OPEN_PRACTICE' || action === 'START_PRACTICE') &&
      payload?.subject === 'weakest' &&
      subjectStats
    ) {
      const weakest = Object.entries(subjectStats)
        .filter(([, stats]) => stats.total > 0)
        .sort((a, b) => {
          const aAccuracy = a[1].correct / a[1].total;
          const bAccuracy = b[1].correct / b[1].total;
          return aAccuracy - bAccuracy || a[0].localeCompare(b[0]);
        })[0]?.[0];

      if (!weakest) {
        speak(t('results_weakest_subject_unavailable'));
        return true;
      }

      speak(tParams('results_opening_practice', { subject: weakest }));
      router.push(`/practice?subject=${encodeURIComponent(weakest)}`);
      return true;
    }

    return false;
  });

  return <h1 tabIndex={-1} ref={headingRef} className="sr-only">{t('results_page_heading')}</h1>;
}
