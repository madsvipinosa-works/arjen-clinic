'use client';

import React, { useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Baby, AlertTriangle, ShieldAlert, Calendar, ChevronDown,
  Plus, Pencil, Sparkles, Phone, User, HeartPulse, CheckCircle2,
  X, Droplets, ShieldCheck, Clock, Ambulance
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PrintRecordButton } from '@/components/admin/patients/print-record-button';
import { EmergencyTransferModal } from '@/components/admin/clinical/emergency-transfer-modal';
import { calculateObstetricDates } from '@/lib/clinical-protocols';
import { createMaternalEpisode, updateMaternalEpisode } from '@/app/actions';

export function PatientClinicalHeader({
  patient,
  maternalEpisodes = [],
  activeEpisode = null,
  birthPlan = null,
  id,
  latestVisitLog = null
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [showEpisodeModal, setShowEpisodeModal] = useState(false);
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [modalMode, setModalMode] = useState('create'); // 'create' | 'edit'
  const [error, setError] = useState(null);

  // 1. Single Source of Truth Obstetric Dates from Safety Engine
  const lmpDate = activeEpisode?.lmp || patient?.lmp;
  const obstetricData = calculateObstetricDates(lmpDate);

  // 2. Obstetric Score (Gravida & Para)
  const gravida = activeEpisode?.gravida ?? patient?.gravida ?? 1;
  const para = activeEpisode?.para ?? patient?.para ?? 0;

  // 3. PhilHealth ID
  const philhealthNo = patient?.philhealth_number || birthPlan?.philhealth_number || null;

  // 4. Gestational Term Progress (Weeks / 40 weeks)
  const totalWeeks = (obstetricData?.aogWeeks || 0) + ((obstetricData?.aogDays || 0) / 7);
  const progressPercent = Math.min(100, Math.max(0, Math.round((totalWeeks / 40) * 100)));

  // 5. Days to Due Date
  let daysToDue = null;
  if (obstetricData?.edc) {
    const edcTime = new Date(obstetricData.edc).getTime();
    const nowTime = new Date().getTime();
    daysToDue = Math.ceil((edcTime - nowTime) / (1000 * 60 * 60 * 24));
  }

  // Real allergies filter (ignores 'na', 'none', etc.)
  const hasRealAllergies = Boolean(
    patient?.allergies && 
    !['na', 'n/a', 'none', 'no', 'nil', '-', 'none documented'].includes(patient.allergies.trim().toLowerCase())
  );

  // Patient Initials for Avatar
  const initials = patient?.full_name
    ? patient.full_name
        .split(' ')
        .map((n) => n[0])
        .slice(0, 2)
        .join('')
        .toUpperCase()
    : 'PT';

  // Episode Change Handler
  const handleEpisodeChange = (episodeId) => {
    router.push(`/admin/patients/${id}?episode=${episodeId}`);
  };

  // Create Episode Submit
  const handleCreateEpisode = (e) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      const res = await createMaternalEpisode(fd);
      if (res?.success === false) {
        setError(res.error);
      } else {
        setShowEpisodeModal(false);
        setError(null);
      }
    });
  };

  // Update Episode Submit
  const handleUpdateEpisode = (e) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      const res = await updateMaternalEpisode(fd);
      if (res?.success === false) {
        setError(res.error);
      } else {
        setShowEpisodeModal(false);
        setError(null);
      }
    });
  };

  return (
    <div className="mb-6 space-y-3">
      {/* ── Main Bento Grid Clinical Snapshot Card ─────────────── */}
      <div className="bg-white/95 backdrop-blur-md border border-gray-200/90 rounded-3xl shadow-sm hover:shadow-md transition-all duration-300 p-5 md:p-6 space-y-5 relative overflow-hidden">
        {/* Ambient Top Subtle Accent Bar */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-rose-500 via-rose-300 to-teal-500" />
        
        {/* Top Tier: Patient Avatar, Demographics & Quick Actions */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5 pb-5 border-b border-gray-100">
          <div className="flex items-start sm:items-center gap-4">
            {/* Avatar Pill */}
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-rose-600 via-rose-500 to-pink-500 text-white font-black text-lg flex items-center justify-center shadow-md shadow-rose-500/20 ring-4 ring-rose-50 shrink-0">
              {initials}
            </div>

            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2.5">
                <h1 className="text-2xl md:text-3xl font-black text-gray-900 tracking-tight">
                  {patient?.full_name || 'Anonymous Patient'}
                </h1>

                {patient?.blood_type && (
                  <span className="inline-flex items-center gap-1 bg-rose-50 text-rose-700 font-black text-xs px-2.5 py-0.5 rounded-full border border-rose-200/80 shadow-2xs">
                    <Droplets className="w-3 h-3 text-rose-500" />
                    <span>{patient.blood_type}</span>
                  </span>
                )}
              </div>

              {/* Sub-demographics Strip & Maternal Episode Switcher */}
              <div className="flex flex-wrap items-center gap-y-2 gap-x-3 text-xs text-gray-500 font-medium">
                {/* Maternal Episode Switcher Dropdown Pill */}
                <div className="relative inline-flex items-center mr-1">
                  {maternalEpisodes.length > 0 ? (
                    <div className="flex items-center gap-1.5 bg-gray-50/90 hover:bg-gray-100/90 border border-gray-200/90 rounded-full px-3 py-1 text-xs transition-colors">
                      <span className="relative flex h-2 w-2">
                        <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                          activeEpisode?.status === 'Active' ? 'bg-emerald-400' : 'bg-gray-400'
                        }`} />
                        <span className={`relative inline-flex rounded-full h-2 w-2 ${
                          activeEpisode?.status === 'Active' ? 'bg-emerald-500' : 'bg-gray-500'
                        }`} />
                      </span>

                      <select
                        value={activeEpisode?.id || ''}
                        onChange={(e) => handleEpisodeChange(e.target.value)}
                        className="bg-transparent font-bold text-gray-800 text-xs focus:outline-none cursor-pointer pr-1"
                      >
                        {maternalEpisodes.map((ep, idx) => (
                          <option key={ep.id} value={ep.id}>
                            {ep.status === 'Active' ? '🟢 Active: ' : '⚪ Past: '}
                            {ep.lmp ? `LMP ${new Date(ep.lmp).toLocaleDateString()}` : `Pregnancy #${maternalEpisodes.length - idx}`}
                            {ep.status ? ` (${ep.status})` : ''}
                          </option>
                        ))}
                      </select>

                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setModalMode('edit');
                          setShowEpisodeModal(true);
                        }}
                        className="h-5 w-5 p-0 text-gray-400 hover:text-gray-700 rounded-full"
                        title="Edit active pregnancy details"
                      >
                        <Pencil className="w-3 h-3" />
                      </Button>

                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setModalMode('create');
                          setShowEpisodeModal(true);
                        }}
                        className="h-5 w-5 p-0 text-rose-500 hover:text-rose-700 rounded-full"
                        title="Add new pregnancy episode"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  ) : (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setModalMode('create');
                        setShowEpisodeModal(true);
                      }}
                      className="h-7 text-xs font-bold text-rose-600 border-rose-200 hover:bg-rose-50 rounded-full gap-1"
                    >
                      <Plus className="w-3 h-3" /> Start Pregnancy Record
                    </Button>
                  )}
                </div>

                <span className="flex items-center gap-1">
                  ID: <span className="font-mono text-gray-700 font-bold bg-gray-100 px-1.5 py-0.5 rounded text-[11px]">{id.split('-')[0]}</span>
                </span>
                {patient?.age && (
                  <>
                    <span className="text-gray-300">•</span>
                    <span>Age: <strong className="text-gray-700 font-semibold">{patient.age} yrs</strong></span>
                  </>
                )}
                {patient?.contact_number && (
                  <>
                    <span className="text-gray-300">•</span>
                    <span className="flex items-center gap-1">
                      <Phone className="w-3 h-3 text-gray-400" />
                      {patient.contact_number}
                    </span>
                  </>
                )}
                {philhealthNo && (
                  <>
                    <span className="text-gray-300">•</span>
                    <span className="flex items-center gap-1 text-emerald-700 font-medium">
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                      PhilHealth: <strong className="font-mono">{philhealthNo}</strong>
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-2 self-start lg:self-center shrink-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowTransferModal(true)}
              className="border-red-200 text-red-700 hover:bg-red-50 hover:border-red-300 rounded-2xl font-bold gap-2 h-10 px-3.5 text-xs shadow-2xs active:scale-[0.98] transition-all"
            >
              <Ambulance className="w-4 h-4 text-red-500" />
              <span>Emergency Transfer Slip</span>
            </Button>

            <Link href={`/admin/patients/${id}?tab=postpartum`}>
              <Button
                variant="outline"
                className="border-rose-200 text-rose-700 hover:bg-rose-50 hover:border-rose-300 rounded-2xl font-bold gap-2 h-10 px-3.5 text-xs shadow-2xs active:scale-[0.98] transition-all"
              >
                <Baby className="w-4 h-4 text-rose-500" />
                <span>Postpartum Care</span>
              </Button>
            </Link>

            <PrintRecordButton patientId={id} className="h-10 text-xs rounded-2xl px-4 active:scale-[0.98] transition-all" />
          </div>
        </div>

        {/* ── 21st.dev Style Bento Grid Metric Cards ─────────────── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          {/* Bento 1: Dynamic Age of Gestation & Trimester Progress */}
          <div className="bg-gradient-to-br from-rose-50/90 via-pink-50/40 to-white border border-rose-200/80 rounded-2xl p-4 shadow-xs flex flex-col justify-between hover:border-rose-300 transition-colors">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black text-rose-500 uppercase tracking-widest">
                  Gestational Age
                </span>
                {obstetricData?.trimester && (
                  <span className={`text-[10px] font-black px-2.5 py-0.5 rounded-full border shadow-2xs ${
                    obstetricData.trimester === '3rd Trimester'
                      ? 'bg-gradient-to-r from-rose-500 to-pink-500 text-white border-rose-400'
                      : obstetricData.trimester === '2nd Trimester'
                      ? 'bg-gradient-to-r from-indigo-500 to-blue-500 text-white border-indigo-400'
                      : 'bg-gradient-to-r from-sky-500 to-teal-500 text-white border-sky-400'
                  }`}>
                    {obstetricData.trimester}
                  </span>
                )}
              </div>

              <div className="mt-2">
                <p className="text-2xl font-black text-rose-700 tracking-tight">
                  {obstetricData?.isValid ? obstetricData.aogDetailed : 'No LMP set'}
                </p>
                {obstetricData?.aogFormatted && (
                  <p className="text-[11px] font-bold text-rose-400/90 mt-0.5">
                    Clinical AOG: {obstetricData.aogFormatted} wks
                  </p>
                )}
              </div>
            </div>

            {/* Micro Gestational Progress Bar */}
            {obstetricData?.isValid && (
              <div className="mt-3 pt-2.5 border-t border-rose-100/70">
                <div className="flex items-center justify-between text-[10px] font-bold text-rose-600 mb-1">
                  <span>Term Maturity</span>
                  <span>{progressPercent}% (Wk {obstetricData.aogWeeks}/40)</span>
                </div>
                <div className="w-full bg-rose-200/50 h-1.5 rounded-full overflow-hidden">
                  <div
                    className="bg-gradient-to-r from-rose-400 to-rose-600 h-full rounded-full transition-all duration-700 ease-out"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Bento 2: Estimated Date of Confinement (EDC) & Countdown */}
          <div className="bg-gradient-to-br from-emerald-50/90 via-teal-50/40 to-white border border-emerald-200/80 rounded-2xl p-4 shadow-xs flex flex-col justify-between hover:border-emerald-300 transition-colors">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">
                  Estimated Due Date
                </span>
                <Clock className="w-3.5 h-3.5 text-emerald-500" />
              </div>

              <div className="mt-2">
                <p className="text-2xl font-black text-emerald-800 tracking-tight">
                  {obstetricData?.isValid ? obstetricData.edcFormatted : '—'}
                </p>
                <p className="text-[11px] font-bold text-emerald-600/90 mt-0.5">
                  LMP: {lmpDate ? new Date(lmpDate).toLocaleDateString() : 'Not recorded'}
                </p>
              </div>
            </div>

            {daysToDue !== null && (
              <div className="mt-3 pt-2.5 border-t border-emerald-100/70 text-[10px] font-bold text-emerald-700 flex items-center justify-between">
                <span>Countdown</span>
                <span>{daysToDue > 0 ? `~${daysToDue} days remaining` : daysToDue === 0 ? 'Due today!' : `${Math.abs(daysToDue)} days post-term`}</span>
              </div>
            )}
          </div>

          {/* Bento 3: Obstetric History (Gravida & Para) */}
          <div className="bg-gradient-to-br from-violet-50/90 via-purple-50/40 to-white border border-violet-200/80 rounded-2xl p-4 shadow-xs flex flex-col justify-between hover:border-violet-300 transition-colors">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black text-violet-500 uppercase tracking-widest">
                  Obstetric History
                </span>
                <span className="text-[10px] font-bold text-violet-400 bg-violet-100/60 px-2 py-0.5 rounded-full">
                  Score
                </span>
              </div>

              <div className="mt-2">
                <p className="text-2xl font-black text-violet-800 tracking-tight">
                  G{gravida} P{para}
                </p>
                <p className="text-[11px] font-bold text-violet-600/90 mt-0.5">
                  Gravida {gravida} • Para {para}
                </p>
              </div>
            </div>

            <div className="mt-3 pt-2.5 border-t border-violet-100/70 text-[10px] font-medium text-gray-500">
              Total pregnancies: {gravida} | Deliveries: {para}
            </div>
          </div>

          {/* Bento 4: Gestation Status & Safety Level */}
          <div className={`border rounded-2xl p-4 shadow-xs flex flex-col justify-between transition-colors ${
            patient?.is_high_risk
              ? 'bg-gradient-to-br from-red-50/90 via-rose-50/40 to-white border-red-200/80 hover:border-red-300'
              : 'bg-gradient-to-br from-gray-50/90 via-slate-50/40 to-white border-gray-200/80 hover:border-gray-300'
          }`}>
            <div>
              <div className="flex items-center justify-between">
                <span className={`text-[10px] font-black uppercase tracking-widest ${
                  patient?.is_high_risk ? 'text-red-600' : 'text-gray-400'
                }`}>
                  Clinical Safety
                </span>
                <span className="relative flex h-2 w-2">
                  {patient?.is_high_risk && (
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                  )}
                  <span className={`relative inline-flex rounded-full h-2 w-2 ${
                    patient?.is_high_risk ? 'bg-red-500' : 'bg-emerald-500'
                  }`} />
                </span>
              </div>

              <div className="mt-2">
                <span className={`inline-block text-xs font-black px-2.5 py-1 rounded-lg uppercase tracking-wider border shadow-2xs ${
                  patient?.is_high_risk
                    ? 'bg-red-100 text-red-800 border-red-300'
                    : obstetricData?.isTerm
                    ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                    : obstetricData?.isPreterm
                    ? 'bg-amber-100 text-amber-800 border-amber-300'
                    : 'bg-gray-100 text-gray-700 border-gray-200'
                }`}>
                  {patient?.is_high_risk 
                    ? '⚠️ High Risk Pregnancy' 
                    : obstetricData?.isTerm 
                    ? 'Full Term (37–41w)' 
                    : obstetricData?.isPreterm 
                    ? 'Preterm (<37w)' 
                    : 'Routine / Standard'}
                </span>
                <p className="text-[11px] font-semibold text-gray-500 mt-1 truncate">
                  Episode: {activeEpisode?.status || 'Active'}
                </p>
              </div>
            </div>

            <div className={`mt-3 pt-2.5 border-t text-[10px] font-bold ${
              patient?.is_high_risk ? 'border-red-100 text-red-700' : 'border-gray-100 text-gray-400'
            }`}>
              {patient?.is_high_risk ? 'Priority clinical monitoring' : 'Standard lying-in protocol'}
            </div>
          </div>
        </div>

        {/* ── Prominent Safety & High-Risk Alert Banners (Magic UI style) ── */}
        {(patient?.is_high_risk || hasRealAllergies || obstetricData?.boundaryAlert) && (
          <div className="pt-2 flex flex-wrap items-center gap-2.5">
            {patient?.is_high_risk && (
              <div className="bg-gradient-to-r from-red-500 to-rose-600 text-white font-black text-xs px-3.5 py-1.5 rounded-full flex items-center gap-2 shadow-sm shadow-red-500/25">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-white" />
                </span>
                <ShieldAlert className="w-3.5 h-3.5" />
                <span>HIGH RISK PREGNANCY</span>
              </div>
            )}

            {hasRealAllergies && (
              <div className="bg-amber-100 border border-amber-300 text-amber-900 font-bold text-xs px-3.5 py-1.5 rounded-full flex items-center gap-1.5 shadow-2xs">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-600 flex-shrink-0" />
                <span>Allergies: {patient.allergies}</span>
              </div>
            )}

            {obstetricData?.boundaryAlert && (
              <div className="bg-blue-50 border border-blue-200 text-blue-900 font-semibold text-xs px-3.5 py-1.5 rounded-full flex items-center gap-1.5 shadow-2xs">
                <Sparkles className="w-3.5 h-3.5 text-blue-500 flex-shrink-0" />
                <span>{obstetricData.boundaryAlert}</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Modal: Create or Edit Maternal Episode ── */}
      {showEpisodeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl border border-gray-200 shadow-2xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-rose-50 text-rose-500 flex items-center justify-center font-bold">
                  <Baby className="w-4 h-4" />
                </div>
                <h3 className="font-bold text-gray-900 text-base">
                  {modalMode === 'create' ? 'Start New Pregnancy Record' : 'Edit Pregnancy Record'}
                </h3>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => {
                  setShowEpisodeModal(false);
                  setError(null);
                }}
                className="h-8 w-8 p-0 text-gray-400 hover:text-gray-700 rounded-full"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>

            {error && (
              <div className="bg-red-50 text-red-600 text-xs font-bold p-3 rounded-xl border border-red-100">
                {error}
              </div>
            )}

            <form onSubmit={modalMode === 'create' ? handleCreateEpisode : handleUpdateEpisode} className="space-y-4">
              <input type="hidden" name="patient_id" value={id} />
              {modalMode === 'edit' && activeEpisode && (
                <input type="hidden" name="id" value={activeEpisode.id} />
              )}

              <div className="space-y-1">
                <Label className="text-xs font-bold text-gray-700">LMP (Last Menstrual Period)</Label>
                <Input
                  name="lmp"
                  type="date"
                  defaultValue={modalMode === 'edit' && activeEpisode?.lmp ? activeEpisode.lmp : ''}
                  required
                  className="h-10 text-sm focus-visible:ring-rose-500 rounded-xl"
                />
                <p className="text-[10px] text-gray-400">EDC (+280 days) is calculated automatically from LMP.</p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs font-bold text-gray-700">Gravida (Total)</Label>
                  <Input
                    name="gravida"
                    type="number"
                    min="1"
                    defaultValue={modalMode === 'edit' && activeEpisode?.gravida ? activeEpisode.gravida : 1}
                    className="h-10 text-sm focus-visible:ring-rose-500 rounded-xl"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs font-bold text-gray-700">Para (Deliveries)</Label>
                  <Input
                    name="para"
                    type="number"
                    min="0"
                    defaultValue={modalMode === 'edit' && activeEpisode?.para !== undefined ? activeEpisode.para : 0}
                    className="h-10 text-sm focus-visible:ring-rose-500 rounded-xl"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-bold text-gray-700">Episode Status</Label>
                <select
                  name="status"
                  defaultValue={modalMode === 'edit' && activeEpisode?.status ? activeEpisode.status : 'Active'}
                  className="w-full h-10 rounded-xl border border-input bg-white px-3 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-rose-500/20"
                >
                  <option value="Active">🟢 Active Pregnancy</option>
                  <option value="Delivered">👶 Delivered (Postpartum)</option>
                  <option value="Archived">⚪ Archived Record</option>
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-gray-100">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setShowEpisodeModal(false);
                    setError(null);
                  }}
                  className="text-xs font-semibold rounded-xl"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isPending}
                  size="sm"
                  className="bg-rose-500 hover:bg-rose-600 text-white text-xs font-bold px-5 h-10 rounded-xl shadow-md shadow-rose-500/20 active:scale-[0.98] transition-all"
                >
                  {isPending ? 'Saving...' : modalMode === 'create' ? 'Create Episode' : 'Save Changes'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Modal: Emergency Obstetric Transfer Slip ── */}
      <EmergencyTransferModal
        patient={patient}
        activeEpisode={activeEpisode}
        obstetricData={obstetricData}
        latestVisitLog={latestVisitLog}
        isOpen={showTransferModal}
        onClose={() => setShowTransferModal(false)}
      />
    </div>
  );
}
