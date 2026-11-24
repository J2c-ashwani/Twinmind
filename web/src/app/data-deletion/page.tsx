import type { Metadata } from 'next'
import DataDeletionView from '@/components/DataDeletionView'
import { buildPageMetadata } from '@/lib/seo'

export const metadata: Metadata = buildPageMetadata({
    title: 'Data Deletion',
    description: 'Request deletion of specific TwinGenie account data without deleting your account.',
    path: '/data-deletion',
    canonicalPath: '/delete-data',
    index: false,
})

export default function DataDeletionPage() {
    return <DataDeletionView />
}
