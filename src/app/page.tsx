import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { LanguageSwitcher } from '@/components/i18n/LanguageSwitcher'
import { GatewayActions } from '@/components/gateway/GatewayActions'
import { SignOutButton } from '@/components/auth/SignOutButton'

export default async function Home() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  return (
    <main id="main-content" className="min-h-screen bg-black px-6 py-8 text-white md:px-12 md:py-12">
      <div className="mx-auto flex min-h-[calc(100svh-6rem)] w-full max-w-4xl flex-col">
        <header className="flex items-center justify-between border-b border-zinc-900 pb-6">
          <p className="text-xs font-bold uppercase tracking-[0.22em] text-zinc-400">EXAMSAARTHI</p>
          <LanguageSwitcher />
        </header>

        {user ? (
          <section aria-label="Signed-in account" className="mt-8 rounded-2xl border border-zinc-800 bg-zinc-950 p-6 md:p-8">
            <p className="text-lg font-semibold">You&apos;re signed in — Continue</p>
            <p className="mt-2 text-sm text-zinc-400">Your existing ExamSaarthi session is active.</p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link href="/welcome" className="inline-flex min-h-12 items-center justify-center rounded-full bg-white px-6 text-sm font-semibold text-black focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950">Continue</Link>
              <SignOutButton className="min-h-12 rounded-full border border-zinc-700 px-6 text-sm font-semibold text-white focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950" />
            </div>
          </section>
        ) : null}

        <section className="flex flex-1 items-center py-16">
          <div className="w-full max-w-3xl">
            <h1 className="max-w-2xl text-6xl font-light leading-[0.92] tracking-tight md:text-8xl">ExamSaarthi</h1>
            <p className="mt-6 max-w-2xl text-lg leading-relaxed text-zinc-400 md:text-2xl">An accessible examination platform built for independent, multilingual learning.</p>
            <div className="mt-10">
              <GatewayActions />
            </div>
            <p className="mt-6 text-sm text-zinc-400">Press L to log in or S to sign up. Shortcuts are ignored while typing.</p>
          </div>
        </section>
      </div>
    </main>
  )
}