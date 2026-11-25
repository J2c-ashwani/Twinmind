import type { Metadata } from 'next'
import './globals.css'
import { PLAY_STORE_URL, SITE_URL } from '@/lib/seo'

export const metadata: Metadata = {
    metadataBase: new URL(SITE_URL),
    title: {
        default: 'TwinGenie - AI Personal Digital Twin for Reflection & Growth',
        template: '%s | TwinGenie',
    },
    description:
        'TwinGenie is your personal AI digital twin that helps you examine assumptions, explore 4 distinct perspectives (Normal, Future, Honest, Reflective), and chat privately with long-term memory.',
    keywords: [
        'AI digital twin',
        'personal growth AI',
        'AI companion app',
        'AI chat that remembers you',
        'non-sycophantic AI companion',
        'mental wellness',
        'self-reflection app',
        'AI life coach',
        'TwinGenie',
    ],
    authors: [{ name: 'Ashwani Kumar', url: SITE_URL }],
    creator: 'TwinGenie',
    publisher: 'TwinGenie',
    openGraph: {
        type: 'website',
        locale: 'en_US',
        url: SITE_URL,
        siteName: 'TwinGenie',
        title: 'TwinGenie - AI Personal Digital Twin for Reflection & Growth',
        description:
            'The AI that does not just tell you what you want to hear. Create your Twin or sign in to chat across 4 perspectives.',
        images: [
            {
                url: `${SITE_URL}/og-image.png`,
                width: 1200,
                height: 630,
                alt: 'TwinGenie - AI Personal Digital Twin',
            },
        ],
    },
    twitter: {
        card: 'summary_large_image',
        title: 'TwinGenie - AI Personal Digital Twin',
        description: 'Less validation. More self-understanding. Chat and grow with your AI twin.',
        images: [`${SITE_URL}/og-image.png`],
        creator: '@twingenieapp',
    },
    robots: {
        index: true,
        follow: true,
        googleBot: {
            index: true,
            follow: true,
            'max-video-preview': -1,
            'max-image-preview': 'large',
            'max-snippet': -1,
        },
    },
    applicationName: 'TwinGenie',
    category: 'Productivity & Lifestyle',
    icons: {
        icon: '/logo.png',
        apple: '/logo.png',
    },
    manifest: '/manifest.json',
}

const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
        {
            '@type': 'Organization',
            '@id': `${SITE_URL}/#organization`,
            name: 'TwinGenie',
            url: SITE_URL,
            logo: {
                '@type': 'ImageObject',
                url: `${SITE_URL}/logo.png`,
            },
            founder: {
                '@type': 'Person',
                name: 'Ashwani Kumar',
                email: 'ashwani@twingenie.app',
            },
            contactPoint: {
                '@type': 'ContactPoint',
                email: 'support@twingenie.app',
                contactType: 'customer support',
                availableLanguage: ['English'],
            },
            publishingPrinciples: `${SITE_URL}/privacy`,
            sameAs: [PLAY_STORE_URL],
        },
        {
            '@type': 'WebSite',
            '@id': `${SITE_URL}/#website`,
            url: SITE_URL,
            name: 'TwinGenie',
            description:
                'AI personal digital twin platform for honest self-reflection, 4-perspective chat, and personal growth.',
            inLanguage: 'en-US',
            publisher: {
                '@id': `${SITE_URL}/#organization`,
            },
        },
        {
            '@type': 'SoftwareApplication',
            '@id': `${SITE_URL}/#application`,
            name: 'TwinGenie',
            applicationCategory: 'LifestyleApplication',
            operatingSystem: 'Web, Android (Google Play)',
            description:
                'AI-powered personal digital twin companion built from a 35-question personality profile with long-term memory and four perspectives (Normal, Future, Honest, Reflective).',
            url: SITE_URL,
            downloadUrl: `${SITE_URL}/download`,
            installUrl: PLAY_STORE_URL,
            screenshot: `${SITE_URL}/og-image.png`,
            featureList: [
                '35-Question Personality Calibration',
                '4 Chat Perspectives (Normal, Future, Honest, Reflective)',
                'Long-Term Conversational Memory',
                'Voice and Text Chat',
                'Guided Life Coach Programs',
                'Private Account Isolation with Zero Public Model Training',
            ],
            publisher: {
                '@id': `${SITE_URL}/#organization`,
            },
            offers: [
                {
                    '@type': 'Offer',
                    name: 'Free Starter',
                    price: '0',
                    priceCurrency: 'USD',
                    url: `${SITE_URL}/onboarding`,
                },
                {
                    '@type': 'Offer',
                    name: 'Pro Companion Monthly',
                    price: '5.99',
                    priceCurrency: 'USD',
                    url: `${SITE_URL}/subscription`,
                },
                {
                    '@type': 'Offer',
                    name: 'Annual Pass',
                    price: '47.88',
                    priceCurrency: 'USD',
                    url: `${SITE_URL}/subscription`,
                },
            ],
        },
    ],
}

export default function RootLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return (
        <html lang="en">
            <head>
                <script
                    type="application/ld+json"
                    dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
                />
                <link rel="manifest" href="/manifest.json" />
                <link rel="apple-touch-icon" href="/icons/icon-192x192.png" />
                <link rel="alternate" type="text/plain" title="LLM Summary" href="/llms.txt" />
                <meta name="theme-color" content="#9333EA" />
                <meta name="apple-mobile-web-app-capable" content="yes" />
                <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
            </head>
            <body>
                {children}
            </body>
        </html>
    )
}
