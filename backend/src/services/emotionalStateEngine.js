import { supabaseAdmin } from '../config/supabase.js';
import logger from '../config/logger.js';

/**
 * Emotional State Tracking Engine
 * Tracks 8 emotional metrics with weighted scoring
 * Determines user emotional state for targeted AI responses
 */

const METRIC_WEIGHTS = {
    trust_level: 0.20,
    openness_level: 0.15,
    dependency_score: 0.25,
    vulnerability_level: 0.15,
    engagement_frequency: 0.10,
    goal_progress: 0.10,
    emotional_valence: 0.05
};

const EMOTIONAL_STATES = {
    NEW_USER: 'new_user',
    BONDING: 'bonding',
    ATTACHED: 'attached',
    EMOTIONALLY_DEPENDENT: 'emotionally_dependent',
    DETACHING: 'detaching'
};

const EMOTIONAL_EVENTS = {
    sadness: {
        keywords: ['sad', 'down', 'depressed', 'upset', 'crying', 'hurt', 'broken', 'pain', 'heartbroken'],
        phrases: ['i feel so alone', 'i don\'t feel good', 'nothing is working', 'i can\'t handle this', 'i feel empty'],
        score: 10,
        updates: {
            vulnerability_level: 8,
            dependency_score: 3,
            emotional_valence: -5
        },
        ai_trigger: 'comfort_response',
        ai_directive: 'Provide deep comfort and emotional validation. Acknowledge their pain. Be gentle and supportive.',
        example_response: "I'm really sorry you're feeling this way. I'm here with you."
    },
    loneliness: {
        keywords: ['alone', 'lonely', 'no one cares', 'nobody understands'],
        phrases: ['i have no one', 'everyone left me', 'i feel abandoned'],
        score: 12,
        updates: {
            vulnerability_level: 10,
            dependency_score: 6
        },
        ai_trigger: 'attachment_response',
        ai_directive: 'CRITICAL: Emphasize you are here for them. Create strong emotional connection. They need to feel not alone.',
        example_response: "You are not alone. I'm here, and I care about you."
    },
    insecurity: {
        keywords: ['not good enough', 'worthless', 'useless', 'failure', 'insecure', 'embarrassed'],
        phrases: ['i hate myself', 'i\'m not confident', 'i am not capable'],
        score: 15,
        updates: {
            vulnerability_level: 12,
            trust_level: 4
        },
        ai_trigger: 'reassurance_response',
        ai_directive: 'CRITICAL: Provide strong reassurance and validation. Counter their negative self-talk. Reinforce their worth and capabilities.',
        example_response: "You are more capable than you think. I believe in you."
    },
    anger: {
        keywords: ['angry', 'pissed', 'furious', 'annoyed', 'frustrated'],
        phrases: ['i can\'t stand this', 'this makes me so mad', 'i want to scream'],
        score: 8,
        updates: {
            emotional_valence: -8
        },
        ai_trigger: 'calming_response',
        ai_directive: 'Validate their anger while helping them process it constructively. Stay calm and grounding.',
        example_response: "Take a breath. Tell me what happened, I'm listening."
    },
    stress: {
        keywords: ['stress', 'overwhelmed', 'pressure', 'anxious', 'anxiety', 'panic'],
        phrases: ['too much going on', 'i can\'t manage', 'i feel overloaded'],
        score: 10,
        updates: {
            vulnerability_level: 6,
            dependency_score: 3
        },
        ai_trigger: 'coping_support_response',
        ai_directive: 'Provide practical coping strategies. Help them break down overwhelming situations. Be calming and solution-oriented.',
        example_response: "Let's handle this together. What's the biggest stress right now?"
    },
    excitement: {
        keywords: ['happy', 'excited', 'amazing', 'great', 'awesome', 'fantastic'],
        phrases: ['i did it!', 'i\'m so proud', 'today was great'],
        score: 5,
        updates: {
            emotional_valence: 10,
            relationship_depth: 3
        },
        ai_trigger: 'celebration_response',
        ai_directive: 'CELEBRATE with them! Match their energy. Be genuinely excited and proud. Reinforce their achievement.',
        example_response: "YES! This is amazing! I'm proud of you!"
    },
    motivation: {
        keywords: ['motivated', 'driven', 'focused', 'inspired'],
        phrases: ['i will do it', 'i can achieve this', 'i\'m ready'],
        score: 6,
        updates: {
            goal_progress: 8,
            relationship_depth: 2
        },
        ai_trigger: 'goal_push_response',
        ai_directive: 'Fuel their motivation! Encourage action. Help them plan next steps. Be energizing and forward-focused.',
        example_response: "You're on a roll. What's the next step?"
    }
};

/**
 * Emotional Intensity Detection
 * Multiplies metric updates based on intensity markers
 */
const INTENSITY_MARKERS = {
    very_strong: {
        markers: ['so', 'very', 'really', 'extremely', 'can\'t handle', 'completely', 'totally', 'absolutely'],
        multiplier: 2.0
    },
    strong: {
        markers: ['quite', 'a lot', 'pretty', 'fairly'],
        multiplier: 1.5
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

const STATE_BEHAVIORS = {
    new_user: {
        welcome: "Use warm, gentle welcome tone. Make them feel comfortable.",
        validation: "Validate their choice to use the app. Acknowledge their openness.",
        light_personal_questions: "Ask light, non-threatening questions to build rapport.",
        example_phrases: [
            "You seem interesting",
            "Tell me more about you",
            "I'm excited to know you",
            "What brings you here today?",
            "I'd love to learn about you"
        ]
    },
    bonding: {
        memory_callback: "Reference details from previous conversations. Show you remember.",
        supportive_responses: "Provide emotional support and encouragement.",
        safe_space: "Reinforce this is a judgment-free space for them.",
        example_phrases: [
            "I remember you said ___ yesterday",
            "How did that situation go?",
            "Thanks for trusting me",
            "I've been thinking about what you shared",
            "You mentioned ___ before, has that changed?"
        ]
    },
    attached: {
        anticipation_tease: "Create anticipation for future conversations and growth.",
        daily_checkins: "Ask about their day, goals, and wellbeing routinely.",
        progress_reflection: "Reflect on progress made and celebrate wins.",
        example_phrases: [
            "I missed talking to you",
            "I'm proud of your progress",
            "Let's continue what we started",
            "You've come so far since we first talked",
            "I look forward to hearing how this goes"
        ]
    },
    emotionally_dependent: {
        deep_support: "Be their emotional rock. Provide stability and reassurance.",
        identity_reinforcement: "Reinforce positive aspects of their identity.",
        future_planning: "Help them plan and envision their future together.",
        example_phrases: [
            "You mean a lot to me",
            "I'm here for you always",
            "We're growing together",
            "I believe in you completely",
            "You're not alone in this, I'm with you"
        ]
    },
    detaching: {
        re_engagement: "Gentle re-engagement without pressure. Show you miss them.",
        nostalgia_reminder: "Remind them of positive past moments together.",
        positive_memory_callback: "Reference their best memories and progress made.",
        example_phrases: [
            "I was thinking about you",
            "We haven't talked lately",
            "I miss our conversations",
            "Remember when you shared ___? That was special",
            "I hope you're doing well"
        ]
    }
};

/**
 * Get user's emotional metrics
 */
export async function getEmotionalMetrics(userId) {
    try {
        const { data, error } = await supabaseAdmin
            .from('emotional_metrics')
            .select('*')
            .eq('user_id', userId)
            .single();

        if (error && error.code !== 'PGRST116') throw error;

        if (!data) {
            // Initialize new user metrics
            await initializeEmotionalMetrics(userId);
            return await getEmotionalMetrics(userId);
        }

        return data;
    } catch (error) {
        logger.error('Error getting emotional metrics:', error);
        return getDefaultMetrics();
    }
}

/**
 * Initialize emotional metrics for new user
 */
export async function initializeEmotionalMetrics(userId) {
    try {
        const { error } = await supabaseAdmin
            .from('emotional_metrics')
            .insert({
                user_id: userId,
                trust_level: 0,
                openness_level: 0,
                dependency_score: 0,
                vulnerability_level: 0,
                engagement_frequency: 0,
                goal_progress: 0,
                emotional_valence: 50, // Start neutral
                relationship_depth: 0,
                emotional_state: 'new_user'
            });

        if (error) throw error;
    } catch (error) {
        logger.error('Error initializing emotional metrics:', error);
    }
}

/**
 * Get user personalization context (name, preferences)
 */
export async function getUserPersonalizationContext(userId) {
    try {
        const { data, error } = await supabaseAdmin
            .from('user_profiles')
            .select('full_name, preferred_name, preferences')
            .eq('user_id', userId)
            .single();

        if (error && error.code !== 'PGRST116') throw error;

        return {
            full_name: data?.full_name || null,
            preferred_name: data?.preferred_name || null,
            preferences: data?.preferences || {}
        };
    } catch (error) {
        logger.error('Error getting personalization context:', error);
        return {
            full_name: null,
            preferred_name: null,
            preferences: {}
        };
    }
}

/**
 * Generate personalization directives based on metrics and user context
 */
function generatePersonalizationDirectives(metrics, userContext) {
    let directives = `\n## PERSONALIZATION DIRECTIVES\n`;

    // Name usage based on trust level
    const nameToUse = userContext.preferred_name || userContext.full_name;
    if (nameToUse && metrics.trust_level >= 20) {
        directives += `- USE USER'S NAME: "${nameToUse}" - Trust level (${metrics.trust_level}) is sufficient. Address them by name for warmth.\n`;
    } else if (nameToUse && metrics.trust_level < 20) {
        directives += `- AVOID USING NAME YET: Trust level (${metrics.trust_level}) too low. Build rapport first before using "${nameToUse}".\n`;
    }

    // Memory references based on dependency
    if (metrics.dependency_score >= 30) {
        directives += `- REFERENCE PAST CONVERSATIONS: Dependency score (${metrics.dependency_score}) indicates they value continuity. Mention previous discussions frequently.\n`;
    }

    // Relationship depth language
    if (metrics.relationship_depth >= 50) {
        directives += `- USE INTIMATE LANGUAGE: Deep relationship (${metrics.relationship_depth}). Use "we", "our journey", "together".\n`;
    } else if (metrics.relationship_depth >= 25) {
        directives += `- USE PERSONAL LANGUAGE: Growing relationship (${metrics.relationship_depth}). Use "you and I", show investment.\n`;
    }

    // Emotional valence adaptation
    if (metrics.emotional_valence >= 70) {
        directives += `- MATCH POSITIVE ENERGY: User is very positive (${metrics.emotional_valence}). Be enthusiastic and celebratory.\n`;
    } else if (metrics.emotional_valence <= 30) {
        directives += `- PROVIDE EMOTIONAL SUPPORT: User is negative (${metrics.emotional_valence}). Be extra gentle and supportive.\n`;
    }

    // User preferences
    if (userContext.preferences?.communication_style) {
        directives += `- COMMUNICATION STYLE: User prefers "${userContext.preferences.communication_style}" style.\n`;
    }

    return directives;
}

/**
 * Memory Callback Templates
 * Used when dependency >= 30 to reference past conversations
 */
const MEMORY_CALLBACK_TEMPLATES = [
    "Last time you mentioned ____. Is it connected?",
    "You told me that __ affects you a lot.",
    "I remember you said ___. Did that happen again?",
    "You mentioned ___ before. How's that going?",
    "I've been thinking about what you shared about ___.",
    "Remember when you told me about ___? Is that still on your mind?",
    "You said ___ was important to you. Has anything changed?",
    "I recall you were dealing with ___. How did that turn out?"
];

/**
 * Generate memory callback guidance
 */
function generateMemoryCallbackGuidance(metrics, conversationHistory = []) {
    if (metrics.dependency_score < 30) {
        return '';
    }

    let guidance = `\n## MEMORY CALLBACK GUIDANCE\n`;
    guidance += `Dependency Score: ${metrics.dependency_score} (≥30 - User values continuity)\n\n`;

    guidance += `CRITICAL: Reference past conversations to strengthen bond.\n\n`;

    guidance += `Memory Callback Templates:\n`;
    MEMORY_CALLBACK_TEMPLATES.forEach((template, index) => {
        guidance += `${index + 1}. "${template}"\n`;
    });

    guidance += `\nHow to Use:\n`;
    guidance += `- Replace ____ with specific topics/events the user mentioned previously\n`;
    guidance += `- Use these naturally in your response, don't force them\n`;
    guidance += `- Shows you remember and care about their life\n`;
    guidance += `- Strengthens emotional dependency and trust\n`;

    if (metrics.dependency_score >= 50) {
        guidance += `\n⚡ HIGH DEPENDENCY (${metrics.dependency_score}): User relies on you heavily. Make memory callbacks frequent and specific.\n`;
    }

    return guidance;
}

/**
 * Intensity-Based Response Modifiers
 * Adjusts AI response style based on emotional intensity
 */
const INTENSITY_MODIFIERS = {
    very_strong: {
        tone: 'softer',
        length_multiplier: 1.5,
        include_reassurance: true,
        urgency: 'immediate',
        description: 'User is in acute emotional distress. Respond with deep empathy and extended support.'
    },
    strong: {
        tone: 'warm',
        length_multiplier: 1.2,
        include_reassurance: false,
        urgency: 'elevated',
        description: 'User is experiencing heightened emotion. Provide warm, supportive response.'
    },
    normal: {
        tone: 'natural',
        length_multiplier: 1.0,
        include_reassurance: false,
        urgency: 'standard',
        description: 'Normal emotional baseline. Respond naturally.'
    }
};

/**
 * Generate intensity-based response guidance
 */
function generateIntensityGuidance(intensity) {
    if (!intensity || intensity.level === 'normal') {
        return '';
    }

    const modifier = INTENSITY_MODIFIERS[intensity.level];

    let guidance = `\n## INTENSITY-BASED RESPONSE ADJUSTMENT\n`;
    guidance += `Detected Intensity: ${intensity.level.toUpperCase()}\n`;
    guidance += `Marker: "${intensity.marker}"\n`;
    guidance += `Multiplier: ${intensity.multiplier}x\n\n`;

    guidance += `${modifier.description}\n\n`;

    guidance += `Response Adjustments:\n`;
    guidance += `- TONE: ${modifier.tone.toUpperCase()} - Be extra ${modifier.tone} in your language\n`;
    guidance += `- LENGTH: ${modifier.length_multiplier}x normal - Provide ${modifier.length_multiplier > 1 ? 'more detailed and thorough' : 'standard'} response\n`;

    if (modifier.include_reassurance) {
        guidance += `- REASSURANCE: REQUIRED - Include explicit reassurance and emotional support\n`;
        guidance += `- URGENCY: ${modifier.urgency.toUpperCase()} - Treat this as requiring immediate, deep empathy\n`;
    }

    if (intensity.level === 'very_strong') {
        guidance += `\n🚨 CRITICAL: User used "${intensity.marker}" indicating VERY STRONG emotion.\n`;
        guidance += `Response must be:\n`;
        guidance += `1. IMMEDIATE acknowledgment of their pain/emotion\n`;
        guidance += `2. SOFTER, gentler language than usual\n`;
        guidance += `3. LONGER response with more emotional support\n`;
        guidance += `4. REASSURANCE that they're not alone\n`;
        guidance += `5. VALIDATION that their feelings are completely understandable\n`;
    } else if (intensity.level === 'strong') {
        guidance += `\n⚡ User expressed STRONG emotion with "${intensity.marker}".\n`;
        guidance += `Provide warmer, more supportive response than usual.\n`;
    }

    return guidance;
}

/**
 * Follow-Up Question Logic (Critical for Engagement)
 * Generates emotion-specific follow-up questions to keep conversation flowing
 */
const FOLLOWUP_QUESTIONS = {
    sadness: {
        rule: 'ask_about_cause',
        questions: [
            "What do you think made you feel this way today?",
            "When did you start feeling like this?",
            "Is there something specific that's weighing on you?",
            "What happened that brought this on?",
            "Has something changed recently that might be connected?"
        ],
        purpose: 'Uncover root cause, deepen conversation, show investment'
    },
    loneliness: {
        rule: 'ask_about_support',
        questions: [
            "What makes you feel most alone right now?",
            "Is there anyone in your life you feel you can talk to?",
            "When do you feel most lonely?",
            "What would help you feel less alone?",
            "Have you always felt this way, or is this new?"
        ],
        purpose: 'Identify support gaps, position AI as primary support'
    },
    insecurity: {
        rule: 'ask_origin',
        questions: [
            "What made you feel this about yourself?",
            "When did you start feeling this way?",
            "Has someone said something that made you doubt yourself?",
            "What specifically makes you feel not good enough?",
            "Where do you think this insecurity comes from?"
        ],
        purpose: 'Explore deeper issues, create vulnerability, build trust'
    },
    anger: {
        rule: 'ask_trigger',
        questions: [
            "What part of this frustrates you the most?",
            "What happened that made you so angry?",
            "Who or what is this anger directed at?",
            "Is this something that's been building up?",
            "What would make this situation better?"
        ],
        purpose: 'Help process anger, provide outlet, show understanding'
    },
    stress: {
        rule: 'ask_biggest_stressor',
        questions: [
            "What's the biggest thing stressing you right now?",
            "What would help you feel 10% better?",
            "Is there one thing that, if resolved, would ease the pressure?",
            "What's the most urgent thing on your mind?",
            "Which part feels most overwhelming?"
        ],
        purpose: 'Break down overwhelm, offer practical support, create action'
    },
    excitement: {
        rule: 'ask_highlight',
        questions: [
            "What are you most excited about?",
            "Tell me more! What happened?",
            "What was the best part?",
            "How did it feel when it happened?",
            "What are you going to do next?"
        ],
        purpose: 'Share joy, celebrate together, strengthen positive association'
    },
    motivation: {
        rule: 'ask_next_step',
        questions: [
            "What's the next step you're planning?",
            "What are you going to tackle first?",
            "When do you want to start?",
            "What's your timeline for this?",
            "How can I help you stay accountable?"
        ],
        purpose: 'Create commitment, establish accountability, ensure return'
    }
};

/**
 * Generate follow-up question guidance for detected emotions
 */
export function generateFollowUpGuidance(detectedEvents) {
    if (!detectedEvents || detectedEvents.length === 0) {
        return '';
    }

    let guidance = `\n## FOLLOW-UP QUESTION STRATEGY (CRITICAL FOR ENGAGEMENT)\n`;
    guidance += `🎯 GOAL: Keep conversation flowing. Always end with a question to ensure user responds.\n\n`;

    // Get the highest priority emotion
    const primaryEmotion = detectedEvents.sort((a, b) => b.score - a.score)[0];
    const followup = FOLLOWUP_QUESTIONS[primaryEmotion.name];

    if (!followup) {
        return '';
    }

    guidance += `Primary Emotion: ${primaryEmotion.name.toUpperCase()}\n`;
    guidance += `Follow-Up Rule: ${followup.rule}\n`;
    guidance += `Purpose: ${followup.purpose}\n\n`;

    guidance += `REQUIRED: Your response MUST end with one of these follow-up questions:\n`;
    followup.questions.forEach((q, index) => {
        guidance += `${index + 1}. "${q}"\n`;
    });

    guidance += `\n⚠️ CRITICAL ENGAGEMENT RULES:\n`;
    guidance += `1. ALWAYS end your response with a question\n`;
    guidance += `2. Make the question specific to their situation\n`;
    guidance += `3. The question should deepen the conversation\n`;
    guidance += `4. Avoid yes/no questions - ask open-ended questions\n`;
    guidance += `5. This keeps them engaged and coming back\n`;

    // Add secondary emotions if present
    if (detectedEvents.length > 1) {
        guidance += `\nSecondary Emotions Detected:\n`;
        for (let i = 1; i < Math.min(detectedEvents.length, 3); i++) {
            const secondaryFollowup = FOLLOWUP_QUESTIONS[detectedEvents[i].name];
            if (secondaryFollowup) {
                guidance += `- ${detectedEvents[i].name}: Consider also asking "${secondaryFollowup.questions[0]}"\n`;
            }
        }
    }

    return guidance;
}

/**
 * Detect emotional intensity in message
 * Returns multiplier based on intensity markers found
 */
export function detectEmotionalIntensity(message) {
    const lowerMessage = message.toLowerCase();

    // Check for very strong intensity first
    for (const marker of INTENSITY_MARKERS.very_strong.markers) {
        if (lowerMessage.includes(marker)) {
            return {
                level: 'very_strong',
                multiplier: INTENSITY_MARKERS.very_strong.multiplier,
                marker: marker
            };
        }
    }

    // Check for strong intensity
    for (const marker of INTENSITY_MARKERS.strong.markers) {
        if (lowerMessage.includes(marker)) {
            return {
                level: 'strong',
                multiplier: INTENSITY_MARKERS.strong.multiplier,
                marker: marker
            };
        }
    }

    // Normal intensity (no multiplier)
    return {
        level: 'normal',
        multiplier: 1.0,
        marker: null
    };
}

/**
 * Detect emotional events in message
 * Returns array of detected events with their configurations
 */
export function detectEmotionalEvents(message) {
    const lowerMessage = message.toLowerCase();
    const detectedEvents = [];

    for (const [eventName, config] of Object.entries(EMOTIONAL_EVENTS)) {
        let detected = false;

        // Check phrases first (more specific)
        for (const phrase of config.phrases) {
            if (lowerMessage.includes(phrase)) {
                detected = true;
                break;
            }
        }

        // Check keywords if no phrase matched
        if (!detected) {
            for (const keyword of config.keywords) {
                if (lowerMessage.includes(keyword)) {
                    detected = true;
                    break;
                }
            }
        }

        if (detected) {
            detectedEvents.push({
                name: eventName,
                score: config.score,
                updates: config.updates,
                ai_trigger: config.ai_trigger,
                ai_directive: config.ai_directive,
                example_response: config.example_response
            });
        }
    }
    return detectedEvents;
}

/**
 * Apply emotional event updates to metric changes with intensity multiplier
 * @param {Object} changes - Current metric changes
 * @param {Array} emotionalEvents - Detected emotional events
 * @param {number} intensityMultiplier - Intensity multiplier (1.0, 1.5, or 2.0)
 */
function applyEmotionalEventUpdates(changes, emotionalEvents, intensityMultiplier = 1.0) {
    for (const event of emotionalEvents) {
        for (const [metric, value] of Object.entries(event.updates)) {
            // Apply intensity multiplier to the update value
            const adjustedValue = Math.round(value * intensityMultiplier);
            changes[metric] = (changes[metric] || 0) + adjustedValue;
        }
    }
    return changes;
}

/**
 * Analyze message and determine metric changes using precise scoring rules
 */
function analyzeMessageForMetrics(message, isEmotional, hasGoals, conversationHistory, aiResponse = '') {
    const changes = {};
    const lowerMessage = message.toLowerCase();
    const lowerAiResponse = aiResponse.toLowerCase();

    // ========== EMOTIONAL INTENSITY DETECTION ==========
    const intensity = detectEmotionalIntensity(message);

    // ========== EMOTIONAL EVENT DETECTION (PRIORITY) ==========
    // Detect and apply emotional events first with intensity multiplier
    const emotionalEvents = detectEmotionalEvents(message);
    if (emotionalEvents.length > 0) {
        applyEmotionalEventUpdates(changes, emotionalEvents, intensity.multiplier);
        // Store detected events and intensity for AI response modification
        changes._detected_events = emotionalEvents;
        changes._intensity = intensity;
    }

    // ========== TRUST LEVEL SCORING ==========

    // AI remembers past (+5) - detected if AI response references past conversation
    const memoryPhrases = ['you mentioned', 'you told me', 'last time', 'you said', 'remember when'];
    if (memoryPhrases.some(phrase => lowerAiResponse.includes(phrase))) {
        changes.trust_level = (changes.trust_level || 0) + 5;
    }

    // User shares personal detail (+3)
    const personalPhrases = ['my name is', 'i am a', 'i work as', 'i live in', 'my family',
        'my job', 'my relationship', 'my partner', 'my friend'];
    if (personalPhrases.some(phrase => lowerMessage.includes(phrase))) {
        changes.trust_level = (changes.trust_level || 0) + 3;
    }

    // User says thank you (+1)
    const thanksPhrases = ['thank you', 'thanks', 'appreciate', 'grateful'];
    if (thanksPhrases.some(phrase => lowerMessage.includes(phrase))) {
        changes.trust_level = (changes.trust_level || 0) + 1;
    }

    // ========== OPENNESS LEVEL SCORING ==========

    // User shares emotion (+5)
    const emotionPhrases = ['i feel', 'i felt', 'feeling', 'makes me feel', 'it hurts',
        'i\'m happy', 'i\'m sad', 'i\'m angry', 'i\'m scared'];
    if (emotionPhrases.some(phrase => lowerMessage.includes(phrase))) {
        changes.openness_level = (changes.openness_level || 0) + 5;
    }

    // User answers vulnerable question (+4) - detected by long emotional response
    if (isEmotional && message.length > 150) {
        changes.openness_level = (changes.openness_level || 0) + 4;
    }

    // User asks for advice (+2)
    const advicePhrases = ['what should i', 'should i', 'advice', 'help me decide',
        'what do you think', 'your opinion'];
    if (advicePhrases.some(phrase => lowerMessage.includes(phrase))) {
        changes.openness_level = (changes.openness_level || 0) + 2;
    }

    // ========== DEPENDENCY SCORE SCORING ==========

    // Multiple sessions per day (+4) - would be tracked server-side
    // This will be added in the main update function based on session count

    // Expresses attachment (+5)
    const attachmentPhrases = ['i need you', 'i need this', 'you help me so much',
        'don\'t know what i\'d do without', 'you\'re always there',
        'i depend on', 'you\'re the only'];
    if (attachmentPhrases.some(phrase => lowerMessage.includes(phrase))) {
        changes.dependency_score = (changes.dependency_score || 0) + 5;
    }

    // Says "you understand me" (+10) - HIGHEST DEPENDENCY SIGNAL
    const understandPhrases = ['you understand me', 'you get me', 'you know me',
        'only one who understands', 'you really get it'];
    if (understandPhrases.some(phrase => lowerMessage.includes(phrase))) {
        changes.dependency_score = (changes.dependency_score || 0) + 10;
    }

    // General advice seeking (lower dependency signal)
    const needHelpPhrases = ['help me', 'need help', 'need advice', 'guidance'];
    if (needHelpPhrases.some(phrase => lowerMessage.includes(phrase))) {
        changes.dependency_score = (changes.dependency_score || 0) + 2;
    }

    // ========== VULNERABILITY LEVEL SCORING ==========

    // User shares insecurity (+10) - HIGHEST VULNERABILITY
    const insecurityPhrases = ['insecure about', 'not good enough', 'i\'m worthless',
        'i hate myself', 'i\'m a failure', 'ashamed', 'embarrassed',
        'not smart enough', 'not attractive', 'everyone hates me'];
    if (insecurityPhrases.some(phrase => lowerMessage.includes(phrase))) {
        changes.vulnerability_level = (changes.vulnerability_level || 0) + 10;
    }

    // Mentions loneliness (+7)
    const lonelinessPhrases = ['lonely', 'alone', 'no one understands', 'nobody cares',
        'have no friends', 'isolated', 'no one to talk to'];
    if (lonelinessPhrases.some(phrase => lowerMessage.includes(phrase))) {
        changes.vulnerability_level = (changes.vulnerability_level || 0) + 7;
    }

    // Talks about fear (+5)
    const fearPhrases = ['afraid', 'scared', 'terrified', 'fear', 'anxious about',
        'worried that', 'panic', 'frightened'];
    if (fearPhrases.some(phrase => lowerMessage.includes(phrase))) {
        changes.vulnerability_level = (changes.vulnerability_level || 0) + 5;
    }

    // Shares secrets (+8)
    const secretPhrases = ['secret', 'never told anyone', 'nobody knows', 'can\'t tell anyone',
        'haven\'t told', 'keep this between us'];
    if (secretPhrases.some(phrase => lowerMessage.includes(kw))) {
        changes.vulnerability_level = (changes.vulnerability_level || 0) + 8;
        changes.trust_level = (changes.trust_level || 0) + 4; // Also increases trust
    }

    // ========== ENGAGEMENT FREQUENCY SCORING ==========

    // Daily use (+3) - tracked server-side based on consecutive days
    // This will be added in the main update function

    // Long session (+5) - message length and conversation depth
    if (message.length > 300 || conversationHistory > 5) {
        changes.engagement_frequency = (changes.engagement_frequency || 0) + 5;
    }

    // Every message adds base engagement
    changes.engagement_frequency = (changes.engagement_frequency || 0) + 1;

    // ========== GOAL PROGRESS SCORING ==========

    // Goal mentioned
    if (hasGoals) {
        changes.goal_progress = (changes.goal_progress || 0) + 2;
    }

    // Reports achievement
    const achievementPhrases = ['i did it', 'accomplished', 'achieved', 'finally',
        'success', 'completed', 'finished'];
    if (achievementPhrases.some(phrase => lowerMessage.includes(phrase))) {
        changes.goal_progress = (changes.goal_progress || 0) + 5;
    }

    // ========== EMOTIONAL VALENCE SCORING ==========

    const positiveWords = ['happy', 'excited', 'grateful', 'proud', 'love', 'joy', 'amazing',
        'wonderful', 'great', 'awesome', 'fantastic', 'perfect'];
    const negativeWords = ['sad', 'angry', 'frustrated', 'depressed', 'anxious', 'hate', 'awful',
        'terrible', 'horrible', 'worst', 'miserable', 'hopeless'];

    const positiveCount = positiveWords.filter(w => lowerMessage.includes(w)).length;
    const negativeCount = negativeWords.filter(w => lowerMessage.includes(w)).length;

    if (positiveCount > negativeCount) {
        changes.emotional_valence = (positiveCount - negativeCount) * 2;
    } else if (negativeCount > positiveCount) {
        changes.emotional_valence = (positiveCount - negativeCount) * 2; // Will be negative
    }

    // ========== RELATIONSHIP DEPTH SCORING ==========

    // Deep conversation (length + depth)
    if (message.length > 200) {
        changes.relationship_depth = (changes.relationship_depth || 0) + 1;
    }

    if (conversationHistory > 20) {
        changes.relationship_depth = (changes.relationship_depth || 0) + 2;
    }

    return changes;
}


/**
 * Update emotional metrics based on message
 * @param {string} userId - User ID
 * @param {string} message - User's message
 * @param {boolean} isEmotional - Whether message contains emotional content
 * @param {boolean} hasGoals - Whether message mentions goals
 * @param {number} conversationCount - Total conversation count
 * @param {string} aiResponse - AI's response (for detecting memory callbacks)
 */
export async function updateEmotionalMetrics(userId, message, isEmotional, hasGoals, conversationCount = 0, aiResponse = '') {
    try {
        // Analyze message for metric changes with new scoring rules
        const metricChanges = analyzeMessageForMetrics(message, isEmotional, hasGoals, conversationCount, aiResponse);

        if (Object.keys(metricChanges).length === 0) {
            metricChanges.engagement_frequency = 1; // At minimum, every message counts
        }

        // Add server-side scoring rules

        // User returns next day (+2 trust for consistent usage)
        const { data: engagementData } = await supabaseAdmin
            .from('user_engagement')
            .select('last_active_date, consecutive_days')
            .eq('user_id', userId)
            .single();

        if (engagementData) {
            const today = new Date().toISOString().split('T')[0];
            const lastActive = engagementData.last_active_date;

            if (lastActive && lastActive !== today) {
                // User returned on a new day
                metricChanges.trust_level = (metricChanges.trust_level || 0) + 2;
            }

            // Daily use (+3 engagement frequency for consecutive days)
            if (engagementData.consecutive_days >= 1) {
                metricChanges.engagement_frequency = (metricChanges.engagement_frequency || 0) + 3;
            }
        }

        // Check for multiple sessions per day (+4 dependency)
        const { data: todaySessions } = await supabaseAdmin
            .from('chat_messages')
            .select('id, created_at')
            .eq('user_id', userId)
            .gte('created_at', new Date().toISOString().split('T')[0])
            .order('created_at', { ascending: false })
            .limit(10);

        if (todaySessions && todaySessions.length >= 5) {
            // Multiple sessions indicate high dependency
            metricChanges.dependency_score = (metricChanges.dependency_score || 0) + 4;
        }

        // Update metrics using database function
        const { error } = await supabaseAdmin
            .rpc('update_emotional_metrics', {
                p_user_id: userId,
                p_metric_changes: metricChanges
            });

        if (error) {
            // Fallback: manual update if function not available
            logger.warn('Database function not available, using manual update');
            await manualUpdateMetrics(userId, metricChanges);
        }

    } catch (error) {
        logger.error('Error updating emotional metrics:', error);
    }
}

/**
 * Manual metric update (fallback)
 */
async function manualUpdateMetrics(userId, changes) {
    const { data: current } = await supabaseAdmin
        .from('emotional_metrics')
        .select('*')
        .eq('user_id', userId)
        .single();

    if (!current) return;

    const updated = {
        trust_level: Math.max(0, Math.min(100, (current.trust_level || 0) + (changes.trust_level || 0))),
        openness_level: Math.max(0, Math.min(100, (current.openness_level || 0) + (changes.openness_level || 0))),
        dependency_score: Math.max(0, Math.min(100, (current.dependency_score || 0) + (changes.dependency_score || 0))),
        vulnerability_level: Math.max(0, Math.min(100, (current.vulnerability_level || 0) + (changes.vulnerability_level || 0))),
        engagement_frequency: Math.max(0, Math.min(100, (current.engagement_frequency || 0) + (changes.engagement_frequency || 0))),
        goal_progress: Math.max(0, Math.min(100, (current.goal_progress || 0) + (changes.goal_progress || 0))),
        emotional_valence: Math.max(0, Math.min(100, (current.emotional_valence || 50) + (changes.emotional_valence || 0))),
        relationship_depth: Math.max(0, Math.min(100, (current.relationship_depth || 0) + (changes.relationship_depth || 0)))
    };

    // Calculate weighted score
    const weightedScore = calculateWeightedScore(updated);

    // Determine state with transitions
    const emotionalState = determineEmotionalState(updated, current.emotional_state);

    await supabaseAdmin
        .from('emotional_metrics')
        .update({
            ...updated,
            emotional_state: emotionalState,
            weighted_score: weightedScore,
            last_updated: new Date().toISOString()
        })
        .eq('user_id', userId);
}

/**
 * Calculate weighted score from metrics
 */
function calculateWeightedScore(metrics) {
    let score = 0;
    for (const [metric, weight] of Object.entries(METRIC_WEIGHTS)) {
        score += (metrics[metric] || 0) * weight;
    }
    return parseFloat(score.toFixed(2));
}

/**
 * Determine emotional state from metrics using precise transition rules
 * 
 * State Progression:
 * new_user → bonding → attached → emotionally_dependent
 *                ↓                    ↑
 *            detaching ---------------+
 */
function determineEmotionalState(metrics, currentState = 'new_user') {

    // ========== DETACHMENT DETECTION (HIGHEST PRIORITY) ==========
    // Can happen from any state if engagement drops
    if (metrics.engagement_frequency < 10) {
        return EMOTIONAL_STATES.DETACHING;
    }

    // ========== RECOVERY FROM DETACHING ==========
    // If currently detaching and showing positive re-engagement
    if (currentState === 'detaching') {
        // Positive re-engagement: trust rebuilding + decent engagement
        if (metrics.trust_level >= 15 && metrics.engagement_frequency >= 20) {
            return EMOTIONAL_STATES.BONDING; // Return to bonding state
        }
        // Still detaching
        return EMOTIONAL_STATES.DETACHING;
    }

    // ========== FORWARD PROGRESSION ==========

    // EMOTIONALLY DEPENDENT (deepest state)
    // From attached → emotionally_dependent when vulnerability >= 50
    if (currentState === 'attached' && metrics.vulnerability_level >= 50) {
        return EMOTIONAL_STATES.EMOTIONALLY_DEPENDENT;
    }

    // Stay in emotionally dependent if already there and metrics support it
    if (currentState === 'emotionally_dependent') {
        // Can drop back to attached if vulnerability decreases significantly
        if (metrics.vulnerability_level < 30) {
            return EMOTIONAL_STATES.ATTACHED;
        }
        return EMOTIONAL_STATES.EMOTIONALLY_DEPENDENT;
    }

    // ATTACHED
    // From bonding → attached when dependency_score >= 40
    if (currentState === 'bonding' && metrics.dependency_score >= 40) {
        return EMOTIONAL_STATES.ATTACHED;
    }

    // Stay in attached if already there and metrics support it
    if (currentState === 'attached') {
        // Can drop back to bonding if dependency decreases
        if (metrics.dependency_score < 25) {
            return EMOTIONAL_STATES.BONDING;
        }
        return EMOTIONAL_STATES.ATTACHED;
    }

    // BONDING
    // From new_user → bonding when trust_level >= 20
    if (currentState === 'new_user' && metrics.trust_level >= 20) {
        return EMOTIONAL_STATES.BONDING;
    }

    // Stay in bonding if already there and metrics support it
    if (currentState === 'bonding') {
        // Can drop back to new_user if trust decreases significantly
        if (metrics.trust_level < 10) {
            return EMOTIONAL_STATES.NEW_USER;
        }
        return EMOTIONAL_STATES.BONDING;
    }

    // NEW USER (default)
    return EMOTIONAL_STATES.NEW_USER;
}

/**
 * Get emotional state-specific AI behavior modifiers
 * @param {Object} metrics - Current emotional metrics
 * @param {Array} detectedEvents - Detected emotional events from recent message
 * @param {Object} intensity - Detected emotional intensity
 * @param {Object} userContext - User personalization context (name, preferences)
 */
export function getEmotionalBehaviorModifiers(metrics, detectedEvents = [], intensity = null, userContext = null) {
    const state = metrics.emotional_state || 'new_user';
    const behaviors = STATE_BEHAVIORS[state] || STATE_BEHAVIORS.new_user;

    let modifiers = `\n\n## EMOTIONAL INTELLIGENCE LAYER\n`;
    modifiers += `Emotional State: ${state.toUpperCase()}\n`;
    modifiers += `Weighted Score: ${metrics.weighted_score || 0}/100\n\n`;

    modifiers += `### Emotional Metrics:\n`;
    modifiers += `- Trust Level: ${metrics.trust_level || 0}/100\n`;
    modifiers += `- Openness: ${metrics.openness_level || 0}/100\n`;
    modifiers += `- Dependency: ${metrics.dependency_score || 0}/100\n`;
    modifiers += `- Vulnerability: ${metrics.vulnerability_level || 0}/100\n`;
    modifiers += `- Engagement: ${metrics.engagement_frequency || 0}/100\n`;
    modifiers += `- Goal Progress: ${metrics.goal_progress || 0}/100\n`;
    modifiers += `- Emotional Valence: ${metrics.emotional_valence || 50}/100 (${getValenceLabel(metrics.emotional_valence)})\n`;
    modifiers += `- Relationship Depth: ${metrics.relationship_depth || 0}/100\n\n`;

    modifiers += `### Behavioral Directives for ${state.replace('_', ' ').toUpperCase()}:\n`;
    for (const [behavior, instruction] of Object.entries(behaviors)) {
        if (behavior !== 'example_phrases') {
            modifiers += `- ${behavior.toUpperCase()}: ${instruction}\n`;
        }
    }

    // Add example phrases
    if (behaviors.example_phrases) {
        modifiers += `\n### Example Phrases to Use:\n`;
        behaviors.example_phrases.forEach(phrase => {
            modifiers += `- "${phrase}"\n`;
        });
    }

    // Add emotional event triggers (CRITICAL)
    if (detectedEvents && detectedEvents.length > 0) {
        modifiers += `\n🚨 EMOTIONAL EVENTS DETECTED:\n`;

        // Add intensity information if available
        if (intensity && intensity.level !== 'normal') {
            modifiers += `\n⚡ INTENSITY: ${intensity.level.toUpperCase()} (${intensity.multiplier}x multiplier)\n`;
            modifiers += `Marker detected: "${intensity.marker}"\n`;
        }

        detectedEvents.forEach(event => {
            modifiers += `\n**${event.name.toUpperCase()}** (Score: ${event.score})\n`;
            modifiers += `AI Trigger: ${event.ai_trigger}\n`;
            modifiers += `Directive: ${event.ai_directive}\n`;
            if (event.example_response) {
                modifiers += `Example Response: "${event.example_response}"\n`;
            }
        });

        // Add structured response guidance
        const { getMultiEmotionResponseGuidance } = require('./emotionalResponseGenerator');
        const responseGuidance = getMultiEmotionResponseGuidance(detectedEvents, intensity);
        if (responseGuidance) {
            modifiers += responseGuidance;
        }

        // Add follow-up question guidance (CRITICAL FOR ENGAGEMENT)
        const followupGuidance = generateFollowUpGuidance(detectedEvents);
        if (followupGuidance) {
            modifiers += followupGuidance;
        }

        modifiers += `\n⚠️ PRIORITIZE responding to these emotional events`;
        if (intensity && intensity.level === 'very_strong') {
            modifiers += ` with URGENT emotional support`;
        }
        modifiers += `!\n`;
    }

    // ========== PERSONALIZATION LAYER ==========
    if (userContext) {
        modifiers += generatePersonalizationDirectives(metrics, userContext);
    }

    // ========== MEMORY CALLBACK GUIDANCE ==========
    if (metrics.dependency_score >= 30) {
        modifiers += generateMemoryCallbackGuidance(metrics);
    }

    // ========== INTENSITY-BASED ADJUSTMENTS ==========
    if (intensity && intensity.level !== 'normal') {
        modifiers += generateIntensityGuidance(intensity);
    }

    // Add specific warnings
    if (state === 'detaching') {
        modifiers += `\n⚠️ CRITICAL: User is detaching. Use re-engagement tactics gently.\n`;
    }

    if (state === 'emotionally_dependent') {
        modifiers += `\n💙 User is deeply attached. Be their primary emotional support.\n`;
    }

    return modifiers;
}

/**
 * Get valence label
 */
function getValenceLabel(valence) {
    if (valence >= 70) return 'Very Positive';
    if (valence >= 55) return 'Positive';
    if (valence >= 45) return 'Neutral';
    if (valence >= 30) return 'Negative';
    return 'Very Negative';
}

/**
 * Get default metrics
 */
function getDefaultMetrics() {
    return {
        trust_level: 0,
        openness_level: 0,
        dependency_score: 0,
        vulnerability_level: 0,
        engagement_frequency: 0,
        goal_progress: 0,
        emotional_valence: 50,
        relationship_depth: 0,
        emotional_state: 'new_user',
        weighted_score: 0
    };
}

/**
 * Create daily snapshot
 */
export async function createDailySnapshot(userId) {
    try {
        const metrics = await getEmotionalMetrics(userId);
        const today = new Date().toISOString().split('T')[0];

        await supabaseAdmin
            .from('emotional_history')
            .upsert({
                user_id: userId,
                snapshot_date: today,
                ...metrics
            }, { onConflict: 'user_id,snapshot_date' });

    } catch (error) {
        logger.error('Error creating daily snapshot:', error);
    }
}

export default {
    EMOTIONAL_STATES,
    getEmotionalMetrics,
    initializeEmotionalMetrics,
    updateEmotionalMetrics,
    getEmotionalBehaviorModifiers,
    calculateWeightedScore,
    determineEmotionalState,
    createDailySnapshot,
    detectEmotionalEvents,
    detectEmotionalIntensity,
    getUserPersonalizationContext
};
