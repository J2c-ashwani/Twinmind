import express from 'express';
import { verifyToken } from '../middleware/authMiddleware.js';
import lifeCoachService from '../services/lifeCoachService.js';
import logger from '../config/logger.js';

const router = express.Router();

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
router.post('/start', verifyToken, async (req, res) => {
    try {
        const { programId } = req.body;
        const result = await lifeCoachService.startProgram(req.user.userId, programId);
        res.json(result);
    } catch (error) {
        res.status(500).json({ error: 'Failed to start program' });
    }
});

// Get current session content
router.get('/session/:programId', verifyToken, async (req, res) => {
    try {
        const { programId } = req.params;
        const session = await lifeCoachService.getSession(req.user.userId, programId);
        res.json(session);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Send message in session
router.post('/session/:programId/message', verifyToken, async (req, res) => {
    try {
        const { programId } = req.params;
        const { message, history } = req.body;

        const response = await lifeCoachService.processSessionMessage(
            req.user.userId,
            programId,
            message,
            history
        );

        res.json({ response });
    } catch (error) {
        res.status(500).json({ error: 'Failed to process message' });
    }
});

// Complete session
router.post('/session/:programId/complete', verifyToken, async (req, res) => {
    try {
        const { programId } = req.params;
        const { notes } = req.body;

        const result = await lifeCoachService.completeSession(
            req.user.userId,
            programId,
            notes
        );

        res.json(result);
    } catch (error) {
        res.status(500).json({ error: 'Failed to complete session' });
    }
});

export default router;
