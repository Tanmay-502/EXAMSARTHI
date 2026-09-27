'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { headers } from 'next/headers'

export async function loginWithMagicLink(formData: FormData) {
  const supabase = await createClient()
  const email = String(formData.get('email') || '').trim()

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) {
    return redirect(`/auth/login?message=${encodeURIComponent('Please enter a valid email address.')}&_t=${Date.now()}`)
  }

  const headersList = await headers()
  
  const configuredOrigin = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, '')
  let origin = configuredOrigin || headersList.get('origin')
  if (!origin) {
    const host = headersList.get('host') || 'localhost:3000'
    const protocol = host.includes('localhost') ? 'http' : 'https'
    origin = `${protocol}://${host}`
  }

  console.error('--- SERVER ACTION CALLED ---', email);


  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      shouldCreateUser: true,
      emailRedirectTo: `${origin}/auth/confirm`,
    },
  })

  if (error) {
    console.error('Magic link send error:', error)
    return redirect(`/auth/login?message=${encodeURIComponent('Your sign-in link could not be sent. Please try again.')}&_t=${Date.now()}`)
  }

  return redirect(`/auth/login?message=${encodeURIComponent('Check email to continue sign in process')}&_t=${Date.now()}`)
}

export async function signOut() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  return redirect('/')
}
