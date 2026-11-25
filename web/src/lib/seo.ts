import type { Metadata } from 'next'

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
    category: 'Getting Started' | 'How It Works' | 'Privacy & Safety' | 'Pricing & Access'
}

export const CORE_FAQS: FaqEntry[] = [
    {
        category: 'Getting Started',
        question: 'Why does TwinGenie start with a 35-question personality check?',
        answer:
            'Regular AI chatbots start from zero and tend to agree with whatever you say. Answering 35 quick questions across 5 short screens teaches TwinGenie your mindset, stress triggers, and communication style before your very first chat so it truly sounds and thinks like a personal twin.',
    },
    {
        category: 'How It Works',
        question: 'How is TwinGenie different from ChatGPT, Replika, or Character.ai?',
        answer:
            'ChatGPT is built as a general productivity assistant, while Replika and Character.ai center on companion bonding and character roleplay. TwinGenie calibrates a personal digital twin through 35 onboarding questions, remembers your ongoing goals and past chats, and lets you switch between Normal, Future, Honest, and Reflective modes for real-life clarity without flattery.',
    },
    {
        category: 'How It Works',
        question: 'What are the 4 Twin perspectives inside TwinGenie chat?',
        answer:
            'While chatting with your Twin, you can switch between Normal Twin (a balanced everyday mirror), Future Twin (your wiser self looking back 5 years from now), Honest Twin (direct reality checks with zero sugarcoating), and Reflective Twin (gentle emotional guidance and clarity).',
    },
    {
        category: 'Privacy & Safety',
        question: 'Are my private chats or voice notes used to train public AI models?',
        answer:
            'Never. Your reflections, personality profile, and voice messages belong strictly to your private account. TwinGenie never sells personal entries or uses your private chats to train public AI models.',
    },
    {
        category: 'Pricing & Access',
        question: 'Can I chat on both the Web app and the Android mobile app?',
        answer:
            'Yes. Sign in once with the same account and your Twin profile, chat history, voice reflections, Life Coach tracks, and Pro subscription stay synchronized across www.twingenie.app and the Google Play Android app (com.asmind.app).',
    },
    {
        category: 'Pricing & Access',
        question: 'Is TwinGenie free to start, and what does Pro cost?',
        answer:
            'Yes, you can create your Twin and start chatting for free ($0 forever), including the full 35-question setup, all 4 Twin perspectives, 10 daily text reflections, and 3 daily voice reflections. Pro Companion unlocks unlimited chat, voice, memory, and guided coaching for $5.99/month or $47.88/year USD (localized on Google Play, e.g. ₹499/month or ₹3,999/year in India).',
    },
    {
        category: 'Privacy & Safety',
        question: 'Can I delete my chat history or entire account anytime?',
        answer:
            'Yes. You stay in complete control: clear specific chats, memories, or voice logs at www.twingenie.app/delete-data, or permanently delete your entire account at www.twingenie.app/delete-account.',
    },
    {
        category: 'Privacy & Safety',
        question: 'Is TwinGenie a medical or therapy replacement?',
        answer:
            'No. TwinGenie is a personal reflection, clarity, and self-growth companion. It is not a substitute for licensed therapy, psychiatric care, or medical emergency services.',
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
                    alt: `${title} — TwinGenie AI Personal Digital Twin`,
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
