'use client'

import Link from 'next/link'
import { Brain, ArrowLeft, Shield, Lock, FileText, Mail } from 'lucide-react'

export default function PrivacyPolicy() {
    return (
        <div className="min-h-screen bg-slate-950 text-gray-200">
            {/* Header */}
            <header className="border-b border-white/10 bg-slate-900/60 backdrop-blur-md sticky top-0 z-50">
                <div className="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between">
                    <Link href="/" className="flex items-center gap-3 group">
                        <div className="w-9 h-9 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl flex items-center justify-center shadow-lg shadow-purple-500/20">
                            <Brain className="w-5 h-5 text-white" />
                        </div>
                        <span className="font-bold text-xl tracking-tight text-white group-hover:text-purple-300 transition-colors">
                            TwinGenie
                        </span>
                    </Link>

                    <Link
                        href="/"
                        className="inline-flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors px-3 py-1.5 rounded-lg border border-white/10 hover:bg-white/5"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        Back to Home
                    </Link>
                </div>
            </header>

            {/* Content */}
            <main className="max-w-4xl mx-auto px-6 py-12 space-y-10">
                <div className="space-y-4 border-b border-white/10 pb-8">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-300 text-xs font-medium">
                        <Shield className="w-3.5 h-3.5" />
                        Official Legal Document
                    </div>
                    <h1 className="text-4xl font-extrabold text-white tracking-tight">Privacy Policy</h1>
                    <p className="text-gray-400 text-sm">
                        Effective Date: November 2, 2026 • Last Reviewed: November 2026
                    </p>
                </div>

                <section className="space-y-4">
                    <h2 className="text-xl font-bold text-white flex items-center gap-2">
                        <FileText className="w-5 h-5 text-purple-400" />
                        1. Introduction & Company Identity
                    </h2>
                    <p className="text-gray-300 leading-relaxed">
                        TwinGenie ("we", "our", "us"), founded by Ashwani Kumar, operates <span className="text-purple-300">https://twingenie.app</span> and the TwinGenie mobile application on Google Play. Our core philosophy is built on private, self-directed personal reflection. We believe personal introspection requires uncompromising privacy. This Privacy Policy details the strict standards we apply to collect, protect, process, and respect your personal information.
                    </p>
                </section>

                <section className="space-y-4">
                    <h2 className="text-xl font-bold text-white flex items-center gap-2">
                        <Lock className="w-5 h-5 text-pink-400" />
                        2. Information We Collect
                    </h2>
                    <p className="text-gray-300 leading-relaxed">
                        We only collect the minimum information strictly required to deliver personalized AI reflection and maintain account integrity:
                    </p>
                    <ul className="list-disc pl-6 space-y-2 text-gray-300">
                        <li>
                            <strong className="text-white">Account Information:</strong> Name, verified email address, authentication credentials handled through secure OAuth/Supabase identity providers.
                        </li>
                        <li>
                            <strong className="text-white">Psychometric & Reflection Data:</strong> Responses to personality questionnaire prompts, self-reflection entries, conversational dialogue with your AI Twin modes, and user-initiated journal notes.
                        </li>
                        <li>
                            <strong className="text-white">Semantic Vector Memory:</strong> Mathematical embedding representations of your conversations stored in secure vector databases to enable contextual continuity across interactions.
                        </li>
                        <li>
                            <strong className="text-white">Payment & Billing Data:</strong> Premium subscriptions are processed through Google Play Billing. TwinGenie does not receive or store your raw payment card or banking details. We only receive subscription entitlement tokens.
                        </li>
                        <li>
                            <strong className="text-white">Technical Diagnostic Data:</strong> IP address, device model, operating system version, and application performance logs to detect errors and improve platform latency.
                        </li>
                    </ul>
                </section>

                <section className="space-y-4">
                    <h2 className="text-xl font-bold text-white">3. How We Use Your Data</h2>
                    <p className="text-gray-300 leading-relaxed">We use your information exclusively to:</p>
                    <ul className="list-disc pl-6 space-y-2 text-gray-300">
                        <li>Generate and tailor your personal digital twin perspectives (Normal, Future, Honest, Therapist).</li>
                        <li>Maintain private conversational memory across sessions.</li>
                        <li>Calculate personal growth insights, habit streaks, and mood trends.</li>
                        <li>Authenticate accounts and secure system infrastructure against unauthorized intrusion.</li>
                        <li>Communicate important product announcements, security notices, and feature releases.</li>
                    </ul>
                    <div className="p-4 rounded-xl bg-purple-950/40 border border-purple-500/30 text-purple-200 text-sm">
                        <strong>Zero Third-Party Training:</strong> We do NOT sell your personal reflection journals, personality profiles, or chat data to data brokers, advertisers, or third-party AI companies for training foundational models.
                    </div>
                </section>

                <section className="space-y-4">
                    <h2 className="text-xl font-bold text-white">4. Data Security & Storage</h2>
                    <p className="text-gray-300 leading-relaxed">
                        We apply verified technical controls across our cloud architecture:
                    </p>
                    <ul className="list-disc pl-6 space-y-2 text-gray-300">
                        <li><strong>Data in Transit:</strong> Encrypted using TLS 1.3 / HTTPS across all API and web interactions.</li>
                        <li><strong>Data at Rest:</strong> Hosted in Supabase-managed PostgreSQL clusters with Row-Level Security (RLS) enforcement and standard volume encryption.</li>
                        <li><strong>AI Processing Terms:</strong> Commercial model APIs (including Google Gemini) process queries under enterprise data protection terms prohibiting the use of customer inputs to train public foundation models.</li>
                    </ul>
                </section>

                <section className="space-y-4">
                    <h2 className="text-xl font-bold text-white">5. Your Privacy Rights</h2>
                    <p className="text-gray-300 leading-relaxed">
                        You have full ownership over your digital twin data:
                    </p>
                    <ul className="list-disc pl-6 space-y-2 text-gray-300">
                        <li><strong>Right to Access:</strong> View all stored conversations and memory summaries at any time.</li>
                        <li><strong>Right to Deletion:</strong> Permanently erase your account, personality profile, and memory vectors via application settings or by emailing our team.</li>
                        <li><strong>Data Retention:</strong> We delete associated vectors and personality records within 30 days of an account deletion request.</li>
                    </ul>
                </section>

                <section className="space-y-4">
                    <h2 className="text-xl font-bold text-white flex items-center gap-2">
                        <Mail className="w-5 h-5 text-purple-400" />
                        6. Contact & Legal Entity
                    </h2>
                    <p className="text-gray-300 leading-relaxed">
                        For any inquiries, data deletion requests, or compliance questions regarding this policy, contact:
                    </p>
                    <div className="p-5 rounded-xl bg-white/5 border border-white/10 space-y-2 text-sm text-gray-300">
                        <p><strong className="text-white">Organization:</strong> TwinGenie</p>
                        <p><strong className="text-white">Founder & CEO:</strong> Ashwani Kumar</p>
                        <p><strong className="text-white">Direct Email:</strong> <a href="mailto:ashwani@twingenie.app" className="text-purple-400 hover:underline">ashwani@twingenie.app</a></p>
                        <p><strong className="text-white">Support:</strong> <a href="mailto:support@twingenie.app" className="text-purple-400 hover:underline">support@twingenie.app</a></p>
                        <p><strong className="text-white">Domain:</strong> <a href="https://twingenie.app" className="text-purple-400 hover:underline">https://twingenie.app</a></p>
                    </div>
                </section>
            </main>

            {/* Footer */}
            <footer className="border-t border-white/10 bg-slate-900/40 py-8 text-center text-sm text-gray-500">
                <p>© {new Date().getFullYear()} TwinGenie. All rights reserved.</p>
            </footer>
        </div>
    )
}
