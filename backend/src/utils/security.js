import crypto from 'crypto';

/**
 * Constant-time string comparison using SHA-256 digests so lengths never leak.
 */
export function safeCompare(a, b) {
    if (typeof a !== 'string' || typeof b !== 'string') return false;
    const digestA = crypto.createHash('sha256').update(a).digest();
    const digestB = crypto.createHash('sha256').update(b).digest();
    return crypto.timingSafeEqual(digestA, digestB);
}

/**
 * Returns configured admin secrets from environment (never includes defaults).
 */
export function getConfiguredAdminSecrets() {
    return [
        process.env.ADMIN_PASSWORD,
        process.env.ADMIN_API_KEY,
        process.env.ADMIN_SECRET_KEY,
    ].filter((v) => typeof v === 'string' && v.trim().length > 0);
}

/**
 * Returns configured automation/cron secrets from environment.
 */
export function getConfiguredAutomationSecrets() {
    return [
        process.env.ADMIN_API_KEY,
        process.env.ADMIN_SECRET_KEY,
        process.env.CRONJOB_API_KEY,
        process.env.CRON_JOB_API_KEY,
    ].filter((v) => typeof v === 'string' && v.trim().length > 0);
}

/**
 * Checks whether an incoming request carries a valid configured automation/admin secret.
 */
export function isAuthorizedAutomationRequest(req) {
    const secrets = getConfiguredAutomationSecrets();
    if (secrets.length === 0) return false;

    const authHeader = req.headers?.authorization;
    const bearer = authHeader && authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
    const candidates = [
        req.headers?.['x-admin-secret'],
        req.headers?.['x-admin-key'],
        req.query?.secret,
        req.query?.key,
        bearer,
    ].filter((v) => typeof v === 'string' && v.length > 0);

    return candidates.some((candidate) => secrets.some((secret) => safeCompare(candidate, secret)));
}

/**
 * Extracts only allowlisted keys from a request payload and reports disallowed keys.
 */
export function pickAllowlistedFields(payload, allowedKeys) {
    if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
        return { updates: {}, rejectedKeys: [] };
    }

    const allowSet = new Set(allowedKeys);
    const updates = {};
    const rejectedKeys = [];

    for (const [key, value] of Object.entries(payload)) {
        if (!allowSet.has(key)) {
            rejectedKeys.push(key);
            continue;
        }
        if (value !== undefined) {
            updates[key] = value;
        }
    }

    return { updates, rejectedKeys };
}

/**
 * Validates Google Play / opaque webhook purchase token format to block filter injection.
 */
export function isValidPurchaseToken(token) {
    return typeof token === 'string' && /^[A-Za-z0-9._:-]{8,512}$/.test(token);
}
