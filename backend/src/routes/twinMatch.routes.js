import express from 'express';
import { authenticateUser } from '../middleware/authMiddleware.js';
import {
    comparePersonalities,
    getComparison,
    findUserForMatch,
    resolveUserIdByIdentifier,
    createMatchInvitation,
    listMatchInvitations,
    respondToMatchInvitation,
    revokeComparisonSharing,
} from '../services/twinMatchService.js';
import logger from '../config/logger.js';

const router = express.Router();

/**
 * POST /api/twin-match/invite
 * Send a Twin Match consent invitation by referral code or email (no account enumeration)
 */
router.post('/invite', authenticateUser, async (req, res) => {
    try {
        const { identifier } = req.body || {};
        if (!identifier || !String(identifier).trim()) {
            return res.status(400).json({ error: 'Referral code or email is required' });
        }

        const result = await createMatchInvitation(req.userId, String(identifier));
        res.json({
            success: true,
            ...result,
            message: result.accepted
                ? 'Consent already accepted. You can compare Twins now.'
                : 'Invitation processed. Comparison will unlock once your friend accepts.',
        });
    } catch (error) {
        logger.error('Error sending Twin Match invitation:', error);
        res.status(error.statusCode || 500).json({ error: error.message || 'Failed to send invitation' });
    }
});

/**
 * GET /api/twin-match/invitations
 * List pending & accepted incoming/outgoing invitations for the signed-in user
 */
router.get('/invitations', authenticateUser, async (req, res) => {
    try {
        const invitations = await listMatchInvitations(req.userId);
        res.json({ invitations });
    } catch (error) {
        logger.error('Error listing Twin Match invitations:', error);
        res.status(500).json({ error: 'Failed to load invitations' });
    }
});

/**
 * POST /api/twin-match/invitations/:id/accept
 */
router.post('/invitations/:id/accept', authenticateUser, async (req, res) => {
    try {
        const result = await respondToMatchInvitation(req.params.id, req.userId, 'accept');
        res.json({ success: true, ...result });
    } catch (error) {
        logger.error('Error accepting Twin Match invitation:', error);
        res.status(error.statusCode || 500).json({ error: error.message || 'Failed to accept invitation' });
    }
});

/**
 * POST /api/twin-match/invitations/:id/decline
 */
router.post('/invitations/:id/decline', authenticateUser, async (req, res) => {
    try {
        const result = await respondToMatchInvitation(req.params.id, req.userId, 'decline');
        res.json({ success: true, ...result });
    } catch (error) {
        logger.error('Error declining Twin Match invitation:', error);
        res.status(error.statusCode || 500).json({ error: error.message || 'Failed to decline invitation' });
    }
});

/**
 * POST /api/twin-match/compare
 * Compare personalities with another user (requires accepted mutual consent)
 */
router.post('/compare', authenticateUser, async (req, res) => {
    try {
        const userId = req.userId;
        const { identifier } = req.body || {};

        if (!identifier || !String(identifier).trim()) {
            return res.status(400).json({ error: 'Identifier is required' });
        }

        const otherUserId = await resolveUserIdByIdentifier(String(identifier), { allowEmailLookup: true });

        if (!otherUserId || otherUserId === userId) {
            return res.status(403).json({
                error: 'Twin Match requires mutual consent. Send an invitation first and compare once accepted.',
                requiresConsent: true,
            });
        }

        const comparison = await comparePersonalities(userId, otherUserId);
        res.json(comparison);
    } catch (error) {
        logger.error('Error creating comparison:', error);
        res.status(error.statusCode || 500).json({
            error: error.message || 'Failed to create comparison',
            ...(error.code === 'CONSENT_REQUIRED' ? { requiresConsent: true } : {}),
        });
    }
});

/**
 * GET /api/twin-match/:id
 * Get comparison by ID (restricted to comparison participants)
 */
router.get('/:id', authenticateUser, async (req, res) => {
    try {
        const comparison = await getComparison(req.params.id, req.userId);
        res.json(comparison);
    } catch (error) {
        logger.error('Error getting comparison:', error);
        res.status(error.statusCode || 500).json({ error: error.message || 'Failed to get comparison' });
    }
});

/**
 * DELETE /api/twin-match/:id
 * Revoke sharing consent & remove comparison
 */
router.delete('/:id', authenticateUser, async (req, res) => {
    try {
        const result = await revokeComparisonSharing(req.params.id, req.userId);
        res.json({ success: true, ...result });
    } catch (error) {
        logger.error('Error revoking Twin Match consent:', error);
        res.status(error.statusCode || 500).json({ error: error.message || 'Failed to revoke sharing' });
    }
});

/**
 * POST /api/twin-match/find
 * Find user by referral/match code only (minimal preview, no email enumeration)
 */
router.post('/find', authenticateUser, async (req, res) => {
    try {
        const { identifier } = req.body || {};
        if (!identifier || String(identifier).includes('@')) {
            return res.status(400).json({ error: 'Please use a Twin Match referral code to preview.' });
        }

        const user = await findUserForMatch(String(identifier));

        if (!user) {
            return res.status(404).json({ error: 'Match profile not found' });
        }

        res.json(user);
    } catch (error) {
        logger.error('Error finding user:', error);
        res.status(500).json({ error: 'Failed to find user' });
    }
});

export default router;
