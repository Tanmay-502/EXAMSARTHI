'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export function GatewayActions() {
  const router = useRouter()

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target
      if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement || target instanceof HTMLSelectElement || (target instanceof HTMLElement && target.isContentEditable)) return
      if (event.repeat || event.ctrlKey || event.metaKey || event.altKey || event.defaultPrevented) return
      const key = event.key.toLowerCase()
      if (key === 'l') { event.preventDefault(); router.push('/auth/login') }
      if (key === 's') { event.preventDefault(); router.push('/auth/signup') }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [router])

  return (
    <div className="grid w-full gap-4 sm:grid-cols-2">
      <button autoFocus type="button" onClick={() => router.push('/auth/login')} className="min-h-16 rounded-2xl border border-zinc-700 bg-white px-8 text-lg font-semibold text-black transition-colors hover:bg-zinc-200 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-white focus-visible:ring-offset-4 focus-visible:ring-offset-black">
        Log in
        <span className="mt-1 block text-xs font-normal uppercase tracking-[0.18em] text-zinc-600">L</span>
      </button>
      <button type="button" onClick={() => router.push('/auth/signup')} className="min-h-16 rounded-2xl border border-zinc-700 bg-zinc-950 px-8 text-lg font-semibold text-white transition-colors hover:bg-zinc-900 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-white focus-visible:ring-offset-4 focus-visible:ring-offset-black">
        Sign up
        <span className="mt-1 block text-xs font-normal uppercase tracking-[0.18em] text-zinc-500">S</span>
      </button>
    </div>
  )
}
