import type { Metadata } from 'next'
import TestClient from '@/components/Pages/TestClient'
import { buildPageMetadata } from '@/lib/seo'

export const metadata: Metadata = buildPageMetadata({
    title: 'Quick 3-Step Cognitive Blindspot Diagnostic',
    description:
        'Take TwinGenie’s 30-second behavioral diagnostic to uncover your avoidance trigger, interpersonal reflex, and which Twin perspective counters your blindspot.',
    path: '/test',
    keywords: [
        'cognitive blindspot test',
        'procrastination archetype quiz',
        'AI personality reflection diagnostic',
        'TwinGenie diagnostic',
    ],
})

export default function TestPage() {
    return <TestClient />
}
