import type { Metadata } from 'next'
import LoginClient from '@/components/Pages/LoginClient'
import { buildPageMetadata } from '@/lib/seo'

export const metadata: Metadata = buildPageMetadata({
    title: 'Sign In to TwinGenie Workspace',
    description:
        'Sign in with your synchronized Web & Android account to access your psychometric digital twin, pgvector memory timeline, and guided Life Coach sprints.',
    path: '/login',
    index: false,
})

export default function LoginPage() {
    return <LoginClient />
}
