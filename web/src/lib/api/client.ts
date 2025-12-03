const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

class ApiClient {
    private baseUrl: string;
    private token: string | null = null;

    constructor() {
        this.baseUrl = API_URL;
    }

    setToken(token: string) {
        this.token = token;
    }

    private async request<T>(
        endpoint: string,
        options: RequestInit = {}
    ): Promise<T> {
        const headers: HeadersInit = {
            'Content-Type': 'application/json',
            ...(this.token && { Authorization: `Bearer ${this.token}` }),
            ...options.headers,
        };

        const response = await fetch(`${this.baseUrl}${endpoint}`, {
            ...options,
            headers,
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            const errorMessage = errorData.error || errorData.message || `API request failed (${response.status})`;
            throw new Error(errorMessage);
        }

        return response.json();
    }

    async getConversations() {
        return this.request('/api/conversations');
    }

    async createConversation(title?: string) {
        return this.request('/api/conversations', {
            method: 'POST',
            body: JSON.stringify({ title }),
        });
    }

    async getConversationMessages(id: string) {
        return this.request(`/api/conversations/${id}`);
    }

    async deleteConversation(id: string) {
        return this.request(`/api/conversations/${id}`, {
            method: 'DELETE',
        });
    }

    async sendMessage(conversationId: string | null, content: string, mode: string = 'normal') {
        return this.request('/api/chat/message', {
            method: 'POST',
            body: JSON.stringify({
                message: content,
                mode,
                conversation_id: conversationId
            }),
        });
    }

    async getChatHistory(limit?: number) {
        return this.request(`/api/chat/history?limit=${limit || 50}`);
    }

    async clearChatHistory() {
        return this.request('/api/chat/history', {
            method: 'DELETE',
        });
    }

    async getGamificationStatus() {
        return this.request('/api/gamification/status');
    }

    // Memory endpoints
    async getMemories(options?: { type?: string; limit?: number }) {
        const params = new URLSearchParams(options as any);
        return this.request(`/api/memory?${params}`);
    }

    async createMemory(data: {
        type: string;
        title: string;
        description: string;
        significance: number;
        tags?: string[];
    }) {
        return this.request('/api/memory', {
            method: 'POST',
            body: JSON.stringify(data),
        });
    }

    async toggleMemoryFavorite(memoryId: string) {
        return this.request(`/api/memory/${memoryId}/favorite`, {
            method: 'POST',
        });
    }

    async getMemoryTimeline(limit?: number) {
        return this.request(`/api/memory/timeline?limit=${limit || 50}`);
    }

    // Gamification endpoints
    async getGamificationStatus() {
        return this.request('/api/gamification/status');
    }

    async getAchievements() {
        return this.request('/api/gamification/achievements');
    }

    async getStreaks() {
        return this.request('/api/gamification/streaks');
    }

    async getLevel() {
        return this.request('/api/gamification/level');
    }

    // Daily endpoints
    async getDailyChallenges() {
        return this.request('/api/daily/challenges');
    }

    async completeChallenge(challengeId: string) {
        return this.request(`/api/daily/challenges/${challengeId}/complete`, {
            method: 'POST',
        });
    }

    async submitMoodCheckIn(mood: number, note?: string) {
        return this.request('/api/daily/mood', {
            method: 'POST',
            body: JSON.stringify({ mood, note }),
        });
    }

    async getMoodHistory(days?: number) {
        return this.request(`/api/daily/mood/history?days=${days || 30}`);
    }

    // Insights endpoints
    async getWeeklyInsights() {
        return this.request('/api/insights/weekly');
    }

    async getMonthlyInsights() {
        return this.request('/api/insights/monthly');
    }

    async getEvolutionTimeline(days?: number) {
        return this.request(`/api/insights/evolution?days=${days || 30}`);
    }

    // Referral endpoints
    async getReferralCode() {
        return this.request('/api/referral/code');
    }

    async getReferralStats() {
        return this.request('/api/referral/stats');
    }

    async submitReferral(code: string) {
        return this.request('/api/referral/submit', {
            method: 'POST',
            body: JSON.stringify({ code }),
        });
    }

    // Personality endpoints
    async getPersonalityQuestions() {
        return this.request('/api/personality/questions');
    }

    async submitPersonalityAnswers(answers: any[]) {
        return this.request('/api/personality/submit-answers', {
            method: 'POST',
            body: JSON.stringify({ answers }),
        });
    }

    async generatePersonality() {
        return this.request('/api/personality/generate', {
            method: 'POST',
        });
    }

    async getPersonalityProfile() {
        return this.request('/api/personality/profile');
    }

    async regeneratePersonality() {
        return this.request('/api/personality/regenerate', {
            method: 'POST',
        });
    }

    // Chat modes
    async getChatModes() {
        return this.request('/api/chat/modes');
    }

    // Memory list (in addition to existing memory endpoints)
    async getMemoryList() {
        return this.request('/api/memory/memories');
    }

    async getMemoryCount() {
        return this.request('/api/memory/count');
    }

    // Conversation update
    async updateConversationTitle(id: string, title: string) {
        return this.request(`/api/conversations/${id}`, {
            method: 'PATCH',
            body: JSON.stringify({ title }),
        });
    }

    // Subscription endpoints
    async getSubscriptionStatus() {
        return this.request('/api/subscription/status');
    }

    async createCheckoutSession(tier: string) {
        return this.request('/api/subscription/create-checkout', {
            method: 'POST',
            body: JSON.stringify({ tier }),
        });
    }

    async cancelSubscription() {
        return this.request('/api/subscription/cancel', {
            method: 'POST',
        });
    }

    // Pricing endpoints
    async getPricingPlans() {
        return this.request('/api/pricing/');
    }

    async getAllPricing() {
        return this.request('/api/pricing/all');
    }

    async comparePricing() {
        return this.request('/api/pricing/compare');
    }

    // Growth Circles
    async createCircle(name?: string) {
        return this.request('/api/circles', {
            method: 'POST',
            body: JSON.stringify({ name }),
        });
    }

    async getMyCircle() {
        return this.request('/api/circles/my');
    }

    async getCircleProgress(circleId: string) {
        return this.request(`/api/circles/${circleId}/progress`);
    }

    async createCircleInvitation(circleId: string, email?: string) {
        return this.request(`/api/circles/${circleId}/invite`, {
            method: 'POST',
            body: JSON.stringify({ email }),
        });
    }

    async joinCircle(code: string) {
        return this.request(`/api/circles/join/${code}`, {
            method: 'POST',
        });
    }

    async previewCircle(code: string) {
        return this.request(`/api/circles/preview/${code}`);
    }

    async leaveCircle(circleId: string) {
        return this.request(`/api/circles/${circleId}/leave`, {
            method: 'POST',
        });
    }

    async getCircleMilestones(circleId: string) {
        return this.request(`/api/circles/${circleId}/milestones`);
    }

    // Streak Freeze
    async getFreezeStatus() {
        return this.request('/api/gamification/freeze/status');
    }

    async purchaseStreakFreeze(purchaseType: 'xp' | 'premium' = 'xp') {
        return this.request('/api/gamification/freeze/purchase', {
            method: 'POST',
            body: JSON.stringify({ purchaseType }),
        });
    }

    // Motivation Cards
    async getWeeklyMotivationCard() {
        return this.request('/api/motivation-cards/weekly');
    }

    async getMotivationCardHistory(limit?: number) {
        return this.request(`/api/motivation-cards/history?limit=${limit || 10}`);
    }

    async generateMotivationCard() {
        return this.request('/api/motivation-cards/generate', {
            method: 'POST',
        });
    }

    async markCardShared(cardId: string, platform: string = 'native') {
        return this.request(`/api/motivation-cards/${cardId}/share`, {
            method: 'POST',
            body: JSON.stringify({ platform }),
        });
    }

    // Growth Story
    async getYearCalendar(year?: number) {
        const yearParam = year || new Date().getFullYear();
        return this.request(`/api/growth-story/calendar/${yearParam}`);
    }

    async getGrowthInsights(period: 'year' | 'month' | '90days' = 'year') {
        return this.request(`/api/growth-story/insights/${period}`);
    }

    // Twin Match
    async findUserForMatch(identifier: string) {
        return this.request('/api/twin-match/find', {
            method: 'POST',
            body: JSON.stringify({ identifier }),
        });
    }

    async compareTwins(identifier: string) {
        return this.request('/api/twin-match/compare', {
            method: 'POST',
            body: JSON.stringify({ identifier }),
        });
    }

    async getTwinMatch(matchId: string) {
        return this.request(`/api/twin-match/${matchId}`);
    }

    // Proactive messages
    async getProactiveMessages() {
        return this.request('/api/proactive/messages');
    }

    async markProactiveMessageRead(messageId: string) {
        return this.request(`/api/proactive/messages/${messageId}/read`, {
            method: 'POST',
        });
    }
}

export const apiClient = new ApiClient();
