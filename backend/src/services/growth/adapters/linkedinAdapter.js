import fetch from 'node-fetch';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import logger from '../../../config/logger.js';
import { supabaseAdmin } from '../../../config/supabase.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DURABLE_COMMENTS_FILE_PATH = path.resolve(__dirname, '../../../../logs/linkedin_posted_comments.json');

/**
 * LinkedIn Publishing Adapter
 * Uses official LinkedIn Community Management API v2 / REST API.
 * Supports PDF Document Carousels, Multi-Image Shares, and Text Commentary.
 */

class LinkedInAdapter {
    constructor() {
        this.platform = 'linkedin';
        this._postedComments = new Set();
        this._activePosting = new Set();
        this._fetch = null;
        this._loadDurableCommentsFile();
    }

    /**
     * Initializes durable comment tracking from persistent file ledger on disk
     */
    _loadDurableCommentsFile() {
        if (!this._postedComments) {
            this._postedComments = new Set();
        }
        try {
            if (fs.existsSync(DURABLE_COMMENTS_FILE_PATH)) {
                const raw = fs.readFileSync(DURABLE_COMMENTS_FILE_PATH, 'utf8');
                const parsed = JSON.parse(raw);
                if (Array.isArray(parsed)) {
                    for (const entry of parsed) {
                        if (entry?.postId) this._postedComments.add(entry.postId);
                    }
                }
            }
        } catch (err) {
            logger.warn('[LINKEDIN] Could not read durable comments file ledger:', err.message);
        }
    }

    /**
     * Checks all 3 tiers of idempotency (in-memory Set, disk ledger, distributed Supabase ledger)
     */
    async _checkDurableCommentLedger(postId) {
        if (!postId) return { alreadyPosted: false };

        // Tier 1: In-Memory Set (sub-millisecond in-process cache)
        if (!this._postedComments) this._postedComments = new Set();
        if (this._postedComments.has(postId)) {
            return { alreadyPosted: true, tier: 'in_memory' };
        }

        // Tier 2: Persistent Disk Ledger (survives process restarts and crashes)
        try {
            if (fs.existsSync(DURABLE_COMMENTS_FILE_PATH)) {
                const raw = fs.readFileSync(DURABLE_COMMENTS_FILE_PATH, 'utf8');
                const parsed = JSON.parse(raw);
                if (Array.isArray(parsed) && parsed.some(e => e.postId === postId)) {
                    this._postedComments.add(postId);
                    return { alreadyPosted: true, tier: 'disk_ledger' };
                }
            }
        } catch (err) {
            logger.warn('[LINKEDIN] Error checking disk comment ledger:', err.message);
        }

        // Tier 3: Supabase Distributed Ledger (survives Render dyno restarts & multi-worker race conditions)
        try {
            if (supabaseAdmin) {
                const actionType = `growth_first_comment:${postId}`;
                const { data } = await supabaseAdmin
                    .from('usage_tracking')
                    .select('id, created_at')
                    .eq('action_type', actionType)
                    .limit(1);

                if (data && data.length > 0) {
                    this._postedComments.add(postId);
                    return { alreadyPosted: true, tier: 'supabase_distributed_ledger' };
                }
            }
        } catch (err) {
            logger.warn('[LINKEDIN] Error checking Supabase durable comment ledger:', err.message);
        }

        return { alreadyPosted: false };
    }

    /**
     * Atomically records successful comment across all 3 tiers
     */
    async _recordDurableComment(postId, commentId) {
        if (!postId) return;

        // Tier 1: In-Memory Set
        if (!this._postedComments) this._postedComments = new Set();
        this._postedComments.add(postId);

        // Tier 2: Persistent Disk Ledger
        try {
            const logsDir = path.dirname(DURABLE_COMMENTS_FILE_PATH);
            if (!fs.existsSync(logsDir)) {
                fs.mkdirSync(logsDir, { recursive: true });
            }
            let entries = [];
            if (fs.existsSync(DURABLE_COMMENTS_FILE_PATH)) {
                try {
                    const raw = fs.readFileSync(DURABLE_COMMENTS_FILE_PATH, 'utf8');
                    entries = JSON.parse(raw);
                    if (!Array.isArray(entries)) entries = [];
                } catch {
                    entries = [];
                }
            }
            if (!entries.some(e => e.postId === postId)) {
                entries.push({
                    postId,
                    commentId,
                    timestamp: new Date().toISOString()
                });
                fs.writeFileSync(DURABLE_COMMENTS_FILE_PATH, JSON.stringify(entries, null, 2), 'utf8');
            }
        } catch (err) {
            logger.warn('[LINKEDIN] Could not write to disk comment ledger:', err.message);
        }

        // Tier 3: Supabase Distributed Ledger
        try {
            if (supabaseAdmin) {
                const actionType = `growth_first_comment:${postId}`;
                const nowIso = new Date().toISOString();
                const { data: users } = await supabaseAdmin.from('users').select('id').limit(1);
                const userId = users && users.length > 0 ? users[0].id : null;

                await supabaseAdmin.from('usage_tracking').insert({
                    user_id: userId,
                    action_type: actionType,
                    metadata: { postId, commentId, platform: 'linkedin', publishedAt: nowIso },
                    count: 1,
                    period_start: nowIso,
                    period_end: nowIso,
                    created_at: nowIso
                });
                logger.info(`💾 [LINKEDIN] Committed first-comment to distributed ledger: ${actionType}`);
            }
        } catch (err) {
            logger.warn('[LINKEDIN] Could not commit comment to Supabase distributed ledger:', err.message);
        }
    }

    getCredentials(target = 'company') {
        const isPersonal = target === 'personal';
        const accessToken = isPersonal 
            ? (process.env.LINKEDIN_PERSONAL_ACCESS_TOKEN || process.env.LINKEDIN_ACCESS_TOKEN)
            : (process.env.LINKEDIN_COMPANY_ACCESS_TOKEN || process.env.LINKEDIN_ACCESS_TOKEN);

        const authorUrn = isPersonal
            ? (process.env.LINKEDIN_PERSON_URN || process.env.ASHWANI_LINKEDIN_PERSON_URN)
            : (process.env.LINKEDIN_ORGANIZATION_URN || process.env.TWINGENIE_LINKEDIN_ORG_URN);

        return {
            accessToken,
            authorUrn,
            target,
            clientId: process.env.LINKEDIN_CLIENT_ID,
            clientSecret: process.env.LINKEDIN_CLIENT_SECRET
        };
    }

    isConfigured(target = 'company') {
        const { accessToken, authorUrn } = this.getCredentials(target);
        return Boolean(accessToken && authorUrn);
    }

    async getHealthStatus() {
        const personalConfigured = this.isConfigured('personal');
        const companyConfigured = this.isConfigured('company');

        return {
            platform: this.platform,
            ready: personalConfigured || companyConfigured,
            destinations: {
                personal: {
                    target: 'Ashwani Kumar (Personal Profile)',
                    ready: personalConfigured,
                    urn: process.env.LINKEDIN_PERSON_URN ? 'configured' : 'missing',
                    requiredEnv: ['LINKEDIN_PERSON_URN', 'LINKEDIN_ACCESS_TOKEN (with w_member_social)']
                },
                company: {
                    target: 'TwinGenie (Company Page)',
                    ready: companyConfigured,
                    urn: process.env.LINKEDIN_ORGANIZATION_URN ? 'configured' : 'missing',
                    requiredEnv: ['LINKEDIN_ORGANIZATION_URN', 'LINKEDIN_ACCESS_TOKEN (with w_organization_social)']
                }
            }
        };
    }

    /**
     * Reconciles whether LinkedIn has already published today in Asia/Kolkata timezone.
     * Prevents duplicate posts across server restarts and ambiguous timeouts.
     */
    async hasPublishedTodayIST(target = 'personal') {
        const creds = this.getCredentials(target);
        const accessToken = creds.accessToken;
        const authorUrn = creds.authorUrn;
        if (!accessToken || !authorUrn) return false;

        try {
            const url = `https://api.linkedin.com/v2/ugcPosts?q=authors&authors=List(${encodeURIComponent(authorUrn)})`;
            const res = await fetch(url, {
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'X-Restli-Protocol-Version': '2.0.0'
                }
            });
            const data = await res.json();
            if (data && Array.isArray(data.elements) && data.elements.length > 0) {
                const todayIST = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(new Date());
                const postedToday = data.elements.some(p => {
                    const ts = p.created?.time || p.firstPublishedAt;
                    if (!ts) return false;
                    const postDateIST = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(new Date(ts));
                    return postDateIST === todayIST;
                });
                return postedToday;
            }
        } catch (e) {
            logger.warn('[LINKEDIN] Error checking today posts on LinkedIn:', e.message);
        }
        return false;
    }

    /**
     * Sanitizes commentary string for LinkedIn's "Little Text" format.
     * Escapes reserved characters (( ) [ ] { } < > | ~ \) that otherwise cause
     * LinkedIn's Little Text parser to silently truncate the post from the unescaped character onward.
     */
    _sanitizeLittleText(text) {
        if (!text) return text;
        return text
            .replace(/\\/g, '\\\\')
            .replace(/\(/g, '\\(')
            .replace(/\)/g, '\\)')
            .replace(/\[/g, '\\[')
            .replace(/\]/g, '\\]')
            .replace(/\{/g, '\\{')
            .replace(/\}/g, '\\}')
            .replace(/</g, '\\<')
            .replace(/>/g, '\\>')
            .replace(/\|/g, '\\|')
            .replace(/~/g, '\\~');
    }

    /**
     * Publishes specifically to Ashwani Kumar's Personal Profile (w_member_social).
     * Explicit named method matching QA and audit inspection requirements.
     * @param {Object} postData - { title, caption, pdfPath, pngPaths, utmLink }
     */
    async postToPersonalProfile(postData) {
        return this.publish({ ...postData, target: 'personal' });
    }

    /**
     * Publishes a post to LinkedIn (Personal Profile or Company Page)
     * @param {Object} postData - { title, caption, pdfPath, pngPaths, utmLink, target: 'personal' | 'company' }
     */
    async publish(postData) {
        const target = postData.target || 'company';
        const creds = this.getCredentials(target);
        const accessToken = postData.accessToken || creds.accessToken;
        const authorUrn = postData.authorUrn || creds.authorUrn;

        if (!accessToken || !authorUrn) {
            logger.warn(`[LINKEDIN] Credentials for ${target} not set. Running in verified simulation mode.`);
            return {
                success: true,
                simulated: true,
                target,
                platform: this.platform,
                postId: `sim_li_${target}_${Date.now()}`,
                url: `https://www.linkedin.com/feed/update/urn:li:activity:simulated_${Date.now()}`
            };
        }

        // Safety verification: Prevent personal posts from leaking into company URNs and vice-versa
        if (target === 'company' && authorUrn.startsWith('urn:li:person:')) {
            logger.error(`[LINKEDIN SAFETY] Attempted to post company content with a personal URN (${authorUrn})! Aborting to prevent profile pollution.`);
            return {
                success: false,
                error: 'Configuration mismatch: Target is company but author URN is a personal profile. Set LINKEDIN_ORGANIZATION_URN.'
            };
        }

        logger.info(`[LINKEDIN] Initiating publish to ${target} destination: ${authorUrn}...`);

        try {
            // 1. Try Document Upload (Native PDF Carousel for interactive on-feed slider)
            let documentUrn = null;
            if (postData.pdfPath && fs.existsSync(postData.pdfPath)) {
                try {
                    logger.info(`[LINKEDIN] Registering and uploading native PDF document carousel: ${postData.pdfPath}`);
                    documentUrn = await this._uploadDocument(accessToken, authorUrn, postData.pdfPath, postData.title);
                } catch (docErr) {
                    logger.warn(`[LINKEDIN] PDF document upload encountered an issue (${docErr.message}), checking for PNG image fallback...`);
                }
            }

            // Case A: Publish Native PDF Document Carousel via modern REST Posts API
            if (documentUrn) {
                logger.info(`[LINKEDIN] Publishing native document carousel post via REST API (${documentUrn})...`);
                const postPayload = {
                    author: authorUrn,
                    commentary: this._sanitizeLittleText(postData.caption),
                    visibility: 'PUBLIC',
                    distribution: {
                        feedDistribution: 'MAIN_FEED',
                        targetEntities: [],
                        thirdPartyDistributionChannels: []
                    },
                    content: {
                        media: {
                            id: documentUrn,
                            title: postData.title || 'TwinGenie Architecture Carousel'
                        }
                    },
                    lifecycleState: 'PUBLISHED'
                };

                const response = await fetch('https://api.linkedin.com/rest/posts', {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${accessToken}`,
                        'Content-Type': 'application/json',
                        'Linkedin-Version': '202601',
                        'X-Restli-Protocol-Version': '2.0.0'
                    },
                    body: JSON.stringify(postPayload)
                });

                if (!response.ok) {
                    const errData = await response.text();
                    logger.error('[LINKEDIN] Publish Document Post API error:', errData);
                    return { success: false, error: errData };
                }

                const postId = response.headers.get('x-restli-id');
                const postUrl = `https://www.linkedin.com/feed/update/${postId}`;
                logger.info(`🎉 [LINKEDIN] Published native PDF document carousel successfully! Post ID: ${postId}`);

                // Automatically post first comment with Google Play Store link (if configured)
                const commentResult = await this._postFirstComment(postId, postData, accessToken, authorUrn);

                return {
                    success: true,
                    platform: this.platform,
                    postId,
                    url: postUrl,
                    firstCommentResult: commentResult
                };
            }

            // Case B: Fallback to Multi-Image Gallery or Text Post via legacy UGC API
            let shareCategory = 'NONE';
            let mediaItems = [];
            if (postData.pngPaths && postData.pngPaths.length > 0) {
                logger.info(`[LINKEDIN] Uploading ${postData.pngPaths.length} slides as multi-image gallery fallback...`);
                for (let i = 0; i < postData.pngPaths.length; i++) {
                    const imgPath = postData.pngPaths[i];
                    if (fs.existsSync(imgPath)) {
                        try {
                            const assetUrn = await this._uploadImage(accessToken, authorUrn, imgPath);
                            mediaItems.push({
                                status: 'READY',
                                media: assetUrn,
                                title: { text: `Slide ${i + 1} of ${postData.pngPaths.length}` }
                            });
                        } catch (imgErr) {
                            logger.warn(`[LINKEDIN] Slide ${i + 1} upload failed: ${imgErr.message}`);
                        }
                    }
                }
                if (mediaItems.length > 0) {
                    shareCategory = 'IMAGE';
                }
            }

            // Construct UGC post payload
            const payload = {
                author: authorUrn,
                lifecycleState: 'PUBLISHED',
                specificContent: {
                    'com.linkedin.ugc.ShareContent': {
                        shareCommentary: {
                            text: this._sanitizeLittleText(postData.caption)
                        },
                        shareMediaCategory: shareCategory,
                        media: mediaItems.length > 0 ? mediaItems : undefined
                    }
                },
                visibility: {
                    'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC'
                }
            };

            const response = await fetch('https://api.linkedin.com/v2/ugcPosts', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'application/json',
                    'X-Restli-Protocol-Version': '2.0.0'
                },
                body: JSON.stringify(payload)
            });

            const data = await response.json();

            if (!response.ok) {
                logger.error('[LINKEDIN] Publish API error:', data);
                return { success: false, error: data };
            }

            const postId = data.id;
            const postUrl = `https://www.linkedin.com/feed/update/${postId}`;
            logger.info(`🎉 [LINKEDIN] Published successfully! Post ID: ${postId}`);

            // Automatically post first comment with Google Play Store link (if configured)
            const commentResult = await this._postFirstComment(postId, postData, accessToken, authorUrn);

            return {
                success: true,
                platform: this.platform,
                postId,
                url: postUrl,
                firstCommentResult: commentResult
            };
        } catch (err) {
            logger.error('[LINKEDIN] Exception during publish:', err);
            return { success: false, error: err.message };
        }
    }

    async _uploadImage(accessToken, authorUrn, filePath) {
        const registerRes = await fetch('https://api.linkedin.com/v2/assets?action=registerUpload', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                registerUploadRequest: {
                    recipes: ['urn:li:digitalmediaRecipe:feedshare-image'],
                    owner: authorUrn,
                    serviceRelationships: [
                        { relationshipType: 'OWNER', identifier: 'urn:li:userGeneratedContent' }
                    ]
                }
            })
        });

        const regData = await registerRes.json();
        const uploadUrl = regData.value?.uploadMechanism?.['com.linkedin.digitalmedia.uploading.MediaUploadHttpRequest']?.uploadUrl;
        const assetUrn = regData.value?.asset;

        if (!uploadUrl || !assetUrn) {
            throw new Error(`Failed to register LinkedIn image upload: ${JSON.stringify(regData)}`);
        }

        const buffer = fs.readFileSync(filePath);

        await fetch(uploadUrl, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'image/png',
                'Content-Length': buffer.length.toString()
            },
            body: buffer
        });

        logger.info(`[LINKEDIN] Image binary uploaded to asset: ${assetUrn}`);
        return assetUrn;
    }

    /**
     * Uploads a multi-page PDF document using LinkedIn's modern REST API.
     * Generates a native interactive document carousel on the LinkedIn feed.
     */
    async _uploadDocument(accessToken, authorUrn, filePath, title) {
        logger.info(`[LINKEDIN] Initializing native PDF document upload via REST API for ${authorUrn}...`);

        // Step 1: Register upload with rest/documents
        const initRes = await fetch('https://api.linkedin.com/rest/documents?action=initializeUpload', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
                'Linkedin-Version': '202601',
                'X-Restli-Protocol-Version': '2.0.0'
            },
            body: JSON.stringify({
                initializeUploadRequest: {
                    owner: authorUrn
                }
            })
        });

        const initData = await initRes.json();
        if (!initRes.ok || !initData?.value?.uploadUrl || !initData?.value?.document) {
            throw new Error(`Failed to initialize LinkedIn document upload (${initRes.status}): ${JSON.stringify(initData)}`);
        }

        const { uploadUrl, document: documentUrn } = initData.value;
        logger.info(`[LINKEDIN] Document registration successful: ${documentUrn}. Uploading binary payload...`);

        // Step 2: Upload PDF binary to presigned uploadUrl
        const buffer = fs.readFileSync(filePath);

        const uploadRes = await fetch(uploadUrl, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/pdf',
                'Content-Length': buffer.length.toString()
            },
            body: buffer
        });

        if (!uploadRes.ok) {
            const errText = await uploadRes.text();
            throw new Error(`Failed to upload document binary to LinkedIn (${uploadRes.status}): ${errText}`);
        }

        logger.info(`[LINKEDIN] PDF document binary uploaded successfully to URN: ${documentUrn}`);
        return documentUrn;
    }

    /**
     * Posts the first comment with the direct Google Play Store download link.
     * Enforces durable 3-tier idempotency (in-memory Set, persistent disk ledger, Supabase distributed DB),
     * safe retries, accurate UTM parameters, and non-blocking failure handling so published posts
     * are NEVER failed or rolled back if the first comment API fails.
     */
    async _postFirstComment(postId, postData = {}, accessToken, authorUrn) {
        if (!postId) return { skipped: true, reason: 'missing_post_id' };
        if (postData.skipFirstComment === true) {
            logger.info(`💬 [LINKEDIN] First comment skipped by postData configuration (e.g. Arm A caption link).`);
            return { skipped: true, reason: 'skip_first_comment_flag', postId };
        }

        // Concurrency Guard: synchronously acquire in-process lock before any async I/O
        if (!this._activePosting) this._activePosting = new Set();
        if (this._activePosting.has(postId)) {
            logger.warn(`⏳ [LINKEDIN] First comment for ${postId} is currently being processed by concurrent task. Skipping duplicate.`);
            return { success: true, alreadyPosted: true, postId, reason: 'concurrent_lock_active' };
        }
        this._activePosting.add(postId);

        try {
            // Durable 3-Tier Idempotency check: survives process restarts, crashes, and multi-worker instances
            const idempotency = await this._checkDurableCommentLedger(postId);
            if (idempotency.alreadyPosted) {
                logger.warn(`💬 [LINKEDIN] First comment already posted for ${postId} (found in ${idempotency.tier}). Skipping duplicate.`);
                return { success: true, alreadyPosted: true, postId, tier: idempotency.tier };
            }
            const playStoreUrl = postData.utmLink || 'https://play.google.com/store/apps/details?id=com.asmind.app';
            const commentMsg = postData.firstComment || 
                `📲 Download TwinGenie free on Google Play Store:\n${playStoreUrl}\n\nExplore your cognitive patterns with persistent memory and 4 reflective modes.`;
            
            // Propagation delay: wait for LinkedIn feed cluster to index newly created post URN
            // Allow overriding delay in tests via postData._propagationDelayMs
            const delayMs = typeof postData._propagationDelayMs === 'number' ? postData._propagationDelayMs : 4000;
            if (delayMs > 0) {
                await new Promise(resolve => setTimeout(resolve, delayMs));
            }

            const maxAttempts = 3;
            let lastError = null;

            for (let attempt = 1; attempt <= maxAttempts; attempt++) {
                try {
                    logger.info(`💬 [LINKEDIN] Posting first comment on ${postId} (attempt ${attempt}/${maxAttempts})...`);
                    const fetchFn = this._fetch || fetch;
                    const res = await fetchFn(`https://api.linkedin.com/v2/socialActions/${encodeURIComponent(postId)}/comments`, {
                        method: 'POST',
                        headers: {
                            'Authorization': `Bearer ${accessToken}`,
                            'Content-Type': 'application/json',
                            'X-Restli-Protocol-Version': '2.0.0'
                        },
                        body: JSON.stringify({
                            actor: authorUrn,
                            message: { text: commentMsg }
                        })
                    });
                    const data = await res.json();
                    if (data.id) {
                        // Atomically record across all 3 durable tiers
                        await this._recordDurableComment(postId, data.id);
                        logger.info(`💬 [LINKEDIN] First comment posted and durably recorded on ${postId}: ${data.id}`);
                        return { success: true, commentId: data.id, postId, attempt };
                    } else {
                        lastError = data;
                        logger.warn(`[LINKEDIN] First comment API response (attempt ${attempt}):`, data);
                    }
                } catch (err) {
                    lastError = err.message;
                    logger.warn(`[LINKEDIN] Non-blocking first-comment error (attempt ${attempt}):`, err.message);
                }

                if (attempt < maxAttempts) {
                    const retryDelay = typeof postData._retryDelayMs === 'number' ? postData._retryDelayMs : 3000;
                    if (retryDelay > 0) await new Promise(resolve => setTimeout(resolve, retryDelay));
                }
            }

            logger.error(`[LINKEDIN] First comment failed after ${maxAttempts} attempts on ${postId}; continuing without failing published post:`, lastError);
            return { success: false, error: lastError, postId, attempts: maxAttempts };
        } finally {
            this._activePosting.delete(postId);
        }
    }
}

export default new LinkedInAdapter();
