import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowLeft, ArrowRight, Eye, Layers, MessageCircle, ShieldCheck, Smartphone, Sparkles } from 'lucide-react'
import { PLAY_STORE_URL, SITE_URL, buildPageMetadata } from '@/lib/seo'

export const metadata: Metadata = buildPageMetadata({
    title: 'How TwinGenie Works',
    description:
        'See how TwinGenie calibrates your personal AI digital twin across 35 questions, remembers your ongoing story, and reflects through Normal, Future, Honest, and Reflective modes.',
    path: '/methodology',
    type: 'article',
    keywords: [
        'how TwinGenie works',
        '35 question personality digital twin',
        'AI chat with long term memory',
        'honest AI companion',
    ],
})

const breadcrumbJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'TwinGenie', item: `${SITE_URL}/` },
        { '@type': 'ListItem', position: 2, name: 'How It Works', item: `${SITE_URL}/methodology` },
    ],
}

const articleJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: 'How TwinGenie Calibrates Your Personal AI Digital Twin',
    description:
        'Overview of TwinGenie’s 35-question onboarding profile, continuous memory, and four distinct reflection perspectives.',
    url: `${SITE_URL}/methodology`,
    author: { '@type': 'Person', name: 'Ashwani Kumar' },
    publisher: { '@type': 'Organization', name: 'TwinGenie', url: SITE_URL },
    mainEntityOfPage: `${SITE_URL}/methodology`,
}

export default function MethodologyPage() {
    return (
        <div className="min-h-screen text-white flex flex-col">
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify([breadcrumbJsonLd, articleJsonLd]) }}
            />

            <header className="border-b border-white/10 bg-slate-900/60 backdrop-blur-md sticky top-0 z-50">
                <div className="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between">
                    <Link href="/" className="flex items-center gap-3 group">
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

            <main className="flex-1 mx-auto w-full max-w-5xl px-6 py-12 space-y-12">
                <header className="space-y-4 border-b border-white/10 pb-8">
                    <div className="inline-flex items-center gap-2 rounded-full border border-purple-500/30 bg-purple-500/15 px-3 py-1 text-xs font-medium text-purple-200">
                        <Sparkles className="h-3.5 w-3.5 text-purple-300" />
                        How TwinGenie Works
                    </div>
                    <h1 className="text-3xl font-bold tracking-tight sm:text-5xl">
                        An AI companion built around{' '}
                        <span className="gradient-text">who you actually are.</span>
                    </h1>
                    <p className="max-w-3xl text-sm leading-relaxed text-gray-300 sm:text-base">
                        Most chatbots start blank and tell you what sounds pleasant in the moment.
                        TwinGenie learns your personality through 35 quick questions, remembers your
                        ongoing story across weeks, and lets you talk through real decisions using
                        four distinct perspectives.
                    </p>
                </header>

                <section className="grid gap-6 md:grid-cols-3">
                    <article className="glass-card p-6 space-y-3">
                        <Layers className="h-6 w-6 text-purple-300" />
                        <h2 className="text-lg font-bold">1. 35-Question Setup</h2>
                        <p className="text-sm leading-relaxed text-gray-300">
                            Five brief onboarding screens capture how you handle stress, make decisions,
                            build trust, and respond to conflict—so your Twin knows your style before your
                            first message.
                        </p>
                    </article>

                    <article className="glass-card p-6 space-y-3">
                        <MessageCircle className="h-6 w-6 text-pink-300" />
                        <h2 className="text-lg font-bold">2. Memory That Sticks</h2>
                        <p className="text-sm leading-relaxed text-gray-300">
                            Your goals, breakthroughs, and recurring patterns stay connected across
                            conversations, so you never have to re-explain your whole life story.
                        </p>
                    </article>

                    <article className="glass-card p-6 space-y-3">
                        <Eye className="h-6 w-6 text-blue-300" />
                        <h2 className="text-lg font-bold">3. Four Chat Perspectives</h2>
                        <p className="text-sm leading-relaxed text-gray-300">
                            Switch between Normal Twin, Future Twin, Honest Twin, and Reflective Coach
                            inside chat whenever you want support, long-term perspective, or a reality check.
                        </p>
                    </article>
                </section>

                <section className="glass-card p-6 sm:p-8 space-y-6">
                    <h2 className="text-2xl font-bold">Explore All 4 Perspectives</h2>
                    <div className="grid gap-4 sm:grid-cols-2">
                        <div className="rounded-2xl border border-white/10 bg-white/5 p-5 space-y-1.5">
                            <div className="text-sm font-bold text-green-300">Normal Twin</div>
                            <p className="text-sm text-gray-300">
                                Your balanced everyday mirror—warm, thoughtful, and grounded in your real personality.
                            </p>
                        </div>
                        <div className="rounded-2xl border border-blue-500/30 bg-blue-500/10 p-5 space-y-1.5">
                            <div className="text-sm font-bold text-blue-300">Future Twin</div>
                            <p className="text-sm text-gray-300">
                                Speaks as your wiser self five years ahead so short-term anxiety does not steer big choices.
                            </p>
                        </div>
                        <div className="rounded-2xl border border-pink-500/30 bg-pink-500/10 p-5 space-y-1.5">
                            <div className="text-sm font-bold text-pink-300">Honest Twin</div>
                            <p className="text-sm text-gray-300">
                                Direct, constructive truth with zero sugarcoating—calling out excuses and blindspots kindly but clearly.
                            </p>
                        </div>
                        <div className="rounded-2xl border border-purple-500/30 bg-purple-500/10 p-5 space-y-1.5">
                            <div className="text-sm font-bold text-purple-300">Reflective Coach</div>
                            <p className="text-sm text-gray-300">
                                Gentle, calming reflection focused on understanding emotions and taking one practical next step.
                            </p>
                        </div>
                    </div>
                </section>

                <section className="glass-card p-6 sm:p-8 space-y-3">
                    <div className="inline-flex items-center gap-2 text-sm font-semibold text-green-300">
                        <ShieldCheck className="h-4 w-4" />
                        Private &amp; Under Your Control
                    </div>
                    <p className="text-sm text-gray-300 leading-relaxed">
                        Your private chats and voice reflections are isolated to your personal account and
                        are never sold or used to train public AI models. You can delete specific memories on{' '}
                        <Link href="/delete-data" className="text-purple-300 underline">
                            Data Deletion
                        </Link>{' '}
                        or remove your entire account on{' '}
                        <Link href="/delete-account" className="text-purple-300 underline">
                            Account Deletion
                        </Link>
                        . TwinGenie is a personal growth and self-reflection tool, not medical or clinical therapy.
                    </p>
                </section>

                <section className="flex flex-wrap gap-4 items-center">
                    <Link
                        href="/onboarding"
                        className="inline-flex items-center gap-2 px-7 py-3.5 rounded-2xl bg-gradient-to-r from-purple-600 to-pink-600 font-semibold text-white shadow-lg shadow-purple-500/25 hover:scale-105 transition-all"
                    >
                        <span>Create Your Twin</span>
                        <ArrowRight className="h-4 w-4" />
                    </Link>
                    <Link href="/login" className="glass-button text-sm">
                        Sign In to Chat
                    </Link>
                    <a
                        href={PLAY_STORE_URL}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 text-sm text-purple-300 hover:text-white px-3 py-2"
                    >
                        <Smartphone className="h-4 w-4" />
                        <span>Get Android App</span>
                    </a>
                </section>
            </main>
        </div>
    )
}
