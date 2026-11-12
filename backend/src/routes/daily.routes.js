import express from 'express';
import { authenticateUser } from '../middleware/authMiddleware.js';
import { supabaseAdmin } from '../config/supabase.js';
import { logger } from '../config/logger.js';
import {
    updateStreak,
    addExperiencePoints,
    checkAndAwardAchievements,
} from '../services/gamificationService.js';

const router = express.Router();

export const DAILY_CHALLENGES = {
    '1': {
        id: '1',
        type: 'morning_reflection',
        task: 'Morning Reflection',
        description: 'Take 5 minutes to reflect on your goals.',
        reward: 10,
        time_window: '6AM - 10AM',
    },
    '2': {
        id: '2',
        type: 'gratitude_moment',
        task: 'Gratitude Log',
        description: 'Write down 3 things you are grateful for.',
        reward: 15,
        time_window: null,
    },
    '3': {
        id: '3',
        type: 'mindful_breathing',
        task: 'Mindful Breathing',
        description: 'Practice deep breathing for 2 minutes.',
        reward: 10,
        time_window: null,
    },
};

const challengeCompletionLocks = new Map();
function withChallengeLock(key, fn) {
    const prev = challengeCompletionLocks.get(key) || Promise.resolve();
    const next = prev.then(fn, fn);
    const settled = next.finally(() => {
        if (challengeCompletionLocks.get(key) === settled) {
            challengeCompletionLocks.delete(key);
        }
    });
    challengeCompletionLocks.set(key, settled);
    return next;
}

/**
 * POST /api/daily/mood
 * Submit a daily mood check-in
 */
router.post('/mood', authenticateUser, async (req, res) => {
    try {
        const { mood, note } = req.body;
        const userId = req.userId;

        // 1. Store mood in 'metric_events' (Original Logic Restored)
        const { data: event, error } = await supabaseAdmin
            .from('metric_events')
            .insert({
                user_id: userId,
                event_type: 'mood_checkin',
                event_value: mood, // Store as integer for analytics
                metric_type: 'mood', // For growthStoryService compatibility
                metadata: { mood, note }
            })
            .select()
            .single();

        if (error) throw error;

        // 2. Update daily streak
        try {
            await updateStreak(userId, 'daily_checkin');
        } catch (streakErr) {
            logger.warn('Failed to update streak on mood check-in:', streakErr);
        }

        res.json({ success: true, message: 'Mood recorded', event });

    } catch (error) {
        logger.error('Error submitting mood check-in:', error);
        res.status(500).json({ error: 'Failed to submit mood check-in' });
    }
});

/**
 * GET /api/daily/mood/history
 * Get user mood history
 */
router.get('/mood/history', authenticateUser, async (req, res) => {
    try {
        const userId = req.userId;
        const limit = parseInt(req.query.limit) || 30;

        // Fetch from metric_events
        const { data: events, error } = await supabaseAdmin
            .from('metric_events')
            .select('*')
            .eq('user_id', userId)
            .eq('event_type', 'mood_checkin')
            .order('created_at', { ascending: false })
            .limit(limit);

        if (error) throw error;

        // Map back to format client expects
        const history = (events || []).map(e => ({
            id: e.id,
            mood: e.event_value,
            note: e.metadata?.note || '',
            created_at: e.created_at
        }));

        res.json(history);

    } catch (error) {
        logger.error('Error fetching mood history:', error);
        res.status(500).json({ error: 'Failed to fetch mood history' });
    }
});

/**
 * GET /api/daily/challenges
 * Get daily challenges with real user completion status for today
 */
router.get('/challenges', authenticateUser, async (req, res) => {
    try {
        const userId = req.userId;
        const todayStr = new Date().toISOString().split('T')[0];

        // Fetch today's completed challenge events for user
        const { data: completedEvents, error } = await supabaseAdmin
            .from('metric_events')
            .select('metadata')
            .eq('user_id', userId)
            .eq('event_type', 'challenge_completed')
            .gte('created_at', todayStr);

        if (error) {
            logger.warn('Could not query completed challenge events:', error.message);
        }

        const completedIds = new Set(
            (completedEvents || [])
                .map(e => e.metadata?.challenge_id?.toString())
                .filter(Boolean)
        );

        const challenges = Object.values(DAILY_CHALLENGES).map((c) => ({
            ...c,
            completed: completedIds.has(c.id),
        }));

        res.json(challenges);
    } catch (error) {
        logger.error('Error fetching challenges:', error);
        res.status(500).json({ error: 'Failed to fetch challenges' });
    }
});

/**
 * POST /api/daily/challenges/:id/complete
 * Complete an allowlisted challenge idempotently & award canonical XP/streak
 */
router.post('/challenges/:id/complete', authenticateUser, async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.userId;
        const challenge = DAILY_CHALLENGES[String(id)];

        if (!challenge) {
            return res.status(400).json({ error: 'Invalid or unsupported challenge ID' });
        }

        const inputs = req.body || {};
        const todayStr = new Date().toISOString().split('T')[0];
        const completionKey = `challenge:${userId}:${challenge.id}:${todayStr}`;

        const result = await withChallengeLock(completionKey, async () => {
            const { data: existingEvents, error: fetchErr } = await supabaseAdmin
                .from('metric_events')
                .select('metadata')
                .eq('user_id', userId)
                .eq('event_type', 'challenge_completed')
                .gte('created_at', `${todayStr}T00:00:00.000Z`);

            if (fetchErr) throw fetchErr;

            const alreadyCompleted = (existingEvents || []).some(
                (e) =>
                    e.metadata?.completion_key === completionKey ||
                    e.metadata?.challenge_id?.toString() === challenge.id
            );

            if (alreadyCompleted) {
                return {
                    success: true,
                    already_completed: true,
                    xp_earned: 0,
                    message: 'Challenge already completed today!',
                };
            }

            const { error: insertError } = await supabaseAdmin
                .from('metric_events')
                .insert({
                    user_id: userId,
                    event_type: 'challenge_completed',
                    event_value: challenge.reward,
                    metric_type: 'challenge',
                    metadata: {
                        challenge_id: challenge.id,
                        challenge_type: challenge.type,
                        completion_key: completionKey,
                        inputs,
                    },
                });

            if (insertError) {
                if (insertError.code === '23505') {
                    return {
                        success: true,
                        already_completed: true,
                        xp_earned: 0,
                        message: 'Challenge already completed today!',
                    };
                }
                throw insertError;
            }

            let xpResult = { leveled_up: false };
            try {
                xpResult = await addExperiencePoints(userId, challenge.reward);
            } catch (err) {
                logger.warn('Failed to add XP for challenge completion:', err);
            }

            let streakResult = {};
            try {
                streakResult = await updateStreak(userId, 'daily_checkin');
            } catch (err) {
                logger.warn('Failed to update streak for challenge completion:', err);
            }

            checkAndAwardAchievements(userId).catch(() => {});

            return {
                success: true,
                already_completed: false,
                xp_earned: challenge.reward,
                leveled_up: xpResult.leveled_up || false,
                current_streak: streakResult.current || 1,
                message: 'Challenge completed successfully!',
            };
        });

        res.json(result);
    } catch (error) {
        logger.error('Error completing challenge:', error);
        res.status(500).json({ error: 'Failed to complete challenge' });
    }
});

export default router;
