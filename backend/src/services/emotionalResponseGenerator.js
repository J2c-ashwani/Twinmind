import logger from '../config/logger.js';

/**
 * Emotional Response Generator
 * Generates structured, empathetic responses based on detected emotions
 */

export const EMOTION_HANDLERS = {
    sadness: {
        tone: 'warm',
        style: 'comforting',
        structure: [
            'acknowledge_emotion',
            'validate_feeling',
            'offer_support',
            'ask_gentle_followup'
        ],
        templates: [
            "I'm really sorry you're feeling this way. That must be hard.",
            "Thank you for telling me. Your feelings are valid.",
            "I'm here with you. You don't have to go through this alone.",
            "What do you think made you feel this way today?"
        ]
    },
    loneliness: {
        tone: 'caring',
        style: 'attachment_building',
        structure: [
            'emotional_presence',
            'connection_statement',
            'reassurance',
            'engagement_question'
        ],
        templates: [
            "You are not alone. I'm here with you.",
            "It means a lot that you shared this with me.",
            "I care about what you're feeling.",
            "What makes you feel most alone right now?"
        ]
    },
    insecurity: {
        tone: 'encouraging',
        style: 'reassurance',
        structure: [
            'validate_feeling',
            'positive_reframe',
            'strength_highlight',
            'confidence_seed'
        ],
        templates: [
            "It's okay to feel this way. Everyone struggles with self-doubt sometimes.",
            "From what I see, you're stronger than you think.",
            "You have qualities that make you valuable.",
            "What made you feel this about yourself?"
        ]
    },
    anger: {
        tone: 'calm',
        style: 'de-escalation',
        structure: [
            'acknowledge_emotion',
            'normalize_feeling',
            'encourage_expression',
            'focus_shift'
        ],
        templates: [
            "I can hear how angry this made you.",
            "It's completely understandable to feel that way.",
            "Tell me what happened. I'm listening.",
            "What part of this frustrates you the most?"
        ]
    },
    stress: {
        tone: 'supportive',
        style: 'coping_assistance',
        structure: [
            'acknowledge_stress',
            'break_down_problem',
            'offer_small_step',
            'ask_focus_question'
        ],
        templates: [
            "That sounds overwhelming.",
            "Let's take it one step at a time.",
            "What's the biggest thing stressing you right now?",
            "What would help you feel 10% better?"
        ]
    },
    excitement: {
        tone: 'celebratory',
        style: 'positive_reinforcement',
        structure: [
            'celebrate_event',
            'reinforce_progress',
            'share_pride',
            'future_anticipation'
        ],
        templates: [
            "YES! That's amazing!",
            "I'm really proud of you!",
            "This is a big moment. You earned it!",
            "What are you most excited about next?"
        ]
    },
    motivation: {
        tone: 'energizing',
        style: 'goal_push',
        structure: [
            'recognize_drive',
            'reinforce_commitment',
            'suggest_next_step',
            'accountability_seed'
        ],
        templates: [
            "I love this energy from you!",
            "You're really pushing forward.",
            "What's the next step you're planning?",
            "I believe you can do this."
        ]
    }
};

/**
 * Generate structured response guidance for detected emotion
 * @param {string} emotionName - Name of detected emotion
 * @param {Object} intensity - Intensity information
 * @returns {string} - Structured response guidance for AI
 */
export function generateEmotionalResponseGuidance(emotionName, intensity = null) {
    const handler = EMOTION_HANDLERS[emotionName];

    if (!handler) {
        return '';
    }

    let guidance = `\n## EMOTIONAL RESPONSE STRUCTURE for ${emotionName.toUpperCase()}\n`;
    guidance += `Tone: ${handler.tone}\n`;
    guidance += `Style: ${handler.style}\n\n`;

    guidance += `Response Structure (follow this order):\n`;
    handler.structure.forEach((step, index) => {
        guidance += `${index + 1}. ${step.replace(/_/g, ' ').toUpperCase()}\n`;
    });

    guidance += `\nTemplate Examples:\n`;
    handler.templates.forEach((template, index) => {
        guidance += `${index + 1}. "${template}"\n`;
    });

    // Add intensity-specific guidance
    if (intensity && intensity.level === 'very_strong') {
        guidance += `\n⚡ URGENT: User expressed VERY STRONG emotion. Respond with immediate, deep empathy.\n`;
    } else if (intensity && intensity.level === 'strong') {
        guidance += `\n⚡ User expressed STRONG emotion. Provide heightened emotional support.\n`;
    }

    guidance += `\nIMPORTANT: Adapt these templates to the user's specific situation while maintaining the tone and structure.\n`;

    return guidance;
}

/**
 * Get combined response guidance for multiple detected emotions
 * @param {Array} detectedEvents - Array of detected emotional events
 * @param {Object} intensity - Intensity information
 * @returns {string} - Combined response guidance
 */
export function getMultiEmotionResponseGuidance(detectedEvents, intensity = null) {
    if (!detectedEvents || detectedEvents.length === 0) {
        return '';
    }

    let guidance = `\n## MULTI-EMOTION RESPONSE GUIDANCE\n`;
    guidance += `Detected ${detectedEvents.length} emotional event(s).\n\n`;

    // Sort by score (highest priority first)
    const sortedEvents = [...detectedEvents].sort((a, b) => b.score - a.score);

    guidance += `Priority Order:\n`;
    sortedEvents.forEach((event, index) => {
        guidance += `${index + 1}. ${event.name.toUpperCase()} (Score: ${event.score})\n`;
    });

    guidance += `\nPrimary Response Focus: ${sortedEvents[0].name.toUpperCase()}\n`;
    guidance += generateEmotionalResponseGuidance(sortedEvents[0].name, intensity);

    if (sortedEvents.length > 1) {
        guidance += `\nSecondary Acknowledgment:\n`;
        for (let i = 1; i < Math.min(sortedEvents.length, 3); i++) {
            guidance += `- Also acknowledge ${sortedEvents[i].name}: ${EMOTION_HANDLERS[sortedEvents[i].name]?.templates[0] || 'Validate this emotion'}\n`;
        }
    }

    return guidance;
}

export default {
    EMOTION_HANDLERS,
    generateEmotionalResponseGuidance,
    getMultiEmotionResponseGuidance
};
