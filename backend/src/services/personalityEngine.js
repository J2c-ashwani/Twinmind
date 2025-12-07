// personalityEngine.js (Fully rewritten & optimized)

import aiService from './aiService.js';
import { supabaseAdmin } from '../config/supabase.js';
import logger from '../config/logger.js';
import { MODELS } from '../config/openai.js';

/**
 * ================================
 * PERSONALITY GENERATION PROMPT
 * ================================
 * Produces a fully structured JSON personality model.
 */
const PERSONALITY_GENERATION_PROMPT = `
You are an expert psychologist and personality analyst. Based on the user's answers below, create a deeply accurate AI personality model.

Analyze the answers and output a JSON with the following structure:

{
  "big_five": {
    "openness": <1-100>,
    "conscientiousness": <1-100>,
    "extraversion": <1-100>,
    "agreeableness": <1-100>,
    "emotional_stability": <1-100>
  },
  "strengths": [...],
  "weaknesses": [...],
  "emotional_patterns": {
    "typical_reactions": "",
    "stress_response": "",
    "triggers": [...],
    "regulation_style": ""
  },
  "communication_style": {
    "tone": "",
    "formality": "",
    "directness": "",
    "expressiveness": "",
    "conflict_handling": ""
  },
  "decision_making": {
    "style": "",
    "risk_tolerance": "",
    "speed": "",
    "information_needs": ""
  },
  "relationship_patterns": {
    "social_needs": "",
    "attachment_style": "",
    "boundaries": "",
    "connection_depth": ""
  },
  "core_values": [...],
  "motivations": [...],
  "thinking_patterns": {
    "abstraction": "",
    "scope": "",
    "creativity": "",
    "outlook": ""
  },
  "summary": "A short 2-3 sentence essence summary."
}

⚠️ Return ONLY valid JSON. No commentary, no markdown.

User's Answers:
{answers}

Additional Context:
Name: {name}
Background: {background}
`;

/**
 * ============================
 * GENERATE PERSONALITY PROFILE
 * ============================
 */
export async function generatePersonality(userId, answers, userData = {}) {
    try {
        logger.info(`🧠 Generating personality for user ${userId}`);

        // Format user answers
        const formattedAnswers = answers
            .map((a, i) => `Q${i + 1}: ${a.question}\nA: ${a.answer}`)
            .join('\n\n');

        const prompt = PERSONALITY_GENERATION_PROMPT
            .replace('{answers}', formattedAnswers)
            .replace('{name}', userData.name || 'User')
            .replace('{background}', userData.background || 'Not provided');

        const systemPrompt = "You are an expert psychologist. Return valid JSON only.";

        // IMPORTANT: aiService expects: (prompt, conversationHistory, systemPrompt)
        // Wait, aiService new signature is generateChatResponse(userMessage, history, systemPrompt)
        // Or generateChatResponse(messagesArray...) ?
        // aiService.js has: async generateChatResponse(userMessage, conversationHistory = [], systemPrompt = '', taskType = 'default')
        // So passing (prompt, [], systemPrompt) is correct for the main entry point logic.
        const rawResponse = await aiService.generateChatResponse(prompt, [], systemPrompt, 'personality_core');

        // Note: aiService returns an object { provider, text, raw } OR just text if older version?
        // New aiService returns { provider, text, raw }.
        // BUT wait, aiService.js I wrote earlier returns an object:
        // return { provider: provider.name, text: cleaned, raw };
        // So rawResponse.text is what we want.

        let finalText = rawResponse.text || rawResponse; // Handle both object and string just in case
        if (typeof finalText !== 'string') finalText = JSON.stringify(finalText);

        // --- CLEAN JSON ---
        let clean = finalText.replace(/```json|```/gi, '').trim();

        const first = clean.indexOf('{');
        const last = clean.lastIndexOf('}');
        if (first !== -1 && last !== -1) {
            clean = clean.substring(first, last + 1);
        }

        const personalityJSON = JSON.parse(clean);

        const twinName = `${userData.name || 'Your'} Twin`;
        const twinSummary = personalityJSON.summary || 'Your AI Digital Twin';

        // --- UPSERT personality profile ---
        const { data, error } = await supabaseAdmin
            .from('personality_profiles')
            .upsert({
                user_id: userId,
                personality_json: personalityJSON,
                twin_name: twinName,
                twin_summary: twinSummary,
                generation_prompt: prompt,
                ai_model: MODELS.CHAT,
                updated_at: new Date().toISOString()
            })
            .select()
            .single();

        if (error) throw error;

        logger.info(`✅ Personality generated and saved for user ${userId}`);

        return {
            success: true,
            personality: data,
            twinName,
            twinSummary
        };

    } catch (error) {
        logger.error('❌ Personality generation failed:', error);
        throw new Error(`Personality generation failed: ${error.message}`);
    }
}

/**
 * ============================
 * GET PERSONALITY PROFILE
 * ============================
 */
export async function getPersonality(userId) {
    try {
        const { data, error } = await supabaseAdmin
            .from('personality_profiles')
            .select('*')
            .eq('user_id', userId)
            .single();

        if (error && error.code !== 'PGRST116') throw error;

        return data || null;
    } catch (error) {
        logger.error('❌ Error fetching personality:', error);
        throw error;
    }
}

/**
 * ============================
 * REGENERATE PERSONALITY
 * ============================
 */
export async function regeneratePersonality(userId) {
    try {
        // 1. Fetch original answers
        const { data: answers, error: answersError } = await supabaseAdmin
            .from('personality_answers')
            .select(`
                answer_text,
                personality_questions(question_text)
            `)
            .eq('user_id', userId);

        if (answersError) throw answersError;

        const formatted = answers.map(a => ({
            question: a.personality_questions.question_text,
            answer: a.answer_text
        }));

        // 2. Fetch user info
        const { data: user } = await supabaseAdmin
            .from('users')
            .select('full_name')
            .eq('id', userId)
            .single();

        // 3. Regenerate
        return await generatePersonality(userId, formatted, { name: user?.full_name });

    } catch (error) {
        logger.error('❌ Error regenerating personality:', error);
        throw error;
    }
}

export default {
    generatePersonality,
    getPersonality,
    regeneratePersonality
};
