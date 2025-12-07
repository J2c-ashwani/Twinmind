import logger from "../config/logger.js";

/**
 * Gen Z Language Service 2025
 * — Clean, minimal, non-cringe, emotion-aware mirroring.
 * — Supports Twin modes without breaking tone.
 */

// Keywords that signal strong Gen Z language
const GENZ_KEYWORDS = [
    "fr", "ngl", "lowkey", "highkey", "bro", "brooo", "bestie", "slay", "bussin",
    "fire", "mid", "cap", "no cap", "bet", "vibes", "ate", "giving", "cringe",
    "ick", "valid", "let’s gooo", "w", "l", "deadass"
];

// Light slang options (minimal, safe)
const SLANG_REPLACEMENTS = {
    "really": ["lowkey", "fr", "ngl"],
    "honestly": ["ngl"],
    "very": ["mad", "hella"],
    "amazing": ["fire"],
    "great": ["fire", "valid"],
    "cool": ["valid"],
    "understand": ["I feel you"],
};

// Avoid slang in these emotional states unless *user* used it first
const SENSITIVE_EMOTIONS = ["sad", "hurt", "anxious", "angry", "depressed"];

/**
 * Detect Gen Z usage from user message
 */
export function detectGenZUsage(message) {
    const lower = message.toLowerCase();

    const matches = GENZ_KEYWORDS.filter(key => lower.includes(key));

    return {
        isGenZ: matches.length > 0,
        confidence: Math.min(matches.length / 5, 1), // 0–1 scale
        indicators: matches,
    };
}

/**
 * Mirror user's Gen Z style safely (no cringe)
 */
export function mirrorUserStyle(userMessage, aiMessage) {
    const detection = detectGenZUsage(userMessage);

    if (!detection.isGenZ) return aiMessage;

    let output = aiMessage;

    // Soft replacements, not full slang-speak
    output = output.replace(/\bI understand\b/gi, "I feel you");
    output = output.replace(/\bhonestly\b/gi, "ngl");

    // If user used "fr", end with "fr" only when natural
    if (detection.indicators.includes("fr")) {
        if (!output.toLowerCase().includes("fr")) {
            output += " fr";
        }
    }

    return output;
}

/**
 * Light Gen Z enhancement inside the Twin response AFTER sanitization
 */
export function addGenZFlair(aiResponse, options = {}) {
    const { userMessage = "", emotion = "neutral" } = options;

    const detection = detectGenZUsage(userMessage);
    const isSensitive = SENSITIVE_EMOTIONS.includes(emotion);

    // If user is not Gen Z or emotion is sensitive → return unchanged
    if (!detection.isGenZ || isSensitive) return aiResponse;

    let modified = aiResponse;

    // Replace a few safe words with slang versions
    for (const [word, replacements] of Object.entries(SLANG_REPLACEMENTS)) {
        const regex = new RegExp(`\\b${word}\\b`, "gi");
        if (regex.test(modified) && Math.random() > 0.5) {
            const pick = replacements[Math.floor(Math.random() * replacements.length)];
            modified = modified.replace(regex, pick);
        }
    }

    return modified;
}

/**
 * Convert a sentence into Gen Z style (used LESS frequently now)
 */
export function convertToGenZ(text, intensity = "medium") {
    let out = text;

    if (intensity === "high") {
        out = out
            .replace(/\breally\b/gi, "lowkey")
            .replace(/\bhonestly\b/gi, "ngl")
            .replace(/\bamazing\b/gi, "fire")
            .replace(/\bvery\b/gi, "mad");
    }

    if (intensity === "medium") {
        out = out.replace(/\bhonestly\b/gi, "ngl");

        if (Math.random() > 0.6) {
            out = out.replace(/\breally\b/gi, "lowkey");
        }
    }

    return out;
}

/**
 * Generate a short Gen Z emotionally aligned reply (rarely used)
 */
export function generateGenZResponse(emotion = "neutral") {
    const presets = {
        sad: [
            "bestie I feel you fr, that sounds rough.",
            "ngl that's heavy… wanna talk?",
        ],
        excited: [
            "yooo that's fire! tell me more 🔥",
            "let's gooo! big W energy",
        ],
        angry: [
            "ngl I'd be heated too. what exactly set you off?",
            "damn… that really gave ‘ick’ energy fr."
        ],
        happy: [
            "love that for you! main character energy fr",
            "okayyy slay, big W 💅",
        ],
        default: [
            "ngl I feel you on that.",
            "fr fr, say more."
        ]
    };

    const list = presets[emotion] || presets.default;
    return list[Math.floor(Math.random() * list.length)];
}

/**
 * Create system prompt directive (used inside chatEngine)
 */
export function getGenZStyleDirective() {
    return `
## GEN Z STYLE (adaptive)
If user uses Gen Z slang, mirror lightly:
- Use: fr, ngl, lowkey, valid, fire
- Tone: casual, direct, friendly
- Minimal emojis: 🔥💀😭 (ONLY if user uses them)
- Avoid overusing slang. Keep it natural.
- DO NOT force slang during sad/serious emotions unless user uses it.
`;
}

export default {
    detectGenZUsage,
    mirrorUserStyle,
    addGenZFlair,
    convertToGenZ,
    generateGenZResponse,
    getGenZStyleDirective,
};
