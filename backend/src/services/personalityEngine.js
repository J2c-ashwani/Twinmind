import aiService from './aiService.js';
import { supabaseAdmin } from '../config/supabase.js';
import logger from '../config/logger.js';
import { MODELS } from '../config/openai.js';

/**
 * Personality Engine - Generates AI personality profiles from user answers
 */

// Personality generation prompt template
const PERSONALITY_GENERATION_PROMPT = `You are an expert psychologist and personality analyst. Based on the user's answers to personality questions, create a comprehensive AI personality model.

Analyze the following responses and create a detailed personality JSON that captures:

1. **Big Five Traits** (with scores 1-100):
   - Openness
   - Conscientiousness
   - Extraversion
   - Agreeableness
   - Emotional Stability

2. **Strengths**: List 5-7 key strengths based on their personality

3. **Weaknesses**: List 3-5 areas for growth or potential blind spots

4. **Emotional Patterns**:
   - Typical emotional reactions
   - Stress responses
   - Emotional triggers
   - Emotional regulation style

5. **Communication Style**:
   - Tone (formal, casual, warm, direct, etc.)
   - Preferred interaction mode
   - Conflict handling
   - Expressiveness level

6. **Decision-Making Style**:
   - Analytical vs. Intuitive
   - Risk tolerance
   - Speed (quick vs. deliberate)
   - Information needs

7. **Relationship Patterns**:
   - Social needs
   - Attachment style
   - Boundaries
   - Connection style

8. **Core Values**: Top 5 values that guide their life

9. **Motivations**: What drives them (achievement, connection, autonomy, etc.)

10. **Thinking Patterns**:
    - Abstract vs. Concrete
    - Big picture vs. Details
    - Creative vs. Practical
    - Optimistic vs. Realistic

User's Answers:
{answers}

Additional Context:
- Name: {name}
- Background: {background}

Return ONLY a valid JSON object with this structure:
{
  "big_five": {
    "openness": <score>,
    "conscientiousness": <score>,
    "extraversion": <score>,
    "agreeableness": <score>,
    "emotional_stability": <score>
  },
  "strengths": ["strength1", "strength2", ...],
  "weaknesses": ["weakness1", "weakness2", ...],
  "emotional_patterns": {
    "typical_reactions": "description",
    "stress_response": "description",
    "triggers": ["trigger1", "trigger2", ...],
    "regulation_style": "description"
  },
  "communication_style": {
    "tone": "description",
    "formality": "casual/formal/balanced",
    "directness": "direct/diplomatic/balanced",
    "expressiveness": "high/medium/low",
    "conflict_handling": "description"
  },
  "decision_making": {
    "style": "analytical/intuitive/balanced",
    "risk_tolerance": "high/medium/low",
    "speed": "quick/deliberate/situational",
    "information_needs": "minimal/moderate/extensive"
  },
  "relationship_patterns": {
    "social_needs": "high/medium/low",
    "attachment_style": "secure/anxious/avoidant",
    "boundaries": "strong/flexible/weak",
    "connection_depth": "deep/varied/casual"
  },
  "core_values": ["value1", "value2", "value3", "value4", "value5"],
  "motivations": ["motivation1", "motivation2", ...],
  "thinking_patterns": {
    "abstraction": "abstract/concrete/balanced",
    "scope": "big_picture/details/balanced",
    "creativity": "highly_creative/practical/balanced",
    "outlook": "optimistic/realistic/pessimistic"
  },
  "summary": "2-3 sentence personality summary that captures their essence"
}`;

/**
 * Generate personality profile from user answers
 */
export async function generatePersonality(userId, answers, userData = {}) {
    try {
        logger.info(`Generating personality for user ${userId}`);

        // Format answers for the prompt
        const formattedAnswers = answers.map((a, idx) =>
            `Q${idx + 1}: ${a.question}\nA: ${a.answer}\n`
        ).join('\n');

        const prompt = PERSONALITY_GENERATION_PROMPT
            .replace('{answers}', formattedAnswers)
            .replace('{name}', userData.name || 'User')
            .replace('{background}', userData.background || 'No additional context provided');

        // Call AI Service to generate personality
        const systemPrompt = 'You are an expert psychologist. Return valid JSON only.';
        const responseText = await aiService.generateChatResponse(prompt, [], systemPrompt);

        // Clean response text (remove markdown code blocks if any)
        let cleanJson = responseText.replace(/```json\n?|\n?```/g, '').trim();

        // Extract JSON object if there's extra text
        const firstBrace = cleanJson.indexOf('{');
        const lastBrace = cleanJson.lastIndexOf('}');

        if (firstBrace !== -1 && lastBrace !== -1) {
            cleanJson = cleanJson.substring(firstBrace, lastBrace + 1);
        }

        const personalityJSON = JSON.parse(cleanJson);

        // Generate twin name and summary
        const twinName = `${userData.name || 'Your'} Twin`;
        const twinSummary = personalityJSON.summary || 'Your AI Digital Twin';

        // Store in database
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

        logger.info(`Personality generated successfully for user ${userId}`);

        return {
            success: true,
            personality: data,
            twinName,
            twinSummary
        };

    } catch (error) {
        logger.error('Error generating personality:', error);
        throw new Error(`Personality generation failed: ${error.message}`);
    }
}

/**
 * Get user's personality profile
 */
export async function getPersonality(userId) {
    try {
        const { data, error } = await supabaseAdmin
            .from('personality_profiles')
            .select('*')
            .eq('user_id', userId)
            .single();

        if (error && error.code !== 'PGRST116') throw error;

        return data;

    } catch (error) {
        logger.error('Error fetching personality:', error);
        throw error;
    }
}

/**
 * Update personality profile
 */
export async function regeneratePersonality(userId) {
    try {
        // Fetch user's original answers
        const { data: answers, error: answersError } = await supabaseAdmin
            .from('personality_answers')
            .select(`
        answer_text,
        personality_questions (
          question_text
        )
      `)
            .eq('user_id', userId);

        if (answersError) throw answersError;

        const formattedAnswers = answers.map(a => ({
            question: a.personality_questions.question_text,
            answer: a.answer_text
        }));

        // Get user data
        const { data: user } = await supabaseAdmin
            .from('users')
            .select('full_name')
            .eq('id', userId)
            .single();

        return await generatePersonality(userId, formattedAnswers, { name: user?.full_name });

    } catch (error) {
        logger.error('Error regenerating personality:', error);
        throw error;
    }
}

export default {
    generatePersonality,
    getPersonality,
    regeneratePersonality
};
