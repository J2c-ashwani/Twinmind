import type { Metadata } from 'next'
import SubscriptionClient from '@/components/Pages/SubscriptionClient'
import { buildPageMetadata } from '@/lib/seo'

export const metadata: Metadata = buildPageMetadata({
    title: 'Pricing & Plans',
    description:
        'Start free with full 35-trait psychometric calibration and all 4 cognitive Twin modes, or upgrade to TwinGenie Pro Companion ($5.99/mo or $47.88/yr; ₹499/mo or ₹3,999/yr in India).',
    path: '/subscription',
    keywords: [
        'TwinGenie pricing',
        'TwinGenie Pro plan',
        'AI digital twin subscription',
        'Google Play AI twin pricing',
    ],
})

export default function SubscriptionPage() {
    return <SubscriptionClient />
}
