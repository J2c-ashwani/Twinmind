import crypto from 'crypto';
import logger from '../config/logger.js';
import { sendEmail } from './emailService.js';
import { supabaseAdmin } from '../config/supabase.js';
import leadDiscoveryService, { PERMANENT_SUPPRESSION_LIST } from './leadDiscoveryService.js';

const activeTicks = new Set();

function normalizeEmail(email) {
    return String(email || '').toLowerCase().trim();
}

function buildIdempotencyKey(campaignType, candidate) {
    const emailHash = crypto
        .createHash('sha256')
        .update(`${campaignType}:${normalizeEmail(candidate.email)}`)
        .digest('hex')
        .slice(0, 24);
    return `outreach-${campaignType}-${candidate.id || emailHash}`;
}

/**
 * Checks global suppression list + any terminal/active Supabase record for this email across campaigns.
 */
async function isEmailSuppressed(email, campaignType) {
    const norm = normalizeEmail(email);
    if (!norm || PERMANENT_SUPPRESSION_LIST.has(norm) || !leadDiscoveryService.isValidEmail(norm)) {
        return 'suppressed_contact';
    }

    try {
        const { data: priorRows, error } = await supabaseAdmin
            .from('outreach_campaign_leads')
            .select('status, campaign_type')
            .eq('email', norm);

        if (error) {
            logger.warn(`[OUTREACH] Suppression lookup warning for ${norm}: ${error.message}`);
            return 'suppression_lookup_unavailable';
        }

        for (const row of priorRows || []) {
            if (row.status === 'unsubscribed' || row.status === 'bounced') {
                return `previously_${row.status}`;
            }
            if (row.campaign_type === campaignType && ['sent', 'sending', 'skipped'].includes(row.status)) {
                return `already_${row.status}`;
            }
        }
    } catch (err) {
        logger.warn(`[OUTREACH] Suppression lookup exception: ${err.message}`);
        return 'suppression_lookup_unavailable';
    }

    return null;
}

/**
 * Atomically claims one pending Supabase lead (pending -> sending) so concurrent workers cannot double-send.
 */
async function claimNextDatabaseCandidate(campaignType, nowIso) {
    const { data: pendingRows, error } = await supabaseAdmin
        .from('outreach_campaign_leads')
        .select('*')
        .eq('campaign_type', campaignType)
        .eq('status', 'pending')
        .order('created_at', { ascending: true })
        .limit(5);

    if (error || !pendingRows || pendingRows.length === 0) {
        return null;
    }

    for (const row of pendingRows) {
        const { data: claimed, error: claimErr } = await supabaseAdmin
            .from('outreach_campaign_leads')
            .update({
                status: 'sending',
                last_attempt_at: nowIso,
                updated_at: nowIso,
            })
            .eq('id', row.id)
            .eq('status', 'pending')
            .select('*')
            .maybeSingle();

        if (!claimErr && claimed) {
            return claimed;
        }
    }

    return null;
}

/**
 * Shared atomic runner for PR, Investor, and M&A acquisition outreach campaigns.
 */
export async function executeOutreachTick({
    campaignType,
    logPrefix,
    autorunEnvVar,
    forceEnvVar,
    isBusinessHoursFn,
    service,
    footerNote,
    resendTagType,
    organizationTagKey,
    force = false,
}) {
    service._refreshDailyQuota();

    if (process.env[autorunEnvVar] === 'false' && !force) {
        logger.info(`${logPrefix} Autorun disabled via ${autorunEnvVar}=false`);
        return { action: 'skipped', reason: 'autorun_disabled' };
    }

    if (activeTicks.has(campaignType)) {
        logger.warn(`${logPrefix} Tick already in progress; skipping concurrent invocation.`);
        return { action: 'skipped', reason: 'tick_in_progress' };
    }

    activeTicks.add(campaignType);
    try {
        const windowCheck = isBusinessHoursFn();
        if (!windowCheck.isHours && !force && process.env[forceEnvVar] !== 'true') {
            return { action: 'skipped', reason: 'outside_business_hours', details: windowCheck.reason };
        }

        if (service.state.sentToday >= service.dailyLimit && !force) {
            return { action: 'skipped', reason: 'daily_limit_reached' };
        }

        if (service.state.lastSentTimestamp && !force) {
            const lastSent = new Date(service.state.lastSentTimestamp).getTime();
            const diffMinutes = (Date.now() - lastSent) / (1000 * 60);
            if (diffMinutes < service.minIntervalMinutes) {
                return {
                    action: 'cooling',
                    remainingMinutes: Math.round(service.minIntervalMinutes - diffMinutes),
                };
            }
        }

        try {
            await leadDiscoveryService.replenishQueue(campaignType, 15);
        } catch (replenishErr) {
            logger.warn(`${logPrefix} DB replenishment notice: ${replenishErr.message}`);
        }
        leadDiscoveryService.replenishLocalQueue(service.state, campaignType, 15);

        const nowIso = new Date().toISOString();
        let candidate = null;
        let isDbCandidate = false;
        let candidateIndex = -1;

        try {
            const claimedRow = await claimNextDatabaseCandidate(campaignType, nowIso);
            if (claimedRow) {
                candidate = {
                    id: claimedRow.id,
                    recipientName: claimedRow.recipient_name,
                    email: claimedRow.email,
                    organization: claimedRow.organization,
                    subject: claimedRow.subject,
                    bodyText: claimedRow.body_text,
                    attempts: claimedRow.attempts || 0,
                };
                isDbCandidate = true;
            }
        } catch (dbErr) {
            logger.warn(`${logPrefix} Supabase claim fallback: ${dbErr.message}`);
        }

        if (!candidate) {
            candidateIndex = (service.state.queue || []).findIndex((t) => t.status === 'pending');
            if (candidateIndex !== -1) {
                candidate = service.state.queue[candidateIndex];
                // Synchronous claim in local queue too
                candidate.status = 'sending';
                service._saveState();
            }
        }

        if (!candidate) {
            return { action: 'idle', reason: 'queue_empty' };
        }

        // Enforce unified suppression + DB cross-check BEFORE calling Resend
        const suppressionReason = await isEmailSuppressed(candidate.email, campaignType);
        if (suppressionReason && suppressionReason !== `already_sending`) {
            // Note: DB row was just moved to 'sending' by us, so ignore only our own 'sending' state for isDbCandidate
            const ignoreOwnSending = isDbCandidate && suppressionReason === 'already_sending';
            if (!ignoreOwnSending) {
                logger.warn(`${logPrefix} Candidate ${candidate.email} blocked (${suppressionReason}).`);
                if (isDbCandidate) {
                    await supabaseAdmin
                        .from('outreach_campaign_leads')
                        .update({ status: 'skipped', error: suppressionReason, updated_at: nowIso })
                        .eq('id', candidate.id);
                }
                if (candidateIndex !== -1) {
                    candidate.status = 'skipped';
                    candidate.error = suppressionReason;
                    service._saveState();
                }
                return { action: 'skipped', reason: suppressionReason, candidate: candidate.email };
            }
        }

        const htmlContent = `
<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; font-size: 15px; color: #334155; line-height: 1.6; max-width: 600px; margin: 0 auto; padding: 20px;">
${candidate.bodyText.split('\n\n').map((p) => `<p style="margin: 0 0 16px 0;">${p.replace(/\n/g, '<br/>')}</p>`).join('')}
<p style="margin: 24px 0 0 0; font-size: 12px; color: #94a3b8; border-top: 1px solid #e2e8f0; padding-top: 12px;">
${footerNote}
</p>
</div>
`.trim();

        const orgLabel = (candidate.organization || candidate.firm || candidate.publication || candidate.company || 'Partner')
            .replace(/[^a-zA-Z0-9_-]/g, '-')
            .slice(0, 50);

        const result = await sendEmail({
            to: candidate.email,
            subject: candidate.subject,
            text: candidate.bodyText,
            html: htmlContent,
            from: service.senderEmail,
            reply_to: service.replyTo,
            idempotencyKey: buildIdempotencyKey(campaignType, candidate),
            tags: [
                { name: 'type', value: resendTagType },
                { name: organizationTagKey, value: orgLabel },
            ],
        });

        if (result.simulated) {
            // Restore pending status rather than faking delivery
            if (isDbCandidate) {
                await supabaseAdmin
                    .from('outreach_campaign_leads')
                    .update({ status: 'pending', error: 'simulated_no_api_key', updated_at: nowIso })
                    .eq('id', candidate.id);
            }
            if (candidateIndex !== -1) {
                candidate.status = 'pending';
                service._saveState();
            }
            return { action: 'simulated', delivered: false, candidate: candidate.email };
        }

        if (result.success) {
            service.state.lastSentTimestamp = nowIso;
            service.state.sentToday += 1;

            if (isDbCandidate) {
                const { error: updErr } = await supabaseAdmin
                    .from('outreach_campaign_leads')
                    .update({
                        status: 'sent',
                        sent_at: nowIso,
                        resend_id: result.id,
                        updated_at: nowIso,
                    })
                    .eq('id', candidate.id);
                if (updErr) {
                    logger.error(`${logPrefix} Failed to mark DB lead sent (${candidate.id}): ${updErr.message}`);
                }
            }

            if (candidateIndex !== -1) {
                candidate.status = 'sent';
                candidate.sentAt = nowIso;
                candidate.resendId = result.id;
                service.state.queue.splice(candidateIndex, 1);
                service.state.history.push({ ...candidate });
            } else {
                service.state.history.push({
                    ...candidate,
                    status: 'sent',
                    sentAt: nowIso,
                    resendId: result.id,
                });
            }

            leadDiscoveryService.replenishLocalQueue(service.state, campaignType, 15);
            service._saveState();

            return {
                action: 'sent',
                recipient: candidate.recipientName,
                email: candidate.email,
                organization: candidate.organization,
                subject: candidate.subject,
                resendId: result.id,
            };
        }

        const nextAttempts = (candidate.attempts || 0) + 1;
        const newStatus = result.bounced ? 'bounced' : nextAttempts >= 3 ? 'failed' : 'pending';

        if (isDbCandidate) {
            const { error: errUpd } = await supabaseAdmin
                .from('outreach_campaign_leads')
                .update({
                    status: newStatus,
                    attempts: nextAttempts,
                    last_attempt_at: nowIso,
                    error: JSON.stringify(result.error),
                    updated_at: nowIso,
                })
                .eq('id', candidate.id);
            if (errUpd) {
                logger.error(`${logPrefix} Failed updating lead error state: ${errUpd.message}`);
            }
        }

        if (candidateIndex !== -1) {
            candidate.status = newStatus;
            candidate.attempts = nextAttempts;
            candidate.lastAttemptAt = nowIso;
            candidate.error = JSON.stringify(result.error);
        }
        service._saveState();
        return { action: 'error', candidate: candidate.email, error: result.error, status: newStatus };
    } finally {
        activeTicks.delete(campaignType);
    }
}

export default {
    executeOutreachTick,
};
