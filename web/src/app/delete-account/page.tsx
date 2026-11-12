import type { Metadata } from 'next'
import AccountDeletionView from '@/components/AccountDeletionView'

export const metadata: Metadata = {
    title: 'Account Deletion | TwinGenie',
    description: 'Permanently delete your TwinGenie account and associated personal data.',
}

export default function DeleteAccountPage() {
    return <AccountDeletionView />
}
