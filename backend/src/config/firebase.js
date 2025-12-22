import admin from 'firebase-admin';
import { createRequire } from 'module';
import logger from './logger.js';
import path from 'path';
import { fileURLToPath } from 'url';

const require = createRequire(import.meta.url);
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Resolve path to service account - simpler and robuster than relative paths
// Config is in src/config, service account is in backend root
const serviceAccountPath = path.join(__dirname, '../../firebase-service-account.json');

try {
    let serviceAccount;

    // 1. Try environment variable (Render/Production)
    if (process.env.FIREBASE_SERVICE_ACCOUNT) {
        try {
            serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
            logger.info('Loaded Firebase credentials from environment variable');
        } catch (e) {
            logger.error('Failed to parse FIREBASE_SERVICE_ACCOUNT');
        }
    }

    // 2. Try local file (Development fallback)
    if (!serviceAccount) {
        try {
            serviceAccount = require(serviceAccountPath);
            logger.info('Loaded Firebase credentials from local file');
        } catch (e) {
            // Only log error if not in production or explicit mode
            if (process.env.NODE_ENV !== 'production') {
                logger.warn('Local firebase-service-account.json not found');
            }
        }
    }

    if (serviceAccount) {
        admin.initializeApp({
            credential: admin.credential.cert(serviceAccount)
        });
        logger.info('Firebase Admin initialized successfully');
    } else {
        logger.error('No Firebase credentials found (File or Env Var)');
    }

} catch (error) {
    logger.error('Firebase Admin initialization failed:', {
        message: error.message,
        path: serviceAccountPath
    });
}

export const messaging = admin.messaging();
export default admin;
