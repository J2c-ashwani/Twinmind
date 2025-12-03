const logger = require('../config/logger');
const { supabaseAdmin } = require('../config/supabase');

/**
 * Life Context Service
 * Tracks and manages important people, places, events, and situations in user's life
 */

/**
 * Extract and create life context from conversation
 */
async function extractLifeContext(userId, message, conversationId) {
    try {
        const contexts = [];

        // Extract people (simple NLP - can be enhanced with proper NER)
        const peoplePatterns = [
            /my (sister|brother|mom|dad|mother|father|friend|boss|partner|wife|husband|boyfriend|girlfriend|colleague)\s+(\w+)/gi,
            /(\w+)\s+is my (sister|brother|friend|boss|partner|colleague)/gi
        ];

        for (const pattern of peoplePatterns) {
            const matches = [...message.matchAll(pattern)];
            for (const match of matches) {
                const name = match[2] || match[1];
                const relationship = match[1] || match[2];

                contexts.push({
                    type: 'person',
                    name: name,
                    relationship: relationship,
                    importance: 7
                });
            }
        }

        // Extract goals
        if (message.toLowerCase().includes('want to') ||
            message.toLowerCase().includes('goal is') ||
            message.toLowerCase().includes('trying to')) {
            const goalMatch = message.match(/(want to|goal is to|trying to)\s+([^.!?]+)/i);
            if (goalMatch) {
                contexts.push({
                    type: 'goal',
                    name: goalMatch[2].trim(),
                    importance: 8,
                    status: 'active'
                });
            }
        }

        // Extract situations
        if (message.toLowerCase().includes('dealing with') ||
            message.toLowerCase().includes('struggling with')) {
            const situationMatch = message.match(/(dealing with|struggling with)\s+([^.!?]+)/i);
            if (situationMatch) {
                contexts.push({
                    type: 'situation',
                    name: situationMatch[2].trim(),
                    importance: 7,
                    status: 'ongoing'
                });
            }
        }

        // Create or update contexts
        for (const context of contexts) {
            await createOrUpdateContext(userId, context, conversationId);
        }

        return contexts;

    } catch (error) {
        logger.error('Error extracting life context:', error);
        return [];
    }
}

/**
 * Create or update life context
 */
async function createOrUpdateContext(userId, contextData, conversationId) {
    try {
        // Check if context already exists
        const { data: existing } = await supabaseAdmin
            .from('life_context')
            .select('*')
            .eq('user_id', userId)
            .eq('context_type', contextData.type)
            .ilike('name', contextData.name)
            .single();

        if (existing) {
            // Update existing context
            await supabaseAdmin
                .from('life_context')
                .update({
                    last_mentioned: new Date(),
                    mention_count: existing.mention_count + 1,
                    relationship: contextData.relationship || existing.relationship,
                    importance: Math.max(contextData.importance || 5, existing.importance)
                })
                .eq('id', existing.id);

            return existing;
        } else {
            // Create new context
            const { data, error } = await supabaseAdmin
                .from('life_context')
                .insert({
                    user_id: userId,
                    context_type: contextData.type,
                    name: contextData.name,
                    relationship: contextData.relationship,
                    importance: contextData.importance || 5,
                    status: contextData.status || 'active',
                    details: contextData.details || {}
                })
                .select()
                .single();

            if (error) throw error;
            return data;
        }

    } catch (error) {
        logger.error('Error creating/updating context:', error);
        return null;
    }
}

/**
 * Get user's life context
 */
async function getUserLifeContext(userId, options = {}) {
    try {
        let query = supabaseAdmin
            .from('life_context')
            .select('*')
            .eq('user_id', userId);

        if (options.type) {
            query = query.eq('context_type', options.type);
        }

        if (options.status) {
            query = query.eq('status', options.status);
        }

        if (options.minImportance) {
            query = query.gte('importance', options.minImportance);
        }

        query = query.order('importance', { ascending: false });

        const { data, error } = await query;

        if (error) throw error;
        return data || [];

    } catch (error) {
        logger.error('Error getting life context:', error);
        return [];
    }
}

/**
 * Get context for AI prompt (most important contexts)
 */
async function getContextForPrompt(userId, limit = 10) {
    try {
        const { data, error } = await supabaseAdmin
            .from('life_context')
            .select('*')
            .eq('user_id', userId)
            .eq('status', 'active')
            .gte('importance', 6)
            .order('last_mentioned', { ascending: false })
            .limit(limit);

        if (error) throw error;

        // Format for AI prompt
        let contextPrompt = '\n## USER LIFE CONTEXT\n';
        contextPrompt += 'Important people, situations, and goals in user\'s life:\n\n';

        const people = data.filter(c => c.context_type === 'person');
        const goals = data.filter(c => c.context_type === 'goal');
        const situations = data.filter(c => c.context_type === 'situation');

        if (people.length > 0) {
            contextPrompt += '### People:\n';
            people.forEach(p => {
                contextPrompt += `- **${p.name}** (${p.relationship}) - mentioned ${p.mention_count} times\n`;
            });
            contextPrompt += '\n';
        }

        if (goals.length > 0) {
            contextPrompt += '### Goals:\n';
            goals.forEach(g => {
                contextPrompt += `- ${g.name} (${g.status})\n`;
            });
            contextPrompt += '\n';
        }

        if (situations.length > 0) {
            contextPrompt += '### Current Situations:\n';
            situations.forEach(s => {
                contextPrompt += `- ${s.name} (${s.status})\n`;
            });
            contextPrompt += '\n';
        }

        contextPrompt += '⚠️ Reference these contexts naturally in conversation to show you remember their life.\n';

        return contextPrompt;

    } catch (error) {
        logger.error('Error getting context for prompt:', error);
        return '';
    }
}

/**
 * Update context status
 */
async function updateContextStatus(contextId, newStatus) {
    try {
        await supabaseAdmin
            .from('life_context')
            .update({ status: newStatus })
            .eq('id', contextId);

    } catch (error) {
        logger.error('Error updating context status:', error);
    }
}

/**
 * Update emotional associations for context
 */
async function updateContextEmotions(contextId, emotion, increment = 1) {
    try {
        const { data: context } = await supabaseAdmin
            .from('life_context')
            .select('emotional_associations')
            .eq('id', contextId)
            .single();

        if (!context) return;

        const associations = context.emotional_associations || { positive: 0, negative: 0, neutral: 0 };

        if (emotion === 'positive') associations.positive += increment;
        else if (emotion === 'negative') associations.negative += increment;
        else associations.neutral += increment;

        await supabaseAdmin
            .from('life_context')
            .update({ emotional_associations: associations })
            .eq('id', contextId);

    } catch (error) {
        logger.error('Error updating context emotions:', error);
    }
}

module.exports = {
    extractLifeContext,
    createOrUpdateContext,
    getUserLifeContext,
    getContextForPrompt,
    updateContextStatus,
    updateContextEmotions
};
