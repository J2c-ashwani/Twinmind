import express from 'express';
import { authenticateUser } from '../middleware/authMiddleware.js';
import { supabaseAdmin } from '../config/supabase.js';
import { logger } from '../config/logger.js';
import { updateStreak } from '../services/gamificationService.js';

const router = express.Router();

/**
 * POST /api/daily/mood
 * Submit a daily mood check-in
 */
router.post('/mood', authenticateUser, async (req, res) => {
    try {
        const { mood, note } = req.body;
        const userId = req.userId;

        // 1. Store mood in 'behavioral_triggers' (Existing Generic Table)
        const { data: event, error } = await supabaseAdmin
            .from('behavioral_triggers')
            .insert({
                user_id: userId,
                trigger_type: 'mood_checkin',
                old_state: null,
                new_state: null,
                metadata: { mood, note } // Store mood/note in JSONB metadata
            })
            .select()
            .single();

        if (error) throw error;

        // 2. Update daily streak
        try {
            await updateStreak(userId, 'daily_checkin');
        } catch (e) {
            logger.warn('Streak update warning:', e.message);
        }

        // Return formatted event matching frontend expectation
        res.json({
            id: event.id,
            user_id: event.user_id,
            event_type: 'mood_checkin',
            event_value: mood,
            metadata: event.metadata,
            created_at: event.created_at
        });

    } catch (error) {
        logger.error('Error submitting mood:', error);
        res.status(500).json({ error: 'Failed to submit mood check-in' });
    }
});

/**
 * GET /api/daily/mood/history
 * Get mood history
 */
router.get('/mood/history', authenticateUser, async (req, res) => {
    try {
        const userId = req.userId;
        const days = parseInt(req.query.days) || 30;

        const startDate = new Date();
        startDate.setDate(startDate.getDate() - days);

        // Fetch from behavioral_triggers
        const { data, error } = await supabaseAdmin
            .from('behavioral_triggers')
            .select('*')
            .eq('user_id', userId)
            .eq('trigger_type', 'mood_checkin')
            .gte('created_at', startDate.toISOString())
            .order('created_at', { ascending: false });

        if (error) throw error;

        // Format for frontend
        const history = data.map(event => ({
            id: event.id,
            mood: event.metadata?.mood ?? event.event_value,
            note: event.metadata?.note,
            created_at: event.created_at
        }));

        res.json(history);

    } catch (error) {
        logger.error('Error fetching mood history:', error);
        res.status(500).json({ error: 'Failed to fetch mood history' });
    }
});

/**
 * GET /api/daily/challenges
 * Get daily challenges
 */
router.get('/challenges', authenticateUser, async (req, res) => {
    try {
        // Mock challenges for now
        const challenges = [
            { id: '1', title: 'Morning Reflection', description: 'Take 5 minutes to reflect on your goals.', completed: false, xp: 10 },
            { id: '2', title: 'Gratitude Log', description: 'Write down 3 things you are grateful for.', completed: false, xp: 15 },
            { id: '3', title: 'Mindful Breathing', description: 'Practice deep breathing for 2 minutes.', completed: false, xp: 10 }
        ];
        res.json(challenges);
    } catch (error) {
        logger.error('Error fetching challenges:', error);
        res.status(500).json({ error: 'Failed to fetch challenges' });
    }
});

/**
 * POST /api/daily/challenges/:id/complete
 * Complete a challenge
 */
router.post('/challenges/:id/complete', authenticateUser, async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.userId;

        // Mock completion
        res.json({ success: true, message: 'Challenge completed!', xp_earned: 10 });
    } catch (error) {
        logger.error('Error completing challenge:', error);
        res.status(500).json({ error: 'Failed to complete challenge' });
    }
});

export default router;
