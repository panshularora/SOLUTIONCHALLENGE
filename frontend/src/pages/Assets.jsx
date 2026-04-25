import React, { useState, useEffect } from 'react';
import { Upload, ImageIcon, Shield, Plus, X, Loader2 } from 'lucide-react';
import api from '../api';
import { UPLOADS_BASE } from '../config';
import { ScanOverlay } from '../components/ScanOverlay';
import { useNavigate } from 'react-router-dom';

const Assets = () => {
  const [assets, setAssets] = useState([]);
  const [violations, setViolations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [scanningAsset, setScanningAsset] = useState(null);
  const navigate = useNavigate();

  const fetchAssets = async () => {
    try {
      const [a, v] = await Promise.all([
        api.get('/assets'),
        api.get('/violations')
      ]);
      setAssets(a.data);
      setViolations(v.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAssets(); }, []);

  const RegisterModal = () => {
    const [form, setForm] = useState({ team: '', event: '', file: null });
    const [regLoading, setRegLoading] = useState(false);

    const handleSubmit = async (e) => {
      e.preventDefault();
      if (!form.file) return;
      setRegLoading(true);
      const fd = new FormData();
      fd.append('image', form.file);
      fd.append('team', form.team);
      fd.append('event_name', form.event);

      try {
        await api.post('/register', fd);
        setIsModalOpen(false);
        fetchAssets();
      } catch (err) {
        alert("Registration failed");
      } finally {
        setRegLoading(false);
      }
    };

    return (
      <div className="fixed inset-0 z-[100] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
        <div className="bg-white w-full max-w-[480px] rounded-2xl shadow-2xl p-8 animate-in zoom-in duration-200">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-[18px] font-semibold text-text-primary">Register New Asset</h2>
            <button onClick={() => setIsModalOpen(false)} className="text-text-muted hover:text-text-primary transition-colors">
              <X size={20} />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="relative group">
              <div className="h-[140px] border-2 border-dashed border-card-border rounded-xl flex flex-col items-center justify-center bg-slate-50 hover:bg-slate-100 transition-all cursor-pointer relative overflow-hidden">
                {form.file ? (
                  <div className="flex flex-col items-center">
                    <p className="text-[13px] font-medium text-accent">{form.file.name}</p>
                    <button type="button" onClick={(e) => { e.stopPropagation(); setForm({...form, file: null})}} className="text-[11px] text-text-muted mt-1 hover:underline">Change image</button>
                  </div>
                ) : (
                  <div className="flex flex-col items-center text-text-muted">
                    <Upload size={24} className="mb-2" />
                    <span className="text-[13px]">Drop image here or click to browse</span>
                  </div>
                )}
                <input type="file" className="absolute inset-0 opacity-0 cursor-pointer" onChange={(e) => setForm({...form, file: e.target.files[0]})} />
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-[11px] font-medium text-text-muted uppercase tracking-[0.08em] mb-1.5 block">Team Name</label>
                <input 
                  required
                  value={form.team} 
                  onChange={e => setForm({...form, team: e.target.value})}
                  className="w-full px-4 h-11 bg-slate-50 border border-card-border rounded-lg text-[14px] focus:ring-2 focus:ring-accent/20 outline-none transition-all" 
                  placeholder="e.g. Real Madrid"
                />
              </div>
              <div>
                <label className="text-[11px] font-medium text-text-muted uppercase tracking-[0.08em] mb-1.5 block">Event Name</label>
                <input 
                  required
                  value={form.event} 
                  onChange={e => setForm({...form, event: e.target.value})}
                  className="w-full px-4 h-11 bg-slate-50 border border-card-border rounded-lg text-[14px] focus:ring-2 focus:ring-accent/20 outline-none transition-all" 
                  placeholder="e.g. Champions League Final"
                />
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 h-11 text-[14px] font-medium text-text-secondary hover:bg-slate-50 rounded-lg transition-all">Cancel</button>
              <button type="submit" disabled={regLoading || !form.file} className="flex-1 h-11 bg-accent hover:bg-accent-hover text-white text-[14px] font-medium rounded-lg transition-all shadow-md shadow-accent/20 flex items-center justify-center">
                {regLoading ? <Loader2 size={18} className="animate-spin" /> : 'Register Asset'}
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  };

  if (loading) return <div className="grid grid-cols-3 gap-4">{[...Array(3)].map((_, i) => <div key={i} className="h-64 skeleton rounded-xl" />)}</div>;

  return (
    <div className="animate-in fade-in duration-500">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-[20px] font-semibold text-text-primary">Digital Assets</h1>
        </div>
        <button onClick={() => setIsModalOpen(true)} className="flex items-center gap-2 bg-accent hover:bg-accent-hover text-white px-4 h-[36px] rounded-lg text-[14px] font-medium transition-all shadow-md shadow-accent/20">
          <Plus size={16} /> Register New Asset
        </button>
      </div>

      {assets.length === 0 ? (
        <div className="flex flex-col items-center justify-center min-h-[300px] border-2 border-dashed border-card-border rounded-xl bg-white p-12 text-center">
          <div className="text-accent mb-4"><Shield size={48} strokeWidth={1.5} /></div>
          <h3 className="text-[16px] font-medium text-text-primary">No assets registered yet</h3>
          <p className="text-[14px] text-text-muted mt-1 mb-6">Register your first sports image to start detecting violations</p>
          <button onClick={() => setIsModalOpen(true)} className="bg-accent hover:bg-accent-hover text-white px-6 h-[40px] rounded-lg text-[14px] font-medium transition-all">
            Register First Asset
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {assets.map(asset => {
            const vCount = violations.filter(v => v.asset_id === asset.id).length;
            const openCount = violations.filter(v => v.asset_id === asset.id && v.status === 'OPEN').length;
            return (
              <div key={asset.id} className="bg-white border border-card-border rounded-xl overflow-hidden shadow-sm group hover:shadow-md transition-all duration-300">
                <div className="h-[160px] relative overflow-hidden bg-slate-100">
                  <img src={`${UPLOADS_BASE}/${asset.id}.jpg`} alt={asset.team} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
                </div>
                <div className="p-4">
                  <h4 className="text-[14px] font-medium text-text-primary truncate">{asset.team}</h4>
                  <p className="text-[13px] text-text-muted truncate mt-0.5">{asset.event_name}</p>
                  <p className="text-[12px] text-text-muted mt-3">{new Date(asset.registered_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</p>
                  
                  <div className="flex items-center justify-between mt-5 pt-4 border-t border-slate-50">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-tight ${openCount > 0 ? 'bg-red/10 text-red' : 'bg-green/10 text-green'}`}>
                      {vCount} {vCount === 1 ? 'Violation' : 'Violations'}
                    </span>
                    <button 
                      onClick={() => setScanningAsset(asset)}
                      className="text-accent hover:bg-accent/5 px-3 h-[28px] border border-accent rounded-md text-[12px] font-medium transition-all"
                    >
                      Scan Now
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {isModalOpen && <RegisterModal />}
      {scanningAsset && (
        <ScanOverlay 
          asset={scanningAsset} 
          onComplete={() => { setScanningAsset(null); navigate('/violations'); }} 
          onCancel={() => setScanningAsset(null)} 
        />
      )}
    </div>
  );
};

export default Assets;
