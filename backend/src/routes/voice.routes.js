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
        const allowedTypes = /mp3|wav|m4a|aac|ogg|webm/;
        const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = allowedTypes.test(file.mimetype);

        if (extname && mimetype) {
            cb(null, true);
        } else {
            cb(new Error('Only audio files are allowed'));
        }
    }
});

router.post('/message', verifyToken, upload.single('audio'), async (req, res) => {
    let audioFilePath = null;
    let responseAudioPath = null;
    let userAudioUrl = null;

    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No audio file provided' });
        }

        audioFilePath = req.file.path;
        const { mode = 'normal', conversationId } = req.body;
        const userId = req.user.userId;

        // 1. Resolve Conversation ID
        let targetConversationId = conversationId;
        if (!targetConversationId || targetConversationId === 'null' || targetConversationId === 'undefined') {
            try {
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
                // Fallback?
            }
        }

        // 2. Upload User Audio (For Replay)
        try {
            const userAudioName = `user_${Date.now()}_${path.basename(audioFilePath)}`;
            const userAudioBuffer = fs.readFileSync(audioFilePath);
            const { error: userUploadError } = await supabase.storage
                .from('voice-responses')
                .upload(userAudioName, userAudioBuffer, { contentType: 'audio/webm', cacheControl: '3600' });

            if (!userUploadError) {
                const { data: { publicUrl } } = supabase.storage
                    .from('voice-responses')
                    .getPublicUrl(userAudioName);
                userAudioUrl = publicUrl;
            }
        } catch (err) {
            logger.error("Failed to upload user audio:", err);
            // Non-blocking
        }

        // 3. Transcribe
        const transcription = await transcribeAudio(audioFilePath);
        if (!transcription || transcription.trim() === '') {
            return res.status(400).json({ error: 'Could not transcribe audio' });
        }

        // 4. Generate AI Response
        const aiResponse = await generateChatResponse(
            userId,
            transcription, // userMessage
            mode,
            '', // modifiers
            targetConversationId// conversationId
        );

        // Extract the message text (generateChatResponse returns an object)
        const aiMessageText = typeof aiResponse === 'string' ? aiResponse : (aiResponse?.message || aiResponse?.text || String(aiResponse));

        // 5. Save to Database
        try {
            const userTime = new Date();
            const aiTime = new Date(userTime.getTime() + 100);

            // Attempt to save (try to include metadata if schema supports, otherwise plain)
            // We use 'message' field primarily.
            await supabaseAdmin.from('chat_history').insert([
                {
                    user_id: userId,
                    conversation_id: targetConversationId,
                    message: transcription,
                    sender: 'user',
                    mode: mode,
                    created_at: userTime.toISOString(),
                    // metadata: { audio_url: userAudioUrl } // If column doesn't exist, this might fail unless JSONB
                },
                {
                    user_id: userId,
                    conversation_id: targetConversationId,
                    message: aiMessageText, // Use extracted text, not the full object
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
            logger.error("DB Save failed:", dbError);
            // Proceed despite DB error to return voice response
        }

        // 6. TTS & AI Audio Upload
        responseAudioPath = `uploads/voice/response_${Date.now()}.mp3`;
        await textToSpeech(aiMessageText, responseAudioPath); // Use extracted text

        const aiAudioName = path.basename(responseAudioPath);
        const aiAudioBuffer = fs.readFileSync(responseAudioPath);

        let aiAudioUrl = null;
        try {
            const { error: uploadError } = await supabase.storage
                .from('voice-responses')
                .upload(aiAudioName, aiAudioBuffer, {
                    contentType: 'audio/mpeg',
                    cacheControl: '3600'
                });

            if (uploadError) {
                logger.warn('AI audio upload failed (bucket may not exist):', uploadError.message);
            } else {
                const { data: { publicUrl } } = supabase.storage
                    .from('voice-responses')
                    .getPublicUrl(aiAudioName);
                aiAudioUrl = publicUrl;
            }
        } catch (uploadErr) {
            logger.warn('AI audio storage error:', uploadErr.message);
            // Continue without audio URL
        }

        // Cleanup
        await Promise.all([
            unlink(audioFilePath).catch(() => { }),
            unlink(responseAudioPath).catch(() => { })
        ]);

        res.json({
            success: true,
            conversationId: targetConversationId,
            userMessage: transcription,
            userAudioUrl, // May be null if upload failed
            aiResponse: aiMessageText, // Return the text, not the full object
            audioUrl: aiAudioUrl // May be null if upload failed
        });

    } catch (error) {
        logger.error('Voice message processing error:', error);
        if (audioFilePath) await unlink(audioFilePath).catch(() => { });
        if (responseAudioPath) await unlink(responseAudioPath).catch(() => { });

        res.status(500).json({
            error: 'Failed to process voice message',
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
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
