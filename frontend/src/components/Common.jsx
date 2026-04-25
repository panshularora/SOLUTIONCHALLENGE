import React from 'react';

export const StatusBadge = ({ status }) => {
  const s = (status || 'OPEN').toUpperCase();
  const styles = {
    OPEN: "bg-[#FEF2F2] text-[#DC2626] border-[#FECACA]",
    REVIEWING: "bg-[#FFFBEB] text-[#D97706] border-[#FDE68A]",
    RESOLVED: "bg-[#ECFDF5] text-[#059669] border-[#A7F3D0]",
  };
  
  return (
    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-medium border ${styles[s] || styles.OPEN}`}>
      {s}
    </span>
  );
};

export const PlatformBadge = ({ platform }) => {
  const p = (platform || 'Web').toLowerCase();
  const styles = {
    twitter: "bg-[#EFF6FF] text-[#1D4ED8]",
    instagram: "bg-[#FDF2F8] text-[#9D174D]",
    reddit: "bg-[#FFF7ED] text-[#C2410C]",
    web: "bg-[#F3F4F6] text-[#374151]",
    news: "bg-[#ECFDF5] text-[#065F46]",
  };

  return (
    <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-medium ${styles[p] || styles.web}`}>
      {platform || 'Web'}
    </span>
  );
};

export const MetricCard = ({ label, value, icon: Icon, color }) => (
  <div className="bg-card-bg border border-card-border rounded-xl p-5 shadow-sm">
    <div className="flex justify-between items-start mb-4">
      <span className="text-[11px] font-medium text-text-muted uppercase tracking-[0.08em]">{label}</span>
      <div className={`p-2 rounded-lg bg-slate-50 ${color}`}>
        <Icon size={16} />
      </div>
    </div>
    <div className={`text-[32px] font-bold tracking-tighter ${color}`}>
      {value}
    </div>
    <div className="mt-2 text-[12px] text-text-muted">Updated just now</div>
  </div>
);
