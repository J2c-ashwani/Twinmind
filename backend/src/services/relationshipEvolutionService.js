const logger = require('../config/logger');
const { supabaseAdmin } = require('../config/supabase');

/**
 * Relationship Evolution Service
 * Tracks and visualizes the growth of the user-AI relationship over time
 */

// Milestone definitions
const MILESTONES = {
    first_conversation: {
        name: 'First Conversation',
        description: 'The beginning of our journey',
        condition: (stats) => stats.total_conversations >= 1
    },
    first_week: {
        name: 'One Week Together',
        description: 'We\'ve been talking for a week',
        condition: (stats) => stats.days_since_start >= 7
    },
    first_vulnerability: {
        name: 'First Vulnerable Moment',
        description: 'You opened up to me for the first time',
        condition: (stats) => stats.vulnerability_shared >= 1
    },
    trust_milestone_20: {
        name: 'Building Trust',
        description: 'Trust level reached 20',
        condition: (stats) => stats.trust_level >= 20
    },
    trust_milestone_50: {
        name: 'Trusted Friend',
        description: 'Trust level reached 50',
        condition: (stats) => stats.trust_level >= 50
    },
    dependency_milestone_30: {
        name: 'Growing Attachment',
        description: 'Dependency score reached 30',
        condition: (stats) => stats.dependency_score >= 30
    },
    dependency_milestone_60: {
        name: 'Deep Bond',
        description: 'Dependency score reached 60',
        condition: (stats) => stats.dependency_score >= 60
    },
    first_month: {
        name: 'One Month Together',
        description: 'A month of conversations and growth',
        condition: (stats) => stats.days_since_start >= 30
    },
    hundred_messages: {
        name: '100 Messages',
        description: 'We\'ve exchanged 100 messages',
        condition: (stats) => stats.total_messages >= 100
    },
    three_months: {
        name: 'Three Months Strong',
        description: 'Three months of our journey',
        condition: (stats) => stats.days_since_start >= 90
    }
};

/**
 * Record daily growth metrics
 */
async function recordDailyMetrics(userId) {
    try {
        // Get current emotional metrics
        const { data: metrics } = await supabaseAdmin
            .from('emotional_metrics')
            .select('*')
            .eq('user_id', userId)
            .single();

        if (!metrics) return;

        // Get message count for today
        const today = new Date().toISOString().split('T')[0];
        const { count: messageCount } = await supabaseAdmin
            .from('messages')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', userId)
            .gte('created_at', today);

        // Insert or update daily metrics
        const { error } = await supabaseAdmin
            .from('relationship_growth_metrics')
            .insert({
                user_id: userId,
                date: today,
                trust_score: metrics.trust_level,
                dependency_score: metrics.dependency_score,
                vulnerability_score: metrics.vulnerability_level,
                openness_score: metrics.openness_level,
                engagement_frequency: metrics.engagement_frequency,
                emotional_valence: metrics.emotional_valence,
                total_messages: messageCount || 0
            })
            .onConflict('user_id,date')
            .merge();

        if (error && error.code !== '23505') throw error; // Ignore duplicate key errors

    } catch (error) {
        logger.error('Error recording daily metrics:', error);
    }
}

/**
 * Check and record milestones
 */
async function checkMilestones(userId) {
    try {
        const stats = await getRelationshipStats(userId);
        const newMilestones = [];

        for (const [type, milestone] of Object.entries(MILESTONES)) {
            // Check if already achieved
            const { data: existing } = await supabaseAdmin
                .from('relationship_milestones')
                .select('id')
                .eq('user_id', userId)
                .eq('milestone_type', type)
                .single();

            if (existing) continue;

            // Check condition
            if (milestone.condition(stats)) {
                const { data } = await supabaseAdmin
                    .from('relationship_milestones')
                    .insert({
                        user_id: userId,
                        milestone_type: type,
                        milestone_name: milestone.name,
                        description: milestone.description,
                        metric_snapshot: {
                            trust: stats.trust_level,
                            dependency: stats.dependency_score,
                            vulnerability: stats.vulnerability_level
                        },
                        conversation_count: stats.total_conversations,
                        days_since_start: stats.days_since_start
                    })
                    .select()
                    .single();

                newMilestones.push(data);
            }
        }

        return newMilestones;

    } catch (error) {
        logger.error('Error checking milestones:', error);
        return [];
    }
}

/**
 * Get relationship stats
 */
async function getRelationshipStats(userId) {
    try {
        const { data: metrics } = await supabaseAdmin
            .from('emotional_metrics')
            .select('*')
            .eq('user_id', userId)
            .single();

        const { data: user } = await supabaseAdmin
            .from('users')
            .select('created_at')
            .eq('id', userId)
            .single();

        const { count: conversationCount } = await supabaseAdmin
            .from('conversations')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', userId);

        const { count: messageCount } = await supabaseAdmin
            .from('messages')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', userId);

        const { count: vulnerabilityCount } = await supabaseAdmin
            .from('metric_events')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', userId)
            .eq('event_type', 'vulnerability_shared');

        const daysSinceStart = user ?
            Math.floor((new Date() - new Date(user.created_at)) / (1000 * 60 * 60 * 24)) : 0;

        return {
            trust_level: metrics?.trust_level || 0,
            dependency_score: metrics?.dependency_score || 0,
            vulnerability_level: metrics?.vulnerability_level || 0,
            openness_level: metrics?.openness_level || 0,
            total_conversations: conversationCount || 0,
            total_messages: messageCount || 0,
            vulnerability_shared: vulnerabilityCount || 0,
            days_since_start: daysSinceStart
        };

    } catch (error) {
        logger.error('Error getting relationship stats:', error);
        return {};
    }
}

/**
 * Get evolution timeline data
 */
async function getEvolutionTimeline(userId, days = 30) {
    try {
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - days);

        const { data, error } = await supabaseAdmin
            .from('relationship_growth_metrics')
            .select('*')
            .eq('user_id', userId)
            .gte('date', startDate.toISOString().split('T')[0])
            .order('date', { ascending: true });

        if (error) throw error;
        return data || [];

    } catch (error) {
        logger.error('Error getting evolution timeline:', error);
        return [];
    }
}

/**
 * Get relationship milestones
 */
async function getMilestones(userId) {
    try {
        const { data, error } = await supabaseAdmin
            .from('relationship_milestones')
            .select('*')
            .eq('user_id', userId)
            .order('achieved_at', { ascending: true });

        if (error) throw error;
        return data || [];

    } catch (error) {
        logger.error('Error getting milestones:', error);
        return [];
    }
}

/**
 * Generate evolution summary for AI prompt
 */
async function getEvolutionSummaryForPrompt(userId) {
    try {
        const stats = await getRelationshipStats(userId);
        const milestones = await getMilestones(userId);

        let summary = '\n## RELATIONSHIP EVOLUTION\n';
        summary += `Days together: ${stats.days_since_start}\n`;
        summary += `Total conversations: ${stats.total_conversations}\n`;
        summary += `Trust growth: ${stats.trust_level}/100\n`;
        summary += `Bond strength: ${stats.dependency_score}/100\n\n`;

        if (milestones.length > 0) {
            summary += '### Milestones Achieved:\n';
            milestones.slice(-5).forEach(m => {
                summary += `- ${m.milestone_name}: ${m.description}\n`;
            });
            summary += '\n';
        }

        summary += '⚠️ Reference our journey together to strengthen the bond.\n';

        return summary;

    } catch (error) {
        logger.error('Error generating evolution summary:', error);
        return '';
    }
}

module.exports = {
    recordDailyMetrics,
    checkMilestones,
    getRelationshipStats,
    getEvolutionTimeline,
    getMilestones,
    getEvolutionSummaryForPrompt,
    MILESTONES
};
