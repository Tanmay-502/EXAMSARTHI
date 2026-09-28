'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { clearExamStorage } from '@/lib/store/clearExamStorage'

export function SignOutButton({ className = '' }: { className?: string }) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)

  const handleSignOut = async () => {
    if (busy) return
    setBusy(true)
    try {
      const supabase = createClient()
      await supabase.auth.signOut()
    } finally {
      await clearExamStorage()
      router.replace('/')
      router.refresh()
    }
  }

  return (
    <button type="button" onClick={() => void handleSignOut()} disabled={busy} className={className}>
      {busy ? 'Signing out…' : 'Sign out'}
    </button>
  )
}
