import type { Metadata } from 'next'
import OnboardingClient from '@/components/Pages/OnboardingClient'
import { buildPageMetadata } from '@/lib/seo'

export const metadata: Metadata = buildPageMetadata({
    title: '35-Question Psychometric Twin Assessment',
    description:
        'Complete TwinGenie’s 5-stage 35-question behavioral assessment to calibrate your psychometric digital twin across Big Five dimensions, stress reactivity, and decision style.',
    path: '/onboarding',
    keywords: [
        '35 question personality assessment',
        'psychometric digital twin onboarding',
        'Big Five AI calibration',
        'TwinGenie onboarding',
    ],
})

export default function OnboardingPage() {
    return <OnboardingClient />
}
