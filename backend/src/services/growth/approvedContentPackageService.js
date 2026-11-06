import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import logger from '../../config/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PACKAGES_DIR = path.join(__dirname, 'packages');

class ApprovedContentPackageService {
    constructor() {
        if (!fs.existsSync(PACKAGES_DIR)) {
            fs.mkdirSync(PACKAGES_DIR, { recursive: true });
        }
    }

    /**
     * Computes a canonical SHA-256 integrity hash of a content package
     */
    computePackageHash(pkg) {
        const payloadToHash = {
            packageId: pkg.packageId,
            version: pkg.version,
            platform: pkg.platform,
            date: pkg.date,
            pillarId: pkg.pillarId,
            themeId: pkg.themeId,
            arm: pkg.arm,
            caption: pkg.caption,
            slides: pkg.slides,
            utmLink: pkg.utmLink
        };
        const canonicalString = JSON.stringify(payloadToHash);
        return crypto.createHash('sha256').update(canonicalString).digest('hex');
    }

    /**
     * Saves a versioned, approved content package to disk
     */
    saveApprovedPackage(pkg) {
        const hash = this.computePackageHash(pkg);
        const packageToStore = {
            ...pkg,
            integrityHash: hash,
            storedAt: new Date().toISOString()
        };
        const fileName = `package_${pkg.platform}_${pkg.date.replace(/-/g, '')}_v2.json`;
        const filePath = path.join(PACKAGES_DIR, fileName);
        fs.writeFileSync(filePath, JSON.stringify(packageToStore, null, 2), 'utf8');
        logger.info(`📦 [PACKAGE SERVICE] Stored approved package ${pkg.packageId} at ${filePath} (SHA256: ${hash.slice(0, 12)}...)`);
        return packageToStore;
    }

    /**
     * Retrieves and verifies an approved content package for a specific date and platform.
     * Prevents unapproved regeneration. Halts publishing if missing or tampered with.
     * 
     * @param {string} platform - e.g. 'linkedin'
     * @param {string} dateStr - 'YYYY-MM-DD'
     * @returns {{ valid: boolean, package?: Object, reason?: string }}
     */
    getApprovedPackage(platform, dateStr) {
        const fileName = `package_${platform}_${dateStr.replace(/-/g, '')}_v2.json`;
        const filePath = path.join(PACKAGES_DIR, fileName);

        if (!fs.existsSync(filePath)) {
            logger.warn(`⚠️ [PACKAGE SERVICE] No approved package file found at ${filePath}`);
            return { valid: false, reason: `package_file_not_found: ${fileName}` };
        }

        try {
            const raw = fs.readFileSync(filePath, 'utf8');
            const pkg = JSON.parse(raw);

            // 1. Verify status is 'approved'
            if (pkg.status !== 'approved') {
                return { valid: false, reason: `package_not_approved: current status is '${pkg.status}'` };
            }

            // 2. Verify platform and date match
            if (pkg.platform !== platform || pkg.date !== dateStr) {
                return { valid: false, reason: `package_metadata_mismatch: platform=${pkg.platform}, date=${pkg.date}` };
            }

            // 3. Verify cryptographic integrity hash
            const expectedHash = this.computePackageHash(pkg);
            if (pkg.integrityHash !== expectedHash) {
                logger.error(`🚨 [PACKAGE SERVICE] Integrity verification failed for ${pkg.packageId}! Stored: ${pkg.integrityHash}, Computed: ${expectedHash}`);
                return { valid: false, reason: 'integrity_hash_mismatch_tampering_detected' };
            }

            // 4. Verify assets exist on disk
            if (pkg.pdfPath && !fs.existsSync(pkg.pdfPath)) {
                return { valid: false, reason: `pdf_asset_missing: ${pkg.pdfPath}` };
            }
            if (Array.isArray(pkg.pngPaths)) {
                for (const p of pkg.pngPaths) {
                    if (!fs.existsSync(p)) {
                        return { valid: false, reason: `slide_asset_missing: ${p}` };
                    }
                }
            }

            logger.info(`✅ [PACKAGE SERVICE] Verified immutable approved package ${pkg.packageId} for ${platform} (${dateStr})`);
            return { valid: true, package: pkg };
        } catch (e) {
            logger.error(`🚨 [PACKAGE SERVICE] Error reading approved package: ${e.message}`);
            return { valid: false, reason: `corrupt_package_file: ${e.message}` };
        }
    }
}

export default new ApprovedContentPackageService();
