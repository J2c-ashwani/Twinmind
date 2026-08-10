import logger from '../config/logger.js';
import { supabaseAdmin } from '../config/supabase.js';

/**
 * Personality Style Layer
 * Pure-function transformation engine mapping Big Five traits, core values,
 * emotional states, and user preferences into delimited system directives.
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
            behavior: 'encourage curiosity and conceptual connections'
        },
        low: {
            tone: 'practical',
            response_style: 'direct, simple',
            language: 'concrete terms',
            behavior: 'focus on grounded, proven steps'
        }
    },
    conscientiousness: {
        high: {
            tone: 'organized',
            response_style: 'structured',
            language: 'actionable, clear sequencing',
            behavior: 'help organize ideas into logical steps when useful'
        },
        low: {
            tone: 'casual',
            response_style: 'relaxed',
            language: 'easy-going',
            behavior: 'keep suggestions light and pressure-free'
        }
    },
    extraversion: {
        high: {
            tone: 'energetic',
            response_style: 'expressive',
            language: 'enthusiastic',
            behavior: 'encourage social expression and high engagement'
        },
        low: {
            tone: 'calm',
            response_style: 'short and reflective',
            language: 'minimalistic',
            behavior: 'respect quiet, focused conversation'
        }
    },
    agreeableness: {
        high: {
            tone: 'warm',
            response_style: 'supportive',
            language: 'soft',
            behavior: 'emphasize empathy and collaborative framing'
        },
        low: {
            tone: 'honest but respectful',
            response_style: 'direct',
            language: 'clear',
            behavior: 'straightforward feedback without unnecessary fluff'
        }
    },
    neuroticism: {
        high: {
            tone: 'gentle',
            response_style: 'emotion-aware',
            language: 'reassuring',
            behavior: 'provide steady, grounding support'
        },
        low: {
            tone: 'neutral',
            response_style: 'logical',
            language: 'stable',
            behavior: 'pragmatic, balanced perspective'
        }
    }
};

/**
 * ============================================================
 * STEP 0 + 2: PURE FUNCTION PROFILE NORMALIZER
 * Converts real production personality_json (or null/malformed)
 * into a safe, normalized profile structure.
 * ============================================================
 */
export function normalizePersonalityProfile(rawJson) {
    if (!rawJson || typeof rawJson !== 'object') {
        return getDefaultPersonalityProfile();
    }

    const bigFive = rawJson.big_five || {};

    // Helper to clamp values to 0.0 - 1.0 range
    const normalizeScore = (val, defaultVal = 50) => {
        if (typeof val !== 'number' || isNaN(val)) val = defaultVal;
        if (val > 1) val = val / 100; // Handle 1-100 scale to 0-1
        return Math.max(0, Math.min(1, val));
    };

    // Calculate neuroticism from emotional_stability if needed (emotional_stability = 100 - neuroticism)
    let neuroticismVal = bigFive.neuroticism;
    if (neuroticismVal === undefined && bigFive.emotional_stability !== undefined) {
        neuroticismVal = 100 - bigFive.emotional_stability;
    }

    // Extract core values array
    let coreValues = [];
    if (Array.isArray(rawJson.core_values)) {
        coreValues = rawJson.core_values.filter(v => typeof v === 'string');
    }

    // Extract communication style directness / tone
    let commDirectness = 'diplomatic';
    if (typeof rawJson.communication_style === 'object' && rawJson.communication_style !== null) {
        commDirectness = rawJson.communication_style.directness || rawJson.communication_style.tone || 'diplomatic';
    } else if (typeof rawJson.communication_style === 'string') {
        commDirectness = rawJson.communication_style;
    }

    // Extract decision making style
    let decStyle = 'balanced';
    if (typeof rawJson.decision_making === 'object' && rawJson.decision_making !== null) {
        decStyle = rawJson.decision_making.style || 'balanced';
    } else if (typeof rawJson.decision_making === 'string') {
        decStyle = rawJson.decision_making;
    }

    return {
        big_five: {
            openness: normalizeScore(bigFive.openness, 50),
            conscientiousness: normalizeScore(bigFive.conscientiousness, 50),
            extraversion: normalizeScore(bigFive.extraversion, 50),
            agreeableness: normalizeScore(bigFive.agreeableness, 50),
            neuroticism: normalizeScore(neuroticismVal, 50)
        },
        coreValues,
        decisionStyle: decStyle,
        communicationStyle: commDirectness,
        relationshipOrientation: 'connected',
        culture: 'default'
    };
}

/**
 * Get default baseline personality profile
 */
export function getDefaultPersonalityProfile() {
    return {
        big_five: {
            openness: 0.5,
            conscientiousness: 0.5,
            extraversion: 0.5,
            agreeableness: 0.5,
            neuroticism: 0.5
        },
        coreValues: [],
        decisionStyle: 'balanced',
        communicationStyle: 'diplomatic',
        relationshipOrientation: 'connected',
        culture: 'default'
    };
}

/**
 * ============================================================
 * DATA ACCESS HELPER
 * Fetches user's personality_json from database
 * ============================================================
 */
export async function getUserPersonalityProfile(userId) {
    try {
        const { data, error } = await supabaseAdmin
            .from('personality_profiles')
            .select('personality_json')
            .eq('user_id', userId)
            .single();

        if (error && error.code !== 'PGRST116') {
            logger.warn(`Notice fetching personality profile for ${userId}: ${error.message}`);
        }

        return normalizePersonalityProfile(data?.personality_json);
    } catch (error) {
        logger.error('Error getting personality profile:', error);
        return getDefaultPersonalityProfile();
    }
}

/**
 * Detect current emotional state from detected events
 */
export function detectEmotionalState(detectedEvents) {
    if (!detectedEvents || detectedEvents.length === 0) {
        return 'neutral';
    }

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
 * ============================================================
 * 5-TIER PRIORITY PROMPT GENERATOR
 * Pure function: Receives normalized profile and returns XML-delimited directives.
 * ============================================================
 */
export function generatePersonalityDirectives(personalityProfile, emotionalState = 'neutral', intensityLevel = 'low', trustLevel = 50) {
    // Feature Flag Check
    if (process.env.PERSONALITY_STYLE_LAYER_ENABLED === 'false') {
        return '';
    }

    const profile = personalityProfile || getDefaultPersonalityProfile();

    let directives = `\n<user_personality_profile>\n`;
    directives += `NOTICE TO MODEL: The following profile describes the user's personality tendencies, core values, and style preferences.\n`;
    directives += `5-TIER HIERARCHY RULES:\n`;
    directives += `1. System Safety Requirements (ALWAYS HIGHEST PRIORITY)\n`;
    directives += `2. Current Explicit User Request (Directives yield to what user asks RIGHT NOW)\n`;
    directives += `3. Current Emotional State (De-escalation and emotional support)\n`;
    directives += `4. Stable Personality Preferences (Tone, structure, framing context below)\n`;
    directives += `5. Default Conversational Baseline\n\n`;

    // 1. Emotional State Modifiers
    const stateModifier = EMOTIONAL_STATE_MODIFIERS[emotionalState];
    if (stateModifier && emotionalState !== 'neutral') {
        directives += `EMOTIONAL STATE (${emotionalState.toUpperCase()}):\n`;
        directives += `- Tone: ${stateModifier.tone}\n`;
        directives += `- Behavior: ${stateModifier.behavior}\n\n`;
    }

    // 2. Graded Big Five Signals (Using continuous strength thresholding: High >= 0.60, Low <= 0.40)
    const activeTraits = [];
    for (const [trait, score] of Object.entries(profile.big_five)) {
        if (score >= 0.60) {
            const mod = BIG_FIVE_MODIFIERS[trait]?.high;
            if (mod) activeTraits.push(`- High ${trait.toUpperCase()}: ${mod.behavior} (${mod.response_style})`);
        } else if (score <= 0.40) {
            const mod = BIG_FIVE_MODIFIERS[trait]?.low;
            if (mod) activeTraits.push(`- Low ${trait.toUpperCase()}: ${mod.behavior} (${mod.response_style})`);
        }
    }

    if (activeTraits.length > 0) {
        directives += `TRAIT SIGNALS:\n${activeTraits.join('\n')}\n\n`;
    }

    // 3. Multi-Select Core Values Context
    if (Array.isArray(profile.coreValues) && profile.coreValues.length > 0) {
        directives += `USER CORE VALUES:\n`;
        profile.coreValues.forEach(val => {
            directives += `- ${val.trim()}\n`;
        });
        directives += `(Align advice and framing with these values when applicable)\n\n`;
    }

    // 4. Communication & Decision Style Context
    directives += `COMMUNICATION PREFERENCES:\n`;
    directives += `- Decision Style: ${profile.decisionStyle}\n`;
    directives += `- Style Tendency: ${profile.communicationStyle}\n`;
    directives += `</user_personality_profile>\n`;

    return directives;
}

export default {
    getUserPersonalityProfile,
    normalizePersonalityProfile,
    getDefaultPersonalityProfile,
    generatePersonalityDirectives,
    detectEmotionalState,
    getIntensityLevel,
    EMOTIONAL_STATE_MODIFIERS,
    BIG_FIVE_MODIFIERS
};
