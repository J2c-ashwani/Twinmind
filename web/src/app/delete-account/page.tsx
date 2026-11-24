import type { Metadata } from 'next'
import AccountDeletionView from '@/components/AccountDeletionView'
import { buildPageMetadata } from '@/lib/seo'

export const metadata: Metadata = buildPageMetadata({
    title: 'Account Deletion',
    description: 'Permanently delete your TwinGenie account, 35-trait psychometric profile, and associated personal data.',
    path: '/delete-account',
})

export default function DeleteAccountPage() {
    return <AccountDeletionView />
}
