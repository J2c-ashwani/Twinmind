import type { MetadataRoute } from 'next'
import { SITE_URL } from '@/lib/seo'

const PRIVATE_DISALLOW = [
    '/api/',
    '/secret-admin-x9k2p/',
    '/chat',
    '/dashboard',
    '/insights',
    '/memories',
    '/growth-story',
    '/growth-circles',
    '/achievements',
    '/challenges',
    '/life-coach',
    '/profile',
    '/settings',
    '/notifications',
    '/referral',
    '/twin-match',
]

const EXPLICIT_ALLOW = [
    '/',
    '/methodology',
    '/compare',
    '/faq',
    '/test',
    '/onboarding',
    '/subscription',
    '/try',
    '/privacy',
    '/terms',
    '/delete-account',
    '/delete-data',
    '/llms.txt',
    '/llms-full.txt',
    '/.well-known/llms.txt',
]

export default function robots(): MetadataRoute.Robots {
    return {
        rules: [
            {
                userAgent: [
                    'Googlebot',
                    'Google-Extended',
                    'Bingbot',
                    'GPTBot',
                    'OAI-SearchBot',
                    'ChatGPT-User',
                    'PerplexityBot',
                    'ClaudeBot',
                    'Claude-Web',
                    'Applebot',
                    'Applebot-Extended',
                    'DuckAssistBot',
                    'meta-externalagent',
                ],
                allow: EXPLICIT_ALLOW,
                disallow: PRIVATE_DISALLOW,
            },
            {
                userAgent: '*',
                allow: '/',
                disallow: PRIVATE_DISALLOW,
            },
        ],
        sitemap: `${SITE_URL}/sitemap.xml`,
        host: SITE_URL,
    }
}
