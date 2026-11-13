import path from 'path';
import {randomUUID} from 'crypto';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { execFile } from 'child_process';
import logger from '../../config/logger.js';
import { buildMotionCreative } from './reelCreativeService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PYTHON_RENDERER_PATH = path.join(__dirname, 'renderers/carouselRenderer.py');
const PYTHON_REEL_RENDERER_PATH = path.join(__dirname, 'renderers/reelRenderer.py');
const MOTION_RENDERER_PATH = path.join(__dirname, 'renderers/motionReelRenderer.py');
export const REEL_WORKER_TIMEOUT_MS = 600000; // Under the existing 15-minute publication lease.
const PUBLIC_ASSETS_DIR = path.join(__dirname, '../../../public/growth_assets');

// Ensure assets directory exists
if (!fs.existsSync(PUBLIC_ASSETS_DIR)) {
    fs.mkdirSync(PUBLIC_ASSETS_DIR, { recursive: true });
}

class MediaRendererService {
    /**
     * Renders a 1080x1350 carousel (PNGs + PDF)
     * @param {Object} spec - { campaignId, postId, slides: [{ title, content, highlight, tag }] }
     * @returns {Promise<{ totalSlides: number, pngUrls: string[], pdfUrl: string, localDir: string }>}
     */
    startRenderPreview(spec) {
        this._previewJobs ||= new Map();
        for(const [id,job] of this._previewJobs) if(this._previewJobs.size>=16 && ['succeeded','failed'].includes(job.status))this._previewJobs.delete(id);
        if(this._previewJobs.size>=16)throw new Error('Too many active render previews');
        const id=`preview_${Date.now()}_${randomUUID().slice(0,8)}`;
        const job={id,status:'processing',createdAt:new Date().toISOString(),progressPath:path.join(PUBLIC_ASSETS_DIR,`test_render_${id}`,'reel.status.json')};
        this._previewJobs.set(id,job);
        void this.renderReel({...spec,campaignId:'test_render',postId:id}).then(result=>{
            Object.assign(job,{status:'succeeded',finishedAt:new Date().toISOString(),result});
        }).catch(error=>{
            Object.assign(job,{status:'failed',finishedAt:new Date().toISOString(),error:error.message});
        });
        return {id,status:job.status,statusUrl:`/api/admin/growth/render-test/${id}`};
    }

    getRenderPreview(id) {
        const job=this._previewJobs?.get(id);
        if(!job)return null;
        const {progressPath,...publicJob}=job;
        try {publicJob.progress=JSON.parse(fs.readFileSync(progressPath,'utf8'));}catch{}
        return publicJob;
    }

    _queueRender(task) {
        // Video encoders and Pillow workers share the app server's memory limit.
        const next = (this._renderQueue || Promise.resolve()).catch(()=>{}).then(task);
        this._renderQueue = next;
        return next;
    }

    async renderCarousel(spec) {
        return this._queueRender(()=>this._renderCarousel(spec));
    }

    async _renderCarousel(spec) {
        return new Promise((resolve, reject) => {
            if (global.gc) {
                try { global.gc(); } catch (e) {}
            }
            const folderName = `${spec.campaignId || 'camp'}_${spec.postId || Date.now()}`;
            const targetDir = path.join(PUBLIC_ASSETS_DIR, folderName);

            const specJson = JSON.stringify({ slides: spec.slides });

            execFile('python3', [PYTHON_RENDERER_PATH, specJson, targetDir], { timeout: 60000, maxBuffer: 10 * 1024 * 1024 }, (error, stdout, stderr) => {
                if (global.gc) {
                    try { global.gc(); } catch (e) {}
                }
                if (error) {
                    logger.error('[MEDIA RENDERER] Carousel rendering failed:', error, stderr);
                    return reject(new Error(`Carousel rendering error: ${stderr || error.message}`));
                }

                try {
                    const lines = stdout.trim().split('\n');
                    const lastLine = lines[lines.length - 1];
                    const result = JSON.parse(lastLine);
                    const baseUrl = process.env.RENDER_EXTERNAL_URL || process.env.API_BASE_URL || 'https://twingenie.app';

                    const pngUrls = result.pngPaths.map(p => {
                        const rel = path.relative(path.join(__dirname, '../../../public'), p);
                        return `${baseUrl}/${rel.replace(/\\/g, '/')}`;
                    });

                    const pdfRel = path.relative(path.join(__dirname, '../../../public'), result.pdfPath);
                    const pdfUrl = `${baseUrl}/${pdfRel.replace(/\\/g, '/')}`;

                    logger.info(`✅ [MEDIA RENDERER] Rendered ${result.totalSlides} slides and PDF at ${targetDir}`);
                    resolve({
                        totalSlides: result.totalSlides,
                        pngPaths: result.pngPaths,
                        pngUrls,
                        pdfPath: result.pdfPath,
                        pdfUrl,
                        localDir: targetDir
                    });
                } catch (parseErr) {
                    logger.error('[MEDIA RENDERER] Failed to parse renderer stdout:', stdout);
                    reject(parseErr);
                }
            });
        });
    }

    /**
     * Renders a 1080x1920 motion Reel video (MP4) with a serialized worker and bounded encoder buffers
     * @param {Object} spec - { campaignId, postId, hook, tag, voiceHook, voiceProblem, voiceSolution, voiceCta }
     * @returns {Promise<{ videoPath: string, videoUrl: string, durationSeconds: number, resolution: string, localDir: string }>}
     */
    async renderReel(spec) {
        if (process.env.REEL_RENDERER_VERSION === 'legacy') return this._queueRender(()=>this._renderReel(spec));
        const creative = buildMotionCreative(spec);
        const key = JSON.stringify(creative);
        this._motionCache ||= new Map();
        const cached = this._motionCache.get(key);
        if (cached) {
            const result = await cached;
            if (fs.existsSync(result.videoPath)) return result;
            this._motionCache.delete(key);
        }
        const pending = this._queueRender(()=>this._renderReel({...spec,creative})).catch(error=>{this._motionCache.delete(key);throw error;});
        this._motionCache.set(key,pending);
        if (this._motionCache.size>8) this._motionCache.delete(this._motionCache.keys().next().value);
        return pending;
    }

    async _renderReel(spec) {
        return new Promise((resolve, reject) => {
            if (global.gc) {
                try { global.gc(); } catch (e) {}
            }
            const folderName = `${spec.campaignId || 'camp'}_${spec.postId || Date.now()}`;
            const targetDir = path.join(PUBLIC_ASSETS_DIR, folderName);
            if (!fs.existsSync(targetDir)) {
                fs.mkdirSync(targetDir, { recursive: true });
            }
            const outputMp4 = path.join(targetDir, 'reel.mp4');
            const motion = process.env.REEL_RENDERER_VERSION !== 'legacy';
            const renderSpec = motion ? { ...spec, creative: buildMotionCreative(spec) } : spec;
            const specJson = JSON.stringify(renderSpec);

            execFile('python3', [motion ? MOTION_RENDERER_PATH : PYTHON_REEL_RENDERER_PATH, specJson, outputMp4], { timeout: REEL_WORKER_TIMEOUT_MS, maxBuffer: 10 * 1024 * 1024 }, (error, stdout, stderr) => {
                if (global.gc) {
                    try { global.gc(); } catch (e) {}
                }
                if (error) {
                    logger.error('[MEDIA RENDERER] Reel rendering failed:', error, stderr, stdout);
                    return reject(new Error(`Reel rendering error: ${stderr || stdout || error.message || error}`));
                }

                try {
                    const lines = stdout.trim().split('\n');
                    const lastLine = lines[lines.length - 1];
                    const result = JSON.parse(lastLine);
                    const baseUrl = process.env.RENDER_EXTERNAL_URL || process.env.API_BASE_URL || 'https://twingenie.app';
                    const rel = path.relative(path.join(__dirname, '../../../public'), result.videoPath);
                    const videoUrl = `${baseUrl}/${rel.replace(/\\/g, '/')}`;

                    logger.info(`🎬 [MEDIA RENDERER] Rendered Reel MP4 at ${outputMp4}`);
                    resolve({
                        videoPath: result.videoPath,
                        videoUrl,
                        durationSeconds: result.durationSeconds,
                        resolution: result.resolution,
                        renderVersion: result.renderVersion || 'legacy',
                        creativeId: result.creativeId,
                        creativeRevision: result.creativeRevision,
                        peakRendererMemoryMb: result.peakRendererMemoryMb,
                        peakEncoderMemoryMb: result.peakEncoderMemoryMb,
                        hookVariant: result.hookVariant,
                        captionsPath: result.captionsPath,
                        storyboardPath: result.storyboardPath,
                        localDir: targetDir
                    });
                } catch (parseErr) {
                    logger.error('[MEDIA RENDERER] Failed to parse reel renderer stdout:', stdout);
                    reject(parseErr);
                }
            });
        });
    }
}

const mediaRendererService = new MediaRendererService();
export default mediaRendererService;
