import express from 'express';
import { verifyToken } from '../middleware/authMiddleware.js';
import {
    checkSubscription,
    checkUsageLimits,
    isEffectivePro,
    releaseDailyQuota,
} from '../middleware/subscriptionMiddleware.js';
import lifeCoachService from '../services/lifeCoachService.js';
import { supabaseAdmin } from '../config/supabase.js';
import logger from '../config/logger.js';

const router = express.Router();
const uuidRegex = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;

async function verifyProgramAccess(programId, userId, isPro = false) {
    if (!programId || !uuidRegex.test(programId)) {
        const err = new Error('Invalid Program ID format. Please refresh programs.');
        err.statusCode = 400;
        throw err;
    }

    const { data: program, error: programError } = await supabaseAdmin
        .from('life_coach_programs')
        .select('id, is_premium')
        .eq('id', programId)
        .maybeSingle();

    if (programError || !program) {
        const err = new Error('Program not found');
        err.statusCode = 404;
        throw err;
    }

    if (program.is_premium && !isPro) {
        const err = new Error('This Life Coach program requires an active Premium subscription.');
        err.statusCode = 403;
        err.upgrade = true;
        throw err;
    }

    return program;
}

// Get all programs
router.get('/programs', verifyToken, async (req, res) => {
    try {
        const programs = await lifeCoachService.getPrograms();
        res.json(programs);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch programs' });
    }
});

// Start a program
router.post('/start', verifyToken, checkSubscription, async (req, res) => {
    try {
        const { programId } = req.body;
        await verifyProgramAccess(programId, req.user.userId, req.isPro || isEffectivePro(req.subscription));
        const result = await lifeCoachService.startProgram(req.user.userId, programId);
        res.json(result);
    } catch (error) {
        res.status(error.statusCode || 500).json({
            error: error.message || 'Failed to start program',
            ...(error.upgrade ? { upgrade: true } : {}),
        });
    }
});

// Get current session content
router.get('/session/:programId', verifyToken, checkSubscription, async (req, res) => {
    try {
        const { programId } = req.params;
        await verifyProgramAccess(programId, req.user.userId, req.isPro || isEffectivePro(req.subscription));
        const session = await lifeCoachService.getSession(req.user.userId, programId);
        res.json(session);
    } catch (error) {
        res.status(error.statusCode || 500).json({
            error: error.message,
            ...(error.upgrade ? { upgrade: true } : {}),
        });
    }
});

// Send message in session (subject to shared safety, active entitlement, and daily usage quota)
router.post('/session/:programId/message', verifyToken, checkSubscription, checkUsageLimits, async (req, res) => {
    let released = false;
    try {
        const { programId } = req.params;
        const { message } = req.body || {};

        if (!message || !String(message).trim()) {
            if (req.reservedQuota && !released) {
                released = true;
                await releaseDailyQuota(req.reservedQuota.userId, req.reservedQuota.actionType);
            }
            return res.status(400).json({ error: 'Message cannot be empty' });
        }

        await verifyProgramAccess(programId, req.user.userId, req.isPro || isEffectivePro(req.subscription));

        const response = await lifeCoachService.processSessionMessage(
            req.user.userId,
            programId,
            String(message).trim()
        );

        res.json({ response });
    } catch (error) {
        if (req.reservedQuota && !released) {
            await releaseDailyQuota(req.reservedQuota.userId, req.reservedQuota.actionType);
        }
        logger.error('Life Coach message error:', error.message);
        res.status(error.statusCode || 500).json({
            error: error.statusCode ? error.message : 'Failed to process message',
            ...(error.upgrade ? { upgrade: true } : {}),
        });
    }
});

// Complete session
router.post('/session/:programId/complete', verifyToken, checkSubscription, async (req, res) => {
    try {
        const { programId } = req.params;
        const { notes } = req.body || {};
        await verifyProgramAccess(programId, req.user.userId, req.isPro || isEffectivePro(req.subscription));
        const result = await lifeCoachService.completeSession(req.user.userId, programId, notes);
        res.json(result);
    } catch (error) {
        res.status(error.statusCode || 500).json({
            error: error.message || 'Failed to complete session',
            ...(error.upgrade ? { upgrade: true } : {}),
        });
    }
});

export default router;
