import { type EmailOtpType } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

function getSafeNextPath(next: string, origin: string): string {
  try {
    const resolved = new URL(next, origin);
    if (resolved.origin !== origin) return '/dashboard';
    if (!resolved.pathname.startsWith('/') || resolved.pathname.startsWith('//')) return '/dashboard';
    return resolved.pathname + resolved.search + resolved.hash;
  } catch {
    return '/dashboard';
  }
}

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const token_hash = searchParams.get('token_hash')
  const type = searchParams.get('type') as EmailOtpType | null
  const next = getSafeNextPath(searchParams.get('next') ?? '/dashboard', origin)

  if (token_hash && type) {
    const supabase = await createClient()

    const { error } = await supabase.auth.verifyOtp({
      type,
      token_hash,
    })
    
    if (!error) {
      // redirect user to specified redirect URL or root of app
      return NextResponse.redirect(new URL(next, origin))
    }
    console.error('Verify OTP Error:', error)
  }

  // redirect the user to an error page with some instructions
  return NextResponse.redirect(`${origin}/auth/login?message=Your sign-in link could not be verified. Please request a new link.`)
}
