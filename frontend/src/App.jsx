import React, { useState, useEffect, useRef } from 'react';
import {
  LayoutDashboard, Image as ImageIcon, AlertTriangle, FileText,
  Bell, Search, MoreVertical, ExternalLink, ShieldCheck, LogOut, Loader2, Upload, Check, ScanLine, X
} from 'lucide-react';

const API = 'http://127.0.0.1:5005';
const BRAND = '#5046e4';

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

// ── Violation Drawer ──────────────────────────────────────────────────────────
const ViolationDrawer = ({ violation, onClose }) => {
  const [active, setActive] = useState(false);

  useEffect(() => {
    if (violation) {
      setTimeout(() => setActive(true), 10);
    } else {
      setActive(false);
    }
  }, [violation]);

  if (!violation) return null;

  const conf = violation.confidence_score || 0;
  const confPct = Math.round(conf * 100);
  const confColor = conf > 0.85 ? 'text-rose-600' : conf >= 0.60 ? 'text-amber-600' : 'text-emerald-600';
  
  let hostname = violation.source_url || '';
  let platform = 'UNKNOWN';
  try {
    const u = new URL(hostname.startsWith('http') ? hostname : `https://${hostname}`);
    hostname = u.hostname;
    platform = u.hostname.replace('www.', '').split('.')[0].toUpperCase();
  } catch { }

  return (
    <div className="fixed inset-0 z-[100] overflow-hidden">
      {/* Backdrop */}
      <div 
        className={`absolute inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity duration-300 ease-in-out ${active ? 'opacity-100' : 'opacity-0'}`}
        onClick={() => { setActive(false); setTimeout(onClose, 300); }}
      />
      
      {/* Drawer Panel */}
      <div 
        className={`absolute top-0 right-0 h-full w-[420px] bg-white shadow-2xl transition-transform duration-300 ease-in-out transform ${active ? 'translate-x-0' : 'translate-x-full'} overflow-y-auto border-l border-slate-100`}
      >
        <div className="p-8">
          <div className="flex justify-between items-center mb-8">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600">
                <AlertTriangle size={18} />
              </div>
              <h2 className="text-xl font-bold text-slate-800 tracking-tight">Violation Detail</h2>
            </div>
            <button 
              onClick={() => { setActive(false); setTimeout(onClose, 300); }}
              className="p-2 hover:bg-slate-100 rounded-full text-slate-400 hover:text-slate-600 transition-colors"
            >
              <X size={20} />
            </button>
          </div>

          <div className="w-full aspect-square rounded-2xl bg-slate-50 border border-slate-200 overflow-hidden mb-8 shadow-sm">
            <img 
              src={`https://picsum.photos/seed/${violation.asset_id}/600/600`} 
              alt="Asset" 
              className="w-full h-full object-cover"
            />
          </div>

          <div className="space-y-7">
            <div>
              <label className="text-xs font-bold text-slate-400 uppercase tracking-widest block mb-2">Match Confidence</label>
              <div className="flex items-baseline gap-2">
                <span className={`text-6xl font-black tracking-tighter ${confColor}`}>{confPct}%</span>
                <span className="text-slate-400 font-bold">likelihood</span>
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-400 uppercase tracking-widest block mb-2">Detected Source</label>
              <a 
                href={violation.source_url} 
                target="_blank" 
                rel="noreferrer" 
                className="text-indigo-600 font-semibold hover:underline flex items-center gap-2 group break-all leading-relaxed"
              >
                {violation.source_url}
                <ExternalLink size={14} className="shrink-0" />
              </a>
            </div>

            <div className="grid grid-cols-2 gap-6">
              <div>
                <label className="text-xs font-bold text-slate-400 uppercase tracking-widest block mb-2">Platform</label>
                <span className="px-3 py-1.5 bg-slate-100 text-slate-600 text-xs font-bold rounded-lg tracking-wide inline-block">
                  {platform}
                </span>
              </div>
              <div>
                <label className="text-xs font-bold text-slate-400 uppercase tracking-widest block mb-2">Status</label>
                <Badge status={violation.status} />
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-400 uppercase tracking-widest block mb-2">Detection Date</label>
              <p className="text-slate-700 font-semibold">
                {new Date(violation.detected_at).toLocaleString('en-US', {
                  weekday: 'short', month: 'long', day: 'numeric', year: 'numeric',
                  hour: '2-digit', minute: '2-digit'
                })}
              </p>
            </div>

            <div className="pt-8 space-y-4">
              <button className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-lg shadow-emerald-200 transition-all flex items-center justify-center gap-3">
                <Check size={20} strokeWidth={3} />
                Mark as Resolved
              </button>
              <button className="w-full py-4 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl shadow-lg shadow-rose-200 transition-all flex items-center justify-center gap-3">
                <AlertTriangle size={20} strokeWidth={3} />
                Escalate to Legal
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// ── Scan Overlay ──────────────────────────────────────────────────────────────
const SCAN_STEPS = [
  'Generating fingerprint (pHash + CLIP)...',
  'Querying web detection API...',
  'Comparing against registered assets...',
  'Compiling violations report...',
];

const ScanOverlay = ({ visible, onComplete }) => {
  const [completedSteps, setCompletedSteps] = useState([]);
  const [activeStep, setActiveStep] = useState(0);
  const [fading, setFading] = useState(false);

  useEffect(() => {
    if (!visible) {
      setCompletedSteps([]);
      setActiveStep(0);
      setFading(false);
      return;
    }

    let step = 0;
    const run = () => {
      if (step >= SCAN_STEPS.length) {
        // All steps done — fade out then call onComplete
        setTimeout(() => setFading(true), 400);
        setTimeout(() => onComplete(), 1200);
        return;
      }
      setActiveStep(step);
      setTimeout(() => {
        setCompletedSteps(prev => [...prev, step]);
        step++;
        setTimeout(run, 300);
      }, 1500);
    };

    const init = setTimeout(run, 400);
    return () => clearTimeout(init);
  }, [visible]);

  if (!visible && !fading) return null;

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        background: 'rgba(10, 10, 20, 0.82)',
        backdropFilter: 'blur(8px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        opacity: fading ? 0 : 1,
        transition: 'opacity 0.8s ease',
        pointerEvents: fading ? 'none' : 'all',
      }}
    >
      <div style={{
        background: '#fff', borderRadius: 24, padding: '48px 56px',
        minWidth: 480, boxShadow: '0 32px 80px rgba(80,70,228,0.25)',
        border: '1px solid rgba(80,70,228,0.15)',
      }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 36 }}>
          <div style={{
            width: 44, height: 44, borderRadius: 12,
            background: BRAND, display: 'flex', alignItems: 'center', justifySelf: 'center', justifyContent: 'center',
          }}>
            <ScanLine size={22} color="#fff" strokeWidth={2.5} />
          </div>
          <div>
            <p style={{ fontWeight: 700, fontSize: 18, color: '#0f172a', margin: 0 }}>Scanning Image</p>
            <p style={{ fontSize: 13, color: '#64748b', margin: 0 }}>AI-powered violation detection</p>
          </div>
        </div>

        {/* Progress bar */}
        <div style={{ height: 4, background: '#f1f5f9', borderRadius: 99, marginBottom: 32, overflow: 'hidden' }}>
          <div style={{
            height: '100%', background: BRAND, borderRadius: 99,
            width: `${(completedSteps.length / SCAN_STEPS.length) * 100}%`,
            transition: 'width 0.6s cubic-bezier(0.4,0,0.2,1)',
          }} />
        </div>

        {/* Steps */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          {SCAN_STEPS.map((label, i) => {
            const done = completedSteps.includes(i);
            const active = activeStep === i && !done;
            return (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 14, opacity: i > activeStep && !done ? 0.35 : 1, transition: 'opacity 0.3s' }}>
                {/* Icon */}
                <div style={{
                  width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: done ? '#ecfdf5' : active ? '#eef2ff' : '#f8fafc',
                  border: `2px solid ${done ? '#10b981' : active ? BRAND : '#e2e8f0'}`,
                  transition: 'all 0.4s ease',
                }}>
                  {done
                    ? <Check size={14} color="#10b981" strokeWidth={3} />
                    : active
                      ? <div style={{
                          width: 12, height: 12, borderRadius: '50%',
                          border: `2px solid ${BRAND}`,
                          borderTopColor: 'transparent',
                          animation: 'spin 0.7s linear infinite',
                        }} />
                      : <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#cbd5e1' }} />
                  }
                </div>
                {/* Label */}
                <span style={{
                  fontSize: 14, fontWeight: done ? 600 : active ? 600 : 400,
                  color: done ? '#059669' : active ? BRAND : '#64748b',
                  transition: 'color 0.3s',
                }}>
                  {label}
                </span>
              </div>
            );
          })}
        </div>

        <p style={{ marginTop: 32, fontSize: 12, color: '#94a3b8', textAlign: 'center' }}>
          Do not close this window while scanning...
        </p>
      </div>

      {/* Keyframe for spinner (injected once) */}
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
};

// ── Upload Button ─────────────────────────────────────────────────────────────
const UploadScanButton = ({ token, onScanComplete }) => {
  const fileRef = useRef();
  const [scanning, setScanning] = useState(false);
  const [dragging, setDragging] = useState(false);

  const handleFile = async (file) => {
    if (!file || scanning) return;
    setScanning(true);

    // We kick off the actual API call immediately in parallel with the animation
    const form = new FormData();
    form.append('image', file);

    try {
      const res = await fetch(`${API}/api/scan`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: form,
      });
      const data = await res.json();
      // Store result; overlay will call onScanComplete when animation finishes
      window.__scanResult = data;
    } catch {
      window.__scanResult = null;
    }
  };

  const handleOverlayComplete = () => {
    setScanning(false);
    onScanComplete(window.__scanResult);
    window.__scanResult = undefined;
  };

  const onDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  };

  return (
    <>
      <ScanOverlay visible={scanning} onComplete={handleOverlayComplete} />

      <div
        onDragOver={e => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        onClick={() => fileRef.current?.click()}
        style={{
          display: 'flex', alignItems: 'center', gap: 8,
          padding: '8px 18px', borderRadius: 10, cursor: 'pointer',
          background: dragging ? '#eef2ff' : BRAND,
          border: `2px dashed ${dragging ? BRAND : 'transparent'}`,
          color: dragging ? BRAND : '#fff',
          fontWeight: 600, fontSize: 14,
          transition: 'all 0.2s',
          boxShadow: `0 4px 14px rgba(80,70,228,0.3)`,
        }}
      >
        <Upload size={16} strokeWidth={2.5} />
        Scan Image
        <input
          ref={fileRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          style={{ display: 'none' }}
          onChange={e => handleFile(e.target.files?.[0])}
        />
      </div>
    </>
  );
};

// ── Login Screen ──────────────────────────────────────────────────────────────
const LoginScreen = ({ onLogin }) => {
  const [creds, setCreds] = useState({ username: 'admin', password: 'password' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true); setError('');
    try {
      const res = await fetch(`${API}/api/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(creds),
      });
      const data = await res.json();
      if (data.token) { localStorage.setItem('vigilant_token', data.token); onLogin(data.token); }
      else setError(data.error || 'Login failed');
    } catch {
      setError('Cannot reach server. Is the Flask backend running on port 5005?');
    } finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-100">
      <div className="bg-white rounded-2xl shadow-xl border border-slate-200 p-10 w-full max-w-md">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white shadow-lg" style={{ background: BRAND }}>
            <ShieldCheck size={22} strokeWidth={2.5} />
          </div>
          <span className="text-2xl font-bold text-slate-900 tracking-tight">Vigilant</span>
        </div>
        <h2 className="text-xl font-semibold text-slate-700 mb-1">Sign in</h2>
        <p className="text-sm text-slate-500 mb-7">Digital Asset Protection Platform</p>
        {error && <div className="mb-5 bg-red-50 border border-red-200 text-red-600 text-sm rounded-lg px-4 py-3">{error}</div>}
        <form onSubmit={handleSubmit} className="space-y-5">
          {['username', 'password'].map(field => (
            <div key={field}>
              <label className="block text-sm font-medium text-slate-700 mb-1.5 capitalize">{field}</label>
              <input
                type={field === 'password' ? 'password' : 'text'}
                value={creds[field]}
                onChange={e => setCreds(p => ({ ...p, [field]: e.target.value }))}
                className="w-full px-4 py-2.5 rounded-lg border border-slate-200 text-sm focus:ring-2 focus:border-transparent outline-none transition-all"
                style={{ '--tw-ring-color': BRAND }}
              />
            </div>
          ))}
          <button
            type="submit" disabled={loading}
            className="w-full flex items-center justify-center gap-2 text-white font-semibold py-2.5 rounded-lg transition-colors shadow-sm disabled:opacity-60"
            style={{ background: BRAND }}
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
  const [scanFlash, setScanFlash] = useState(false);
  const [selectedViolation, setSelectedViolation] = useState(null);

  const headers = { Authorization: `Bearer ${token}` };

  const fetchViolations = () => {
    fetch(`${API}/api/violations`, { headers })
      .then(r => r.json())
      .then(d => { setViolations(d.violations || []); setLoading(false); })
      .catch(() => setLoading(false));
  };

  useEffect(() => { fetchViolations(); }, [token]);

  const handleScanComplete = (result) => {
    // Refresh violations table and flash it
    fetchViolations();
    setScanFlash(true);
    setTimeout(() => setScanFlash(false), 1500);
  };

  const totalAssets = new Set(violations.map(v => v.asset_id)).size;
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
    { label: 'Total Assets',     value: totalAssets,          color: '#5046e4' },
    { label: 'Violations Found', value: violations.length,    color: '#e11d48' },
    { label: 'Avg Confidence',   value: `${avgConfidence}%`,  color: '#d97706' },
    { label: 'Assets at Risk',   value: assetsAtRisk,         color: '#059669' },
  ];

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-slate-200 flex flex-col shrink-0 shadow-sm">
        <div className="p-6 flex items-center gap-3 border-b border-slate-100">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center text-white shadow-md" style={{ background: BRAND }}>
            <ShieldCheck size={20} strokeWidth={2.5} />
          </div>
          <span className="font-bold text-xl tracking-tight text-slate-900">Vigilant</span>
        </div>
        <nav className="flex-1 px-3 py-5 space-y-1">
          {navItems.map(({ icon: Icon, label }) => (
            <button key={label} onClick={() => setActiveNav(label)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150
                ${activeNav === label ? 'text-white' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'}`}
              style={activeNav === label ? { background: BRAND } : {}}
            >
              <Icon size={18} strokeWidth={activeNav === label ? 2.5 : 2}
                color={activeNav === label ? '#fff' : '#94a3b8'} />
              {label}
            </button>
          ))}
        </nav>
        <div className="p-4 border-t border-slate-200">
          <div className="flex items-center gap-3 px-2 py-1.5">
            <img src="https://ui-avatars.com/api/?name=Admin+User&background=5046e4&color=fff&size=64"
              alt="User" className="w-8 h-8 rounded-full border border-indigo-200" />
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-slate-700 text-sm leading-none mb-1 truncate">Admin User</p>
              <p className="text-xs text-slate-400 leading-none">admin@vigilant.io</p>
            </div>
            <button onClick={onLogout} className="text-slate-400 hover:text-slate-700 transition-colors text-xs">Out</button>
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
              <input placeholder="Search assets or URLs…"
                className="pl-9 pr-4 py-1.5 bg-slate-50 border border-slate-200 rounded-full text-sm focus:ring-2 focus:border-transparent outline-none w-52 transition-all" />
            </div>
            {/* ── Scan Button lives here ── */}
            <UploadScanButton token={token} onScanComplete={handleScanComplete} />
            <div className="relative">
              <button className="w-9 h-9 rounded-full bg-white border border-slate-200 flex items-center justify-center text-slate-500 hover:bg-slate-50 transition-colors shadow-sm">
                <Bell size={16} />
              </button>
              {violations.length > 0 && (
                <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-rose-500 rounded-full border-2 border-white" />
              )}
            </div>
          </div>
        </header>

        {/* Body */}
        <div className="flex-1 overflow-auto p-8 space-y-8">
          {/* Metric Cards */}
          <div className="grid grid-cols-4 gap-6">
            {metrics.map((m, i) => (
              <div key={i} className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm hover:shadow-md transition-shadow">
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-3">{m.label}</p>
                <p className="text-4xl font-bold tracking-tight" style={{ color: m.color }}>{m.value}</p>
              </div>
            ))}
          </div>

          {/* Violations Table */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden transition-all duration-500"
            style={{ outline: scanFlash ? `2px solid ${BRAND}` : '2px solid transparent', outlineOffset: 2 }}>
            <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
              <h2 className="text-base font-bold text-slate-800">Recent Violations</h2>
              <span className="text-xs font-semibold text-slate-400 bg-slate-100 px-3 py-1 rounded-full">
                {violations.length} total
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-slate-50 border-b border-slate-100 text-xs text-slate-500 uppercase tracking-wider font-semibold">
                  <tr>
                    {['Asset','Source URL','Platform','Confidence','Detected','Status','Action'].map(h => (
                      <th key={h} className={`px-6 py-3.5 ${h === 'Action' ? 'text-right' : ''}`}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {loading ? (
                    <tr><td colSpan="7" className="py-16 text-center text-slate-400">
                      <div className="flex flex-col items-center gap-3">
                        <Loader2 size={28} className="animate-spin" style={{ color: BRAND }} />
                        <span className="text-sm font-medium">Fetching violations…</span>
                      </div>
                    </td></tr>
                  ) : violations.length === 0 ? (
                    <tr><td colSpan="7" className="py-16 text-center text-slate-400">
                      <div className="flex flex-col items-center gap-3">
                        <div className="w-12 h-12 bg-emerald-50 rounded-full flex items-center justify-center text-emerald-500">
                          <ShieldCheck size={24} />
                        </div>
                        <span className="text-sm font-medium text-slate-500">No violations found. All assets are secure.</span>
                      </div>
                    </td></tr>
                  ) : (
                    violations.map((v, i) => {
                      let hostname = v.source_url || '';
                      let platform = 'UNKNOWN';
                      try {
                        const u = new URL(hostname.startsWith('http') ? hostname : `https://${hostname}`);
                        hostname = u.hostname;
                        platform = u.hostname.replace('www.', '').split('.')[0].toUpperCase();
                      } catch { /* keep defaults */ }
                      const conf = v.confidence_score || 0;
                      const confPct = Math.round(conf * 100);
                      const barColor = conf > 0.9 ? '#ef4444' : conf > 0.7 ? '#f59e0b' : '#10b981';

                      return (
                        <tr 
                          key={i} 
                          className="hover:bg-slate-50 transition-colors group cursor-pointer"
                          onClick={() => setSelectedViolation(v)}
                        >
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-lg bg-slate-100 border border-slate-200 overflow-hidden shrink-0">
                                <img src={`https://picsum.photos/seed/${v.asset_id}/80/80`} alt="thumb" className="w-full h-full object-cover" />
                              </div>
                              <span className="font-semibold text-slate-700 text-xs font-mono">{(v.asset_id || '').substring(0, 8)}…</span>
                            </div>
                          </td>
                          <td className="px-6 py-4 max-w-[180px]">
                            <a href={v.source_url} target="_blank" rel="noreferrer"
                              className="text-indigo-600 font-medium hover:underline flex items-center gap-1 truncate text-xs"
                              onClick={(e) => e.stopPropagation()}
                            >
                              {hostname}
                              <ExternalLink size={11} className="opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                            </a>
                          </td>
                          <td className="px-6 py-4">
                            <span className="px-2.5 py-1 bg-slate-100 text-slate-600 text-[11px] font-bold rounded-md tracking-wide">{platform}</span>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2.5">
                              <div className="w-16 h-1.5 rounded-full bg-slate-100 overflow-hidden">
                                <div className="h-full rounded-full transition-all" style={{ width: `${confPct}%`, background: barColor }} />
                              </div>
                              <span className="text-xs font-bold text-slate-600">{confPct}%</span>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-xs text-slate-500 font-medium whitespace-nowrap">
                            {v.detected_at ? new Date(v.detected_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—'}
                          </td>
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

      {/* Violation Detail Drawer */}
      <ViolationDrawer 
        violation={selectedViolation} 
        onClose={() => setSelectedViolation(null)} 
      />
    </div>
  );
};

// ── Root ──────────────────────────────────────────────────────────────────────
export default function App() {
  const [token, setToken] = useState(() => localStorage.getItem('vigilant_token') || '');
  const handleLogout = () => { localStorage.removeItem('vigilant_token'); setToken(''); };
  if (!token) return <LoginScreen onLogin={setToken} />;
  return <Dashboard token={token} onLogout={handleLogout} />;
}
