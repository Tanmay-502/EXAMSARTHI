'use client';

import { useI18n } from '@/lib/i18n/I18nProvider';
import Link from 'next/link';

export default function ErrorBoundary({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const { t } = useI18n();
  return (
    <main id="main-content" className="flex min-h-dvh flex-col items-center justify-center gap-6 bg-black p-8 text-center">
      <h1 className="text-3xl font-bold text-red-300">{t('results_error_title')}</h1>
      <p className="max-w-md text-lg text-zinc-400">{t('results_error_desc')}</p>
      <div className="flex flex-wrap justify-center gap-4">
        <button
          type="button"
          onClick={reset}
          className="inline-flex min-h-11 items-center rounded-full bg-white px-6 py-3 font-bold text-black focus-visible:ring-4 focus-visible:ring-[var(--brand-accent)]"
        >
          {t('retry')}
        </button>
        <Link
          href="/dashboard"
          className="inline-flex min-h-11 items-center rounded-full border border-zinc-700 px-6 py-3 font-bold text-zinc-100 focus-visible:ring-4 focus-visible:ring-[var(--brand-accent)]"
        >
          {t('dashboard')}
        </Link>
      </div>
    </main>
  );
}
