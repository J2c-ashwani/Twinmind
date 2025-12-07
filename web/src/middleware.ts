import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function middleware(req: NextRequest) {
    const res = NextResponse.next()
    const supabase = createMiddlewareClient({ req, res })

    const {
        data: { session },
    } = await supabase.auth.getSession()

    // Public paths that don't require authentication
    const publicPaths = ['/', '/login', '/signup', '/privacy', '/terms', '/onboarding']
    const isPublicPath = publicPaths.some(path => req.nextUrl.pathname === path) ||
        req.nextUrl.pathname.startsWith('/api/')

    // If no session and trying to access protected route, redirect to login
    if (!session && !isPublicPath) {
        const redirectUrl = new URL('/login', req.url)
        redirectUrl.searchParams.set('redirectTo', req.nextUrl.pathname)
        return NextResponse.redirect(redirectUrl)
    }

    // If user is logged in and tries to access login/signup, redirect to chat
    if (session && (req.nextUrl.pathname === '/login' || req.nextUrl.pathname === '/signup')) {
        return NextResponse.redirect(new URL('/chat', req.url))
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
        '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
    ],
}
