import crypto from 'crypto';
import fetch from 'node-fetch';
import logger from '../config/logger.js';

const TOKEN_URL = 'https://oauth2.googleapis.com/token';
const ANDROID_PUBLISHER_SCOPE = 'https://www.googleapis.com/auth/androidpublisher';
const tokenCache = {
    accessToken: null,
    expiresAt: 0,
};

function getServiceAccount() {
    const rawJson = process.env.GOOGLE_PLAY_SERVICE_ACCOUNT_JSON;
    const rawBase64 = process.env.GOOGLE_PLAY_SERVICE_ACCOUNT_BASE64;

    if (rawJson) {
        return JSON.parse(rawJson);
    }

    if (rawBase64) {
        return JSON.parse(Buffer.from(rawBase64, 'base64').toString('utf8'));
    }

    throw new Error('Google Play service account credentials are not configured');
}

function base64Url(input) {
    return Buffer.from(input)
        .toString('base64')
        .replace(/=/g, '')
        .replace(/\+/g, '-')
        .replace(/\//g, '_');
}

function createJwt(serviceAccount) {
    const now = Math.floor(Date.now() / 1000);
    const header = {
        alg: 'RS256',
        typ: 'JWT',
    };
    const claimSet = {
        iss: serviceAccount.client_email,
        scope: ANDROID_PUBLISHER_SCOPE,
        aud: TOKEN_URL,
        exp: now + 3600,
        iat: now,
    };

    const unsigned = `${base64Url(JSON.stringify(header))}.${base64Url(JSON.stringify(claimSet))}`;
    const signer = crypto.createSign('RSA-SHA256');
    signer.update(unsigned);
    signer.end();

    const privateKey = serviceAccount.private_key?.replace(/\\n/g, '\n');
    if (!privateKey || !serviceAccount.client_email) {
        throw new Error('Google Play service account credentials are incomplete');
    }

    const signature = signer
        .sign(privateKey, 'base64')
        .replace(/=/g, '')
        .replace(/\+/g, '-')
        .replace(/\//g, '_');

    return `${unsigned}.${signature}`;
}

async function getAccessToken() {
    if (tokenCache.accessToken && Date.now() < tokenCache.expiresAt - 60_000) {
        return tokenCache.accessToken;
    }

    const serviceAccount = getServiceAccount();
    const assertion = createJwt(serviceAccount);

    const response = await fetch(TOKEN_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
            grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
            assertion,
        }),
    });

    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
        logger.error('Google Play OAuth failed:', payload);
        throw new Error('Failed to authenticate with Google Play');
    }

    tokenCache.accessToken = payload.access_token;
    tokenCache.expiresAt = Date.now() + ((payload.expires_in || 3600) * 1000);
    return tokenCache.accessToken;
}

function getPackageName() {
    const packageName = process.env.GOOGLE_PLAY_PACKAGE_NAME || process.env.ANDROID_PACKAGE_NAME || 'com.asmind.app';
    if (!packageName) throw new Error('GOOGLE_PLAY_PACKAGE_NAME is not configured');
    return packageName;
}

function normalizeState(subscription) {
    const state = subscription.subscriptionState || 'SUBSCRIPTION_STATE_UNSPECIFIED';
    const activeStates = new Set([
        'SUBSCRIPTION_STATE_ACTIVE',
        'SUBSCRIPTION_STATE_IN_GRACE_PERIOD',
    ]);
    const pendingStates = new Set([
        'SUBSCRIPTION_STATE_PENDING',
        'SUBSCRIPTION_STATE_PAUSED',
        'SUBSCRIPTION_STATE_ON_HOLD',
    ]);

    if (activeStates.has(state)) return 'active';
    if (pendingStates.has(state)) return 'pending';
    if (state === 'SUBSCRIPTION_STATE_CANCELED') return 'cancelled';
    if (state === 'SUBSCRIPTION_STATE_EXPIRED') return 'expired';
    return 'expired';
}

function getExpiryTime(subscription) {
    const expiryTimes = (subscription.lineItems || [])
        .map((item) => item.expiryTime)
        .filter(Boolean)
        .sort();
    return expiryTimes.length > 0 ? expiryTimes[expiryTimes.length - 1] : null;
}

export async function verifySubscriptionPurchase({ productId, purchaseToken }) {
    if (!productId || !purchaseToken) {
        throw new Error('productId and purchaseToken are required');
    }

    const accessToken = await getAccessToken();
    const packageName = getPackageName();
    const encodedToken = encodeURIComponent(purchaseToken);
    const url = `https://androidpublisher.googleapis.com/androidpublisher/v3/applications/${packageName}/purchases/subscriptionsv2/tokens/${encodedToken}`;

    const response = await fetch(url, {
        headers: {
            Authorization: `Bearer ${accessToken}`,
            Accept: 'application/json',
        },
    });

    const subscription = await response.json().catch(() => ({}));
    if (!response.ok) {
        logger.error('Google Play subscription verification failed:', {
            status: response.status,
            productId,
            error: subscription,
        });
        throw new Error('Google Play could not verify this subscription');
    }

    const lineItems = subscription.lineItems || [];
    const matchingLineItem = lineItems.find((item) => item.productId === productId);
    if (lineItems.length > 0 && !matchingLineItem) {
        throw new Error('Purchase token does not match the requested product');
    }

    return {
        raw: subscription,
        status: normalizeState(subscription),
        orderId: subscription.latestOrderId || null,
        expiryTime: getExpiryTime(subscription),
        linkedPurchaseToken: subscription.linkedPurchaseToken || null,
        acknowledgementState: subscription.acknowledgementState || null,
    };
}

export async function acknowledgeSubscriptionPurchase({ productId, purchaseToken }) {
    const accessToken = await getAccessToken();
    const packageName = getPackageName();
    const url = `https://androidpublisher.googleapis.com/androidpublisher/v3/applications/${packageName}/purchases/subscriptions/${encodeURIComponent(productId)}/tokens/${encodeURIComponent(purchaseToken)}:acknowledge`;

    const response = await fetch(url, {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ developerPayload: 'TwinGenie premium subscription verified server-side' }),
    });

    if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        logger.warn('Google Play subscription acknowledgement failed:', {
            status: response.status,
            productId,
            error: payload,
        });
    }
}

export default {
    verifySubscriptionPurchase,
    acknowledgeSubscriptionPurchase,
};
