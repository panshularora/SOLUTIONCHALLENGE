import React, { useState, useEffect } from 'react';
import { CheckCircle2, Loader2, Circle, Shield } from 'lucide-react';
import api from '../api';

export const ScanOverlay = ({ asset, onComplete, onCancel }) => {
  const [step, setStep] = useState(1);
  const [completed, setCompleted] = useState([]);

  useEffect(() => {
    let isMounted = true;
    const runScan = async () => {
      // Step 1: Computing fingerprint (1.2s)
      await new Promise(r => setTimeout(r, 1200));
      if (!isMounted) return;
      setCompleted(prev => [...prev, 1]);
      setStep(2);

      // Step 2: Querying Google Vision (Real API)
      try {
        await api.post('/scan', { asset_id: asset.id });
        if (!isMounted) return;
        setCompleted(prev => [...prev, 2]);
        setStep(3);
      } catch (err) {
        // In a real app we'd show error toast
        setStep(2); // Stay here on error for visual
        return;
      }

      // Step 3: Analyzing web matches (1s)
      await new Promise(r => setTimeout(r, 1000));
      if (!isMounted) return;
      setCompleted(prev => [...prev, 3]);
      setStep(4);

      // Step 4: Saving violations (0.5s)
      await new Promise(r => setTimeout(r, 500));
      if (!isMounted) return;
      setCompleted(prev => [...prev, 4]);
      
      setTimeout(onComplete, 500);
    };

    runScan();
    return () => { isMounted = false; };
  }, [asset]);

  const StepItem = ({ id, label }) => {
    const isDone = completed.includes(id);
    const isActive = step === id;
    
    return (
      <div className={`flex items-center gap-4 transition-all duration-300 ${isActive || isDone ? 'opacity-100' : 'opacity-30'}`}>
        <div className="flex-shrink-0">
          {isDone ? (
            <CheckCircle2 className="text-green w-5 h-5" />
          ) : isActive ? (
            <Loader2 className="text-accent w-5 h-5 animate-spin" />
          ) : (
            <Circle className="text-text-muted w-5 h-5" />
          )}
        </div>
        <span className={`text-[14px] ${isActive ? 'font-semibold text-text-primary' : 'text-text-secondary'}`}>
          {label}
        </span>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-[100] bg-[#0F0F1A]/85 backdrop-blur-md flex items-center justify-center p-6">
      <div className="bg-white w-full max-w-[440px] rounded-2xl shadow-2xl p-10 animate-in zoom-in duration-300">
        <div className="flex flex-col items-center text-center mb-10">
          <div className="w-16 h-16 rounded-2xl bg-indigo-50 flex items-center justify-center text-accent mb-6">
            <Shield size={32} strokeWidth={2.5} className="animate-pulse" />
          </div>
          <h2 className="text-[18px] font-semibold text-text-primary tracking-tight">Scanning for violations...</h2>
          <p className="text-[13px] text-text-muted mt-1">{asset.team} — {asset.event_name}</p>
        </div>

        <div className="space-y-6 mb-10">
          <StepItem id={1} label="Computing image fingerprint" />
          <StepItem id={2} label="Querying Google Vision API" />
          <StepItem id={3} label="Analyzing web matches" />
          <StepItem id={4} label="Saving violations report" />
        </div>

        <div className="w-full h-1 bg-slate-100 rounded-full overflow-hidden">
          <div className="h-full bg-accent transition-all duration-300 ease-out" style={{ width: `${(completed.length / 4) * 100}%` }} />
        </div>
      </div>
    </div>
  );
};
