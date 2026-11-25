import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowLeft, ArrowRight, Check, MessageSquareText, Scale, Smartphone } from 'lucide-react'
import { PLAY_STORE_URL, SITE_URL, buildPageMetadata } from '@/lib/seo'

export const metadata: Metadata = buildPageMetadata({
    title: 'TwinGenie vs ChatGPT, Replika & Character.ai',
    description:
        'See side-by-side how TwinGenie replies across real human situations (relationships, tough choices, procrastination, boundaries, family expectations) and compares head-to-head with ChatGPT, Replika, and Character.ai.',
    path: '/compare',
    type: 'article',
    keywords: [
        'TwinGenie vs ChatGPT',
        'TwinGenie vs Replika',
        'TwinGenie vs Character.ai',
        'Replika alternative for self growth',
        'Character.ai alternative without roleplay',
        'honest AI digital twin app',
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

const RESPONSE_COMPARISON_ROWS = [
    {
        situation: 'Relationship & Mixed Signals',
        prompt: '"They left my message on read for 6 hours and I want to text something angry right now."',
        typicalReply:
            '"You deserve someone who values your time! Send whatever lets you express how you feel."',
        twinReply:
            'Honest Twin: "Sending anger right now isn’t clarity—it’s trying to force instant relief from uncertainty. Wait two hours, then name what you actually want instead of picking a fight."',
    },
    {
        situation: 'Hard Choice & Fear of Failing',
        prompt: '"I want to apply for a big change, so why do I keep making excuses to wait until next month?"',
        typicalReply:
            '"It’s totally okay to take your time! Preparation is important before any big step."',
        twinReply:
            'Future Twin: "Waiting for zero fear means nothing changes by next year. You aren’t preparing anymore—you’re stalling so you can avoid finding out how it goes. Ship one rough attempt today."',
    },
    {
        situation: 'Late-Night Overthinking & Habits',
        prompt: '"I promised myself I would sleep early and stay focused, yet I scrolled for 3 hours again."',
        typicalReply:
            '"Don’t be too hard on yourself! Try putting your phone across the room tomorrow night."',
        twinReply:
            'Honest Twin: "You reached for your feed the exact minute the room went quiet and uncomfortable thoughts showed up. What feeling were you trying not to sit with for five minutes?"',
    },
    {
        situation: 'Saying No & People-Pleasing',
        prompt: '"Someone close keeps asking for last-minute favors that drain me, and I feel guilty saying no."',
        typicalReply:
            '"Being kind is a wonderful trait! Maybe gently mention you’re a bit busy this week."',
        twinReply:
            'Reflective Coach: "Saying yes out of guilt doesn’t build trust—it quietly builds resentment. Whose momentary disappointment feels scarier to you than burning out your own weekend?"',
    },
    {
        situation: 'Family Pressure & Life Path',
        prompt: '"Everyone around me expects me to play it safe, and I’m exhausted pretending I agree."',
        typicalReply:
            '"Try having an open conversation with them when everyone is in a good mood!"',
        twinReply:
            'Normal Twin: "You’re carrying two jobs: living your own life and managing everyone else’s comfort with your choices. Let’s separate real financial risk from fear of letting people down."',
    },
]

const PLATFORM_COMPARISON_ROWS = [
    {
        dimension: 'Core Purpose',
        twingenie: 'Personal reflection, 4-perspective honesty, and personal growth built from your personality',
        chatgpt: 'General assistant for coding, research, writing, and Q&A',
        replika: 'Virtual companion focused on ongoing relationship / chat bonding',
        characterai: 'Roleplay and interactive chats with fictional or community personas',
    },
    {
        dimension: 'Setup Before First Chat',
        twingenie: 'Guided 35-question baseline across 5 screens (~3 mins) before your first conversation',
        chatgpt: 'Starts from an empty chat box; relies on manual prompts or saved snippets',
        replika: 'Avatar / relationship selection; learns organically through chat',
        characterai: 'Pick a user-created character card or write a persona prompt',
    },
    {
        dimension: 'Honest vs. Agreeable Style',
        twingenie: 'Dedicated Honest Twin & Future Twin modes built to challenge excuses alongside Reflective & Normal modes',
        chatgpt: 'Helpful, polite default unless explicitly prompted otherwise per session',
        replika: 'Supportive, empathetic companion style tailored toward rapport',
        characterai: 'In-character roleplay following the selected persona script',
    },
    {
        dimension: 'Memory & Growth Tracking',
        twingenie: 'Long-term memory paired with mood check-ins, daily challenges, insights, and Life Coach sprints',
        chatgpt: 'Cross-chat memory snippets for general facts and preferences',
        replika: 'Diary & companion memory notes around shared conversations',
        characterai: 'Per-chat character context window & pinned persona details',
    },
    {
        dimension: 'Data Control & Account Removal',
        twingenie: 'No public AI model training on private reflections; self-serve data & account deletion portals',
        chatgpt: 'Privacy / training toggle inside account settings by tier',
        replika: 'Account privacy & deletion managed in app settings',
        characterai: 'Account controls managed inside platform settings',
    },
    {
        dimension: 'Platforms & Free Access',
        twingenie: 'Web (www.twingenie.app) + Android (com.asmind.app); Free Starter ($0) + Pro $5.99/mo (₹499/mo)',
        chatgpt: 'Web / iOS / Android; Free tier + Plus ($20/mo) and higher tiers',
        replika: 'Web / iOS / Android; Free + Pro/Ultra paid subscriptions',
        characterai: 'Web / iOS / Android; Free ad-supported + c.ai+ subscription',
    },
]

export default function ComparePage() {
    return (
        <div className="min-h-screen text-white flex flex-col">
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
            />

            <header className="border-b border-white/10 bg-slate-900/60 backdrop-blur-md sticky top-0 z-50">
                <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
                    <Link href="/" className="flex items-center gap-3">
                        <img
                            src="/logo.png"
                            alt="TwinGenie"
                            className="w-9 h-9 rounded-xl object-cover shadow-md shadow-purple-500/20"
                        />
                        <span className="font-bold text-xl tracking-tight text-white">TwinGenie</span>
                    </Link>
                    <div className="flex items-center gap-3">
                        <Link
                            href="/login"
                            className="hidden sm:inline-flex text-sm text-gray-300 hover:text-white px-3 py-1.5"
                        >
                            Sign In
                        </Link>
                        <Link
                            href="/"
                            className="inline-flex items-center gap-2 text-sm text-gray-300 hover:text-white px-3 py-1.5 rounded-lg border border-white/10 hover:bg-white/5"
                        >
                            <ArrowLeft className="w-4 h-4" />
                            <span>Home</span>
                        </Link>
                    </div>
                </div>
            </header>

            <main className="flex-1 mx-auto w-full max-w-6xl px-4 sm:px-6 py-12 space-y-14">
                <header className="space-y-4 border-b border-white/10 pb-8">
                    <div className="inline-flex items-center gap-2 rounded-full border border-purple-500/30 bg-purple-500/15 px-3 py-1 text-xs font-medium text-purple-200">
                        <Scale className="h-3.5 w-3.5 text-purple-300" />
                        Side-by-Side Guide
                    </div>
                    <h1 className="text-3xl font-bold tracking-tight sm:text-5xl">
                        Real clarity, not AI flattery —{' '}
                        <span className="gradient-text block mt-1">
                            TwinGenie vs. ChatGPT, Replika &amp; Character.ai
                        </span>
                    </h1>
                    <p className="max-w-3xl text-sm leading-relaxed text-gray-300 sm:text-base">
                        Most AI apps either cheer you on no matter what or ask you to write prompts
                        from scratch. See how TwinGenie responds across everyday human situations,
                        followed by a straightforward platform comparison.
                    </p>
                </header>

                {/* TABLE 1: Everyday Situational Reply Comparison */}
                <section className="space-y-4">
                    <div className="space-y-2">
                        <div className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-purple-300">
                            <MessageSquareText className="h-4 w-4" />
                            <span>1. Everyday Situation Replies (Illustrative Style Comparison)</span>
                        </div>
                        <h2 className="text-2xl sm:text-3xl font-bold">
                            Agreeable comfort vs. TwinGenie&apos;s honest clarity
                        </h2>
                        <p className="text-xs sm:text-sm text-gray-400">
                            Illustrative examples showing how typical polite chatbot patterns compare
                            to TwinGenie&apos;s four perspective modes across common life moments.
                        </p>
                    </div>

                    <div className="glass-card overflow-x-auto">
                        <table className="w-full min-w-[780px] border-collapse text-left text-xs sm:text-sm">
                            <thead>
                                <tr className="border-b border-white/15 bg-black/30 text-xs uppercase tracking-wider">
                                    <th className="p-4 text-gray-300 w-[18%]">Life Situation</th>
                                    <th className="p-4 text-gray-300 w-[24%]">What You Share</th>
                                    <th className="p-4 text-gray-300 w-[26%]">Typical Flattering Chatbot Style</th>
                                    <th className="p-4 text-purple-300 w-[32%]">TwinGenie Perspective Style</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/10">
                                {RESPONSE_COMPARISON_ROWS.map((row) => (
                                    <tr key={row.situation} className="align-top">
                                        <td className="p-4 font-semibold text-white">{row.situation}</td>
                                        <td className="p-4 text-gray-300 italic">{row.prompt}</td>
                                        <td className="p-4 text-gray-400">{row.typicalReply}</td>
                                        <td className="p-4 text-white bg-purple-600/10 leading-relaxed">
                                            {row.twinReply}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </section>

                {/* TABLE 2: Head-to-Head Platform Comparison */}
                <section className="space-y-4">
                    <div className="space-y-2">
                        <div className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-purple-300">
                            <Scale className="h-4 w-4" />
                            <span>2. Head-to-Head Platform Overview</span>
                        </div>
                        <h2 className="text-2xl sm:text-3xl font-bold">
                            TwinGenie vs. ChatGPT, Replika &amp; Character.ai
                        </h2>
                        <p className="text-xs sm:text-sm text-gray-400">
                            Every tool has a different strength. Use this factual breakdown to pick what
                            fits what you actually need.
                        </p>
                    </div>

                    <div className="glass-card overflow-x-auto">
                        <table className="w-full min-w-[860px] border-collapse text-left text-xs sm:text-sm">
                            <thead>
                                <tr className="border-b border-white/15 bg-black/30 text-xs uppercase tracking-wider">
                                    <th className="p-4 text-gray-300">Feature</th>
                                    <th className="p-4 text-purple-300">TwinGenie</th>
                                    <th className="p-4 text-gray-300">ChatGPT</th>
                                    <th className="p-4 text-gray-300">Replika</th>
                                    <th className="p-4 text-gray-300">Character.ai</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/10">
                                {PLATFORM_COMPARISON_ROWS.map((row) => (
                                    <tr key={row.dimension} className="align-top">
                                        <td className="p-4 font-semibold text-white">{row.dimension}</td>
                                        <td className="p-4 text-white bg-purple-600/10">
                                            <span className="inline-flex items-start gap-2">
                                                <Check className="mt-0.5 h-4 w-4 shrink-0 text-green-400" />
                                                <span>{row.twingenie}</span>
                                            </span>
                                        </td>
                                        <td className="p-4 text-gray-300">{row.chatgpt}</td>
                                        <td className="p-4 text-gray-300">{row.replika}</td>
                                        <td className="p-4 text-gray-300">{row.characterai}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    <p className="text-[11px] text-gray-400 leading-relaxed">
                        Comparative note: ChatGPT is a trademark of OpenAI, Replika is a trademark of
                        Luka, Inc., and Character.ai is a trademark of Character Technologies, Inc.
                        All product names belong to their respective owners. TwinGenie is an
                        independent application and is not affiliated with or endorsed by those companies.
                    </p>
                </section>

                <section className="flex flex-wrap gap-4 items-center">
                    <Link
                        href="/onboarding"
                        className="inline-flex items-center gap-2 px-7 py-3.5 rounded-2xl bg-gradient-to-r from-purple-600 to-pink-600 font-semibold text-white shadow-lg shadow-purple-500/25 hover:scale-105 transition-all"
                    >
                        <span>Create Your Twin (35 Quick Questions)</span>
                        <ArrowRight className="h-4 w-4" />
                    </Link>
                    <Link href="/test" className="glass-button text-sm">
                        Try 30s Self Diagnostic
                    </Link>
                    <a
                        href={PLAY_STORE_URL}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 text-sm text-purple-300 hover:text-white px-3 py-2"
                    >
                        <Smartphone className="h-4 w-4" />
                        <span>Google Play App</span>
                    </a>
                </section>
            </main>
        </div>
    )
}
