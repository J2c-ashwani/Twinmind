import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { promisify } from 'util';
import { verifyToken } from '../middleware/authMiddleware.js';
import { checkSubscription, checkVoiceLimits, releaseDailyQuota } from '../middleware/subscriptionMiddleware.js';
import { resolveConversationForUser } from '../services/conversationAccess.js';
import { transcribeAudio } from '../services/whisperService.js';
import { textToSpeech } from '../services/ttsService.js';
import { generateChatResponse } from '../services/chatEngine.js';
import { supabaseAdmin } from '../config/supabase.js';
import logger from '../config/logger.js';

const router = express.Router();
const unlink = promisify(fs.unlink);
const VOICE_SIGNED_URL_TTL_SECONDS = 3600; // 1 hour

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadDir = 'uploads/voice';
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const uniqueName = `voice_${Date.now()}_${Math.random().toString(36).substring(7)}${path.extname(file.originalname)}`;
        cb(null, uniqueName);
    },
});

const upload = multer({
    storage,
    limits: { fileSize: 10 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        logger.info(`Incoming voice upload check: type=${file.mimetype}`);

        const allowedTypes = /mp3|wav|m4a|aac|ogg|webm/;
        const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = allowedTypes.test(file.mimetype);

        if (extname || mimetype) {
            cb(null, true);
        } else {
            logger.error(`Voice upload rejected: mime=${file.mimetype}`);
            cb(new Error(`Only audio files are allowed. Got: ${file.mimetype}`));
        }
    },
});

async function createOwnerSignedUrl(objectPath) {
    const { data, error } = await supabaseAdmin.storage
        .from('voice-responses')
        .createSignedUrl(objectPath, VOICE_SIGNED_URL_TTL_SECONDS);

    if (error || !data?.signedUrl) {
        throw new Error(error?.message || 'Failed to generate signed audio URL');
    }

    return data.signedUrl;
}

router.post(
    '/message',
    verifyToken,
    checkSubscription,
    upload.single('audio'),
    checkVoiceLimits,
    async (req, res) => {
        let audioFilePath = null;
        let responseAudioPath = null;
        let responseCompleted = false;

        try {
            if (!req.file) {
                if (req.reservedQuota) {
                    await releaseDailyQuota(req.reservedQuota.userId, req.reservedQuota.actionType);
                }
                return res.status(400).json({ error: 'No audio file provided' });
            }

            audioFilePath = req.file.path;
            const { mode = 'normal', conversationId } = req.body;
            const userId = req.user.userId;

            logger.info(`Processing voice message for user ${userId}`);

            // 1. Validate conversation ownership / resolve today's conversation
            let targetConversationId;
            try {
                targetConversationId = await resolveConversationForUser(userId, conversationId);
            } catch (convErr) {
                if (req.reservedQuota) {
                    await releaseDailyQuota(req.reservedQuota.userId, req.reservedQuota.actionType);
                }
                if (audioFilePath) await unlink(audioFilePath).catch(() => {});
                return res.status(convErr.statusCode || 500).json({ error: convErr.message });
            }

            // 2. Upload User Audio under owner-scoped folder with short-lived signed URL
            let userAudioUrl = null;
            try {
                const userObjectPath = `${userId}/user_${Date.now()}_${path.basename(audioFilePath)}`;
                const userAudioBuffer = fs.readFileSync(audioFilePath);
                const { error: userUploadError } = await supabaseAdmin.storage
                    .from('voice-responses')
                    .upload(userObjectPath, userAudioBuffer, {
                        contentType: req.file.mimetype || 'audio/webm',
                        cacheControl: '3600',
                    });

                if (!userUploadError) {
                    userAudioUrl = await createOwnerSignedUrl(userObjectPath);
                } else {
                    logger.warn('Failed to upload user audio:', userUploadError.message);
                }
            } catch (err) {
                logger.warn('Failed to upload user audio (non-critical):', err.message);
            }

            // 3. Transcribe Audio (never log transcript contents)
            let transcription;
            try {
                transcription = await transcribeAudio(audioFilePath);
                if (!transcription || transcription.trim() === '') {
                    throw new Error('Transcription service returned empty result');
                }
                logger.info(`Transcription complete (${transcription.length} chars)`);
            } catch (err) {
                logger.error('Transcription failed:', err.message);
                throw new Error(`Transcription failed: ${err.message}`);
            }

            // 4. Generate AI Response
            let aiMessageText;
            try {
                const aiResponse = await generateChatResponse(
                    userId,
                    transcription,
                    mode,
                    '',
                    targetConversationId
                );
                aiMessageText =
                    typeof aiResponse === 'string'
                        ? aiResponse
                        : aiResponse?.message || aiResponse?.text || String(aiResponse);
                logger.info(`AI voice response generated (${aiMessageText.length} chars)`);
            } catch (err) {
                logger.error('AI Generation failed:', err.message);
                throw new Error(`AI Generation failed: ${err.message}`);
            }

            // 5. Durably save turn BEFORE responding
            const userTime = new Date();
            const aiTime = new Date(userTime.getTime() + 100);

            const { error: historyInsertError } = await supabaseAdmin.from('chat_history').insert([
                {
                    user_id: userId,
                    conversation_id: targetConversationId,
                    message: transcription,
                    sender: 'user',
                    mode,
                    created_at: userTime.toISOString(),
                },
                {
                    user_id: userId,
                    conversation_id: targetConversationId,
                    message: aiMessageText,
                    sender: 'ai',
                    mode,
                    created_at: aiTime.toISOString(),
                },
            ]);

            if (historyInsertError) {
                throw new Error(`Failed to persist voice conversation: ${historyInsertError.message}`);
            }

            await supabaseAdmin
                .from('conversations')
                .update({ updated_at: new Date().toISOString() })
                .eq('id', targetConversationId)
                .eq('user_id', userId);

            // 6. TTS & AI Audio Upload (owner-scoped signed URL)
            let aiAudioUrl = null;
            try {
                responseAudioPath = `uploads/voice/response_${Date.now()}.mp3`;
                await textToSpeech(aiMessageText, responseAudioPath);

                const aiObjectPath = `${userId}/${path.basename(responseAudioPath)}`;
                const aiAudioBuffer = fs.readFileSync(responseAudioPath);

                const { error: uploadError } = await supabaseAdmin.storage
                    .from('voice-responses')
                    .upload(aiObjectPath, aiAudioBuffer, {
                        contentType: 'audio/mpeg',
                        cacheControl: '3600',
                    });

                if (uploadError) {
                    logger.warn('AI audio upload to Supabase failed:', uploadError.message);
                } else {
                    aiAudioUrl = await createOwnerSignedUrl(aiObjectPath);
                }
            } catch (ttsError) {
                logger.warn('TTS/Upload failed after conversation persisted (non-fatal):', ttsError.message);
                aiAudioUrl = null;
            }

            await Promise.all([
                unlink(audioFilePath).catch(() => {}),
                responseAudioPath ? unlink(responseAudioPath).catch(() => {}) : Promise.resolve(),
            ]);

            responseCompleted = true;
            res.json({
                success: true,
                conversationId: targetConversationId,
                userMessage: transcription,
                userAudioUrl,
                aiResponse: aiMessageText,
                audioUrl: aiAudioUrl,
                audioAvailable: !!aiAudioUrl,
                ...(aiAudioUrl ? {} : { audioWarning: 'Voice audio playback is temporarily unavailable' }),
            });
        } catch (error) {
            logger.error('Voice processing error:', error.message);

            if (!responseCompleted && req.reservedQuota) {
                await releaseDailyQuota(req.reservedQuota.userId, req.reservedQuota.actionType);
            }

            if (audioFilePath) await unlink(audioFilePath).catch(() => {});
            if (responseAudioPath) await unlink(responseAudioPath).catch(() => {});

            res.status(500).json({
                error: 'Failed to process voice message',
                details: error.message,
            });
        }
    }
);

router.get('/test', verifyToken, async (req, res) => {
    try {
        const { checkWhisperInstalled } = await import('../services/whisperService.js');
        const isInstalled = await checkWhisperInstalled();
        res.json({ whisperInstalled: isInstalled });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

export default router;
