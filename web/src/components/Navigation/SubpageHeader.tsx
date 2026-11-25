'use client';

import Link from 'next/link';
import { ArrowLeft, LayoutDashboard, MessageCircle } from 'lucide-react';

interface SubpageHeaderProps {
    variant?: 'dark' | 'banner';
    className?: string;
}

export default function SubpageHeader({ variant = 'dark', className = '' }: SubpageHeaderProps) {
    const buttonClasses =
        variant === 'banner'
            ? 'inline-flex items-center gap-2 rounded-xl bg-black/20 hover:bg-black/30 border border-white/25 px-3.5 py-2 text-sm font-medium text-white backdrop-blur-sm transition-colors'
            : 'inline-flex items-center gap-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/15 px-3.5 py-2 text-sm font-medium text-gray-200 hover:text-white transition-colors';

    return (
        <nav aria-label="Workspace navigation" className={`flex flex-wrap items-center justify-between gap-3 ${className}`}>
            <Link href="/dashboard" className={buttonClasses}>
                <ArrowLeft className="w-4 h-4" />
                <LayoutDashboard className="w-4 h-4" />
                <span>Back to Dashboard</span>
            </Link>
            <Link href="/chat" className={buttonClasses}>
                <MessageCircle className="w-4 h-4" />
                <span>Back to Chat</span>
            </Link>
        </nav>
    );
}
