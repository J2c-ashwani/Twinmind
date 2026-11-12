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

    // Direct redirects for landing page sections
    if (pathname === '/pricing') {
        return NextResponse.redirect(new URL('/#pricing', req.url))
    }
    if (pathname === '/coaching') {
        return NextResponse.redirect(new URL('/#coaching', req.url))
    }

    // Public paths that don't require authentication
    const publicPaths = [
        '/',
        '/login',
        '/signup',
        '/privacy',
        '/terms',
        '/onboarding',
        '/subscription',
        '/try',
        '/test',
        '/pricing',
        '/coaching',
        '/robots.txt',
        '/sitemap.xml',
        '/manifest.json',
        '/sw.js'
    ]

    const isPublicFile = pathname.endsWith('.txt') ||
        pathname.endsWith('.xml') ||
        pathname.endsWith('.json') ||
        pathname.endsWith('.ico') ||
        pathname.endsWith('.png') ||
        pathname.endsWith('.jpg') ||
        pathname.endsWith('.svg') ||
        pathname.endsWith('.webp')

    const isPublicPath = publicPaths.some(path => pathname === path) ||
        pathname.startsWith('/api/') ||
        isPublicFile

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
        '/((?!subscription$|subscription/|try$|try/|_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|manifest.json|sw.js|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|txt|xml|json)$).*)',
    ],
}
