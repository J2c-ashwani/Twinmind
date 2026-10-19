import fetch from 'node-fetch';
import logger from '../config/logger.js';

const CRONJOB_API_BASE = 'https://api.cron-job.org';

class CronJobService {
    getApiKey() {
        return process.env.CRONJOB_API_KEY || process.env.CRON_JOB_API_KEY;
    }

    _getHeaders() {
        const key = this.getApiKey();
        if (!key) {
            throw new Error('CRONJOB_API_KEY is not configured in environment.');
        }
        return {
            'Authorization': `Bearer ${key}`,
            'Content-Type': 'application/json'
        };
    }

    /**
     * List all cron jobs on cron-job.org
     */
    async listJobs() {
        try {
            const res = await fetch(`${CRONJOB_API_BASE}/jobs`, {
                method: 'GET',
                headers: this._getHeaders()
            });
            const data = await res.json();
            return data;
        } catch (err) {
            logger.error('[CRONJOB] Failed to list jobs:', err);
            throw err;
        }
    }

    /**
     * Get details of a specific cron job
     */
    async getJob(jobId) {
        try {
            const res = await fetch(`${CRONJOB_API_BASE}/jobs/${jobId}`, {
                method: 'GET',
                headers: this._getHeaders()
            });
            return await res.json();
        } catch (err) {
            logger.error(`[CRONJOB] Failed to get job ${jobId}:`, err);
            throw err;
        }
    }

    /**
     * Create a new cron job
     * @param {Object} options - { title, url, minutes: [0, 10, ...], hours: [-1], timezone: 'UTC' }
     */
    async createJob(options) {
        const payload = {
            job: {
                url: options.url,
                title: options.title || 'TwinGenie Scheduled Task',
                enabled: options.enabled !== false,
                saveResponses: true,
                schedule: {
                    timezone: options.timezone || 'UTC',
                    expiresAt: 0,
                    hours: options.hours || [-1],
                    minutes: options.minutes || [0, 10, 20, 30, 40, 50],
                    mdays: options.mdays || [-1],
                    months: options.months || [-1],
                    wdays: options.wdays || [-1]
                }
            }
        };

        try {
            const res = await fetch(`${CRONJOB_API_BASE}/jobs`, {
                method: 'PUT',
                headers: this._getHeaders(),
                body: JSON.stringify(payload)
            });
            return await res.json();
        } catch (err) {
            logger.error('[CRONJOB] Failed to create job:', err);
            throw err;
        }
    }

    /**
     * Update an existing cron job
     */
    async updateJob(jobId, jobData) {
        try {
            const res = await fetch(`${CRONJOB_API_BASE}/jobs/${jobId}`, {
                method: 'PATCH',
                headers: this._getHeaders(),
                body: JSON.stringify({ job: jobData })
            });
            return await res.json();
        } catch (err) {
            logger.error(`[CRONJOB] Failed to update job ${jobId}:`, err);
            throw err;
        }
    }

    /**
     * Delete a cron job
     */
    async deleteJob(jobId) {
        try {
            const res = await fetch(`${CRONJOB_API_BASE}/jobs/${jobId}`, {
                method: 'DELETE',
                headers: this._getHeaders()
            });
            return await res.json();
        } catch (err) {
            logger.error(`[CRONJOB] Failed to delete job ${jobId}:`, err);
            throw err;
        }
    }

    /**
     * Get execution history of a specific cron job
     */
    async getHistory(jobId) {
        try {
            const res = await fetch(`${CRONJOB_API_BASE}/jobs/${jobId}/history`, {
                method: 'GET',
                headers: this._getHeaders()
            });
            return await res.json();
        } catch (err) {
            logger.error(`[CRONJOB] Failed to fetch history for ${jobId}:`, err);
            throw err;
        }
    }
}

const cronJobService = new CronJobService();
export default cronJobService;
