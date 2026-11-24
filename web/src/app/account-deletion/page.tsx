import type { Metadata } from 'next'
import AccountDeletionView from '@/components/AccountDeletionView'
import { buildPageMetadata } from '@/lib/seo'

export const metadata: Metadata = buildPageMetadata({
    title: 'Account Deletion',
    description: 'Permanently delete your TwinGenie account and associated personal data.',
    path: '/account-deletion',
    canonicalPath: '/delete-account',
    index: false,
})

export default function AccountDeletionPage() {
    return <AccountDeletionView />
}
