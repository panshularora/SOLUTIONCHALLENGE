import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  LayoutDashboard, Image as ImageIcon, AlertTriangle, FileText, 
  Search, Bell, LogOut, ShieldCheck, Upload, X, Check, Loader2, 
  ExternalLink, MoreVertical, ScanLine, Filter, Download
} from 'lucide-react';
import { 
  PieChart, Pie, Cell, ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend 
} from 'recharts';
import { API_BASE, UPLOADS_BASE } from './config';

const BRAND = '#5046e4';

// ── Helpers ───────────────────────────────────────────────────────────────────

const getAuthHeaders = () => {
  const token = localStorage.getItem('vigilant_token');
  return {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  };
};

const formatRelativeTime = (isoString) => {
  if (!isoString) return '—';
  const now = new Date();
  const past = new Date(isoString);
  const diffMs = now - past;
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHr = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHr / 24);

  if (diffDay > 0) return `${diffDay}d ago`;
  if (diffHr > 0) return `${diffHr}h ago`;
  if (diffMin > 0) return `${diffMin}m ago`;
  return 'just now';
};

const getPlatformStyles = (platform) => {
  const p = (platform || '').toUpperCase();
  if (p === 'TWITTER') return 'bg-sky-100 text-sky-600 border-sky-200';
  if (p === 'INSTAGRAM') return 'bg-pink-100 text-pink-600 border-pink-200';
  if (p === 'REDDIT') return 'bg-orange-100 text-orange-600 border-orange-200';
  return 'bg-slate-100 text-slate-600 border-slate-200';
};

const getStatusStyles = (status) => {
  const s = (status || 'OPEN').toUpperCase();
  if (s === 'RESOLVED') return 'bg-emerald-100 text-emerald-700 border-emerald-200';
  if (s === 'REVIEWING') return 'bg-amber-100 text-amber-700 border-amber-200';
  return 'bg-rose-100 text-rose-700 border-rose-200';
};

// ── Components ────────────────────────────────────────────────────────────────

const Modal = ({ title, onClose, children }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden border border-slate-200 animate-in fade-in zoom-in duration-200">
      <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
        <h3 className="font-bold text-slate-800 tracking-tight">{title}</h3>
        <button onClick={onClose} className="p-1 hover:bg-slate-200 rounded-lg text-slate-400 transition-colors"><X size={20}/></button>
      </div>
      <div className="p-8">{children}</div>
    </div>
  </div>
);

const ScanOverlay = ({ asset, onComplete, onCancel }) => {
  const [step, setStep] = useState(0);
  const [completed, setCompleted] = useState([]);
  const [error, setError] = useState(null);

  const steps = [
    "Computing image fingerprint...",
    "Searching across the web...",
    "Analyzing matches...",
    "Violations report ready"
  ];

  useEffect(() => {
    let active = true;
    const run = async () => {
      // Step 1: Fingerprint (1s)
      await new Promise(r => setTimeout(r, 1000));
      if (!active) return;
      setCompleted(p => [...p, 0]);
      setStep(1);

      // Step 2: Search (Real API)
      try {
        const res = await fetch(`${API_BASE}/assets/${asset.id}/scan`, {
          method: 'POST',
          headers: getAuthHeaders()
        });
        if (!res.ok) throw new Error("Scan failed");
        await res.json();
        if (!active) return;
        setCompleted(p => [...p, 1]);
        setStep(2);
      } catch (err) {
        setError(err.message);
        return;
      }

      // Step 3: Analyze (1s)
      await new Promise(r => setTimeout(r, 1000));
      if (!active) return;
      setCompleted(p => [...p, 2]);
      setStep(3);

      // Step 4: Ready (0.5s)
      await new Promise(r => setTimeout(r, 500));
      if (!active) return;
      setCompleted(p => [...p, 3]);
      
      setTimeout(onComplete, 800);
    };

    run();
    return () => { active = false; };
  }, [asset]);

  return (
    <div className="fixed inset-0 z-[100] bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-6">
      <div className="w-full max-w-md bg-white rounded-3xl p-10 shadow-2xl">
        <div className="flex flex-col items-center text-center mb-10">
          <div className="w-16 h-16 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-600 mb-6">
            <ScanLine size={32} strokeWidth={2.5} className="animate-pulse" />
          </div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight mb-2">Vigilant Scanner</h2>
          <p className="text-slate-500 text-sm">Processing asset: <span className="font-mono text-indigo-600">{(asset.id || '').substring(0,8)}</span></p>
        </div>

        <div className="space-y-6">
          {steps.map((text, i) => {
            const isDone = completed.includes(i);
            const isActive = step === i && !error;
            return (
              <div key={i} className={`flex items-center gap-4 transition-all duration-300 ${i > step && !error ? 'opacity-30' : 'opacity-100'}`}>
                <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center transition-all duration-500
                  ${isDone ? 'bg-emerald-500 border-emerald-500 text-white' : isActive ? 'border-indigo-600 text-indigo-600' : 'border-slate-200 text-slate-300'}`}>
                  {isDone ? <Check size={16} strokeWidth={3} /> : isActive ? <Loader2 size={16} className="animate-spin" /> : <div className="w-1.5 h-1.5 rounded-full bg-current" />}
                </div>
                <span className={`text-sm font-bold ${isDone ? 'text-emerald-600' : isActive ? 'text-slate-900' : 'text-slate-400'}`}>{text}</span>
              </div>
            );
          })}
        </div>

        {error && (
          <div className="mt-8 p-4 bg-rose-50 border border-rose-100 rounded-xl">
            <p className="text-rose-600 text-xs font-bold text-center">{error}</p>
            <button onClick={onCancel} className="w-full mt-3 py-2 bg-rose-600 text-white text-xs font-bold rounded-lg uppercase tracking-widest">Close</button>
          </div>
        )}
      </div>
    </div>
  );
};

// ── Main App ──────────────────────────────────────────────────────────────────

export default function App() {
  const [token, setToken] = useState(localStorage.getItem('vigilant_token'));
  const [view, setView] = useState('Dashboard');
  const [assets, setAssets] = useState([]);
  const [violations, setViolations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [scanningAsset, setScanningAsset] = useState(null);
  const [selectedViolation, setSelectedViolation] = useState(null);
  const [isRegisterOpen, setIsRegisterOpen] = useState(false);
  const [toast, setToast] = useState(null);

  // Auth Guard
  useEffect(() => {
    if (!token && view !== 'Login') setView('Login');
  }, [token]);

  const showToast = (msg, type='success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const fetchData = async () => {
    if (!token) return;
    try {
      const [assetsRes, violationsRes] = await Promise.all([
        fetch(`${API_BASE}/assets`, { headers: getAuthHeaders() }),
        fetch(`${API_BASE}/violations`, { headers: getAuthHeaders() })
      ]);
      
      if (assetsRes.status === 401) { logout(); return; }
      
      const [assetsData, violationsData] = await Promise.all([
        assetsRes.json(),
        violationsRes.json()
      ]);
      setAssets(assetsData);
      setViolations(violationsData);
    } catch (err) {
      showToast("Connection failed", "error");
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 5000);
    return () => clearInterval(interval);
  }, [token]);

  const logout = () => {
    localStorage.removeItem('vigilant_token');
    setToken(null);
    setView('Login');
  };

  // ── Views ───────────────────────────────────────────────────────────────────

  const LoginView = () => {
    const [creds, setCreds] = useState({ username: 'admin', password: 'password' });
    const handleLogin = async (e) => {
      e.preventDefault();
      try {
        const res = await fetch(`${API_BASE}/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(creds)
        });
        const data = await res.json();
        if (data.token) {
          localStorage.setItem('vigilant_token', data.token);
          setToken(data.token);
          setView('Dashboard');
        } else {
          showToast(data.error || "Login failed", "error");
        }
      } catch {
        showToast("Server unreachable", "error");
      }
    };

    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6">
        <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-200 p-10">
          <div className="flex items-center gap-3 mb-10">
            <div className="w-12 h-12 rounded-2xl bg-indigo-600 flex items-center justify-center text-white">
              <ShieldCheck size={28} strokeWidth={2.5} />
            </div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tighter">Vigilant</h1>
          </div>
          <form onSubmit={handleLogin} className="space-y-6">
            <div>
              <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Username</label>
              <input value={creds.username} onChange={e => setCreds(p => ({...p, username: e.target.value}))}
                className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-slate-800 font-bold focus:ring-4 ring-indigo-50 outline-none transition-all" />
            </div>
            <div>
              <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Password</label>
              <input type="password" value={creds.password} onChange={e => setCreds(p => ({...p, password: e.target.value}))}
                className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-slate-800 font-bold focus:ring-4 ring-indigo-50 outline-none transition-all" />
            </div>
            <button type="submit" className="w-full py-5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-black text-lg tracking-tight transition-all shadow-xl shadow-indigo-200">
              Sign In
            </button>
          </form>
        </div>
      </div>
    );
  };

  const DashboardView = () => {
    const totalViolations = violations.length;
    const avgConf = totalViolations > 0 
      ? (violations.reduce((a,v) => a + v.confidence, 0) / totalViolations * 100).toFixed(1)
      : 0;
    const riskAssets = new Set(violations.filter(v => v.status === 'OPEN').map(v => v.asset_id)).size;

    const pieData = useMemo(() => {
      const counts = {};
      violations.forEach(v => counts[v.platform] = (counts[v.platform] || 0) + 1);
      return Object.entries(counts).map(([name, value]) => ({ name, value }));
    }, [violations]);

    const lineData = useMemo(() => {
      const days = {};
      for(let i=6; i>=0; i--) {
        const d = new Date(); d.setDate(d.getDate() - i);
        days[d.toISOString().split('T')[0]] = 0;
      }
      violations.forEach(v => {
        const d = v.detected_at.split('T')[0];
        if(days[d] !== undefined) days[d]++;
      });
      return Object.entries(days).map(([date, count]) => ({ 
        date: new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        count 
      }));
    }, [violations]);

    return (
      <div className="space-y-8 animate-in fade-in duration-500">
        <div className="grid grid-cols-4 gap-6">
          {[
            { label: 'Total Assets', value: assets.length, icon: ImageIcon, color: 'text-indigo-600' },
            { label: 'Violations Found', value: totalViolations, icon: AlertTriangle, color: 'text-rose-600' },
            { label: 'Avg Confidence', value: `${avgConf}%`, icon: ShieldCheck, color: 'text-amber-600' },
            { label: 'Assets at Risk', value: riskAssets, icon: FileText, color: 'text-emerald-600' }
          ].map((m, i) => (
            <div key={i} className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                <m.icon size={12} className={m.color} /> {m.label}
              </p>
              <h3 className={`text-4xl font-black tracking-tighter ${m.color}`}>{m.value}</h3>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-3 gap-6">
          <div className="col-span-1 bg-white p-8 rounded-3xl border border-slate-200 shadow-sm h-[400px] flex flex-col">
            <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest mb-8">Violations by Platform</h3>
            <div className="flex-1">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={pieData} innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                    {pieData.map((e, i) => <Cell key={i} fill={[BRAND, '#ec4899', '#f59e0b', '#94a3b8'][i % 4]} />)}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
          <div className="col-span-2 bg-white p-8 rounded-3xl border border-slate-200 shadow-sm h-[400px] flex flex-col">
            <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest mb-8">7-Day Detection Trend</h3>
            <div className="flex-1">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={lineData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{fontSize: 10, fill: '#94a3b8'}} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{fontSize: 10, fill: '#94a3b8'}} />
                  <Tooltip contentStyle={{borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)'}} />
                  <Line type="monotone" dataKey="count" stroke={BRAND} strokeWidth={4} dot={{r: 4, strokeWidth: 3, fill: '#fff'}} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const AssetsView = () => {
    const [form, setForm] = useState({ team: '', event: '', file: null });
    const [regLoading, setRegLoading] = useState(false);

    const handleRegister = async (e) => {
      e.preventDefault();
      if (!form.file) return;
      setRegLoading(true);
      const fd = new FormData();
      fd.append('image', form.file);
      fd.append('team', form.team);
      fd.append('event_name', form.event);

      try {
        const res = await fetch(`${API_BASE}/assets/register`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}` },
          body: fd
        });
        if (res.ok) {
          showToast("Asset registered successfully");
          setIsRegisterOpen(false);
          fetchData();
        }
      } catch {
        showToast("Registration failed", "error");
      } finally { setRegLoading(false); }
    };

    return (
      <div className="animate-in fade-in duration-500">
        <div className="flex justify-between items-end mb-8">
          <div>
            <h2 className="text-3xl font-black text-slate-900 tracking-tight">Digital Assets</h2>
            <p className="text-slate-500 text-sm">Manage your registered logos and media for protection.</p>
          </div>
          <button onClick={() => setIsRegisterOpen(true)} className="flex items-center gap-2 bg-indigo-600 text-white px-6 py-3 rounded-2xl font-bold text-sm shadow-xl shadow-indigo-100 hover:scale-105 transition-all">
            <Upload size={16} /> Register New Asset
          </button>
        </div>

        {assets.length === 0 ? (
          <div className="py-20 text-center bg-white rounded-3xl border-2 border-dashed border-slate-200">
            <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-300 mx-auto mb-4">
              <ImageIcon size={32} />
            </div>
            <h3 className="text-slate-900 font-bold mb-1">No assets registered yet</h3>
            <p className="text-slate-400 text-sm mb-6">Click Register to get started.</p>
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-8">
            {assets.map(asset => {
              const vCount = violations.filter(v => v.asset_id === asset.id).length;
              return (
                <div key={asset.id} className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm group hover:shadow-xl transition-all duration-300">
                  <div className="aspect-[4/3] bg-slate-100 relative overflow-hidden">
                    <img src={`${UPLOADS_BASE}/${asset.id}.jpg`} alt={asset.team} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
                    <div className="absolute top-4 right-4 bg-white/90 backdrop-blur-md px-3 py-1.5 rounded-xl text-[10px] font-black text-indigo-600 uppercase tracking-widest shadow-sm">
                      {vCount} Violations
                    </div>
                  </div>
                  <div className="p-6">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h4 className="font-black text-slate-900 text-lg leading-tight mb-1">{asset.team}</h4>
                        <p className="text-slate-500 text-xs font-bold uppercase tracking-wider">{asset.event_name}</p>
                      </div>
                    </div>
                    <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{formatRelativeTime(asset.registered_at)}</span>
                      <button onClick={() => setScanningAsset(asset)} className="bg-slate-900 text-white px-4 py-2 rounded-xl text-xs font-bold hover:bg-indigo-600 transition-colors">
                        Scan Now
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {isRegisterOpen && (
          <Modal title="Register New Asset" onClose={() => setIsRegisterOpen(false)}>
            <form onSubmit={handleRegister} className="space-y-6">
              <div className="aspect-video bg-slate-50 border-2 border-dashed border-slate-200 rounded-2xl flex flex-col items-center justify-center p-6 text-center cursor-pointer hover:bg-slate-100 transition-all relative overflow-hidden">
                {form.file ? (
                  <img src={URL.createObjectURL(form.file)} className="absolute inset-0 w-full h-full object-cover opacity-50" />
                ) : (
                  <Upload size={32} className="text-slate-300 mb-2" />
                )}
                <p className="text-slate-500 font-bold text-sm relative z-10">{form.file ? form.file.name : 'Drop asset image here'}</p>
                <input type="file" className="absolute inset-0 opacity-0 cursor-pointer" onChange={e => setForm({...form, file: e.target.files[0]})} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Team Name</label>
                  <input value={form.team} onChange={e => setForm({...form, team: e.target.value})} placeholder="e.g. Real Madrid"
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold outline-none focus:border-indigo-600" />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Event Name</label>
                  <input value={form.event} onChange={e => setForm({...form, event: e.target.value})} placeholder="e.g. 2024 Launch"
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold outline-none focus:border-indigo-600" />
                </div>
              </div>
              <button type="submit" disabled={regLoading || !form.file} className="w-full py-4 bg-indigo-600 text-white rounded-xl font-black shadow-lg shadow-indigo-100 disabled:opacity-50">
                {regLoading ? <Loader2 className="animate-spin mx-auto" /> : 'Register Asset'}
              </button>
            </form>
          </Modal>
        )}
      </div>
    );
  };

  const ViolationsView = () => {
    const handleStatusUpdate = async (id, status) => {
      try {
        const res = await fetch(`${API_BASE}/violations/${id}`, {
          method: 'PUT',
          headers: getAuthHeaders(),
          body: JSON.stringify({ status })
        });
        if (res.ok) {
          fetchData();
          setSelectedViolation(null);
          showToast(`Violation marked as ${status}`);
        }
      } catch { showToast("Update failed", "error"); }
    };

    return (
      <div className="animate-in fade-in duration-500">
        <div className="flex justify-between items-end mb-8">
          <div>
            <h2 className="text-3xl font-black text-slate-900 tracking-tight">Violations Log</h2>
            <p className="text-slate-500 text-sm">Real-time detection of unauthorized asset usage.</p>
          </div>
          <div className="flex gap-3">
            <button className="p-3 bg-white border border-slate-200 rounded-xl text-slate-400 hover:text-slate-900 shadow-sm"><Filter size={18}/></button>
            <button className="p-3 bg-white border border-slate-200 rounded-xl text-slate-400 hover:text-slate-900 shadow-sm"><Download size={18}/></button>
          </div>
        </div>

        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
          <table className="w-full text-left">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                <th className="px-8 py-5">Asset</th>
                <th className="px-8 py-5">Source URL</th>
                <th className="px-8 py-5">Platform</th>
                <th className="px-8 py-5">Confidence</th>
                <th className="px-8 py-5">Detected</th>
                <th className="px-8 py-5">Status</th>
                <th className="px-8 py-5"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {violations.length === 0 ? (
                <tr>
                  <td colSpan="7" className="py-20 text-center">
                    <AlertTriangle size={32} className="text-slate-200 mx-auto mb-4" />
                    <p className="text-slate-400 text-sm font-bold">No violations found yet.</p>
                  </td>
                </tr>
              ) : (
                violations.map(v => (
                  <tr key={v.id} onClick={() => setSelectedViolation(v)} className="hover:bg-slate-50 transition-colors cursor-pointer group">
                    <td className="px-8 py-4">
                      <div className="w-10 h-10 rounded-lg overflow-hidden border border-slate-200">
                        <img src={`${UPLOADS_BASE}/${v.asset_id}.jpg`} className="w-full h-full object-cover" />
                      </div>
                    </td>
                    <td className="px-8 py-4">
                      <a href={v.source_url} target="_blank" className="text-xs font-bold text-indigo-600 hover:underline flex items-center gap-1">
                        {v.source_url.substring(0, 30)}... <ExternalLink size={10} />
                      </a>
                    </td>
                    <td className="px-8 py-4">
                      <span className={`px-3 py-1 rounded-full text-[10px] font-black border uppercase tracking-tighter ${getPlatformStyles(v.platform)}`}>
                        {v.platform}
                      </span>
                    </td>
                    <td className="px-8 py-4">
                      <div className="flex items-center gap-2">
                        <div className="w-12 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                          <div className={`h-full rounded-full ${v.confidence > 0.85 ? 'bg-rose-500' : v.confidence > 0.6 ? 'bg-amber-500' : 'bg-emerald-500'}`} 
                            style={{width: `${v.confidence*100}%`}} />
                        </div>
                        <span className="text-xs font-black text-slate-700">{Math.round(v.confidence*100)}%</span>
                      </div>
                    </td>
                    <td className="px-8 py-4 text-xs font-bold text-slate-500">{formatRelativeTime(v.detected_at)}</td>
                    <td className="px-8 py-4">
                      <span className={`px-3 py-1 rounded-full text-[10px] font-black border uppercase tracking-tighter ${getStatusStyles(v.status)}`}>
                        {v.status}
                      </span>
                    </td>
                    <td className="px-8 py-4 text-right">
                      <button className="p-2 text-slate-300 group-hover:text-slate-900 transition-colors"><MoreVertical size={18}/></button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Detail Drawer */}
        <div className={`fixed top-0 right-0 h-full w-[420px] bg-white shadow-2xl border-l border-slate-100 z-50 transform transition-transform duration-500 ease-in-out ${selectedViolation ? 'translate-x-0' : 'translate-x-full'}`}>
          {selectedViolation && (
            <div className="h-full flex flex-col">
              <div className="p-8 border-b border-slate-100 flex justify-between items-center">
                <h3 className="text-xl font-black text-slate-900 tracking-tight">Violation Analysis</h3>
                <button onClick={() => setSelectedViolation(null)} className="p-2 hover:bg-slate-100 rounded-xl transition-colors"><X/></button>
              </div>
              <div className="flex-1 overflow-y-auto p-8 space-y-8">
                <div className="aspect-video rounded-3xl bg-slate-100 overflow-hidden border border-slate-200">
                  <img src={selectedViolation.thumbnail_url} className="w-full h-full object-cover" />
                </div>
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 block">Match Confidence</label>
                  <div className="flex items-baseline gap-2">
                    <span className={`text-6xl font-black tracking-tighter ${selectedViolation.confidence > 0.85 ? 'text-rose-600' : 'text-amber-600'}`}>
                      {Math.round(selectedViolation.confidence*100)}%
                    </span>
                    <span className="text-slate-400 font-bold uppercase text-[10px]">Likelihood</span>
                  </div>
                </div>
                <div className="space-y-4">
                  <div className="flex justify-between items-center py-4 border-b border-slate-50">
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Platform</span>
                    <span className={`px-3 py-1 rounded-full text-[10px] font-black border uppercase ${getPlatformStyles(selectedViolation.platform)}`}>{selectedViolation.platform}</span>
                  </div>
                  <div className="py-4 border-b border-slate-50">
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2 block">Source URL</span>
                    <a href={selectedViolation.source_url} target="_blank" className="text-indigo-600 font-bold text-sm break-all hover:underline">{selectedViolation.source_url}</a>
                  </div>
                  <div className="flex justify-between items-center py-4 border-b border-slate-50">
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Detected At</span>
                    <span className="text-sm font-bold text-slate-700">{new Date(selectedViolation.detected_at).toLocaleString()}</span>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4 pt-4">
                  <button onClick={() => handleStatusUpdate(selectedViolation.id, 'RESOLVED')} className="py-4 bg-emerald-600 text-white rounded-2xl font-black shadow-lg shadow-emerald-50 text-sm">Mark Resolved</button>
                  <button onClick={() => handleStatusUpdate(selectedViolation.id, 'REVIEWING')} className="py-4 bg-amber-500 text-white rounded-2xl font-black shadow-lg shadow-amber-50 text-sm">Mark Reviewing</button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  if (view === 'Login') return <LoginView />;

  return (
    <div className="flex min-h-screen bg-slate-50 text-slate-900 font-sans selection:bg-indigo-100 selection:text-indigo-600">
      {/* Sidebar */}
      <aside className="w-72 bg-white border-r border-slate-200 flex flex-col p-8 fixed h-full z-40">
        <div className="flex items-center gap-3 mb-12">
          <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow-lg shadow-indigo-100">
            <ShieldCheck size={24} strokeWidth={2.5} />
          </div>
          <span className="text-2xl font-black tracking-tighter">Vigilant</span>
        </div>
        <nav className="flex-1 space-y-2">
          {[
            { id: 'Dashboard', icon: LayoutDashboard },
            { id: 'Assets', icon: ImageIcon },
            { id: 'Violations', icon: AlertTriangle },
            { id: 'Reports', icon: FileText }
          ].map(item => (
            <button key={item.id} onClick={() => setView(item.id)}
              className={`w-full flex items-center gap-4 px-5 py-4 rounded-2xl font-bold text-sm transition-all
                ${view === item.id ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-100' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-900'}`}>
              <item.icon size={20} /> {item.id}
            </button>
          ))}
        </nav>
        <button onClick={logout} className="mt-auto flex items-center gap-4 px-5 py-4 text-slate-400 hover:text-rose-600 font-bold text-sm transition-all">
          <LogOut size={20} /> Sign Out
        </button>
      </aside>

      {/* Main Content */}
      <main className="flex-1 ml-72 p-12">
        <header className="flex justify-between items-center mb-12">
          <div className="relative w-96">
            <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
            <input placeholder="Search violations..." className="w-full pl-14 pr-6 py-4 bg-white border border-slate-200 rounded-3xl text-sm font-medium outline-none focus:ring-4 ring-indigo-50 transition-all" />
          </div>
          <div className="flex items-center gap-6">
            <button className="w-12 h-12 rounded-2xl bg-white border border-slate-200 flex items-center justify-center text-slate-400 hover:text-slate-900 transition-all shadow-sm">
              <Bell size={20} />
            </button>
            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className="text-sm font-black text-slate-900">Admin User</p>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Pro License</p>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-slate-900 border-4 border-white shadow-xl"></div>
            </div>
          </div>
        </header>

        {view === 'Dashboard' && <DashboardView />}
        {view === 'Assets' && <AssetsView />}
        {view === 'Violations' && <ViolationsView />}

        {/* Global Toast */}
        {toast && (
          <div className={`fixed bottom-10 left-1/2 -translate-x-1/2 px-8 py-4 rounded-2xl shadow-2xl z-[200] border font-bold text-sm flex items-center gap-3 animate-in slide-in-from-bottom duration-300
            ${toast.type === 'error' ? 'bg-rose-600 text-white border-rose-700' : 'bg-slate-900 text-white border-slate-950'}`}>
            {toast.type === 'error' ? <AlertTriangle size={18}/> : <Check size={18} className="text-emerald-400"/>}
            {toast.msg}
          </div>
        )}

        {/* Scanning Overlay */}
        {scanningAsset && (
          <ScanOverlay 
            asset={scanningAsset} 
            onComplete={() => { setScanningAsset(null); setView('Violations'); }} 
            onCancel={() => setScanningAsset(null)} 
          />
        )}
      </main>
    </div>
  );
}
