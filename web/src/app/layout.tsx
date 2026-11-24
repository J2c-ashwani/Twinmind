import type { Metadata } from 'next'
import { Plus_Jakarta_Sans, Instrument_Serif, JetBrains_Mono } from 'next/font/google'
import './globals.css'
import { PLAY_STORE_URL, SITE_URL } from '@/lib/seo'

const plusJakarta = Plus_Jakarta_Sans({
    subsets: ['latin'],
    variable: '--font-sans',
    display: 'swap',
})

const instrumentSerif = Instrument_Serif({
    subsets: ['latin'],
    weight: '400',
    style: ['normal', 'italic'],
    variable: '--font-serif',
    display: 'swap',
})

const jetbrainsMono = JetBrains_Mono({
    subsets: ['latin'],
    variable: '--font-mono',
    display: 'swap',
})

export const metadata: Metadata = {
    metadataBase: new URL(SITE_URL),
    title: {
        default: 'TwinGenie — Psychometric Digital Twin & Cognitive Reflection Platform',
        template: '%s | TwinGenie',
    },
    description:
        'TwinGenie calibrates a 35-trait psychometric digital twin with 1536-dim pgvector memory to deliver non-sycophantic cognitive reflection across Normal, Future, Honest, and Reflective modes.',
    keywords: [
        'AI digital twin',
        'psychometric AI digital twin',
        'personal cognitive intelligence',
        'Big Five personality AI',
        'non-sycophantic AI companion',
        'vector memory AI journal',
        'decision reflection platform',
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
        title: 'TwinGenie — Psychometric Digital Twin & Cognitive Reflection Platform',
        description:
            'Calibrate your 35-trait digital twin and examine complex life decisions across four calibrated perspectives.',
        images: [
            {
                url: `${SITE_URL}/og-image.png`,
                width: 1200,
                height: 630,
                alt: 'TwinGenie — 35-Trait Psychometric Digital Twin Platform',
            },
        ],
    },
    twitter: {
        card: 'summary_large_image',
        title: 'TwinGenie — Psychometric Digital Twin',
        description:
            'Four calibrated perspectives backed by a 35-trait personality engine and 1536-dim pgvector memory.',
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
    category: 'Lifestyle & Productivity',
    icons: {
        icon: '/logo.png',
        apple: '/icons/icon-192x192.png',
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
                '35-trait psychometric AI digital twin platform for structured cognitive reflection and personal clarity.',
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
                'Psychometric AI digital twin platform built on a 35-trait personality assessment, 1536-dim pgvector memory, and four calibrated reflection perspectives (Normal, Future, Honest, Reflective Coach).',
            url: SITE_URL,
            downloadUrl: `${SITE_URL}/download`,
            installUrl: PLAY_STORE_URL,
            screenshot: `${SITE_URL}/og-image.png`,
            featureList: [
                '35-Question 5-Stage Psychometric Calibration',
                'Four Cognitive Perspectives (Normal Twin, Future Twin, Honest Twin, Reflective Coach)',
                '1536-Dimensional PostgreSQL pgvector Episodic Memory',
                'Voice and Text Cognitive Reflection',
                'Multi-Day Guided Life Coach Tracks',
                'Row-Level Security (RLS) with Zero Public Model Training',
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
        <html
            lang="en"
            className={`${plusJakarta.variable} ${instrumentSerif.variable} ${jetbrainsMono.variable}`}
        >
            <head>
                <script
                    type="application/ld+json"
                    dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
                />
                <link rel="manifest" href="/manifest.json" />
                <link rel="apple-touch-icon" href="/icons/icon-192x192.png" />
                <link rel="alternate" type="text/plain" title="LLM Summary" href="/llms.txt" />
                <meta name="theme-color" content="#07080B" />
                <meta name="apple-mobile-web-app-capable" content="yes" />
                <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
            </head>
            <body className="min-h-screen bg-[#07080B] text-[#F4F2EC]">
                {children}
            </body>
        </html>
    )
}
