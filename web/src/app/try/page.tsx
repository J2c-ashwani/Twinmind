'use client'

import { useEffect } from 'react'
import { ArrowRight } from 'lucide-react'
import { motion } from 'framer-motion'
import SiteHeader from '@/components/Layout/SiteHeader'
import SiteFooter from '@/components/Layout/SiteFooter'
import { BrandEmblem } from '@/components/Layout/BrandMark'

export default function TryPage() {
    const playStoreUrl =
        process.env.NEXT_PUBLIC_PLAY_STORE_URL ||
        'https://play.google.com/store/apps/details?id=com.asmind.app'

    useEffect(() => {
        const timer = setTimeout(() => {
            redirectToApp()
        }, 3000)
        return () => clearTimeout(timer)
    }, [])

    function redirectToApp() {
        const ua = navigator.userAgent.toLowerCase()

        if (/iphone|ipad|ipod/.test(ua)) {
            window.location.href = '/onboarding'
        } else if (/android/.test(ua)) {
            window.location.href = playStoreUrl
        } else {
            window.location.href = '/onboarding'
        }
    }

    return (
        <div className="min-h-screen bg-[#07080B] text-[#F4F2EC] flex flex-col">
            <SiteHeader minimal />

            <main className="flex-1 flex items-center justify-center p-6 relative overflow-hidden">
                <div className="pointer-events-none absolute inset-0 bg-grid-architectural opacity-40 [mask-image:radial-gradient(ellipse_at_center,black_30%,transparent_75%)]" />

                <motion.div
                    initial={{ opacity: 0, y: 14 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4 }}
                    className="relative z-10 w-full max-w-md enterprise-panel p-8 text-center"
                >
                    <div className="mb-6 flex justify-center">
                        <BrandEmblem size="lg" />
                    </div>

                    <div className="font-mono text-[10px] uppercase tracking-wider text-[#D9A760]">
                        Shared Reflection Invite
                    </div>
                    <h1 className="mt-2 text-3xl font-semibold tracking-tight text-[#F4F2EC]">
                        Someone shared a <span className="font-serif italic text-[#E7C891]">moment</span> with you
                    </h1>

                    <p className="mt-3 text-sm leading-relaxed text-neutral-400">
                        TwinGenie calibrates a 35-trait digital twin that helps you think clearly instead of telling you
                        what you want to hear.
                    </p>

                    <button
                        type="button"
                        onClick={redirectToApp}
                        className="btn-primary-ivory mt-7 w-full py-3.5 text-sm"
                    >
                        <span>Calibrate Your Twin Free</span>
                        <ArrowRight className="h-4 w-4" />
                    </button>

                    <p className="mt-4 font-mono text-[11px] text-neutral-500">Redirecting automatically...</p>
                </motion.div>
            </main>

            <SiteFooter />
        </div>
    )
}
