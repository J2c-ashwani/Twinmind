import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseKey);

// Real-time subscription for messages
export const subscribeToMessages = (
    conversationId: string,
    onMessage: (message: any) => void
) => {
    const channel = supabase
        .channel(`messages:${conversationId}`)
        .on(
            'postgres_changes',
            {
                event: 'INSERT',
                schema: 'public',
                table: 'messages',
                filter: `conversation_id=eq.${conversationId}`,
            },
            (payload) => {
                onMessage(payload.new);
            }
        )
        .subscribe();

    return () => {
        supabase.removeChannel(channel);
    };
};

// Real-time subscription for achievements
export const subscribeToAchievements = (
    userId: string,
    onAchievement: (achievement: any) => void
) => {
    const channel = supabase
        .channel(`achievements:${userId}`)
        .on(
            'postgres_changes',
            {
                event: 'INSERT',
                schema: 'public',
                table: 'user_achievements',
                filter: `user_id=eq.${userId}`,
            },
            (payload) => {
                onAchievement(payload.new);
            }
        )
        .subscribe();

    return () => {
        supabase.removeChannel(channel);
    };
};

// Real-time subscription for streaks
export const subscribeToStreaks = (
    userId: string,
    onStreakUpdate: (streak: any) => void
) => {
    const channel = supabase
        .channel(`streaks:${userId}`)
        .on(
            'postgres_changes',
            {
                event: 'UPDATE',
                schema: 'public',
                table: 'user_streaks',
                filter: `user_id=eq.${userId}`,
            },
            (payload) => {
                onStreakUpdate(payload.new);
            }
        )
        .subscribe();

    return () => {
        supabase.removeChannel(channel);
    };
};

// Real-time subscription for proactive messages
export const subscribeToProactiveMessages = (
    userId: string,
    onProactiveMessage: (message: any) => void
) => {
    const channel = supabase
        .channel(`proactive:${userId}`)
        .on(
            'postgres_changes',
            {
                event: 'INSERT',
                schema: 'public',
                table: 'proactive_messages',
                filter: `user_id=eq.${userId}`,
            },
            (payload) => {
                onProactiveMessage(payload.new);
            }
        )
        .subscribe();

    return () => {
        supabase.removeChannel(channel);
    };
};
