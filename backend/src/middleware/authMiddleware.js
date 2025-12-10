import { supabaseAdmin } from '../config/supabase.js';
import logger from '../config/logger.js';

/**
 * Authentication middleware using Supabase JWT
 */
export const authenticateUser = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader) {
            return res.status(401).json({ error: 'No authorization header' });
        }

        // Validate Authorization header format
        if (!authHeader.startsWith('Bearer ')) {
            logger.error('Invalid authorization header format:', authHeader.substring(0, 20) + '...');
            return res.status(401).json({ error: 'Invalid authorization header format' });
        }

        const token = authHeader.split(' ')[1];

        // Check if token exists and has proper JWT format (3 segments separated by dots)
        if (!token || token.split('.').length !== 3) {
            logger.error('Malformed JWT token:', {
                hasToken: !!token,
                tokenLength: token?.length,
                segments: token?.split('.').length,
                tokenPreview: token?.substring(0, 20) + '...'
            });
            return res.status(401).json({ error: 'Malformed authentication token' });
        }

        // Verify JWT with Supabase
        const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);

        if (error || !user) {
            logger.error('Token validation failed:', { error: error?.message || error, hasUser: !!user });
            return res.status(401).json({ error: 'Invalid token' });
        }

        logger.info(`User authenticated: ${user.id}`);

        // Attach user to request
        req.userId = user.id;
        req.user = { userId: user.id }; // For compatibility

        next();
    } catch (error) {
        logger.error('Auth middleware error:', error);
        res.status(401).json({ error: 'Authentication failed' });
    }
};

// Export as verifyToken for backwards compatibility
export const verifyToken = authenticateUser;

export default authenticateUser;

