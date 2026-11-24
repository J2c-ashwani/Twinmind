'use client'

import { useState } from 'react'
import { useUserStore } from '@/store/useStore'
import { User, Bell, Lock, Palette, LogOut, Trash2 } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { apiClient } from '@/lib/api/client'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import WorkspaceHeader from '@/components/Layout/WorkspaceHeader'

export default function SettingsPage() {
    const router = useRouter()
    const supabase = createClientComponentClient()
    const { user, logout } = useUserStore()
    const [notifications, setNotifications] = useState(true)
    const [aiMode, setAiMode] = useState('normal')

    const handleLogout = async () => {
        await supabase.auth.signOut()
        apiClient.clearToken()
        logout()
        router.refresh()
        router.push('/login')
    }

    const aiModes = [
        { value: 'normal', label: 'Normal Twin', description: 'Balanced reflection tuned to your traits' },
        { value: 'future', label: 'Future Twin', description: 'Long-horizon 5-year clarity perspective' },
        { value: 'dark', label: 'Honest Twin', description: 'Zero-sycophancy direct accountability' },
        { value: 'therapist', label: 'Reflective Coach', description: 'Socratic emotional inquiry' },
    ]

    return (
        <div className="min-h-screen bg-[#07080B] text-[#F4F2EC]">
            <WorkspaceHeader />

            <main className="mx-auto max-w-4xl space-y-6 px-4 py-10 sm:px-6">
                <div className="border-b border-white/[0.08] pb-6">
                    <div className="font-mono text-[11px] uppercase tracking-wider text-[#D9A760]">
                        Workspace Preferences
                    </div>
                    <h1 className="mt-1 text-3xl font-semibold text-[#F4F2EC]">Settings</h1>
                </div>

                <section className="enterprise-panel space-y-4 p-6">
                    <div className="flex items-center gap-2.5">
                        <User className="h-4 w-4 text-[#D9A760]" />
                        <h2 className="text-base font-semibold text-white">Identity</h2>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                        <div>
                            <label className="mb-1.5 block text-xs font-medium text-neutral-400">Name</label>
                            <input
                                type="text"
                                defaultValue={user?.name || ''}
                                className="w-full rounded-xl border border-white/[0.12] bg-[#07080B] px-4 py-2.5 text-sm text-white focus:border-[#D9A760]/60 focus:outline-none"
                                placeholder="Your name"
                            />
                        </div>
                        <div>
                            <label className="mb-1.5 block text-xs font-medium text-neutral-400">Email</label>
                            <input
                                type="email"
                                value={user?.email || ''}
                                disabled
                                className="w-full rounded-xl border border-white/[0.06] bg-white/[0.02] px-4 py-2.5 text-sm text-neutral-400"
                            />
                        </div>
                    </div>
                </section>

                <section className="enterprise-panel space-y-4 p-6">
                    <div className="flex items-center gap-2.5">
                        <Palette className="h-4 w-4 text-[#D9A760]" />
                        <h2 className="text-base font-semibold text-white">Default Twin Perspective</h2>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2">
                        {aiModes.map((mode) => (
                            <button
                                key={mode.value}
                                type="button"
                                onClick={() => setAiMode(mode.value)}
                                className={`rounded-xl border p-4 text-left transition-all ${
                                    aiMode === mode.value
                                        ? 'border-[#D9A760]/70 bg-[#D9A760]/[0.09] text-white'
                                        : 'border-white/[0.08] bg-white/[0.02] text-neutral-300 hover:border-white/20'
                                }`}
                            >
                                <div className="text-sm font-semibold">{mode.label}</div>
                                <div className="mt-1 text-xs text-neutral-400">{mode.description}</div>
                            </button>
                        ))}
                    </div>
                </section>

                <section className="enterprise-panel p-6">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <Bell className="h-4 w-4 text-[#D9A760]" />
                            <div>
                                <div className="text-sm font-semibold text-white">Proactive Check-Ins</div>
                                <div className="text-xs text-neutral-400">
                                    Receive scheduled emotional reminders and reflection prompts
                                </div>
                            </div>
                        </div>
                        <button
                            type="button"
                            onClick={() => setNotifications(!notifications)}
                            className={`relative h-7 w-12 rounded-full transition-colors ${
                                notifications ? 'bg-[#D9A760]' : 'bg-white/15'
                            }`}
                        >
                            <span
                                className={`absolute left-1 top-1 h-5 w-5 rounded-full bg-[#07080B] transition-transform ${
                                    notifications ? 'translate-x-5' : ''
                                }`}
                            />
                        </button>
                    </div>
                </section>

                <section className="enterprise-panel space-y-3 p-6">
                    <div className="mb-2 flex items-center gap-2.5">
                        <Lock className="h-4 w-4 text-[#D9A760]" />
                        <h2 className="text-base font-semibold text-white">Privacy &amp; Data Governance</h2>
                    </div>

                    <button
                        type="button"
                        onClick={async () => {
                            if (confirm('Clear your entire chat history? This cannot be undone.')) {
                                try {
                                    await apiClient.clearChatHistory()
                                    alert('Chat history cleared successfully')
                                } catch {
                                    alert('Failed to clear history')
                                }
                            }
                        }}
                        className="flex w-full items-center gap-3 rounded-xl border border-rose-500/30 bg-rose-500/10 p-4 text-left text-sm font-medium text-rose-300 transition-colors hover:bg-rose-500/15"
                    >
                        <Trash2 className="h-4 w-4" />
                        <span>Clear Chat History</span>
                    </button>

                    <button
                        type="button"
                        onClick={() => router.push('/delete-data')}
                        className="w-full rounded-xl border border-[#D9A760]/30 bg-[#D9A760]/10 p-4 text-left text-sm font-medium text-[#E7C891] transition-colors hover:bg-[#D9A760]/15"
                    >
                        Delete Specific Data Categories
                    </button>

                    <button
                        type="button"
                        onClick={() => router.push('/delete-account')}
                        className="w-full rounded-xl border border-rose-500/30 bg-rose-500/10 p-4 text-left text-sm font-medium text-rose-300 transition-colors hover:bg-rose-500/15"
                    >
                        Permanently Delete Account
                    </button>
                </section>

                <button
                    type="button"
                    onClick={handleLogout}
                    className="btn-secondary-obsidian w-full py-3.5 text-sm"
                >
                    <LogOut className="h-4 w-4" />
                    <span>Sign Out</span>
                </button>
            </main>
        </div>
    )
}
