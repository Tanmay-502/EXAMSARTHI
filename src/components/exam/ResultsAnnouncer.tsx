'use client'

import { useI18n } from '@/lib/i18n/I18nProvider';
import { useAccessibility } from '@/lib/accessibility/AccessibilityProvider';
import { useVoice } from '@/lib/voice/VoiceProvider';
import { useGlobalVoice } from '@/components/voice/GlobalVoiceAssistant';
import React, { useEffect, useRef } from 'react';

type ResultsAnnouncerProps = {
  score: number;
  total: number;
  percentage: number;
  correct: number;
  incorrect: number;
  unanswered: number;
  subjectStats?: Record<string, { total: number; correct: number; incorrect: number; unanswered: number }>;
};

export function ResultsAnnouncer({ score, total, percentage, correct, incorrect, unanswered, subjectStats }: ResultsAnnouncerProps) {
  const { announce } = useAccessibility();
  const { speak, isContinuous } = useVoice();
  const { useVoiceAction } = useGlobalVoice();
  const { tParams } = useI18n();
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
    if (hasSpokenRef.current) return;
    hasSpokenRef.current = true;
    headingRef.current?.focus();
    
    const msg = getSummaryMessage();
    announce(msg, 'assertive');
    if (isContinuous) speak(msg);
  }, [announce, speak, isContinuous, getSummaryMessage]);

  useVoiceAction((action) => {
    if (action === 'READ_RESULTS' || action === 'REPEAT') {
      const msg = getSummaryMessage();
      speak(msg);
    }
  });

  return <h1 tabIndex={-1} ref={headingRef} className="sr-only">Exam Results</h1>;
}
