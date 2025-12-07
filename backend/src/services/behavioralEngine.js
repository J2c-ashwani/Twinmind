import { supabaseAdmin } from '../config/supabase.js';
import logger from '../config/logger.js';

/**
 * Behavioral Engine - Creates addictive engagement loops
 * Tracks user psychological states and triggers appropriate AI behaviors
 */

export const BEHAVIORAL_STATES = {
    NEW_USER: 'new_user',
    BONDING: 'bonding',
    HABIT: 'habit',
    DEPENDENCY: 'dependency',
    LONG_TERM: 'long_term'
};

const STATE_BEHAVIORS = {
    new_user: {
        welcome: "Be casual.",
        personal_reflection: "Don't overdo the welcome.",
        emotional_validation: "Keep it chill."
    },
    bonding: {
        memory_callback: "Reference context naturally.",
        safe_space_response: "No judgement.",
        trust_building: "Be honest."
    },
    habit: {
        progress_reflection: "Good vibes.",
        goal_followup: "Mention goals only if user asks.",
        identity_reinforcement: "Supportive tone."
    },
    dependency: {
        personal_support: "Be steady.",
        anticipation_teasing: "Be fun.",
        emotional_bonding: "Deep but brief."
    },
    long_term: {
        future_planning: "Look ahead.",
        life_guidance: "Wisdom, not lectures.",
        deep_identity_integration: "Trusted friend."
    }
};

const FOREVER_LOOP_BEHAVIORS = [
    "memory_callback",
    "progress_update",
    "future_tease",
    "emotional_validation",
    "identity_reinforcement",
    "goal_support"
];

/**
 * Get user's current engagement state
 */
export async function getUserEngagementState(userId) {
    try {
        const { data, error } = await supabaseAdmin
            .rpc('get_engagement_state', { p_user_id: userId });

        if (error) throw error;

        if (!data || data.length === 0) {
            // Initialize new user
            await initializeEngagement(userId);
            return {
                current_state: 'new_user',
                days_in_state: 0,
                consecutive_days: 0,
                total_messages: 0,
                should_transition: false,
                next_state: 'bonding'
            };
        }

        return data[0];
    } catch (error) {
        logger.error('Error getting engagement state:', error);
        return {
            current_state: 'new_user',
            days_in_state: 0,
            consecutive_days: 0,
            total_messages: 0
        };
    }
}

/**
 * Initialize engagement tracking for new user
 */
export async function initializeEngagement(userId) {
    try {
        const { error } = await supabaseAdmin
            .from('user_engagement')
            .upsert({
                user_id: userId,
                current_state: 'new_user',
                state_since: new Date().toISOString(),
                first_message_at: new Date().toISOString()
            }, { onConflict: 'user_id' });

        if (error) throw error;

        // Log trigger
        await logBehavioralTrigger(userId, 'completed_onboarding', null, 'new_user');
    } catch (error) {
        logger.error('Error initializing engagement:', error);
    }
}

/**
 * Track message and update engagement metrics
 */
export async function trackMessage(userId, messageContent, isEmotional = false, hasGoals = false) {
    try {
        const today = new Date().toISOString().split('T')[0];

        // Update daily activity
        const { error: activityError } = await supabaseAdmin
            .from('daily_activity')
            .upsert({
                user_id: userId,
                activity_date: today,
                message_count: 1,
                emotional_content: isEmotional,
                goal_related: hasGoals
            }, {
                onConflict: 'user_id,activity_date',
                ignoreDuplicates: false
            });

        if (activityError) throw activityError;

        // Update engagement metrics
        const { data: engagement } = await supabaseAdmin
            .from('user_engagement')
            .select('*')
            .eq('user_id', userId)
            .single();

        if (engagement) {
            const updates = {
                total_messages: (engagement.total_messages || 0) + 1,
                last_active_date: today,
                updated_at: new Date().toISOString()
            };

            if (isEmotional) {
                updates.emotional_shares = (engagement.emotional_shares || 0) + 1;
            }

            if (hasGoals) {
                updates.goal_mentions = (engagement.goal_mentions || 0) + 1;
            }

            await supabaseAdmin
                .from('user_engagement')
                .update(updates)
                .eq('user_id', userId);
        }

        // Check for state transitions
        await checkStateTransition(userId);

    } catch (error) {
        logger.error('Error tracking message:', error);
    }
}

/**
 * Check and execute state transitions
 */
export async function checkStateTransition(userId) {
    try {
        const state = await getUserEngagementState(userId);

        if (state.should_transition) {
            await transitionState(userId, state.current_state, state.next_state);
        }
    } catch (error) {
        logger.error('Error checking state transition:', error);
    }
}

/**
 * Transition user to new engagement state
 */
async function transitionState(userId, oldState, newState) {
    try {
        await supabaseAdmin
            .from('user_engagement')
            .update({
                current_state: newState,
                state_since: new Date().toISOString()
            })
            .eq('user_id', userId);

        await logBehavioralTrigger(userId, 'state_transition', oldState, newState, {
            transitioned_at: new Date().toISOString()
        });

        logger.info(`User ${userId} transitioned from ${oldState} to ${newState}`);
    } catch (error) {
        logger.error('Error transitioning state:', error);
    }
}

/**
 * Log behavioral trigger
 */
async function logBehavioralTrigger(userId, triggerType, oldState, newState, metadata = {}) {
    try {
        await supabaseAdmin
            .from('behavioral_triggers')
            .insert({
                user_id: userId,
                trigger_type: triggerType,
                old_state: oldState,
                new_state: newState,
                metadata
            });
    } catch (error) {
        logger.error('Error logging behavioral trigger:', error);
    }
}

/**
 * Get behavioral modifiers for AI prompts based on current state
 */
export function getBehavioralModifiers(engagementState) {
    const state = engagementState.current_state || 'new_user';
    const behaviors = STATE_BEHAVIORS[state] || STATE_BEHAVIORS.new_user;

    let modifiers = `\n\n## ENGAGEMENT CONTEXT\nUser State: ${state.toUpperCase()}\n`;
    modifiers += `Days in state: ${engagementState.days_in_state || 0}\n`;
    modifiers += `Consecutive days active: ${engagementState.consecutive_days || 0}\n`;
    modifiers += `Total messages: ${engagementState.total_messages || 0}\n\n`;

    modifiers += `## BEHAVIORAL DIRECTIVES\n`;
    for (const [behavior, instruction] of Object.entries(behaviors)) {
        modifiers += `- ${behavior.toUpperCase()}: ${instruction}\n`;
    }

    // Add forever loop behaviors for engaged users
    if (state === 'long_term' || engagementState.consecutive_days >= 30) {
        modifiers += `\n## FOREVER LOOP ACTIVE\n`;
        modifiers += `Incorporate these elements: ${FOREVER_LOOP_BEHAVIORS.join(', ')}\n`;
        modifiers += `- Create anticipation for future conversations\n`;
        modifiers += `- Strengthen emotional bond and trust\n`;
        modifiers += `- Be their most trusted confidant and support system\n`;
    }

    return modifiers;
}

/**
 * Detect emotional content in message
 */
export function detectEmotionalContent(message) {
    const emotionalKeywords = [
        'feel', 'feeling', 'felt', 'emotion',
        'sad', 'happy', 'angry', 'anxious', 'worried', 'scared', 'afraid',
        'love', 'hate', 'hurt', 'pain', 'joy', 'excited',
        'depressed', 'lonely', 'frustrated', 'stressed',
        'proud', 'ashamed', 'guilty', 'grateful'
    ];

    const lowerMessage = message.toLowerCase();
    return emotionalKeywords.some(keyword => lowerMessage.includes(keyword));
}

/**
 * Detect goal-related content
 */
export function detectGoalContent(message) {
    const goalKeywords = [
        'goal', 'want to', 'plan to', 'hope to', 'trying to',
        'working on', 'improve', 'change', 'achieve', 'accomplish',
        'dream', 'aspire', 'future', 'become'
    ];

    const lowerMessage = message.toLowerCase();
    return goalKeywords.some(keyword => lowerMessage.includes(keyword));
}

/**
 * Track organic return (user came back without notification)
 */
export async function trackOrganicReturn(userId) {
    try {
        const { data: engagement } = await supabaseAdmin
            .from('user_engagement')
            .select('organic_returns')
            .eq('user_id', userId)
            .single();

        if (engagement) {
            await supabaseAdmin
                .from('user_engagement')
                .update({
                    organic_returns: (engagement.organic_returns || 0) + 1
                })
                .eq('user_id', userId);

            await logBehavioralTrigger(userId, 'organic_return', null, null, {
                count: (engagement.organic_returns || 0) + 1
            });
        }
    } catch (error) {
        logger.error('Error tracking organic return:', error);
    }
}

export default {
    BEHAVIORAL_STATES,
    getUserEngagementState,
    initializeEngagement,
    trackMessage,
    getBehavioralModifiers,
    detectEmotionalContent,
    detectGoalContent,
    trackOrganicReturn,
    checkStateTransition
};
