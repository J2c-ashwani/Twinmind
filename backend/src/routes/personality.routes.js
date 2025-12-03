import express from 'express';
import { authenticateUser } from '../middleware/authMiddleware.js';
import { generatePersonality, getPersonality, regeneratePersonality } from '../services/personalityEngine.js';
import { supabaseAdmin } from '../config/supabase.js';
import { logger } from '../config/logger.js';

const router = express.Router();

/**
 * GET /api/personality/questions
 * Get all personality questions for the quiz
 */
router.get('/questions', async (req, res) => {
    // Mock questions for dev mode
    const mockQuestions = [
        { id: 1, question_text: "What's your name?", question_type: "text", options_json: null, screen_number: 1, allow_other: false, question_order: 1 },
        { id: 2, question_text: "How old are you?", question_type: "number", options_json: null, screen_number: 1, allow_other: false, question_order: 2 },
        { id: 3, question_text: "What describes you best?", question_type: "multiple_choice", options_json: ["Introvert", "Extrovert", "Ambivert"], screen_number: 2, allow_other: true, question_order: 3 },
        { id: 4, question_text: "What are your main interests?", question_type: "multiple_select", options_json: ["Technology", "Arts", "Sports", "Music", "Reading", "Travel"], screen_number: 2, allow_other: true, question_order: 4 },
        { id: 5, question_text: "How do you handle stress?", question_type: "text", options_json: null, screen_number: 3, allow_other: false, question_order: 5 },
        { id: 6, question_text: "What motivates you?", question_type: "text", options_json: null, screen_number: 3, allow_other: false, question_order: 6 },
        { id: 7, question_text: "Describe your ideal day", question_type: "text", options_json: null, screen_number: 4, allow_other: false, question_order: 7 },
        { id: 8, question_text: "What are your core values?", question_type: "multiple_select", options_json: ["Honesty", "Creativity", "Ambition", "Kindness", "Independence", "Family"], screen_number: 4, allow_other: true, question_order: 8 },
        { id: 9, question_text: "How do you make decisions?", question_type: "multiple_choice", options_json: ["Logic and analysis", "Gut feeling", "Consulting others", "Mix of all"], screen_number: 5, allow_other: false, question_order: 9 },
        { id: 10, question_text: "What's your biggest goal?", question_type: "text", options_json: null, screen_number: 5, allow_other: false, question_order: 10 }
    ];

    try {
        const { data, error } = await supabaseAdmin
            .from('personality_questions')
            .select('*')
            .order('question_order', { ascending: true });

        // If we have valid data from Supabase, return it
        if (!error && data && data.length > 0) {
            return res.json({ questions: data });
        }

        // Otherwise return mock questions
        logger.info('Returning mock questions (Supabase unavailable or empty)');
        return res.json({ questions: mockQuestions });

    } catch (error) {
        // If Supabase connection fails, return mock questions
        logger.warn('Supabase connection failed, using mock questions:', error.message);
        return res.json({ questions: mockQuestions });
    }
});

/**
 * POST /api/personality/submit-answers
 * Submit personality questionnaire answers
 */
router.post('/submit-answers', authenticateUser, async (req, res) => {
    try {
        const { answers } = req.body; // Array of { question_id, selected_option?, answer_text? }
        const userId = req.userId;

        if (!answers || !Array.isArray(answers)) {
            return res.status(400).json({ error: 'Invalid answers format' });
        }

        // Store answers in database
        const answersToInsert = answers.map(a => ({
            user_id: userId,
            question_id: a.question_id,
            selected_option: a.selected_option || null,
            answer_text: a.answer_text || null,
            answer_score: a.answer_score || null
        }));

        const { error } = await supabaseAdmin
            .from('personality_answers')
            .upsert(answersToInsert, { onConflict: 'user_id,question_id' });

        if (error) throw error;

        res.json({
            success: true,
            message: 'Answers saved successfully'
        });

    } catch (error) {
        logger.error('Error submitting answers:', error);
        res.status(500).json({ error: 'Failed to save answers' });
    }
});

/**
 * POST /api/personality/generate
 * Generate personality profile from answers
 */
router.post('/generate', authenticateUser, async (req, res) => {
    try {
        const userId = req.userId;

        // Fetch user's answers with questions
        const { data: answerData, error: fetchError } = await supabaseAdmin
            .from('personality_answers')
            .select(`
        selected_option,
        answer_text,
        personality_questions (
          question_text
        )
      `)
            .eq('user_id', userId);

        if (fetchError) throw fetchError;

        if (!answerData || answerData.length === 0) {
            return res.status(400).json({
                error: 'No answers found. Please complete the questionnaire first.'
            });
        }

        // Get user data
        const { data: user } = await supabaseAdmin
            .from('users')
            .select('full_name, email')
            .eq('id', userId)
            .single();

        // Format answers - combine selected_option and answer_text
        const formattedAnswers = answerData.map(a => ({
            question: a.personality_questions.question_text,
            answer: a.selected_option ?
                (a.answer_text ? `${a.selected_option} (${a.answer_text})` : a.selected_option) :
                a.answer_text
        }));

        // Generate personality
        const result = await generatePersonality(userId, formattedAnswers, {
            name: user?.full_name,
            email: user?.email
        });

        res.json(result);

    } catch (error) {
        logger.error('Error generating personality:', error);
        res.status(500).json({ error: error.message || 'Failed to generate personality' });
    }
});

/**
 * GET /api/personality/profile
 * Get user's personality profile
 */
router.get('/profile', authenticateUser, async (req, res) => {
    try {
        const userId = req.userId;
        const personality = await getPersonality(userId);

        if (!personality) {
            return res.status(404).json({
                error: 'Personality profile not found. Please complete the assessment.'
            });
        }

        res.json({ personality });

    } catch (error) {
        logger.error('Error fetching personality:', error);
        res.status(500).json({ error: 'Failed to fetch personality profile' });
    }
});

/**
 * POST /api/personality/regenerate
 * Regenerate personality profile
 */
router.post('/regenerate', authenticateUser, async (req, res) => {
    try {
        const userId = req.userId;
        const result = await regeneratePersonality(userId);

        res.json(result);

    } catch (error) {
        logger.error('Error regenerating personality:', error);
        res.status(500).json({ error: error.message || 'Failed to regenerate personality' });
    }
});

export default router;
