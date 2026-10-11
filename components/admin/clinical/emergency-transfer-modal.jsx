'use client';

import React, { useState, useEffect } from 'react';
import {
  Ambulance,
  Printer,
  X,
  AlertTriangle,
  Building2,
  Phone,
  ShieldAlert,
  Clock,
  User,
  HeartPulse,
  Droplets
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export function EmergencyTransferModal({
  patient,
  activeEpisode,
  obstetricData,
  latestVisitLog,
  isOpen,
  onClose
}) {
  const [receivingFacility, setReceivingFacility] = useState('Provincial / District Tertiary Hospital');
  const [transferReason, setTransferReason] = useState(
    patient?.is_high_risk 
      ? 'Gestational Hypertension / High-Risk Obstetric Monitoring' 
      : 'Labor Progression / Obstetric Management'
  );
  const [accompanyingStaff, setAccompanyingStaff] = useState('RM On-Duty Midwife');

  // Keyboard shortcut: Escape closes modal
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div 
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-200"
    >
      {/* Isolated Print Styles */}
      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          body * {
            visibility: hidden !important;
          }
          #doh-emergency-transfer-slip, #doh-emergency-transfer-slip * {
            visibility: visible !important;
          }
          #doh-emergency-transfer-slip {
            position: fixed !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            max-width: 100% !important;
            height: auto !important;
            border: none !important;
            box-shadow: none !important;
            padding: 12mm 15mm !important;
            margin: 0 !important;
            background: white !important;
          }
          .no-print {
            display: none !important;
          }
        }
      `}} />

      <div 
        id="doh-emergency-transfer-slip"
        className="bg-white rounded-3xl border border-gray-200/90 shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 md:p-8 space-y-6"
      >
        {/* Header Strip */}
        <div className="flex items-start justify-between border-b border-gray-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-red-600 to-rose-500 text-white flex items-center justify-center shadow-md shadow-red-500/20 shrink-0">
              <Ambulance className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-red-100 text-red-700">
                  DOH BEmONC Referral
                </span>
                <span className="text-xs text-gray-400 font-mono">Form DOH-EMR-REF-01</span>
              </div>
              <h2 className="text-xl font-black text-gray-900 tracking-tight mt-0.5">
                Emergency Obstetric Transfer Slip
              </h2>
            </div>
          </div>

          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="no-print h-8 w-8 p-0 text-gray-400 hover:text-gray-700 rounded-full cursor-pointer"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>

        {/* Clinic & Facility Info */}
        <div className="bg-slate-50 border border-slate-200/70 rounded-2xl p-4 text-xs space-y-1">
          <div className="flex items-center justify-between">
            <p className="font-black text-gray-800 uppercase tracking-wider text-[11px]">
              Referring Facility: AR-JEN Maternity &amp; Lying-In Clinic
            </p>
            <span className="text-gray-500 font-medium">Date: {new Date().toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: 'numeric' })}</span>
          </div>
          <p className="text-gray-600">
            Address: San Vicente, Gapan City, Nueva Ecija • Emergency Dispatch Hotline: (044) 958-0000
          </p>
        </div>

        {/* Patient Clinical Profile */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-rose-50/50 border border-rose-100/80 rounded-2xl p-4 text-xs">
          <div>
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block">Patient Name</span>
            <strong className="text-gray-900 text-sm">{patient?.full_name || '—'}</strong>
          </div>
          <div>
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block">Age / Blood Type</span>
            <strong className="text-gray-900 text-sm">
              {patient?.age ? `${patient.age} yrs` : '—'} • {patient?.blood_type || 'Unknown'}
            </strong>
          </div>
          <div>
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block">Obstetric Score</span>
            <strong className="text-gray-900 text-sm">
              G{activeEpisode?.gravida ?? patient?.gravida ?? 1} P{activeEpisode?.para ?? patient?.para ?? 0}
            </strong>
          </div>
          <div>
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block">Current AOG</span>
            <strong className="text-rose-600 text-sm">
              {obstetricData?.isValid ? obstetricData.aogDetailed : 'No LMP set'}
            </strong>
          </div>
        </div>

        {/* Latest Vital Signs Telemetry */}
        <div className="border border-gray-200/80 rounded-2xl p-4 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-wider text-gray-500 flex items-center gap-1.5">
              <HeartPulse className="w-3.5 h-3.5 text-rose-500" /> Bedside Vitals Before Departure
            </span>
            <span className="text-[11px] text-gray-400 font-medium">
              {latestVisitLog?.visit_date ? `Logged: ${latestVisitLog.visit_date}` : 'Real-time check required'}
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
            <div className="bg-gray-50 p-2.5 rounded-xl border border-gray-100">
              <span className="text-[10px] text-gray-500 font-semibold block">Blood Pressure</span>
              <p className="text-base font-black text-gray-900">
                {latestVisitLog?.bp || 'Pending check'}
              </p>
            </div>
            <div className="bg-gray-50 p-2.5 rounded-xl border border-gray-100">
              <span className="text-[10px] text-gray-500 font-semibold block">Fetal Heart Rate</span>
              <p className="text-base font-black text-emerald-700">
                {latestVisitLog?.fhr ? `${latestVisitLog.fhr} bpm` : 'Pending check'}
              </p>
            </div>
            <div className="bg-gray-50 p-2.5 rounded-xl border border-gray-100">
              <span className="text-[10px] text-gray-500 font-semibold block">Fundic Height</span>
              <p className="text-base font-black text-gray-900">
                {latestVisitLog?.fundic_height ? `${latestVisitLog.fundic_height} cm` : '—'}
              </p>
            </div>
            <div className="bg-gray-50 p-2.5 rounded-xl border border-gray-100">
              <span className="text-[10px] text-gray-500 font-semibold block">Maternal Weight</span>
              <p className="text-base font-black text-gray-900">
                {latestVisitLog?.weight ? `${latestVisitLog.weight} kg` : '—'}
              </p>
            </div>
          </div>
        </div>

        {/* Transfer Destination & Clinical Justification */}
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label className="text-xs font-bold text-gray-700">Receiving Tertiary Hospital / Medical Center</Label>
            <Input
              value={receivingFacility}
              onChange={(e) => setReceivingFacility(e.target.value)}
              placeholder="e.g. Paulino J. Garcia Memorial Research and Medical Center (PJGMRMC)"
              className="h-10 text-xs rounded-xl focus-visible:ring-rose-500 font-medium"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-bold text-gray-700">Clinical Reason for Transfer / Diagnosis</Label>
            <Input
              value={transferReason}
              onChange={(e) => setTransferReason(e.target.value)}
              placeholder="e.g. Severe Preeclampsia (BP 150/100), Prolonged Active Phase, Meconium Staining"
              className="h-10 text-xs rounded-xl focus-visible:ring-rose-500 font-medium"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-gray-700">Accompanying Midwife / Nurse</Label>
              <Input
                value={accompanyingStaff}
                onChange={(e) => setAccompanyingStaff(e.target.value)}
                className="h-10 text-xs rounded-xl focus-visible:ring-rose-500 font-medium"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-gray-700">Emergency Kin Contact</Label>
              <Input
                maxLength={60}
                defaultValue={patient?.husband_partner_name ? `${patient.husband_partner_name} (${patient.contact_number || 'No phone'})` : patient?.contact_number || ''}
                className="h-10 text-xs rounded-xl focus-visible:ring-rose-500 font-medium"
              />
            </div>
          </div>
        </div>

        {/* Physical Handover Signatures Block */}
        <div className="border-t-2 border-gray-900 pt-4 space-y-4">
          <p className="text-[10px] font-black uppercase tracking-wider text-gray-700">
            DOH Physical Handover &amp; Endorsement Signatures:
          </p>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="border-b border-gray-800 pb-8 mb-1"></div>
              <p className="text-[10px] font-bold text-gray-900 uppercase">Referring Clinician</p>
              <p className="text-[9px] text-gray-500">License No. / Clinic Stamp</p>
            </div>
            <div>
              <div className="border-b border-gray-800 pb-8 mb-1"></div>
              <p className="text-[10px] font-bold text-gray-900 uppercase">Transport Escort</p>
              <p className="text-[9px] text-gray-500">Departure Time: _______</p>
            </div>
            <div>
              <div className="border-b border-gray-800 pb-8 mb-1"></div>
              <p className="text-[10px] font-bold text-gray-900 uppercase">Receiving Medical Officer</p>
              <p className="text-[9px] text-gray-500">Arrival Time: _______</p>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="no-print flex items-center justify-between pt-4 border-t border-gray-100">
          <span className="text-[11px] text-gray-400 font-medium">
            Standard DOH BEmONC Referral Slip Form.
          </span>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="text-xs font-bold rounded-xl h-10 px-4 cursor-pointer"
            >
              Close
            </Button>
            <Button
              type="button"
              onClick={handlePrint}
              className="bg-gradient-to-r from-red-600 to-rose-600 hover:brightness-105 text-white text-xs font-bold rounded-xl h-10 px-5 gap-2 shadow-md shadow-red-500/20 active:scale-[0.98] transition-all cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>Print Transfer Slip</span>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
