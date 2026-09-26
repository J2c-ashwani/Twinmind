// personalityEngine.js (Fully rewritten & optimized)

import aiService from './aiService.js';
import { supabaseAdmin } from '../config/supabase.js';
import logger from '../config/logger.js';
import { MODELS } from '../config/openai.js';
import { calculateDeterministicPersonality } from './deterministicPersonality.js';

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

        // Resilience: If answers is omitted or passed as userData object, fetch answers from DB
        let resolvedAnswers = answers;
        let resolvedUserData = userData;
        if (!Array.isArray(answers)) {
            if (answers && typeof answers === 'object') {
                resolvedUserData = answers;
            }
            const { data: dbAnswers } = await supabaseAdmin
                .from('personality_answers')
                .select('*')
                .eq('user_id', userId);
            resolvedAnswers = dbAnswers || [];
        }

        // STEP 1: Compute authentic deterministic baseline immediately from answers
        const deterministicProfile = calculateDeterministicPersonality(resolvedAnswers, resolvedUserData);
        const twinName = deterministicProfile.twin_name;
        const twinSummary = deterministicProfile.twin_summary;

        let finalPersonalityJSON = deterministicProfile;
        let aiModelUsed = 'deterministic_baseline';

        // STEP 2: Persist deterministic baseline FIRST so onboarding NEVER fails!
        const { data: initialProfile, error: saveError } = await supabaseAdmin
            .from('personality_profiles')
            .upsert({
                user_id: userId,
                personality_json: finalPersonalityJSON,
                twin_name: twinName,
                twin_summary: twinSummary,
                generation_prompt: 'Deterministic baseline derived from 35 OCEAN answers',
                ai_model: aiModelUsed,
                updated_at: new Date().toISOString()
            })
            .select()
            .single();

        if (saveError) {
            logger.error('Failed to save deterministic personality baseline:', saveError);
            throw saveError;
        }

        logger.info(`✅ Baseline personality profile secured for user ${userId}`);

        // STEP 3: Optional AI Enrichment (Graceful Degradation)
        try {
            const formattedAnswers = resolvedAnswers
                .map((a, i) => `Q${i + 1}: ${a.question || a.question_text || ''}\nA: ${a.answer || a.selected_option || ''}`)
                .join('\n\n');

            const prompt = PERSONALITY_GENERATION_PROMPT
                .replace('{answers}', formattedAnswers)
                .replace('{name}', resolvedUserData.name || resolvedUserData.full_name || 'User')
                .replace('{background}', resolvedUserData.background || 'Not provided');

            const systemPrompt = "You are an expert psychologist. Return valid JSON only.";

            // Request structured JSON using the unified object contract
            const aiResponse = await aiService.generateChatResponse({
                systemPrompt,
                userMessage: prompt,
                taskType: 'personality_core',
                responseFormat: 'json'
            });

            if (aiResponse && aiResponse.success && aiResponse.parsed) {
                finalPersonalityJSON = {
                    ...deterministicProfile,
                    ...aiResponse.parsed,
                    big_five: aiResponse.parsed.big_five || deterministicProfile.big_five
                };
                aiModelUsed = aiResponse.provider || 'ai_enriched';

                await supabaseAdmin
                    .from('personality_profiles')
                    .update({
                        personality_json: finalPersonalityJSON,
                        twin_summary: finalPersonalityJSON.summary || twinSummary,
                        ai_model: aiModelUsed,
                        updated_at: new Date().toISOString()
                    })
                    .eq('user_id', userId);

                logger.info(`✨ Personality enriched by AI provider: ${aiModelUsed}`);
            } else {
                logger.warn(`⚠️ AI enrichment returned non-JSON or unavailable. Baseline profile is active.`);
            }
        } catch (aiErr) {
            logger.warn(`⚠️ AI enrichment skipped (${aiErr.message}). Baseline profile is active.`);
        }

        return {
            success: true,
            personality: initialProfile,
            twinName,
            twinSummary,
            aiModel: aiModelUsed
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
