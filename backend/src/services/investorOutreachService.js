import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import logger from '../config/logger.js';
import { sendEmail } from './emailService.js';
import { supabaseAdmin } from '../config/supabase.js';
import leadDiscoveryService from './leadDiscoveryService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const STATE_FILE_PATH = path.join(__dirname, '../../logs/investor_outreach_state.json');

/**
 * North Star Business Hours check (US Eastern Time: Mon-Fri 9:00 AM - 5:00 PM)
 * Strictly ensures investor pitches arrive during active investment partner working hours.
 */
function isUSInvestorBusinessHours() {
    try {
        const formatter = new Intl.DateTimeFormat('en-US', {
            timeZone: 'America/New_York',
            hour: 'numeric',
            hour12: false,
            weekday: 'short'
        });
        const parts = formatter.formatToParts(new Date());

        let hourStr = '';
        let weekdayStr = '';
        for (const part of parts) {
            if (part.type === 'hour') hourStr = part.value;
            if (part.type === 'weekday') weekdayStr = part.value;
        }

        const hour = parseInt(hourStr, 10);
        const isWeekend = weekdayStr === 'Sat' || weekdayStr === 'Sun';
        const isHours = hour >= 9 && hour < 17 && !isWeekend;

        return {
            isHours,
            reason: `US Eastern Time: ${weekdayStr} ${hour}:00 (Target window: Mon-Fri 9:00-17:00 EST)`
        };
    } catch (e) {
        return { isHours: true, reason: `Intl fallback (${e.message})` };
    }
}

class InvestorOutreachService {
    constructor() {
        this.dailyLimit = 3;              // Maximum 3 investor pitches per day
        this.minIntervalMinutes = 75;      // 75-minute minimum spacing
        this.senderEmail = process.env.INVESTOR_FROM_EMAIL || 'Ashwani Kumar <ashwani@mail.twingenie.app>';
        this.replyTo = process.env.INVESTOR_REPLY_TO || 'ashwani@twingenie.app';
        this.state = this._loadState();
        leadDiscoveryService.replenishLocalQueue(this.state, 'investor', 15);
        this._saveState();
    }

    _loadState() {
        try {
            if (fs.existsSync(STATE_FILE_PATH)) {
                const raw = fs.readFileSync(STATE_FILE_PATH, 'utf8');
                const state = JSON.parse(raw);
                return {
                    lastSentDate: state.lastSentDate || null,
                    sentToday: typeof state.sentToday === 'number' ? state.sentToday : 0,
                    lastSentTimestamp: state.lastSentTimestamp || null,
                    queue: Array.isArray(state.queue) ? state.queue : [],
                    history: Array.isArray(state.history) ? state.history : []
                };
            }
        } catch (e) {
            logger.warn(`[INVESTOR OUTREACH] Could not load state: ${e.message}. Initializing fresh state.`);
        }

        return {
            lastSentDate: null,
            sentToday: 0,
            lastSentTimestamp: null,
            queue: [],
            history: []
        };
    }

    _saveState() {
        try {
            const dir = path.dirname(STATE_FILE_PATH);
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
            }
            fs.writeFileSync(STATE_FILE_PATH, JSON.stringify(this.state, null, 2), 'utf8');
        } catch (e) {
            logger.error(`[INVESTOR OUTREACH] Failed to persist state: ${e.message}`);
        }
    }

    _refreshDailyQuota() {
        const todayStr = new Date().toISOString().slice(0, 10);
        if (this.state.lastSentDate !== todayStr) {
            this.state.sentToday = 0;
            this.state.lastSentDate = todayStr;
            this._saveState();
        }
    }

    getStatus() {
        this._refreshDailyQuota();
        leadDiscoveryService.replenishLocalQueue(this.state, 'investor', 15);
        const pendingCount = (this.state.queue || []).filter(q => q.status === 'pending').length;
        const sentTotal = (this.state.history || []).length;
        const windowCheck = isUSInvestorBusinessHours();

        return {
            campaignEnabled: process.env.INVESTOR_CAMPAIGN_AUTORUN !== 'false',
            businessHours: windowCheck,
            senderEmail: this.senderEmail,
            replyTo: this.replyTo,
            sentToday: this.state.sentToday,
            dailyLimit: this.dailyLimit,
            lastSentTimestamp: this.state.lastSentTimestamp,
            pendingInQueue: pendingCount,
            totalSentHistory: sentTotal,
            nextUp: (this.state.queue || []).find(q => q.status === 'pending') || null,
            recentSent: (this.state.history || []).slice(-3)
        };
    }

    /**
     * Executes one scheduled pitch to the next investor in line.
     * Respects business hours, daily limits, and 75-minute cooling intervals.
     * Continuously self-replenishes via PostgreSQL Supabase and local discovery catalogs.
     */
    async executeTick(force = false) {
        this._refreshDailyQuota();

        if (process.env.INVESTOR_CAMPAIGN_AUTORUN === 'false' && !force) {
            logger.info('[INVESTOR OUTREACH] Autorun disabled via INVESTOR_CAMPAIGN_AUTORUN=false');
            return { action: 'skipped', reason: 'autorun_disabled' };
        }

        // US Eastern Business Hours check (Mon-Fri 9am - 5pm EST)
        const windowCheck = isUSInvestorBusinessHours();
        if (!windowCheck.isHours && !force && process.env.FORCE_INVESTOR_SEND !== 'true') {
            logger.info(`[INVESTOR OUTREACH] Outside US business hours (${windowCheck.reason}). Holding queue.`);
            return { action: 'skipped', reason: 'outside_business_hours', details: windowCheck.reason };
        }

        // Daily limit check
        if (this.state.sentToday >= this.dailyLimit && !force) {
            logger.info(`[INVESTOR OUTREACH] Daily limit reached (${this.state.sentToday}/${this.dailyLimit})`);
            return { action: 'skipped', reason: 'daily_limit_reached' };
        }

        // Spacing cooldown check
        if (this.state.lastSentTimestamp && !force) {
            const lastSent = new Date(this.state.lastSentTimestamp).getTime();
            const now = Date.now();
            const diffMinutes = (now - lastSent) / (1000 * 60);

            if (diffMinutes < this.minIntervalMinutes) {
                const waitTime = Math.round(this.minIntervalMinutes - diffMinutes);
                logger.info(`[INVESTOR OUTREACH] Cooling active (${waitTime}m remaining before next pitch)`);
                return { action: 'cooling', remainingMinutes: waitTime };
            }
        }

        // Ensure database lead replenishment
        try {
            await leadDiscoveryService.replenishQueue('investor', 15);
        } catch (replenishErr) {
            logger.warn(`[INVESTOR OUTREACH] DB auto-replenishment notice: ${replenishErr.message}`);
        }

        // Ensure local queue replenishment as fallback
        leadDiscoveryService.replenishLocalQueue(this.state, 'investor', 15);

        // Candidate selection: Try Supabase first, fallback to local state
        let candidate = null;
        let isDbCandidate = false;

        try {
            const { data: dbLeads, error: dbErr } = await supabaseAdmin
                .from('outreach_campaign_leads')
                .select('*')
                .eq('campaign_type', 'investor')
                .eq('status', 'pending')
                .order('created_at', { ascending: true })
                .limit(1);

            if (!dbErr && dbLeads && dbLeads.length > 0) {
                candidate = {
                    id: dbLeads[0].id,
                    name: dbLeads[0].recipient_name,
                    email: dbLeads[0].email,
                    firm: dbLeads[0].organization,
                    subject: dbLeads[0].subject,
                    bodyText: dbLeads[0].body_text,
                    attempts: dbLeads[0].attempts || 0
                };
                isDbCandidate = true;
            }
        } catch (dbEx) {
            logger.warn(`[INVESTOR OUTREACH] Supabase query fallback: ${dbEx.message}`);
        }

        let candidateIndex = -1;
        if (!candidate) {
            candidateIndex = (this.state.queue || []).findIndex(t => t.status === 'pending');
            if (candidateIndex !== -1) {
                candidate = this.state.queue[candidateIndex];
            }
        }

        if (!candidate) {
            logger.info('[INVESTOR OUTREACH] No pending investors in queue');
            return { action: 'idle', reason: 'queue_empty' };
        }

        // Format clean, professional HTML container with anti-spam compliance opt-out footer
        const htmlContent = `
<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; font-size: 15px; color: #334155; line-height: 1.6; max-width: 600px; margin: 0 auto; padding: 20px;">
${candidate.bodyText.split('\n\n').map(p => `<p style="margin: 0 0 16px 0;">${p.replace(/\n/g, '<br/>')}</p>`).join('')}
<p style="margin: 24px 0 0 0; font-size: 12px; color: #94a3b8; border-top: 1px solid #e2e8f0; padding-top: 12px;">
TwinGenie (https://twingenie.app) • Pre-Seed Round • If you prefer not to receive investment correspondence, reply with 'unsubscribe' to be permanently excluded.
</p>
</div>
`.trim();

        const candidateName = candidate.name || candidate.recipientName;
        logger.info(`[INVESTOR OUTREACH] Dispatching pitch to ${candidateName} at ${candidate.firm || candidate.organization} (${candidate.email})...`);

        const nowIso = new Date().toISOString();
        this.state.lastSentTimestamp = nowIso;

        try {
            const result = await sendEmail({
                to: candidate.email,
                subject: candidate.subject,
                text: candidate.bodyText,
                html: htmlContent,
                from: this.senderEmail,
                reply_to: this.replyTo,
                tags: [
                    { name: 'type', value: 'investor-preseed-pitch' },
                    { name: 'firm', value: (candidate.firm || candidate.organization || 'Angel').replace(/[^a-zA-Z0-9_-]/g, '-').slice(0, 50) }
                ]
            });

            if (result.success) {
                logger.info(`✅ [INVESTOR OUTREACH] Successfully sent pitch to ${candidateName} (${candidate.email})! Resend ID: ${result.id}`);
                this.state.sentToday += 1;

                if (isDbCandidate) {
                    try {
                        await supabaseAdmin
                            .from('outreach_campaign_leads')
                            .update({
                                status: 'sent',
                                sent_at: nowIso,
                                resend_id: result.id,
                                updated_at: nowIso
                            })
                            .eq('id', candidate.id);
                    } catch (updateErr) {
                        logger.warn(`[INVESTOR OUTREACH] Could not update DB lead status: ${updateErr.message}`);
                    }
                }

                if (candidateIndex !== -1) {
                    candidate.status = 'sent';
                    candidate.sentAt = nowIso;
                    candidate.resendId = result.id;
                    this.state.queue.splice(candidateIndex, 1);
                    this.state.history.push({ ...candidate });
                } else {
                    this.state.history.push({
                        ...candidate,
                        status: 'sent',
                        sentAt: nowIso,
                        resendId: result.id
                    });
                }
                this._saveState();

                // Trigger background replenishment check
                leadDiscoveryService.replenishLocalQueue(this.state, 'investor', 15);
                this._saveState();

                return {
                    action: 'sent',
                    recipient: candidateName,
                    email: candidate.email,
                    firm: candidate.firm || candidate.organization,
                    subject: candidate.subject,
                    resendId: result.id
                };
            } else {
                logger.error(`❌ [INVESTOR OUTREACH] Failed to send to ${candidate.email}:`, result.error);
                if (isDbCandidate) {
                    try {
                        await supabaseAdmin
                            .from('outreach_campaign_leads')
                            .update({
                                attempts: (candidate.attempts || 0) + 1,
                                last_attempt_at: nowIso,
                                error: JSON.stringify(result.error),
                                updated_at: nowIso
                            })
                            .eq('id', candidate.id);
                    } catch (dbErr) {
                        logger.warn(`[INVESTOR OUTREACH] DB error update notice: ${dbErr.message}`);
                    }
                }

                if (candidateIndex !== -1) {
                    candidate.attempts = (candidate.attempts || 0) + 1;
                    candidate.lastAttemptAt = nowIso;
                    candidate.error = JSON.stringify(result.error);
                }
                this._saveState();
                return { action: 'error', candidate: candidate.email, error: result.error };
            }
        } catch (err) {
            logger.error(`🚨 [INVESTOR OUTREACH] Exception sending to ${candidate.email}:`, err);
            return { action: 'exception', error: err.message };
        }
    }
}

export const investorOutreachService = new InvestorOutreachService();
export default investorOutreachService;
