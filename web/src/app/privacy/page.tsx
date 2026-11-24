'use client'

import Link from 'next/link'
import { Shield, Lock, FileText, Mail } from 'lucide-react'
import SiteHeader from '@/components/Layout/SiteHeader'
import SiteFooter from '@/components/Layout/SiteFooter'

export default function PrivacyPolicy() {
    return (
        <div className="min-h-screen bg-[#07080B] text-neutral-200 flex flex-col">
            <SiteHeader />

            <main className="flex-1 mx-auto w-full max-w-4xl px-4 py-14 sm:px-6 space-y-10">
                <div className="space-y-4 border-b border-white/[0.08] pb-8">
                    <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/25 bg-emerald-500/10 px-3 py-1 font-mono text-[11px] font-medium uppercase tracking-wider text-emerald-300">
                        <Shield className="h-3.5 w-3.5" />
                        Official Legal Document
                    </div>
                    <h1 className="text-3xl font-semibold tracking-tight text-[#F4F2EC] sm:text-4xl">
                        Privacy Policy
                    </h1>
                    <p className="font-mono text-xs text-neutral-500">
                        Effective Date: November 2, 2026 • Last Reviewed: November 2026
                    </p>
                </div>

                <section className="space-y-3">
                    <h2 className="flex items-center gap-2 text-lg font-semibold text-[#F4F2EC]">
                        <FileText className="h-4 w-4 text-[#D9A760]" />
                        1. Introduction &amp; Company Identity
                    </h2>
                    <p className="text-sm leading-relaxed text-neutral-300 sm:text-base">
                        TwinGenie (&quot;we&quot;, &quot;our&quot;, &quot;us&quot;), founded by Ashwani Kumar,
                        operates <span className="text-[#E7C891]">https://twingenie.app</span> and the TwinGenie
                        mobile application on Google Play (<code className="font-mono text-xs">com.asmind.app</code>).
                        Our architecture is built around private, self-directed personal reflection. This Privacy Policy
                        details the standards we apply to collect, protect, process, and govern your personal data.
                    </p>
                </section>

                <section className="space-y-3">
                    <h2 className="flex items-center gap-2 text-lg font-semibold text-[#F4F2EC]">
                        <Lock className="h-4 w-4 text-[#D9A760]" />
                        2. Information We Collect
                    </h2>
                    <p className="text-sm leading-relaxed text-neutral-300 sm:text-base">
                        We collect only the information strictly required to operate personalized digital twin
                        reflection and preserve account integrity:
                    </p>
                    <ul className="list-disc space-y-2.5 pl-6 text-sm leading-relaxed text-neutral-300 sm:text-base">
                        <li>
                            <strong className="text-white">Account Information:</strong> Name, verified email address,
                            and authentication credentials managed via Supabase OAuth/Auth.
                        </li>
                        <li>
                            <strong className="text-white">Psychometric &amp; Reflection Data:</strong> Responses to our
                            35-question personality assessment, self-reflection entries, conversational messages across AI
                            Twin perspectives, and journal notes.
                        </li>
                        <li>
                            <strong className="text-white">Semantic Vector Memory:</strong> Mathematical embedding
                            representations stored in isolated vector namespaces to enable continuity across sessions.
                        </li>
                        <li>
                            <strong className="text-white">Billing Data:</strong> Subscriptions are processed through
                            Google Play Billing. TwinGenie does not receive or store raw payment card or bank details;
                            only subscription entitlement tokens are verified.
                        </li>
                        <li>
                            <strong className="text-white">Diagnostic Telemetry:</strong> IP address, device model,
                            operating system version, and error logs used strictly for uptime and security.
                        </li>
                    </ul>
                </section>

                <section className="space-y-3">
                    <h2 className="text-lg font-semibold text-[#F4F2EC]">3. How We Use Your Data</h2>
                    <ul className="list-disc space-y-2 pl-6 text-sm leading-relaxed text-neutral-300 sm:text-base">
                        <li>Generate and calibrate your 35-trait digital twin perspectives.</li>
                        <li>Maintain private conversational continuity across devices.</li>
                        <li>Calculate growth insights, reflection streaks, and emotional telemetry.</li>
                        <li>Authenticate sessions and defend infrastructure against unauthorized access.</li>
                    </ul>
                    <div className="enterprise-panel border-emerald-500/25 bg-emerald-500/[0.05] p-4 text-sm text-emerald-100">
                        <strong className="text-emerald-300">Zero Third-Party Training:</strong> We do not sell
                        personal reflection journals, psychometric profiles, or chat histories to data brokers,
                        advertisers, or third parties for training public foundation models.
                    </div>
                </section>

                <section className="space-y-3">
                    <h2 className="text-lg font-semibold text-[#F4F2EC]">4. Security &amp; Data Governance</h2>
                    <ul className="list-disc space-y-2 pl-6 text-sm leading-relaxed text-neutral-300 sm:text-base">
                        <li>
                            <strong className="text-white">Data in Transit:</strong> Encrypted via TLS 1.3 / HTTPS across
                            all web, mobile, and API traffic.
                        </li>
                        <li>
                            <strong className="text-white">Data at Rest:</strong> Hosted in Supabase-managed PostgreSQL
                            clusters protected by Row-Level Security (RLS) policies and volume encryption.
                        </li>
                        <li>
                            <strong className="text-white">Enterprise Model Processing:</strong> Commercial inference
                            endpoints process queries under terms prohibiting training on customer inputs.
                        </li>
                    </ul>
                </section>

                <section className="space-y-3">
                    <h2 className="text-lg font-semibold text-[#F4F2EC]">5. Your Rights &amp; Self-Serve Deletion</h2>
                    <ul className="list-disc space-y-2 pl-6 text-sm leading-relaxed text-neutral-300 sm:text-base">
                        <li>
                            <strong className="text-white">Access:</strong> Review stored conversations and memories
                            anytime inside TwinGenie.
                        </li>
                        <li>
                            <strong className="text-white">Deletion:</strong> Permanently erase your account via{' '}
                            <Link href="/delete-account" className="text-[#E7C891] hover:underline">
                                Account Deletion
                            </Link>
                            , or clear specific categories via{' '}
                            <Link href="/delete-data" className="text-[#E7C891] hover:underline">
                                Data Deletion
                            </Link>
                            .
                        </li>
                        <li>
                            <strong className="text-white">Retention:</strong> Associated vectors and personality records
                            are deleted within 30 days of verified account erasure requests (backups rotate within 90 days).
                        </li>
                    </ul>
                </section>

                <section className="space-y-3">
                    <h2 className="flex items-center gap-2 text-lg font-semibold text-[#F4F2EC]">
                        <Mail className="h-4 w-4 text-[#D9A760]" />
                        6. Contact &amp; Legal Entity
                    </h2>
                    <div className="enterprise-panel space-y-2 p-5 text-sm text-neutral-300">
                        <p>
                            <strong className="text-white">Organization:</strong> TwinGenie
                        </p>
                        <p>
                            <strong className="text-white">Founder:</strong> Ashwani Kumar
                        </p>
                        <p>
                            <strong className="text-white">Legal Desk:</strong>{' '}
                            <a href="mailto:founder@twingenie.app" className="text-[#E7C891] hover:underline">
                                founder@twingenie.app
                            </a>
                        </p>
                        <p>
                            <strong className="text-white">Support:</strong>{' '}
                            <a href="mailto:support@twingenie.app" className="text-[#E7C891] hover:underline">
                                support@twingenie.app
                            </a>
                        </p>
                        <p>
                            <strong className="text-white">Domain:</strong>{' '}
                            <a href="https://twingenie.app" className="text-[#E7C891] hover:underline">
                                https://twingenie.app
                            </a>
                        </p>
                    </div>
                </section>
            </main>

            <SiteFooter />
        </div>
    )
}
