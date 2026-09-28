'use client';

import React from 'react';
import { ShieldCheck, CheckCircle2, AlertTriangle, ChevronRight, FileCheck2 } from 'lucide-react';
import { togglePhilHealthOverride } from '@/app/actions';

export function PhilHealthMCPCard({ patientId, activeEpisode, visitLogs }) {
  if (!activeEpisode) return null;

  const overrideActive = activeEpisode.philhealth_mcp_override;

  // Filter visit logs to only those belonging to the active maternal episode
  const activeVisits = visitLogs.filter(v => v.maternal_episode_id === activeEpisode.id);

  const firstTriVisits = activeVisits.filter(v => v.aog_weeks < 14);
  const secondTriVisits = activeVisits.filter(v => v.aog_weeks >= 14 && v.aog_weeks <= 27);
  const thirdTriVisits = activeVisits.filter(v => v.aog_weeks >= 28);

  const firstTriCount = firstTriVisits.length;
  const secondTriCount = secondTriVisits.length;
  const thirdTriCount = thirdTriVisits.length;

  const firstTriMet = firstTriCount >= 1;
  const secondTriMet = secondTriCount >= 1;
  const thirdTriMet = thirdTriCount >= 2;

  const totalRequired = 4;
  const totalMet = (firstTriMet ? 1 : 0) + (secondTriMet ? 1 : 0) + Math.min(thirdTriCount, 2);
  
  const isCompliant = overrideActive || (firstTriMet && secondTriMet && thirdTriMet);

  return (
    <div className="bg-white/90 backdrop-blur-md border border-gray-200/80 shadow-sm hover:shadow-md transition-all duration-300 rounded-3xl p-6 flex flex-col h-full relative overflow-hidden">
      {/* Decorative Glow */}
      <div className={`absolute top-0 right-0 w-64 h-64 blur-[80px] rounded-full pointer-events-none opacity-20 -z-10 transition-colors duration-700 ${isCompliant ? 'bg-emerald-500' : 'bg-rose-500'}`} />

      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-gray-100 mb-5">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shadow-sm ${isCompliant ? 'bg-gradient-to-tr from-emerald-500 to-teal-500 shadow-emerald-500/20 text-white' : 'bg-gradient-to-tr from-amber-500 to-orange-500 shadow-amber-500/20 text-white'}`}>
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-black text-gray-900 text-lg tracking-tight">PhilHealth MCP Tracking</h3>
            <p className="text-xs text-gray-500 font-medium">Statutory Benefit: ₱8,000</p>
          </div>
        </div>
        <div className={`px-3 py-1 rounded-full border text-xs font-black uppercase tracking-wider flex items-center gap-1.5 ${isCompliant ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-amber-50 text-amber-700 border-amber-200'}`}>
          {isCompliant ? <CheckCircle2 className="w-3.5 h-3.5" /> : <AlertTriangle className="w-3.5 h-3.5" />}
          {isCompliant ? 'Compliant: Ready for Claim' : 'Incomplete Requirements'}
        </div>
      </div>

      {/* Trimester Tracker */}
      <div className="flex-1 space-y-4 relative z-10">
        <div className="grid grid-cols-3 gap-3">
          
          {/* 1st Trimester */}
          <div className={`p-4 rounded-2xl border transition-colors ${overrideActive || firstTriMet ? 'bg-emerald-50/50 border-emerald-100' : 'bg-slate-50 border-slate-200/70'}`}>
            <span className="text-[10px] font-black uppercase tracking-wider text-gray-400 block mb-2">1st Trimester (&lt; 14w)</span>
            <div className="flex items-center gap-2">
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold ${overrideActive || firstTriMet ? 'bg-emerald-500 text-white shadow-sm' : 'bg-gray-200 text-gray-500'}`}>
                {overrideActive || firstTriMet ? <CheckCircle2 className="w-3 h-3" /> : '0'}
              </div>
              <span className="text-xs font-bold text-gray-700">{overrideActive || firstTriMet ? '1/1 Logged' : '0/1 Required'}</span>
            </div>
            {firstTriMet && <p className="text-[10px] text-emerald-700 mt-2 font-medium bg-emerald-100/50 px-2 py-1 rounded-md inline-block">Met at {firstTriVisits[0]?.aog_weeks}w</p>}
          </div>

          {/* 2nd Trimester */}
          <div className={`p-4 rounded-2xl border transition-colors ${overrideActive || secondTriMet ? 'bg-emerald-50/50 border-emerald-100' : 'bg-slate-50 border-slate-200/70'}`}>
            <span className="text-[10px] font-black uppercase tracking-wider text-gray-400 block mb-2">2nd Trimester (14-27w)</span>
            <div className="flex items-center gap-2">
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold ${overrideActive || secondTriMet ? 'bg-emerald-500 text-white shadow-sm' : 'bg-gray-200 text-gray-500'}`}>
                {overrideActive || secondTriMet ? <CheckCircle2 className="w-3 h-3" /> : '0'}
              </div>
              <span className="text-xs font-bold text-gray-700">{overrideActive || secondTriMet ? '1/1 Logged' : '0/1 Required'}</span>
            </div>
            {secondTriMet && <p className="text-[10px] text-emerald-700 mt-2 font-medium bg-emerald-100/50 px-2 py-1 rounded-md inline-block">Met at {secondTriVisits[0]?.aog_weeks}w</p>}
          </div>

          {/* 3rd Trimester */}
          <div className={`p-4 rounded-2xl border transition-colors ${overrideActive || thirdTriMet ? 'bg-emerald-50/50 border-emerald-100' : (thirdTriCount === 1 ? 'bg-amber-50/50 border-amber-200' : 'bg-slate-50 border-slate-200/70')}`}>
            <span className="text-[10px] font-black uppercase tracking-wider text-gray-400 block mb-2">3rd Trimester (28w+)</span>
            <div className="flex items-center gap-2">
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold ${overrideActive || thirdTriMet ? 'bg-emerald-500 text-white shadow-sm' : (thirdTriCount === 1 ? 'bg-amber-500 text-white' : 'bg-gray-200 text-gray-500')}`}>
                {overrideActive || thirdTriMet ? <CheckCircle2 className="w-3 h-3" /> : (overrideActive ? '2' : thirdTriCount)}
              </div>
              <span className="text-xs font-bold text-gray-700">{overrideActive || thirdTriMet ? '2/2 Logged' : `${thirdTriCount}/2 Required`}</span>
            </div>
            {thirdTriMet && <p className="text-[10px] text-emerald-700 mt-2 font-medium bg-emerald-100/50 px-2 py-1 rounded-md inline-block">Met requirements</p>}
          </div>

        </div>

        {/* Progress Summary */}
        <div className="mt-4 flex items-center justify-between text-xs">
          <span className="font-semibold text-gray-600">Overall Progress</span>
          <span className="font-black text-gray-900">{overrideActive ? '100' : Math.round((totalMet / totalRequired) * 100)}%</span>
        </div>
        <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
          <div 
            className={`h-full transition-all duration-1000 ease-out ${isCompliant ? 'bg-emerald-500' : 'bg-rose-500'}`} 
            style={{ width: `${overrideActive ? 100 : Math.round((totalMet / totalRequired) * 100)}%` }} 
          />
        </div>
      </div>

      {/* Footer Toggle */}
      <div className="mt-6 pt-5 border-t border-gray-100">
        <form action={togglePhilHealthOverride} className="flex items-center justify-between bg-slate-50 hover:bg-slate-100 transition-colors p-3.5 rounded-xl border border-slate-200/70 group">
          <input type="hidden" name="patient_id" value={patientId} />
          <input type="hidden" name="maternal_episode_id" value={activeEpisode.id} />
          <input type="hidden" name="override_value" value={overrideActive ? 'false' : 'true'} />
          
          <div className="flex items-center gap-3">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${overrideActive ? 'bg-emerald-100 text-emerald-600' : 'bg-white border border-gray-200 text-gray-400'}`}>
              <FileCheck2 className="w-4 h-4" />
            </div>
            <div>
              <p className="text-xs font-bold text-gray-900 group-hover:text-rose-600 transition-colors">Legacy Override</p>
              <p className="text-[10px] text-gray-500 font-medium">Requirements verified externally (Paper / Pink Card)</p>
            </div>
          </div>
          
          <button type="submit" className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${overrideActive ? 'bg-emerald-500' : 'bg-gray-200'}`}>
            <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${overrideActive ? 'translate-x-5' : 'translate-x-0'}`} />
          </button>
        </form>
      </div>
    </div>
  );
}
