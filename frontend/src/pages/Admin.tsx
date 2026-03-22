import { useEffect, useState } from 'react';
import { useAuthStore } from '../stores/authStore';
import { get, post } from '../api/client';

interface AdminUser {
  id: number;
  email: string;
  full_name: string | null;
  subscription_status: string;
  trial_ends_at: string | null;
  is_admin: boolean;
}

export default function Admin() {
  const { accessToken } = useAuthStore();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [grantEmail, setGrantEmail] = useState('');
  const [grantDays, setGrantDays] = useState(30);

  useEffect(() => {
    loadUsers();
  }, [accessToken]);

  const loadUsers = async () => {
    if (!accessToken) return;
    setLoading(true);
    try {
      const data = await get<AdminUser[]>('/v1/admin/users', accessToken);
      setUsers(data);
      setError(null);
    } catch {
      setError('Failed to load users. Are you an admin?');
    } finally {
      setLoading(false);
    }
  };

  const handleGrantTrial = async (email: string, days: number) => {
    if (!accessToken) return;
    setError(null);
    setSuccess(null);
    try {
      const res = await post<{ email: string; days_remaining: number }>(
        '/v1/admin/grant-trial',
        { email, days },
        accessToken,
      );
      setSuccess(`Granted ${days} days to ${res.email} (${res.days_remaining} days remaining)`);
      loadUsers();
    } catch {
      setError(`Failed to grant trial to ${email}`);
    }
  };

  const handleSetStatus = async (email: string, status: string) => {
    if (!accessToken) return;
    setError(null);
    setSuccess(null);
    try {
      await post('/v1/admin/set-subscription', { email, status }, accessToken);
      setSuccess(`Set ${email} to "${status}"`);
      loadUsers();
    } catch {
      setError(`Failed to update ${email}`);
    }
  };

  const daysRemaining = (trialEndsAt: string | null): string => {
    if (!trialEndsAt) return '-';
    const days = Math.ceil((new Date(trialEndsAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    return days > 0 ? `${days}d left` : 'expired';
  };

  const statusColor = (status: string) => {
    switch (status) {
      case 'active': return 'text-green-400';
      case 'trialing': return 'text-teal-400';
      case 'past_due': return 'text-yellow-400';
      case 'canceled': return 'text-red-400';
      default: return 'text-gray-400';
    }
  };

  if (loading) {
    return (
      <main className="max-w-4xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold text-white mb-4">Admin</h1>
        <p className="text-gray-400">Loading...</p>
      </main>
    );
  }

  if (error && users.length === 0) {
    return (
      <main className="max-w-4xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold text-white mb-4">Admin</h1>
        <p className="text-red-400">{error}</p>
      </main>
    );
  }

  return (
    <main className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-white mb-6">Admin</h1>

      {error && <div className="bg-red-900/50 border border-red-700 text-red-300 rounded-lg px-4 py-3 mb-4 text-sm">{error}</div>}
      {success && <div className="bg-green-900/50 border border-green-700 text-green-300 rounded-lg px-4 py-3 mb-4 text-sm">{success}</div>}

      {/* Quick grant */}
      <div className="bg-gray-800 rounded-lg p-4 mb-6">
        <h2 className="text-white font-semibold mb-3">Grant Free Days</h2>
        <div className="flex gap-2 items-end flex-wrap">
          <div className="flex-1 min-w-[200px]">
            <label className="text-xs text-gray-400 block mb-1">User</label>
            <select
              value={grantEmail}
              onChange={(e) => setGrantEmail(e.target.value)}
              className="w-full bg-gray-700 text-white rounded px-3 py-2 text-sm"
            >
              <option value="">Select a user...</option>
              {users.map((u) => (
                <option key={u.id} value={u.email}>
                  {u.email}{u.full_name ? ` (${u.full_name})` : ''}
                </option>
              ))}
            </select>
          </div>
          <div className="w-20">
            <label className="text-xs text-gray-400 block mb-1">Days</label>
            <input
              type="number"
              value={grantDays}
              onChange={(e) => setGrantDays(Number(e.target.value))}
              min={1}
              className="w-full bg-gray-700 text-white rounded px-3 py-2 text-sm"
            />
          </div>
          <button
            onClick={() => grantEmail && handleGrantTrial(grantEmail, grantDays)}
            disabled={!grantEmail}
            className="bg-teal-600 hover:bg-teal-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white text-sm font-medium py-2 px-4 rounded transition-colors"
          >
            Grant
          </button>
        </div>
      </div>

      {/* Users table */}
      <div className="bg-gray-800 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-700">
                <th className="text-left text-xs text-gray-400 font-medium px-4 py-3">User</th>
                <th className="text-left text-xs text-gray-400 font-medium px-4 py-3">Status</th>
                <th className="text-left text-xs text-gray-400 font-medium px-4 py-3">Trial</th>
                <th className="text-right text-xs text-gray-400 font-medium px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} className="border-b border-gray-700/50 hover:bg-gray-700/30">
                  <td className="px-4 py-3">
                    <div className="text-sm text-white">{u.email}</div>
                    <div className="text-xs text-gray-500">{u.full_name || 'No name'}{u.is_admin && ' · admin'}</div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-sm font-medium capitalize ${statusColor(u.subscription_status)}`}>
                      {u.subscription_status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-400">
                    {daysRemaining(u.trial_ends_at)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex gap-1 justify-end flex-wrap">
                      <button
                        onClick={() => handleGrantTrial(u.email, 30)}
                        className="text-xs bg-gray-700 hover:bg-gray-600 text-gray-300 px-2 py-1 rounded transition-colors"
                      >
                        +30d
                      </button>
                      <button
                        onClick={() => handleSetStatus(u.email, 'active')}
                        className="text-xs bg-gray-700 hover:bg-green-700 text-gray-300 hover:text-white px-2 py-1 rounded transition-colors"
                      >
                        Activate
                      </button>
                      <button
                        onClick={() => handleSetStatus(u.email, 'canceled')}
                        className="text-xs bg-gray-700 hover:bg-red-700 text-gray-300 hover:text-white px-2 py-1 rounded transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}
