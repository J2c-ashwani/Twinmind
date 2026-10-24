import fetch from 'node-fetch';
import fs from 'fs';
import logger from '../../../config/logger.js';

/**
 * LinkedIn Publishing Adapter
 * Uses official LinkedIn Community Management API v2 / REST API.
 * Supports PDF Document Carousels, Multi-Image Shares, and Text Commentary.
 */

class LinkedInAdapter {
    constructor() {
        this.platform = 'linkedin';
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
                    commentary: postData.caption,
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

                // Automatically post first comment with Google Play Store link
                await this._postFirstComment(postId, postData, accessToken, authorUrn);

                return {
                    success: true,
                    platform: this.platform,
                    postId,
                    url: postUrl
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
                            text: postData.caption
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

            // Automatically post first comment with Google Play Store link
            await this._postFirstComment(postId, postData, accessToken, authorUrn);

            return {
                success: true,
                platform: this.platform,
                postId,
                url: postUrl
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
     * Posts the first comment with the direct Google Play Store download link
     */
    async _postFirstComment(postId, postData, accessToken, authorUrn) {
        if (!postId) return;
        const playStoreUrl = 'https://play.google.com/store/apps/details?id=com.asmind.app';
        const commentMsg = postData.firstComment || 
            `📲 Download TwinGenie free on Google Play Store:\n${playStoreUrl}\n\nTake the 35-question cognitive baseline & test Honest Twin Mode against your own excuses!`;
        
        // Allow LinkedIn feed cluster to propagate the newly published post URN across domain endpoints
        await new Promise(resolve => setTimeout(resolve, 4000));

        for (let attempt = 1; attempt <= 3; attempt++) {
            try {
                logger.info(`💬 [LINKEDIN] Posting first comment with Play Store link on ${postId} (attempt ${attempt}/3)...`);
                const res = await fetch(`https://api.linkedin.com/v2/socialActions/${encodeURIComponent(postId)}/comments`, {
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
                    logger.info(`💬 [LINKEDIN] First comment posted successfully on ${postId}: ${data.id}`);
                    return;
                } else {
                    logger.warn(`[LINKEDIN] First comment API response (attempt ${attempt}):`, data);
                }
            } catch (err) {
                logger.warn(`[LINKEDIN] Non-blocking first-comment error (attempt ${attempt}):`, err.message);
            }
            if (attempt < 3) await new Promise(resolve => setTimeout(resolve, 3000));
        }
    }
}

export default new LinkedInAdapter();
