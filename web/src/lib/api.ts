const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001'

interface ApiOptions {
    method?: string
    body?: any
    token?: string
}

async function apiCall(endpoint: string, options: ApiOptions = {}) {
    const { method = 'GET', body, token } = options

    const headers: HeadersInit = {
        'Content-Type': 'application/json',
    }

    if (token) {
        headers['Authorization'] = `Bearer ${token}`
    }

    const config: RequestInit = {
        method,
        headers,
    }

    if (body) {
        config.body = JSON.stringify(body)
    }

    const response = await fetch(`${API_URL}${endpoint}`, config)

    if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Request failed' }))
        throw new Error(error.error || `API error: ${response.status}`)
    }

    return response.json()
}

export const api = {
    // Personality endpoints
    getQuestions: () => apiCall('/api/personality/questions'),

    submitAnswers: (answers: any[], token: string) =>
        apiCall('/api/personality/submit-answers', {
            method: 'POST',
            body: { answers },
            token,
        }),

    generatePersonality: (token: string) =>
        apiCall('/api/personality/generate', {
            method: 'POST',
            body: {},
            token,
        }),

    getPersonalityProfile: (token: string) =>
        apiCall('/api/personality/profile', { token }),

    regeneratePersonality: (token: string) =>
        apiCall('/api/personality/regenerate', {
            method: 'POST',
            body: {},
            token,
        }),

    // Chat endpoints
    sendVoiceMessage: async (conversationId: string | null, audioBlob: Blob, mode: string, token: string) => {
        const formData = new FormData();
        formData.append('audio', audioBlob, 'voice.webm');
        formData.append('mode', mode);
        if (conversationId) formData.append('conversationId', conversationId);

        const response = await fetch(`${API_URL}/api/voice/message`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`
            },
            body: formData
        });

        if (!response.ok) {
            const error = await response.json().catch(() => ({ error: 'Request failed' }));
            throw new Error(error.error || `API error: ${response.status}`);
        }
        return response.json();
    },

    sendMessage: (message: string, mode: string, token: string, conversationId?: string) =>
        apiCall('/api/chat/message', {
            method: 'POST',
            body: { message, mode, conversation_id: conversationId },
            token,
        }),

    getChatHistory: (token: string, mode?: string, conversationId?: string) => {
        let url = `/api/chat/history?limit=100`;
        if (mode) url += `&mode=${mode}`;
        if (conversationId) url += `&conversation_id=${conversationId}`;
        return apiCall(url, { token });
    },

    clearChatHistory: (token: string, mode?: string) =>
        apiCall(`/api/chat/history${mode ? `?mode=${mode}` : ''}`, {
            method: 'DELETE',
            token,
        }),

    getModes: (token: string) =>
        apiCall('/api/chat/modes', { token }),

    // Subscription endpoints
    getSubscriptionStatus: (token: string) =>
        apiCall('/api/subscription/status', { token }),

    createCheckoutSession: (priceId: string, planType: string, token: string) =>
        apiCall('/api/subscription/create-checkout', {
            method: 'POST',
            body: { priceId, planType },
            token,
        }),

    cancelSubscription: (token: string) =>
        apiCall('/api/subscription/cancel', {
            method: 'POST',
            body: {},
            token,
        }),

    // Memory endpoints
    getMemoryCount: (token: string) =>
        apiCall('/api/memory/count', { token }),

    // Gamification endpoints
    getAchievements: (token: string) =>
        apiCall('/api/gamification/achievements', { token }),

    getDailyChallenges: (token: string) =>
        apiCall('/api/daily/challenges', { token }),

    completeChallenge: (challengeId: string, token: string) =>
        apiCall(`/api/daily/challenges/${challengeId}/complete`, {
            method: 'POST',
            body: {},
            token,
        }),

    getMemories: (token: string) =>
        apiCall('/api/memory/timeline', { token }),

    toggleFavoriteMemory: (memoryId: string, token: string) =>
        apiCall(`/api/memory/${memoryId}/favorite`, {
            method: 'POST',
            body: {},
            token,
        }),

    getStreak: (token: string) =>
        apiCall('/api/gamification/streaks', { token }),

    getMoodHistory: (token: string) =>
        apiCall('/api/daily/mood/history', { token }),

    findUserForMatch: (username: string, token: string) =>
        apiCall(`/api/twin-match/find?username=${encodeURIComponent(username)}`, { token }),

    compareTwins: (otherUserId: string, token: string) =>
        apiCall('/api/twin-match/compare', {
            method: 'POST',
            body: { otherUserId },
            token,
        }),
}

export default api
