'use client';

import Link from 'next/link';
import { useI18n } from '@/lib/i18n/I18nProvider';

export default function ErrorBoundary({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const { t } = useI18n();
  return (
    <main id="main-content" className="min-h-dvh bg-black px-6 py-16 md:px-12">
      <div className="mx-auto max-w-2xl rounded-2xl border border-zinc-800 bg-zinc-950 p-8 md:p-12">
        <h1 className="text-3xl font-light tracking-tight">{t('page_error_title')}</h1>
        <p className="mt-4 text-lg text-zinc-400">{t('history_error_desc')}</p>
        <div className="mt-8 flex flex-wrap gap-3">
          <button type="button" onClick={reset} className="min-h-11 rounded-full bg-white px-6 text-sm font-semibold text-black focus-visible:ring-2 focus-visible:ring-[var(--brand-accent)]">{t('retry')}</button>
          <Link href="/dashboard" className="inline-flex min-h-11 items-center rounded-full border border-zinc-700 px-6 text-sm font-semibold text-zinc-100 focus-visible:ring-2 focus-visible:ring-[var(--brand-accent)]">{t('dashboard')}</Link>
        </div>
      </div>
    </main>
  );
}
