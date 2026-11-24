'use client'

import Link from 'next/link'
import { FileCheck, CreditCard, Mail } from 'lucide-react'
import SiteHeader from '@/components/Layout/SiteHeader'
import SiteFooter from '@/components/Layout/SiteFooter'

export default function TermsOfService() {
    return (
        <div className="min-h-screen bg-[#07080B] text-neutral-200 flex flex-col">
            <SiteHeader />

            <main className="flex-1 mx-auto w-full max-w-4xl px-4 py-14 sm:px-6 space-y-10">
                <div className="space-y-4 border-b border-white/[0.08] pb-8">
                    <div className="inline-flex items-center gap-2 rounded-full border border-sky-500/25 bg-sky-500/10 px-3 py-1 font-mono text-[11px] font-medium uppercase tracking-wider text-sky-300">
                        <FileCheck className="h-3.5 w-3.5" />
                        Terms of Service &amp; User Agreement
                    </div>
                    <h1 className="text-3xl font-semibold tracking-tight text-[#F4F2EC] sm:text-4xl">
                        Terms of Service
                    </h1>
                    <p className="font-mono text-xs text-neutral-500">
                        Effective Date: November 2, 2026 • Last Reviewed: November 2026
                    </p>
                </div>

                <section className="space-y-3">
                    <h2 className="text-lg font-semibold text-[#F4F2EC]">1. Acceptance of Terms</h2>
                    <p className="text-sm leading-relaxed text-neutral-300 sm:text-base">
                        By accessing or using TwinGenie (<span className="text-[#E7C891]">https://twingenie.app</span>),
                        the web application, or the TwinGenie mobile application on Google Play, you agree to be bound
                        by these Terms of Service. If you do not agree, do not access or use the service.
                    </p>
                </section>

                <section className="space-y-3">
                    <h2 className="text-lg font-semibold text-[#F4F2EC]">
                        2. Nature of Service &amp; Non-Clinical Notice
                    </h2>
                    <p className="text-sm leading-relaxed text-neutral-300 sm:text-base">
                        TwinGenie provides an AI-powered platform for structured self-reflection, psychometric exploration,
                        habit tracking, and personal clarity.
                    </p>
                    <div className="enterprise-panel border-amber-500/30 bg-amber-500/[0.06] p-4 text-sm text-amber-100">
                        <strong className="text-amber-300">Important Medical Notice:</strong> TwinGenie is not a
                        licensed mental health provider, clinical healthcare entity, or medical diagnostic device.
                        Reflective and Coaching modes are conversational reflection tools and do not replace licensed
                        psychiatric therapy or medical crisis care. If you face an emergency, contact local emergency
                        services or crisis hotlines immediately.
                    </div>
                </section>

                <section className="space-y-3">
                    <h2 className="text-lg font-semibold text-[#F4F2EC]">3. Accounts &amp; Responsibilities</h2>
                    <ul className="list-disc space-y-2 pl-6 text-sm leading-relaxed text-neutral-300 sm:text-base">
                        <li>Provide accurate registration credentials and protect account access.</li>
                        <li>Comply with applicable local, national, and international laws.</li>
                        <li>Notify us promptly if you suspect unauthorized access to your account.</li>
                    </ul>
                </section>

                <section className="space-y-3">
                    <h2 className="flex items-center gap-2 text-lg font-semibold text-[#F4F2EC]">
                        <CreditCard className="h-4 w-4 text-emerald-400" />
                        4. Subscriptions &amp; Billing
                    </h2>
                    <ul className="list-disc space-y-2 pl-6 text-sm leading-relaxed text-neutral-300 sm:text-base">
                        <li>
                            <strong className="text-white">Google Play Billing:</strong> Premium subscriptions on launch
                            are processed through Google Play Billing (<code className="font-mono text-xs">com.asmind.app</code>).
                        </li>
                        <li>
                            <strong className="text-white">Renewal:</strong> Paid plans renew automatically unless
                            cancelled at least 24 hours prior to renewal inside Google Play settings.
                        </li>
                        <li>
                            <strong className="text-white">Cancellations &amp; Refunds:</strong> Manage plans or
                            request refunds directly under Google Play&apos;s billing policies.
                        </li>
                    </ul>
                </section>

                <section className="space-y-3">
                    <h2 className="text-lg font-semibold text-[#F4F2EC]">5. Intellectual Property &amp; User Content</h2>
                    <p className="text-sm leading-relaxed text-neutral-300 sm:text-base">
                        <strong className="text-white">Your Content:</strong> You retain full ownership of journal
                        entries, voice inputs, and reflections you submit, granting TwinGenie strictly the operational
                        license necessary to store and display your workspace back to you.
                    </p>
                    <p className="text-sm leading-relaxed text-neutral-300 sm:text-base">
                        <strong className="text-white">Platform IP:</strong> TwinGenie codebases, scoring architectures,
                        user interfaces, and trademarks remain the exclusive intellectual property of TwinGenie.
                    </p>
                </section>

                <section className="space-y-3">
                    <h2 className="text-lg font-semibold text-[#F4F2EC]">6. Prohibited Conduct</h2>
                    <p className="text-sm leading-relaxed text-neutral-300 sm:text-base">
                        Users may not reverse engineer platform systems, bypass authentication or quota controls,
                        attempt unauthorized extraction of model prompts or database vectors, or upload unlawful content.
                    </p>
                </section>

                <section className="space-y-3">
                    <h2 className="flex items-center gap-2 text-lg font-semibold text-[#F4F2EC]">
                        <Mail className="h-4 w-4 text-[#D9A760]" />
                        7. Contact &amp; Notices
                    </h2>
                    <div className="enterprise-panel space-y-2 p-5 text-sm text-neutral-300">
                        <p>
                            <strong className="text-white">Organization:</strong> TwinGenie (Founder: Ashwani Kumar)
                        </p>
                        <p>
                            <strong className="text-white">Legal &amp; Support:</strong>{' '}
                            <a href="mailto:founder@twingenie.app" className="text-[#E7C891] hover:underline">
                                founder@twingenie.app
                            </a>{' '}
                            •{' '}
                            <a href="mailto:support@twingenie.app" className="text-[#E7C891] hover:underline">
                                support@twingenie.app
                            </a>
                        </p>
                        <p>
                            <strong className="text-white">Privacy Policy:</strong>{' '}
                            <Link href="/privacy" className="text-[#E7C891] hover:underline">
                                https://twingenie.app/privacy
                            </Link>
                        </p>
                    </div>
                </section>
            </main>

            <SiteFooter />
        </div>
    )
}
