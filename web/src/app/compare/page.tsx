import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowRight, Check, Scale, Smartphone } from 'lucide-react'
import SiteHeader from '@/components/Layout/SiteHeader'
import SiteFooter from '@/components/Layout/SiteFooter'
import { PLAY_STORE_URL, SITE_URL, buildPageMetadata } from '@/lib/seo'

export const metadata: Metadata = buildPageMetadata({
    title: 'TwinGenie vs ChatGPT, Pi, and AI Companions',
    description:
        'Side-by-side comparison of TwinGenie against general chatbots (ChatGPT, Gemini) and AI companion apps for psychometric onboarding, anti-sycophancy feedback, pgvector memory, and privacy.',
    path: '/compare',
    type: 'article',
    keywords: [
        'TwinGenie vs ChatGPT',
        'best non-sycophantic AI companion',
        'AI digital twin app comparison',
        'psychometric AI vs Replika Pi',
    ],
})

const breadcrumbJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'TwinGenie', item: `${SITE_URL}/` },
        { '@type': 'ListItem', position: 2, name: 'Compare', item: `${SITE_URL}/compare` },
    ],
}

const COMPARISON_ROWS = [
    {
        dimension: 'Onboarding Calibration',
        twingenie: 'Required 35-question 5-screen psychometric assessment scoring Big Five & decision style',
        general: 'Blank prompt; user must manually re-explain context and personality',
        roleplay: 'Persona/avatar selection without structured behavioral scoring',
    },
    {
        dimension: 'Anti-Sycophancy Feedback',
        twingenie: 'Dedicated Honest Twin & Future Twin modes built to challenge excuses and blindspots',
        general: 'Default RLHF agreement bias often validates user framing',
        roleplay: 'Optimized for emotional immersion, romance, or fictional companionship',
    },
    {
        dimension: 'Longitudinal Memory',
        twingenie: '1536-dim PostgreSQL pgvector memory scoped per user via Row-Level Security (RLS)',
        general: 'Short preference snippets / session-limited context windows',
        roleplay: 'Character lore cards & episodic chat logs',
    },
    {
        dimension: 'Guided Personal Growth',
        twingenie: 'Multi-day Life Coach sprints (Anxiety Reset, Confidence), Year-in-Pixels & mood logs',
        general: 'Unstructured ad-hoc prompts unless user builds custom workflows',
        roleplay: 'Primarily open-ended roleplay dialogue',
    },
    {
        dimension: 'Data Sovereignty & Deletion',
        twingenie: 'Zero public model training; self-serve slice erasure (/delete-data) & account deletion',
        general: 'Varies by plan; users must check opt-out settings per provider',
        roleplay: 'Varies by app; many consumer companions monetize via engagement hooks',
    },
    {
        dimension: 'Platforms & Free Tier',
        twingenie: 'Web + Android (com.asmind.app) synced; $0 Free Starter, Pro $5.99/mo',
        general: 'Web/iOS/Android; Plus tiers typically ~$20/month',
        roleplay: 'Mobile/Web subscription tiers varying by app',
    },
]

export default function ComparePage() {
    return (
        <div className="min-h-screen bg-[#07080B] text-[#F4F2EC] flex flex-col">
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
            />
            <SiteHeader />

            <main className="flex-1 mx-auto w-full max-w-6xl px-4 py-14 sm:px-6 lg:px-8 space-y-12">
                <header className="space-y-4 border-b border-white/[0.08] pb-10">
                    <div className="inline-flex items-center gap-2 rounded-full border border-[#D9A760]/30 bg-[#D9A760]/10 px-3 py-1 font-mono text-[11px] uppercase tracking-wider text-[#E7C891]">
                        <Scale className="h-3.5 w-3.5" />
                        Objective Platform Comparison
                    </div>
                    <h1 className="text-3xl font-semibold tracking-tight sm:text-5xl">
                        TwinGenie vs. general chatbots &amp; roleplay AI companions.
                    </h1>
                    <p className="max-w-3xl text-sm leading-relaxed text-neutral-300 sm:text-base">
                        General AI assistants excel at coding, research, and drafting. AI roleplay apps
                        focus on entertainment. TwinGenie is purpose-built for structured personal
                        clarity—combining a 35-trait psychometric baseline with persistent pgvector memory
                        and anti-sycophancy perspective switching.
                    </p>
                </header>

                <section className="enterprise-panel overflow-x-auto">
                    <table className="w-full min-w-[720px] border-collapse text-left text-xs sm:text-sm">
                        <thead>
                            <tr className="border-b border-white/[0.08] bg-[#0B0D12] font-mono text-[11px] uppercase tracking-wider">
                                <th className="p-4 text-neutral-400">Capability</th>
                                <th className="p-4 text-[#E7C891]">TwinGenie</th>
                                <th className="p-4 text-neutral-300">General AI (ChatGPT / Gemini)</th>
                                <th className="p-4 text-neutral-300">Companion / Roleplay Apps</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/[0.07]">
                            {COMPARISON_ROWS.map((row) => (
                                <tr key={row.dimension} className="align-top">
                                    <td className="p-4 font-semibold text-[#F4F2EC]">{row.dimension}</td>
                                    <td className="p-4 text-[#F4F2EC] bg-[#D9A760]/[0.04]">
                                        <span className="inline-flex items-start gap-2">
                                            <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
                                            <span>{row.twingenie}</span>
                                        </span>
                                    </td>
                                    <td className="p-4 text-neutral-400">{row.general}</td>
                                    <td className="p-4 text-neutral-400">{row.roleplay}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </section>

                <section className="grid gap-6 md:grid-cols-2">
                    <article className="enterprise-panel p-6 sm:p-7 space-y-3">
                        <h2 className="text-xl font-semibold text-[#E7C891]">
                            Choose TwinGenie when you want:
                        </h2>
                        <ul className="space-y-2.5 text-sm text-neutral-300">
                            <li>• Direct reality checks from an Honest Twin that challenges blindspots.</li>
                            <li>• Behavioral calibration via a structured 35-question onboarding test.</li>
                            <li>• Continuous personal reflection across Web and Google Play Android.</li>
                            <li>• Guided multi-day clarity sprints instead of blank prompt guesswork.</li>
                        </ul>
                    </article>

                    <article className="enterprise-panel p-6 sm:p-7 space-y-3">
                        <h2 className="text-xl font-semibold text-neutral-200">
                            Choose a general chatbot when you want:
                        </h2>
                        <ul className="space-y-2.5 text-sm text-neutral-400">
                            <li>• Code generation, spreadsheet formulas, web search, or academic drafting.</li>
                            <li>• Broad multimodal productivity across spreadsheets, documents, and coding IDEs.</li>
                            <li>• One-off technical tasks rather than longitudinal behavioral reflection.</li>
                        </ul>
                    </article>
                </section>

                <section className="flex flex-col gap-3 sm:flex-row sm:items-center">
                    <Link href="/test" className="btn-primary-ivory px-6 py-3.5 text-sm">
                        <span>Try the 3-Step Cognitive Diagnostic</span>
                        <ArrowRight className="h-4 w-4" />
                    </Link>
                    <Link href="/onboarding" className="btn-secondary-obsidian px-5 py-3.5 text-sm">
                        <span>Start Full 35-Trait Assessment</span>
                    </Link>
                    <a
                        href={PLAY_STORE_URL}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 px-4 py-3 text-xs font-medium text-emerald-400 hover:underline"
                    >
                        <Smartphone className="h-4 w-4" />
                        <span>Install on Google Play</span>
                    </a>
                </section>
            </main>

            <SiteFooter />
        </div>
    )
}
