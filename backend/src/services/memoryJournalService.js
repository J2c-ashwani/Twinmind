const logger = require('../config/logger');
const { supabaseAdmin } = require('../config/supabase');

/**
 * Memory Journal Service
 * Creates and manages shared memories between user and AI
 */

// Memory type configurations
const MEMORY_TYPES = {
    milestone: {
        significance_threshold: 7,
        auto_create: true,
        examples: ['First week together', 'First vulnerability shared', 'Goal achieved']
    },
    conversation: {
        significance_threshold: 6,
        auto_create: true,
        examples: ['Deep emotional conversation', 'Breakthrough moment', 'Important decision']
    },
    achievement: {
        significance_threshold: 8,
        auto_create: true,
        examples: ['Completed goal', 'Overcame fear', 'Personal growth']
    },
    emotion: {
        significance_threshold: 7,
        auto_create: true,
        examples: ['First time sharing sadness', 'Moment of joy', 'Overcoming anxiety']
    },
    funny_moment: {
        significance_threshold: 5,
        auto_create: false,
        examples: ['Inside joke created', 'Funny conversation', 'Lighthearted moment']
    },
    breakthrough: {
        significance_threshold: 9,
        auto_create: true,
        examples: ['Major realization', 'Life-changing decision', 'Paradigm shift']
    }
};

/**
 * Create a shared memory
 */
async function createMemory(userId, memoryData) {
    try {
        const { data, error } = await supabaseAdmin
            .from('shared_memories')
            .insert({
                user_id: userId,
                memory_type: memoryData.type,
                title: memoryData.title,
                description: memoryData.description,
                conversation_id: memoryData.conversationId,
                message_id: memoryData.messageId,
                emotional_significance: memoryData.significance || 5,
                tags: memoryData.tags || []
            })
            .select()
            .single();

        if (error) throw error;

        // Create anniversary reminders
        await createAnniversaryReminders(data.id);

        logger.info(`Created memory for user ${userId}: ${memoryData.title}`);
        return data;

    } catch (error) {
        logger.error('Error creating memory:', error);
        throw error;
    }
}

/**
 * Auto-detect and create memories from conversations
 */
async function detectAndCreateMemory(userId, conversationId, messageId, messageContent, emotionalContext) {
    try {
        // Check for milestone moments
        if (emotionalContext.vulnerability_level >= 70) {
            await createMemory(userId, {
                type: 'emotion',
                title: 'Moment of Vulnerability',
                description: `Shared deep emotions: ${messageContent.substring(0, 100)}...`,
                conversationId,
                messageId,
                significance: 8,
                tags: ['vulnerability', 'trust']
            });
        }

        // Check for achievements
        if (messageContent.toLowerCase().includes('achieved') ||
            messageContent.toLowerCase().includes('accomplished') ||
            messageContent.toLowerCase().includes('did it')) {
            await createMemory(userId, {
                type: 'achievement',
                title: 'Achievement Unlocked',
                description: messageContent.substring(0, 200),
                conversationId,
                messageId,
                significance: 7,
                tags: ['achievement', 'growth']
            });
        }

        // Check for breakthroughs (realization keywords)
        if (messageContent.toLowerCase().includes('realized') ||
            messageContent.toLowerCase().includes('understand now') ||
            messageContent.toLowerCase().includes('makes sense')) {
            await createMemory(userId, {
                type: 'breakthrough',
                title: 'Moment of Clarity',
                description: messageContent.substring(0, 200),
                conversationId,
                messageId,
                significance: 9,
                tags: ['breakthrough', 'insight']
            });
        }

    } catch (error) {
        logger.error('Error detecting memory:', error);
    }
}

/**
 * Get user's memory timeline
 */
async function getMemoryTimeline(userId, options = {}) {
    try {
        let query = supabaseAdmin
            .from('shared_memories')
            .select('*')
            .eq('user_id', userId);

        if (options.type) {
            query = query.eq('memory_type', options.type);
        }

        if (options.minSignificance) {
            query = query.gte('emotional_significance', options.minSignificance);
        }

        if (options.limit) {
            query = query.limit(options.limit);
        }

        query = query.order('created_at', { ascending: false });

        const { data, error } = await query;

        if (error) throw error;
        return data || [];

    } catch (error) {
        logger.error('Error getting memory timeline:', error);
        return [];
    }
}

/**
 * Get memory highlights (most significant)
 */
async function getMemoryHighlights(userId, count = 5) {
    try {
        const { data, error } = await supabaseAdmin
            .from('shared_memories')
            .select('*')
            .eq('user_id', userId)
            .order('emotional_significance', { ascending: false })
            .limit(count);

        if (error) throw error;
        return data || [];

    } catch (error) {
        logger.error('Error getting memory highlights:', error);
        return [];
    }
}

/**
 * Reference a memory (increment count)
 */
async function referenceMemory(memoryId) {
    try {
        const { error } = await supabaseAdmin
            .from('shared_memories')
            .update({
                referenced_count: supabaseAdmin.raw('referenced_count + 1'),
                last_referenced: new Date()
            })
            .eq('id', memoryId);

        if (error) throw error;

    } catch (error) {
        logger.error('Error referencing memory:', error);
    }
}

/**
 * Create anniversary reminders for a memory
 */
async function createAnniversaryReminders(memoryId) {
    try {
        const { data: memory } = await supabaseAdmin
            .from('shared_memories')
            .select('created_at')
            .eq('id', memoryId)
            .single();

        if (!memory) return;

        const createdDate = new Date(memory.created_at);

        // Create 1-week, 1-month, 3-month, 6-month, 1-year anniversaries
        const anniversaries = [
            { days: 7, type: 'weekly' },
            { days: 30, type: 'monthly' },
            { days: 90, type: 'quarterly' },
            { days: 180, type: 'semi-annual' },
            { days: 365, type: 'yearly' }
        ];

        for (const anniversary of anniversaries) {
            const anniversaryDate = new Date(createdDate);
            anniversaryDate.setDate(anniversaryDate.getDate() + anniversary.days);

            await supabaseAdmin
                .from('memory_anniversaries')
                .insert({
                    memory_id: memoryId,
                    anniversary_type: anniversary.type,
                    anniversary_date: anniversaryDate.toISOString().split('T')[0]
                });
        }

    } catch (error) {
        logger.error('Error creating anniversary reminders:', error);
    }
}

/**
 * Get upcoming anniversaries
 */
async function getUpcomingAnniversaries(userId, daysAhead = 7) {
    try {
        const today = new Date();
        const futureDate = new Date();
        futureDate.setDate(futureDate.getDate() + daysAhead);

        const { data, error } = await supabaseAdmin
            .from('memory_anniversaries')
            .select(`
        *,
        shared_memories!inner(*)
      `)
            .eq('shared_memories.user_id', userId)
            .gte('anniversary_date', today.toISOString().split('T')[0])
            .lte('anniversary_date', futureDate.toISOString().split('T')[0])
            .eq('notified', false);

        if (error) throw error;
        return data || [];

    } catch (error) {
        logger.error('Error getting upcoming anniversaries:', error);
        return [];
    }
}

/**
 * Mark anniversary as notified
 */
async function markAnniversaryNotified(anniversaryId) {
    try {
        await supabaseAdmin
            .from('memory_anniversaries')
            .update({
                notified: true,
                notification_sent_at: new Date()
            })
            .eq('id', anniversaryId);

    } catch (error) {
        logger.error('Error marking anniversary notified:', error);
    }
}

/**
 * Toggle memory favorite status
 */
async function toggleMemoryFavorite(memoryId) {
    try {
        const { data: memory } = await supabaseAdmin
            .from('shared_memories')
            .select('is_favorite')
            .eq('id', memoryId)
            .single();

        if (!memory) return;

        await supabaseAdmin
            .from('shared_memories')
            .update({ is_favorite: !memory.is_favorite })
            .eq('id', memoryId);

    } catch (error) {
        logger.error('Error toggling favorite:', error);
    }
}

module.exports = {
    createMemory,
    detectAndCreateMemory,
    getMemoryTimeline,
    getMemoryHighlights,
    referenceMemory,
    createAnniversaryReminders,
    getUpcomingAnniversaries,
    markAnniversaryNotified,
    toggleMemoryFavorite,
    MEMORY_TYPES
};
