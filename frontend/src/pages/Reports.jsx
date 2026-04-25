import React, { useState } from 'react';
import { FileDown, Shield, CheckCircle } from 'lucide-react';

const Reports = () => {
  const [showToast, setShowToast] = useState(false);

  const handleGenerate = () => {
    setShowToast(true);
    setTimeout(() => setShowToast(false), 3000);
  };

  return (
    <div className="animate-in fade-in duration-500">
      <div className="mb-8">
        <h1 className="text-[20px] font-semibold text-text-primary">Reports</h1>
      </div>

      <div className="bg-white border border-card-border rounded-xl p-8 max-w-[600px] shadow-sm">
        <div className="flex items-start gap-5">
          <div className="w-12 h-12 rounded-xl bg-indigo-50 flex items-center justify-center text-accent">
            <FileDown size={24} />
          </div>
          <div className="flex-1">
            <h3 className="text-[16px] font-semibold text-text-primary">Export Violations Report</h3>
            <p className="text-[14px] text-text-muted mt-1 leading-relaxed">
              Download a full PDF report of all violations detected for this period. Includes executive summary, platform distribution charts, and detailed event logs.
            </p>
            <button 
              onClick={handleGenerate}
              className="mt-6 flex items-center gap-2 bg-accent hover:bg-accent-hover text-white px-5 h-[40px] rounded-lg text-[14px] font-medium transition-all shadow-md shadow-accent/20"
            >
              <FileDown size={18} /> Generate Report
            </button>
          </div>
        </div>
      </div>

      {showToast && (
        <div className="fixed bottom-8 right-8 bg-sidebar-bg text-white px-6 py-4 rounded-xl shadow-2xl flex items-center gap-3 animate-in slide-in-from-bottom duration-300 border border-white/10 z-[200]">
          <CheckCircle className="text-accent" size={20} />
          <span className="text-[14px] font-medium tracking-tight">Report generation coming soon in v2.0</span>
        </div>
      )}
    </div>
  );
};

export default Reports;
