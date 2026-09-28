import { type EmailOtpType } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

function getSafeNextPath(next: string, origin: string): string {
  try {
    const resolved = new URL(next, origin)
    if (resolved.origin !== origin) return '/welcome'
    if (!resolved.pathname.startsWith('/') || resolved.pathname.startsWith('//')) return '/welcome'
    return resolved.pathname + resolved.search + resolved.hash
  } catch {
    return '/welcome'
  }
}

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const tokenHash = searchParams.get('token_hash')
  const type = searchParams.get('type') as EmailOtpType | null
  const next = getSafeNextPath(searchParams.get('next') ?? '/welcome', origin)

  if (tokenHash && type) {
    const supabase = await createClient()
    const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash })
    if (!error) return NextResponse.redirect(new URL(next, origin))
    console.error('Verify OTP Error:', error)
  }

  return NextResponse.redirect(new URL('/auth/login?code=link_invalid', origin))
}