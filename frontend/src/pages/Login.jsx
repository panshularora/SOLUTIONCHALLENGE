import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldCheck, Loader2 } from 'lucide-react';
import api from '../api';

const Login = () => {
  const [creds, setCreds] = useState({ username: 'admin', password: 'password' });
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await api.post('/login', creds);
      localStorage.setItem('vigilant_token', res.data.token);
      localStorage.setItem('vigilant_user', JSON.stringify(res.data.user));
      navigate('/dashboard');
    } catch (err) {
      setError("Invalid credentials");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-sidebar-bg flex items-center justify-center p-6 selection:bg-accent/30 selection:text-white">
      <div className="bg-white w-full max-w-[400px] rounded-2xl shadow-2xl p-10 animate-in fade-in zoom-in duration-300">
        <div className="flex flex-col items-center mb-8">
          <div className="w-12 h-12 rounded-xl bg-accent flex items-center justify-center text-white mb-4 shadow-lg shadow-accent/20">
            <ShieldCheck size={28} strokeWidth={2.5} />
          </div>
          <h1 className="text-[22px] font-semibold text-text-primary tracking-tight">Vigilant</h1>
          <p className="text-[13px] text-text-muted mt-1">Digital Asset Protection</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-6">
          <div className="space-y-2">
            <label className="text-[11px] font-medium text-text-muted uppercase tracking-[0.08em]">Username</label>
            <input 
              required
              value={creds.username}
              onChange={e => setCreds({...creds, username: e.target.value})}
              className="w-full px-4 h-[44px] bg-slate-50 border border-card-border rounded-lg text-[14px] focus:ring-2 focus:ring-accent/20 outline-none transition-all placeholder:text-text-muted"
              placeholder="Enter your username"
            />
          </div>
          <div className="space-y-2">
            <label className="text-[11px] font-medium text-text-muted uppercase tracking-[0.08em]">Password</label>
            <input 
              required
              type="password"
              value={creds.password}
              onChange={e => setCreds({...creds, password: e.target.value})}
              className="w-full px-4 h-[44px] bg-slate-50 border border-card-border rounded-lg text-[14px] focus:ring-2 focus:ring-accent/20 outline-none transition-all placeholder:text-text-muted"
              placeholder="••••••••"
            />
          </div>

          {error && <p className="text-red text-[13px] font-medium text-center">{error}</p>}

          <button 
            type="submit" 
            disabled={loading}
            className="w-full h-[44px] bg-accent hover:bg-accent-hover text-white rounded-lg text-[14px] font-medium transition-all shadow-md shadow-accent/10 flex items-center justify-center"
          >
            {loading ? <Loader2 size={20} className="animate-spin" /> : 'Sign In'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default Login;
