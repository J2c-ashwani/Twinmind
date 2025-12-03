import express from 'express';
import { authenticateUser } from '../middleware/authMiddleware.js';
import {
    createCircle,
    getUserCircle,
    createInvitation,
    joinCircle,
    getCircleProgress,
    leaveCircle,
    checkAndUnlockMilestones,
} from '../services/circleService.js';
import logger from '../config/logger.js';

const router = express.Router();

/**
 * POST /api/circles
 * Create a new growth circle
 */
router.post('/', authenticateUser, async (req, res) => {
    try {
        const userId = req.userId;
        const { name } = req.body;

        const circle = await createCircle(userId, name);
        res.json({ circle });
    } catch (error) {
        logger.error('Error creating circle:', error);
        res.status(400).json({ error: error.message || 'Failed to create circle' });
    }
});

/**
 * GET /api/circles/my
 * Get current user's circle
 */
router.get('/my', authenticateUser, async (req, res) => {
    try {
        const userId = req.userId;
        const circle = await getUserCircle(userId);

        if (!circle) {
            return res.json({ circle: null });
        }

        res.json({ circle });
    } catch (error) {
        logger.error('Error getting user circle:', error);
        res.status(500).json({ error: 'Failed to get circle' });
    }
});

/**
 * GET /api/circles/:id/progress
 * Get circle progress and stats
 */
router.get('/:id/progress', authenticateUser, async (req, res) => {
    try {
        const { id } = req.params;
        const progress = await getCircleProgress(id);

        res.json(progress);
    } catch (error) {
        logger.error('Error getting circle progress:', error);
        res.status(500).json({ error: 'Failed to get progress' });
    }
});

/**
 * POST /api/circles/:id/invite
 * Create invitation for circle
 */
router.post('/:id/invite', authenticateUser, async (req, res) => {
    try {
        const userId = req.userId;
        const { id } = req.params;
        const { email } = req.body;

        const invitation = await createInvitation(id, userId, email);

        res.json({
            invitation,
            invite_link: `${process.env.WEB_APP_URL || 'http://localhost:3000'}/circle/join/${invitation.invitation_code}`,
        });
    } catch (error) {
        logger.error('Error creating invitation:', error);
        res.status(400).json({ error: error.message || 'Failed to create invitation' });
    }
});

/**
 * POST /api/circles/join/:code
 * Join circle via invitation code
 */
router.post('/join/:code', authenticateUser, async (req, res) => {
    try {
        const userId = req.userId;
        const { code } = req.params;

        const circle = await joinCircle(userId, code);

        // Check for new milestones
        await checkAndUnlockMilestones(circle.id);

        res.json({ circle, success: true });
    } catch (error) {
        logger.error('Error joining circle:', error);
        res.status(400).json({ error: error.message || 'Failed to join circle' });
    }
});

/**
 * GET /api/circles/preview/:code
 * Preview circle details before joining
 */
router.get('/preview/:code', async (req, res) => {
    try {
        const { code } = req.params;

        const { data: invitation, error } = await supabaseAdmin
            .from('circle_invitations')
            .select(`
                circle_id,
                growth_circles (
                    name,
                    collective_streak,
                    created_at
                )
            `)
            .eq('invitation_code', code.toUpperCase())
            .eq('status', 'pending')
            .single();

        if (error || !invitation) {
            return res.status(404).json({ error: 'Invalid invitation code' });
        }

        // Check if expired
        if (new Date(invitation.expires_at) < new Date()) {
            return res.status(400).json({ error: 'Invitation has expired' });
        }

        // Get member count
        const { count } = await supabaseAdmin
            .from('circle_members')
            .select('*', { count: 'exact', head: true })
            .eq('circle_id', invitation.circle_id)
            .eq('is_active', true);

        res.json({
            circle: {
                name: invitation.growth_circles.name,
                collective_streak: invitation.growth_circles.collective_streak,
                member_count: count,
                created_at: invitation.growth_circles.created_at,
            },
        });
    } catch (error) {
        logger.error('Error previewing circle:', error);
        res.status(500).json({ error: 'Failed to preview circle' });
    }
});

/**
 * POST /api/circles/:id/leave
 * Leave a circle
 */
router.post('/:id/leave', authenticateUser, async (req, res) => {
    try {
        const userId = req.userId;
        const { id } = req.params;

        await leaveCircle(userId, id);

        res.json({ success: true });
    } catch (error) {
        logger.error('Error leaving circle:', error);
        res.status(500).json({ error: 'Failed to leave circle' });
    }
});

/**
 * GET /api/circles/:id/milestones
 * Get unlocked milestones
 */
router.get('/:id/milestones', authenticateUser, async (req, res) => {
    try {
        const { id } = req.params;

        const { data: milestones } = await supabaseAdmin
            .from('circle_milestones')
            .select('*')
            .eq('circle_id', id)
            .order('unlocked_at', { ascending: false });

        res.json({ milestones: milestones || [] });
    } catch (error) {
        logger.error('Error getting milestones:', error);
        res.status(500).json({ error: 'Failed to get milestones' });
    }
});

export default router;
