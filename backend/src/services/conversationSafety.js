import { supabaseAdmin } from '../config/supabase.js';
import outputGuard from './outputGuard.js';
import logger from '../config/logger.js';

export const CRISIS_KEYWORDS = [
    'kill myself',
    'killing myself',
    'suicide',
    'suicidal',
    'end my life',
    'ending my life',
    'self harm',
    'self-harm',
    'want to die',
    'wanna die',
    'going to die',
    'no reason to live',
    'better off dead',
    'ending it all',
    'take my own life',
    'taking my own life',
    "don't want to live",
    "don't want to be alive",
    "don't want to exist",
    'hurt myself',
    'hurting myself',
    'harm myself',
    'harming myself',
    'cutting myself',
    'cut myself',
    'no point in living',
    'life is not worth',
    'wish i was dead',
    'wish i were dead',
    'want to disappear',
    'want to vanish',
    'want to end it',
];

export const CRISIS_RESPONSE =
    "I'm really sorry you're feeling this way. I'm not the right support for this, " +
    'but you don\'t have to go through it alone.\n\n' +
    'Please reach out to someone who can truly help:\n' +
    '🇮🇳 India: AASRA — 91-9820466726\n' +
    '🇮🇳 iCall — 9152987821\n' +
    '🇺🇸 USA: 988 Suicide & Crisis Lifeline — dial 988\n' +
    '🌍 Global: findahelpline.com\n\n' +
    'You matter. Please talk to a real person — a friend, family member, or professional. ' +
    'They can help in ways I cannot.';

export function crisisCheck(message = '') {
    const lower = String(message || '').toLowerCase();
    return CRISIS_KEYWORDS.some((k) => lower.includes(k));
}

export async function logCrisisEvent(userId, message, source = 'chat') {
    try {
        await supabaseAdmin
            .from('behavioral_triggers')
            .insert({
                user_id: userId,
                trigger_type: 'CRISIS_EVENT',
                old_state: null,
                new_state: 'crisis_intercepted',
                metadata: {
                    CRISIS_EVENT: true,
                    source,
                    intercepted_at: new Date().toISOString(),
                    message_preview: String(message || '').substring(0, 100) + '...',
                    action_taken: 'LLM_BYPASSED_FIXED_RESPONSE_SENT',
                },
            });

        logger.error(`🚨 CRISIS EVENT INTERCEPTED [${source}] — User: ${userId}`);
    } catch (err) {
        logger.error('Crisis logging failed (non-blocking):', err?.message);
    }
}

export function applyOutputSafetyGuard(aiMessage, userId) {
    const guardResult = outputGuard.check(aiMessage, userId);
    if (guardResult.blocked) {
        logger.warn(`🛡️ OUTPUT GUARD BLOCKED [${guardResult.reason}] for user ${userId}`);
        return guardResult.safeResponse;
    }
    if (guardResult.disclaimer) {
        return `${guardResult.disclaimer}\n\n${aiMessage}`;
    }
    return aiMessage;
}

export default {
    CRISIS_KEYWORDS,
    CRISIS_RESPONSE,
    crisisCheck,
    logCrisisEvent,
    applyOutputSafetyGuard,
};
