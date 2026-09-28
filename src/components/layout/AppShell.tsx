'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Menu, X } from 'lucide-react';
import { useI18n } from '@/lib/i18n/I18nProvider';
import { useVoiceAppContext } from '@/lib/store/voiceContextStore';
import { clearExamStorage } from '@/lib/store/clearExamStorage';
import { signOut } from '@/app/auth/actions';

const NAV_ITEMS = [
  { href: '/dashboard', key: 'dashboard' as const },
  { href: '/practice', key: 'practice' as const },
  { href: '/exam', key: 'exam' as const },
  { href: '/history', key: 'history' as const },
  { href: '/analysis', key: 'analysis' as const },
  { href: '/settings', key: 'settings' as const },
];

const AUTHENTICATED_PATHS = ['/dashboard', '/practice', '/exam', '/results', '/history', '/analysis', '/settings'];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { t } = useI18n();
  const voiceContext = useVoiceAppContext((state) => state.context);
  const [mobileOpen, setMobileOpen] = useState(false);

  const isAuthenticatedArea = AUTHENTICATED_PATHS.some((path) => pathname === path || pathname.startsWith(path + '/'));
  const isActiveSession = voiceContext === 'exam_active' || voiceContext === 'practice_active';
  const showNav = isAuthenticatedArea && !isActiveSession;

  const handleSignOut = async () => {
    setMobileOpen(false);
    await clearExamStorage();
    await signOut();
    router.refresh();
  };

  return (
    <>
      <a href="#main-content" className="fixed left-4 top-4 z-[100] -translate-y-20 rounded-full bg-white px-4 py-3 text-sm font-bold text-black transition-transform focus:translate-y-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-black">{t('skip_to_main')}</a>
      {showNav && (
        <header className="sticky top-0 z-40 border-b border-zinc-800 bg-black/95 supports-[backdrop-filter]:bg-black/80 supports-[backdrop-filter]:backdrop-blur">
          <nav aria-label={t("primary_navigation")} className="mx-auto flex min-h-16 max-w-7xl items-center justify-between gap-4 px-4 py-2 md:px-8">
            <Link
              href="/dashboard"
              className="inline-flex min-h-11 items-center rounded-full px-3 text-sm font-black uppercase tracking-[0.18em] text-zinc-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-accent)]"
              onClick={() => setMobileOpen(false)}
            >
              EXAMSAARTHI
            </Link>

            <div className="hidden items-center gap-1 lg:flex">
              {NAV_ITEMS.map((item) => {
                const current = pathname === item.href || pathname.startsWith(item.href + '/');
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    aria-current={current ? 'page' : undefined}
                    className={[
                      'inline-flex min-h-11 items-center rounded-full px-4 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-accent)]',
                      current ? 'bg-zinc-900 text-[var(--brand-accent)]' : 'text-zinc-400 hover:text-zinc-100',
                    ].join(' ')}
                  >
                    {t(item.key)}
                  </Link>
                );
              })}
              <button
                type="button"
                onClick={handleSignOut}
                className="ml-1 inline-flex min-h-11 items-center rounded-full border border-zinc-700 px-4 text-sm font-medium text-zinc-100 transition-colors hover:border-zinc-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-accent)]"
              >
                {t('logout')}
              </button>
            </div>

            <button
              type="button"
              className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-full border border-zinc-700 text-zinc-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-accent)] lg:hidden"
              aria-expanded={mobileOpen}
              aria-controls="mobile-navigation"
              aria-label={mobileOpen ? t('close_menu') : t('open_menu')}
              onClick={() => setMobileOpen((value) => !value)}
            >
              {mobileOpen ? <X className="h-5 w-5" aria-hidden="true" /> : <Menu className="h-5 w-5" aria-hidden="true" />}
            </button>
          </nav>

          {mobileOpen && (
            <div id="mobile-navigation" className="border-t border-zinc-800 px-4 pb-4 lg:hidden">
              <div className="mx-auto grid max-w-7xl gap-2 pt-3">
                {NAV_ITEMS.map((item) => {
                  const current = pathname === item.href || pathname.startsWith(item.href + '/');
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      aria-current={current ? 'page' : undefined}
                      className={[
                        'inline-flex min-h-11 items-center rounded-xl px-4 text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-accent)]',
                        current ? 'bg-zinc-900 text-[var(--brand-accent)]' : 'text-zinc-300',
                      ].join(' ')}
                      onClick={() => setMobileOpen(false)}
                    >
                      {t(item.key)}
                    </Link>
                  );
                })}
                <button
                  type="button"
                  onClick={handleSignOut}
                  className="inline-flex min-h-11 items-center rounded-xl border border-zinc-700 px-4 text-left text-sm font-medium text-zinc-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-accent)]"
                >
                  {t('logout')}
                </button>
              </div>
            </div>
          )}
        </header>
      )}
      {children}
    </>
  );
}
