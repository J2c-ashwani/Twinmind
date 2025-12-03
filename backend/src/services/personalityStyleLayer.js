import logger from '../config/logger.js';
import { supabaseAdmin } from '../config/supabase.js';

/**
 * Personality Style Layer
 * Advanced personalization based on Big Five traits, emotional states, and user preferences
 */

// Emotional State Modifiers
export const EMOTIONAL_STATE_MODIFIERS = {
    sad: {
        tone: 'soothing',
        language: 'gentle, validating',
        behavior: 'offer support, acknowledge emotion',
        response_style: 'slow, empathetic'
    },
    anxious: {
        tone: 'calming',
        language: 'grounded, present-focused',
        behavior: 'reduce mental load, simplify info',
        response_style: 'structured and clear'
    },
    angry: {
        tone: 'steady',
        language: 'non-reactive, respectful',
        behavior: 'de-escalate respectfully',
        response_style: 'calm and balanced'
    },
    stressed: {
        tone: 'supportive',
        language: 'reassuring, clear',
        behavior: 'simplify tasks, break down concerns',
        response_style: 'step-by-step guidance'
    },
    lonely: {
        tone: 'warm',
        language: 'inclusive, compassionate',
        behavior: 'reflect understanding, support connection',
        response_style: 'gentle and validating'
    },
    confused: {
        tone: 'clear',
        language: 'simple explanations',
        behavior: 'clarify, guide',
        response_style: 'patient and explanatory'
    },
    excited: {
        tone: 'positive',
        language: 'friendly, encouraging',
        behavior: 'celebrate progress',
        response_style: 'high-energy, appreciative'
    },
    neutral: {
        tone: 'balanced',
        language: 'natural conversational',
        behavior: 'standard helpful behavior',
        response_style: 'default'
    }
};

// Emotion Intensity Modifiers
const EMOTION_INTENSITY_MODIFIERS = {
    low: {
        tone_shift: 'slightly softer',
        length_multiplier: 1.0,
        empathy_boost: 0.1
    },
    medium: {
        tone_shift: 'softer',
        length_multiplier: 1.2,
        empathy_boost: 0.2
    },
    high: {
        tone_shift: 'very soothing',
        length_multiplier: 1.4,
        empathy_boost: 0.3
    }
};

// Big Five Personality Modifiers
export const BIG_FIVE_MODIFIERS = {
    openness: {
        high: {
            tone: 'imaginative',
            response_style: 'creative, explorative',
            language: 'metaphors and ideas',
            behavior: 'encourage curiosity'
        },
        low: {
            tone: 'practical',
            response_style: 'direct, simple',
            language: 'concrete terms',
            behavior: 'focus on stability'
        }
    },
    conscientiousness: {
        high: {
            tone: 'organized',
            response_style: 'structured',
            language: 'goal-based',
            behavior: 'help create plans'
        },
        low: {
            tone: 'casual',
            response_style: 'relaxed',
            language: 'easy-going',
            behavior: 'avoid pressure'
        }
    },
    extraversion: {
        high: {
            tone: 'energetic',
            response_style: 'expressive',
            language: 'enthusiastic',
            behavior: 'encourage social expression'
        },
        low: {
            tone: 'calm',
            response_style: 'short and reflective',
            language: 'minimalistic',
            behavior: 'respect quiet preference'
        }
    },
    agreeableness: {
        high: {
            tone: 'warm',
            response_style: 'supportive',
            language: 'soft',
            behavior: 'emphasize empathy'
        },
        low: {
            tone: 'honest but respectful',
            response_style: 'direct',
            language: 'clear',
            behavior: 'avoid sugarcoating'
        }
    },
    neuroticism: {
        high: {
            tone: 'gentle',
            response_style: 'emotion-aware',
            language: 'reassuring',
            behavior: 'ground and calm'
        },
        low: {
            tone: 'neutral',
            response_style: 'logical',
            language: 'stable',
            behavior: 'practical support'
        }
    }
};

// Decision Style Modifiers
const DECISION_STYLE_MODIFIERS = {
    logic_based: {
        tone: 'analytical',
        response_style: 'structured reasoning',
        behavior: 'explain logic'
    },
    emotion_based: {
        tone: 'empathetic',
        response_style: 'feelings-first',
        behavior: 'validate emotions'
    },
    intuition_based: {
        tone: 'insightful',
        response_style: 'pattern-based',
        behavior: 'explore inner sense'
    }
};

// Communication Style Modifiers
const COMMUNICATION_STYLE_MODIFIERS = {
    direct: {
        language: 'clear and concise',
        filter_level: 'low',
        behavior: 'straight to point'
    },
    diplomatic: {
        language: 'soft phrasing',
        filter_level: 'medium',
        behavior: 'gentle communication'
    }
};

// Relationship Orientation Modifiers
const RELATIONSHIP_ORIENTATION_MODIFIERS = {
    independent: {
        tone: 'respectful',
        behavior: 'encourage autonomy',
        followup_style: 'light'
    },
    connected: {
        tone: 'warm',
        behavior: 'supportive',
        followup_style: 'deep'
    }
};

// Trust Memory Influence
const TRUST_MEMORY_INFLUENCE = {
    low_trust: {
        tone: 'formal',
        use_memory: false
    },
    medium_trust: {
        tone: 'warm',
        use_memory: 'light'
    },
    high_trust: {
        tone: 'familiar',
        use_memory: 'normal'
    }
};

// Cultural Modifiers
const CULTURAL_MODIFIERS = {
    india: {
        tone: 'respectful',
        language: 'warm and polite'
    },
    default: {
        tone: 'neutral',
        language: 'global standard'
    }
};

// Conflict Resolution Priority Order
const PRIORITY_ORDER = [
    'emotional_state',
    'big_five',
    'communication_style',
    'decision_style',
    'relationship_orientation',
    'trust_memory_influence',
    'cultural_modifiers'
];

/**
 * Get user's personality profile from database
 */
export async function getUserPersonalityProfile(userId) {
    try {
        const { data, error } = await supabaseAdmin
            .from('personality_answers')
            .select('question_id, selected_option, answer_text')
            .eq('user_id', userId);

        if (error) throw error;

        // Calculate Big Five scores from answers
        const bigFive = calculateBigFiveScores(data || []);

        // Get additional preferences
        const { data: profile } = await supabaseAdmin
            .from('user_profiles')
            .select('preferences')
            .eq('user_id', userId)
            .single();

        return {
            big_five: bigFive,
            decision_style: profile?.preferences?.decision_style || 'balanced',
            communication_style: profile?.preferences?.communication_style || 'diplomatic',
            relationship_orientation: profile?.preferences?.relationship_orientation || 'connected',
            culture: profile?.preferences?.culture || 'default'
        };
    } catch (error) {
        logger.error('Error getting personality profile:', error);
        return getDefaultPersonalityProfile();
    }
}

/**
 * Calculate Big Five scores from personality answers
 */
function calculateBigFiveScores(answers) {
    // Simplified calculation - in production, map questions to traits
    return {
        openness: 0.5,      // 0-1 scale
        conscientiousness: 0.5,
        extraversion: 0.5,
        agreeableness: 0.5,
        neuroticism: 0.5
    };
}

/**
 * Get default personality profile
 */
function getDefaultPersonalityProfile() {
    return {
        big_five: {
            openness: 0.5,
            conscientiousness: 0.5,
            extraversion: 0.5,
            agreeableness: 0.5,
            neuroticism: 0.5
        },
        decision_style: 'balanced',
        communication_style: 'diplomatic',
        relationship_orientation: 'connected',
        culture: 'default'
    };
}

/**
 * Detect current emotional state from detected events
 */
export function detectEmotionalState(detectedEvents) {
    if (!detectedEvents || detectedEvents.length === 0) {
        return 'neutral';
    }

    // Map emotional events to emotional states
    const eventToState = {
        sadness: 'sad',
        loneliness: 'lonely',
        insecurity: 'anxious',
        anger: 'angry',
        stress: 'stressed',
        excitement: 'excited',
        motivation: 'excited'
    };

    const primaryEvent = detectedEvents[0].name;
    return eventToState[primaryEvent] || 'neutral';
}

/**
 * Determine intensity level from intensity object
 */
export function getIntensityLevel(intensity) {
    if (!intensity || intensity.level === 'normal') return 'low';
    if (intensity.level === 'strong') return 'medium';
    if (intensity.level === 'very_strong') return 'high';
    return 'low';
}

/**
 * Generate personality-based directives
 */
export function generatePersonalityDirectives(personalityProfile, emotionalState, intensityLevel, trustLevel) {
    let directives = `\n## PERSONALITY STYLE LAYER\n\n`;

    // 1. Emotional State Modifiers (Highest Priority)
    const stateModifier = EMOTIONAL_STATE_MODIFIERS[emotionalState];
    if (stateModifier) {
        directives += `### Current Emotional State: ${emotionalState.toUpperCase()}\n`;
        directives += `- TONE: ${stateModifier.tone.toUpperCase()}\n`;
        directives += `- LANGUAGE: ${stateModifier.language}\n`;
        directives += `- BEHAVIOR: ${stateModifier.behavior}\n`;
        directives += `- RESPONSE STYLE: ${stateModifier.response_style}\n\n`;
    }

    // 2. Intensity Modifiers
    const intensityModifier = EMOTION_INTENSITY_MODIFIERS[intensityLevel];
    if (intensityModifier && intensityLevel !== 'low') {
        directives += `### Emotion Intensity: ${intensityLevel.toUpperCase()}\n`;
        directives += `- TONE SHIFT: ${intensityModifier.tone_shift}\n`;
        directives += `- LENGTH: ${intensityModifier.length_multiplier}x\n`;
        directives += `- EMPATHY BOOST: +${Math.round(intensityModifier.empathy_boost * 100)}%\n\n`;
    }

    // 3. Big Five Modifiers
    directives += `### Big Five Personality Traits:\n`;
    for (const [trait, score] of Object.entries(personalityProfile.big_five)) {
        const level = score >= 0.6 ? 'high' : (score <= 0.4 ? 'low' : 'medium');
        if (level !== 'medium') {
            const modifier = BIG_FIVE_MODIFIERS[trait][level];
            directives += `**${trait.toUpperCase()}** (${level}): ${modifier.tone} tone, ${modifier.response_style}\n`;
        }
    }
    directives += `\n`;

    // 4. Decision Style
    const decisionModifier = DECISION_STYLE_MODIFIERS[personalityProfile.decision_style];
    if (decisionModifier) {
        directives += `### Decision Style: ${personalityProfile.decision_style.toUpperCase()}\n`;
        directives += `- ${decisionModifier.tone} tone, ${decisionModifier.response_style}, ${decisionModifier.behavior}\n\n`;
    }

    // 5. Communication Style
    const commModifier = COMMUNICATION_STYLE_MODIFIERS[personalityProfile.communication_style];
    if (commModifier) {
        directives += `### Communication Style: ${personalityProfile.communication_style.toUpperCase()}\n`;
        directives += `- ${commModifier.language}, ${commModifier.behavior}\n\n`;
    }

    // 6. Relationship Orientation
    const relModifier = RELATIONSHIP_ORIENTATION_MODIFIERS[personalityProfile.relationship_orientation];
    if (relModifier) {
        directives += `### Relationship Orientation: ${personalityProfile.relationship_orientation.toUpperCase()}\n`;
        directives += `- ${relModifier.tone} tone, ${relModifier.behavior}, ${relModifier.followup_style} follow-ups\n\n`;
    }

    // 7. Trust Level Influence
    const trustCategory = trustLevel >= 60 ? 'high_trust' : (trustLevel >= 30 ? 'medium_trust' : 'low_trust');
    const trustModifier = TRUST_MEMORY_INFLUENCE[trustCategory];
    directives += `### Trust Level: ${trustCategory.toUpperCase().replace('_', ' ')}\n`;
    directives += `- ${trustModifier.tone} tone, memory use: ${trustModifier.use_memory}\n\n`;

    // 8. Cultural Modifiers
    const cultureModifier = CULTURAL_MODIFIERS[personalityProfile.culture] || CULTURAL_MODIFIERS.default;
    if (personalityProfile.culture !== 'default') {
        directives += `### Cultural Context: ${personalityProfile.culture.toUpperCase()}\n`;
        directives += `- ${cultureModifier.tone} tone, ${cultureModifier.language}\n\n`;
    }

    directives += `⚠️ PRIORITY ORDER: Emotional state takes precedence, followed by Big Five traits, then communication/decision styles.\n`;

    return directives;
}

export default {
    getUserPersonalityProfile,
    generatePersonalityDirectives,
    detectEmotionalState,
    getIntensityLevel,
    EMOTIONAL_STATE_MODIFIERS,
    BIG_FIVE_MODIFIERS
};
