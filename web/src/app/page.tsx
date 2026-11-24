import type { Metadata } from 'next'
import HomeClient from '@/components/Landing/HomeClient'
import { CORE_FAQS, SITE_URL, buildFaqJsonLd } from '@/lib/seo'

export const metadata: Metadata = {
    title: {
        absolute: 'TwinGenie — Psychometric Digital Twin & Cognitive Reflection Platform',
    },
    description:
        'Calibrate a 35-trait psychometric digital twin with 1536-dim pgvector memory and examine complex decisions across Normal, Future, Honest, and Reflective modes.',
    alternates: {
        canonical: `${SITE_URL}/`,
    },
}

export default function HomePage() {
    const faqJsonLd = buildFaqJsonLd(CORE_FAQS)

    return (
        <>
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
            />
            <HomeClient />
        </>
    )
}
