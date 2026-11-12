import { supabaseAdmin } from '../config/supabase.js';
import { logger } from '../config/logger.js';

export const DATA_DELETION_CATEGORIES = Object.freeze([
    'chat',
    'memories',
    'voice',
    'personality',
    'insights',
]);

const MISSING_TABLE_CODES = new Set(['42P01', 'PGRST205', '42703']);

async function safeDeleteWhere(db, table, column, userId) {
    const { error } = await db.from(table).delete().eq(column, userId);
    if (error) {
        if (MISSING_TABLE_CODES.has(error.code) || /does not exist|Could not find the table/i.test(error.message || '')) {
            return { table, skipped: true };
        }
        throw error;
    }
    return { table, deleted: true };
}

export async function deleteVoiceFilesForUser(userId, storageClient = supabaseAdmin.storage) {
    const bucket = storageClient.from('voice-responses');
    const pathsToRemove = [];

    const { data: entries, error: listError } = await bucket.list(userId, { limit: 1000 });
    if (listError) {
        logger.warn(`Could not list voice files for user ${userId}: ${listError.message}`);
        return 0;
    }

    for (const entry of entries || []) {
        if (!entry?.name) continue;
        // In Supabase Storage, directories have id === null
        if (entry.id === null) {
            const prefix = `${userId}/${entry.name}`;
            const { data: nested } = await bucket.list(prefix, { limit: 1000 });
            for (const item of nested || []) {
                if (item?.name) {
                    pathsToRemove.push(`${prefix}/${item.name}`);
                }
            }
        } else {
            pathsToRemove.push(`${userId}/${entry.name}`);
        }
    }

    if (pathsToRemove.length === 0) {
        return 0;
    }

    const { error: removeError } = await bucket.remove(pathsToRemove);
    if (removeError) {
        throw removeError;
    }
    return pathsToRemove.length;
}

export async function deleteSelectedUserData({
    userId,
    categories,
    db = supabaseAdmin,
    storage = supabaseAdmin.storage,
}) {
    if (!userId) {
        const err = new Error('User ID is required');
        err.code = 'INVALID_USER';
        throw err;
    }

    if (!Array.isArray(categories) || categories.length === 0) {
        const err = new Error('At least one valid data category is required');
        err.code = 'INVALID_DATA_CATEGORIES';
        throw err;
    }

    const normalized = [...new Set(categories.map((c) => String(c).trim().toLowerCase()))];
    const invalid = normalized.filter((c) => !DATA_DELETION_CATEGORIES.includes(c));
    if (invalid.length > 0) {
        const err = new Error(`Unsupported data categories: ${invalid.join(', ')}`);
        err.code = 'INVALID_DATA_CATEGORIES';
        throw err;
    }

    let deletedVoiceFiles = 0;

    for (const category of normalized) {
        if (category === 'chat') {
            await safeDeleteWhere(db, 'message_embeddings', 'user_id', userId);
            await safeDeleteWhere(db, 'conversation_summaries', 'user_id', userId);
            await safeDeleteWhere(db, 'topic_cache', 'user_id', userId);
            await safeDeleteWhere(db, 'chat_history', 'user_id', userId);
            await safeDeleteWhere(db, 'conversations', 'user_id', userId);
        } else if (category === 'memories') {
            await safeDeleteWhere(db, 'message_embeddings', 'user_id', userId);
            await safeDeleteWhere(db, 'memory_vectors', 'user_id', userId);
            await safeDeleteWhere(db, 'shared_memories', 'user_id', userId);
            await safeDeleteWhere(db, 'memory_anniversaries', 'user_id', userId);
            await safeDeleteWhere(db, 'life_context', 'user_id', userId);
        } else if (category === 'voice') {
            deletedVoiceFiles = await deleteVoiceFilesForUser(userId, storage);
        } else if (category === 'personality') {
            await safeDeleteWhere(db, 'personality_answers', 'user_id', userId);
            await safeDeleteWhere(db, 'personality_profiles', 'user_id', userId);
        } else if (category === 'insights') {
            await safeDeleteWhere(db, 'emotional_metrics', 'user_id', userId);
            await safeDeleteWhere(db, 'emotional_history', 'user_id', userId);
            await safeDeleteWhere(db, 'metric_events', 'user_id', userId);
        }
    }

    return {
        success: true,
        deletedCategories: normalized,
        deletedVoiceFiles,
    };
}

export async function deleteUserAccount({
    userId,
    db = supabaseAdmin,
    authAdmin = supabaseAdmin.auth.admin,
    storage = supabaseAdmin.storage,
}) {
    if (!userId) {
        const err = new Error('User ID is required');
        err.code = 'INVALID_USER';
        throw err;
    }

    await deleteSelectedUserData({
        userId,
        categories: [...DATA_DELETION_CATEGORIES],
        db,
        storage,
    });

    const userScopedTables = [
        ['push_device_tokens', 'user_id'],
        ['proactive_messages', 'user_id'],
        ['relationship_milestones', 'user_id'],
        ['relationship_growth_metrics', 'user_id'],
        ['user_achievements', 'user_id'],
        ['user_streaks', 'user_id'],
        ['user_levels', 'user_id'],
        ['user_engagement', 'user_id'],
        ['daily_activity', 'user_id'],
        ['behavioral_triggers', 'user_id'],
        ['usage_tracking', 'user_id'],
        ['circle_members', 'user_id'],
        ['twin_match_invitations', 'requester_id'],
        ['twin_match_invitations', 'recipient_id'],
        ['twin_matches', 'user_a_id'],
        ['twin_matches', 'user_b_id'],
        ['referral_events', 'referrer_id'],
        ['referral_events', 'referred_user_id'],
        ['referral_codes', 'user_id'],
        ['subscriptions', 'user_id'],
        ['users', 'id'],
    ];

    for (const [table, column] of userScopedTables) {
        await safeDeleteWhere(db, table, column, userId);
    }

    const { error: authError } = await authAdmin.deleteUser(userId);
    if (authError) {
        throw authError;
    }

    return {
        success: true,
        deletedUserId: userId,
    };
}
