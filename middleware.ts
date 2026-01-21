import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'

// Routes that don't require authentication
const publicRoutes = ['/login', '/auth/callback']

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Allow public routes
  if (publicRoutes.some(route => pathname.startsWith(route))) {
    return NextResponse.next()
  }

  // Handle root path - redirect to welcome if authenticated, login if not
  if (pathname === '/') {
    const { user, supabaseResponse } = await updateSession(request)

    if (user) {
      return NextResponse.redirect(new URL('/welcome', request.url))
    } else {
      return NextResponse.redirect(new URL('/login', request.url))
    }
  }

  // For all other routes, check authentication
  const { user, supabaseResponse } = await updateSession(request)

  if (!user) {
    // Redirect to login with the original URL as a redirect parameter
    const redirectUrl = new URL('/login', request.url)
    redirectUrl.searchParams.set('redirectTo', pathname)
    return NextResponse.redirect(redirectUrl)
  }

  // User is authenticated, continue with the session-refreshed response
  return supabaseResponse
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - api (API routes - handled separately)
     * Feel free to modify this pattern to include more paths.
     */
    '/((?!_next/static|_next/image|favicon.ico|api|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
