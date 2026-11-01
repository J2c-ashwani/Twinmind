'use client'

import Link from 'next/link'
import { Brain, ArrowLeft, Shield, FileCheck, CreditCard, Mail } from 'lucide-react'

export default function TermsOfService() {
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
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-300 text-xs font-medium">
                        <FileCheck className="w-3.5 h-3.5" />
                        Terms of Service & User Agreement
                    </div>
                    <h1 className="text-4xl font-extrabold text-white tracking-tight">Terms of Service</h1>
                    <p className="text-gray-400 text-sm">
                        Effective Date: November 2, 2026 • Last Reviewed: November 2026
                    </p>
                </div>

                <section className="space-y-4">
                    <h2 className="text-xl font-bold text-white">1. Acceptance of Agreement</h2>
                    <p className="text-gray-300 leading-relaxed">
                        By accessing or using the TwinGenie website (<span className="text-purple-300">https://twingenie.app</span>), web applications, or the TwinGenie mobile application on Google Play, you agree to be bound by these Terms of Service. If you do not agree to all terms, you may not access or use the service.
                    </p>
                </section>

                <section className="space-y-4">
                    <h2 className="text-xl font-bold text-white">2. Nature of Service (AI Reflection & Coaching Disclaimer)</h2>
                    <p className="text-gray-300 leading-relaxed">
                        TwinGenie provides an AI-powered conversational platform intended for self-reflection, thought examination, habit tracking, and personal growth.
                    </p>
                    <div className="p-4 rounded-xl bg-amber-950/30 border border-amber-500/30 text-amber-200 text-sm">
                        <strong>Important Mental Health Notice:</strong> TwinGenie is not a certified mental health provider, clinical healthcare entity, or medical diagnostic tool. The Reflective Twin and Life Coach modes are AI-guided conversational tools designed for personal mindfulness. They do not constitute licensed psychiatric therapy, psychological counseling, or medical crisis intervention. If you are experiencing a mental health emergency, please contact local emergency medical services or national crisis helplines immediately.
                    </div>
                </section>

                <section className="space-y-4">
                    <h2 className="text-xl font-bold text-white">3. User Accounts & Responsibilities</h2>
                    <p className="text-gray-300 leading-relaxed">
                        To access certain features of TwinGenie, you must create an account. You agree to:
                    </p>
                    <ul className="list-disc pl-6 space-y-2 text-gray-300">
                        <li>Provide accurate and complete registration information.</li>
                        <li>Safeguard your authentication credentials and notify us immediately of any unauthorized access.</li>
                        <li>Maintain compliance with all applicable local, national, and international laws when using the platform.</li>
                    </ul>
                </section>

                <section className="space-y-4">
                    <h2 className="text-xl font-bold text-white flex items-center gap-2">
                        <CreditCard className="w-5 h-5 text-emerald-400" />
                        4. Subscriptions, Payments & Billing
                    </h2>
                    <p className="text-gray-300 leading-relaxed">
                        TwinGenie offers a Free Starter Tier and optional Premium Subscriptions (Monthly and Yearly Pro Companion tiers):
                    </p>
                    <ul className="list-disc pl-6 space-y-2 text-gray-300">
                        <li><strong>In-App Purchases & Subscriptions:</strong> All mobile subscriptions and digital purchases are processed securely through Google Play Billing in compliance with Google Play Developer Policies.</li>
                        <li><strong>Billing Cycles & Renewal:</strong> Subscriptions renew automatically unless cancelled at least 24 hours prior to the end of the current billing cycle.</li>
                        <li><strong>Cancellations & Refunds:</strong> You can manage or cancel your subscription at any time directly through your Google Play account settings. Refunds are handled in accordance with Google Play's standard refund policy.</li>
                    </ul>
                </section>

                <section className="space-y-4">
                    <h2 className="text-xl font-bold text-white">5. Intellectual Property & User Content</h2>
                    <p className="text-gray-300 leading-relaxed">
                        <strong className="text-white">Your Content:</strong> You retain complete ownership of the personal reflections, journal entries, and thoughts you input into TwinGenie. You grant TwinGenie only the limited, non-exclusive license strictly necessary to process, store, and display your content to you.
                    </p>
                    <p className="text-gray-300 leading-relaxed">
                        <strong className="text-white">TwinGenie Property:</strong> The TwinGenie software code, algorithms, user interfaces, branding, trademarks, logos, and proprietary AI synthesis engines are the exclusive intellectual property of TwinGenie and its founder.
                    </p>
                </section>

                <section className="space-y-4">
                    <h2 className="text-xl font-bold text-white">6. Prohibited Activities</h2>
                    <p className="text-gray-300 leading-relaxed">
                        You agree not to reverse engineer the application, inject malicious payloads, conduct denial-of-service attacks, attempt unauthorized extraction of model prompts or system vectors, or use the service to generate illegal, abusive, or harmful material.
                    </p>
                </section>

                <section className="space-y-4">
                    <h2 className="text-xl font-bold text-white flex items-center gap-2">
                        <Mail className="w-5 h-5 text-purple-400" />
                        7. Contact Information
                    </h2>
                    <p className="text-gray-300 leading-relaxed">
                        For questions regarding these Terms or legal notices:
                    </p>
                    <div className="p-5 rounded-xl bg-white/5 border border-white/10 space-y-2 text-sm text-gray-300">
                        <p><strong className="text-white">Organization:</strong> TwinGenie</p>
                        <p><strong className="text-white">Founder & CEO:</strong> Ashwani Kumar</p>
                        <p><strong className="text-white">Official Domain:</strong> <a href="https://twingenie.app" className="text-purple-400 hover:underline">https://twingenie.app</a></p>
                        <p><strong className="text-white">Direct Email:</strong> <a href="mailto:ashwani@twingenie.app" className="text-purple-400 hover:underline">ashwani@twingenie.app</a></p>
                        <p><strong className="text-white">Customer Support:</strong> <a href="mailto:support@twingenie.app" className="text-purple-400 hover:underline">support@twingenie.app</a></p>
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
