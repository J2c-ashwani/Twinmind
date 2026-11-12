const STORAGE_KEY = 'twingenie_pending_attribution';

export interface PendingAttribution {
    referralCode?: string;
    utmSource?: string;
    utmMedium?: string;
    utmCampaign?: string;
    utmContent?: string;
    landingPath?: string;
    capturedAt?: string;
}

export function captureAttributionFromLocation(): PendingAttribution {
    if (typeof window === 'undefined') return {};
    const params = new URLSearchParams(window.location.search);
    const ref = params.get('ref')?.trim().toUpperCase() || undefined;
    const utmSource = params.get('utm_source')?.trim() || undefined;
    const utmMedium = params.get('utm_medium')?.trim() || undefined;
    const utmCampaign = params.get('utm_campaign')?.trim() || undefined;
    const utmContent = params.get('utm_content')?.trim() || undefined;

    const existing = getPendingAttribution();
    const merged: PendingAttribution = {
        ...existing,
        ...(ref ? { referralCode: ref } : {}),
        ...(utmSource ? { utmSource } : {}),
        ...(utmMedium ? { utmMedium } : {}),
        ...(utmCampaign ? { utmCampaign } : {}),
        ...(utmContent ? { utmContent } : {}),
        landingPath: existing.landingPath || window.location.pathname,
        capturedAt: existing.capturedAt || new Date().toISOString(),
    };

    if (ref || utmSource || utmMedium || utmCampaign || utmContent) {
        try {
            window.localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
        } catch {
            // Ignore storage errors in private browsing
        }
    }

    return merged;
}

export function getPendingAttribution(): PendingAttribution {
    if (typeof window === 'undefined') return {};
    try {
        const raw = window.localStorage.getItem(STORAGE_KEY);
        return raw ? JSON.parse(raw) : {};
    } catch {
        return {};
    }
}

export function clearPendingAttribution(): void {
    if (typeof window === 'undefined') return;
    try {
        window.localStorage.removeItem(STORAGE_KEY);
    } catch {
        // Ignore storage errors
    }
}

/**
 * Syncs deferred signup profile & referral/UTM attribution once an authenticated session exists.
 */
export async function flushPendingAttribution(params: {
    accessToken?: string;
    userId: string;
    email?: string | null;
    fullName?: string;
    userMetadata?: Record<string, any>;
}): Promise<void> {
    if (!params.accessToken || !params.userId) return;

    const stored = getPendingAttribution();
    const referralCode = stored.referralCode || params.userMetadata?.referral_code;
    const attribution = stored.utmSource || stored.referralCode
        ? stored
        : params.userMetadata?.attribution;

    if (!referralCode && !attribution) return;

    const apiUrl = process.env.NEXT_PUBLIC_API_URL || '';
    try {
        const response = await fetch(`${apiUrl}/api/auth/signup`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${params.accessToken}`,
            },
            body: JSON.stringify({
                userId: params.userId,
                email: params.email,
                fullName: params.fullName || params.userMetadata?.full_name || params.email?.split('@')[0] || 'User',
                referralCode: referralCode || undefined,
                attribution: attribution || undefined,
            }),
        });

        if (response.ok) {
            clearPendingAttribution();
        }
    } catch {
        // Retry automatically on next authenticated screen load
    }
}
