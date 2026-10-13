import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { execFile } from 'child_process';
import logger from '../../config/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PYTHON_RENDERER_PATH = path.join(__dirname, 'renderers/carouselRenderer.py');
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
    async renderCarousel(spec) {
        return new Promise((resolve, reject) => {
            const folderName = `${spec.campaignId || 'camp'}_${spec.postId || Date.now()}`;
            const targetDir = path.join(PUBLIC_ASSETS_DIR, folderName);

            const specJson = JSON.stringify({ slides: spec.slides });

            execFile('python3', [PYTHON_RENDERER_PATH, specJson, targetDir], (error, stdout, stderr) => {
                if (error) {
                    logger.error('[MEDIA RENDERER] Carousel rendering failed:', error, stderr);
                    return reject(new Error(`Carousel rendering error: ${stderr || error.message}`));
                }

                try {
                    const result = JSON.parse(stdout.trim());
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
}

const mediaRendererService = new MediaRendererService();
export default mediaRendererService;
