import React, { useState, useEffect, useMemo } from 'react';
import { Filter, Download, ExternalLink, X, AlertTriangle, Image as ImageIcon, Loader2 } from 'lucide-react';
import api from '../api';
import { UPLOADS_BASE } from '../config';
import { StatusBadge, PlatformBadge } from '../components/Common';

const Violations = () => {
  const [violations, setViolations] = useState([]);
  const [assets, setAssets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState(null);

  const fetchData = async () => {
    try {
      const [v, a] = await Promise.all([
        api.get('/violations'),
        api.get('/assets')
      ]);
      setViolations(v.data);
      setAssets(a.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { 
    fetchData(); 
    const interval = setInterval(fetchData, 5000); // Polling during active use
    return () => clearInterval(interval);
  }, []);

  const selectedViolation = useMemo(() => 
    violations.find(v => v.id === selectedId), 
    [violations, selectedId]
  );

  const formatRelative = (iso) => {
    const diff = new Date() - new Date(iso);
    const mins = Math.floor(diff / 60000);
    const hrs = Math.floor(mins / 60);
    if (hrs > 0) return `${hrs}h ago`;
    if (mins > 0) return `${mins}m ago`;
    return 'just now';
  };

  const handleStatusUpdate = async (id, status) => {
    // Optimistic UI update
    setViolations(prev => prev.map(v => v.id === id ? { ...v, status } : v));
    try {
      await api.patch(`/violations/${id}/status`, { status });
    } catch (err) {
      fetchData(); // Rollback on failure
    }
  };

  if (loading) return <div className="space-y-4">{[...Array(5)].map((_, i) => <div key={i} className="h-16 skeleton rounded-lg" />)}</div>;

  return (
    <div className="animate-in fade-in duration-500 flex flex-col h-full relative">
      <div className="flex justify-between items-end mb-8">
        <div>
          <h1 className="text-[20px] font-semibold text-text-primary">Violations Log</h1>
          <p className="text-[13px] text-text-muted mt-1">Real-time detection of unauthorized asset usage</p>
        </div>
        <div className="flex gap-2">
          <button className="p-2 border border-card-border rounded-lg text-text-muted hover:text-text-primary bg-white transition-all shadow-sm"><Filter size={18}/></button>
          <button className="p-2 border border-card-border rounded-lg text-text-muted hover:text-text-primary bg-white transition-all shadow-sm"><Download size={18}/></button>
        </div>
      </div>

      <div className="bg-white border border-card-border rounded-xl shadow-sm overflow-hidden flex-1">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-bottom border-card-border bg-slate-50/50">
              <th className="px-6 py-4 text-[11px] font-medium text-text-muted uppercase tracking-[0.06em]">Asset</th>
              <th className="px-6 py-4 text-[11px] font-medium text-text-muted uppercase tracking-[0.06em]">Source URL</th>
              <th className="px-6 py-4 text-[11px] font-medium text-text-muted uppercase tracking-[0.06em]">Platform</th>
              <th className="px-6 py-4 text-[11px] font-medium text-text-muted uppercase tracking-[0.06em]">Confidence</th>
              <th className="px-6 py-4 text-[11px] font-medium text-text-muted uppercase tracking-[0.06em]">Detected</th>
              <th className="px-6 py-4 text-[11px] font-medium text-text-muted uppercase tracking-[0.06em]">Status</th>
              <th className="px-6 py-4 text-[11px] font-medium text-text-muted uppercase tracking-[0.06em]">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {violations.length === 0 ? (
              <tr>
                <td colSpan="7" className="py-20 text-center">
                  <div className="flex flex-col items-center gap-3">
                    <AlertTriangle size={32} className="text-text-muted" strokeWidth={1.5} />
                    <span className="text-[15px] font-medium text-text-secondary">No violations detected yet</span>
                    <p className="text-[13px] text-text-muted max-w-[300px]">Run a scan on any registered asset to detect unauthorized usage</p>
                  </div>
                </td>
              </tr>
            ) : (
              violations.map(v => {
                const asset = assets.find(a => a.id === v.asset_id);
                const confColor = v.confidence > 0.85 ? 'text-red' : v.confidence > 0.65 ? 'text-amber' : 'text-green';
                return (
                  <tr key={v.id} onClick={() => setSelectedId(v.id)} className="hover:bg-slate-50/50 cursor-pointer transition-all group">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <img src={`${UPLOADS_BASE}/${v.asset_id}.jpg`} className="w-9 h-9 rounded-lg object-cover border border-card-border" />
                        <div className="min-w-0">
                          <p className="text-[13px] font-medium text-text-primary truncate">{asset?.team || 'Unknown'}</p>
                          <p className="text-[11px] text-text-muted truncate uppercase tracking-tighter">{asset?.event_name || 'N/A'}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <a href={v.source_url} target="_blank" onClick={e => e.stopPropagation()} className="text-[13px] text-accent font-medium hover:underline flex items-center gap-1.5 truncate max-w-[200px]">
                        {v.source_url.split('://')[1].substring(0, 25)}... <ExternalLink size={10} />
                      </a>
                    </td>
                    <td className="px-6 py-4"><PlatformBadge platform={v.platform} /></td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col gap-1.5">
                        <span className={`text-[13px] font-bold ${confColor}`}>{Math.round(v.confidence * 100)}%</span>
                        <div className="w-16 h-1 bg-slate-100 rounded-full overflow-hidden">
                          <div className={`h-full ${confColor.replace('text-', 'bg-')}`} style={{ width: `${v.confidence * 100}%` }} />
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-[13px] text-text-secondary">{formatRelative(v.detected_at)}</td>
                    <td className="px-6 py-4"><StatusBadge status={v.status} /></td>
                    <td className="px-6 py-4">
                      <button className="h-[28px] px-3 border border-card-border rounded-md text-[12px] font-medium text-text-secondary hover:bg-white hover:text-text-primary transition-all shadow-sm">View</button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Side Drawer */}
      {selectedId && (
        <div className="fixed inset-0 z-[110] flex justify-end">
          <div className="absolute inset-0 bg-black/20 backdrop-blur-[2px]" onClick={() => setSelectedId(null)} />
          <div className="w-[440px] bg-white h-full relative z-10 shadow-2xl flex flex-col animate-in slide-in-from-right duration-300 custom-scrollbar overflow-y-auto">
            <div className="p-6 border-b border-card-border flex justify-between items-center bg-white sticky top-0 z-20">
              <h2 className="text-[16px] font-semibold text-text-primary">Violation Details</h2>
              <button onClick={() => setSelectedId(null)} className="p-1.5 hover:bg-slate-50 rounded-lg text-text-muted transition-colors"><X size={20}/></button>
            </div>

            <div className="p-6 space-y-8 flex-1">
              <div className="aspect-[16/10] bg-slate-50 border border-card-border rounded-xl overflow-hidden group">
                <img 
                  src={selectedViolation?.thumbnail_url} 
                  onError={(e) => { e.target.src = "https://via.placeholder.com/400x250?text=No+Preview+Available"; }}
                  className="w-full h-full object-cover" 
                />
              </div>

              <div className="space-y-2">
                <label className="text-[11px] font-medium text-text-muted uppercase tracking-[0.08em]">Source URL</label>
                <a href={selectedViolation?.source_url} target="_blank" className="text-[14px] text-accent font-medium hover:underline flex items-center gap-1.5 break-all leading-relaxed">
                  {selectedViolation?.source_url} <ExternalLink size={14} className="flex-shrink-0" />
                </a>
              </div>

              <div className="h-px bg-slate-50" />

              <div className="grid grid-cols-2 gap-y-6">
                <div className="space-y-1.5">
                  <label className="text-[11px] font-medium text-text-muted uppercase tracking-[0.08em] block">Platform</label>
                  <PlatformBadge platform={selectedViolation?.platform} />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[11px] font-medium text-text-muted uppercase tracking-[0.08em] block">Confidence</label>
                  <div className="flex items-center gap-2">
                    <span className={`text-[18px] font-bold ${selectedViolation?.confidence > 0.85 ? 'text-red' : 'text-amber'}`}>
                      {Math.round(selectedViolation?.confidence * 100)}%
                    </span>
                    <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden max-w-[60px]">
                      <div className={`h-full ${selectedViolation?.confidence > 0.85 ? 'bg-red' : 'bg-amber'}`} style={{ width: `${selectedViolation?.confidence * 100}%` }} />
                    </div>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[11px] font-medium text-text-muted uppercase tracking-[0.08em] block">Detected</label>
                  <span className="text-[13px] font-medium text-text-primary">{new Date(selectedViolation?.detected_at).toLocaleString()}</span>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[11px] font-medium text-text-muted uppercase tracking-[0.08em] block">Status</label>
                  <StatusBadge status={selectedViolation?.status} />
                </div>
              </div>

              <div className="p-4 bg-slate-50/50 rounded-xl border border-slate-100">
                <label className="text-[10px] font-bold text-text-muted uppercase tracking-[0.1em] mb-3 block">Matched Against Asset</label>
                <div className="flex items-center gap-3">
                  <img src={`${UPLOADS_BASE}/${selectedViolation?.asset_id}.jpg`} className="w-10 h-10 rounded-lg object-cover" />
                  <div>
                    <p className="text-[13px] font-bold text-text-primary">
                      {assets.find(a => a.id === selectedViolation?.asset_id)?.team || 'Unknown Asset'}
                    </p>
                    <p className="text-[11px] text-text-muted">
                      {assets.find(a => a.id === selectedViolation?.asset_id)?.event_name || 'N/A'}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-6 border-t border-card-border bg-white grid grid-cols-2 gap-3 sticky bottom-0">
              <button 
                onClick={() => handleStatusUpdate(selectedViolation.id, 'REVIEWING')}
                className="h-11 border border-amber/30 text-amber hover:bg-amber/5 rounded-lg text-[13px] font-semibold transition-all"
              >
                Mark Reviewing
              </button>
              <button 
                onClick={() => handleStatusUpdate(selectedViolation.id, 'RESOLVED')}
                className="h-11 bg-green text-white hover:bg-green/90 rounded-lg text-[13px] font-semibold transition-all shadow-md shadow-green/10"
              >
                Mark Resolved
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Violations;
