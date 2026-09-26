'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { headers } from 'next/headers'

export async function loginWithMagicLink(formData: FormData) {
  const supabase = await createClient()
  const email = formData.get('email') as string
  const headersList = await headers()
  
  let origin = headersList.get('origin')
  if (!origin) {
    const host = headersList.get('host') || 'localhost:3000'
    const protocol = host.includes('localhost') ? 'http' : 'https'
    origin = `${protocol}://${host}`
  }

  console.error('--- SERVER ACTION CALLED ---', email);
  console.error('PLAYWRIGHT_TEST_MODE:', process.env.PLAYWRIGHT_TEST_MODE);

  // For Playwright only, mock/stub the email-delivery boundary so we don't attempt to send real emails
  // and deterministically return a successful response to allow the test to proceed.
  if (process.env.PLAYWRIGHT_TEST_MODE === 'true') {
    return redirect(`/auth/login?message=${encodeURIComponent('Check email to continue sign in process')}&_t=${Date.now()}`)
  }

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
