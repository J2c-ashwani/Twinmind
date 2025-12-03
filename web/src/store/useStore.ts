import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface User {
    id: string;
    email: string;
    name?: string;
    age?: number;
    personality?: any;
    preferences?: any;
    is_pro?: boolean;
}

interface UserStore {
    user: User | null;
    isAuthenticated: boolean;
    setUser: (user: User) => void;
    logout: () => void;
}

interface Message {
    id: string;
    content: string;
    sender_type: 'user' | 'ai';
    created_at: string;
    conversation_id: string;
    voice_url?: string;
}

interface ChatStore {
    messages: Message[];
    currentConversationId: string | null;
    isTyping: boolean;
    addMessage: (message: Message) => void;
    setMessages: (messages: Message[]) => void;
    setTyping: (isTyping: boolean) => void;
    setConversationId: (id: string) => void;
}

interface Memory {
    id: string;
    title: string;
    description: string;
    memory_type: string;
    emotional_significance: number;
    tags: string[];
    is_favorite: boolean;
    created_at: string;
    referenced_count: number;
}

interface MemoryStore {
    memories: Memory[];
    selectedMemory: Memory | null;
    setMemories: (memories: Memory[]) => void;
    addMemory: (memory: Memory) => void;
    toggleFavorite: (memoryId: string) => void;
    setSelectedMemory: (memory: Memory | null) => void;
}

interface Achievement {
    id: string;
    achievement_type: string;
    achievement_name: string;
    description: string;
    rarity: 'common' | 'rare' | 'epic' | 'legendary';
    icon: string;
    points: number;
    unlocked_at: string;
}

interface Streak {
    id: string;
    streak_type: string;
    current_streak: number;
    longest_streak: number;
    last_activity_date: string;
}

interface Level {
    current_level: string;
    level_number: number;
    experience_points: number;
}

interface GamificationStore {
    achievements: Achievement[];
    streaks: Streak[];
    level: Level | null;
    setAchievements: (achievements: Achievement[]) => void;
    addAchievement: (achievement: Achievement) => void;
    setStreaks: (streaks: Streak[]) => void;
    setLevel: (level: Level) => void;
}

interface DailyChallenge {
    id: string;
    type: string;
    task: string;
    reward: number;
    completed: boolean;
    time_window?: string;
}

interface MoodEntry {
    id: string;
    mood: number; // -2 to +2
    note?: string;
    created_at: string;
}

interface DailyStore {
    challenges: DailyChallenge[];
    moodHistory: MoodEntry[];
    setChallenges: (challenges: DailyChallenge[]) => void;
    completeChallenge: (challengeId: string) => void;
    addMoodEntry: (entry: MoodEntry) => void;
}

// User Store
export const useUserStore = create<UserStore>()(
    persist(
        (set) => ({
            user: null,
            isAuthenticated: false,
            setUser: (user) => set({ user, isAuthenticated: true }),
            logout: () => set({ user: null, isAuthenticated: false }),
        }),
        {
            name: 'user-storage',
        }
    )
);

// Chat Store
export const useChatStore = create<ChatStore>((set) => ({
    messages: [],
    currentConversationId: null,
    isTyping: false,
    addMessage: (message) =>
        set((state) => ({ messages: [...state.messages, message] })),
    setMessages: (messages) => set({ messages }),
    setTyping: (isTyping) => set({ isTyping }),
    setConversationId: (id) => set({ currentConversationId: id }),
}));

// Memory Store
export const useMemoryStore = create<MemoryStore>((set) => ({
    memories: [],
    selectedMemory: null,
    setMemories: (memories) => set({ memories }),
    addMemory: (memory) =>
        set((state) => ({ memories: [memory, ...state.memories] })),
    toggleFavorite: (memoryId) =>
        set((state) => ({
            memories: state.memories.map((m) =>
                m.id === memoryId ? { ...m, is_favorite: !m.is_favorite } : m
            ),
        })),
    setSelectedMemory: (memory) => set({ selectedMemory: memory }),
}));

// Gamification Store
export const useGamificationStore = create<GamificationStore>((set) => ({
    achievements: [],
    streaks: [],
    level: null,
    setAchievements: (achievements) => set({ achievements }),
    addAchievement: (achievement) =>
        set((state) => ({ achievements: [...state.achievements, achievement] })),
    setStreaks: (streaks) => set({ streaks }),
    setLevel: (level) => set({ level }),
}));

// Daily Store
export const useDailyStore = create<DailyStore>((set) => ({
    challenges: [],
    moodHistory: [],
    setChallenges: (challenges) => set({ challenges }),
    completeChallenge: (challengeId) =>
        set((state) => ({
            challenges: state.challenges.map((c) =>
                c.id === challengeId ? { ...c, completed: true } : c
            ),
        })),
    addMoodEntry: (entry) =>
        set((state) => ({ moodHistory: [entry, ...state.moodHistory] })),
}));
