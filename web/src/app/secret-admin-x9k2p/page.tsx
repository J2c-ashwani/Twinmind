'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

interface Stats {
  totalUsers: number;
  activeUsers: number;
  totalMessages: number;
  totalConversations: number;
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
  const [recentUsers, setRecentUsers] = useState<User[]>([]);
  const [activeTab, setActiveTab] = useState('overview');

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

      // Check if user is admin (stored in user metadata)
      const isUserAdmin = user.email === 'admin@twinmind.com' ||
        user.user_metadata?.role === 'admin';

      if (!isUserAdmin) {
        // Redirect to home without showing error (keep it secret)
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
      // Fetch stats from backend API (which uses service role)
      const token = (await supabase.auth.getSession()).data.session?.access_token;

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/admin/stats`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const statsData = await response.json();
        setStats(statsData);
      }

      // Fetch recent users from backend
      const usersResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/admin/users/recent`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (usersResponse.ok) {
        const { users } = await usersResponse.json();
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
    return null; // Redirecting
  }

  return (
    <div className="min-h-screen bg-[#0F0F1E] text-white p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent">
            🔒 Admin Dashboard
          </h1>
          <p className="text-gray-400 mt-2">Secret Control Panel - TwinMind Platform</p>
        </div>

        {/* Tabs */}
        <div className="flex gap-4 mb-6 border-b border-gray-700">
          {['overview', 'users', 'system'].map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 capitalize ${activeTab === tab
                  ? 'border-b-2 border-purple-500 text-purple-400'
                  : 'text-gray-400 hover:text-white'
                }`}
            >
              {tab}
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
              <StatCard title="Total Messages" value={stats.totalMessages} icon="💬" />
              <StatCard title="Conversations" value={stats.totalConversations} icon="💭" />
            </div>

            {/* Recent Activity */}
            <div className="bg-[#1A1A2E] rounded-lg p-6">
              <h2 className="text-xl font-bold mb-4">Recent Users</h2>
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

        {/* Users Tab */}
        {activeTab === 'users' && (
          <div className="bg-[#1A1A2E] rounded-lg p-6">
            <h2 className="text-xl font-bold mb-4">User Management</h2>
            <p className="text-gray-400">User management features coming soon...</p>
          </div>
        )}

        {/* System Tab */}
        {activeTab === 'system' && (
          <div className="bg-[#1A1A2E] rounded-lg p-6">
            <h2 className="text-xl font-bold mb-4">System Information</h2>
            <div className="space-y-4">
              <InfoRow label="Platform" value="TwinMind AI" />
              <InfoRow label="Version" value="1.0.0" />
              <InfoRow label="Environment" value={process.env.NODE_ENV || 'development'} />
              <InfoRow label="Database" value="Supabase PostgreSQL" />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({ title, value, icon }: { title: string; value: number; icon: string }) {
  return (
    <div className="bg-[#1A1A2E] rounded-lg p-6 border border-gray-800 hover:border-purple-500/50 transition-all">
      <div className="flex items-center justify-between mb-2">
        <span className="text-gray-400 text-sm">{title}</span>
        <span className="text-2xl">{icon}</span>
      </div>
      <div className="text-3xl font-bold bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent">
        {value.toLocaleString()}
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
