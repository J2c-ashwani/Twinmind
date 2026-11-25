import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowLeft, ArrowRight, HelpCircle, Smartphone } from 'lucide-react'
import { CORE_FAQS, PLAY_STORE_URL, SITE_URL, buildFaqJsonLd, buildPageMetadata } from '@/lib/seo'

export const metadata: Metadata = buildPageMetadata({
    title: 'Frequently Asked Questions (FAQ)',
    description:
        'Answers about creating your TwinGenie digital twin, the 35-question setup, four chat perspectives, privacy guarantees, pricing, and Web + Android sync.',
    path: '/faq',
    keywords: [
        'TwinGenie FAQ',
        'how AI digital twin works',
        'AI reflection app privacy',
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
        <div className="min-h-screen text-white flex flex-col">
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify([breadcrumbJsonLd, faqJsonLd]) }}
            />

            <header className="border-b border-white/10 bg-slate-900/60 backdrop-blur-md sticky top-0 z-50">
                <div className="max-w-4xl mx-auto px-6 h-16 flex items-center justify-between">
                    <Link href="/" className="flex items-center gap-3">
                        <img
                            src="/logo.png"
                            alt="TwinGenie"
                            className="w-9 h-9 rounded-xl object-cover shadow-md shadow-purple-500/20"
                        />
                        <span className="font-bold text-xl tracking-tight text-white">TwinGenie</span>
                    </Link>
                    <Link
                        href="/"
                        className="inline-flex items-center gap-2 text-sm text-gray-300 hover:text-white px-3 py-1.5 rounded-lg border border-white/10 hover:bg-white/5"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        <span>Back</span>
                    </Link>
                </div>
            </header>

            <main className="flex-1 mx-auto w-full max-w-4xl px-6 py-12 space-y-10">
                <header className="space-y-3 border-b border-white/10 pb-8">
                    <div className="inline-flex items-center gap-2 rounded-full border border-purple-500/30 bg-purple-500/15 px-3 py-1 text-xs font-medium text-purple-200">
                        <HelpCircle className="h-3.5 w-3.5 text-purple-300" />
                        Frequently Asked Questions
                    </div>
                    <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
                        Everything about TwinGenie
                    </h1>
                    <p className="text-sm text-gray-300 sm:text-base">
                        Clear answers on getting started, how your Twin remembers you, privacy, and plans.
                    </p>
                </header>

                <section className="space-y-4">
                    {CORE_FAQS.map((item) => (
                        <article key={item.question} className="glass-card p-6 space-y-2">
                            <div className="text-xs font-semibold uppercase tracking-wider text-purple-300">
                                {item.category}
                            </div>
                            <h2 className="text-lg font-bold text-white">{item.question}</h2>
                            <p className="text-sm leading-relaxed text-gray-300">{item.answer}</p>
                        </article>
                    ))}
                </section>

                <section className="glass-card p-6 sm:p-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h2 className="text-lg font-bold">Ready to meet your AI Twin?</h2>
                        <p className="mt-1 text-xs text-gray-300">
                            Start free on Web or Android with your 35-question profile.
                        </p>
                    </div>
                    <div className="flex flex-wrap gap-3">
                        <Link
                            href="/onboarding"
                            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 text-xs font-semibold text-white"
                        >
                            <span>Create Your Twin</span>
                            <ArrowRight className="h-3.5 w-3.5" />
                        </Link>
                        <Link href="/login" className="glass-button px-4 py-2 text-xs">
                            Sign In
                        </Link>
                        <a
                            href={PLAY_STORE_URL}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 text-xs text-purple-300 hover:text-white px-2 py-2"
                        >
                            <Smartphone className="h-3.5 w-3.5" />
                            <span>Android App</span>
                        </a>
                    </div>
                </section>
            </main>
        </div>
    )
}
