import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowRight, Cpu, Database, Eye, Layers, Lock, ShieldCheck, Smartphone } from 'lucide-react'
import SiteHeader from '@/components/Layout/SiteHeader'
import SiteFooter from '@/components/Layout/SiteFooter'
import { PLAY_STORE_URL, SITE_URL, buildPageMetadata } from '@/lib/seo'

export const metadata: Metadata = buildPageMetadata({
    title: '35-Trait Psychometric & pgvector Memory Methodology',
    description:
        'Technical overview of TwinGenie’s 5-stage 35-question behavioral assessment, 1536-dimensional PostgreSQL pgvector memory, Row-Level Security isolation, and 4-perspective router.',
    path: '/methodology',
    type: 'article',
    keywords: [
        'psychometric digital twin methodology',
        '35 trait personality calibration',
        'pgvector AI memory architecture',
        'anti sycophancy AI prompt routing',
    ],
})

const breadcrumbJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'TwinGenie', item: `${SITE_URL}/` },
        { '@type': 'ListItem', position: 2, name: 'Methodology', item: `${SITE_URL}/methodology` },
    ],
}

const articleJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'TechArticle',
    headline: 'How TwinGenie Calibrates a 35-Trait Psychometric Digital Twin',
    description:
        'Architecture detailing TwinGenie’s 35-question assessment, 1536-dim pgvector semantic retrieval, and four-perspective anti-sycophancy reasoning pipeline.',
    url: `${SITE_URL}/methodology`,
    author: { '@type': 'Person', name: 'Ashwani Kumar' },
    publisher: { '@type': 'Organization', name: 'TwinGenie', url: SITE_URL },
    mainEntityOfPage: `${SITE_URL}/methodology`,
}

export default function MethodologyPage() {
    return (
        <div className="min-h-screen bg-[#07080B] text-[#F4F2EC] flex flex-col">
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify([breadcrumbJsonLd, articleJsonLd]) }}
            />
            <SiteHeader />

            <main className="flex-1 mx-auto w-full max-w-5xl px-4 py-14 sm:px-6 lg:px-8 space-y-14">
                <header className="space-y-4 border-b border-white/[0.08] pb-10">
                    <div className="inline-flex items-center gap-2 rounded-full border border-[#D9A760]/30 bg-[#D9A760]/10 px-3 py-1 font-mono text-[11px] uppercase tracking-wider text-[#E7C891]">
                        <Cpu className="h-3.5 w-3.5" />
                        Architecture &amp; Psychometric Specification
                    </div>
                    <h1 className="text-3xl font-semibold tracking-tight text-[#F4F2EC] sm:text-5xl">
                        How TwinGenie calibrates a{' '}
                        <span className="font-serif italic font-normal text-[#E7C891]">
                            non-sycophantic
                        </span>{' '}
                        digital twin.
                    </h1>
                    <p className="max-w-3xl text-sm leading-relaxed text-neutral-300 sm:text-base">
                        Most conversational AI tools initialize from an empty system prompt and optimize for
                        agreeableness. TwinGenie establishes a measurable behavioral baseline across 35
                        questions before your first message, attaches longitudinal 1536-dimensional vector
                        memory, and routes every question through four distinct cognitive perspectives.
                    </p>
                </header>

                <section className="grid gap-6 md:grid-cols-3">
                    <article className="enterprise-panel p-6 space-y-3">
                        <div className="flex items-center justify-between">
                            <span className="font-mono text-[11px] text-[#D9A760]">LAYER 01</span>
                            <Layers className="h-4 w-4 text-neutral-400" />
                        </div>
                        <h2 className="text-lg font-semibold">35-Question 5-Screen Baseline</h2>
                        <p className="text-xs leading-relaxed text-neutral-400 sm:text-sm">
                            Five structured onboarding stages evaluate Big Five dimensions alongside
                            decision speed, conflict avoidance, stress reactivity, and relational trust.
                            Numeric trait weights shape system framing from turn one.
                        </p>
                    </article>

                    <article className="enterprise-panel p-6 space-y-3">
                        <div className="flex items-center justify-between">
                            <span className="font-mono text-[11px] text-[#D9A760]">LAYER 02</span>
                            <Database className="h-4 w-4 text-neutral-400" />
                        </div>
                        <h2 className="text-lg font-semibold">1536-Dim Episodic pgvector Memory</h2>
                        <p className="text-xs leading-relaxed text-neutral-400 sm:text-sm">
                            Reflections, stated commitments, and unresolved dilemmas are embedded into
                            1536-dimensional vectors stored in Row-Level Security (RLS) PostgreSQL namespaces
                            so past patterns resurface across weeks.
                        </p>
                    </article>

                    <article className="enterprise-panel p-6 space-y-3">
                        <div className="flex items-center justify-between">
                            <span className="font-mono text-[11px] text-[#D9A760]">LAYER 03</span>
                            <Eye className="h-4 w-4 text-neutral-400" />
                        </div>
                        <h2 className="text-lg font-semibold">Four-Mode Perspective Router</h2>
                        <p className="text-xs leading-relaxed text-neutral-400 sm:text-sm">
                            Rather than outputting one polite paragraph, TwinGenie lets you examine the
                            same situation via Normal Twin, Future Twin (5-year horizon), Honest Twin
                            (anti-bias reality check), and Reflective Coach.
                        </p>
                    </article>
                </section>

                <section className="enterprise-panel p-6 sm:p-8 space-y-6">
                    <h2 className="text-2xl font-semibold">The Four Calibrated Perspectives</h2>
                    <div className="grid gap-4 sm:grid-cols-2">
                        <div className="rounded-xl border border-white/[0.08] bg-[#0B0D12] p-5 space-y-2">
                            <div className="font-mono text-[11px] uppercase tracking-wider text-sky-300">
                                01 / Normal Twin — Core Reflection
                            </div>
                            <p className="text-xs leading-relaxed text-neutral-300 sm:text-sm">
                                Balanced everyday mirror grounded in your 35-trait scoring and active life
                                priorities. Best for daily journaling, planning, and structured thinking.
                            </p>
                        </div>
                        <div className="rounded-xl border border-[#D9A760]/30 bg-[#D9A760]/[0.05] p-5 space-y-2">
                            <div className="font-mono text-[11px] uppercase tracking-wider text-[#E7C891]">
                                02 / Future Twin — 5-Year Horizon
                            </div>
                            <p className="text-xs leading-relaxed text-neutral-300 sm:text-sm">
                                Evaluates present excuses and trade-offs through long-term compounding
                                consequences—exposing short-term comfort traps that erode future optionality.
                            </p>
                        </div>
                        <div className="rounded-xl border border-rose-500/30 bg-rose-500/[0.05] p-5 space-y-2">
                            <div className="font-mono text-[11px] uppercase tracking-wider text-rose-300">
                                03 / Honest Twin — Anti-Sycophancy Reality Check
                            </div>
                            <p className="text-xs leading-relaxed text-neutral-300 sm:text-sm">
                                Explicitly overrides agreeable AI flattery to confront procrastination,
                                rationalizations, and repeated behavioral loops without hostility.
                            </p>
                        </div>
                        <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/[0.05] p-5 space-y-2">
                            <div className="font-mono text-[11px] uppercase tracking-wider text-emerald-300">
                                04 / Reflective Coach — Socratic Clarity
                            </div>
                            <p className="text-xs leading-relaxed text-neutral-300 sm:text-sm">
                                Calm Socratic inquiry focused on de-escalating emotional overwhelm and
                                isolating one clear, low-friction next step.
                            </p>
                        </div>
                    </div>
                </section>

                <section className="enterprise-panel p-6 sm:p-8 space-y-4">
                    <div className="inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-wider text-emerald-300">
                        <ShieldCheck className="h-4 w-4" />
                        Privacy, Storage &amp; Clinical Boundaries
                    </div>
                    <h2 className="text-2xl font-semibold">Governance guarantees</h2>
                    <ul className="space-y-2.5 text-sm text-neutral-300">
                        <li className="flex items-start gap-2.5">
                            <Lock className="mt-1 h-4 w-4 shrink-0 text-[#D9A760]" />
                            <span>
                                <strong className="text-white">Zero Public Model Training:</strong>{' '}
                                Personal reflections, audio entries, and trait profiles are never sold or used
                                to train public base AI models.
                            </span>
                        </li>
                        <li className="flex items-start gap-2.5">
                            <ShieldCheck className="mt-1 h-4 w-4 shrink-0 text-emerald-400" />
                            <span>
                                <strong className="text-white">Row-Level Security + Erasure:</strong>{' '}
                                Isolated PostgreSQL storage with self-serve slice deletion on{' '}
                                <Link href="/delete-data" className="text-[#E7C891] hover:underline">
                                    /delete-data
                                </Link>{' '}
                                and full account deletion on{' '}
                                <Link href="/delete-account" className="text-[#E7C891] hover:underline">
                                    /delete-account
                                </Link>
                                .
                            </span>
                        </li>
                    </ul>
                    <p className="pt-2 text-xs text-neutral-400">
                        Note: TwinGenie is a personal reflection and self-coaching application and is not a
                        clinical healthcare provider, licensed therapist, or medical diagnostic device.
                    </p>
                </section>

                <section className="flex flex-col gap-3 sm:flex-row sm:items-center">
                    <Link href="/onboarding" className="btn-primary-ivory px-6 py-3.5 text-sm">
                        <span>Start 35-Trait Assessment</span>
                        <ArrowRight className="h-4 w-4" />
                    </Link>
                    <a
                        href={PLAY_STORE_URL}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn-secondary-obsidian px-5 py-3.5 text-sm"
                    >
                        <Smartphone className="h-4 w-4 text-emerald-400" />
                        <span>Get TwinGenie on Google Play</span>
                    </a>
                    <Link
                        href="/compare"
                        className="px-4 py-3 text-xs font-medium text-[#E7C891] hover:underline"
                    >
                        Compare TwinGenie vs ChatGPT &rarr;
                    </Link>
                </section>
            </main>

            <SiteFooter />
        </div>
    )
}
