import express from 'express';
import { authenticateUser } from '../middleware/authMiddleware.js';
import { checkSubscription, checkUsageLimits, releaseDailyQuota } from '../middleware/subscriptionMiddleware.js';
import { resolveConversationForUser } from '../services/conversationAccess.js';
import { generateChatResponse, getChatHistory, clearChatHistory } from '../services/chatEngine.js';
import { checkAndAwardAchievements } from '../services/gamificationService.js';
import { supabaseAdmin } from '../config/supabase.js';
import {
    getUserEngagementState,
    getBehavioralModifiers,
    trackMessage,
    detectEmotionalContent,
    detectGoalContent,
    initializeEngagement
} from '../services/behavioralEngine.js';
import {
    getEmotionalMetrics,
    updateEmotionalMetrics,
    getEmotionalBehaviorModifiers,
    detectEmotionalEvents,
    detectEmotionalIntensity,
    getUserPersonalizationContext
} from '../services/emotionalStateEngine.js';
import {
    getUserPersonalityProfile,
    generatePersonalityDirectives,
    detectEmotionalState,
    getIntensityLevel
} from '../services/personalityStyleLayer.js';
import {
    getUserStyleMode,
    adjustModifiersForStyle
} from '../services/emotionalStyleAdapter.js';
import { storeMessageWithEmbedding } from '../services/conversationMemoryService.js';
import logger from '../config/logger.js';

const router = express.Router();

/**
 * POST /api/chat/message
 * Send a message and get AI twin response with behavioral engagement tracking
 */
router.post('/message', authenticateUser, checkSubscription, checkUsageLimits, async (req, res) => {
    const T1 = Date.now(); // T1: request received by backend
    let responseSent = false;
    try {
        const { message, mode = 'normal', conversation_id } = req.body;
        const userId = req.userId;

        // Validate message length
        if (!message || message.trim().length === 0) {
            if (req.reservedQuota) await releaseDailyQuota(req.reservedQuota.userId, req.reservedQuota.actionType);
            return res.status(400).json({ error: 'Message cannot be empty' });
        }
        if (message.length > 5000) {
            if (req.reservedQuota) await releaseDailyQuota(req.reservedQuota.userId, req.reservedQuota.actionType);
            return res.status(400).json({ error: 'Message too long. Maximum 5000 characters.' });
        }

        // Verify ownership if conversation_id is supplied, or find/create today's conversation
        let targetConversationId;
        try {
            targetConversationId = await resolveConversationForUser(userId, conversation_id);
        } catch (convErr) {
            if (req.reservedQuota) await releaseDailyQuota(req.reservedQuota.userId, req.reservedQuota.actionType);
            return res.status(convErr.statusCode || 500).json({ error: convErr.message || 'Failed to resolve conversation' });
        }

        const T2 = Date.now();
        logger.info(`⏱ [LATENCY] T1→T2 conversation_resolve: ${T2 - T1}ms`);

        try {
            // Initialize engagement targeting if first message
            let engagementState = await getUserEngagementState(userId);
            if (!engagementState || engagementState.total_messages === 0) {
                await initializeEngagement(userId);
                engagementState = await getUserEngagementState(userId);
            }

            // Detect message characteristics for behavioral tracking
            const isEmotional = detectEmotionalContent(message);
            const hasGoals = detectGoalContent(message);

            const T3start = Date.now();
            // Execute independent database queries Concurrently in parallel via Promise.all
            const [
                _trackRes,
                emotionalMetrics,
                userContext,
                personalityProfile,
                styleMode
            ] = await Promise.all([
                trackMessage(userId, message, isEmotional, hasGoals),
                getEmotionalMetrics(userId),
                getUserPersonalizationContext(userId),
                getUserPersonalityProfile(userId),
                getUserStyleMode(userId)
            ]);
            const T3 = Date.now();
            logger.info(`⏱ [LATENCY] T2→T3 parallel_db_fetches: ${T3 - T3start}ms`);

            // Get behavioral modifiers based on user's psychological state
            const behavioralModifiers = getBehavioralModifiers(engagementState);

            // Detect emotional events from message (before generating response)
            const detectedEvents = detectEmotionalEvents(message);
            const detectedIntensity = detectEmotionalIntensity(message);

            // Get emotional behavior modifiers with detected events, intensity, and personalization
            let emotionalModifiers = getEmotionalBehaviorModifiers(emotionalMetrics, detectedEvents, detectedIntensity, userContext);

            // Apply personality style layer
            const emotionalState = detectEmotionalState(detectedEvents);
            const intensityLevel = getIntensityLevel(detectedIntensity);
            const personalityDirectives = generatePersonalityDirectives(personalityProfile, emotionalState, intensityLevel, emotionalMetrics.trust_level);

            emotionalModifiers += personalityDirectives;

            // Apply emotional style adapter
            emotionalModifiers = adjustModifiersForStyle(emotionalModifiers, styleMode);

            // Combine both behavioral and emotional modifiers
            const combinedModifiers = behavioralModifiers + emotionalModifiers;

            // Generate AI response with complete psychological context
            const T4 = Date.now();
            logger.info(`⏱ [LATENCY] T3→T4 pre_llm_processing: ${T4 - T3}ms`);

            const response = await generateChatResponse(
                userId,
                message,
                mode,
                combinedModifiers,  // Pass combined engagement + emotional intelligence layer
                targetConversationId // Pass conversation ID for context isolation
            );

            // Robust message extraction - handle any nesting level
            const extractMessageText = (obj) => {
                if (typeof obj === 'string') return obj;
                if (!obj) return '';
                if (obj.message) return extractMessageText(obj.message);
                if (obj.text) return extractMessageText(obj.text);
                if (obj.content) return extractMessageText(obj.content);
                if (obj.response) return extractMessageText(obj.response);
                // Last resort
                const str = String(obj);
                return str === '[object Object]' ? JSON.stringify(obj) : str;
            };

            const aiMessageString = extractMessageText(response);
            logger.info(`AI Response generated (${aiMessageString.length} chars)`);

            const T5 = Date.now();
            logger.info(`⏱ [LATENCY] T4→T5 llm_generation: ${T5 - T4}ms  ← AI provider time`);

            // ─── PERSIST CHAT TURN DURABLY BEFORE RESPONDING ─────────────
            const userTime = new Date();
            const aiTime = new Date(userTime.getTime() + 100);

            const { data: insertedRows, error: historyInsertError } = await supabaseAdmin.from('chat_history').insert([
                {
                    user_id: userId,
                    conversation_id: targetConversationId,
                    message,
                    sender: 'user',
                    mode,
                    created_at: userTime.toISOString(),
                },
                {
                    user_id: userId,
                    conversation_id: targetConversationId,
                    message: aiMessageString,
                    sender: 'ai',
                    mode,
                    created_at: aiTime.toISOString(),
                },
            ]).select('id, sender, message');

            if (historyInsertError) {
                throw new Error(`Failed to persist chat history: ${historyInsertError.message}`);
            }

            const { error: convUpdateError } = await supabaseAdmin
                .from('conversations')
                .update({ updated_at: aiTime.toISOString() })
                .eq('id', targetConversationId)
                .eq('user_id', userId);

            if (convUpdateError) {
                logger.warn('Failed to update conversation timestamp:', convUpdateError.message);
            }

            responseSent = true;
            res.json({
                message: aiMessageString,
                conversation_id: targetConversationId,
                mode,
                timestamp: aiTime.toISOString(),
            });
            logger.info(`⏱ [LATENCY] T5→RESPONSE (saved & delivered): ${Date.now() - T5}ms`);
            logger.info(`⏱ [LATENCY] TOTAL T1→RESPONSE: ${Date.now() - T1}ms  (userId=${userId})`);

            // ─── BACKGROUND NON-CRITICAL ANALYTICS & ENGAGEMENT ──────────
            setImmediate(async () => {
                try {
                    const Tbg = Date.now();

                    await Promise.all([
                        // Populate secondary semantic recall vector store (message_embeddings)
                        (async () => {
                            if (insertedRows && insertedRows.length > 0) {
                                for (const row of insertedRows) {
                                    if (row.sender === 'user' && row.message) {
                                        await storeMessageWithEmbedding(row.id, userId, row.message, targetConversationId);
                                    }
                                }
                            }
                        })().catch(e => logger.warn('storeMessageWithEmbedding bg error:', e.message)),

                        updateEmotionalMetrics(
                            userId, message, isEmotional, hasGoals,
                            engagementState.total_messages, aiMessageString
                        ).catch(e => logger.warn('updateEmotionalMetrics bg error:', e.message)),

                        checkAndAwardAchievements(userId)
                            .catch(e => logger.warn('checkAndAwardAchievements bg error:', e.message)),

                        (async () => {
                            const { count: totalUserMessages } = await supabaseAdmin
                                .from('chat_history')
                                .select('*', { count: 'exact', head: true })
                                .eq('user_id', userId)
                                .eq('sender', 'user');

                            if (totalUserMessages === 1) {
                                await supabaseAdmin.from('metric_events').insert({
                                    user_id: userId,
                                    event_type: 'first_message_sent',
                                    metric_type: 'funnel',
                                    metadata: {
                                        source: req.body.starter_prompt_variant ? 'starter_prompt' : 'custom_input',
                                        variant: req.body.starter_prompt_variant || null,
                                    },
                                    created_at: new Date().toISOString(),
                                });
                            } else if (totalUserMessages === 2) {
                                await supabaseAdmin.from('metric_events').insert({
                                    user_id: userId,
                                    event_type: 'second_message_sent',
                                    metric_type: 'funnel',
                                    metadata: {},
                                    created_at: new Date().toISOString(),
                                });
                            } else if (totalUserMessages === 5) {
                                await supabaseAdmin.from('metric_events').insert({
                                    user_id: userId,
                                    event_type: 'conversation_completed',
                                    metric_type: 'funnel',
                                    metadata: { total_messages: totalUserMessages },
                                    created_at: new Date().toISOString(),
                                });
                            }
                        })().catch(e => logger.warn('Funnel metric tracking error:', e.message)),
                    ]);

                    logger.info(`⏱ [LATENCY] background_postprocess: ${Date.now() - Tbg}ms`);
                } catch (bgErr) {
                    logger.error('Background post-process error (non-blocking):', bgErr.message);
                }
            });

        } catch (innerError) {
            logger.error('Chat services critical failure:', innerError);
            throw innerError;
        }

    } catch (error) {
        if (!responseSent && req.reservedQuota) {
            await releaseDailyQuota(req.reservedQuota.userId, req.reservedQuota.actionType);
        }
        logger.error('Error in chat message:', error);
        if (!responseSent) {
            res.status(500).json({ error: 'Failed to process message' });
        }
    }
});

/**
 * POST /api/chat/track-event
 * Track client-side funnel events (e.g., starter_prompt_shown, starter_prompt_clicked)
 */
router.post('/track-event', authenticateUser, async (req, res) => {
    try {
        const userId = req.userId;
        const { event_type, metadata } = req.body;

        if (!event_type) {
            return res.status(400).json({ error: 'event_type is required' });
        }

        await supabaseAdmin.from('metric_events').insert({
            user_id: userId,
            event_type,
            metric_type: 'funnel',
            metadata: metadata || {},
            created_at: new Date().toISOString()
        });

        res.json({ success: true });
    } catch (error) {
        logger.warn('Error recording funnel event (non-blocking):', error.message);
        res.status(200).json({ success: false });
    }
});

/**
 * GET /api/chat/history
 * Get chat conversation history
 */
router.get('/history', authenticateUser, async (req, res) => {
    try {
        const userId = req.userId;
        const { limit = 50, mode, conversation_id } = req.query;

        const history = await getChatHistory(userId, {
            limit: parseInt(limit),
            mode: mode || null,
            conversationId: conversation_id
        });

        res.json({ history });

    } catch (error) {
        logger.error('Error fetching chat history:', error);
        res.status(500).json({ error: 'Failed to fetch chat history' });
    }
});

/**
 * DELETE /api/chat/history
 * Clear chat history
 */
router.delete('/history', authenticateUser, async (req, res) => {
    try {
        const userId = req.userId;
        const { mode } = req.query;

        await clearChatHistory(userId, mode || null);

        res.json({
            success: true,
            message: 'Chat history cleared'
        });

    } catch (error) {
        logger.error('Error clearing chat history:', error);
        res.status(500).json({ error: 'Failed to clear chat history' });
    }
});

/**
 * GET /api/chat/modes
 * Get available twin modes
 */
router.get('/modes', authenticateUser, checkSubscription, async (req, res) => {
    try {
        const modes = [
            {
                id: 'normal',
                name: 'Normal Twin',
                description: 'Your authentic digital twin',
                available: true,
                requiresPro: false,
            },
            {
                id: 'future',
                name: 'Future Twin',
                description: '5 years wiser version of you',
                available: true,
                requiresPro: false,
                isPro: req.isPro,
            },
            {
                id: 'dark',
                name: 'Dark Twin',
                description: 'Brutally honest, unfiltered version',
                available: true,
                requiresPro: false,
                isPro: req.isPro,
            },
            {
                id: 'therapist',
                name: 'Therapist Twin',
                description: 'Compassionate, reflective healing version',
                available: true,
                requiresPro: false,
            }
        ];

        res.json({ modes });

    } catch (error) {
        logger.error('Error fetching modes:', error);
        res.status(500).json({ error: 'Failed to fetch modes' });
    }
});

export default router;
