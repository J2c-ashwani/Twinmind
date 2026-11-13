'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

interface Stats {
  totalUsers: number;
  activeUsers: number;
  totalMessages: number;
  totalConversations: number;
  totalProfiles?: number;
  activatedUsers?: number;
  userAuthoredMessages?: number;
  aiMessages?: number;
}

interface AnalyticsData {
  users?: {
    totalUsers: number;
    activeUsers: number;
    premiumUsers: number;
    freeUsers: number;
    conversionRate: number;
    newUsers: number;
  };
  revenue?: {
    mrr: number;
    activeSubscriptions: number;
    newSubscriptionsThisMonth: number;
    currency: string;
  };
  features?: {
    streaks: { average: number; totalFreezeTokens: number };
    circles: { active: number; avgMembers: string };
    twinMatches: { total: number; shareRate: number };
    motivationCards: { total: number; shareRate: number };
  };
  system?: {
    status: string;
    recentMessages: number;
    lastChecked: string;
  };
}

interface AIHealthData {
  total: number;
  success: number;
  usage: Record<string, { requests: number; errors: number }>;
  status: Record<string, {
    requestsToday: number;
    errorsToday: number;
    isExhausted: boolean;
    cooldownUntil: string | null;
  }>;
}

interface User {
  id: string;
  email: string;
  created_at: string;
  last_sign_in_at: string;
}

export default function SecretAdminPanel() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [authError, setAuthError] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [stats, setStats] = useState<Stats>({
    totalUsers: 0,
    activeUsers: 0,
    totalMessages: 0,
    totalConversations: 0
  });
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [aiHealth, setAiHealth] = useState<AIHealthData | null>(null);
  const [recentUsers, setRecentUsers] = useState<User[]>([]);
  const [activeTab, setActiveTab] = useState<'overview' | 'revenue' | 'ai-health' | 'users' | 'system'>('overview');

  useEffect(() => {
    checkAdminAccess();
  }, []);

  const checkAdminAccess = async () => {
    try {
      const storedKey = typeof window !== 'undefined' ? sessionStorage.getItem('twinmind_admin_key') : null;
      if (storedKey) {
        const verifyRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/admin/verify-password`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ password: storedKey })
        });
        if (verifyRes.ok) {
          setIsAdmin(true);
          await fetchAdminData(storedKey);
          return;
        } else {
          sessionStorage.removeItem('twinmind_admin_key');
        }
      }

      // Supabase user session check
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const token = (await supabase.auth.getSession()).data.session?.access_token;
        const adminResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/admin/me`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
        if (adminResponse.ok) {
          setIsAdmin(true);
          await fetchAdminData();
          return;
        }
      }

      // If neither is valid, remain on the Password Gate
      setIsAdmin(false);
    } catch (error) {
      console.error('Admin check failed:', error);
      setIsAdmin(false);
    } finally {
      setLoading(false);
    }
  };

  const handleUnlockWithPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = passwordInput.trim();
    if (!trimmed) {
      setAuthError('Please enter the admin password');
      return;
    }

    setIsVerifying(true);
    setAuthError('');

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/admin/verify-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: trimmed })
      });

      const data = await res.json();

      if (!res.ok) {
        if (res.status === 503) {
          setAuthError(data.error || 'Admin access is disabled. Please set ADMIN_PASSWORD in your server environment.');
        } else {
          setAuthError(data.error || 'Incorrect admin password. Access denied.');
        }
        return;
      }

      if (typeof window !== 'undefined') {
        sessionStorage.setItem('twinmind_admin_key', trimmed);
      }
      setIsAdmin(true);
      await fetchAdminData(trimmed);
    } catch (err: any) {
      setAuthError(err.message || 'Network error verifying admin password');
    } finally {
      setIsVerifying(false);
    }
  };

  const handleLockPortal = () => {
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem('twinmind_admin_key');
    }
    setIsAdmin(false);
    setPasswordInput('');
    setAuthError('');
  };

  const fetchAdminData = async (adminKey?: string) => {
    try {
      const token = (await supabase.auth.getSession()).data.session?.access_token;
      const keyToUse = adminKey || (typeof window !== 'undefined' ? sessionStorage.getItem('twinmind_admin_key') : null);

      const headers: Record<string, string> = {
        'Content-Type': 'application/json'
      };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      if (keyToUse) {
        headers['x-admin-key'] = keyToUse;
      }

      // 1. Fetch base stats
      const statsRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/admin/stats`, { headers });
      if (statsRes.ok) {
        const statsData = await statsRes.json();
        setStats({
          totalUsers: statsData.totalUsers ?? statsData.totalProfiles ?? 0,
          activeUsers: statsData.activeUsers ?? statsData.activatedUsers ?? 0,
          totalMessages:
            statsData.totalMessages ??
            ((statsData.userAuthoredMessages ?? 0) + (statsData.aiMessages ?? 0)),
          totalConversations: statsData.totalConversations ?? 0,
          totalProfiles: statsData.totalProfiles ?? 0,
          activatedUsers: statsData.activatedUsers ?? 0,
          userAuthoredMessages: statsData.userAuthoredMessages ?? 0,
          aiMessages: statsData.aiMessages ?? 0,
        });
      }

      // 2. Fetch full analytics (MRR, feature usage, health)
      const analyticsRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/admin/analytics`, { headers });
      if (analyticsRes.ok) {
        const analyticsData = await analyticsRes.json();
        setAnalytics(analyticsData);
      }

      // 3. Fetch AI Health
      const aiHealthRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/admin/ai-health`, { headers });
      if (aiHealthRes.ok) {
        const aiHealthData = await aiHealthRes.json();
        setAiHealth(aiHealthData.stats);
      }

      // 4. Fetch recent users
      const usersRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/admin/users/recent`, { headers });
      if (usersRes.ok) {
        const { users } = await usersRes.json();
        setRecentUsers(users?.map((u: any) => ({
          id: u.user_id,
          email: u.email || `User ${u.user_id.slice(0, 8)}`,
          created_at: u.created_at,
          last_sign_in_at: u.updated_at || 'Never'
        })) || []);
      }
    } catch (error) {
      console.error('Failed to fetch admin data:', error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0F0F1E] flex items-center justify-center">
        <div className="text-white text-xl">Verifying access...</div>
      </div>
    );
  }

  // Password Gate when not unlocked
  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-[#0F0F1E] flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-[#1A1A2E] border border-purple-900/50 rounded-2xl p-8 shadow-2xl backdrop-blur-md">
          <div className="text-center mb-6">
            <div className="w-16 h-16 bg-gradient-to-tr from-purple-600 to-blue-500 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-purple-500/20">
              <span className="text-2xl">🔒</span>
            </div>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent">
              Admin Access Gate
            </h1>
            <p className="text-gray-400 text-sm mt-1">
              Restricted Area — TwinGenie Operations
            </p>
          </div>

          {authError && (
            <div className="mb-5 p-3 rounded-lg bg-red-900/30 border border-red-500/50 text-red-300 text-xs flex items-start gap-2">
              <span className="text-base">⚠️</span>
              <span>{authError}</span>
            </div>
          )}

          <form onSubmit={handleUnlockWithPassword} className="space-y-4">
            <div>
              <label className="block text-xs uppercase tracking-wider text-gray-400 mb-2 font-medium">
                Master Admin Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={passwordInput}
                  onChange={(e) => setPasswordInput(e.target.value)}
                  placeholder="Enter administrator password..."
                  className="w-full px-4 py-3 bg-[#0F0F1E] border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 transition pr-16"
                  autoFocus
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-200 text-xs focus:outline-none px-1 py-0.5"
                >
                  {showPassword ? 'Hide' : 'Show'}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isVerifying}
              className="w-full py-3 px-4 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 font-medium rounded-xl text-white shadow-lg shadow-purple-900/30 transition duration-200 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isVerifying ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Verifying...</span>
                </>
              ) : (
                <span>Unlock Control Center</span>
              )}
            </button>
          </form>

          <div className="mt-6 pt-5 border-t border-gray-800 text-center">
            <p className="text-xs text-gray-500">
              Zero public access. Protected by fail-closed server authentication.
            </p>
            <p className="text-[11px] text-gray-600 mt-1">
              To set or change your password, configure <code className="text-purple-400 bg-purple-950/60 px-1 py-0.5 rounded">ADMIN_PASSWORD</code> in your Render server environment.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const tabs: Array<{ id: 'overview' | 'revenue' | 'ai-health' | 'users' | 'system'; label: string }> = [
    { id: 'overview', label: 'Overview' },
    { id: 'revenue', label: 'Revenue & Subscriptions' },
    { id: 'ai-health', label: 'AI Provider Health' },
    { id: 'users', label: 'Users' },
    { id: 'system', label: 'System' },
  ];

  return (
    <div className="min-h-screen bg-[#0F0F1E] text-white p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent">
                Admin & Analytics Dashboard
              </h1>
              <span className="px-2 py-0.5 text-xs font-semibold rounded bg-green-900/40 text-green-400 border border-green-500/30">
                Live
              </span>
            </div>
            <p className="text-gray-400 mt-1 text-sm">Platform Control Panel & Multi-LLM Telemetry — TwinGenie</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => fetchAdminData()}
              className="px-3.5 py-2 bg-purple-600/30 hover:bg-purple-600/50 border border-purple-500/40 rounded-lg text-sm transition"
            >
              ↻ Refresh Data
            </button>
            <button
              onClick={handleLockPortal}
              className="px-3.5 py-2 bg-red-900/30 hover:bg-red-900/50 border border-red-500/40 text-red-300 rounded-lg text-sm transition flex items-center gap-1.5"
            >
              <span>🔒</span> Lock Portal
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-4 mb-6 border-b border-gray-700">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 capitalize font-medium ${activeTab === tab.id
                ? 'border-b-2 border-purple-500 text-purple-400'
                : 'text-gray-400 hover:text-white'
                }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div>
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <StatCard title="Total Users" value={stats.totalUsers} icon="👥" />
              <StatCard title="Active (24h)" value={stats.activeUsers} icon="🟢" />
              <StatCard title="User Messages" value={stats.userAuthoredMessages ?? stats.totalMessages} icon="💬" />
              <StatCard title="Conversations" value={stats.totalConversations} icon="💭" />
            </div>

            {/* Feature Engagement Highlights */}
            {analytics?.features && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <StatCard title="Avg User Streak" value={analytics.features.streaks.average} icon="🔥" suffix=" days" />
                <StatCard title="Active Circles" value={analytics.features.circles.active} icon="⭕" />
                <StatCard title="Twin Matches" value={analytics.features.twinMatches.total} icon="🪞" />
                <StatCard title="Match Share Rate" value={analytics.features.twinMatches.shareRate} icon="↗" suffix="%" />
              </div>
            )}

            {/* Recent Activity */}
            <div className="bg-[#1A1A2E] rounded-lg p-6">
              <h2 className="text-xl font-bold mb-4">Recent User Signups & Activity</h2>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="text-left text-gray-400 border-b border-gray-700">
                      <th className="pb-2">Email</th>
                      <th className="pb-2">Created</th>
                      <th className="pb-2">Last Sign In</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentUsers.map(user => (
                      <tr key={user.id} className="border-b border-gray-800">
                        <td className="py-3">{user.email}</td>
                        <td className="py-3">{new Date(user.created_at).toLocaleDateString()}</td>
                        <td className="py-3">
                          {user.last_sign_in_at !== 'Never'
                            ? new Date(user.last_sign_in_at).toLocaleDateString()
                            : 'Never'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Revenue & Subscriptions Tab */}
        {activeTab === 'revenue' && (
          <div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <StatCard
                title="Monthly Recurring Revenue"
                value={analytics?.revenue?.mrr ?? 0}
                icon="💰"
                prefix="$"
              />
              <StatCard
                title="Active Subscriptions"
                value={analytics?.revenue?.activeSubscriptions ?? analytics?.users?.premiumUsers ?? 0}
                icon="⭐"
              />
              <StatCard
                title="New Subs (This Month)"
                value={analytics?.revenue?.newSubscriptionsThisMonth ?? 0}
                icon="📈"
              />
              <StatCard
                title="Conversion Rate"
                value={analytics?.users?.conversionRate ?? 0}
                icon="🎯"
                suffix="%"
              />
            </div>

            <div className="bg-[#1A1A2E] rounded-lg p-6">
              <h2 className="text-xl font-bold mb-4">Subscription Overview</h2>
              <div className="space-y-4">
                <InfoRow label="Billing Provider" value="Google Play In-App Purchase" />
                <InfoRow label="Free Tier Limits" value="10 chat messages/day • 3 voice recordings/day" />
                <InfoRow label="Pro Tier Entitlements" value="Unlimited chat & voice • Proactive check-ins • Priority speed" />
                <InfoRow label="Pricing Tiers" value="India ₹299/mo | USA $9.99/mo | Global $6.99/mo" />
              </div>
            </div>
          </div>
        )}

        {/* AI Provider Health Tab */}
        {activeTab === 'ai-health' && (
          <div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <StatCard
                title="Total AI Requests"
                value={aiHealth?.total ?? 0}
                icon="⚡"
              />
              <StatCard
                title="Successful AI Requests"
                value={aiHealth?.success ?? 0}
                icon="✅"
              />
              <StatCard
                title="Success Rate"
                value={aiHealth?.total ? Math.round((aiHealth.success / aiHealth.total) * 100) : 100}
                icon="📊"
                suffix="%"
              />
            </div>

            <div className="bg-[#1A1A2E] rounded-lg p-6 mb-8">
              <h2 className="text-xl font-bold mb-4">Multi-Provider Live Telemetry (10 AI Engines)</h2>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="text-left text-gray-400 border-b border-gray-700">
                      <th className="pb-3">Provider</th>
                      <th className="pb-3">Status</th>
                      <th className="pb-3">Requests Today</th>
                      <th className="pb-3">Errors Today</th>
                      <th className="pb-3">Circuit Breaker</th>
                    </tr>
                  </thead>
                  <tbody>
                    {aiHealth?.status && Object.entries(aiHealth.status).map(([providerName, pStatus]) => {
                      const isOperational = !pStatus.isExhausted && (!pStatus.cooldownUntil || new Date(pStatus.cooldownUntil) < new Date());
                      return (
                        <tr key={providerName} className="border-b border-gray-800">
                          <td className="py-3 font-medium text-white flex items-center gap-2">
                            <span>{isOperational ? '🟢' : '🔴'}</span>
                            {providerName}
                          </td>
                          <td className="py-3">
                            <span className={`px-2 py-1 text-xs rounded ${isOperational ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                              {isOperational ? 'Active' : 'Cooldown / Exhausted'}
                            </span>
                          </td>
                          <td className="py-3">{pStatus.requestsToday ?? 0}</td>
                          <td className="py-3 text-red-400">{pStatus.errorsToday ?? 0}</td>
                          <td className="py-3 text-gray-400 text-sm">
                            {pStatus.cooldownUntil && new Date(pStatus.cooldownUntil) > new Date()
                              ? `Cooling down until ${new Date(pStatus.cooldownUntil).toLocaleTimeString()}`
                              : 'Healthy'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Users Tab */}
        {activeTab === 'users' && (
          <div className="bg-[#1A1A2E] rounded-lg p-6">
            <h2 className="text-xl font-bold mb-4">User Management</h2>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="text-left text-gray-400 border-b border-gray-700">
                    <th className="pb-2">Email</th>
                    <th className="pb-2">Created</th>
                    <th className="pb-2">Last Sign In</th>
                  </tr>
                </thead>
                <tbody>
                  {recentUsers.map(user => (
                    <tr key={user.id} className="border-b border-gray-800">
                      <td className="py-3">{user.email}</td>
                      <td className="py-3">{new Date(user.created_at).toLocaleDateString()}</td>
                      <td className="py-3">
                        {user.last_sign_in_at !== 'Never'
                          ? new Date(user.last_sign_in_at).toLocaleDateString()
                          : 'Never'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* System Tab */}
        {activeTab === 'system' && (
          <div className="bg-[#1A1A2E] rounded-lg p-6">
            <h2 className="text-xl font-bold mb-4">System Information</h2>
            <div className="space-y-4">
              <InfoRow label="Platform" value="TwinGenie AI" />
              <InfoRow label="Version" value="1.0.7" />
              <InfoRow label="Environment" value={process.env.NODE_ENV || 'development'} />
              <InfoRow label="Database" value="Supabase PostgreSQL + pgvector" />
              <InfoRow label="System Status" value={analytics?.system?.status || 'operational'} />
              <InfoRow label="AI Routing" value="10 Multi-Provider Failover Matrix" />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({
  title,
  value,
  icon,
  prefix = '',
  suffix = '',
}: {
  title: string;
  value: number;
  icon: string;
  prefix?: string;
  suffix?: string;
}) {
  return (
    <div className="bg-[#1A1A2E] rounded-lg p-6 border border-gray-800 hover:border-purple-500/50 transition-all">
      <div className="flex items-center justify-between mb-2">
        <span className="text-gray-400 text-sm">{title}</span>
        <span className="text-2xl">{icon}</span>
      </div>
      <div className="text-3xl font-bold bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent">
        {prefix}{typeof value === 'number' ? value.toLocaleString() : value}{suffix}
      </div>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between py-2 border-b border-gray-800">
      <span className="text-gray-400">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}
