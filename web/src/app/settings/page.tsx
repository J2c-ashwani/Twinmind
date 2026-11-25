'use client';

import { useEffect, useState } from 'react';
import { useUserStore } from '@/store/useStore';
import { motion } from 'framer-motion';
import { User, Bell, Lock, Palette, LogOut, ChevronLeft, Trash2, Check, Download, Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { apiClient } from '@/lib/api/client';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

export default function SettingsPage() {
    const router = useRouter();
    const supabase = createClientComponentClient();
    const { user, setUser, logout } = useUserStore();
    const [loadingPage, setLoadingPage] = useState(true);
    const [fullName, setFullName] = useState('');
    const [email, setEmail] = useState('');
    const [savingProfile, setSavingProfile] = useState(false);
    const [profileMessage, setProfileMessage] = useState('');
    const [notifications, setNotifications] = useState(true);
    const [aiMode, setAiMode] = useState('normal');
    const [prefMessage, setPrefMessage] = useState('');
    const [showPasswordForm, setShowPasswordForm] = useState(false);
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [updatingPassword, setUpdatingPassword] = useState(false);
    const [passwordMessage, setPasswordMessage] = useState('');
    const [exportingData, setExportingData] = useState(false);
    const [exportMessage, setExportMessage] = useState('');

    useEffect(() => {
        let active = true;

        async function loadSettings() {
            try {
                if (typeof window !== 'undefined') {
                    const savedNotif = localStorage.getItem('twingenie_pref_notifications');
                    const savedMode = localStorage.getItem('twingenie_pref_ai_mode');
                    if (savedNotif !== null) setNotifications(savedNotif === 'true');
                    if (savedMode) setAiMode(savedMode);
                }

                const { data: { session } } = await supabase.auth.getSession();
                if (!session?.user) {
                    router.push('/login');
                    return;
                }

                apiClient.setToken(session.access_token);
                const apiUrl = process.env.NEXT_PUBLIC_API_URL || '';
                let resolvedName = session.user.user_metadata?.full_name || user?.name || '';
                let isPro = user?.is_pro || false;

                const [profileRes, subRes] = await Promise.allSettled([
                    fetch(`${apiUrl}/api/auth/profile/${session.user.id}`, {
                        headers: { Authorization: `Bearer ${session.access_token}` },
                    }),
                    fetch(`${apiUrl}/api/subscription/status`, {
                        headers: { Authorization: `Bearer ${session.access_token}` },
                    }),
                ]);

                if (profileRes.status === 'fulfilled' && profileRes.value.ok) {
                    const data = await profileRes.value.json();
                    if (data?.user?.full_name) resolvedName = data.user.full_name;
                }

                if (subRes.status === 'fulfilled' && subRes.value.ok) {
                    const subData = await subRes.value.json();
                    isPro = Boolean(subData?.isPro ?? subData?.subscription?.is_pro);
                }

                if (active) {
                    setFullName(resolvedName);
                    setEmail(session.user.email || '');
                    setUser({
                        id: session.user.id,
                        email: session.user.email || '',
                        name: resolvedName,
                        is_pro: isPro,
                    });
                }
            } catch (err) {
                console.error('Failed to initialize settings:', err);
            } finally {
                if (active) setLoadingPage(false);
            }
        }

        loadSettings();
        return () => { active = false; };
    }, []);

    const handleSaveProfile = async () => {
        const trimmed = fullName.trim();
        if (!trimmed) {
            setProfileMessage('Please enter your name.');
            return;
        }
        setSavingProfile(true);
        setProfileMessage('');
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session?.user) throw new Error('Session expired. Please sign in again.');

            const apiUrl = process.env.NEXT_PUBLIC_API_URL || '';
            const res = await fetch(`${apiUrl}/api/auth/profile/${session.user.id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${session.access_token}`,
                },
                body: JSON.stringify({ full_name: trimmed }),
            });

            if (!res.ok) {
                const errData = await res.json().catch(() => ({}));
                throw new Error(errData.error || 'Failed to save name');
            }

            await supabase.auth.updateUser({ data: { full_name: trimmed } });
            setUser({
                id: session.user.id,
                email: session.user.email || email,
                name: trimmed,
                is_pro: Boolean(user?.is_pro),
            });
            setProfileMessage('Profile saved.');
            setTimeout(() => setProfileMessage(''), 3000);
        } catch (err: any) {
            setProfileMessage(err?.message || 'Could not update profile.');
        } finally {
            setSavingProfile(false);
        }
    };

    const handleSelectMode = (modeValue: string) => {
        setAiMode(modeValue);
        if (typeof window !== 'undefined') {
            localStorage.setItem('twingenie_pref_ai_mode', modeValue);
        }
        setPrefMessage(`Default preference saved (${modeValue}). You can also switch modes anytime inside Chat.`);
        setTimeout(() => setPrefMessage(''), 3000);
    };

    const handleToggleNotifications = () => {
        const nextVal = !notifications;
        setNotifications(nextVal);
        if (typeof window !== 'undefined') {
            localStorage.setItem('twingenie_pref_notifications', String(nextVal));
        }
    };

    const handlePasswordUpdate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (newPassword.length < 6) {
            setPasswordMessage('Password must be at least 6 characters.');
            return;
        }
        if (newPassword !== confirmPassword) {
            setPasswordMessage('Passwords do not match.');
            return;
        }
        setUpdatingPassword(true);
        setPasswordMessage('');
        try {
            const { error } = await supabase.auth.updateUser({ password: newPassword });
            if (error) throw error;
            setNewPassword('');
            setConfirmPassword('');
            setPasswordMessage('Password updated successfully.');
            setTimeout(() => {
                setShowPasswordForm(false);
                setPasswordMessage('');
            }, 2500);
        } catch (err: any) {
            setPasswordMessage(err?.message || 'Failed to update password.');
        } finally {
            setUpdatingPassword(false);
        }
    };

    const handleExportData = async () => {
        setExportingData(true);
        setExportMessage('');
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session?.user) throw new Error('Please sign in again.');

            const headers = { Authorization: `Bearer ${session.access_token}` };
            const apiUrl = process.env.NEXT_PUBLIC_API_URL || '';

            const [profileR, personalityR, convR, historyR, moodR, memoryR, gamificationR, subR] =
                await Promise.allSettled([
                    fetch(`${apiUrl}/api/auth/profile/${session.user.id}`, { headers }).then(r => r.ok ? r.json() : null),
                    fetch(`${apiUrl}/api/personality/profile`, { headers }).then(r => r.ok ? r.json() : null),
                    fetch(`${apiUrl}/api/conversations`, { headers }).then(r => r.ok ? r.json() : null),
                    fetch(`${apiUrl}/api/chat/history?limit=500`, { headers }).then(r => r.ok ? r.json() : null),
                    fetch(`${apiUrl}/api/daily/mood/history?limit=365`, { headers }).then(r => r.ok ? r.json() : null),
                    fetch(`${apiUrl}/api/memory?limit=500`, { headers }).then(r => r.ok ? r.json() : null),
                    fetch(`${apiUrl}/api/gamification/status`, { headers }).then(r => r.ok ? r.json() : null),
                    fetch(`${apiUrl}/api/subscription/status`, { headers }).then(r => r.ok ? r.json() : null),
                ]);

            const exportPayload = {
                exportedAt: new Date().toISOString(),
                account: profileR.status === 'fulfilled' ? profileR.value?.user ?? null : null,
                personality: personalityR.status === 'fulfilled' ? personalityR.value?.personality ?? null : null,
                conversations: convR.status === 'fulfilled' ? convR.value?.conversations ?? [] : [],
                chatHistory: historyR.status === 'fulfilled' ? historyR.value?.history ?? [] : [],
                moodHistory: moodR.status === 'fulfilled' ? moodR.value ?? [] : [],
                memories: memoryR.status === 'fulfilled' ? memoryR.value ?? [] : [],
                gamification: gamificationR.status === 'fulfilled' ? gamificationR.value ?? null : null,
                subscription: subR.status === 'fulfilled' ? subR.value?.subscription ?? null : null,
            };

            const blob = new Blob([JSON.stringify(exportPayload, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `twingenie-export-${new Date().toISOString().slice(0, 10)}.json`;
            document.body.appendChild(a);
            a.click();
            a.remove();
            URL.revokeObjectURL(url);

            setExportMessage('Your data archive downloaded as JSON.');
            setTimeout(() => setExportMessage(''), 4000);
        } catch (err: any) {
            setExportMessage(err?.message || 'Failed to export data.');
        } finally {
            setExportingData(false);
        }
    };

    const handleLogout = async () => {
        await supabase.auth.signOut();
        apiClient.clearToken();
        logout();
        router.refresh();
        router.push('/login');
    };

    const aiModes = [
        { value: 'normal', label: 'Normal Twin', description: 'Balanced and empathetic' },
        { value: 'future', label: 'Future Twin', description: 'Wise and visionary' },
        { value: 'dark', label: 'Dark Twin', description: 'Brutally honest' },
        { value: 'therapist', label: 'Therapist Twin', description: 'Professional support' },
    ];

    if (loadingPage) {
        return (
            <div className="min-h-screen bg-[#0F0F1E] flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-purple-400" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#0F0F1E] text-white p-6">
            <div className="max-w-4xl mx-auto">
                {/* Header */}
                <div className="flex items-center gap-4 mb-8">
                    <button
                        onClick={() => router.back()}
                        className="glass-button p-2"
                    >
                        <ChevronLeft className="w-5 h-5" />
                    </button>
                    <h1 className="text-3xl font-bold text-white">Settings</h1>
                </div>

                {/* Profile Section */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="glass-card p-6 mb-6"
                >
                    <div className="flex items-center gap-3 mb-6">
                        <User className="w-6 h-6 text-purple-400" />
                        <h2 className="text-xl font-semibold text-white">Profile</h2>
                    </div>

                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-2">
                                Name
                            </label>
                            <div className="flex flex-col sm:flex-row gap-3">
                                <input
                                    type="text"
                                    value={fullName}
                                    onChange={(e) => setFullName(e.target.value)}
                                    className="flex-1 px-4 py-3 bg-white/5 border border-white/20 rounded-xl 
                                             focus:border-purple-500 focus:ring-2 focus:ring-purple-500/50 
                                             outline-none transition-all text-white"
                                    placeholder="Your name"
                                />
                                <button
                                    type="button"
                                    onClick={handleSaveProfile}
                                    disabled={savingProfile}
                                    className="px-5 py-3 rounded-xl bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white font-medium transition-all disabled:opacity-50 inline-flex items-center justify-center gap-2"
                                >
                                    {savingProfile ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                                    Save
                                </button>
                            </div>
                            {profileMessage && (
                                <p className="mt-2 text-xs text-purple-300">{profileMessage}</p>
                            )}
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-2">
                                Email
                            </label>
                            <input
                                type="email"
                                value={email}
                                disabled
                                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-gray-400"
                            />
                        </div>
                    </div>
                </motion.div>

                {/* AI Personality */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="glass-card p-6 mb-6"
                >
                    <div className="flex items-center gap-3 mb-6">
                        <Palette className="w-6 h-6 text-purple-400" />
                        <h2 className="text-xl font-semibold text-white">AI Personality</h2>
                    </div>

                    <div className="space-y-3">
                        {aiModes.map((mode) => (
                            <button
                                key={mode.value}
                                onClick={() => handleSelectMode(mode.value)}
                                className={`w-full p-4 rounded-xl border-2 transition-all text-left ${aiMode === mode.value
                                    ? 'border-purple-500 bg-purple-500/20'
                                    : 'border-white/10 bg-white/5 hover:border-white/20'
                                    }`}
                            >
                                <div className="font-semibold text-white">{mode.label}</div>
                                <div className="text-sm text-gray-400">{mode.description}</div>
                            </button>
                        ))}
                    </div>
                    {prefMessage && (
                        <p className="mt-3 text-xs text-purple-300">{prefMessage}</p>
                    )}
                </motion.div>

                {/* Notifications */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="glass-card p-6 mb-6"
                >
                    <div className="flex items-center gap-3 mb-6">
                        <Bell className="w-6 h-6 text-purple-400" />
                        <h2 className="text-xl font-semibold text-white">Notifications</h2>
                    </div>

                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <div className="font-medium text-white">Daily Check-In Reminders</div>
                                <div className="text-sm text-gray-400">
                                    Receive proactive check-ins and reminders on this browser
                                </div>
                            </div>
                            <button
                                onClick={handleToggleNotifications}
                                className={`relative w-14 h-8 rounded-full transition-colors ${notifications ? 'bg-purple-500' : 'bg-gray-600'
                                    }`}
                            >
                                <div
                                    className={`absolute top-1 left-1 w-6 h-6 bg-white rounded-full transition-transform ${notifications ? 'translate-x-6' : ''
                                        }`}
                                />
                            </button>
                        </div>
                    </div>
                </motion.div>

                {/* Privacy */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    className="glass-card p-6 mb-6"
                >
                    <div className="flex items-center gap-3 mb-6">
                        <Lock className="w-6 h-6 text-purple-400" />
                        <h2 className="text-xl font-semibold text-white">Privacy & Security</h2>
                    </div>

                    <div className="space-y-3">
                        <div>
                            <button
                                type="button"
                                onClick={() => setShowPasswordForm(!showPasswordForm)}
                                className="w-full p-4 rounded-xl border border-white/10 bg-white/5 hover:border-white/20 transition-all text-left"
                            >
                                <div className="font-medium text-white">Change Password</div>
                                <div className="text-xs text-gray-400 mt-0.5">Update your account password</div>
                            </button>

                            {showPasswordForm && (
                                <form onSubmit={handlePasswordUpdate} className="mt-3 p-4 rounded-xl bg-white/5 border border-white/10 space-y-3">
                                    <input
                                        type="password"
                                        value={newPassword}
                                        onChange={(e) => setNewPassword(e.target.value)}
                                        placeholder="New password (min 6 characters)"
                                        minLength={6}
                                        required
                                        className="w-full px-3 py-2.5 bg-black/30 border border-white/15 rounded-lg text-white text-sm outline-none focus:border-purple-500"
                                    />
                                    <input
                                        type="password"
                                        value={confirmPassword}
                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                        placeholder="Confirm new password"
                                        minLength={6}
                                        required
                                        className="w-full px-3 py-2.5 bg-black/30 border border-white/15 rounded-lg text-white text-sm outline-none focus:border-purple-500"
                                    />
                                    {passwordMessage && (
                                        <p className="text-xs text-purple-300">{passwordMessage}</p>
                                    )}
                                    <div className="flex gap-2">
                                        <button
                                            type="submit"
                                            disabled={updatingPassword}
                                            className="px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-500 text-sm font-medium disabled:opacity-50"
                                        >
                                            {updatingPassword ? 'Updating...' : 'Save Password'}
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setShowPasswordForm(false);
                                                setPasswordMessage('');
                                            }}
                                            className="px-4 py-2 rounded-lg bg-white/10 hover:bg-white/15 text-sm"
                                        >
                                            Cancel
                                        </button>
                                    </div>
                                </form>
                            )}
                        </div>

                        <div>
                            <button
                                type="button"
                                onClick={handleExportData}
                                disabled={exportingData}
                                className="w-full p-4 rounded-xl border border-white/10 bg-white/5 hover:border-white/20 transition-all text-left flex items-center justify-between disabled:opacity-50"
                            >
                                <div>
                                    <div className="font-medium text-white">Export Data</div>
                                    <div className="text-xs text-gray-400 mt-0.5">Download your chats, mood logs, memories, and personality profile</div>
                                </div>
                                {exportingData ? <Loader2 className="w-5 h-5 animate-spin text-purple-400" /> : <Download className="w-5 h-5 text-purple-400" />}
                            </button>
                            {exportMessage && (
                                <p className="mt-2 text-xs text-purple-300">{exportMessage}</p>
                            )}
                        </div>

                        <button
                            onClick={async () => {
                                if (confirm('Are you sure you want to clear your chat history? This cannot be undone.')) {
                                    try {
                                        const { data: { session } } = await supabase.auth.getSession();
                                        if (session?.access_token) {
                                            apiClient.setToken(session.access_token);
                                        }
                                        await apiClient.clearChatHistory();
                                        alert('Chat history cleared successfully');
                                    } catch (error) {
                                        alert('Failed to clear history');
                                    }
                                }
                            }}
                            className="w-full p-4 rounded-xl border border-red-500/30 bg-red-500/10 
                                         hover:border-red-500/50 transition-all text-left flex items-center gap-3"
                        >
                            <Trash2 className="w-5 h-5 text-red-400" />
                            <div className="font-medium text-red-400">Clear Chat History</div>
                        </button>

                        <button
                            onClick={() => router.push('/delete-data')}
                            className="w-full p-4 rounded-xl border border-amber-500/30 bg-amber-500/10 
                                         hover:border-amber-500/50 transition-all text-left"
                        >
                            <div className="font-medium text-amber-300">Delete Specific Data</div>
                        </button>

                        <button
                            onClick={() => router.push('/delete-account')}
                            className="w-full p-4 rounded-xl border border-red-500/30 bg-red-500/10 
                                         hover:border-red-500/50 transition-all text-left">
                            <div className="font-medium text-red-400">Delete Account</div>
                        </button>
                    </div>
                </motion.div>

                {/* Logout */}
                <button
                    onClick={handleLogout}
                    className="w-full p-4 bg-gradient-to-r from-purple-600 to-blue-600 text-white 
                             rounded-xl font-semibold hover:shadow-lg hover:scale-105 
                             transition-all flex items-center justify-center gap-2"
                >
                    <LogOut className="w-5 h-5" />
                    Logout
                </button>
            </div>
        </div>
    );
}
