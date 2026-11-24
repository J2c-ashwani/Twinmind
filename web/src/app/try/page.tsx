import type { Metadata } from 'next'
import TryClient from '@/components/Pages/TryClient'
import { buildPageMetadata } from '@/lib/seo'

export const metadata: Metadata = buildPageMetadata({
    title: 'Try TwinGenie on Web & Android',
    description:
        'Launch TwinGenie on Web or install the Android app on Google Play (com.asmind.app) to calibrate your 35-trait digital twin.',
    path: '/try',
})

export default function TryPage() {
    return <TryClient />
}
