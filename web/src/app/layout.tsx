import type { Metadata } from 'next'
import { Plus_Jakarta_Sans, Instrument_Serif, JetBrains_Mono } from 'next/font/google'
import './globals.css'

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
    metadataBase: new URL(process.env.NEXT_PUBLIC_WEB_APP_URL || 'https://twingenie.app'),
    title: {
        default: 'TwinGenie — Psychometric Digital Twin & Cognitive Reflection Platform',
        template: '%s | TwinGenie',
    },
    description:
        'TwinGenie calibrates a 35-trait psychometric digital twin with persistent vector memory to deliver structured cognitive reflection across four distinct decision perspectives.',
    keywords: [
        'AI digital twin',
        'psychometric AI',
        'personal cognitive intelligence',
        'Big Five personality assessment',
        'vector memory AI companion',
        'decision reflection platform',
        'TwinGenie',
    ],
    authors: [{ name: 'Ashwani Kumar', url: 'https://twingenie.app' }],
    creator: 'TwinGenie',
    publisher: 'TwinGenie',
    openGraph: {
        type: 'website',
        locale: 'en_US',
        url: 'https://twingenie.app',
        siteName: 'TwinGenie',
        title: 'TwinGenie — Psychometric Digital Twin & Cognitive Reflection Platform',
        description:
            'Calibrate your 35-trait digital twin and examine complex life decisions across four calibrated perspectives.',
        images: [
            {
                url: '/og-image.png',
                width: 1200,
                height: 630,
                alt: 'TwinGenie Cognitive Digital Twin Platform',
            },
        ],
    },
    twitter: {
        card: 'summary_large_image',
        title: 'TwinGenie — Psychometric Digital Twin',
        description: 'Four calibrated perspectives backed by a 35-trait personality engine and semantic vector memory.',
        images: ['/og-image.png'],
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
    alternates: {
        canonical: 'https://twingenie.app',
    },
    applicationName: 'TwinGenie',
    category: 'Lifestyle & Productivity',
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
            '@id': 'https://twingenie.app/#organization',
            name: 'TwinGenie',
            url: 'https://twingenie.app',
            logo: 'https://twingenie.app/logo.png',
            founder: {
                '@type': 'Person',
                name: 'Ashwani Kumar',
                email: 'ashwani@twingenie.app',
            },
            contactPoint: {
                '@type': 'ContactPoint',
                email: 'support@twingenie.app',
                contactType: 'customer support',
            },
        },
        {
            '@type': 'SoftwareApplication',
            '@id': 'https://twingenie.app/#application',
            name: 'TwinGenie',
            applicationCategory: 'LifestyleApplication, ProductivityApplication',
            operatingSystem: 'Web, Android (Google Play)',
            description:
                'Psychometric AI digital twin platform built on a 35-trait personality assessment, semantic vector memory, and four calibrated reflection perspectives.',
            url: 'https://twingenie.app',
            installUrl: 'https://play.google.com/store/apps/details?id=com.asmind.app',
            offers: [
                {
                    '@type': 'Offer',
                    name: 'Free Starter',
                    price: '0',
                    priceCurrency: 'USD',
                },
                {
                    '@type': 'Offer',
                    name: 'Pro Companion',
                    price: '5.99',
                    priceCurrency: 'USD',
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
