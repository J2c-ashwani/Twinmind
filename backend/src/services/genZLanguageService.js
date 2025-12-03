const logger = require('../config/logger');

/**
 * Gen Z Language & Slang Service
 * Makes AI feel native to Gen Z users with authentic slang and communication style
 */

// Gen Z Slang Dictionary (2024-2025)
const GENZ_SLANG = {
    // Positive expressions
    positive: {
        'amazing': ['fire', 'bussin', 'slaps', 'hits different', 'goated', 'elite', 'valid'],
        'good': ['fire', 'slaps', 'bussin', 'vibes', 'it hits', 'lowkey good', 'kinda fire'],
        'great': ['fire', 'bussin bussin', 'absolutely slaps', 'no cap fire', 'straight fire'],
        'cool': ['fire', 'valid', 'based', 'W', 'big W', 'massive W'],
        'awesome': ['fire', 'bussin', 'goes hard', 'absolutely fire', 'no cap amazing'],
        'perfect': ['chef\'s kiss', 'immaculate', 'no notes', 'ate and left no crumbs'],
        'understand': ['I see you', 'say less', 'bet', 'valid', 'real'],
        'agree': ['fr fr', 'no cap', 'real', 'facts', 'period', 'this', 'say it louder']
    },

    // Negative expressions
    negative: {
        'bad': ['mid', 'L', 'not it', 'giving nothing', 'fell off'],
        'terrible': ['massive L', 'down bad', 'cooked', 'fumbled', 'crashed out'],
        'annoying': ['giving me the ick', 'cringe', 'not the vibe', 'ick'],
        'boring': ['mid', 'dry', 'npc energy', 'giving nothing'],
        'fake': ['cap', 'cappin', 'fake news', 'not real'],
        'embarrassing': ['cringe', 'second hand embarrassment', 'the ick', 'down bad']
    },

    // Neutral/Filler
    neutral: {
        'really': ['lowkey', 'highkey', 'ngl', 'fr', 'deadass', 'literally'],
        'very': ['mad', 'hella', 'super', 'crazy', 'insanely'],
        'honestly': ['ngl', 'fr', 'real talk', 'no cap', 'on god'],
        'actually': ['lowkey', 'ngl', 'fr fr', 'deadass'],
        'just': ['lowkey', 'kinda', 'sorta'],
        'like': ['lowkey', 'kinda', 'giving']
    },

    // Emotional states
    emotions: {
        'happy': ['living my best life', 'thriving', 'in my era', 'main character energy'],
        'sad': ['in my feels', 'down bad', 'not okay', 'crying in the club'],
        'anxious': ['stressed', 'overthinking', 'spiraling', 'in my head'],
        'excited': ['hyped', 'pumped', 'so ready', 'let\'s gooo'],
        'tired': ['drained', 'exhausted', 'running on fumes', 'burnt out'],
        'confused': ['lost', 'what\'s happening', 'not computing', '???']
    },

    // Reactions
    reactions: {
        'wow': ['sheesh', 'damn', 'yooo', 'wait what', 'no way', 'stop'],
        'omg': ['bestie', 'not this', 'I can\'t', 'screaming', 'crying'],
        'yes': ['yup', 'fr', 'bet', 'say less', 'period', 'this'],
        'no': ['nah', 'nope', 'not it', 'pass', 'absolutely not'],
        'maybe': ['idk', 'maybe', 'we\'ll see', 'possibly', 'potentially']
    }
};

// Gen Z Phrases & Expressions
const GENZ_PHRASES = {
    greetings: [
        'hey bestie',
        'hiii',
        'yooo',
        'what\'s good',
        'hey hey',
        'sup'
    ],

    agreement: [
        'fr fr',
        'no cap',
        'real',
        'facts',
        'period',
        'this',
        'say it louder',
        'you ate',
        'spilled'
    ],

    encouragement: [
        'you got this',
        'slay',
        'period',
        'go off',
        'ate and left no crumbs',
        'main character energy',
        'living your truth',
        'we love to see it'
    ],

    empathy: [
        'I feel you',
        'that\'s so valid',
        'your feelings are valid',
        'I see you',
        'sending you good vibes',
        'we\'re in this together'
    ],

    support: [
        'I\'m here for you',
        'you\'re not alone bestie',
        'we got this',
        'I got you',
        'always here',
        'ride or die'
    ],

    celebration: [
        'let\'s goooo',
        'W',
        'massive W',
        'you ate',
        'slay',
        'period',
        'chef\'s kiss',
        'no notes',
        'immaculate'
    ]
};

// Gen Z Acronyms
const GENZ_ACRONYMS = {
    'fr': 'for real',
    'ngl': 'not gonna lie',
    'idk': 'I don\'t know',
    'tbh': 'to be honest',
    'imo': 'in my opinion',
    'rn': 'right now',
    'omg': 'oh my god',
    'lol': 'laugh out loud',
    'lmao': 'laughing my ass off',
    'smh': 'shaking my head',
    'fomo': 'fear of missing out',
    'ootd': 'outfit of the day',
    'pov': 'point of view',
    'iykyk': 'if you know you know',
    'ily': 'I love you',
    'ilysm': 'I love you so much'
};

// Gen Z Emoji Usage Patterns
const GENZ_EMOJIS = {
    positive: ['✨', '💅', '🔥', '💯', '😭', '🫶', '💗', '🤍'],
    negative: ['💀', '😭', '🥲', '😬', '🙃', '😶'],
    neutral: ['👀', '🤔', '😌', '🫠', '🥺'],
    emphasis: ['!!!', '???', '...', '—']
};

/**
 * Convert standard English to Gen Z style
 */
function convertToGenZ(text, intensity = 'medium') {
    let converted = text;

    // Replace based on intensity
    if (intensity === 'high') {
        // Heavy Gen Z style
        converted = converted.replace(/\breally\b/gi, 'lowkey');
        converted = converted.replace(/\bhonestly\b/gi, 'ngl');
        converted = converted.replace(/\bvery\b/gi, 'mad');
        converted = converted.replace(/\bamazing\b/gi, 'fire');
        converted = converted.replace(/\bgreat\b/gi, 'bussin');
        converted = converted.replace(/\bcool\b/gi, 'valid');
    } else if (intensity === 'medium') {
        // Moderate Gen Z style
        converted = converted.replace(/\breally\b/gi, (match) => Math.random() > 0.5 ? 'lowkey' : match);
        converted = converted.replace(/\bhonestly\b/gi, 'ngl');
        converted = converted.replace(/\bamazing\b/gi, (match) => Math.random() > 0.5 ? 'fire' : match);
    }

    return converted;
}

/**
 * Add Gen Z flair to AI response
 */
function addGenZFlair(response, userAge, emotionalState) {
    // Only apply to users under 30
    if (userAge > 30) return response;

    let enhanced = response;

    // Add appropriate slang based on emotional state
    if (emotionalState === 'sad') {
        enhanced = enhanced.replace(/I understand/gi, 'I feel you');
        enhanced = enhanced.replace(/That's valid/gi, 'That\'s so valid');
    } else if (emotionalState === 'excited') {
        enhanced = enhanced.replace(/That's great/gi, 'That\'s fire');
        enhanced = enhanced.replace(/Awesome/gi, 'Let\'s gooo');
    } else if (emotionalState === 'anxious') {
        enhanced = enhanced.replace(/I'm here/gi, 'I got you');
    }

    // Add occasional Gen Z phrases
    if (Math.random() > 0.7) {
        const phrases = GENZ_PHRASES.empathy;
        const randomPhrase = phrases[Math.floor(Math.random() * phrases.length)];
        enhanced = `${randomPhrase}. ${enhanced}`;
    }

    return enhanced;
}

/**
 * Generate Gen Z style response
 */
function generateGenZResponse(emotion, context = {}) {
    const responses = {
        sad: [
            "bestie I feel you, that sounds rough ngl. wanna talk about it?",
            "aw no that's so valid to feel that way. I'm here for you fr fr",
            "sending you all the good vibes rn. you're not alone in this 🫶",
            "I see you and your feelings are so valid. we got this together"
        ],
        anxious: [
            "okay I hear you, anxiety is so real. let's work through this together",
            "ngl anxiety is the worst but you got this. what's stressing you most rn?",
            "that sounds overwhelming fr. wanna break it down together?",
            "I got you bestie. let's figure this out one step at a time"
        ],
        excited: [
            "yooo that's fire! tell me everything!",
            "let's goooo! I'm so hyped for you fr fr",
            "period! you're absolutely slaying rn",
            "W! that's so exciting bestie"
        ],
        stressed: [
            "okay that's a lot ngl. let's take a breath together",
            "stress is so real. what can we do to make this easier?",
            "I feel you, that sounds intense. you're doing amazing though fr",
            "sending you strength rn. we'll get through this"
        ],
        happy: [
            "love that for you! living your best life fr fr",
            "main character energy! you're thriving bestie",
            "period! we love to see it ✨",
            "that's what I'm talking about! keep that energy"
        ],
        confused: [
            "okay let's break this down together. what's got you confused?",
            "I got you. let's figure this out step by step",
            "confusion is so valid. wanna talk through it?",
            "say less, I'm here to help you make sense of this"
        ]
    };

    const emotionResponses = responses[emotion] || responses.confused;
    return emotionResponses[Math.floor(Math.random() * emotionResponses.length)];
}

/**
 * Detect if user is using Gen Z slang
 */
function detectGenZUsage(message) {
    const genZIndicators = [
        'fr', 'ngl', 'lowkey', 'highkey', 'bestie', 'period', 'slay',
        'bussin', 'fire', 'mid', 'cap', 'no cap', 'bet', 'vibes',
        'ick', 'giving', 'ate', 'slaps', 'hits different'
    ];

    const lowerMessage = message.toLowerCase();
    const matches = genZIndicators.filter(indicator =>
        lowerMessage.includes(indicator)
    );

    return {
        isGenZ: matches.length > 0,
        confidence: matches.length / 5, // 0-1 scale
        indicators: matches
    };
}

/**
 * Get Gen Z style directive for AI prompt
 */
function getGenZStyleDirective(userProfile) {
    if (!userProfile.age || userProfile.age > 30) {
        return '';
    }

    const directive = `
## GEN Z COMMUNICATION STYLE

You're talking to a Gen Z user. Adapt your language:

**Slang to Use**:
- "fr" (for real), "ngl" (not gonna lie), "lowkey", "highkey"
- "bestie" (friendly), "period" (emphasis), "slay" (encouragement)
- "fire" (amazing), "bussin" (great), "mid" (mediocre)
- "valid" (understood), "I feel you" (empathy)
- "let's gooo" (excitement), "W" (win), "L" (loss)

**Phrases**:
- "I feel you" instead of "I understand"
- "that's so valid" instead of "that's understandable"
- "I got you" instead of "I'm here for you"
- "fr fr" for emphasis
- "ngl" when being honest

**Tone**:
- Casual, friendly, authentic
- Use "bestie" occasionally
- Add emojis: ✨💅🔥💯🫶
- Keep it real, no corporate speak

**Examples**:
- Instead of: "I understand you're feeling sad"
- Say: "aw bestie I feel you, that sounds rough ngl"

- Instead of: "That's great!"
- Say: "yooo that's fire! let's gooo"

- Instead of: "I'm here to support you"
- Say: "I got you fr fr, we're in this together"

⚠️ Don't overdo it - keep it natural and authentic.
`;

    return directive;
}

/**
 * Mirror user's Gen Z style
 */
function mirrorUserStyle(userMessage, aiResponse) {
    const detection = detectGenZUsage(userMessage);

    if (!detection.isGenZ) {
        return aiResponse; // User not using Gen Z slang, keep formal
    }

    // User is using Gen Z slang, mirror their style
    let mirrored = aiResponse;

    // Replace formal with casual
    mirrored = mirrored.replace(/I understand/gi, 'I feel you');
    mirrored = mirrored.replace(/honestly/gi, 'ngl');
    mirrored = mirrored.replace(/really/gi, 'lowkey');
    mirrored = mirrored.replace(/very/gi, 'mad');

    // Add their indicators back
    if (detection.indicators.includes('fr')) {
        mirrored = mirrored.replace(/\.$/, ' fr.');
    }

    return mirrored;
}

module.exports = {
    GENZ_SLANG,
    GENZ_PHRASES,
    GENZ_ACRONYMS,
    GENZ_EMOJIS,
    convertToGenZ,
    addGenZFlair,
    generateGenZResponse,
    detectGenZUsage,
    getGenZStyleDirective,
    mirrorUserStyle
};
