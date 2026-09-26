'use client'

import { useI18n } from '@/lib/i18n/I18nProvider';
import { useAccessibility } from '@/lib/accessibility/AccessibilityProvider';
import { useVoice } from '@/lib/voice/VoiceProvider';
import { useGlobalVoice } from '@/components/voice/GlobalVoiceAssistant';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useRef, Suspense } from 'react';

function DashboardContent() {
  const { t } = useI18n();
  const { announce } = useAccessibility();
  const { speak, isContinuous } = useVoice();
  const { useVoiceAction } = useGlobalVoice();
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirected = searchParams.get('redirected');
  
  const headingRef = useRef<HTMLHeadingElement>(null);
  const hasSpokenRef = useRef(false);

  useEffect(() => {
    if (hasSpokenRef.current) return;
    hasSpokenRef.current = true;
    headingRef.current?.focus();
    const announceMsg = redirected ? t('already_signed_in') + ' ' + t('dashboard_announce') : t('dashboard_announce');
    announce(announceMsg);
    if (isContinuous) {
      speak(announceMsg);
    }
  }, [announce, t, speak, isContinuous, redirected]);

  useVoiceAction((action) => {
    if (!isContinuous) return;

    if (action === 'OPEN_EXAM' || action === 'START_EXAM') {
      speak(t('loading'));
      router.push('/exam');
    } else if (action === 'OPEN_PRACTICE' || action === 'START_PRACTICE') {
      speak(t('loading'));
      router.push('/practice');
    } else if (action === 'OPEN_HISTORY' || action === 'READ_HISTORY') {
      speak(t('loading'));
      router.push('/history');
    } else if (action === 'OPEN_SETTINGS') {
      speak(t('loading'));
      router.push('/settings');
    } else if (action === 'LOGOUT') {
      speak(t('loading'));
      router.push('/auth/login');
    } else if (action === 'HELP') {
      speak(t('dashboard_announce'));
    }
  });

  return (
    <>
      <h1 tabIndex={-1} ref={headingRef} className="text-4xl font-extrabold tracking-tight mb-8 focus:outline-none">
        {t('dashboard')}
      </h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full">
        <div className="rounded-xl border bg-card text-card-foreground shadow-sm w-full">
          <div className="flex flex-col space-y-1.5 p-6">
            <h3 className="text-2xl font-semibold leading-none tracking-tight">{t('practice')}</h3>
            <p className="text-sm text-muted-foreground mt-2">
              {t('practice_desc')}
            </p>
          </div>
          <div className="p-6 pt-0">
            <Link
              href="/practice"
              className="inline-flex w-full items-center justify-center whitespace-nowrap rounded-md text-lg font-medium transition-colors focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ring bg-secondary text-secondary-foreground shadow-sm hover:bg-secondary/80 h-14"
              aria-label={t('start_practice')}
            >
              {t('start_practice')}
            </Link>
          </div>
        </div>

        <div className="rounded-xl border bg-card text-card-foreground shadow-sm w-full">
          <div className="flex flex-col space-y-1.5 p-6">
            <h3 className="text-2xl font-semibold leading-none tracking-tight">{t('exam')}</h3>
            <p className="text-sm text-muted-foreground mt-2">
              {t('exam_desc')}
            </p>
          </div>
          <div className="p-6 pt-0">
            <Link
              href="/exam"
              className="inline-flex w-full items-center justify-center whitespace-nowrap rounded-md text-lg font-medium transition-colors focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ring bg-primary text-primary-foreground shadow hover:bg-primary/90 h-14"
              aria-label={t('start_exam')}
            >
              {t('start_exam')}
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}

export default function DashboardPage() {
  const { t } = useI18n();
  return (
    <main id="main-content" className="flex flex-col flex-1 p-6 max-w-5xl mx-auto w-full items-start">
      <Suspense fallback={<div>{t('loading')}</div>}>
        <DashboardContent />
      </Suspense>
    </main>
  );
}
