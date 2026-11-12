import type { Metadata } from 'next'
import DataDeletionView from '@/components/DataDeletionView'

export const metadata: Metadata = {
    title: 'Data Deletion | TwinGenie',
    description: 'Request deletion of specific TwinGenie account data without deleting your account.',
}

export default function DataDeletionPage() {
    return <DataDeletionView />
}
