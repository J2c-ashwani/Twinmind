import type { Metadata } from 'next'
import SignupClient from '@/components/Pages/SignupClient'
import { buildPageMetadata } from '@/lib/seo'

export const metadata: Metadata = buildPageMetadata({
    title: 'Create Your TwinGenie Account',
    description:
        'Create your TwinGenie account to calibrate your 35-trait psychometric profile and synchronize reflections across Web and Android.',
    path: '/signup',
    index: false,
})

export default function SignupPage() {
    return <SignupClient />
}
