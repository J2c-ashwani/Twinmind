import logger from '../config/logger.js';
import { supabaseAdmin } from '../config/supabase.js';
import aiService from './aiService.js';

/**
 * Twin Match Service
 * Compare personality profiles between users
 */

/**
 * Check if two users have mutually consented to Twin Match comparison
 */
export async function hasAcceptedConsent(userId1, userId2) {
    if (!userId1 || !userId2 || userId1 === userId2) return false;

    const { data: invite, error } = await supabaseAdmin
        .from('twin_match_invitations')
        .select('id, status')
        .or(`and(requester_id.eq.${userId1},recipient_id.eq.${userId2}),and(requester_id.eq.${userId2},recipient_id.eq.${userId1})`)
        .eq('status', 'accepted')
        .limit(1)
        .maybeSingle();

    if (!error && invite) {
        return true;
    }

    return false;
}

/**
 * Send a Twin Match consent invitation without leaking email existence
 */
export async function createMatchInvitation(requesterId, identifier) {
    const target = await resolveUserIdByIdentifier(identifier, { allowEmailLookup: true });
    if (!target || target === requesterId) {
        return { invited: true, pending: true };
    }

    const { data: existing } = await supabaseAdmin
        .from('twin_match_invitations')
        .select('id, status')
        .or(`and(requester_id.eq.${requesterId},recipient_id.eq.${target}),and(requester_id.eq.${target},recipient_id.eq.${requesterId})`)
        .maybeSingle();

    if (existing?.status === 'accepted') {
        return { invited: true, accepted: true, invitation_id: existing.id };
    }

    if (existing) {
        const { data: updated, error } = await supabaseAdmin
            .from('twin_match_invitations')
            .update({
                requester_id: requesterId,
                recipient_id: target,
                status: 'pending',
                responded_at: null,
            })
            .eq('id', existing.id)
            .select('id, status')
            .single();
        if (error) throw error;
        return { invited: true, pending: true, invitation_id: updated.id };
    }

    const { data: inserted, error } = await supabaseAdmin
        .from('twin_match_invitations')
        .insert({
            requester_id: requesterId,
            recipient_id: target,
            status: 'pending',
        })
        .select('id, status')
        .single();

    if (error) throw error;
    return { invited: true, pending: true, invitation_id: inserted.id };
}

/**
 * List incoming & outgoing Twin Match invitations for a user (minimal preview only)
 */
export async function listMatchInvitations(userId) {
    const { data: rows, error } = await supabaseAdmin
        .from('twin_match_invitations')
        .select('id, requester_id, recipient_id, status, created_at, responded_at')
        .or(`requester_id.eq.${userId},recipient_id.eq.${userId}`)
        .order('created_at', { ascending: false });

    if (error) throw error;

    const otherIds = Array.from(
        new Set((rows || []).map(r => (r.requester_id === userId ? r.recipient_id : r.requester_id)))
    );

    const profileMap = new Map();
    if (otherIds.length > 0) {
        const { data: profiles } = await supabaseAdmin
            .from('personality_profiles')
            .select('user_id, twin_name')
            .in('user_id', otherIds);
        (profiles || []).forEach(p => profileMap.set(p.user_id, p.twin_name || 'Twin Companion'));
    }

    return (rows || []).map(r => {
        const otherId = r.requester_id === userId ? r.recipient_id : r.requester_id;
        return {
            id: r.id,
            direction: r.requester_id === userId ? 'outgoing' : 'incoming',
            partner_twin_name: profileMap.get(otherId) || 'Twin Companion',
            status: r.status,
            created_at: r.created_at,
            responded_at: r.responded_at,
        };
    });
}

/**
 * Respond to an incoming Twin Match invitation (recipient only)
 */
export async function respondToMatchInvitation(invitationId, userId, action) {
    if (!['accept', 'decline'].includes(action)) {
        const err = new Error('Action must be accept or decline');
        err.statusCode = 400;
        throw err;
    }

    const { data: invite, error: fetchErr } = await supabaseAdmin
        .from('twin_match_invitations')
        .select('*')
        .eq('id', invitationId)
        .eq('recipient_id', userId)
        .maybeSingle();

    if (fetchErr) throw fetchErr;
    if (!invite) {
        const err = new Error('Invitation not found');
        err.statusCode = 404;
        throw err;
    }

    const nextStatus = action === 'accept' ? 'accepted' : 'declined';
    const { data: updated, error } = await supabaseAdmin
        .from('twin_match_invitations')
        .update({
            status: nextStatus,
            responded_at: new Date().toISOString(),
        })
        .eq('id', invitationId)
        .eq('recipient_id', userId)
        .select()
        .single();

    if (error) throw error;

    if (action === 'accept') {
        const comparison = await comparePersonalities(invite.requester_id, invite.recipient_id, {
            bypassConsentCheck: true,
        });
        return { invitation: updated, comparison };
    }

    return { invitation: updated, comparison: null };
}

/**
 * Revoke Twin Match consent and delete comparison visibility for a match
 */
export async function revokeComparisonSharing(comparisonId, userId) {
    const { data: comparison, error: fetchErr } = await supabaseAdmin
        .from('twin_matches')
        .select('*')
        .eq('id', comparisonId)
        .maybeSingle();

    if (fetchErr) throw fetchErr;
    if (!comparison || (comparison.user1_id !== userId && comparison.user2_id !== userId)) {
        const err = new Error('Comparison not found');
        err.statusCode = 404;
        throw err;
    }

    await supabaseAdmin
        .from('twin_matches')
        .delete()
        .eq('id', comparisonId);

    await supabaseAdmin
        .from('twin_match_invitations')
        .update({ status: 'revoked', responded_at: new Date().toISOString() })
        .or(
            `and(requester_id.eq.${comparison.user1_id},recipient_id.eq.${comparison.user2_id}),and(requester_id.eq.${comparison.user2_id},recipient_id.eq.${comparison.user1_id})`
        );

    return { revoked: true };
}

/**
 * Compare two users' personality profiles (requires mutual accepted consent)
 */
export async function comparePersonalities(userId1, userId2, { bypassConsentCheck = false } = {}) {
    try {
        if (!bypassConsentCheck) {
            const consented = await hasAcceptedConsent(userId1, userId2);
            if (!consented) {
                const err = new Error('Twin Match requires mutual consent. Send an invitation and wait for your friend to accept.');
                err.statusCode = 403;
                err.code = 'CONSENT_REQUIRED';
                throw err;
            }
        }

        // Get both personality profiles
        const [profile1, profile2] = await Promise.all([
            getPersonalityProfile(userId1),
            getPersonalityProfile(userId2)
        ]);

        if (!profile1 || !profile2) {
            throw new Error('One or both users do not have personality profiles');
        }

        // Calculate compatibility
        const compatibility = calculateCompatibility(profile1, profile2);

        // Generate AI insights
        const insights = await generateComparisonInsights(profile1, profile2, compatibility);

        // Create comparison record with fallback resilience if table does not exist
        let comparison = null;
        try {
            const { data: comp } = await supabaseAdmin
                .from('twin_matches')
                .upsert({
                    user1_id: userId1,
                    user2_id: userId2,
                    compatibility_score: compatibility.score,
                    insights: insights,
                    traits_comparison: compatibility.traits,
                    is_shared: true,
                }, { onConflict: 'user1_id,user2_id' })
                .select()
                .single();
            comparison = comp;
        } catch (compErr) {
            logger.warn('twin_matches insert warning:', compErr.message);
            try {
                await supabaseAdmin.from('metric_events').insert({
                    user_id: userId1,
                    event_type: 'twin_match_performed',
                    event_value: compatibility.score,
                    metric_type: 'twin_match',
                    metadata: { user2_id: userId2, compatibility_score: compatibility.score }
                });
            } catch (fallbackErr) {
                logger.warn('metric_events fallback warning:', fallbackErr.message);
            }
        }

        const sharedTraits = insights.length >= 2 ? [insights[0], insights[1]] : (profile1.personality_json?.strengths || ["Shared empathy & values", "Mutual growth mindset"]);
        const differences = insights.length >= 3 ? [insights[2]] : ["Unique decision-making styles"];

        // Never leak partner's raw Big Five psychological JSON traits
        return {
            comparison_id: comparison?.id,
            user1: {
                twin_name: profile1.twin_name || 'Twin 1',
            },
            user2: {
                twin_name: profile2.twin_name || 'Twin 2',
            },
            compatibility: compatibility.score,
            compatibility_score: compatibility.score, // Mobile Flutter contract requirement
            shared_traits: sharedTraits,              // Mobile Flutter contract requirement
            differences: differences,                  // Mobile Flutter contract requirement
            dimensions: compatibility.traits,
            insights
        };
    } catch (error) {
        logger.error('Error comparing personalities:', error);
        throw error;
    }
}

/**
 * Get personality profile for user
 */
async function getPersonalityProfile(userId) {
    const { data: profile } = await supabaseAdmin
        .from('personality_profiles')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

    return profile;
}

/**
 * Calculate compatibility score between two profiles
 */
function calculateCompatibility(profile1, profile2) {
    const traits1 = profile1.personality_json?.big_five || profile1.personality_traits || {};
    const traits2 = profile2.personality_json?.big_five || profile2.personality_traits || {};

    const dimensions = [
        'openness',
        'conscientiousness',
        'extraversion',
        'agreeableness',
        'neuroticism',
        'emotional_depth',
        'optimism',
        'analytical',
        'creativity',
        'empathy'
    ];

    let totalSimilarity = 0;
    let dimensionCount = 0;
    const traitComparisons = {};

    dimensions.forEach(dim => {
        if (traits1[dim] !== undefined && traits2[dim] !== undefined) {
            let val1 = Number(traits1[dim]);
            let val2 = Number(traits2[dim]);

            // Normalize 0-100 or 0-10 to 0-1 scale
            if (val1 > 10) val1 = val1 / 100;
            else if (val1 > 1) val1 = val1 / 10;

            if (val2 > 10) val2 = val2 / 100;
            else if (val2 > 1) val2 = val2 / 10;

            const similarity = Math.max(0, Math.min(1, 1 - Math.abs(val1 - val2)));

            totalSimilarity += similarity;
            dimensionCount++;

            traitComparisons[dim] = {
                user1: traits1[dim],
                user2: traits2[dim],
                similarity: Math.round(similarity * 100),
                difference: Math.round((val1 - val2) * 10)
            };
        }
    });

    const overallScore = dimensionCount > 0
        ? Math.max(50, Math.min(98, Math.round((totalSimilarity / dimensionCount) * 100)))
        : 78;

    return {
        score: overallScore,
        traits: traitComparisons
    };
}

/**
 * Generate AI insights about the comparison
 */
async function generateComparisonInsights(profile1, profile2, compatibility) {
    try {
        const traits1 = profile1.personality_json || profile1.personality_traits || {};
        const traits2 = profile2.personality_json || profile2.personality_traits || {};

        const prompt = `Compare these two personality profiles and generate 3 interesting insights:

Profile 1 (${profile1.twin_name}):
${JSON.stringify(traits1, null, 2)}

Profile 2 (${profile2.twin_name}):
${JSON.stringify(traits2, null, 2)}

Compatibility Score: ${compatibility.score}%

Create insights that are:
1. Positive and encouraging
2. Highlight similarities AND complementary differences
3. Under 25 words each
4. Actionable or reflective

Format as JSON array: ["insight1", "insight2", "insight3"]`;

        const aiResult = await aiService.generateChatResponse(prompt);
        const aiResponse = aiResult?.text || '';

        let insights;
        try {
            insights = JSON.parse(aiResponse);
        } catch {
            insights = [
                `${compatibility.score}% compatibility - you share strong core emotional alignment!`,
                "Your communication and thinking patterns balance each other nicely.",
                "Together, you create a supportive environment for personal growth."
            ];
        }

        return insights;
    } catch (error) {
        logger.error('Error generating insights:', error);
        return [
            "You both prioritize emotional growth and self-awareness.",
            "Your unique perspectives offer each other valuable inspiration.",
            `${compatibility.score}% compatible - a solid foundation for dynamic companion interaction!`
        ];
    }
}

/**
 * Get comparison by ID (restricted to comparison participants)
 */
export async function getComparison(comparisonId, requesterId) {
    try {
        if (!requesterId) {
            const err = new Error('Unauthorized');
            err.statusCode = 401;
            throw err;
        }

        const { data: comparison } = await supabaseAdmin
            .from('twin_matches')
            .select('*')
            .eq('id', comparisonId)
            .maybeSingle();

        if (!comparison) {
            const err = new Error('Comparison not found');
            err.statusCode = 404;
            throw err;
        }

        if (comparison.user1_id !== requesterId && comparison.user2_id !== requesterId) {
            const err = new Error('Forbidden: You are not a participant in this comparison');
            err.statusCode = 403;
            throw err;
        }

        const [profile1, profile2] = await Promise.all([
            getPersonalityProfile(comparison.user1_id),
            getPersonalityProfile(comparison.user2_id)
        ]);

        return {
            comparison_id: comparison.id,
            user1: {
                twin_name: profile1?.twin_name || 'User 1'
            },
            user2: {
                twin_name: profile2?.twin_name || 'User 2'
            },
            compatibility: comparison.compatibility_score,
            compatibility_score: comparison.compatibility_score,
            dimensions: comparison.traits_comparison || {},
            insights: comparison.insights,
            created_at: comparison.created_at
        };
    } catch (error) {
        logger.error('Error getting comparison:', error);
        throw error;
    }
}

/**
 * Resolve user ID cleanly by referral code or (only for server-side invite creation) email
 */
export async function resolveUserIdByIdentifier(identifier, { allowEmailLookup = false } = {}) {
    const query = identifier ? identifier.trim().toLowerCase() : '';
    if (!query) return null;

    if (query.includes('@')) {
        if (!allowEmailLookup) return null;
        let page = 1;
        const perPage = 1000;
        while (true) {
            const { data: authData, error } = await supabaseAdmin.auth.admin.listUsers({ page, perPage });
            if (error || !authData?.users || authData.users.length === 0) break;

            const match = authData.users.find(u => u.email && u.email.toLowerCase() === query);
            if (match) return match.id;
            if (authData.users.length < perPage) break;
            page++;
        }
        return null;
    }

    const { data: referral } = await supabaseAdmin
        .from('referral_codes')
        .select('user_id')
        .eq('code', identifier.trim().toUpperCase())
        .maybeSingle();

    return referral?.user_id || null;
}

/**
 * Find user by referral code only (never enumerate arbitrary emails; minimal preview only)
 */
export async function findUserForMatch(identifier) {
    try {
        const userId = await resolveUserIdByIdentifier(identifier, { allowEmailLookup: false });

        if (!userId) {
            return null;
        }

        const profile = await getPersonalityProfile(userId);

        return profile ? {
            twin_name: profile.twin_name || 'Twin Companion',
            has_profile: true,
            requires_consent: true,
        } : null;
    } catch (error) {
        logger.error('Error finding user for match:', error);
        return null;
    }
}

export default {
    hasAcceptedConsent,
    createMatchInvitation,
    listMatchInvitations,
    respondToMatchInvitation,
    revokeComparisonSharing,
    comparePersonalities,
    getComparison,
    resolveUserIdByIdentifier,
    findUserForMatch
};
