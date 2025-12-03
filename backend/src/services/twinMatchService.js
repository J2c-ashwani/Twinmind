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

        // Create comparison record
        const { data: comparison } = await supabaseAdmin
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

        return {
            comparison_id: comparison?.id,
            user1: {
                id: userId1,
                twin_name: profile1.twin_name,
                traits: profile1.personality_traits
            },
            user2: {
                id: userId2,
                twin_name: profile2.twin_name,
                traits: profile2.personality_traits
            },
            compatibility: compatibility.score,
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
        .single();

    return profile;
}

/**
 * Calculate compatibility score between two profiles
 */
function calculateCompatibility(profile1, profile2) {
    const traits1 = profile1.personality_traits || {};
    const traits2 = profile2.personality_traits || {};

    // Define dimensions to compare
    const dimensions = [
        'openness',
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
            // Normalize to 0-1 scale (assuming traits are 0-10)
            const val1 = traits1[dim] / 10;
            const val2 = traits2[dim] / 10;

            // Calculate similarity (1 - absolute difference)
            const similarity = 1 - Math.abs(val1 - val2);

            totalSimilarity += similarity;
            dimensionCount++;

            traitComparisons[dim] = {
                user1: traits1[dim],
                user2: traits2[dim],
                similarity: Math.round(similarity * 100),
                difference: traits1[dim] - traits2[dim] // Positive means user1 higher
            };
        }
    });

    const overallScore = dimensionCount > 0
        ? Math.round((totalSimilarity / dimensionCount) * 100)
        : 50;

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
        const prompt = `Compare these two personality profiles and generate 3 interesting insights:

Profile 1 (${profile1.twin_name}):
${JSON.stringify(profile1.personality_traits, null, 2)}
${profile1.summary || ''}

Profile 2 (${profile2.twin_name}):
${JSON.stringify(profile2.personality_traits, null, 2)}
${profile2.summary || ''}

Compatibility Score: ${compatibility.score}%

Create insights that are:
1. Positive and encouraging
2. Highlight similarities AND complementary differences
3. Under 25 words each
4. Actionable or reflective

Format as JSON array: ["insight1", "insight2", "insight3"]`;

        const aiResponse = await aiService.generateResponse(prompt, 'flash');

        let insights;
        try {
            insights = JSON.parse(aiResponse);
        } catch {
            // Fallback insights
            insights = [
                `${compatibility.score}% compatibility - you share similar emotional wavelengths!`,
                "Your differences complement each other perfectly.",
                "Together, you'd make a great support system."
            ];
        }

        return insights;
    } catch (error) {
        logger.error('Error generating insights:', error);
        return [
            "You both prioritize emotional growth and self-awareness.",
            "Your unique perspectives could offer each other valuable insights.",
            `${compatibility.score}% compatible - a strong foundation for mutual support!`
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

        // Get user profiles for names
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
            insights: comparison.insights,
            created_at: comparison.created_at
        };
    } catch (error) {
        logger.error('Error getting comparison:', error);
        throw error;
    }
}

/**
 * Find user by email or referral code
 */
export async function findUserForMatch(identifier) {
    try {
        // Try as email first
        let userId = null;

        // Check if it's an email
        if (identifier.includes('@')) {
            const { data: authUser } = await supabaseAdmin.auth.admin.listUsers();
            const user = authUser.users?.find(u => u.email === identifier);
            userId = user?.id;
        } else {
            // Try as referral code
            const { data: referral } = await supabaseAdmin
                .from('referrals')
                .select('user_id')
                .eq('referral_code', identifier)
                .single();

            userId = referral?.user_id;
        }

        if (!userId) {
            return null;
        }

        // Get personality profile
        const profile = await getPersonalityProfile(userId);

        return profile ? {
            user_id: userId,
            twin_name: profile.twin_name,
            has_profile: true
        } : null;
    } catch (error) {
        logger.error('Error finding user:', error);
        return null;
    }
}

export default {
    comparePersonalities,
    getComparison,
    findUserForMatch
};
