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

        const token = authHeader.split(' ')[1];

        // Dev mode bypass
        if (process.env.NODE_ENV === 'development' && token === 'dev-token') {
            req.userId = 'dev-user-123';
            return next();
        }

        // Verify JWT with Supabase
        const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);

        if (error || !user) {
            logger.error('Token validation failed:', { error: error?.message, hasUser: !!user });
            return res.status(401).json({ error: 'Invalid token' });
        }

        logger.info(`User authenticated: ${user.id}`);

        // Attach user to request
        req.userId = user.id;

        next();
    } catch (error) {
        logger.error('Auth middleware error:', error);
        res.status(401).json({ error: 'Authentication failed' });
    }
};

export default authenticateUser;
