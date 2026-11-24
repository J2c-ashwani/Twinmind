import type { MetadataRoute } from 'next'
import { SITE_URL } from '@/lib/seo'

export default function sitemap(): MetadataRoute.Sitemap {
    const now = new Date()

    const routes: Array<{
        path: string
        changeFrequency: 'daily' | 'weekly' | 'monthly'
        priority: number
    }> = [
        { path: '/', changeFrequency: 'weekly', priority: 1.0 },
        { path: '/methodology', changeFrequency: 'monthly', priority: 0.9 },
        { path: '/compare', changeFrequency: 'monthly', priority: 0.9 },
        { path: '/faq', changeFrequency: 'monthly', priority: 0.9 },
        { path: '/onboarding', changeFrequency: 'weekly', priority: 0.9 },
        { path: '/test', changeFrequency: 'weekly', priority: 0.85 },
        { path: '/subscription', changeFrequency: 'monthly', priority: 0.8 },
        { path: '/try', changeFrequency: 'monthly', priority: 0.7 },
        { path: '/privacy', changeFrequency: 'monthly', priority: 0.5 },
        { path: '/terms', changeFrequency: 'monthly', priority: 0.5 },
        { path: '/delete-account', changeFrequency: 'monthly', priority: 0.4 },
        { path: '/delete-data', changeFrequency: 'monthly', priority: 0.4 },
    ]

    return routes.map((r) => ({
        url: `${SITE_URL}${r.path === '/' ? '/' : r.path}`,
        lastModified: now,
        changeFrequency: r.changeFrequency,
        priority: r.priority,
    }))
}
