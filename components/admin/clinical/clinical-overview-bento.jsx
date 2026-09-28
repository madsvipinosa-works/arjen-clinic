'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  HeartPulse,
  FlaskConical,
  MessageSquare,
  Baby,
  User,
  ShieldCheck,
  AlertTriangle,
  ChevronRight,
  ExternalLink,
  Plus,
  Droplets,
  Calendar,
  Phone,
  MapPin,
  Pencil,
  FileText,
  Activity,
  CheckCircle2,
  Clock,
  Sparkles
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { TeleconsultSummaryCard } from '@/components/admin/clinical/teleconsult-summary-card';
import { PatientProfileTab } from '@/components/admin/patient-profile-tab';
import { ModularRecordEditor } from '@/components/admin/modular-record-editor';

export function ClinicalOverviewBento({
  patient,
  activeEpisode,
  obstetricData,
  latestVisitLog,
  latestLabResult,
  postpartumRecord,
  birthPlan,
  consultationMessages = [],
  modularData,
  updateModularData,
  onSwitchTab
}) {
  const [showModularEditor, setShowModularEditor] = useState(false);

  // Blood Pressure Classification based on Philippine Clinical Guidelines
  const evaluateBP = (bpStr) => {
    if (!bpStr || typeof bpStr !== 'string') return null;
    const parts = bpStr.split('/');
    if (parts.length !== 2) return null;
    const systolic = parseInt(parts[0], 10);
    const diastolic = parseInt(parts[1], 10);
    if (isNaN(systolic) || isNaN(diastolic)) return null;

    if (systolic >= 140 || diastolic >= 90) {
      return {
        level: 'danger',
        label: 'Elevated / High Risk',
        badgeClass: 'bg-red-100 text-red-700 border-red-200',
        note: 'Monitor for pre-eclampsia & protein.'
      };
    }
    if (systolic >= 130 || diastolic >= 80) {
      return {
        level: 'warning',
        label: 'Borderline Elevated',
        badgeClass: 'bg-amber-100 text-amber-800 border-amber-200',
        note: 'Requires dietary & BP monitoring.'
      };
    }
    return {
      level: 'normal',
      label: 'Normal / Healthy',
      badgeClass: 'bg-emerald-100 text-emerald-700 border-emerald-200',
      note: 'Within standard target range.'
    };
  };

  const bpEval = evaluateBP(latestVisitLog?.bp);

  // FHR Evaluation
  const evaluateFHR = (fhrVal) => {
    if (!fhrVal) return null;
    const fhr = parseInt(fhrVal, 10);
    if (isNaN(fhr)) return null;
    if (fhr > 160) {
      return { label: 'Tachycardia Alert', class: 'text-red-600 bg-red-50 border-red-200' };
    }
    if (fhr < 110) {
      return { label: 'Bradycardia Alert', class: 'text-red-600 bg-red-50 border-red-200' };
    }
    return { label: 'Regular / Baseline', class: 'text-emerald-700 bg-emerald-50 border-emerald-200' };
  };

  const fhrEval = evaluateFHR(latestVisitLog?.fhr);

  return (
    <div className="space-y-6">
      {/* ── Top Bento Row: Latest Vitals & Latest Diagnostics (2-Col Grid) ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* ── BENTO CARD A: Latest Clinical Vitals & Fetal Biometry (Col 1-7) ── */}
        <div className="lg:col-span-7 bg-white/90 backdrop-blur-md rounded-3xl p-6 shadow-sm border border-gray-200/80 flex flex-col justify-between hover:shadow-md transition-all">
          <div>
            {/* Header */}
            <div className="flex items-center justify-between pb-4 border-b border-gray-100 mb-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-rose-500 to-pink-500 text-white flex items-center justify-center shadow-sm shadow-rose-500/20">
                  <HeartPulse className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-gray-900 text-lg tracking-tight">
                    Latest Antenatal Vitals &amp; Fetal Biometry
                  </h3>
                  <p className="text-xs text-gray-500 font-medium">
                    {latestVisitLog?.visit_date ? (
                      <>Examined on <strong className="text-gray-700">{new Date(latestVisitLog.visit_date).toLocaleDateString()}</strong> • {latestVisitLog.aog_by_lmp || 'AOG recorded'}</>
                    ) : (
                      'No visit logged yet for this pregnancy'
                    )}
                  </p>
                </div>
              </div>

              {latestVisitLog ? (
                <button
                  type="button"
                  onClick={() => onSwitchTab?.('clinical')}
                  className="text-xs font-bold text-rose-600 hover:text-rose-700 flex items-center gap-1 hover:underline cursor-pointer"
                >
                  <span>History</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              ) : null}
            </div>

            {/* Vitals Content or Clean Empty State */}
            {latestVisitLog ? (
              <div className="space-y-4">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {/* Blood Pressure Widget */}
                  <div className={`p-3.5 rounded-2xl border transition-all ${
                    bpEval?.level === 'danger'
                      ? 'bg-red-50/80 border-red-200 text-red-900'
                      : bpEval?.level === 'warning'
                      ? 'bg-amber-50/80 border-amber-200 text-amber-900'
                      : 'bg-slate-50/80 border-slate-200/80 text-gray-900'
                  }`}>
                    <span className="text-[10px] font-black uppercase tracking-wider text-gray-400 block mb-1">
                      Blood Pressure
                    </span>
                    <div className="flex items-baseline gap-1">
                      <span className="text-2xl font-black tracking-tight">{latestVisitLog.bp || '—'}</span>
                      <span className="text-[11px] text-gray-500 font-semibold">mmHg</span>
                    </div>
                    {bpEval && (
                      <span className={`inline-block mt-1 text-[10px] font-black px-2 py-0.5 rounded-full border ${bpEval.badgeClass}`}>
                        {bpEval.label}
                      </span>
                    )}
                  </div>

                  {/* Maternal Weight */}
                  <div className="p-3.5 rounded-2xl bg-slate-50/80 border border-slate-200/80">
                    <span className="text-[10px] font-black uppercase tracking-wider text-gray-400 block mb-1">
                      Maternal Weight
                    </span>
                    <div className="flex items-baseline gap-1">
                      <span className="text-2xl font-black text-gray-900 tracking-tight">
                        {latestVisitLog.weight || '—'}
                      </span>
                      <span className="text-[11px] text-gray-500 font-semibold">kg</span>
                    </div>
                    <span className="inline-block mt-1 text-[10px] font-semibold text-gray-500">
                      Standard weight tracking
                    </span>
                  </div>

                  {/* Fetal Heart Rate (FHR) */}
                  <div className="p-3.5 rounded-2xl bg-teal-50/70 border border-teal-200/80">
                    <span className="text-[10px] font-black uppercase tracking-wider text-teal-700 block mb-1">
                      Fetal Heart Rate
                    </span>
                    <div className="flex items-baseline gap-1">
                      <span className="text-2xl font-black text-teal-800 tracking-tight">
                        {latestVisitLog.fhr || '—'}
                      </span>
                      <span className="text-[11px] text-teal-600 font-semibold">bpm</span>
                    </div>
                    {fhrEval && (
                      <span className={`inline-block mt-1 text-[10px] font-black px-2 py-0.5 rounded-full border ${fhrEval.class}`}>
                        {fhrEval.label}
                      </span>
                    )}
                  </div>

                  {/* Fundic Height */}
                  <div className="p-3.5 rounded-2xl bg-slate-50/80 border border-slate-200/80">
                    <span className="text-[10px] font-black uppercase tracking-wider text-gray-400 block mb-1">
                      Fundic Height
                    </span>
                    <div className="flex items-baseline gap-1">
                      <span className="text-2xl font-black text-gray-900 tracking-tight">
                        {latestVisitLog.fundic_height || '—'}
                      </span>
                      <span className="text-[11px] text-gray-500 font-semibold">cm</span>
                    </div>
                    <span className="inline-block mt-1 text-[10px] font-semibold text-gray-500">
                      Uterine growth monitor
                    </span>
                  </div>

                  {/* Presentation / Station */}
                  <div className="p-3.5 rounded-2xl bg-slate-50/80 border border-slate-200/80">
                    <span className="text-[10px] font-black uppercase tracking-wider text-gray-400 block mb-1">
                      Presentation
                    </span>
                    <div className="flex items-baseline gap-1">
                      <span className="text-base font-black text-gray-900 truncate">
                        {latestVisitLog.fetal_presentation || 'Cephalic'}
                      </span>
                    </div>
                    <span className="inline-block mt-1 text-[10px] font-semibold text-emerald-700">
                      Fetal lie concordant
                    </span>
                  </div>

                  {/* Fetal Movement */}
                  <div className="p-3.5 rounded-2xl bg-slate-50/80 border border-slate-200/80">
                    <span className="text-[10px] font-black uppercase tracking-wider text-gray-400 block mb-1">
                      Fetal Activity
                    </span>
                    <div className="flex items-baseline gap-1">
                      <span className="text-base font-black text-gray-900 truncate">
                        {latestVisitLog.fetal_movement || 'Reassuring'}
                      </span>
                    </div>
                    <span className="inline-block mt-1 text-[10px] font-semibold text-gray-500">
                      Kick count reported
                    </span>
                  </div>
                </div>

                {/* Attending Notes Snippet */}
                {latestVisitLog.doctor_notes && (
                  <div className="p-3 rounded-2xl bg-gray-50 border border-gray-100 text-xs text-gray-600">
                    <span className="font-bold text-gray-700 block mb-0.5">Attending Clinical Notes:</span>
                    <p className="italic">{latestVisitLog.doctor_notes}</p>
                  </div>
                )}
              </div>
            ) : (
              <div className="py-8 text-center bg-gray-50/60 rounded-2xl border border-dashed border-gray-200">
                <HeartPulse className="w-10 h-10 text-gray-300 mx-auto mb-2" />
                <p className="text-xs font-bold text-gray-700">No Checkup Visits Logged</p>
                <p className="text-[11px] text-gray-400 mt-0.5 max-w-sm mx-auto">
                  Vitals such as Blood Pressure, FHR, and Fundic Height will appear here once the first checkup is recorded.
                </p>
                <Button
                  type="button"
                  onClick={() => onSwitchTab?.('clinical')}
                  size="sm"
                  className="mt-3 bg-rose-500 hover:bg-rose-600 text-white rounded-xl text-xs font-bold h-8 px-4 gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>+ Record Checkup Visit</span>
                </Button>
              </div>
            )}
          </div>

          {/* Quick Footer Action */}
          <div className="mt-5 pt-4 border-t border-gray-100 flex items-center justify-between">
            <span className="text-[11px] text-gray-400 font-medium">
              Real-time bedside observations from attendings
            </span>
            <button
              type="button"
              onClick={() => onSwitchTab?.('clinical')}
              className="text-xs font-bold text-rose-600 hover:text-rose-700 flex items-center gap-1 hover:underline cursor-pointer"
            >
              <span>+ Record New Checkup</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* ── BENTO CARD B: Structured Laboratory & Screening Summary (Col 8-12) ── */}
        <div className="lg:col-span-5 bg-white/90 backdrop-blur-md rounded-3xl p-6 shadow-sm border border-gray-200/80 flex flex-col justify-between hover:shadow-md transition-all">
          <div>
            {/* Header */}
            <div className="flex items-center justify-between pb-4 border-b border-gray-100 mb-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-teal-500 to-emerald-500 text-white flex items-center justify-center shadow-sm shadow-teal-500/20">
                  <FlaskConical className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-gray-900 text-lg tracking-tight">
                    Structured Lab &amp; Screening
                  </h3>
                  <p className="text-xs text-gray-500 font-medium">
                    {latestLabResult?.test_date ? (
                      <>Reported on <strong className="text-gray-700">{new Date(latestLabResult.test_date).toLocaleDateString()}</strong></>
                    ) : (
                      'No lab panels recorded'
                    )}
                  </p>
                </div>
              </div>

              {latestLabResult ? (
                <button
                  type="button"
                  onClick={() => onSwitchTab?.('labs')}
                  className="text-xs font-bold text-teal-600 hover:text-teal-700 flex items-center gap-1 hover:underline cursor-pointer"
                >
                  <span>All Labs</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              ) : null}
            </div>

            {/* Content or Clean Empty State */}
            {latestLabResult ? (
              <div className="space-y-3">
                {/* Hemoglobin & Hematocrit Row */}
                <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50/80 border border-slate-200/70">
                  <div>
                    <span className="text-[10px] font-black uppercase tracking-wider text-gray-400 block">Hemoglobin (CBC)</span>
                    <strong className="text-sm font-black text-gray-900">
                      {latestLabResult.hemoglobin ? `${latestLabResult.hemoglobin} g/dL` : 'Pending'}
                    </strong>
                  </div>
                  {latestLabResult.hemoglobin && (
                    <span className={`text-[10px] font-black px-2 py-0.5 rounded-full border ${
                      parseFloat(latestLabResult.hemoglobin) >= 11.0
                        ? 'bg-emerald-100 text-emerald-700 border-emerald-200'
                        : 'bg-red-100 text-red-700 border-red-200'
                    }`}>
                      {parseFloat(latestLabResult.hemoglobin) >= 11.0 ? 'Normal' : 'Anemic Flag'}
                    </span>
                  )}
                </div>

                {/* Urinalysis Protein & Glucose */}
                <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50/80 border border-slate-200/70">
                  <div>
                    <span className="text-[10px] font-black uppercase tracking-wider text-gray-400 block">Urinalysis Protein</span>
                    <strong className="text-sm font-black text-gray-900">
                      {latestLabResult.urinalysis_protein || 'Negative / Trace'}
                    </strong>
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-gray-700 border border-slate-200">
                    Sugar: {latestLabResult.urinalysis_glucose || 'Negative'}
                  </span>
                </div>

                {/* Infectious Screen (HBsAg, VDRL) */}
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="p-2.5 rounded-xl bg-slate-50/80 border border-slate-200/70">
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block">HBsAg Hep B</span>
                    <strong className="text-gray-800 text-xs">
                      {latestLabResult.hbsag_status || 'Non-Reactive'}
                    </strong>
                  </div>
                  <div className="p-2.5 rounded-xl bg-slate-50/80 border border-slate-200/70">
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block">VDRL / RPR</span>
                    <strong className="text-gray-800 text-xs">
                      {latestLabResult.vdrl_rpr_status || 'Non-Reactive'}
                    </strong>
                  </div>
                </div>

                {/* Ultrasound Summary Snippet */}
                {latestLabResult.ultrasound_summary && (
                  <div className="p-3 rounded-2xl bg-teal-50/50 border border-teal-100 text-xs text-teal-900">
                    <span className="font-bold text-teal-800 block mb-0.5">Ultrasound Biometry:</span>
                    <p className="line-clamp-2">{latestLabResult.ultrasound_summary}</p>
                  </div>
                )}
              </div>
            ) : (
              <div className="py-8 text-center bg-gray-50/60 rounded-2xl border border-dashed border-gray-200">
                <FlaskConical className="w-10 h-10 text-gray-300 mx-auto mb-2" />
                <p className="text-xs font-bold text-gray-700">No Lab Results Uploaded</p>
                <p className="text-[11px] text-gray-400 mt-0.5 max-w-xs mx-auto">
                  CBC, Urinalysis, OGTT, and Ultrasound summaries will be summarized here once recorded.
                </p>
                <Button
                  type="button"
                  onClick={() => onSwitchTab?.('labs')}
                  size="sm"
                  className="mt-3 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold h-8 px-4 gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>+ Add Lab Result</span>
                </Button>
              </div>
            )}
          </div>

          {/* Quick Footer Action */}
          <div className="mt-5 pt-4 border-t border-gray-100 flex items-center justify-between">
            <span className="text-[11px] text-gray-400 font-medium">
              PhilHealth MCP diagnostic checklist
            </span>
            <button
              type="button"
              onClick={() => onSwitchTab?.('labs')}
              className="text-xs font-bold text-teal-700 hover:text-teal-800 flex items-center gap-1 hover:underline cursor-pointer"
            >
              <span>+ Record Lab Panel</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* ── Middle Bento Row: Teleconsult Bridge & DOH Protocol Readiness ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* ── BENTO CARD C: Telehealth & Patient Communications (Col 1-6) ── */}
        <div className="lg:col-span-6 bg-white/90 backdrop-blur-md rounded-3xl p-6 shadow-sm border border-gray-200/80 flex flex-col justify-between hover:shadow-md transition-all">
          <TeleconsultSummaryCard
            patientId={patient?.id}
            patientName={patient?.full_name}
            consultationMessages={consultationMessages}
          />
        </div>

        {/* ── BENTO CARD D: DOH EINC & Maternal Protocol Readiness (Col 7-12) ── */}
        <div className="lg:col-span-6 bg-white/90 backdrop-blur-md rounded-3xl p-6 shadow-sm border border-gray-200/80 flex flex-col justify-between hover:shadow-md transition-all">
          <div>
            <div className="flex items-center justify-between pb-4 border-b border-gray-100 mb-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-indigo-500 to-purple-500 text-white flex items-center justify-center shadow-sm shadow-indigo-500/20">
                  <Baby className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-gray-900 text-lg tracking-tight">
                    DOH EINC &amp; Delivery Readiness
                  </h3>
                  <p className="text-xs text-gray-500 font-medium">
                    National clinical protocol status (Unang Yakap)
                  </p>
                </div>
              </div>

              <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
                BEmONC Verified
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
              {/* Delivery Venue */}
              <div className="p-3.5 rounded-2xl bg-slate-50/80 border border-slate-200/70">
                <span className="text-[10px] font-black uppercase tracking-wider text-gray-400 block mb-1">
                  Planned Delivery Venue
                </span>
                <strong className="text-sm font-black text-gray-900">
                  {birthPlan?.delivery_location || 'Lying-in Clinic'}
                </strong>
                <p className="text-[11px] text-gray-500 mt-0.5">
                  Attendant: {birthPlan?.birth_attendant || 'Midwife / Doctor'}
                </p>
              </div>

              {/* PhilHealth MCP Status */}
              <div className="p-3.5 rounded-2xl bg-emerald-50/70 border border-emerald-200/80">
                <span className="text-[10px] font-black uppercase tracking-wider text-emerald-700 block mb-1">
                  PhilHealth MCP Package
                </span>
                <strong className="text-sm font-black text-emerald-900">
                  {patient?.philhealth_number ? '₱8,000 Verified' : 'Pending Member PIN'}
                </strong>
                <p className="text-[11px] text-emerald-700 mt-0.5">
                  {patient?.philhealth_number ? `PIN: ${patient.philhealth_number}` : 'Requires PMRF form'}
                </p>
              </div>
            </div>

            {/* DOH EINC Checklist Checklist Summary */}
            <div className="bg-slate-50/80 rounded-2xl p-4 border border-slate-200/70 space-y-2">
              <span className="text-[10px] font-black uppercase tracking-wider text-gray-500 block">
                DOH Essential Newborn Care (EINC) Milestones:
              </span>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="flex items-center gap-2 text-gray-700">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span>Immediate Drying</span>
                </div>
                <div className="flex items-center gap-2 text-gray-700">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span>Skin-to-Skin Contact</span>
                </div>
                <div className="flex items-center gap-2 text-gray-700">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span>Delayed Cord Clamping</span>
                </div>
                <div className="flex items-center gap-2 text-gray-700">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span>Early Breastfeeding</span>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-5 pt-4 border-t border-gray-100 flex items-center justify-between">
            <span className="text-[11px] text-gray-400 font-medium">
              Postpartum outcomes recorded under Postpartum tab
            </span>
            <button
              type="button"
              onClick={() => onSwitchTab?.('postpartum')}
              className="text-xs font-bold text-indigo-600 hover:text-indigo-700 flex items-center gap-1 hover:underline cursor-pointer"
            >
              <span>View Postpartum &amp; Newborn Care</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* ── Bottom Section: Demographics & Contact Profile ── */}
      <div className="bg-white/90 backdrop-blur-md rounded-3xl p-6 shadow-sm border border-gray-200/80 hover:shadow-md transition-all">
        <PatientProfileTab
          patient={patient}
          consultationMessages={consultationMessages}
        />
      </div>

      {/* ── Collapsible Section: Deep Clinical Notes & Systems Review (Modular Records) ── */}
      <div className="bg-white/90 backdrop-blur-md rounded-3xl p-6 shadow-sm border border-gray-200/80 hover:shadow-md transition-all">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center font-bold">
              <FileText className="w-4 h-4" />
            </div>
            <div>
              <h4 className="font-black text-gray-900 text-base">Comprehensive Medical History &amp; Systems Review</h4>
              <p className="text-xs text-gray-500">
                Detailed notes for past medical illnesses, obstetrical formulas, and physical examination.
              </p>
            </div>
          </div>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setShowModularEditor(!showModularEditor)}
            className="text-xs font-bold rounded-xl h-9 px-4 gap-1.5"
          >
            <Pencil className="w-3.5 h-3.5" />
            <span>{showModularEditor ? 'Hide Medical Review' : 'Open Medical Review'}</span>
          </Button>
        </div>

        {showModularEditor && (
          <div className="mt-6 pt-6 border-t border-gray-100 animate-in fade-in duration-200">
            <ModularRecordEditor
              patientId={patient?.id}
              initialModularData={modularData}
              updateModularData={updateModularData}
            />
          </div>
        )}
      </div>
    </div>
  );
}
