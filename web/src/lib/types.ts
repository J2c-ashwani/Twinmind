export interface PersonalityQuestion {
    id: number
    question_text: string
    category: string
    subcategory: string | null
    question_order: number
    question_type: string // 'single_choice', 'multiple_choice', 'text'
    options_json: string[] | null // Array of predefined options
    screen_number: number // Which screen this question appears on
    allow_other: boolean // Allow "Other" option
}

export interface PersonalityAnswer {
    question_id: number
    selected_option?: string // Selected from options_json or "Other"
    answer_text?: string // Free text for "Other" or text questions
    answer_score?: number
}

export interface BigFiveTraits {
    openness: number
    conscientiousness: number
    extraversion: number
    agreeableness: number
    emotional_stability: number
}

export interface PersonalityJSON {
    big_five: BigFiveTraits
    strengths: string[]
    weaknesses: string[]
    emotional_patterns: {
        typical_reactions: string
        stress_response: string
        triggers: string[]
        regulation_style: string
    }
    communication_style: {
        tone: string
        formality: string
        directness: string
        expressiveness: string
        conflict_handling: string
    }
    decision_making: {
        style: string
        risk_tolerance: string
        speed: string
        information_needs: string
    }
    relationship_patterns: {
        social_needs: string
        attachment_style: string
        boundaries: string
        connection_depth: string
    }
    core_values: string[]
    motivations: string[]
    thinking_patterns: {
        abstraction: string
        scope: string
        creativity: string
        outlook: string
    }
    summary: string
}

export interface PersonalityProfile {
    user_id: string
    personality_json: PersonalityJSON
    twin_name: string
    twin_summary: string
    created_at: string
    updated_at: string
}

export interface ChatMessage {
    id: string
    user_id: string
    message: string
    sender: 'user' | 'ai'
    mode: string
    created_at: string
    audio_url?: string
}

export interface TwinMode {
    id: string
    name: string
    description: string
    available: boolean
    requiresPro?: boolean
}

export interface Subscription {
    id?: string
    user_id: string
    plan_type: 'free' | 'pro'
    status: 'active' | 'cancelled' | 'expired' | 'trial'
    current_period_end?: string
}

export interface User {
    id: string
    full_name: string
    email: string
    country?: string
    avatar_url?: string
}
