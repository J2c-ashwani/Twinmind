'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ArrowUpRight, Menu, X } from 'lucide-react'
import BrandMark from './BrandMark'

interface SiteHeaderProps {
    minimal?: boolean
    ctaHref?: string
    ctaLabel?: string
}

const NAV_LINKS = [
    { href: '/#perspectives', label: 'Perspectives' },
    { href: '/#engine', label: '35-Trait Engine' },
    { href: '/#programs', label: 'Coaching' },
    { href: '/#architecture', label: 'Security & Cloud' },
    { href: '/#pricing', label: 'Pricing' },
]

export default function SiteHeader({
    minimal = false,
    ctaHref = '/onboarding',
    ctaLabel = 'Create Your Twin',
}: SiteHeaderProps) {
    const [mobileOpen, setMobileOpen] = useState(false)

    return (
        <header className="sticky top-0 z-50 border-b border-white/[0.08] bg-[#07080B]/85 backdrop-blur-xl">
            <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
                <BrandMark size="md" showTagline={!minimal} />

                {!minimal && (
                    <nav className="hidden lg:flex items-center gap-7 text-[13px] font-medium text-neutral-400">
                        {NAV_LINKS.map((item) => (
                            <Link
                                key={item.href}
                                href={item.href}
                                className="transition-colors hover:text-[#F4F2EC]"
                            >
                                {item.label}
                            </Link>
                        ))}
                    </nav>
                )}

                <div className="flex items-center gap-2 sm:gap-3">
                    {ctaHref !== '/login' && (
                        <Link
                            href="/login"
                            className="hidden sm:inline-flex items-center rounded-lg px-3 py-2 text-[13px] font-medium text-neutral-300 transition-colors hover:bg-white/[0.04] hover:text-white"
                        >
                            Sign in
                        </Link>
                    )}

                    <Link
                        href={ctaHref}
                        className="btn-primary-ivory px-3.5 py-2 text-xs sm:px-4 sm:py-2 sm:text-[13px]"
                    >
                        <span>{ctaLabel}</span>
                        <ArrowUpRight className="h-3.5 w-3.5" />
                    </Link>

                    {!minimal && (
                        <button
                            type="button"
                            onClick={() => setMobileOpen((v) => !v)}
                            aria-label={mobileOpen ? 'Close navigation menu' : 'Open navigation menu'}
                            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 bg-white/[0.03] text-neutral-300 lg:hidden"
                        >
                            {mobileOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
                        </button>
                    )}
                </div>
            </div>

            {!minimal && mobileOpen && (
                <div className="border-t border-white/[0.08] bg-[#0B0D12] px-4 py-4 lg:hidden">
                    <nav className="flex flex-col space-y-2 text-sm text-neutral-300">
                        {NAV_LINKS.map((item) => (
                            <Link
                                key={item.href}
                                href={item.href}
                                onClick={() => setMobileOpen(false)}
                                className="rounded-lg px-3 py-2 transition-colors hover:bg-white/[0.05] hover:text-white"
                            >
                                {item.label}
                            </Link>
                        ))}
                        <div className="border-t border-white/[0.08] pt-2">
                            <Link
                                href="/login"
                                onClick={() => setMobileOpen(false)}
                                className="block rounded-lg px-3 py-2 text-neutral-300 hover:bg-white/[0.05] hover:text-white"
                            >
                                Sign in to workspace
                            </Link>
                        </div>
                    </nav>
                </div>
            )}
        </header>
    )
}
