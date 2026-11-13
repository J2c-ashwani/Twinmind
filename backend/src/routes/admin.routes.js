import express from 'express';
import crypto from 'crypto';
import { supabase, supabaseAdmin } from '../config/supabase.js';
import { calculateDeterministicPersonality } from '../services/deterministicPersonality.js';
import { sendRecoveryEmail, sendProductUpdateEmail } from '../services/emailService.js';
import acquisitionCampaignService from '../services/acquisitionCampaignService.js';
import adminAnalyticsService from '../services/adminAnalyticsService.js';
import aiService from '../services/aiService.js';

const router = express.Router();

/**
 * Constant-time string comparison to prevent timing attacks
 */
const safeCompare = (a, b) => {
    if (typeof a !== 'string' || typeof b !== 'string') return false;
    const bufA = Buffer.from(a);
    const bufB = Buffer.from(b);
    if (bufA.length !== bufB.length) return false;
    return crypto.timingSafeEqual(bufA, bufB);
};

/**
 * Returns all active admin secrets configured in the server environment
 */
const getValidAdminSecrets = () => {
    return [
        process.env.ADMIN_PASSWORD,
        process.env.ADMIN_API_KEY,
        process.env.ADMIN_SECRET_KEY
    ].filter(Boolean);
};

/**
 * Master Admin Authentication Middleware.
 * Fail-closed: If no admin credentials are set on the server, all access is denied.
 * Supports:
 *   1) Direct Admin Password / Key via X-Admin-Key or X-Admin-Password header
 *   2) Bearer token matching the Admin Password / Key
 *   3) Supabase JWT where user email matches ADMIN_EMAIL or personality_profiles metadata has role: 'admin'
 */
const requireAdminAuth = async (req, res, next) => {
    try {
        const validSecrets = getValidAdminSecrets();
        const adminEmail = process.env.ADMIN_EMAIL;

        // Fail-closed rule: If no admin password or email is configured, refuse all entry
        if (validSecrets.length === 0 && !adminEmail) {
            console.warn('[SECURITY] Admin endpoint accessed but no ADMIN_PASSWORD or ADMIN_EMAIL is configured on server.');
            return res.status(503).json({
                error: 'Admin access is disabled. Please configure ADMIN_PASSWORD in your server environment variables.'
            });
        }

        // 1. Direct Admin Key / Password Header
        const providedKey = req.headers['x-admin-key'] || req.headers['x-admin-password'];
        if (providedKey) {
            const isValid = validSecrets.some(secret => safeCompare(providedKey, secret));
            if (isValid) {
                req.isAdmin = true;
                req.adminAuthType = 'password';
                return next();
            } else {
                console.warn(`[SECURITY] Invalid admin key/password attempt from IP ${req.ip}`);
                return res.status(401).json({ error: 'Unauthorized: Invalid admin password' });
            }
        }

        // 2. Authorization header check (Bearer token can be an admin password OR a Supabase JWT)
        const authHeader = req.headers.authorization;
        if (authHeader && authHeader.startsWith('Bearer ')) {
            const token = authHeader.split(' ')[1];

            // Direct check against admin secrets
            if (validSecrets.some(secret => safeCompare(token, secret))) {
                req.isAdmin = true;
                req.adminAuthType = 'password';
                return next();
            }

            // Supabase JWT check
            if (token && token.split('.').length === 3) {
                try {
                    const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
                    if (!error && user) {
                        const { data: profile } = await supabaseAdmin
                            .from('personality_profiles')
                            .select('metadata')
                            .eq('user_id', user.id)
                            .maybeSingle();

                        const isEmailAdmin = adminEmail && user.email && user.email.toLowerCase() === adminEmail.toLowerCase();
                        const isRoleAdmin = profile?.metadata?.role === 'admin';

                        if (isEmailAdmin || isRoleAdmin) {
                            req.userId = user.id;
                            req.user = { userId: user.id, email: user.email, role: 'admin' };
                            req.isAdmin = true;
                            req.adminAuthType = 'supabase_jwt';
                            return next();
                        }
                    }
                } catch (jwtErr) {
                    // Ignore and fall through to 401
                }
            }
        }

        return res.status(401).json({ error: 'Unauthorized: Master admin password or authorized session required' });
    } catch (error) {
        console.error('Admin authentication error:', error);
        return res.status(500).json({ error: 'Admin authentication verification error' });
    }
};

// Backwards compatibility alias
const isAdmin = requireAdminAuth;

// Strict server-level secret check for high-risk operations (broadcasts & batch recoveries)
const requireAdminSecret = (req, res, next) => {
    const adminKey = req.headers['x-admin-key'] || req.headers['x-admin-secret'] || req.headers['x-admin-password'];
    const validSecrets = getValidAdminSecrets();

    if (validSecrets.length === 0) {
        console.error('[SECURITY ALERT] ADMIN_PASSWORD / ADMIN_API_KEY is not configured on server.');
        return res.status(503).json({ 
            error: 'Administrative broadcast endpoints are disabled until ADMIN_PASSWORD is configured in server environment' 
        });
    }

    const isValid = adminKey && validSecrets.some(secret => safeCompare(adminKey, secret));
    if (!isValid) {
        console.warn(`[SECURITY ALERT] Unauthorized admin key attempt from ${req.ip} for ${req.originalUrl}`);
        return res.status(401).json({ error: 'Unauthorized: Invalid or missing X-Admin-Key header' });
    }

    next();
};

/**
 * Public Verification Endpoint for Web Admin Portal.
 * Verifies if the provided password matches ADMIN_PASSWORD.
 */
router.post('/verify-password', async (req, res) => {
    try {
        const validSecrets = getValidAdminSecrets();
        if (validSecrets.length === 0) {
            return res.status(503).json({
                success: false,
                configured: false,
                error: 'Admin access is locked. Please set ADMIN_PASSWORD in your server environment variables.'
            });
        }

        const password = req.body?.password || req.headers['x-admin-key'] || req.headers['x-admin-password'];
        if (!password) {
            return res.status(400).json({ success: false, error: 'Password is required' });
        }

        const isValid = validSecrets.some(secret => safeCompare(password, secret));
        if (!isValid) {
            return res.status(401).json({ success: false, error: 'Incorrect admin password' });
        }

        res.json({
            success: true,
            configured: true,
            message: 'Admin access granted'
        });
    } catch (error) {
        console.error('Verify admin password error:', error);
        res.status(500).json({ success: false, error: 'Internal server error during verification' });
    }
});

router.get('/me', requireAdminAuth, async (req, res) => {
    res.json({ isAdmin: true, authType: req.adminAuthType, email: req.user?.email || 'admin' });
});

// Get platform statistics with rigorous sender=user separation
router.get('/stats', requireAdminAuth, async (req, res) => {
    try {
        // Total registered users
        const { count: totalUsersCount } = await supabaseAdmin
            .from('users')
            .select('*', { count: 'exact', head: true });

        // Total personality profiles
        const { count: profileCount } = await supabaseAdmin
            .from('personality_profiles')
            .select('*', { count: 'exact', head: true });

        // Total user-authored messages (actual human activation KPI)
        const { count: userMessageCount } = await supabaseAdmin
            .from('chat_history')
            .select('*', { count: 'exact', head: true })
            .eq('sender', 'user');

        // Total AI messages (including seeded Twin Opening Messages)
        const { count: aiMessageCount } = await supabaseAdmin
            .from('chat_history')
            .select('*', { count: 'exact', head: true })
            .eq('sender', 'ai');

        // Distinct activated users (sent >= 1 message)
        const { data: userAuthors } = await supabaseAdmin
            .from('chat_history')
            .select('user_id')
            .eq('sender', 'user');

        const activatedUserCount = new Set((userAuthors || []).map(m => m.user_id)).size;

        // 24h active user-authored chatters
        const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
        const { data: recentUserAuthors } = await supabaseAdmin
            .from('chat_history')
            .select('user_id')
            .eq('sender', 'user')
            .gte('created_at', oneDayAgo);
        const active24hCount = new Set((recentUserAuthors || []).map(m => m.user_id)).size;

        // Total conversations
        const { count: conversationCount } = await supabaseAdmin
            .from('conversations')
            .select('*', { count: 'exact', head: true });

        res.json({
            totalUsers: totalUsersCount ?? profileCount ?? 0,
            activeUsers: active24hCount,
            totalMessages: (userMessageCount || 0) + (aiMessageCount || 0),
            totalProfiles: profileCount || 0,
            activatedUsers: activatedUserCount,
            unengagedSeededUsers: Math.max(0, (profileCount || 0) - activatedUserCount),
            userAuthoredMessages: userMessageCount || 0,
            aiMessages: aiMessageCount || 0,
            totalConversations: conversationCount || 0
        });
    } catch (error) {
        console.error('Admin stats error:', error);
        res.status(500).json({ error: 'Failed to fetch statistics' });
    }
});

router.get('/analytics', requireAdminAuth, async (req, res) => {
    try {
        const analyticsData = await adminAnalyticsService.getAllAnalytics();
        res.json({
            success: true,
            ...analyticsData,
        });
    } catch (error) {
        console.error('Admin analytics error:', error);
        res.status(500).json({ error: 'Failed to fetch analytics', details: error.message });
    }
});

router.get('/ai-health', requireAdminAuth, async (req, res) => {
    try {
        const stats = aiService.getStats();
        res.json({
            success: true,
            stats,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('Admin AI health error:', error);
        res.status(500).json({ error: 'Failed to fetch AI health status' });
    }
});

// Get recent users
router.get('/users/recent', requireAdminAuth, async (req, res) => {
    try {
        const { data: users, error } = await supabaseAdmin
            .from('users')
            .select('id, email, full_name, created_at, updated_at')
            .order('created_at', { ascending: false })
            .limit(10);

        if (error) throw error;

        res.json({
            users: (users || []).map((u) => ({
                user_id: u.id,
                email: u.email,
                full_name: u.full_name,
                created_at: u.created_at,
                updated_at: u.updated_at,
            })),
        });
    } catch (error) {
        console.error('Admin users error:', error);
        res.status(500).json({ error: 'Failed to fetch users' });
    }
});

// Get system health
router.get('/health', requireAdminAuth, async (req, res) => {
    try {
        const { error: dbError } = await supabaseAdmin
            .from('personality_profiles')
            .select('user_id', { count: 'exact', head: true });

        res.json({
            status: 'healthy',
            database: dbError ? 'error' : 'connected',
            timestamp: new Date().toISOString(),
            uptime: process.uptime()
        });
    } catch (error) {
        res.status(500).json({ error: 'System health check failed' });
    }
});

// Trigger recovery for users who completed 35 questions without a profile
router.post('/recover-stuck-users', requireAdminAuth, requireAdminSecret, async (req, res) => {
    try {
        const { data: authData, error: authError } = await supabaseAdmin.auth.admin.listUsers();
        if (authError) throw authError;

        const { data: existingProfiles } = await supabaseAdmin
            .from('personality_profiles')
            .select('user_id');

        const existingSet = new Set((existingProfiles || []).map(p => p.user_id));
        const recovered = [];

        for (const user of authData.users) {
            if (existingSet.has(user.id)) continue;

            const { data: answers } = await supabaseAdmin
                .from('personality_answers')
                .select('*')
                .eq('user_id', user.id);

            if (!answers || answers.length === 0) continue;

            const { data: userRow } = await supabaseAdmin
                .from('users')
                .select('full_name')
                .eq('id', user.id)
                .single();

            const fullName = userRow?.full_name || user.user_metadata?.full_name || user.email.split('@')[0];
            const twinName = `${fullName}'s Twin`;

            const personalityJson = calculateDeterministicPersonality(answers, { full_name: fullName });
            const twinSummary = personalityJson.summary || 'A unique digital twin reflecting your thinking patterns, values, and strengths.';

            await supabaseAdmin
                .from('personality_profiles')
                .insert({
                    user_id: user.id,
                    personality_json: personalityJson,
                    twin_name: twinName,
                    twin_summary: twinSummary,
                    generation_prompt: 'Deterministic baseline recovery via admin route',
                    ai_model: 'deterministic_baseline',
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                });

            existingSet.add(user.id);
            recovered.push({ id: user.id, email: user.email, name: fullName });

            // Send recovery email via emailService
            if (user.email && !user.email.includes('tempmail')) {
                sendRecoveryEmail({
                    email: user.email,
                    name: fullName,
                    twinName,
                    twinSummary
                }).catch(e => console.error(`Error sending email to ${user.email}:`, e));
            }
        }

        res.json({
            success: true,
            recoveredCount: recovered.length,
            recoveredUsers: recovered
        });
    } catch (error) {
        console.error('Recover stuck users error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Broadcast email (e.g. app update, new feature, re-engagement)
router.post('/broadcast-email', requireAdminAuth, requireAdminSecret, async (req, res) => {
    try {
        const { title, version, highlights, actionUrl, actionText, testEmailOnly } = req.body;

        if (!title) {
            return res.status(400).json({ error: 'Title is required' });
        }

        let targetEmails = [];

        if (testEmailOnly) {
            targetEmails = [{ email: testEmailOnly, name: 'Tester' }];
        } else {
            const { data: authData, error: authError } = await supabaseAdmin.auth.admin.listUsers();
            if (authError) throw authError;

            targetEmails = authData.users
                .filter(u => u.email && !u.email.includes('tempmail'))
                .map(u => ({
                    email: u.email,
                    name: u.user_metadata?.full_name || u.email.split('@')[0]
                }));
        }

        let sentCount = 0;
        for (const recipient of targetEmails) {
            const result = await sendProductUpdateEmail({
                email: recipient.email,
                name: recipient.name,
                version,
                title,
                highlights,
                actionUrl,
                actionText
            });
            if (result.success) sentCount++;
        }

        res.json({
            success: true,
            totalRecipients: targetEmails.length,
            sentCount
        });
    } catch (error) {
        console.error('Broadcast email error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Seed proactive AI greeting for all users who completed onboarding but haven't started chatting
router.post('/seed-proactive-greetings', requireAdminAuth, requireAdminSecret, async (req, res) => {
    try {
        const { data: profiles, error: pError } = await supabaseAdmin
            .from('personality_profiles')
            .select('user_id, twin_name, twin_summary, personality_json');

        if (pError) throw pError;

        const userIds = (profiles || []).map(p => p.user_id);
        const { data: messages, error: mError } = await supabaseAdmin
            .from('chat_history')
            .select('user_id')
            .in('user_id', userIds);

        if (mError) throw mError;

        const usersWithMessages = new Set((messages || []).map(m => m.user_id));
        const usersToSeed = (profiles || []).filter(p => !usersWithMessages.has(p.user_id));

        const seededUsers = [];

        // Fetch auth user details for display names
        const { data: authData } = await supabaseAdmin.auth.admin.listUsers();
        const userMap = new Map((authData?.users || []).map(u => [u.id, u]));

        for (const prof of usersToSeed) {
            const authUser = userMap.get(prof.user_id);
            const fullName = authUser?.user_metadata?.full_name || authUser?.email?.split('@')[0] || 'there';
            const firstName = fullName.split(' ')[0];

            // 1. Ensure conversation exists
            const { data: existingConvs } = await supabaseAdmin
                .from('conversations')
                .select('id')
                .eq('user_id', prof.user_id)
                .order('created_at', { ascending: false })
                .limit(1);

            let conversationId;
            if (!existingConvs || existingConvs.length === 0) {
                const { data: newConv, error: cError } = await supabaseAdmin
                    .from('conversations')
                    .insert([{
                        user_id: prof.user_id,
                        title: 'Meeting Your Twin',
                        created_at: new Date().toISOString(),
                        updated_at: new Date().toISOString()
                    }])
                    .select()
                    .single();

                if (!cError && newConv) conversationId = newConv.id;
            } else {
                conversationId = existingConvs[0].id;
            }

            if (conversationId) {
                const openingMsg = `Hey ${firstName}, I'm your AI Twin. 🪞\n\nI've built your initial profile from the way you answered the questions.\n\nWhat would you like to explore first?`;

                await supabaseAdmin
                    .from('chat_history')
                    .insert([{
                        user_id: prof.user_id,
                        conversation_id: conversationId,
                        sender: 'ai',
                        message: openingMsg,
                        mode: 'normal',
                        created_at: new Date().toISOString()
                    }]);

                seededUsers.push({
                    userId: prof.user_id,
                    email: authUser?.email,
                    name: fullName,
                    conversationId
                });
            }
        }

        res.json({
            success: true,
            totalEligible: usersToSeed.length,
            seededCount: seededUsers.length,
            seededUsers
        });

    } catch (error) {
        console.error('Seed proactive greetings error:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * GET /api/admin/campaign/status
 * Get M&A acquisition campaign status, queue, and send counters
 */
router.get('/campaign/status', requireAdminSecret, (req, res) => {
    try {
        const status = acquisitionCampaignService.getStatus();
        res.json({ success: true, status });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * POST /api/admin/campaign/trigger-next
 * Manually trigger the next outreach send in queue
 */
router.post('/campaign/trigger-next', requireAdminSecret, async (req, res) => {
    try {
        const force = req.body?.force === true || req.query?.force === 'true';
        const result = await acquisitionCampaignService.executeTick(force);
        res.json({ success: true, result, status: acquisitionCampaignService.getStatus() });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

export default router;
