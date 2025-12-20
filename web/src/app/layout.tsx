import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
    // Basic SEO
    title: {
        default: 'TwinGenie - Your AI Digital Twin for Personal Growth',
        template: '%s | TwinGenie'
    },
    description: 'TwinGenie is your AI-powered digital companion for personal growth, emotional wellness, and self-discovery. Chat, reflect, and grow with your personalized AI twin.',
    keywords: [
        'AI digital twin',
        'personal growth app',
        'AI companion',
        'mental wellness',
        'self-improvement',
        'AI life coach',
        'emotional intelligence',
        'daily journaling',
        'mood tracking',
        'AI chatbot',
        'mindfulness app'
    ],
    authors: [{ name: 'TwinGenie Team' }],
    creator: 'TwinGenie',
    publisher: 'TwinGenie',

    // Open Graph (Facebook, LinkedIn, etc.)
    openGraph: {
        type: 'website',
        locale: 'en_US',
        url: 'https://twinmind.app',
        siteName: 'TwinGenie',
        title: 'TwinGenie - Your AI Digital Twin for Personal Growth',
        description: 'Discover your AI-powered companion for personal growth. Chat, reflect, and transform with TwinGenie.',
        images: [
            {
                url: '/og-image.png',
                width: 1200,
                height: 630,
                alt: 'TwinGenie - AI Digital Twin'
            }
        ]
    },

    // Twitter Card
    twitter: {
        card: 'summary_large_image',
        title: 'TwinGenie - Your AI Digital Twin',
        description: 'AI-powered personal growth companion. Chat, reflect, grow.',
        images: ['/og-image.png'],
        creator: '@twinmindapp'
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

    // Verification (add your actual IDs)
    verification: {
        google: 'your-google-verification-code',
        // yandex: 'yandex-verification-code',
        // bing: 'bing-verification-code',
    },

    // Alternates
    alternates: {
        canonical: 'https://twinmind.app',
    },

    // App metadata
    applicationName: 'TwinGenie',
    category: 'Lifestyle',

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
    '@type': 'SoftwareApplication',
    name: 'TwinGenie',
    applicationCategory: 'LifestyleApplication',
    operatingSystem: 'Web, iOS, Android',
    description: 'AI-powered digital twin for personal growth, emotional wellness, and self-discovery.',
    offers: {
        '@type': 'Offer',
        price: '0',
        priceCurrency: 'USD'
    },
    aggregateRating: {
        '@type': 'AggregateRating',
        ratingValue: '4.8',
        ratingCount: '1000'
    }
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

                {/* Fonts */}
                <link rel="preconnect" href="https://fonts.googleapis.com" />
                <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
                <link
                    href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap"
                    rel="stylesheet"
                />
            </head>
            <body className={inter.className}>
                {children}
            </body>
        </html>
    )
}

