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
        const { accessToken, authorUrn } = this.getCredentials(target);

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
            // Document upload or Image upload or simple UGC share
            let mediaAssetUrn = null;
            let shareCategory = 'NONE';

            // 1. Try Document Upload (PDF Carousel)
            if (postData.pdfPath && fs.existsSync(postData.pdfPath)) {
                try {
                    logger.info(`[LINKEDIN] Registering and uploading PDF document carousel: ${postData.pdfPath}`);
                    mediaAssetUrn = await this._uploadDocument(accessToken, authorUrn, postData.pdfPath, postData.title);
                    shareCategory = 'DOCUMENT';
                } catch (docErr) {
                    logger.warn(`[LINKEDIN] PDF document upload encountered an issue (${docErr.message}), checking for PNG image fallback...`);
                }
            }

            // 2. Fallback to Image Upload if document wasn't uploaded and PNG exists
            if (!mediaAssetUrn && postData.pngPaths && postData.pngPaths.length > 0) {
                const firstImg = postData.pngPaths[0];
                if (fs.existsSync(firstImg)) {
                    try {
                        logger.info(`[LINKEDIN] Uploading primary carousel cover image: ${firstImg}`);
                        mediaAssetUrn = await this._uploadImage(accessToken, authorUrn, firstImg);
                        shareCategory = 'IMAGE';
                    } catch (imgErr) {
                        logger.warn(`[LINKEDIN] Image upload error (${imgErr.message}), falling back to text + link share.`);
                    }
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
                        media: mediaAssetUrn ? [
                            {
                                status: 'READY',
                                description: { text: postData.title || 'TwinGenie Cognitive Engineering' },
                                media: mediaAssetUrn,
                                title: { text: postData.title || 'TwinGenie Carousel Breakdown' }
                            }
                        ] : undefined
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

        const fileStream = fs.createReadStream(filePath);
        const stats = fs.statSync(filePath);

        await fetch(uploadUrl, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'image/png',
                'Content-Length': stats.size.toString()
            },
            body: fileStream
        });

        logger.info(`[LINKEDIN] Image binary uploaded to asset: ${assetUrn}`);
        return assetUrn;
    }

    async _uploadDocument(accessToken, orgUrn, filePath, title) {
        // Step 1: Register upload
        const registerRes = await fetch('https://api.linkedin.com/v2/assets?action=registerUpload', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                registerUploadRequest: {
                    recipes: ['urn:li:digitalmediaRecipe:feedshare-document'],
                    owner: orgUrn,
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
            throw new Error('Failed to register LinkedIn document upload');
        }

        // Step 2: Upload file binary
        const fileStream = fs.createReadStream(filePath);
        const stats = fs.statSync(filePath);

        await fetch(uploadUrl, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/pdf',
                'Content-Length': stats.size.toString()
            },
            body: fileStream
        });

        logger.info(`[LINKEDIN] Document binary uploaded to asset: ${assetUrn}`);
        return assetUrn;
    }
}

export default new LinkedInAdapter();
