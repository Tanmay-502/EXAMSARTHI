import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

const PUBLIC_ASSET_PATHS = new Set([
  '/manifest.json',
  '/sw.js',
  '/icon.svg',
  '/favicon.ico',
  '/api/voice/transcribe',
])

function isPublicPath(pathname: string) {
  if (pathname === '/' || pathname === '/auth' || pathname.startsWith('/auth/')) return true
  if (PUBLIC_ASSET_PATHS.has(pathname)) return true
  if (pathname.startsWith('/_next/static/') || pathname.startsWith('/_next/image')) return true
  if (/\.(?:svg|png|jpg|jpeg|gif|webp|ico)$/i.test(pathname)) return true
  return false
}

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })
  const pathname = request.nextUrl.pathname
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  // Public pages and the login-time voice transcription endpoint must remain reachable
  // even when a preview deployment is missing Supabase configuration. Protected routes
  // still fail closed rather than crashing the middleware with an opaque 500.
  if (!supabaseUrl || !supabaseAnonKey) {
    if (isPublicPath(pathname)) return supabaseResponse
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'Service configuration unavailable' }, { status: 503 })
    }
    const url = request.nextUrl.clone()
    url.pathname = '/auth/login'
    url.search = ''
    url.searchParams.set('code', 'service_unavailable')
    const nextPath = request.nextUrl.pathname + request.nextUrl.search
    if (nextPath !== '/auth/login') url.searchParams.set('next', nextPath)
    return NextResponse.redirect(url)
  }

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() { return request.cookies.getAll() },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
        supabaseResponse = NextResponse.next({ request })
        cookiesToSet.forEach(({ name, value, options }) => supabaseResponse.cookies.set(name, value, options))
      },
    },
  })

  const { data: { user } } = await supabase.auth.getUser()
  if (!user && !isPublicPath(pathname)) {
    if (pathname.startsWith('/api/')) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const url = request.nextUrl.clone()
    url.pathname = '/auth/login'
    url.search = ''
    url.searchParams.set('code', 'unauthenticated')
    const nextPath = request.nextUrl.pathname + request.nextUrl.search
    if (nextPath !== '/auth/login') url.searchParams.set('next', nextPath)
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}

export default async function proxy(request: NextRequest) {
  return updateSession(request)
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|manifest\\.json|sw\\.js|icon\\.svg|.*\\.(?:svg|png|jpg|jpeg|gif|webp)).*)'],
}