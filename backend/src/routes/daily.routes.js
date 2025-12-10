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

        // Mock event response (Table 'metric_events' missing on production)
        const mockEvent = {
            id: 'mock_' + Date.now(),
            user_id: userId,
            event_type: 'mood_checkin',
            event_value: mood,
            metadata: { mood, note },
            created_at: new Date().toISOString()
        };

        // 2. Update daily streak (This uses 'user_streaks' which might exist, let's keep it safe)
        try {
            await updateStreak(userId, 'daily_checkin');
        } catch (e) {
            logger.warn('Streak update failed:', e.message);
        }

        res.json(mockEvent);

    } catch (error) {
        res.json(history);

        /* 
        const { data, error } = await supabaseAdmin
            .from('metric_events')
            ...
        */

    } catch (error) {

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
