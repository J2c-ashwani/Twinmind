import express from 'express';
import { supabase, supabaseAdmin } from '../config/supabase.js';
import { verifyToken } from '../middleware/authMiddleware.js';
import { calculateDeterministicPersonality } from '../services/deterministicPersonality.js';
import { sendRecoveryEmail, sendProductUpdateEmail } from '../services/emailService.js';

const router = express.Router();

// Middleware to check if user is admin
const isAdmin = async (req, res, next) => {
    try {
        const { data: profile } = await supabase
            .from('personality_profiles')
            .select('*')
            .eq('user_id', req.user.userId)
            .single();

        // Check against environment variable and metadata
        const adminEmail = process.env.ADMIN_EMAIL;
        const isUserAdmin = (adminEmail && req.user.email === adminEmail) ||
            profile?.metadata?.role === 'admin';

        if (!isUserAdmin) {
            console.warn(`Admin access denied for: ${req.user.email}`);
            return res.status(403).json({ error: 'Forbidden: Admin access required' });
        }

        next();
    } catch (error) {
        res.status(500).json({ error: 'Admin verification failed' });
    }
};

// Strict server-level secret check for high-risk operations (broadcasts & batch recoveries)
const requireAdminSecret = (req, res, next) => {
    const adminKey = req.headers['x-admin-key'] || req.headers['x-admin-secret'];
    const expectedKey = process.env.ADMIN_API_KEY || process.env.ADMIN_SECRET_KEY;

    if (!expectedKey) {
        console.error('[SECURITY ALERT] ADMIN_API_KEY / ADMIN_SECRET_KEY is not configured on server.');
        return res.status(503).json({ 
            error: 'Administrative broadcast endpoints are disabled until ADMIN_API_KEY is configured in server environment' 
        });
    }

    if (!adminKey || adminKey !== expectedKey) {
        console.warn(`[SECURITY ALERT] Unauthorized admin key attempt from ${req.ip} for ${req.originalUrl}`);
        return res.status(401).json({ error: 'Unauthorized: Invalid or missing X-Admin-Key header' });
    }

    next();
};

router.get('/me', verifyToken, isAdmin, async (req, res) => {
    res.json({ isAdmin: true, email: req.user.email });
});

// Get platform statistics with rigorous sender=user separation
router.get('/stats', verifyToken, isAdmin, async (req, res) => {
    try {
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

        // Total conversations
        const { count: conversationCount } = await supabaseAdmin
            .from('conversations')
            .select('*', { count: 'exact', head: true });

        res.json({
            totalProfiles: profileCount || 0,
            activatedUsers: activatedUserCount,
            unengagedSeededUsers: (profileCount || 0) - activatedUserCount,
            userAuthoredMessages: userMessageCount || 0,
            aiMessages: aiMessageCount || 0,
            totalConversations: conversationCount || 0
        });
    } catch (error) {
        console.error('Admin stats error:', error);
        res.status(500).json({ error: 'Failed to fetch statistics' });
    }
});

router.get('/analytics', verifyToken, isAdmin, async (req, res) => {
    try {
        const { count: profileCount } = await supabase
            .from('personality_profiles')
            .select('*', { count: 'exact', head: true });

        res.json({
            totalProfiles: profileCount || 0,
            generatedAt: new Date().toISOString(),
        });
    } catch (error) {
        console.error('Admin analytics error:', error);
        res.status(500).json({ error: 'Failed to fetch analytics' });
    }
});

// Get recent users
router.get('/users/recent', verifyToken, isAdmin, async (req, res) => {
    try {
        const { data: users, error } = await supabase
            .from('personality_profiles')
            .select('user_id, created_at, updated_at')
            .order('created_at', { ascending: false })
            .limit(10);

        if (error) throw error;

        res.json({ users });
    } catch (error) {
        console.error('Admin users error:', error);
        res.status(500).json({ error: 'Failed to fetch users' });
    }
});

// Get system health
router.get('/health', verifyToken, isAdmin, async (req, res) => {
    try {
        // Check database connection
        const { error: dbError } = await supabase.from('personality_profiles').select('count').limit(1);

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
router.post('/recover-stuck-users', verifyToken, isAdmin, requireAdminSecret, async (req, res) => {
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
router.post('/broadcast-email', verifyToken, isAdmin, requireAdminSecret, async (req, res) => {
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
router.post('/seed-proactive-greetings', verifyToken, isAdmin, requireAdminSecret, async (req, res) => {
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

export default router;
