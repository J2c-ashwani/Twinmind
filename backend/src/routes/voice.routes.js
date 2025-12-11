import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { promisify } from 'util';
import { verifyToken } from '../middleware/authMiddleware.js';
import { transcribeAudio } from '../services/whisperService.js';
import { textToSpeech } from '../services/ttsService.js';
import { generateChatResponse } from '../services/chatEngine.js';
import { supabase, supabaseAdmin } from '../config/supabase.js';
import logger from '../config/logger.js';

const router = express.Router();
const unlink = promisify(fs.unlink);

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
    }
});

const upload = multer({
    storage,
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
    fileFilter: (req, file, cb) => {
        logger.info(`Incoming voice upload check: name=${file.originalname}, type=${file.mimetype}`);

        const allowedTypes = /mp3|wav|m4a|aac|ogg|webm/;
        const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = allowedTypes.test(file.mimetype);

        // Allow if EITHER extension OR mimetype is valid to handle generic binary uploads
        if (extname || mimetype) {
            cb(null, true);
        } else {
            logger.error(`Voice upload rejected: name=${file.originalname}, mime=${file.mimetype}`);
            cb(new Error(`Only audio files are allowed. Got: ${file.mimetype}`));
        }
    }
});

router.post('/message', verifyToken, upload.single('audio'), async (req, res) => {
    let audioFilePath = null;
    let responseAudioPath = null;

    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No audio file provided' });
        }

        audioFilePath = req.file.path;
        const { mode = 'normal', conversationId } = req.body;
        const userId = req.user.userId;

        logger.info(`Processing voice message from user ${userId}, file: ${audioFilePath}`);

        // 1. Resolve Conversation ID
        let targetConversationId = conversationId;
        if (!targetConversationId || targetConversationId === 'null' || targetConversationId === 'undefined') {
            try {
                // Try to find recent or create new
                const { data: recent } = await supabaseAdmin
                    .from('conversations')
                    .select('id')
                    .eq('user_id', userId)
                    .order('updated_at', { ascending: false })
                    .limit(1)
                    .maybeSingle();

                if (recent) {
                    targetConversationId = recent.id;
                } else {
                    const { data: newConv } = await supabaseAdmin
                        .from('conversations')
                        .insert([{
                            user_id: userId,
                            title: 'New Voice Chat',
                            created_at: new Date().toISOString(),
                            updated_at: new Date().toISOString()
                        }])
                        .select()
                        .single();
                    if (newConv) targetConversationId = newConv.id;
                }
            } catch (err) {
                logger.error("Error determining conversation:", err);
            }
        }

        // 2. Upload User Audio (Optional, for replay)
        let userAudioUrl = null;
        try {
            const userAudioName = `user_${Date.now()}_${path.basename(audioFilePath)}`;
            const userAudioBuffer = fs.readFileSync(audioFilePath);
            const { error: userUploadError } = await supabaseAdmin.storage
                .from('voice-responses')
                .upload(userAudioName, userAudioBuffer, { contentType: 'audio/webm', cacheControl: '3600' });

            if (!userUploadError) {
                const { data: { publicUrl } } = supabaseAdmin.storage
                    .from('voice-responses')
                    .getPublicUrl(userAudioName);
                userAudioUrl = publicUrl;
            }
        } catch (err) {
            logger.warn("Failed to upload user audio (non-critical):", err.message);
        }

        // 3. Transcribe Audio (Gemini/Whisper)
        let transcription;
        try {
            transcription = await transcribeAudio(audioFilePath);
            if (!transcription || transcription.trim() === '') {
                throw new Error('Transcription service returned empty result');
            }
            logger.info(`Transcription complete: "${transcription.substring(0, 30)}..."`);
        } catch (err) {
            logger.error('Transcription failed:', err);
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
            aiMessageText = typeof aiResponse === 'string' ? aiResponse : (aiResponse?.message || aiResponse?.text || String(aiResponse));
            logger.info(`AI Response generated: "${aiMessageText.substring(0, 30)}..."`);
        } catch (err) {
            logger.error('AI Generation failed:', err);
            throw new Error(`AI Generation failed: ${err.message}`);
        }

        // 5. Save to Database
        try {
            const userTime = new Date();
            const aiTime = new Date(userTime.getTime() + 100);

            await supabaseAdmin.from('chat_history').insert([
                {
                    user_id: userId,
                    conversation_id: targetConversationId,
                    message: transcription,
                    sender: 'user',
                    mode: mode,
                    created_at: userTime.toISOString()
                },
                {
                    user_id: userId,
                    conversation_id: targetConversationId,
                    message: aiMessageText,
                    sender: 'ai',
                    mode: mode,
                    created_at: aiTime.toISOString()
                }
            ]);

            if (targetConversationId) {
                await supabaseAdmin
                    .from('conversations')
                    .update({ updated_at: new Date().toISOString() })
                    .eq('id', targetConversationId);
            }
        } catch (dbError) {
            logger.error("DB Save failed (non-critical):", dbError.message);
        }

        // 6. TTS & AI Audio Upload
        let aiAudioUrl = null;
        try {
            responseAudioPath = `uploads/voice/response_${Date.now()}.mp3`;
            await textToSpeech(aiMessageText, responseAudioPath);

            const aiAudioName = path.basename(responseAudioPath);
            const aiAudioBuffer = fs.readFileSync(responseAudioPath);

            const { error: uploadError } = await supabaseAdmin.storage
                .from('voice-responses')
                .upload(aiAudioName, aiAudioBuffer, {
                    contentType: 'audio/mpeg',
                    cacheControl: '3600'
                });

            if (uploadError) {
                logger.warn('AI audio upload to Supabase failed:', uploadError.message);
            } else {
                const { data: { publicUrl } } = supabaseAdmin.storage
                    .from('voice-responses')
                    .getPublicUrl(aiAudioName);
                aiAudioUrl = publicUrl;
            }
        } catch (ttsError) {
            logger.error('TTS/Upload failed:', ttsError);
            throw new Error(`TTS generation failed: ${ttsError.message}`);
        }

        // Cleanup
        await Promise.all([
            unlink(audioFilePath).catch(() => { }),
            responseAudioPath ? unlink(responseAudioPath).catch(() => { }) : Promise.resolve()
        ]);

        // Success Response
        res.json({
            success: true,
            conversationId: targetConversationId,
            userMessage: transcription,
            userAudioUrl,
            aiResponse: aiMessageText,
            audioUrl: aiAudioUrl
        });

    } catch (error) {
        logger.error('Voice processing error:', error);

        // Cleanup on error
        if (audioFilePath) await unlink(audioFilePath).catch(() => { });
        if (responseAudioPath) await unlink(responseAudioPath).catch(() => { });

        res.status(500).json({
            error: 'Failed to process voice message',
            details: error.message // Expose details for debugging
        });
    }
});

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
