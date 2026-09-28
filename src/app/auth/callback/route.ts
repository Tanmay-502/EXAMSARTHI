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
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const next = getSafeNextPath(requestUrl.searchParams.get('next') ?? '/welcome', requestUrl.origin)

  if (!code) {
    return NextResponse.redirect(
      new URL('/auth/login?code=send_failed', requestUrl.origin)
    )
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.exchangeCodeForSession(code)

  if (error) {
    console.error('Google OAuth callback error:', error)
    return NextResponse.redirect(
      new URL('/auth/login?code=send_failed', requestUrl.origin)
    )
  }

  return NextResponse.redirect(new URL(next, requestUrl.origin))
}
