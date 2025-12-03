import express from 'express';
import { authenticateUser } from '../middleware/authMiddleware.js';
import { supabaseAdmin } from '../config/supabase.js';
import logger from '../config/logger.js';

const router = express.Router();

/**
 * GET /api/conversations
 * List all conversations for the user
 */
router.get('/', authenticateUser, async (req, res) => {
    try {
        const userId = req.userId;

        const { data, error } = await supabaseAdmin
            .from('conversations')
            .select('*')
            .eq('user_id', userId)
            .order('updated_at', { ascending: false });

        if (error) throw error;

        res.json({ conversations: data || [] });
    } catch (error) {
        logger.error('Error fetching conversations:', error);
        res.status(500).json({ error: 'Failed to fetch conversations' });
    }
});

/**
 * POST /api/conversations
 * Create a new conversation
 */
router.post('/', authenticateUser, async (req, res) => {
    try {
        const userId = req.userId;
        const { title = 'New Chat' } = req.body;

        const { data, error } = await supabaseAdmin
            .from('conversations')
            .insert([{
                user_id: userId,
                title,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            }])
            .select()
            .single();

        if (error) throw error;

        res.json({ conversation: data });
    } catch (error) {
        logger.error('Error creating conversation:', error);
        res.status(500).json({ error: 'Failed to create conversation' });
    }
});

/**
 * GET /api/conversations/:id
 * Get messages for a specific conversation
 */
router.get('/:id', authenticateUser, async (req, res) => {
    try {
        const userId = req.userId;
        const { id } = req.params;
        const { limit = 50 } = req.query;

        // Verify ownership
        const { data: conversation, error: convError } = await supabaseAdmin
            .from('conversations')
            .select('id')
            .eq('id', id)
            .eq('user_id', userId)
            .single();

        if (convError || !conversation) {
            return res.status(404).json({ error: 'Conversation not found' });
        }

        // Fetch messages
        const { data: messages, error: msgError } = await supabaseAdmin
            .from('chat_history')
            .select('*')
            .eq('conversation_id', id)
            .order('created_at', { ascending: false })
            .limit(parseInt(limit));

        if (msgError) throw msgError;

        res.json({ messages: messages?.reverse() || [] });
    } catch (error) {
        logger.error('Error fetching conversation messages:', error);
        res.status(500).json({ error: 'Failed to fetch messages' });
    }
});

/**
 * DELETE /api/conversations/:id
 * Delete a conversation
 */
router.delete('/:id', authenticateUser, async (req, res) => {
    try {
        const userId = req.userId;
        const { id } = req.params;

        // Verify ownership and delete (cascade should handle messages if configured, otherwise manual)
        // For safety, we'll delete messages first then conversation

        await supabaseAdmin
            .from('chat_history')
            .delete()
            .eq('conversation_id', id);

        const { error } = await supabaseAdmin
            .from('conversations')
            .delete()
            .eq('id', id)
            .eq('user_id', userId);

        if (error) throw error;

        res.json({ success: true });
    } catch (error) {
        logger.error('Error deleting conversation:', error);
        res.status(500).json({ error: 'Failed to delete conversation' });
    }
});

/**
 * PATCH /api/conversations/:id
 * Update conversation title
 */
router.patch('/:id', authenticateUser, async (req, res) => {
    try {
        const userId = req.userId;
        const { id } = req.params;
        const { title } = req.body;

        const { data, error } = await supabaseAdmin
            .from('conversations')
            .update({ title, updated_at: new Date().toISOString() })
            .eq('id', id)
            .eq('user_id', userId)
            .select()
            .single();

        if (error) throw error;

        res.json({ conversation: data });
    } catch (error) {
        logger.error('Error updating conversation:', error);
        res.status(500).json({ error: 'Failed to update conversation' });
    }
});

export default router;
