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
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        router.push('/login');
        return;
      }

      const token = (await supabase.auth.getSession()).data.session?.access_token;
      const adminResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/admin/me`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!adminResponse.ok) {
        router.push('/chat');
        return;
      }

      setIsAdmin(true);
      await fetchAdminData();
    } catch (error) {
      console.error('Admin check failed:', error);
      router.push('/chat');
    } finally {
      setLoading(false);
    }
  };

  const fetchAdminData = async () => {
    try {
      const token = (await supabase.auth.getSession()).data.session?.access_token;
      const headers = {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      };

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

  if (!isAdmin) {
    return null;
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
        <div className="mb-8 flex justify-between items-center">
          <div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent">
              Admin & Analytics Dashboard
            </h1>
            <p className="text-gray-400 mt-2">Platform Control Panel & Multi-LLM Telemetry — TwinGenie</p>
          </div>
          <button
            onClick={fetchAdminData}
            className="px-4 py-2 bg-purple-600/30 hover:bg-purple-600/50 border border-purple-500/40 rounded-lg text-sm transition"
          >
            ↻ Refresh Data
          </button>
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
