'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import YearInPixels from '@/components/GrowthStory/YearInPixels'
import InsightsSummary from '@/components/GrowthStory/InsightsSummary'

export default function GrowthStoryPage() {
    const router = useRouter()

    return (
        <div className="min-h-screen p-6">
            {/* Header */}
            <header className="max-w-6xl mx-auto mb-8">
                <button
                    onClick={() => router.back()}
                    className="flex items-center gap-2 text-white/70 hover:text-white transition-colors mb-4"
                >
                    <ArrowLeft className="w-4 h-4" />
                    Back
                </button>
                <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                    Your Growth Story
                </h1>
                <p className="text-gray-400">Visualize your emotional journey</p>
            </header>

            {/* Content */}
            <div className="max-w-6xl mx-auto space-y-6">
                {/* Year in Pixels */}
                <YearInPixels />

                {/* AI Insights */}
                <InsightsSummary />
            </div>
        </div>
    )
}
