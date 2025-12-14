import { supabaseAdmin } from '../config/supabase.js';
import aiService from './aiService.js';
import logger from '../config/logger.js';

/**
 * Life Coach Service - Manages structured coaching programs and sessions
 */

/**
 * Get all available life coach programs
 */
export async function getPrograms() {
    try {
        const { data, error } = await supabaseAdmin
            .from('life_coach_programs')
            .select('*')
            .order('created_at', { ascending: true });

        if (error) throw error;
        return data;
    } catch (error) {
        logger.error('Error fetching programs:', error);
        throw error;
    }
}

/**
 * Start a program for a user
 */
export async function startProgram(userId, programId) {
    try {
        // Check if already started
        const { data: existing } = await supabaseAdmin
            .from('user_program_progress')
            .select('*')
            .eq('user_id', userId)
            .eq('program_id', programId)
            .single();

        if (existing) {
            return existing;
        }

        // Start new
        const { data, error } = await supabaseAdmin
            .from('user_program_progress')
            .insert({
                user_id: userId,
                program_id: programId,
                current_day: 1,
                status: 'active'
            })
            .select()
            .single();

        if (error) throw error;
        return data;
    } catch (error) {
        logger.error('Error starting program:', error);
        throw error;
    }
}

/**
 * Get current session content for a user
 */
export async function getSession(userId, programId) {
    try {
        // Get progress
        const { data: progress } = await supabaseAdmin
            .from('user_program_progress')
            .select('*')
            .eq('user_id', userId)
            .eq('program_id', programId)
            .single();

        if (!progress) throw new Error('Program not started');

        // Get day content
        const { data: dayContent } = await supabaseAdmin
            .from('program_days')
            .select('*')
            .eq('program_id', programId)
            .eq('day_number', progress.current_day)
            .single();

        if (!dayContent) throw new Error('Day content not found');

        // Get chat history for this session (if any)
        // We might store session chat in a separate table or filter main chat
        // For simplicity, we'll assume session chat is transient or stored in metadata for now
        // OR we can use the main chat_history table with a specific context/metadata

        return {
            progress,
            content: dayContent
        };
    } catch (error) {
        logger.error('Error getting session:', error);
        throw error;
    }
}

/**
 * Process a message in a coaching session
 */
export async function processSessionMessage(userId, programId, userMessage, history = []) {
    try {
        // Get context
        const { progress, content } = await getSession(userId, programId);

        // Build System Prompt
        const systemPrompt = `
You are a compassionate and wise AI Life Coach guiding the user through Day ${content.day_number} of their program.
Title: "${content.title}"
Goal: "${content.goal}"

Your role is to:
1. Help the user achieve today's goal.
2. Ask thoughtful, open-ended questions.
3. Listen deeply and validate their feelings.
4. Provide specific, actionable advice related to the topic.
5. Keep responses concise (2-3 sentences) and conversational.

Current Exercise Instructions: "${content.exercise_instructions}"

If the user seems ready to move on, suggest completing the daily exercise.
`;

        // Generate Response using correct method name
        const response = await aiService.generateChatResponse(
            userMessage,
            history,
            systemPrompt,
            'coaching' // Task type for routing
        );

        return response;
    } catch (error) {
        logger.error('Error processing session message:', error);
        throw error;
    }
}

/**
 * Complete the current day/session
 */
export async function completeSession(userId, programId, notes = '') {
    try {
        const { progress } = await getSession(userId, programId);

        // Record completion
        await supabaseAdmin
            .from('user_daily_completions')
            .insert({
                progress_id: progress.id,
                day_number: progress.current_day,
                user_notes: notes
            });

        // Get program details to check total days
        const { data: program } = await supabaseAdmin
            .from('life_coach_programs')
            .select('duration_days')
            .eq('id', programId)
            .single();

        let updateData = {};

        if (progress.current_day >= program.duration_days) {
            updateData = { status: 'completed', completed_at: new Date() };
        } else {
            updateData = { current_day: progress.current_day + 1 };
        }

        // Update progress
        const { data, error } = await supabaseAdmin
            .from('user_program_progress')
            .update(updateData)
            .eq('id', progress.id)
            .select()
            .single();

        if (error) throw error;
        return data;
    } catch (error) {
        logger.error('Error completing session:', error);
        throw error;
    }
}

export default {
    getPrograms,
    startProgram,
    getSession,
    processSessionMessage,
    completeSession
};
