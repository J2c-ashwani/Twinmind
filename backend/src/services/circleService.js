import logger from '../config/logger.js';
import { supabaseAdmin } from '../config/supabase.js';

/**
 * Circle Service
 * Manages growth circles, invitations, and collective progress
 */

/**
 * Create a new growth circle
 */
export async function createCircle(userId, name = 'My Growth Circle') {
    try {
        // Check if user already has a circle
        const { data: existing } = await supabaseAdmin
            .from('circle_members')
            .select('circle_id')
            .eq('user_id', userId)
            .eq('is_active', true)
            .single();

        if (existing) {
            throw new Error('User already belongs to a circle');
        }

        // Create circle
        const { data: circle, error: circleError } = await supabaseAdmin
            .from('growth_circles')
            .insert({
                name,
                created_by: userId,
            })
            .select()
            .single();

        if (circleError) throw circleError;

        // Add creator as first member
        const { error: memberError } = await supabaseAdmin
            .from('circle_members')
            .insert({
                circle_id: circle.id,
                user_id: userId,
                role: 'creator',
            });

        if (memberError) throw memberError;

        // Log activity
        await logCircleActivity(circle.id, userId, 'circle_created');

        return circle;
    } catch (error) {
        logger.error('Error creating circle:', error);
        throw error;
    }
}

/**
 * Get user's circle
 */
export async function getUserCircle(userId) {
    try {
        const { data: membership } = await supabaseAdmin
            .from('circle_members')
            .select('circle_id, role')
            .eq('user_id', userId)
            .eq('is_active', true)
            .single();

        if (!membership) {
            return null;
        }

        const { data: circle } = await supabaseAdmin
            .from('growth_circles')
            .select('*')
            .eq('id', membership.circle_id)
            .single();

        // Get members count
        const { count } = await supabaseAdmin
            .from('circle_members')
            .select('*', { count: 'exact', head: true })
            .eq('circle_id', circle.id)
            .eq('is_active', true);

        return {
            ...circle,
            member_count: count,
            user_role: membership.role,
        };
    } catch (error) {
        logger.error('Error getting user circle:', error);
        return null;
    }
}

/**
 * Generate invitation code
 */
export async function createInvitation(circleId, userId, email = null) {
    try {
        // Verify user is circle creator
        const { data: member } = await supabaseAdmin
            .from('circle_members')
            .select('role')
            .eq('circle_id', circleId)
            .eq('user_id', userId)
            .single();

        if (!member || member.role !== 'creator') {
            throw new Error('Only circle creator can invite members');
        }

        // Check circle capacity
        const { count } = await supabaseAdmin
            .from('circle_members')
            .select('*', { count: 'exact', head: true })
            .eq('circle_id', circleId)
            .eq('is_active', true);

        const { data: circle } = await supabaseAdmin
            .from('growth_circles')
            .select('max_members')
            .eq('id', circleId)
            .single();

        if (count >= circle.max_members) {
            throw new Error('Circle is full');
        }

        // Generate unique code
        const { data: codeResult } = await supabaseAdmin.rpc('generate_invitation_code');
        const code = codeResult;

        // Create invitation
        const { data: invitation, error } = await supabaseAdmin
            .from('circle_invitations')
            .insert({
                circle_id: circleId,
                invited_by: userId,
                invitation_code: code,
                email,
            })
            .select()
            .single();

        if (error) throw error;

        await logCircleActivity(circleId, userId, 'invitation_created', { code });

        return invitation;
    } catch (error) {
        logger.error('Error creating invitation:', error);
        throw error;
    }
}

/**
 * Join circle via invitation code
 */
export async function joinCircle(userId, invitationCode) {
    try {
        // Check if user already in a circle
        const { data: existing } = await supabaseAdmin
            .from('circle_members')
            .select('circle_id')
            .eq('user_id', userId)
            .eq('is_active', true)
            .single();

        if (existing) {
            throw new Error('Already in a circle. Leave current circle first.');
        }

        // Get invitation
        const { data: invitation } = await supabaseAdmin
            .from('circle_invitations')
            .select('*, growth_circles(*)')
            .eq('invitation_code', invitationCode.toUpperCase())
            .eq('status', 'pending')
            .single();

        if (!invitation) {
            throw new Error('Invalid or expired invitation code');
        }

        // Check expiration
        if (new Date(invitation.expires_at) < new Date()) {
            await supabaseAdmin
                .from('circle_invitations')
                .update({ status: 'expired' })
                .eq('id', invitation.id);
            throw new Error('Invitation has expired');
        }

        // Check circle capacity
        const { count } = await supabaseAdmin
            .from('circle_members')
            .select('*', { count: 'exact', head: true })
            .eq('circle_id', invitation.circle_id)
            .eq('is_active', true);

        if (count >= invitation.growth_circles.max_members) {
            throw new Error('Circle is full');
        }

        // Add member
        const { error: memberError } = await supabaseAdmin
            .from('circle_members')
            .insert({
                circle_id: invitation.circle_id,
                user_id: userId,
                role: 'member',
            });

        if (memberError) throw memberError;

        // Update invitation status
        await supabaseAdmin
            .from('circle_invitations')
            .update({ status: 'accepted', accepted_at: new Date().toISOString() })
            .eq('id', invitation.id);

        await logCircleActivity(invitation.circle_id, userId, 'member_joined');

        return invitation.growth_circles;
    } catch (error) {
        logger.error('Error joining circle:', error);
        throw error;
    }
}

/**
 * Calculate collective streak
 */
export async function calculateCollectiveStreak(circleId) {
    try {
        // Get all active members
        const { data: members } = await supabaseAdmin
            .from('circle_members')
            .select('user_id')
            .eq('circle_id', circleId)
            .eq('is_active', true);

        if (!members || members.length === 0) {
            return 0;
        }

        // Get streaks for all members
        const streakPromises = members.map(async (member) => {
            const { data: streak } = await supabaseAdmin
                .from('user_streaks')
                .select('current_streak, last_activity_date')
                .eq('user_id', member.user_id)
                .eq('streak_type', 'daily_checkin')
                .single();

            // Check if streak is current (within last 2 days)
            if (streak) {
                const daysSince = Math.floor(
                    (new Date() - new Date(streak.last_activity_date)) / (1000 * 60 * 60 * 24)
                );
                return daysSince <= 1 ? streak.current_streak : 0;
            }
            return 0;
        });

        const streaks = await Promise.all(streakPromises);

        // Average of all member streaks (rounded down)
        const collectiveStreak = Math.floor(
            streaks.reduce((sum, s) => sum + s, 0) / streaks.length
        );

        // Update circle
        await supabaseAdmin
            .from('growth_circles')
            .update({ collective_streak: collectiveStreak })
            .eq('id', circleId);

        return collectiveStreak;
    } catch (error) {
        logger.error('Error calculating collective streak:', error);
        return 0;
    }
}

/**
 * Check and unlock milestones
 */
export async function checkAndUnlockMilestones(circleId) {
    try {
        const streak = await calculateCollectiveStreak(circleId);
        const milestones = [];

        const milestoneThresholds = [
            { type: '10_days', days: 10, reward: { feature: 'circle_insights', name: 'Circle Insights' } },
            { type: '30_days', days: 30, reward: { feature: 'wisdom_twin', name: 'Wisdom Twin Mode' } },
            { type: '90_days', days: 90, reward: { feature: 'circle_challenges', name: 'Circle Challenges' } },
        ];

        for (const milestone of milestoneThresholds) {
            if (streak >= milestone.days) {
                // Check if already unlocked
                const { data: existing } = await supabaseAdmin
                    .from('circle_milestones')
                    .select('id')
                    .eq('circle_id', circleId)
                    .eq('milestone_type', milestone.type)
                    .single();

                if (!existing) {
                    // Unlock milestone
                    const { data } = await supabaseAdmin
                        .from('circle_milestones')
                        .insert({
                            circle_id: circleId,
                            milestone_type: milestone.type,
                            reward: milestone.reward,
                        })
                        .select()
                        .single();

                    milestones.push(data);
                    await logCircleActivity(circleId, null, 'milestone_unlocked', { milestone: milestone.type });
                }
            }
        }

        return milestones;
    } catch (error) {
        logger.error('Error checking milestones:', error);
        return [];
    }
}

/**
 * Get circle progress and stats
 */
export async function getCircleProgress(circleId) {
    try {
        const [circle, members, milestones] = await Promise.all([
            supabaseAdmin.from('growth_circles').select('*').eq('id', circleId).single(),
            supabaseAdmin.from('circle_members').select('*').eq('circle_id', circleId).eq('is_active', true),
            supabaseAdmin.from('circle_milestones').select('*').eq('circle_id', circleId),
        ]);

        const collectiveStreak = await calculateCollectiveStreak(circleId);

        return {
            circle: circle.data,
            member_count: members.data?.length || 0,
            collective_streak: collectiveStreak,
            milestones: milestones.data || [],
            next_milestone: collectiveStreak < 10 ? 10 : collectiveStreak < 30 ? 30 : 90,
        };
    } catch (error) {
        logger.error('Error getting circle progress:', error);
        throw error;
    }
}

/**
 * Leave circle
 */
export async function leaveCircle(userId, circleId) {
    try {
        // Mark membership as inactive
        await supabaseAdmin
            .from('circle_members')
            .update({ is_active: false })
            .eq('circle_id', circleId)
            .eq('user_id', userId);

        await logCircleActivity(circleId, userId, 'member_left');

        // Check if circle is empty
        const { count } = await supabaseAdmin
            .from('circle_members')
            .select('*', { count: 'exact', head: true })
            .eq('circle_id', circleId)
            .eq('is_active', true);

        if (count === 0) {
            // Deactivate circle
            await supabaseAdmin
                .from('growth_circles')
                .update({ is_active: false })
                .eq('id', circleId);
        }

        return { success: true };
    } catch (error) {
        logger.error('Error leaving circle:', error);
        throw error;
    }
}

/**
 * Log circle activity
 */
async function logCircleActivity(circleId, userId, activityType, metadata = {}) {
    try {
        await supabaseAdmin.from('circle_activity').insert({
            circle_id: circleId,
            user_id: userId,
            activity_type: activityType,
            metadata,
        });
    } catch (error) {
        logger.error('Error logging circle activity:', error);
    }
}

export default {
    createCircle,
    getUserCircle,
    createInvitation,
    joinCircle,
    calculateCollectiveStreak,
    checkAndUnlockMilestones,
    getCircleProgress,
    leaveCircle,
};
