import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function middleware(req: NextRequest) {
    const res = NextResponse.next()
    const supabase = createMiddlewareClient({ req, res })

    const {
        data: { session },
    } = await supabase.auth.getSession()

    const pathname = req.nextUrl.pathname

    // If user is logged in and tries to access login/signup, redirect to chat
    if (session && (pathname === '/login' || pathname === '/signup')) {
        return NextResponse.redirect(new URL('/chat', req.url))
    }

    // Public paths that don't require authentication
    const publicPaths = ['/', '/login', '/signup', '/privacy', '/terms', '/onboarding', '/subscription', '/try']
    const isPublicPath = publicPaths.some(path => pathname === path) || pathname.startsWith('/api/')

    if (isPublicPath) {
        return res
    }

    // If no session and trying to access protected route, redirect to login
    if (!session) {
        const redirectUrl = new URL('/login', req.url)
        redirectUrl.searchParams.set('redirectTo', pathname)
        return NextResponse.redirect(redirectUrl)
    }

    return res
}

export const config = {
    matcher: [
        /*
         * Match all request paths except for the ones starting with:
         * - _next/static (static files)
         * - _next/image (image optimization files)
         * - favicon.ico (favicon file)
         * - public (public files)
         */
        '/((?!subscription$|subscription/|try$|try/|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
    ],
}
