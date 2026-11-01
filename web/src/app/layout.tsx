import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
    metadataBase: new URL(process.env.NEXT_PUBLIC_WEB_APP_URL || 'https://twingenie.app'),
    // Basic SEO
    title: {
        default: 'TwinGenie - AI Personal Digital Twin for Reflection & Growth',
        template: '%s | TwinGenie'
    },
    description: 'TwinGenie is an AI-powered personal digital twin companion that helps you examine assumptions, challenge cognitive blindspots, and track personal growth across 4 distinct cognitive perspectives.',
    keywords: [
        'AI digital twin',
        'personal growth AI',
        'AI companion app',
        'cognitive reflection',
        'mental wellness',
        'self-improvement AI',
        'Big Five personality assessment',
        'AI life coach',
        'daily journaling',
        'mood tracking',
        'vector memory AI',
        'TwinGenie'
    ],
    authors: [{ name: 'Ashwani Kumar', url: 'https://twingenie.app' }],
    creator: 'TwinGenie',
    publisher: 'TwinGenie Inc.',

    // Open Graph (Facebook, LinkedIn, Google crawlers)
    openGraph: {
        type: 'website',
        locale: 'en_US',
        url: 'https://twingenie.app',
        siteName: 'TwinGenie',
        title: 'TwinGenie - AI Personal Digital Twin for Reflection & Growth',
        description: 'An AI companion that does not just validate you. Explore 4 cognitive perspectives, examine your assumptions, and achieve true personal growth.',
        images: [
            {
                url: '/og-image.png',
                width: 1200,
                height: 630,
                alt: 'TwinGenie - AI Personal Digital Twin'
            }
        ]
    },

    // Twitter Card
    twitter: {
        card: 'summary_large_image',
        title: 'TwinGenie - AI Personal Digital Twin',
        description: 'Less validation. More self-understanding. Chat, reflect, and grow with your AI twin.',
        images: ['/og-image.png'],
        creator: '@twingenieapp'
    },

    // Robots
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

    // Alternates
    alternates: {
        canonical: 'https://twingenie.app',
    },

    // App metadata
    applicationName: 'TwinGenie',
    category: 'Productivity & Lifestyle',

    // Icons
    icons: {
        icon: '/icons/icon-192x192.png',
        apple: '/icons/icon-192x192.png',
    },

    // Manifest
    manifest: '/manifest.json',
}

// JSON-LD Structured Data
const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
        {
            '@type': 'Organization',
            '@id': 'https://twingenie.app/#organization',
            name: 'Admitwave Education Services Pvt Ltd',
            alternateName: 'TwinGenie',
            url: 'https://twingenie.app',
            logo: 'https://twingenie.app/icons/icon-192x192.png',
            founder: {
                '@type': 'Person',
                name: 'Ashwani Kumar',
                email: 'ashwani@twingenie.app'
            },
            contactPoint: {
                '@type': 'ContactPoint',
                email: 'ashwani@twingenie.app',
                contactType: 'customer support'
            }
        },
        {
            '@type': 'SoftwareApplication',
            '@id': 'https://twingenie.app/#application',
            name: 'TwinGenie',
            applicationCategory: 'HealthAndFitnessApplication, ProductivityApplication',
            operatingSystem: 'Web, Android (Google Play)',
            description: 'AI-powered digital twin companion for self-reflection, cognitive growth, and personal development.',
            url: 'https://twingenie.app',
            installUrl: 'https://play.google.com/store/apps/details?id=com.asmind.app',
            offers: [
                {
                    '@type': 'Offer',
                    name: 'Free Tier',
                    price: '0',
                    priceCurrency: 'USD'
                },
                {
                    '@type': 'Offer',
                    name: 'Pro Companion',
                    price: '5.99',
                    priceCurrency: 'USD'
                }
            ],
            aggregateRating: {
                '@type': 'AggregateRating',
                ratingValue: '4.8',
                ratingCount: '1240'
            }
        }
    ]
}

export default function RootLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return (
        <html lang="en">
            <head>
                {/* JSON-LD Structured Data */}
                <script
                    type="application/ld+json"
                    dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
                />

                {/* PWA */}
                <link rel="manifest" href="/manifest.json" />
                <link rel="apple-touch-icon" href="/icons/icon-192x192.png" />
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
