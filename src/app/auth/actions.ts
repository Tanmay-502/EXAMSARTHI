'use server'

import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function getOrigin(headersList: Headers) {
  const configuredOrigin = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, '')
  if (configuredOrigin) return configuredOrigin

  const requestOrigin = headersList.get('origin')
  if (requestOrigin) return requestOrigin.replace(/\/$/, '')

  throw new Error('No trusted site origin is configured')
}

function isMissingUserError(error: { message?: string | null; code?: string | null; status?: number | null }) {
  const message = (error.message || '').toLowerCase()
  return Boolean(
    error.code === 'user_not_found' ||
    /user.*(not found|does not exist)|not.*exist.*user/.test(message)
  )
}

export async function loginWithMagicLink(formData: FormData) {
  const supabase = await createClient()
  const email = String(formData.get('email') || '').trim()

  if (email.length > 254 || !EMAIL_PATTERN.test(email)) {
    return redirect('/auth/login?code=invalid_email')
  }

  const headersList = await headers()
  let origin: string
  try {
    origin = getOrigin(headersList)
  } catch {
    return redirect('/auth/login?code=send_failed')
  }
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      shouldCreateUser: false,
      emailRedirectTo: origin + '/auth/confirm',
    },
  })

  if (error) {
    if (isMissingUserError(error)) return redirect('/auth/login?code=no_account')
    console.error('Magic link sign-in error:', error)
    return redirect('/auth/login?code=send_failed')
  }

  return redirect('/auth/login?code=sent')
}

export async function signUpWithMagicLink(formData: FormData) {
  const supabase = await createClient()
  const fullName = String(formData.get('full_name') || '').trim()
  const email = String(formData.get('email') || '').trim()

  if (fullName.length < 2 || fullName.length > 80 || email.length > 254 || !EMAIL_PATTERN.test(email)) {
    return redirect('/auth/signup?code=invalid_email')
  }

  const headersList = await headers()
  let origin: string
  try {
    origin = getOrigin(headersList)
  } catch {
    return redirect('/auth/signup?code=send_failed')
  }
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      shouldCreateUser: true,
      data: { full_name: fullName },
      emailRedirectTo: origin + '/auth/confirm',
    },
  })

  if (error) {
    console.error('Magic link sign-up error:', error)
    return redirect('/auth/signup?code=send_failed')
  }

  return redirect('/auth/signup?code=sent')
}

export async function signOut() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  return redirect('/')
}