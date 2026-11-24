import type { Metadata } from 'next'

/**
 * Canonical origin must match the live HTTPS 308 destination (www.twingenie.app)
 * so canonicals, sitemaps, OpenGraph tags, and JSON-LD align with HTTP 200 URLs.
 */
function resolveCanonicalOrigin(): string {
    const raw = (process.env.NEXT_PUBLIC_WEB_APP_URL || 'https://www.twingenie.app').trim()
    if (raw === 'https://twingenie.app' || raw === 'https://twingenie.app/') {
        return 'https://www.twingenie.app'
    }
    return raw.replace(/\/+$/, '')
}

export const SITE_URL = resolveCanonicalOrigin()

export const PLAY_STORE_URL =
    process.env.NEXT_PUBLIC_PLAY_STORE_URL ||
    'https://play.google.com/store/apps/details?id=com.asmind.app'

export const INDEXNOW_KEY = '55df36df77a03c5f81101db8459d16d3'

export interface FaqEntry {
    question: string
    answer: string
    category: 'Methodology' | 'Architecture' | 'Privacy & Governance' | 'Access & Pricing'
}

/**
 * Shared AEO knowledge-base entries embedded in both visible SSR DOM
 * and schema.org FAQPage JSON-LD across `/` and `/faq`.
 */
export const CORE_FAQS: FaqEntry[] = [
    {
        category: 'Methodology',
        question: 'Why does TwinGenie onboarding start with a 35-question assessment?',
        answer:
            'Generic AI defaults to polite approval because it lacks behavioral baseline data. TwinGenie scores 35 psychometric questions across five structured screens covering Big Five dimensions, stress reactivity, decision speed, and conflict triggers before your first chat so responses reflect your actual temperament from day one.',
    },
    {
        category: 'Architecture',
        question: 'How is TwinGenie different from ChatGPT, Replika, or Pi?',
        answer:
            'General chatbots start from a blank prompt and optimize for agreeable conversational flow. TwinGenie pairs a required 35-trait personality calibration with isolated 1536-dimensional PostgreSQL pgvector memory and four explicit cognitive modes—Normal Twin, Future Twin, Honest Twin, and Reflective Coach—designed to counter cognitive blindspots rather than flatter excuses.',
    },
    {
        category: 'Privacy & Governance',
        question: 'Is my private journal or reflection data used to train AI models?',
        answer:
            'Never. User conversations, vector embeddings, and voice reflections are isolated per user via Supabase PostgreSQL Row-Level Security (RLS), encrypted over TLS 1.3, processed under zero-training commercial API terms, and never sold or used to train public AI foundation models.',
    },
    {
        category: 'Access & Pricing',
        question: 'Can I use both the Web app and the Google Play Android app with one account?',
        answer:
            'Yes. Your account, 35-trait psychometric profile, 1536-dim episodic memory, coaching progress, and Google Play Pro subscription stay synchronized across www.twingenie.app and the Android app (com.asmind.app).',
    },
    {
        category: 'Methodology',
        question: 'What are the 4 Twin perspectives in TwinGenie?',
        answer:
            'Every dilemma can be inspected through Normal Twin (calibrated everyday reflection), Future Twin (5-year long-horizon consequence lens), Honest Twin (zero-sycophancy reality check calling out avoidance), and Reflective Coach (calm Socratic emotional inquiry).',
    },
    {
        category: 'Access & Pricing',
        question: 'How much does TwinGenie cost?',
        answer:
            'TwinGenie Free Starter costs $0 forever and includes the complete 35-question calibration, all four cognitive perspectives, 10 daily text reflections, 3 daily voice reflections, and mood tracking. Pro Companion unlocks unlimited reflections, unlimited vector memory, and all guided Life Coach tracks for $5.99/month or $47.88/year USD (localized on Google Play, e.g. ₹499/month or ₹3,999/year in India).',
    },
    {
        category: 'Privacy & Governance',
        question: 'Can I delete specific chat memories or my entire account?',
        answer:
            'Yes. TwinGenie provides two self-serve governance portals: granular deletion of chat logs, semantic vector memories, voice logs, or profile data at www.twingenie.app/delete-data, and immediate full account removal at www.twingenie.app/delete-account.',
    },
    {
        category: 'Privacy & Governance',
        question: 'Is TwinGenie a medical or clinical therapy service?',
        answer:
            'No. TwinGenie is an AI personal reflection, clarity, and structured self-coaching companion. It is not a medical device, clinical healthcare provider, or substitute for licensed therapy, and includes non-clinical crisis-safety guardrails.',
    },
]

interface PageMetaOptions {
    title: string
    description: string
    path: string
    keywords?: string[]
    canonicalPath?: string
    index?: boolean
    type?: 'website' | 'article'
}

export function buildPageMetadata({
    title,
    description,
    path,
    keywords,
    canonicalPath,
    index = true,
    type = 'website',
}: PageMetaOptions): Metadata {
    const cleanPath = path.startsWith('/') ? path : `/${path}`
    const canonical = `${SITE_URL}${canonicalPath ?? cleanPath}`
    const url = `${SITE_URL}${cleanPath}`

    return {
        title,
        description,
        ...(keywords ? { keywords } : {}),
        alternates: {
            canonical,
        },
        robots: index
            ? {
                  index: true,
                  follow: true,
                  googleBot: {
                      index: true,
                      follow: true,
                      'max-video-preview': -1,
                      'max-image-preview': 'large',
                      'max-snippet': -1,
                  },
              }
            : {
                  index: false,
                  follow: true,
              },
        openGraph: {
            type,
            locale: 'en_US',
            url,
            siteName: 'TwinGenie',
            title: `${title} | TwinGenie`,
            description,
            images: [
                {
                    url: `${SITE_URL}/og-image.png`,
                    width: 1200,
                    height: 630,
                    alt: `${title} — TwinGenie Psychometric Digital Twin`,
                },
            ],
        },
        twitter: {
            card: 'summary_large_image',
            title: `${title} | TwinGenie`,
            description,
            images: [`${SITE_URL}/og-image.png`],
            creator: '@twingenieapp',
        },
    }
}

export function buildFaqJsonLd(faqs: FaqEntry[] = CORE_FAQS) {
    return {
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        mainEntity: faqs.map((item) => ({
            '@type': 'Question',
            name: item.question,
            acceptedAnswer: {
                '@type': 'Answer',
                text: item.answer,
            },
        })),
    }
}
