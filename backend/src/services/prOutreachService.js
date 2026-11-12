import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import logger from '../config/logger.js';
import leadDiscoveryService from './leadDiscoveryService.js';
import { executeOutreachTick } from './outreachRunner.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const STATE_FILE_PATH = path.join(__dirname, '../../logs/pr_outreach_state.json');

/**
 * North Star Business Hours check (US Eastern Time: Mon-Fri 9:00 AM - 5:00 PM)
 * Ensures outreach hits journalist inboxes when they are actively working at their desks.
 */
function isUSEasternBusinessHours() {
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

class PROutreachService {
    constructor() {
        this.dailyLimit = 6;              // Max 6 journalists per day
        this.minIntervalMinutes = 45;      // 45-minute cooling between dispatches
        this.senderEmail = process.env.PR_FROM_EMAIL || 'Ashwani Kumar <ashwani@mail.twingenie.app>';
        this.replyTo = process.env.PR_REPLY_TO || 'ashwani@twingenie.app';
        this.state = this._loadState();
        leadDiscoveryService.replenishLocalQueue(this.state, 'pr', 15);
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
            logger.warn(`[PR OUTREACH] Could not load state: ${e.message}. Initializing fresh state.`);
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
            logger.error(`[PR OUTREACH] Failed to persist state: ${e.message}`);
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
        leadDiscoveryService.replenishLocalQueue(this.state, 'pr', 15);
        const pendingCount = (this.state.queue || []).filter(q => q.status === 'pending').length;
        const sentTotal = (this.state.history || []).length;
        const windowCheck = isUSEasternBusinessHours();

        return {
            campaignEnabled: process.env.PR_CAMPAIGN_AUTORUN !== 'false',
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
     * Executes one scheduled pitch to the next journalist in line.
     * Respects business hours, daily limits, and 45-minute cooling intervals.
     * Continuously self-replenishes via PostgreSQL Supabase and local discovery catalogs.
     */
    async executeTick(force = false) {
        return executeOutreachTick({
            campaignType: 'pr',
            logPrefix: '[PR OUTREACH]',
            autorunEnvVar: 'PR_CAMPAIGN_AUTORUN',
            forceEnvVar: 'FORCE_PR_SEND',
            isBusinessHoursFn: isUSEasternBusinessHours,
            service: this,
            footerNote:
                "TwinGenie (https://twingenie.app) • Self-funded software • If you prefer not to receive direct correspondence, reply with 'unsubscribe' to be permanently excluded.",
            resendTagType: 'pr-journalist-pitch',
            organizationTagKey: 'publication',
            force,
        });
    }
}

export const prOutreachService = new PROutreachService();
export default prOutreachService;
