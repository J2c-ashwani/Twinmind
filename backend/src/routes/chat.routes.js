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
router.post('/message', authenticateUser, checkUsageLimits, async (req, res) => {
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
            // Check for most recent active conversation or create new
            const { data: recent } = await supabaseAdmin
                .from('conversations')
                .select('id')
                .eq('user_id', userId)
                .order('updated_at', { ascending: false })
                .limit(1)
                .single();

            if (recent) {
                targetConversationId = recent.id;
            } else {
                // Create default conversation
                const { data: newConv, error: createError } = await supabaseAdmin
                    .from('conversations')
                    .insert([{
                        user_id: userId,
                        title: 'New Chat',
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

            // Track message for engagement metrics
            await trackMessage(userId, message, isEmotional, hasGoals);

            // Get behavioral modifiers based on user's psychological state
            const behavioralModifiers = getBehavioralModifiers(engagementState);

            // Get emotional metrics (before update)
            const emotionalMetrics = await getEmotionalMetrics(userId);

            // Detect emotional events from message (before generating response)
            const detectedEvents = detectEmotionalEvents(message);
            const detectedIntensity = detectEmotionalIntensity(message);

            // Get user personalization context
            const userContext = await getUserPersonalizationContext(userId);

            // Get emotional behavior modifiers with detected events, intensity, and personalization
            let emotionalModifiers = getEmotionalBehaviorModifiers(emotionalMetrics, detectedEvents, detectedIntensity, userContext);

            // Apply personality style layer
            const personalityProfile = await getUserPersonalityProfile(userId);
            const emotionalState = detectEmotionalState(detectedEvents);
            const intensityLevel = getIntensityLevel(detectedIntensity);
            const personalityDirectives = generatePersonalityDirectives(personalityProfile, emotionalState, intensityLevel, emotionalMetrics.trust_level);

            emotionalModifiers += personalityDirectives;

            // Apply emotional style adapter
            const styleMode = await getUserStyleMode(userId);
            emotionalModifiers = adjustModifiersForStyle(emotionalModifiers, styleMode);

            // Combine both behavioral and emotional modifiers
            const combinedModifiers = behavioralModifiers + emotionalModifiers;

            // Generate AI response with complete psychological context
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
            logger.info(`AI Response extracted: ${aiMessageString.substring(0, 100)}...`);

            // Update emotional metrics AFTER getting AI response (to detect memory callbacks)
            await updateEmotionalMetrics(
                userId,
                message,
                isEmotional,
                hasGoals,
                engagementState.total_messages,
                aiMessageString  // Pass AI response string to detect "remembering" behavior
            );

            // Track usage
            await trackUsage(userId);

            // Get updated usage stats
            const usage = await getMonthlyUsage(userId);

            // Get fresh emotional metrics after update
            const updatedEmotionalMetrics = await getEmotionalMetrics(userId);

            // Store chat messages in history with conversation_id
            const userTime = new Date();
            const aiTime = new Date(userTime.getTime() + 100); // Add 100ms to ensure AI comes after User

            await supabaseAdmin.from('chat_history').insert([
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
                    message: aiMessageString, // Store string, not object
                    sender: 'ai',
                    mode: mode,
                    created_at: aiTime.toISOString()
                }
            ]);

            // Update conversation timestamp
            await supabaseAdmin
                .from('conversations')
                .update({ updated_at: new Date().toISOString() })
                .eq('id', targetConversationId);


            res.json({
                message: aiMessageString,  // Return string, not object
                conversation_id: targetConversationId,
                mode,
                timestamp: new Date().toISOString(),
                usage,
                engagement_state: engagementState.current_state,
                consecutive_days: engagementState.consecutive_days,
                emotional_state: updatedEmotionalMetrics.emotional_state,
                emotional_metrics: {
                    trust_level: updatedEmotionalMetrics.trust_level,
                    dependency_score: updatedEmotionalMetrics.dependency_score,
                    relationship_depth: updatedEmotionalMetrics.relationship_depth,
                    weighted_score: updatedEmotionalMetrics.weighted_score
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
