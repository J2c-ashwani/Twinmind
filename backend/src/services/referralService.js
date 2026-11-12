import { supabaseAdmin } from '../config/supabase.js';
import { logger } from '../config/logger.js';
import { addExperiencePoints } from './gamificationService.js';

export const REFERRER_XP_REWARD = 50;
export const REFERRED_XP_REWARD = 25;

function buildReferralUrl(code) {
    const webAppUrl = process.env.WEB_APP_URL || 'https://www.twingenie.app';
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

/**
 * Attribute a referred signup idempotently and grant XP rewards to both accounts.
 * Policy: 50 XP inviter, 25 XP referred user (XP-only policy).
 */
export async function recordReferral({ code, referredUserId }) {
    if (!code || !referredUserId) return null;

    const normalizedCode = String(code).trim().toUpperCase();
    const { data: referralCode, error: codeError } = await supabaseAdmin
        .from('referral_codes')
        .select('user_id, code')
        .eq('code', normalizedCode)
        .maybeSingle();

    if (codeError) throw codeError;
    if (!referralCode || referralCode.user_id === referredUserId) return null;

    // Check if referred user already has a referral event
    const { data: existingEvent, error: existingErr } = await supabaseAdmin
        .from('referral_events')
        .select('*')
        .eq('referred_user_id', referredUserId)
        .maybeSingle();

    if (existingErr && existingErr.code !== 'PGRST116') {
        throw existingErr;
    }

    let eventRow = existingEvent;

    if (!eventRow) {
        const { data: inserted, error: insertError } = await supabaseAdmin
            .from('referral_events')
            .insert({
                referrer_user_id: referralCode.user_id,
                referred_user_id: referredUserId,
                referral_code: referralCode.code,
                status: 'joined',
            })
            .select()
            .single();

        if (insertError) {
            if (insertError.code === '23505') {
                const { data: fetched } = await supabaseAdmin
                    .from('referral_events')
                    .select('*')
                    .eq('referred_user_id', referredUserId)
                    .maybeSingle();
                eventRow = fetched;
            } else {
                logger.error('Failed to record referral:', insertError);
                throw insertError;
            }
        } else {
            eventRow = inserted;
        }
    }

    if (!eventRow || eventRow.status === 'rewarded') {
        return eventRow;
    }

    // Atomically transition status from 'joined' -> 'rewarded' so XP is granted exactly once
    const { data: claimed, error: claimErr } = await supabaseAdmin
        .from('referral_events')
        .update({ status: 'rewarded' })
        .eq('id', eventRow.id)
        .eq('status', 'joined')
        .select()
        .maybeSingle();

    if (claimErr) throw claimErr;
    if (!claimed) {
        return eventRow;
    }

    await Promise.all([
        addExperiencePoints(referralCode.user_id, REFERRER_XP_REWARD),
        addExperiencePoints(referredUserId, REFERRED_XP_REWARD),
        supabaseAdmin.from('metric_events').insert([
            {
                user_id: referralCode.user_id,
                event_type: 'referral_reward',
                event_value: REFERRER_XP_REWARD,
                metric_type: 'referral',
                metadata: {
                    role: 'referrer',
                    referral_event_id: claimed.id,
                    referral_code: referralCode.code,
                    referred_user_id: referredUserId,
                },
            },
            {
                user_id: referredUserId,
                event_type: 'referral_reward',
                event_value: REFERRED_XP_REWARD,
                metric_type: 'referral',
                metadata: {
                    role: 'referred',
                    referral_event_id: claimed.id,
                    referral_code: referralCode.code,
                    referrer_user_id: referralCode.user_id,
                },
            },
        ]),
    ]);

    return claimed;
}

export async function getReferralStats(userId) {
    const [eventsRes, rewardLedgerRes] = await Promise.all([
        supabaseAdmin
            .from('referral_events')
            .select('status')
            .eq('referrer_user_id', userId),
        supabaseAdmin
            .from('metric_events')
            .select('event_value')
            .eq('user_id', userId)
            .eq('event_type', 'referral_reward'),
    ]);

    if (eventsRes.error) throw eventsRes.error;

    const events = eventsRes.data || [];
    const joined = events.length;
    const rewardedCount = events.filter((e) => e.status === 'rewarded').length;
    const pendingRewards = joined - rewardedCount;

    const ledgerXp = (rewardLedgerRes.data || []).reduce(
        (sum, row) => sum + (Number(row.event_value) || 0),
        0
    );

    const rewardsEarned = rewardLedgerRes.data ? ledgerXp : rewardedCount * REFERRER_XP_REWARD;

    return {
        invited: joined,
        joined,
        rewarded: rewardedCount,
        pending_rewards: pendingRewards,
        rewards_earned: rewardsEarned,
        total_referrals: joined,
        total_earned: rewardsEarned,
    };
}

export default {
    REFERRER_XP_REWARD,
    REFERRED_XP_REWARD,
    getOrCreateReferralCode,
    recordReferral,
    getReferralStats,
};
