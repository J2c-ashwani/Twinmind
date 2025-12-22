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
    const serviceAccount = require(serviceAccountPath);

    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });

    logger.info('Firebase Admin initialized successfully');
} catch (error) {
    logger.error('Firebase Admin initialization failed:', {
        message: error.message,
        path: serviceAccountPath
    });
}

export const messaging = admin.messaging();
export default admin;
