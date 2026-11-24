import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowRight, HelpCircle, Smartphone } from 'lucide-react'
import SiteHeader from '@/components/Layout/SiteHeader'
import SiteFooter from '@/components/Layout/SiteFooter'
import { CORE_FAQS, PLAY_STORE_URL, SITE_URL, buildFaqJsonLd, buildPageMetadata } from '@/lib/seo'

export const metadata: Metadata = buildPageMetadata({
    title: 'Frequently Asked Questions (FAQ)',
    description:
        'Answers on TwinGenie’s 35-question psychometric onboarding, four Twin perspectives, 1536-dim pgvector memory privacy, zero model training, pricing, and Android sync.',
    path: '/faq',
    keywords: [
        'TwinGenie FAQ',
        'how psychometric digital twin works',
        'AI journal privacy row level security',
        'TwinGenie pricing Web Android',
    ],
})

const breadcrumbJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'TwinGenie', item: `${SITE_URL}/` },
        { '@type': 'ListItem', position: 2, name: 'FAQ', item: `${SITE_URL}/faq` },
    ],
}

export default function FaqPage() {
    const faqJsonLd = buildFaqJsonLd(CORE_FAQS)

    return (
        <div className="min-h-screen bg-[#07080B] text-[#F4F2EC] flex flex-col">
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify([breadcrumbJsonLd, faqJsonLd]) }}
            />
            <SiteHeader />

            <main className="flex-1 mx-auto w-full max-w-4xl px-4 py-14 sm:px-6 space-y-12">
                <header className="space-y-4 border-b border-white/[0.08] pb-8">
                    <div className="inline-flex items-center gap-2 rounded-full border border-[#D9A760]/30 bg-[#D9A760]/10 px-3 py-1 font-mono text-[11px] uppercase tracking-wider text-[#E7C891]">
                        <HelpCircle className="h-3.5 w-3.5" />
                        Knowledge Base
                    </div>
                    <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
                        Frequently Asked Questions
                    </h1>
                    <p className="text-sm leading-relaxed text-neutral-300 sm:text-base">
                        Direct technical and product answers on how TwinGenie works, how data is protected,
                        and how Web and Google Play subscriptions stay synchronized.
                    </p>
                </header>

                <section className="space-y-4">
                    {CORE_FAQS.map((item) => (
                        <article key={item.question} className="enterprise-panel p-6 space-y-2.5">
                            <div className="font-mono text-[10px] uppercase tracking-wider text-[#D9A760]">
                                {item.category}
                            </div>
                            <h2 className="text-lg font-semibold text-[#F4F2EC]">{item.question}</h2>
                            <p className="text-sm leading-relaxed text-neutral-300">{item.answer}</p>
                        </article>
                    ))}
                </section>

                <section className="enterprise-panel p-6 sm:p-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h2 className="text-lg font-semibold">Ready to calibrate your digital twin?</h2>
                        <p className="mt-1 text-xs text-neutral-400">
                            Free Starter includes the full 35-question calibration and all 4 cognitive modes.
                        </p>
                    </div>
                    <div className="flex flex-wrap gap-3">
                        <Link href="/onboarding" className="btn-primary-ivory px-5 py-2.5 text-xs">
                            <span>Create Your Twin</span>
                            <ArrowRight className="h-3.5 w-3.5" />
                        </Link>
                        <a
                            href={PLAY_STORE_URL}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="btn-secondary-obsidian px-4 py-2.5 text-xs"
                        >
                            <Smartphone className="h-3.5 w-3.5 text-emerald-400" />
                            <span>Android App</span>
                        </a>
                    </div>
                </section>
            </main>

            <SiteFooter />
        </div>
    )
}
