import type { Metadata } from 'next'
import DataDeletionView from '@/components/DataDeletionView'
import { buildPageMetadata } from '@/lib/seo'

export const metadata: Metadata = buildPageMetadata({
    title: 'Data Deletion',
    description: 'Selectively erase TwinGenie chat messages, semantic vector memories, or voice logs without deleting your account.',
    path: '/delete-data',
})

export default function DeleteDataPage() {
    return <DataDeletionView />
}
