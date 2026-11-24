import Link from 'next/link'
import { ShieldCheck, Smartphone } from 'lucide-react'
import BrandMark from './BrandMark'

const PLAY_STORE_URL =
    process.env.NEXT_PUBLIC_PLAY_STORE_URL ||
    'https://play.google.com/store/apps/details?id=com.asmind.app'

export default function SiteFooter() {
    return (
        <footer className="relative z-10 border-t border-white/[0.08] bg-[#07080B] text-sm">
            <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
                <div className="grid grid-cols-1 gap-10 md:grid-cols-2 lg:grid-cols-5">
                    <div className="space-y-4 lg:col-span-2">
                        <BrandMark size="md" />
                        <p className="max-w-sm text-xs leading-relaxed text-neutral-400">
                            Psychometric digital twin platform engineered for non-sycophantic cognitive reflection,
                            longitudinal vector memory, and guided emotional resilience.
                        </p>
                        <div className="inline-flex items-center gap-2 rounded-lg border border-emerald-500/20 bg-emerald-500/[0.06] px-3 py-1.5 text-[11px] font-medium text-emerald-300">
                            <ShieldCheck className="h-3.5 w-3.5 shrink-0" />
                            <span>TLS 1.3 + Row-Level Security • Zero Model Training on Private Journals</span>
                        </div>
                    </div>

                    <div className="space-y-3">
                        <div className="font-mono text-[11px] font-semibold uppercase tracking-wider text-neutral-300">
                            Platform
                        </div>
                        <ul className="space-y-2.5 text-xs text-neutral-400">
                            <li>
                                <Link href="/#perspectives" className="transition-colors hover:text-[#F4F2EC]">
                                    4 Twin Perspectives
                                </Link>
                            </li>
                            <li>
                                <Link href="/#engine" className="transition-colors hover:text-[#F4F2EC]">
                                    35-Trait Assessment
                                </Link>
                            </li>
                            <li>
                                <Link href="/#programs" className="transition-colors hover:text-[#F4F2EC]">
                                    Guided Coaching
                                </Link>
                            </li>
                            <li>
                                <Link href="/#architecture" className="transition-colors hover:text-[#F4F2EC]">
                                    Architecture &amp; Security
                                </Link>
                            </li>
                            <li>
                                <Link href="/subscription" className="transition-colors hover:text-[#F4F2EC]">
                                    Pricing &amp; Plans
                                </Link>
                            </li>
                        </ul>
                    </div>

                    <div className="space-y-3">
                        <div className="font-mono text-[11px] font-semibold uppercase tracking-wider text-neutral-300">
                            Access
                        </div>
                        <ul className="space-y-2.5 text-xs text-neutral-400">
                            <li>
                                <Link href="/onboarding" className="transition-colors hover:text-[#F4F2EC]">
                                    Start 35-Question Calibration
                                </Link>
                            </li>
                            <li>
                                <Link href="/test" className="transition-colors hover:text-[#F4F2EC]">
                                    3-Step Cognitive Diagnostic
                                </Link>
                            </li>
                            <li>
                                <Link href="/login" className="transition-colors hover:text-[#F4F2EC]">
                                    Sign in to Web Workspace
                                </Link>
                            </li>
                            <li>
                                <a
                                    href={PLAY_STORE_URL}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-1.5 text-emerald-400 transition-colors hover:text-emerald-300"
                                >
                                    <Smartphone className="h-3.5 w-3.5" />
                                    <span>Android (Google Play)</span>
                                </a>
                            </li>
                        </ul>
                    </div>

                    <div className="space-y-3">
                        <div className="font-mono text-[11px] font-semibold uppercase tracking-wider text-neutral-300">
                            Governance &amp; Legal
                        </div>
                        <ul className="space-y-2.5 text-xs text-neutral-400">
                            <li>
                                <Link href="/privacy" className="transition-colors hover:text-[#F4F2EC]">
                                    Privacy Policy
                                </Link>
                            </li>
                            <li>
                                <Link href="/terms" className="transition-colors hover:text-[#F4F2EC]">
                                    Terms of Service
                                </Link>
                            </li>
                            <li>
                                <Link href="/delete-account" className="transition-colors hover:text-[#F4F2EC]">
                                    Account Deletion
                                </Link>
                            </li>
                            <li>
                                <Link href="/delete-data" className="transition-colors hover:text-[#F4F2EC]">
                                    Data Deletion Request
                                </Link>
                            </li>
                            <li>
                                <a
                                    href="mailto:support@twingenie.app"
                                    className="transition-colors hover:text-[#E7C891]"
                                >
                                    support@twingenie.app
                                </a>
                            </li>
                            <li>
                                <a
                                    href="mailto:founder@twingenie.app"
                                    className="transition-colors hover:text-[#E7C891]"
                                >
                                    founder@twingenie.app
                                </a>
                            </li>
                        </ul>
                    </div>
                </div>

                <div className="mt-12 flex flex-col items-start justify-between gap-4 border-t border-white/[0.08] pt-8 text-xs text-neutral-500 sm:flex-row sm:items-center">
                    <p>© {new Date().getFullYear()} TwinGenie. Founded by Ashwani Kumar. All rights reserved.</p>
                    <p className="text-neutral-500">
                        Live on Web &amp; Google Play (<span className="font-mono text-neutral-400">com.asmind.app</span>)
                    </p>
                </div>
            </div>
        </footer>
    )
}
