'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
    LayoutDashboard,
    MessageSquare,
    Compass,
    Brain,
    TrendingUp,
    Users,
    Settings,
    User,
} from 'lucide-react'
import BrandMark from './BrandMark'

const WORKSPACE_LINKS = [
    { href: '/dashboard', label: 'Overview', icon: LayoutDashboard },
    { href: '/chat', label: 'Twin Chat', icon: MessageSquare },
    { href: '/life-coach', label: 'Life Coach', icon: Compass },
    { href: '/insights', label: 'Insights', icon: TrendingUp },
    { href: '/memories', label: 'Memories', icon: Brain },
    { href: '/growth-circles', label: 'Circles', icon: Users },
]

export default function WorkspaceHeader() {
    const pathname = usePathname()

    return (
        <header className="sticky top-0 z-40 border-b border-white/[0.08] bg-[#07080B]/90 backdrop-blur-xl">
            <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
                <BrandMark size="sm" href="/dashboard" />

                <nav className="hidden md:flex items-center gap-1 rounded-xl border border-white/[0.07] bg-white/[0.02] p-1">
                    {WORKSPACE_LINKS.map((item) => {
                        const Icon = item.icon
                        const active = pathname === item.href || pathname?.startsWith(`${item.href}/`)
                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
                                    active
                                        ? 'bg-[#F4F2EC] text-[#07080B] shadow-sm'
                                        : 'text-neutral-400 hover:bg-white/[0.05] hover:text-[#F4F2EC]'
                                }`}
                            >
                                <Icon className="h-3.5 w-3.5" />
                                <span>{item.label}</span>
                            </Link>
                        )
                    })}
                </nav>

                <div className="flex items-center gap-2">
                    <Link
                        href="/profile"
                        className={`inline-flex h-9 w-9 items-center justify-center rounded-lg border transition-colors ${
                            pathname === '/profile'
                                ? 'border-[#D9A760]/40 bg-[#D9A760]/10 text-[#E7C891]'
                                : 'border-white/10 bg-white/[0.03] text-neutral-400 hover:text-white'
                        }`}
                        title="Profile"
                    >
                        <User className="h-4 w-4" />
                    </Link>
                    <Link
                        href="/settings"
                        className={`inline-flex h-9 w-9 items-center justify-center rounded-lg border transition-colors ${
                            pathname === '/settings'
                                ? 'border-[#D9A760]/40 bg-[#D9A760]/10 text-[#E7C891]'
                                : 'border-white/10 bg-white/[0.03] text-neutral-400 hover:text-white'
                        }`}
                        title="Settings"
                    >
                        <Settings className="h-4 w-4" />
                    </Link>
                </div>
            </div>
        </header>
    )
}
