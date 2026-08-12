import express from 'express';
import { authenticateUser } from '../middleware/authMiddleware.js';
import { checkSubscription, requirePro, checkUsageLimits, trackUsage, getMonthlyUsage } from '../middleware/subscriptionMiddleware.js';
import { generateChatResponse, getChatHistory, clearChatHistory } from '../services/chatEngine.js';
import aiService from '../services/aiService.js';
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
import logger from '../config/logger.js';

const router = express.Router();

/**
 * POST /api/chat/message
 * Send a message and get AI twin response with behavioral engagement tracking
 */
router.post('/message', authenticateUser, checkSubscription, checkUsageLimits, async (req, res) => {
    const T1 = Date.now(); // T1: request received by backend
    try {
        const { message, mode = 'normal', conversation_id } = req.body;
        const userId = req.userId;

        // Validate message length
        if (!message || message.trim().length === 0) {
            return res.status(400).json({ error: 'Message cannot be empty' });
        }
        if (message.length > 5000) {
            return res.status(400).json({ error: 'Message too long. Maximum 5000 characters.' });
        }

        // Ensure conversation_id exists or handle legacy/default
        // For now, if no conversation_id is provided, we might want to create one or use a "General" one.
        // But to keep it simple for the API, we'll assume the frontend passes it, OR we create a new one if missing.
        let targetConversationId = conversation_id;

        if (!targetConversationId) {
            // Check for most recent active conversation
            const { data: recent } = await supabaseAdmin
                .from('conversations')
                .select('id, created_at')
                .eq('user_id', userId)
                .order('updated_at', { ascending: false })
                .limit(1)
                .maybeSingle();

            // Check if the recent conversation is from today
            const isToday = (date) => {
                const today = new Date();
                const compare = new Date(date);
                return today.getFullYear() === compare.getFullYear() &&
                    today.getMonth() === compare.getMonth() &&
                    today.getDate() === compare.getDate();
            };

            // Only reuse if it's from today, otherwise create a new one
            if (recent && isToday(recent.created_at)) {
                targetConversationId = recent.id;
            } else {
                // Create new conversation with today's date as title
                const today = new Date();
                const dateTitle = today.toLocaleDateString('en-US', {
                    weekday: 'short',
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric'
                });

                const { data: newConv, error: createError } = await supabaseAdmin
                    .from('conversations')
                    .insert([{
                        user_id: userId,
                        title: dateTitle,
                        created_at: new Date().toISOString(),
                        updated_at: new Date().toISOString()
                    }])
                    .select()
                    .single();

                if (createError || !newConv) {
                    logger.error('Failed to create conversation:', createError);
                    return res.status(500).json({ error: 'Failed to start conversation' });
                }

                targetConversationId = newConv.id;
            }
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
            const T5 = Date.now();
            logger.info(`⏱ [LATENCY] T4→T5 llm_generation: ${T5 - T4}ms  ← AI provider time`);

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
            logger.info(`AI Response extracted: ${aiMessageString.substring(0, 100)}...`);

            const T5 = Date.now();
            logger.info(`⏱ [LATENCY] T4→T5 llm_generation: ${T5 - T4}ms  ← AI provider time`);

            // ─── RESPOND IMMEDIATELY — user is waiting ───────────────────
            // Flutter only reads 'message' and 'conversation_id'.
            // Everything else is post-processing that does NOT need to block.
            res.json({
                message: aiMessageString,
                conversation_id: targetConversationId,
                mode,
                timestamp: new Date().toISOString(),
            });
            logger.info(`⏱ [LATENCY] T5→RESPONSE (user unblocked): ${Date.now() - T5}ms`);
            logger.info(`⏱ [LATENCY] TOTAL T1→RESPONSE: ${Date.now() - T1}ms  (userId=${userId})`);

            // ─── BACKGROUND POST-PROCESSING (fire-and-forget) ────────────
            // None of these block the user. Errors are logged but swallowed.
            setImmediate(async () => {
                try {
                    const Tbg = Date.now();

                    const userTime = new Date();
                    const aiTime = new Date(userTime.getTime() + 100);

                    // Parallelize all background work
                    await Promise.all([
                        // 1. Store chat history (both rows in one insert)
                        supabaseAdmin.from('chat_history').insert([
                            {
                                user_id: userId,
                                conversation_id: targetConversationId,
                                message: message,
                                sender: 'user',
                                mode: mode,
                                created_at: userTime.toISOString()
                            },
                            {
                                user_id: userId,
                                conversation_id: targetConversationId,
                                message: aiMessageString,
                                sender: 'ai',
                                mode: mode,
                                created_at: aiTime.toISOString()
                            }
                        ]),

                        // 2. Update conversation timestamp
                        supabaseAdmin
                            .from('conversations')
                            .update({ updated_at: new Date().toISOString() })
                            .eq('id', targetConversationId),

                        // 3. Update emotional metrics
                        updateEmotionalMetrics(
                            userId, message, isEmotional, hasGoals,
                            engagementState.total_messages, aiMessageString
                        ).catch(e => logger.warn('updateEmotionalMetrics bg error:', e.message)),

                        // 4. Track usage
                        trackUsage(userId)
                            .catch(e => logger.warn('trackUsage bg error:', e.message)),
                    ]);

                    logger.info(`⏱ [LATENCY] background_postprocess: ${Date.now() - Tbg}ms`);
                } catch (bgErr) {
                    logger.error('Background post-process error (non-blocking):', bgErr.message);
                }
            });

        } catch (innerError) {
            // STRICT MODE: No mock responses. Fail properly.
            logger.error('Chat services critical failure:', innerError);
            throw innerError; // Re-throw to be caught by outer catch
        }

    } catch (error) {
        logger.error('Error in chat message:', error);
        res.status(500).json({ error: 'Failed to process message' });
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
                available: true
            },
            {
                id: 'future',
                name: 'Future Twin',
                description: '5 years wiser version of you',
                available: true,  // Available to all with limitations
                requiresPro: true,
                isPro: req.isPro  // Indicates if user has Pro access
            },
            {
                id: 'dark',
                name: 'Dark Twin',
                description: 'Brutally honest, unfiltered version',
                available: true,  // Available to all with limitations
                requiresPro: true,
                isPro: req.isPro  // Indicates if user has Pro access
            },
            {
                id: 'therapist',
                name: 'Therapist Twin',
                description: 'Compassionate, reflective healing version',
                available: true
            }
        ];

        res.json({ modes });

    } catch (error) {
        logger.error('Error fetching modes:', error);
        res.status(500).json({ error: 'Failed to fetch modes' });
    }
});

export default router;
