'use client'

import YearInPixels from '@/components/GrowthStory/YearInPixels'
import InsightsSummary from '@/components/GrowthStory/InsightsSummary'
import WorkspaceHeader from '@/components/Layout/WorkspaceHeader'

export default function GrowthStoryPage() {
    return (
        <div className="min-h-screen bg-[#07080B] text-[#F4F2EC]">
            <WorkspaceHeader />

            <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
                <header className="mb-8 border-b border-white/[0.08] pb-6">
                    <div className="font-mono text-[11px] uppercase tracking-wider text-[#D9A760]">
                        Behavioral Archive
                    </div>
                    <h1 className="mt-1 text-3xl font-semibold tracking-tight text-[#F4F2EC]">
                        Your Growth Story
                    </h1>
                    <p className="mt-1 text-sm text-neutral-400">
                        Year-in-Pixels cadence and AI narrative synthesis.
                    </p>
                </header>

                <div className="space-y-6">
                    <YearInPixels />
                    <InsightsSummary />
                </div>
            </main>
        </div>
    )
}
