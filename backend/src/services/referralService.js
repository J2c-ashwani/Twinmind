import { supabaseAdmin } from '../config/supabase.js';
import { logger } from '../config/logger.js';

function buildReferralUrl(code) {
    const webAppUrl = process.env.WEB_APP_URL || 'http://localhost:3000';
    return `${webAppUrl}/signup?ref=${encodeURIComponent(code)}`;
}

function makeCode(userId) {
    return `TWIN-${userId.replace(/-/g, '').slice(0, 8).toUpperCase()}`;
}

export async function getOrCreateReferralCode(userId) {
    const { data: existing, error: existingError } = await supabaseAdmin
        .from('referral_codes')
        .select('code')
        .eq('user_id', userId)
        .maybeSingle();

    if (existingError) throw existingError;
    if (existing?.code) {
        return { code: existing.code, url: buildReferralUrl(existing.code) };
    }

    const code = makeCode(userId);
    const { data, error } = await supabaseAdmin
        .from('referral_codes')
        .upsert({ user_id: userId, code }, { onConflict: 'user_id' })
        .select('code')
        .single();

    if (error) throw error;
    return { code: data.code, url: buildReferralUrl(data.code) };
}

export async function recordReferral({ code, referredUserId }) {
    if (!code || !referredUserId) return null;

    const normalizedCode = code.trim().toUpperCase();
    const { data: referralCode, error: codeError } = await supabaseAdmin
        .from('referral_codes')
        .select('user_id, code')
        .eq('code', normalizedCode)
        .maybeSingle();

    if (codeError) throw codeError;
    if (!referralCode || referralCode.user_id === referredUserId) return null;

    const { data, error } = await supabaseAdmin
        .from('referral_events')
        .upsert({
            referrer_user_id: referralCode.user_id,
            referred_user_id: referredUserId,
            referral_code: referralCode.code,
            status: 'joined',
        }, { onConflict: 'referred_user_id' })
        .select()
        .single();

    if (error) {
        logger.error('Failed to record referral:', error);
        throw error;
    }

    return data;
}

export async function getReferralStats(userId) {
    const { count, error } = await supabaseAdmin
        .from('referral_events')
        .select('*', { count: 'exact', head: true })
        .eq('referrer_user_id', userId);

    if (error) throw error;

    const joined = count || 0;
    return {
        invited: joined,
        joined,
        rewards_earned: joined * 50,
        total_referrals: joined,
        pending_rewards: 0,
        total_earned: joined * 50,
    };
}

export default {
    getOrCreateReferralCode,
    recordReferral,
    getReferralStats,
};
