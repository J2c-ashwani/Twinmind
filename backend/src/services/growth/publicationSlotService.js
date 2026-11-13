import crypto from 'crypto';
import logger from '../../config/logger.js';
import { supabaseAdmin } from '../../config/supabase.js';

export const SlotStatus = {
    PENDING: 'pending',
    RENDERING: 'rendering',
    PUBLISHING: 'publishing',
    VERIFYING: 'verifying',
    PUBLISHED: 'published',
    FAILED: 'failed',
};

function deterministicLockUuid(slotKey) {
    const hash = crypto.createHash('sha256').update(`slot_lock:${slotKey}`).digest('hex');
    return [
        hash.slice(0, 8),
        hash.slice(8, 12),
        '4' + hash.slice(13, 16),
        '8' + hash.slice(17, 20),
        hash.slice(20, 32),
    ].join('-');
}

class PublicationSlotService {
    constructor() {
        this._inMemoryLocks = new Map();
        this._maxRetries = 3;
    }

    formatSlotKey(platform, slotDate, slotIndex = 1) {
        return `${platform}:${slotDate}:${slotIndex}`;
    }

    /**
     * Atomically claims a publication slot using compare-and-set semantics.
     * Fails closed on unavailable persistence unless force=true.
     */
    async claimSlot({ platform, slotDate, slotIndex = 1, workerId = `worker_${process.pid}_${Date.now()}`, force = false }) {
        const slotKey = this.formatSlotKey(platform, slotDate, slotIndex);

        if (!force && this._inMemoryLocks.has(slotKey)) {
            logger.warn(`🔒 [SLOT SERVICE] Slot ${slotKey} is locked in-process by another task.`);
            return { granted: false, slotKey, reason: 'in_process_lock' };
        }

        this._inMemoryLocks.set(slotKey, workerId);

        try {
            const leaseExpiry = new Date(Date.now() + 15 * 60 * 1000).toISOString();
            const nowIso = new Date().toISOString();

            const { data: existingSlot, error: selectErr } = await supabaseAdmin
                .from('growth_publication_slots')
                .select('*')
                .eq('slot_key', slotKey)
                .maybeSingle();

            if (!selectErr) {
                if (existingSlot) {
                    if (existingSlot.status === SlotStatus.PUBLISHED && !force) {
                        this._inMemoryLocks.delete(slotKey);
                        return { granted: false, slotKey, status: SlotStatus.PUBLISHED, reason: 'already_published' };
                    }

                    if ((existingSlot.status === SlotStatus.RENDERING || existingSlot.status === SlotStatus.PUBLISHING) && !force) {
                        const leaseValid = existingSlot.locked_until && new Date(existingSlot.locked_until) > new Date();
                        if (leaseValid) {
                            this._inMemoryLocks.delete(slotKey);
                            return { granted: false, slotKey, status: existingSlot.status, reason: 'lease_active' };
                        }
                    }

                    if (existingSlot.status === SlotStatus.VERIFYING && !force) {
                        this._inMemoryLocks.delete(slotKey);
                        return { granted: false, slotKey, status: SlotStatus.VERIFYING, reason: 'verifying_timeout' };
                    }

                    // Compare-and-set predicate prevents dual workers from claiming the same stale/pending slot simultaneously
                    let updateQuery = supabaseAdmin
                        .from('growth_publication_slots')
                        .update({
                            status: SlotStatus.RENDERING,
                            locked_until: leaseExpiry,
                            worker_id: workerId,
                            attempts: (existingSlot.attempts || 0) + 1,
                            updated_at: nowIso,
                        })
                        .eq('slot_key', slotKey)
                        .eq('status', existingSlot.status);

                    if (existingSlot.locked_until) {
                        updateQuery = updateQuery.eq('locked_until', existingSlot.locked_until);
                    } else {
                        updateQuery = updateQuery.is('locked_until', null);
                    }

                    const { data: updated, error: updateErr } = await updateQuery
                        .select()
                        .maybeSingle();

                    if (!updateErr && updated) {
                        logger.info(`🔑 [SLOT SERVICE] Acquired slot CAS lease: ${slotKey} (attempt ${updated.attempts})`);
                        return { granted: true, slotKey, workerId, status: SlotStatus.RENDERING, attempts: updated.attempts };
                    }

                    this._inMemoryLocks.delete(slotKey);
                    return { granted: false, slotKey, reason: 'cas_conflict' };
                }

                const { data: inserted, error: insertErr } = await supabaseAdmin
                    .from('growth_publication_slots')
                    .insert({
                        slot_key: slotKey,
                        platform,
                        slot_date: slotDate,
                        slot_index: slotIndex,
                        status: SlotStatus.RENDERING,
                        locked_until: leaseExpiry,
                        worker_id: workerId,
                        attempts: 1,
                        created_at: nowIso,
                        updated_at: nowIso,
                    })
                    .select()
                    .maybeSingle();

                if (!insertErr && inserted) {
                    return { granted: true, slotKey, workerId, status: SlotStatus.RENDERING, attempts: 1 };
                }

                if (insertErr?.code === '23505') {
                    this._inMemoryLocks.delete(slotKey);
                    return { granted: false, slotKey, reason: 'concurrent_slot_created' };
                }
            }
        } catch (dbErr) {
            logger.warn(`[SLOT SERVICE] Primary table query note (${dbErr.message}). Evaluating fallback durable ledger.`);
        }

        // Scoped fallback ledger + per-slot lease lock (only when growth_publication_slots table is absent)
        try {
            const ledgerAction = `slot_ledger:${slotKey}`;
            const { data: publishedRows, error: ledgerErr } = await supabaseAdmin
                .from('usage_tracking')
                .select('id')
                .eq('action_type', ledgerAction)
                .limit(1);

            if (ledgerErr) {
                throw ledgerErr;
            }

            if (publishedRows && publishedRows.length > 0 && !force) {
                this._inMemoryLocks.delete(slotKey);
                return { granted: false, slotKey, status: SlotStatus.PUBLISHED, reason: 'already_published_durable' };
            }

            const fallbackCode = `LOCK-${slotKey}`;
            const staleCutoff = new Date(Date.now() - 20 * 60 * 1000).toISOString();

            // Expire only stale leases belonging specifically to THIS slotKey
            await supabaseAdmin
                .from('referral_codes')
                .delete()
                .eq('code', fallbackCode)
                .lt('created_at', staleCutoff);

            const { error: lockErr } = await supabaseAdmin
                .from('referral_codes')
                .insert({
                    user_id: deterministicLockUuid(slotKey),
                    code: fallbackCode,
                });

            if (lockErr) {
                this._inMemoryLocks.delete(slotKey);
                if (lockErr.code === '23505') {
                    return { granted: false, slotKey, status: SlotStatus.RENDERING, reason: 'database_slot_locked' };
                }
                if (!force) {
                    return { granted: false, slotKey, reason: `fallback_lock_error:${lockErr.code || 'unknown'}` };
                }
            }

            return { granted: true, slotKey, status: SlotStatus.RENDERING, attempts: 1 };
        } catch (fallbackErr) {
            logger.error(`[SLOT SERVICE] Fallback ledger unavailable for ${slotKey}: ${fallbackErr.message}`);
            if (force) {
                return { granted: true, slotKey, status: SlotStatus.RENDERING, attempts: 1 };
            }
            this._inMemoryLocks.delete(slotKey);
            return { granted: false, slotKey, reason: 'lock_unavailable' };
        }
    }

    async transitionStatus(slotKey, targetStatus, metadata = {}, workerId = null) {
        const effectiveWorkerId = workerId || metadata?.workerId || null;
        const nowIso = new Date().toISOString();
        try {
            let updateQuery = supabaseAdmin
                .from('growth_publication_slots')
                .update({
                    status: targetStatus,
                    post_id: metadata.postId || null,
                    post_url: metadata.postUrl || null,
                    error_message: metadata.errorMessage || null,
                    updated_at: nowIso,
                    ...(targetStatus === SlotStatus.PUBLISHED || targetStatus === SlotStatus.FAILED ? { locked_until: null } : {}),
                })
                .eq('slot_key', slotKey);

            if (effectiveWorkerId) {
                updateQuery = updateQuery.eq('worker_id', effectiveWorkerId);
            }

            const { data, error } = await updateQuery.select();
            if (error) {
                logger.warn(`[SLOT SERVICE] Could not update slot table for ${slotKey}:`, error.message);
            } else if (effectiveWorkerId && (!data || data.length === 0)) {
                logger.warn(`[SLOT SERVICE] Slot transition to ${targetStatus} rejected for ${slotKey}: worker ${effectiveWorkerId} is no longer the active lease owner`);
                return false;
            }
        } catch (e) {
            logger.warn(`[SLOT SERVICE] Could not update slot table for ${slotKey}:`, e.message);
        }

        if (targetStatus === SlotStatus.PUBLISHED || targetStatus === SlotStatus.FAILED) {
            this._inMemoryLocks.delete(slotKey);
            try {
                await supabaseAdmin
                    .from('referral_codes')
                    .delete()
                    .eq('code', `LOCK-${slotKey}`);
            } catch {}
        }

        if (targetStatus === SlotStatus.PUBLISHED) {
            try {
                const { data: users } = await supabaseAdmin.from('users').select('id').limit(1);
                if (users && users.length > 0) {
                    await supabaseAdmin.from('usage_tracking').insert({
                        user_id: users[0].id,
                        action_type: `slot_ledger:${slotKey}`,
                        count: 1,
                        period_start: nowIso,
                        period_end: nowIso,
                        created_at: nowIso,
                    });
                }
            } catch (err) {
                logger.warn(`[SLOT SERVICE] Durable ledger commit warning: ${err.message}`);
            }
        }

        return true;
    }

    /**
     * Reconcile ambiguous timeout against native platform feed without inventing synthetic URLs.
     */
    async reconcileAmbiguousTimeout({ platform, slotKey, adapter }) {
        logger.warn(`⚠️ [SLOT SERVICE] Ambiguous timeout during publish for ${slotKey}. Entering VERIFYING state...`);
        await this.transitionStatus(slotKey, SlotStatus.VERIFYING, {
            errorMessage: 'Ambiguous API response/timeout: awaiting reconciliation',
        });

        try {
            if (adapter && typeof adapter.hasPublishedTodayIST === 'function') {
                const verifiedOnPlatform = await adapter.hasPublishedTodayIST();
                if (verifiedOnPlatform) {
                    const postMeta =
                        typeof adapter.getLatestTodayPost === 'function'
                            ? await adapter.getLatestTodayPost().catch(() => null)
                            : null;
                    await this.transitionStatus(slotKey, SlotStatus.PUBLISHED, {
                        postId: postMeta?.postId || null,
                        postUrl: postMeta?.url || null,
                        errorMessage: 'Verified live on platform feed after timeout',
                    });
                    return { reconciled: true, status: SlotStatus.PUBLISHED, postId: postMeta?.postId || null };
                }

                await this.transitionStatus(slotKey, SlotStatus.PENDING, {
                    errorMessage: 'No live post found after timeout. Reset to pending for retry.',
                });
                return { reconciled: true, status: SlotStatus.PENDING };
            }
        } catch (recErr) {
            logger.error(`[SLOT SERVICE] Platform reconciliation query failed for ${slotKey}:`, recErr.message);
        }

        await this.transitionStatus(slotKey, SlotStatus.PENDING, {
            errorMessage: 'Ambiguous timeout unverified. Reset to pending for retry sweep.',
        });
        return { reconciled: false, status: SlotStatus.PENDING };
    }

    async releaseSlot(slotKey) {
        this._inMemoryLocks.delete(slotKey);
        try {
            await supabaseAdmin
                .from('referral_codes')
                .delete()
                .eq('code', `LOCK-${slotKey}`);
        } catch {}
    }
}

const publicationSlotService = new PublicationSlotService();
export { publicationSlotService };
export default publicationSlotService;
