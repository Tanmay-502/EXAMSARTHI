'use server'

import { redirect } from 'next/navigation'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { checkRateLimit } from '@/lib/security/rateLimit'
import {
  getInternalAuthPassword,
  getSafeVoiceNextPath,
  getVoiceAuthEmail,
  verifyVoiceCredentials,
} from '@/lib/auth/voiceCredentials'

export async function loginWithVoiceCredentials(userIdInput: string, passwordInput: string, nextPath?: string | null) {
  const userId = String(userIdInput || '').trim()
  const password = String(passwordInput || '')

  const rate = checkRateLimit(`voice-auth:${userId.toLowerCase()}`, 8, 60_000)
  if (!rate.allowed) {
    return { success: false as const, code: 'rate_limited' as const, retryAfterSeconds: rate.retryAfterSeconds }
  }

  const credentials = verifyVoiceCredentials(userId, password)
  if (!credentials) {
    return { success: false as const, code: 'invalid_credentials' as const }
  }

  const email = getVoiceAuthEmail(credentials.userId)
  const internalPassword = getInternalAuthPassword(credentials.userId)

  try {
    const adminClient = await createAdminClient()
    const supabase = await createClient()
    let authUserId: string | null = null

    const { data: profile } = await adminClient
      .from('profiles')
      .select('id')
      .eq('email', email)
      .maybeSingle()

    if (profile?.id) {
      authUserId = profile.id
    } else {
      const { data: usersPage, error: usersError } = await adminClient.auth.admin.listUsers({ page: 1, perPage: 1000 })
      if (usersError) {
        console.error('[VOICE_AUTH] Failed to look up voice user:', usersError)
        return { success: false as const, code: 'auth_error' as const }
      }
      const existing = usersPage.users.find((user) => user.email?.toLowerCase() === email.toLowerCase())
      authUserId = existing?.id ?? null
    }

    if (!authUserId) {
      const { data: created, error: createError } = await adminClient.auth.admin.createUser({
        email,
        password: internalPassword,
        email_confirm: true,
        user_metadata: {
          full_name: credentials.displayName || credentials.userId,
          voice_user_id: credentials.userId,
        },
      })

      if (createError || !created.user) {
        console.error('[VOICE_AUTH] Failed to provision voice user:', createError)
        return { success: false as const, code: 'auth_error' as const }
      }
      authUserId = created.user.id
    } else {
      const { error: updateError } = await adminClient.auth.admin.updateUserById(authUserId, {
        password: internalPassword,
        email_confirm: true,
        user_metadata: {
          full_name: credentials.displayName || credentials.userId,
          voice_user_id: credentials.userId,
        },
      })

      if (updateError) {
        console.error('[VOICE_AUTH] Failed to synchronize voice user:', updateError)
        return { success: false as const, code: 'auth_error' as const }
      }
    }

    const { error: profileError } = await adminClient
      .from('profiles')
      .upsert({
        id: authUserId,
        email,
        full_name: credentials.displayName || credentials.userId,
      }, { onConflict: 'id' })

    if (profileError) {
      console.error('[VOICE_AUTH] Failed to provision profile:', profileError)
      return { success: false as const, code: 'auth_error' as const }
    }

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password: internalPassword,
    })

    if (signInError) {
      console.error('[VOICE_AUTH] Supabase session creation failed:', signInError)
      return { success: false as const, code: 'auth_error' as const }
    }
  } catch (error) {
    console.error('[VOICE_AUTH] Voice login failed:', error)
    return { success: false as const, code: 'auth_error' as const }
  }

  redirect(getSafeVoiceNextPath(nextPath))
}

export async function signOut() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  return redirect('/')
}
