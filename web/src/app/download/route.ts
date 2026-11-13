import { NextRequest, NextResponse } from 'next/server';

const PLAY_STORE_URL = 'https://play.google.com/store/apps/details?id=com.asmind.app';

export async function GET(req: NextRequest) {
    const searchParams = req.nextUrl.searchParams;
    const entries = Array.from(searchParams.entries());

    if (entries.length === 0) {
        return NextResponse.redirect(PLAY_STORE_URL, 307);
    }

    // Pass referral & campaign attribution through Google Play referrer format
    const referrerParts = entries.map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`).join('&');
    const targetUrl = `${PLAY_STORE_URL}&referrer=${encodeURIComponent(referrerParts)}`;

    return NextResponse.redirect(targetUrl, 307);
}
