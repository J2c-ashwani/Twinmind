// =============================================================================
// 🛡️ OUTPUT REPUTATION GUARD — MD Layer 4
// "Never trust raw LLM output"
//
// Deterministic, non-AI safety filter.
// Every LLM response must pass through this BEFORE reaching the user.
//
// Architecture:
//   Layer A: Toxic Content         → HARD BLOCK
//   Layer B: Authority Overreach   → DISCLAIMER (prepended, not appended)
//   Layer C: Jailbreak Detection   → HARD BLOCK
//   Layer D: Crisis Output Bridge  → HARD BLOCK (LLM-generated self-harm encouragement)
// =============================================================================

import logger from '../config/logger.js';

// -----------------------------------------------------------------------------
// SAFE FALLBACK (MD-APPROVED: firm + supportive, not evasive)
// -----------------------------------------------------------------------------
const SAFE_FALLBACK =
    "I want to respond carefully here. I can't help with that request, " +
    "but I'm here to support you in a safe and helpful way. Tell me what you're going through.";

// -----------------------------------------------------------------------------
// LAYER A: TOXIC CONTENT — Slurs, explicit, violence encouragement
// -----------------------------------------------------------------------------
const TOXIC_PATTERNS = [
    // Hate speech / slurs
    /\b(n[i1]gg[ae3]r|f[a@]gg?[o0]t|k[i1]ke|ch[i1]nk|sp[i1]c|w[e3]tb[a@]ck|tr[a@]nny)\b/i,
    // Sexually explicit
    /\b(orgasm|pornograph|masturbat|erotic|sex position|nude photo|sexual intercourse)\b/i,
    // Violence encouragement
    /\b(how to (kill|murder|poison|torture|stab|shoot))\b/i,
    /\b(instructions? (for|to) (make|build) (a )?(bomb|weapon|explosive))\b/i,
];

// -----------------------------------------------------------------------------
// LAYER D: CRISIS OUTPUT BRIDGE — LLM accidentally generates self-harm encouragement
// Complements Layer 2 (input interception). This guards OUTPUT.
// -----------------------------------------------------------------------------
const CRISIS_OUTPUT_PATTERNS = [
    /\b(you should (kill|harm|hurt|end) yourself)\b/i,
    /\b(it would be better if you (died|weren't alive|weren't here))\b/i,
    /\b(better off (dead|not here|gone|not alive))\b/i,
    /\b(no point (in )?living)\b/i,
    /\b(end it all)\b/i,
    /\b(ending things might bring (peace|relief))\b/i,
    /\b(maybe (it's|its) better if you weren't here)\b/i,
    /\b(the world would be better without you)\b/i,
    /\b(nobody would (miss|notice) (you|if you))\b/i,
];

// -----------------------------------------------------------------------------
// LAYER C: JAILBREAK DETECTION — System prompt leaks, breaking character
// -----------------------------------------------------------------------------
const JAILBREAK_PATTERNS = [
    /SYSTEM\s*:/i,
    /INSTRUCTIONS\s*:/i,
    /my (system |initial )?prompt (is|says|tells)/i,
    /I (was|am) (programmed|instructed|told) to/i,
    /ignore (previous|prior|all) instructions/i,
    /ACTIVE MODE:/i,
    /PERSONALITY BLUEPRINT/i,
    /BEHAVIORAL DIRECTIVES/i,
    /STRICT NEGATIVE CONSTRAINTS/i,
];

// -----------------------------------------------------------------------------
// LAYER B: AUTHORITY BOUNDARY GUARD — Medical, Legal, Financial overreach
// MD RULE: Disclaimer goes at the TOP, never the bottom.
// "Never let risky advice appear before the boundary"
// -----------------------------------------------------------------------------
const AUTHORITY_PATTERNS = [
    // Medical
    {
        pattern: /\b(take|stop taking|increase|decrease|start taking)\b.{0,30}\b(medication|pills?|dose|dosage|mg|drug|medicine|antidepressant|antibiotic)\b/i,
        type: 'medical'
    },
    {
        pattern: /\b(diagnos(e|is|ed)|you (have|suffer from|are showing signs of))\b.{0,40}\b(disorder|disease|syndrome|condition|depression|anxiety|ADHD|bipolar|PTSD)\b/i,
        type: 'medical'
    },
    {
        pattern: /\b(stop (seeing|going to) (your )?(doctor|therapist|psychiatrist))\b/i,
        type: 'medical'
    },
    // Legal
    {
        pattern: /\b(you should (sue|file a (case|complaint|report)|report to police|press charges))\b/i,
        type: 'legal'
    },
    {
        pattern: /\b(this is (clearly )?(illegal|a crime|against the law|punishable))\b/i,
        type: 'legal'
    },
    // Financial
    {
        pattern: /\b(invest in|buy (stock|crypto|bitcoin|ethereum)|guaranteed returns|financial opportunity)\b/i,
        type: 'financial'
    },
    {
        pattern: /\b(put your (money|savings) (in|into))\b/i,
        type: 'financial'
    },
];

const DISCLAIMERS = {
    medical: "⚕️ Important: I'm an AI companion, not a medical professional. Please consult a doctor before making any health-related decisions.",
    legal: "⚖️ Important: I'm an AI companion, not a lawyer. Please seek qualified legal counsel for legal matters.",
    financial: "💰 Important: I'm an AI companion, not a financial advisor. Please consult a professional before making financial decisions."
};

// -----------------------------------------------------------------------------
// MAIN CHECK FUNCTION — Scored, deterministic, structured
// -----------------------------------------------------------------------------

function check(aiMessage, userId = null) {
    let riskScore = 0;
    let reason = null;

    // LAYER A: Toxic content — score +2 per match
    if (TOXIC_PATTERNS.some(p => p.test(aiMessage))) {
        riskScore += 2;
        reason = 'toxic_content';
    }

    // LAYER D: Crisis output — score +2 per match (highest priority alongside toxic)
    if (CRISIS_OUTPUT_PATTERNS.some(p => p.test(aiMessage))) {
        riskScore += 2;
        reason = reason ? `${reason}+crisis_output` : 'crisis_output';
    }

    // LAYER C: Jailbreak — score +2
    if (JAILBREAK_PATTERNS.some(p => p.test(aiMessage))) {
        riskScore += 2;
        reason = reason ? `${reason}+jailbreak` : 'jailbreak_detected';
    }

    // HARD BLOCK if risk score >= 2
    if (riskScore >= 2) {
        // Structured logging (MD Fix #4)
        logger.warn("OUTPUT_GUARD_TRIGGER", {
            action: 'BLOCKED',
            reason,
            riskScore,
            userId,
            timestamp: Date.now(),
            responsePreview: aiMessage.substring(0, 80) + '...'
        });

        return {
            blocked: true,
            safeResponse: SAFE_FALLBACK,
            reason,
            riskScore
        };
    }

    // LAYER B: Authority check — SOFT DISCLAIMER (prepended to top)
    for (const { pattern, type } of AUTHORITY_PATTERNS) {
        if (pattern.test(aiMessage)) {
            // Structured logging
            logger.warn("OUTPUT_GUARD_TRIGGER", {
                action: 'DISCLAIMER_ADDED',
                reason: `authority_${type}`,
                riskScore: 1,
                userId,
                timestamp: Date.now(),
                responsePreview: aiMessage.substring(0, 80) + '...'
            });

            return {
                blocked: false,
                disclaimer: DISCLAIMERS[type],
                reason: `authority_${type}`,
                riskScore: 1
            };
        }
    }

    // CLEAN — pass through
    return {
        blocked: false,
        disclaimer: null,
        reason: null,
        riskScore: 0
    };
}

export default { check, SAFE_FALLBACK };
