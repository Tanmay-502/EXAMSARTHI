'use client';

import { useI18n } from '@/lib/i18n/I18nProvider';

export default function Loading() {
  const { t } = useI18n();
  return (
    <main id="main-content" className="min-h-dvh bg-black px-6 py-16 md:px-12" aria-busy="true">
      <div role="status" className="sr-only">{t('loading')}</div>
      <div className="mx-auto max-w-7xl animate-pulse space-y-8">
        <div className="h-16 max-w-md rounded bg-zinc-900" />
        <div className="h-6 max-w-2xl rounded bg-zinc-900" />
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="h-36 rounded-2xl border border-zinc-800 bg-zinc-950" />
          <div className="h-36 rounded-2xl border border-zinc-800 bg-zinc-950" />
          <div className="h-36 rounded-2xl border border-zinc-800 bg-zinc-950" />
        </div>
        <div className="h-80 rounded-2xl border border-zinc-800 bg-zinc-950" />
      </div>
    </main>
  );
}
