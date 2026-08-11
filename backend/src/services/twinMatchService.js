import logger from '../config/logger.js';
import { supabaseAdmin } from '../config/supabase.js';
import aiService from './aiService.js';

/**
 * Twin Match Service
 * Compare personality profiles between users
 */

/**
 * Compare two users' personality profiles
 */
export async function comparePersonalities(userId1, userId2) {
    try {
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
                .insert({
                    user1_id: userId1,
                    user2_id: userId2,
                    compatibility_score: compatibility.score,
                    insights: insights,
                    traits_comparison: compatibility.traits
                })
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

        const traits1 = profile1.personality_json?.big_five || profile1.personality_traits || {};
        const traits2 = profile2.personality_json?.big_five || profile2.personality_traits || {};

        const sharedTraits = insights.length >= 2 ? [insights[0], insights[1]] : (profile1.personality_json?.strengths || ["Shared empathy & values", "Mutual growth mindset"]);
        const differences = insights.length >= 3 ? [insights[2]] : ["Unique decision-making styles"];

        return {
            comparison_id: comparison?.id,
            user1: {
                id: userId1,
                twin_name: profile1.twin_name || 'Twin 1',
                traits: traits1
            },
            user2: {
                id: userId2,
                twin_name: profile2.twin_name || 'Twin 2',
                traits: traits2
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
 * Get comparison by ID
 */
export async function getComparison(comparisonId) {
    try {
        const { data: comparison } = await supabaseAdmin
            .from('twin_matches')
            .select('*')
            .eq('id', comparisonId)
            .single();

        if (!comparison) {
            throw new Error('Comparison not found');
        }

        const [profile1, profile2] = await Promise.all([
            getPersonalityProfile(comparison.user1_id),
            getPersonalityProfile(comparison.user2_id)
        ]);

        return {
            comparison_id: comparison.id,
            user1: {
                id: comparison.user1_id,
                twin_name: profile1?.twin_name || 'User 1'
            },
            user2: {
                id: comparison.user2_id,
                twin_name: profile2?.twin_name || 'User 2'
            },
            compatibility: comparison.compatibility_score,
            compatibility_score: comparison.compatibility_score,
            insights: comparison.insights,
            created_at: comparison.created_at
        };
    } catch (error) {
        logger.error('Error getting comparison:', error);
        throw error;
    }
}

/**
 * Find user by email or referral code (supports case-insensitive email search & pagination)
 */
export async function findUserForMatch(identifier) {
    try {
        let userId = null;
        const query = identifier ? identifier.trim().toLowerCase() : '';

        if (query.includes('@')) {
            // Paginate through Supabase auth users to find matching email
            let page = 1;
            const perPage = 1000;
            while (!userId) {
                const { data: authData, error } = await supabaseAdmin.auth.admin.listUsers({ page, perPage });
                if (error || !authData.users || authData.users.length === 0) break;

                const match = authData.users.find(u => u.email && u.email.toLowerCase() === query);
                if (match) {
                    userId = match.id;
                    break;
                }

                if (authData.users.length < perPage) break;
                page++;
            }
        } else {
            // Try as referral code
            const { data: referral } = await supabaseAdmin
                .from('referral_codes')
                .select('user_id')
                .eq('code', identifier.trim().toUpperCase())
                .maybeSingle();

            userId = referral?.user_id;
        }

        if (!userId) {
            return null;
        }

        // Get personality profile
        const profile = await getPersonalityProfile(userId);

        return profile ? {
            user_id: userId,
            twin_name: profile.twin_name || 'Twin Companion',
            has_profile: true
        } : null;
    } catch (error) {
        logger.error('Error finding user for match:', error);
        return null;
    }
}

export default {
    comparePersonalities,
    getComparison,
    findUserForMatch
};
