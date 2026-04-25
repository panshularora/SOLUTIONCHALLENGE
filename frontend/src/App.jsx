import React, { useState, useEffect } from 'react';
import {
  LayoutDashboard, Image as ImageIcon, AlertTriangle, FileText,
  Bell, Search, MoreVertical, ExternalLink, ShieldCheck, LogIn, Loader2
} from 'lucide-react';

const API = 'http://127.0.0.1:5005';

// ── Badge ─────────────────────────────────────────────────────────────────────
const Badge = ({ status }) => {
  const norm = (status || 'open').toUpperCase();
  const map = {
    OPEN:      'bg-red-100 text-red-600 border border-red-200',
    RESOLVED:  'bg-emerald-100 text-emerald-700 border border-emerald-200',
    REVIEWING: 'bg-amber-100 text-amber-700 border border-amber-200',
    PENDING:   'bg-amber-100 text-amber-700 border border-amber-200',
  };
  const label = norm === 'PENDING' ? 'REVIEWING' : norm;
  return (
    <span className={`px-3 py-1 rounded-full text-[10px] font-bold tracking-wider uppercase ${map[norm] || map.OPEN}`}>
      {label}
    </span>
  );
};

// ── Login Screen ──────────────────────────────────────────────────────────────
const LoginScreen = ({ onLogin }) => {
  const [creds, setCreds] = useState({ username: 'admin', password: 'password' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${API}/api/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(creds),
      });
      const data = await res.json();
      if (data.token) {
        localStorage.setItem('vigilant_token', data.token);
        onLogin(data.token);
      } else {
        setError(data.error || 'Login failed');
      }
    } catch {
      setError('Cannot reach server. Is the Flask backend running on port 5005?');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-100">
      <div className="bg-white rounded-2xl shadow-xl border border-slate-200 p-10 w-full max-w-md">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow-lg shadow-indigo-300">
            <ShieldCheck size={22} strokeWidth={2.5} />
          </div>
          <span className="text-2xl font-bold text-slate-900 tracking-tight">Vigilant</span>
        </div>
        <h2 className="text-xl font-semibold text-slate-700 mb-1">Sign in</h2>
        <p className="text-sm text-slate-500 mb-7">Digital Asset Protection Platform</p>
        {error && (
          <div className="mb-5 bg-red-50 border border-red-200 text-red-600 text-sm rounded-lg px-4 py-3">
            {error}
          </div>
        )}
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Username</label>
            <input
              type="text"
              value={creds.username}
              onChange={e => setCreds(p => ({ ...p, username: e.target.value }))}
              className="w-full px-4 py-2.5 rounded-lg border border-slate-200 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Password</label>
            <input
              type="password"
              value={creds.password}
              onChange={e => setCreds(p => ({ ...p, password: e.target.value }))}
              className="w-full px-4 py-2.5 rounded-lg border border-slate-200 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white font-semibold py-2.5 rounded-lg transition-colors shadow-sm shadow-indigo-200"
          >
            {loading ? <Loader2 size={18} className="animate-spin" /> : <LogIn size={18} />}
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
        <p className="text-xs text-slate-400 mt-6 text-center">Default: admin / password</p>
      </div>
    </div>
  );
};

// ── Dashboard ─────────────────────────────────────────────────────────────────
const Dashboard = ({ token, onLogout }) => {
  const [violations, setViolations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeNav, setActiveNav] = useState('Violations');

  const headers = { Authorization: `Bearer ${token}` };

  useEffect(() => {
    fetch(`${API}/api/violations`, { headers })
      .then(r => r.json())
      .then(d => { setViolations(d.violations || []); setLoading(false); })
      .catch(() => setLoading(false));
  }, [token]);

  const totalAssets = violations.length > 0
    ? new Set(violations.map(v => v.asset_id)).size
    : 0;
  const violationsFound = violations.length;
  const avgConfidence = violations.length > 0
    ? (violations.reduce((a, v) => a + (v.confidence_score || 0), 0) / violations.length * 100).toFixed(1)
    : '0.0';
  const assetsAtRisk = new Set(violations.filter(v => v.status !== 'resolved').map(v => v.asset_id)).size;

  const navItems = [
    { icon: LayoutDashboard, label: 'Dashboard' },
    { icon: ImageIcon,        label: 'Assets' },
    { icon: AlertTriangle,    label: 'Violations' },
    { icon: FileText,         label: 'Reports' },
  ];

  const metrics = [
    { label: 'Total Assets',     value: totalAssets,      color: 'text-indigo-600', bg: 'bg-indigo-50', trend: null },
    { label: 'Violations Found', value: violationsFound,  color: 'text-rose-600',   bg: 'bg-rose-50',   trend: null },
    { label: 'Avg Confidence',   value: `${avgConfidence}%`, color: 'text-amber-600', bg: 'bg-amber-50', trend: null },
    { label: 'Assets at Risk',   value: assetsAtRisk,     color: 'text-emerald-600',bg: 'bg-emerald-50', trend: null },
  ];

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-slate-200 flex flex-col shrink-0 shadow-sm">
        <div className="p-6 flex items-center gap-3 border-b border-slate-100">
          <div className="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow-md shadow-indigo-300">
            <ShieldCheck size={20} strokeWidth={2.5} />
          </div>
          <span className="font-bold text-xl tracking-tight text-slate-900">Vigilant</span>
        </div>

        <nav className="flex-1 px-3 py-5 space-y-1">
          {navItems.map(({ icon: Icon, label }) => (
            <button
              key={label}
              onClick={() => setActiveNav(label)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150
                ${activeNav === label
                  ? 'bg-indigo-50 text-indigo-700'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'}`}
            >
              <Icon size={18} className={activeNav === label ? 'text-indigo-600' : 'text-slate-400'} strokeWidth={activeNav === label ? 2.5 : 2} />
              {label}
            </button>
          ))}
        </nav>

        <div className="p-4 border-t border-slate-200">
          <div className="flex items-center gap-3 px-2 py-1.5">
            <img
              src="https://ui-avatars.com/api/?name=Admin+User&background=6366f1&color=fff&size=64"
              alt="User"
              className="w-8 h-8 rounded-full border border-indigo-200"
            />
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-slate-700 text-sm leading-none mb-1 truncate">Admin User</p>
              <p className="text-xs text-slate-400 leading-none">admin@vigilant.io</p>
            </div>
            <button onClick={onLogout} className="text-slate-400 hover:text-slate-700 transition-colors text-xs ml-1">
              Out
            </button>
          </div>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 flex flex-col h-full overflow-hidden">
        {/* Header */}
        <header className="bg-white/80 backdrop-blur border-b border-slate-200 h-16 flex items-center justify-between px-8 shrink-0">
          <h1 className="text-xl font-bold text-slate-800">{activeNav} Overview</h1>
          <div className="flex items-center gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
              <input
                placeholder="Search assets or URLs…"
                className="pl-9 pr-4 py-1.5 bg-slate-50 border border-slate-200 rounded-full text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none w-56 transition-all"
              />
            </div>
            <div className="relative">
              <button className="w-9 h-9 rounded-full bg-white border border-slate-200 flex items-center justify-center text-slate-500 hover:bg-slate-50 transition-colors shadow-sm">
                <Bell size={16} />
              </button>
              {violationsFound > 0 && (
                <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-rose-500 rounded-full border-2 border-white" />
              )}
            </div>
          </div>
        </header>

        {/* Scrollable body */}
        <div className="flex-1 overflow-auto p-8 space-y-8">
          {/* Metric Cards */}
          <div className="grid grid-cols-4 gap-6">
            {metrics.map((m, i) => (
              <div key={i} className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm hover:shadow-md transition-shadow">
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-3">{m.label}</p>
                <p className={`text-4xl font-bold tracking-tight ${m.color}`}>{m.value}</p>
              </div>
            ))}
          </div>

          {/* Violations Table */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
              <h2 className="text-base font-bold text-slate-800">Recent Violations</h2>
              <span className="text-xs font-semibold text-slate-400 bg-slate-100 px-3 py-1 rounded-full">
                {violationsFound} total
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-slate-50 border-b border-slate-100 text-xs text-slate-500 uppercase tracking-wider font-semibold">
                  <tr>
                    <th className="px-6 py-3.5">Asset</th>
                    <th className="px-6 py-3.5">Source URL</th>
                    <th className="px-6 py-3.5">Platform</th>
                    <th className="px-6 py-3.5">Confidence</th>
                    <th className="px-6 py-3.5">Detected</th>
                    <th className="px-6 py-3.5">Status</th>
                    <th className="px-6 py-3.5 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {loading ? (
                    <tr>
                      <td colSpan="7" className="py-16 text-center text-slate-400">
                        <div className="flex flex-col items-center gap-3">
                          <Loader2 size={28} className="animate-spin text-indigo-500" />
                          <span className="text-sm font-medium">Fetching violations…</span>
                        </div>
                      </td>
                    </tr>
                  ) : violations.length === 0 ? (
                    <tr>
                      <td colSpan="7" className="py-16 text-center text-slate-400">
                        <div className="flex flex-col items-center gap-3">
                          <div className="w-12 h-12 bg-emerald-50 rounded-full flex items-center justify-center text-emerald-500">
                            <ShieldCheck size={24} />
                          </div>
                          <span className="text-sm font-medium text-slate-500">No violations found. All assets are secure.</span>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    violations.map((v, i) => {
                      let hostname = v.source_url || 'unknown.com';
                      let platform = 'UNKNOWN';
                      try {
                        const u = new URL(hostname.startsWith('http') ? hostname : `https://${hostname}`);
                        hostname = u.hostname;
                        platform = u.hostname.replace('www.', '').split('.')[0].toUpperCase();
                      } catch { /* keep defaults */ }

                      const conf = v.confidence_score || 0;
                      const confPct = Math.round(conf * 100);
                      const barColor = conf > 0.9 ? 'bg-rose-500' : conf > 0.7 ? 'bg-amber-500' : 'bg-emerald-500';
                      const shortId = (v.asset_id || '').substring(0, 8);
                      const detectedDate = v.detected_at
                        ? new Date(v.detected_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
                        : '—';

                      return (
                        <tr key={i} className="hover:bg-slate-50 transition-colors group">
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-lg bg-slate-100 border border-slate-200 overflow-hidden shrink-0 shadow-sm">
                                <img
                                  src={`https://picsum.photos/seed/${v.asset_id}/80/80`}
                                  alt="thumb"
                                  className="w-full h-full object-cover"
                                />
                              </div>
                              <span className="font-semibold text-slate-700 text-xs font-mono">{shortId}…</span>
                            </div>
                          </td>
                          <td className="px-6 py-4 max-w-[180px]">
                            <a
                              href={v.source_url}
                              target="_blank"
                              rel="noreferrer"
                              className="text-indigo-600 font-medium hover:underline flex items-center gap-1 truncate text-xs"
                            >
                              {hostname}
                              <ExternalLink size={11} className="opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                            </a>
                          </td>
                          <td className="px-6 py-4">
                            <span className="px-2.5 py-1 bg-slate-100 text-slate-600 text-[11px] font-bold rounded-md tracking-wide">
                              {platform}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2.5">
                              <div className="w-16 h-1.5 rounded-full bg-slate-100 overflow-hidden">
                                <div className={`h-full rounded-full transition-all ${barColor}`} style={{ width: `${confPct}%` }} />
                              </div>
                              <span className="text-xs font-bold text-slate-600">{confPct}%</span>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-xs text-slate-500 font-medium whitespace-nowrap">{detectedDate}</td>
                          <td className="px-6 py-4"><Badge status={v.status} /></td>
                          <td className="px-6 py-4 text-right">
                            <button className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-indigo-600 transition-all p-1.5 rounded-md hover:bg-indigo-50">
                              <MoreVertical size={16} />
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

// ── Root App ──────────────────────────────────────────────────────────────────
export default function App() {
  const [token, setToken] = useState(() => localStorage.getItem('vigilant_token') || '');

  const handleLogout = () => {
    localStorage.removeItem('vigilant_token');
    setToken('');
  };

  if (!token) return <LoginScreen onLogin={setToken} />;
  return <Dashboard token={token} onLogout={handleLogout} />;
}
