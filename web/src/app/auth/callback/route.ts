import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL =
    process.env.BACKEND_URL ||
    process.env.NEXT_PUBLIC_API_URL ||
    'https://twinmind-9l6x.onrender.com';

export async function GET(request: NextRequest) {
    const requestUrl = new URL(request.url);
    const code = requestUrl.searchParams.get('code');
    const oauthError = requestUrl.searchParams.get('error');
    const nextParam = requestUrl.searchParams.get('next');
    const safeNext =
        nextParam && nextParam.startsWith('/') && !nextParam.startsWith('//')
            ? nextParam
            : null;

    if (oauthError || !code) {
        return NextResponse.redirect(new URL('/login?error=oauth_failed', requestUrl.origin));
    }

    try {
        const cookieStore = cookies();
        const supabase = createRouteHandlerClient({ cookies: () => cookieStore });
        const { data, error } = await supabase.auth.exchangeCodeForSession(code);

        if (error || !data?.session || !data?.user) {
            return NextResponse.redirect(new URL('/login?error=oauth_failed', requestUrl.origin));
        }

        const accessToken = data.session.access_token;
        const user = data.user;

        // Ensure public.users & free subscription row exist for brand-new Google users
        // without overwriting customized names for existing mobile/web accounts.
        try {
            const profileCheck = await fetch(`${BACKEND_URL}/api/auth/profile/${user.id}`, {
                headers: { Authorization: `Bearer ${accessToken}` },
                cache: 'no-store',
            });

            if (!profileCheck.ok) {
                await fetch(`${BACKEND_URL}/api/auth/signup`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        Authorization: `Bearer ${accessToken}`,
                    },
                    body: JSON.stringify({
                        userId: user.id,
                        email: user.email,
                        fullName:
                            user.user_metadata?.full_name ||
                            user.user_metadata?.name ||
                            user.email?.split('@')[0] ||
                            'User',
                    }),
                });
            }
        } catch {
            // Non-blocking fallback
        }

        // Check whether onboarding (personality_profiles) is complete (matches Mobile LoginScreen)
        let hasPersonalityProfile = false;
        try {
            const personalityRes = await fetch(`${BACKEND_URL}/api/personality/profile`, {
                headers: { Authorization: `Bearer ${accessToken}` },
                cache: 'no-store',
            });
            if (personalityRes.ok) {
                hasPersonalityProfile = true;
            }
        } catch {
            const { data: profileRow } = await supabase
                .from('personality_profiles')
                .select('user_id')
                .eq('user_id', user.id)
                .maybeSingle();
            hasPersonalityProfile = Boolean(profileRow);
        }

        const destination = hasPersonalityProfile ? safeNext || '/chat' : '/onboarding';
        return NextResponse.redirect(new URL(destination, requestUrl.origin));
    } catch {
        return NextResponse.redirect(new URL('/login?error=oauth_failed', requestUrl.origin));
    }
}
