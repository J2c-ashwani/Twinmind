import { supabaseAdmin } from '../config/supabase.js';
import { logger } from '../config/logger.js';

export const DATA_DELETION_CATEGORIES = Object.freeze([
    'chat',
    'memories',
    'voice',
    'personality',
    'insights',
]);

const MISSING_TABLE_CODES = new Set(['42P01', 'PGRST205']);

function isMissingTableError(error) {
    if (!error) return false;
    // Explicitly reject Postgres undefined_column (42703) or column-not-found errors
    if (error.code === '42703') return false;
    if (/column [^\n]+ does not exist/i.test(error.message || '')) return false;

    if (MISSING_TABLE_CODES.has(error.code)) return true;
    return /(?:^|[^\w])relation "[^"]+" does not exist|relation [^\n]+ does not exist|table [^\n]+ does not exist|Could not find the table/i.test(
        error.message || ''
    );
}

async function safeDeleteWhere(db, table, column, userId) {
    const { error } = await db.from(table).delete().eq(column, userId);
    if (error) {
        if (isMissingTableError(error)) {
            return { table, skipped: true };
        }
        throw error;
    }
    return { table, deleted: true };
}

async function listAllInPrefix(bucket, prefix) {
    const allEntries = [];
    const PAGE_SIZE = 1000;
    let offset = 0;
    while (true) {
        const { data, error } = await bucket.list(prefix, { limit: PAGE_SIZE, offset });
        if (error) {
            logger.error(`Failed to list voice files for prefix ${prefix}: ${error.message}`);
            throw error;
        }
        if (!data || data.length === 0) break;
        allEntries.push(...data);
        if (data.length < PAGE_SIZE) break;
        offset += data.length;
    }
    return allEntries;
}

export async function deleteVoiceFilesForUser(userId, storageClient = supabaseAdmin.storage) {
    const bucket = storageClient.from('voice-responses');
    const pathsToRemove = [];

    const entries = await listAllInPrefix(bucket, userId);

    for (const entry of entries) {
        if (!entry?.name) continue;
        // In Supabase Storage, directories have id === null
        if (entry.id === null) {
            const prefix = `${userId}/${entry.name}`;
            const nested = await listAllInPrefix(bucket, prefix);
            for (const item of nested) {
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

    let totalRemoved = 0;
    for (let i = 0; i < pathsToRemove.length; i += 1000) {
        const batch = pathsToRemove.slice(i, i + 1000);
        const { error: removeError } = await bucket.remove(batch);
        if (removeError) {
            throw removeError;
        }
        totalRemoved += batch.length;
    }
    return totalRemoved;
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
            await safeDeleteWhere(db, 'daily_insights', 'user_id', userId);
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
        ['twin_matches', 'user1_id'],
        ['twin_matches', 'user2_id'],
        ['referral_events', 'referrer_user_id'],
        ['referral_events', 'referred_user_id'],
        ['referral_codes', 'user_id'],
        ['daily_insights', 'user_id'],
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
