import React, { useState, useEffect, useMemo } from 'react';
import { LayoutDashboard, AlertTriangle } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import api from '../api';
import { MetricCard } from '../components/Common';

const Dashboard = () => {
  const [data, setData] = useState({ assets: [], violations: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [assets, violations] = await Promise.all([
          api.get('/assets'),
          api.get('/violations')
        ]);
        setData({ assets: assets.data, violations: violations.data });
      } catch (err) {
        setError('Failed to load data');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const stats = useMemo(() => {
    const { assets, violations } = data;
    const totalAssets = assets.length;
    const totalViolations = violations.length;
    const avgConfidence = totalViolations > 0 
      ? (violations.reduce((acc, v) => acc + v.confidence, 0) / totalViolations * 100).toFixed(1) 
      : 0;
    const riskAssets = new Set(violations.filter(v => v.status === 'OPEN').map(v => v.asset_id)).size;

    return { totalAssets, totalViolations, avgConfidence, riskAssets };
  }, [data]);

  const chartData = useMemo(() => {
    const { violations } = data;
    
    // Pie data
    const platforms = {};
    violations.forEach(v => platforms[v.platform] = (platforms[v.platform] || 0) + 1);
    const pie = Object.entries(platforms).map(([name, value]) => ({ name, value }));

    // Line data (last 7 days)
    const days = {};
    for (let i = 6; i >= 0; i--) {
      const d = new Date(); d.setDate(d.getDate() - i);
      days[d.toLocaleDateString('en-US', { weekday: 'short' })] = 0;
    }
    violations.forEach(v => {
      const day = new Date(v.detected_at).toLocaleDateString('en-US', { weekday: 'short' });
      if (days[day] !== undefined) days[day]++;
    });
    const line = Object.entries(days).map(([name, count]) => ({ name, count }));

    return { pie, line };
  }, [data]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-end mb-8"><div className="h-8 w-48 skeleton rounded" /></div>
        <div className="grid grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => <div key={i} className="h-32 skeleton rounded-xl" />)}
        </div>
        <div className="grid grid-cols-2 gap-4">
          {[...Array(2)].map((_, i) => <div key={i} className="h-80 skeleton rounded-xl" />)}
        </div>
      </div>
    );
  }

  if (error) return <div className="p-8 bg-red-50 text-red-600 rounded-xl border border-red-100">{error}</div>;

  return (
    <div className="animate-in fade-in duration-500">
      <div className="flex justify-between items-end mb-8">
        <div>
          <h1 className="text-[20px] font-semibold text-text-primary">Overview</h1>
          <p className="text-[13px] text-text-muted mt-1">Today is {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</p>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-4">
        <MetricCard label="Total Assets" value={stats.totalAssets} icon={LayoutDashboard} color="text-accent" />
        <MetricCard label="Violations Found" value={stats.totalViolations} icon={AlertTriangle} color="text-red" />
        <MetricCard label="Avg Confidence" value={`${stats.avgConfidence}%`} icon={LayoutDashboard} color="text-amber" />
        <MetricCard label="Assets at Risk" value={stats.riskAssets} icon={AlertTriangle} color="text-red" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-6">
        <div className="bg-card-bg border border-card-border rounded-xl p-6 shadow-sm min-h-[400px] flex flex-col">
          <h3 className="text-[11px] font-medium text-text-muted uppercase tracking-[0.08em] mb-8">Violations by platform</h3>
          <div className="flex-1">
            {chartData.pie.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={chartData.pie} innerRadius={55} outerRadius={90} paddingAngle={5} dataKey="value">
                    {chartData.pie.map((e, i) => <Cell key={i} fill={['#1DA1F2', '#E1306C', '#FF4500', '#6B7280', '#10B981'][i % 5]} />)}
                  </Pie>
                  <Tooltip />
                  <Legend verticalAlign="bottom" height={36}/>
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-text-muted gap-2">
                <AlertTriangle size={32} strokeWidth={1.5} />
                <span className="text-[14px]">No violations yet</span>
              </div>
            )}
          </div>
        </div>

        <div className="bg-card-bg border border-card-border rounded-xl p-6 shadow-sm min-h-[400px] flex flex-col">
          <h3 className="text-[11px] font-medium text-text-muted uppercase tracking-[0.08em] mb-8">7-day detection trend</h3>
          <div className="flex-1">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData.line}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F3F4F6" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#9CA3AF' }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#9CA3AF' }} />
                <Tooltip />
                <Line type="monotone" dataKey="count" stroke="#5046e4" strokeWidth={2} dot={{ r: 4, fill: '#5046e4' }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
