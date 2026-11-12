import { supabaseAdmin } from '../config/supabase.js';

/**
 * Verifies that a conversation exists and belongs to the authenticated user.
 */
export async function verifyConversationOwnership(conversationId, userId) {
    if (!conversationId || !userId) {
        return { owned: false, conversation: null };
    }

    const { data, error } = await supabaseAdmin
        .from('conversations')
        .select('id, user_id, created_at')
        .eq('id', conversationId)
        .eq('user_id', userId)
        .maybeSingle();

    if (error) {
        throw error;
    }

    return {
        owned: Boolean(data),
        conversation: data || null,
    };
}

function isSameCalendarDay(a, b) {
    return (
        a.getFullYear() === b.getFullYear() &&
        a.getMonth() === b.getMonth() &&
        a.getDate() === b.getDate()
    );
}

/**
 * Validates a supplied conversationId for ownership, or finds/creates today's conversation.
 */
export async function resolveConversationForUser(userId, suppliedConversationId = null) {
    const normalized =
        suppliedConversationId &&
        suppliedConversationId !== 'null' &&
        suppliedConversationId !== 'undefined'
            ? String(suppliedConversationId).trim()
            : null;

    if (normalized) {
        const { owned } = await verifyConversationOwnership(normalized, userId);
        if (!owned) {
            const err = new Error('Conversation not found or access denied');
            err.statusCode = 404;
            throw err;
        }
        return normalized;
    }

    const { data: recent, error: recentError } = await supabaseAdmin
        .from('conversations')
        .select('id, created_at')
        .eq('user_id', userId)
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle();

    if (recentError) throw recentError;

    const now = new Date();
    if (recent && isSameCalendarDay(new Date(recent.created_at), now)) {
        return recent.id;
    }

    const dateTitle = now.toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        year: 'numeric',
    });

    const { data: newConv, error: createError } = await supabaseAdmin
        .from('conversations')
        .insert([
            {
                user_id: userId,
                title: dateTitle,
                created_at: now.toISOString(),
                updated_at: now.toISOString(),
            },
        ])
        .select('id')
        .single();

    if (createError || !newConv) {
        throw createError || new Error('Failed to create conversation');
    }

    return newConv.id;
}

export default {
    verifyConversationOwnership,
    resolveConversationForUser,
};
