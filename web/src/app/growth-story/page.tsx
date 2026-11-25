'use client'

import YearInPixels from '@/components/GrowthStory/YearInPixels'
import InsightsSummary from '@/components/GrowthStory/InsightsSummary'
import SubpageHeader from '@/components/Navigation/SubpageHeader'

export default function GrowthStoryPage() {
    return (
        <div className="min-h-screen p-6">
            {/* Header */}
            <header className="max-w-6xl mx-auto mb-8">
                <SubpageHeader className="mb-5" />
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
