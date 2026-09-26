'use client';

import { useState, useTransition, useMemo, useEffect } from 'react';
import { 
  AlertTriangle, ShieldAlert, Sparkles, HeartPulse, Activity,
  Calendar, CheckCircle, Scale, Baby, Thermometer, Stethoscope
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { getClinicTodayDateString } from '@/lib/utils';
import { calculateObstetricDates, evaluateMaternalVitalsSafety } from '@/lib/clinical-protocols';

export function VisitLogForm({
  patientId,
  activeEpisode,
  patientAge,
  previousLog,
  isHighRisk,
  latestUrinalysisProtein = null,
  addVisitLogAction,
  onSuccess
}) {
  const [isPending, startTransition] = useTransition();
  const [visitDate, setVisitDate] = useState(getClinicTodayDateString());
  const [aogOverride, setAogOverride] = useState('');
  
  // Vitals State for Real-Time Safety Analysis
  const [bp, setBp] = useState('');
  const [weight, setWeight] = useState('');
  const [temp, setTemp] = useState('');
  const [pr, setPr] = useState('');
  const [rr, setRr] = useState('');
  const [fht, setFht] = useState('');
  const [flagHighRisk, setFlagHighRisk] = useState(false);
  const [feedback, setFeedback] = useState(null);

  // 1. Dynamic AOG Auto-Calculation from LMP & Visit Date
  const obstetricCalc = useMemo(() => {
    if (!activeEpisode?.lmp) return null;
    return calculateObstetricDates(activeEpisode.lmp, visitDate);
  }, [activeEpisode?.lmp, visitDate]);

  // 2. Real-Time Maternal & Fetal Safety Trigger Analysis (with Pre-eclampsia Triad)
  const safetyEval = useMemo(() => {
    let prevWeight = null;
    let daysDiff = null;

    if (previousLog?.weight && previousLog?.visit_date) {
      prevWeight = previousLog.weight;
      const d1 = new Date(previousLog.visit_date);
      const d2 = new Date(visitDate);
      daysDiff = Math.round((d2 - d1) / (1000 * 60 * 60 * 24));
    }

    return evaluateMaternalVitalsSafety({
      bp,
      weight,
      temp,
      pr,
      rr,
      fht,
      age: patientAge,
      previousWeight: prevWeight,
      previousWeightDays: daysDiff,
      latestUrinalysisProtein
    });
  }, [bp, weight, temp, pr, rr, fht, patientAge, previousLog, visitDate, latestUrinalysisProtein]);

  // Auto-flag high risk if critical alert fires
  useEffect(() => {
    if (safetyEval.hasCriticalAlert) {
      setFlagHighRisk(true);
    }
  }, [safetyEval.hasCriticalAlert]);

  const handleSubmit = (e) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    // Attach calculated or entered values
    if (obstetricCalc?.isValid) {
      formData.set('aog_by_lmp', obstetricCalc.aogFormatted);
    }
    if (flagHighRisk) {
      formData.set('flag_high_risk', 'true');
    }

    startTransition(async () => {
      const res = await addVisitLogAction(formData);
      if (res?.success) {
        setFeedback({ type: 'success', message: 'Visit log successfully saved!' });
        // Reset form inputs
        setBp('');
        setWeight('');
        setTemp('');
        setPr('');
        setRr('');
        setFht('');
        if (onSuccess) onSuccess();
      } else {
        setFeedback({ type: 'error', message: res?.error || 'Failed to save visit log.' });
      }
    });
  };

  return (
    <form onSubmit={handleSubmit} className="p-6 bg-gradient-to-br from-rose-50/40 via-white to-pink-50/20 rounded-2xl border border-rose-100/80 shadow-sm space-y-6">
      
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-rose-100 gap-2">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-rose-500 text-white flex items-center justify-center shadow-sm shadow-rose-200">
            <Stethoscope className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-base font-bold text-gray-900 tracking-tight">Log Routine Prenatal Visit</h3>
            <p className="text-xs text-gray-500">Auto-calculates gestational age and analyzes clinical safety triggers.</p>
          </div>
        </div>

        {activeEpisode ? (
          <div className="flex items-center gap-2 bg-rose-100/70 border border-rose-200/80 px-3 py-1 rounded-full text-xs font-semibold text-rose-700">
            <Sparkles className="w-3.5 h-3.5 text-rose-600" />
            <span>Active Episode: {activeEpisode.lmp ? `LMP ${new Date(activeEpisode.lmp).toLocaleDateString('en-PH')}` : 'Clinical'}</span>
          </div>
        ) : (
          <span className="text-xs text-amber-600 bg-amber-50 px-2.5 py-1 rounded-full border border-amber-200">
            No Active Episode Selected
          </span>
        )}
      </div>

      <input type="hidden" name="patient_id" value={patientId} />
      {activeEpisode?.id && (
        <input type="hidden" name="maternal_episode_id" value={activeEpisode.id} />
      )}

      {/* Row 1: Visit Date & Dynamic AOG Display */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="space-y-1.5">
          <Label className="text-xs font-bold text-gray-600 uppercase tracking-wider flex items-center gap-1">
            <Calendar className="w-3.5 h-3.5 text-rose-500" /> Visit Date *
          </Label>
          <Input 
            name="visit_date" 
            type="date" 
            value={visitDate}
            onChange={(e) => setVisitDate(e.target.value)}
            className="h-10 border-gray-200 focus-visible:ring-rose-500" 
            required 
          />
        </div>

        {/* Dynamic AOG Calculator Output */}
        <div className="space-y-1.5">
          <Label className="text-xs font-bold text-gray-600 uppercase tracking-wider flex items-center justify-between">
            <span>AOG by LMP (Auto)</span>
            {obstetricCalc?.isValid && (
              <span className="text-[10px] font-black text-rose-600 bg-rose-100 px-1.5 py-0.5 rounded">
                Naegele Standard
              </span>
            )}
          </Label>
          {obstetricCalc?.isValid ? (
            <div className="h-10 px-3 flex items-center justify-between rounded-md border border-rose-200 bg-rose-50/60 text-sm">
              <span className="font-bold text-rose-900 font-mono">{obstetricCalc.aogFormatted}</span>
              <div className="flex items-center gap-1.5">
                {obstetricCalc.boundaryAlert && (
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                    obstetricCalc.isTerm ? 'bg-emerald-100 text-emerald-800' :
                    obstetricCalc.isPreterm ? 'bg-amber-100 text-amber-800' :
                    'bg-purple-100 text-purple-800'
                  }`}>
                    {obstetricCalc.isTerm ? 'Term' : obstetricCalc.isPreterm ? 'Preterm' : 'Post-term'}
                  </span>
                )}
                <span className="text-[11px] font-semibold text-rose-700 bg-white/80 px-2 py-0.5 rounded-full border border-rose-200">
                  {obstetricCalc.trimester}
                </span>
              </div>
            </div>
          ) : obstetricCalc?.error ? (
            <div className="h-10 px-2.5 flex items-center text-xs font-bold text-red-600 bg-red-50 rounded-md border border-red-200">
              ⚠ {obstetricCalc.error}
            </div>
          ) : (
            <Input 
              name="aog_by_lmp" 
              placeholder="e.g. 28 2/7" 
              className="h-10 border-gray-200 focus-visible:ring-rose-500" 
            />
          )}
        </div>

        {/* AOG by Ultrasound Override */}
        <div className="space-y-1.5">
          <Label className="text-xs font-bold text-gray-600 uppercase tracking-wider">
            AOG by UTZ (Optional)
          </Label>
          <Input 
            name="aog_by_utz" 
            value={aogOverride}
            onChange={(e) => setAogOverride(e.target.value)}
            placeholder="e.g. 28 4/7" 
            className="h-10 border-gray-200 focus-visible:ring-rose-500" 
          />
        </div>

        {/* Blood Pressure Input */}
        <div className="space-y-1.5">
          <Label className="text-xs font-bold text-gray-600 uppercase tracking-wider flex items-center gap-1">
            <Activity className="w-3.5 h-3.5 text-rose-500" /> Blood Pressure *
          </Label>
          <Input 
            name="bp" 
            value={bp}
            onChange={(e) => setBp(e.target.value)}
            placeholder="120/80" 
            className={`h-10 font-mono font-semibold transition-colors ${
              safetyEval.alerts.some(a => a.type.startsWith('BP_CRITICAL'))
                ? 'border-red-500 bg-red-50 text-red-900 focus-visible:ring-red-500'
                : safetyEval.alerts.some(a => a.type.startsWith('BP_WARNING'))
                ? 'border-amber-400 bg-amber-50 text-amber-900 focus-visible:ring-amber-500'
                : 'border-gray-200 focus-visible:ring-rose-500'
            }`} 
            required 
          />
        </div>
      </div>

      {/* Row 2: Secondary Vitals (Temp, PR, RR, Weight, FH, FHT) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="space-y-1">
          <Label className="text-[11px] font-bold text-gray-500 uppercase flex items-center gap-1">
            <Thermometer className="w-3 h-3 text-gray-400" /> Temp (°C)
          </Label>
          <Input 
            name="temp" 
            value={temp}
            onChange={(e) => setTemp(e.target.value)}
            placeholder="36.5" 
            className="h-9 border-gray-200 focus-visible:ring-rose-500 text-sm" 
          />
        </div>

        <div className="space-y-1">
          <Label className="text-[11px] font-bold text-gray-500 uppercase flex items-center gap-1">
            <HeartPulse className="w-3 h-3 text-gray-400" /> PR (bpm)
          </Label>
          <Input 
            name="pr" 
            value={pr}
            onChange={(e) => setPr(e.target.value)}
            placeholder="80" 
            className="h-9 border-gray-200 focus-visible:ring-rose-500 text-sm" 
          />
        </div>

        <div className="space-y-1">
          <Label className="text-[11px] font-bold text-gray-500 uppercase">RR (rpm)</Label>
          <Input 
            name="rr" 
            value={rr}
            onChange={(e) => setRr(e.target.value)}
            placeholder="18" 
            className="h-9 border-gray-200 focus-visible:ring-rose-500 text-sm" 
          />
        </div>

        <div className="space-y-1">
          <Label className="text-[11px] font-bold text-gray-500 uppercase flex items-center gap-1">
            <Scale className="w-3 h-3 text-gray-400" /> Weight (kg) *
          </Label>
          <Input 
            name="weight" 
            value={weight}
            onChange={(e) => setWeight(e.target.value)}
            placeholder="62.5" 
            className="h-9 border-gray-200 focus-visible:ring-rose-500 text-sm" 
            required 
          />
        </div>

        <div className="space-y-1">
          <Label className="text-[11px] font-bold text-gray-500 uppercase">Fundic Ht (cm)</Label>
          <Input 
            name="fh" 
            placeholder="28" 
            className="h-9 border-gray-200 focus-visible:ring-rose-500 text-sm" 
          />
        </div>

        <div className="space-y-1">
          <Label className="text-[11px] font-bold text-gray-500 uppercase flex items-center gap-1">
            <Baby className="w-3 h-3 text-gray-400" /> FHT (bpm)
          </Label>
          <Input 
            name="fht" 
            value={fht}
            onChange={(e) => setFht(e.target.value)}
            placeholder="140" 
            className={`h-9 text-sm ${
              safetyEval.alerts.some(a => a.type.startsWith('FHT'))
                ? 'border-red-400 bg-red-50 text-red-900'
                : 'border-gray-200 focus-visible:ring-rose-500'
            }`} 
          />
        </div>
      </div>

      {/* Row 3: Internal Exam & Next Appointment */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label className="text-xs font-bold text-gray-500 uppercase tracking-wider">
            Internal Examination (IE) Findings
          </Label>
          <Input 
            name="ie" 
            placeholder="e.g. Cervix closed, high, thick, intact bag of waters" 
            className="h-9 border-gray-200 focus-visible:ring-rose-500 text-sm" 
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs font-bold text-gray-500 uppercase tracking-wider">
            Recommended Next Prenatal Visit
          </Label>
          <Input 
            name="next_visit" 
            type="date" 
            className="h-9 border-gray-200 focus-visible:ring-rose-500 text-sm" 
          />
        </div>
      </div>

      {/* Doctor / Midwife Notes */}
      <div className="space-y-1">
        <Label className="text-xs font-bold text-gray-600 uppercase tracking-wider">
          Clinician's Findings & Prescriptions *
        </Label>
        <textarea
          name="doctor_notes"
          rows={3}
          className="flex w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm shadow-sm placeholder:text-gray-400 focus-visible:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
          placeholder="Clinical assessment, iron supplementation, ultrasound orders, dietary counseling..."
          required
        />
      </div>

      {/* ── REAL-TIME HIGH-RISK CLINICAL SAFETY TRIGGER BANNER ── */}
      {!safetyEval.isSafe && (
        <div className={`p-4 rounded-xl border space-y-2.5 transition-all ${
          safetyEval.hasCriticalAlert
            ? 'bg-red-50/90 border-red-300 text-red-950'
            : 'bg-amber-50/90 border-amber-300 text-amber-950'
        }`}>
          <div className="flex items-center gap-2 font-bold text-sm">
            {safetyEval.hasCriticalAlert ? (
              <ShieldAlert className="w-5 h-5 text-red-600 animate-pulse flex-shrink-0" />
            ) : (
              <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0" />
            )}
            <span>
              {safetyEval.hasCriticalAlert
                ? 'CRITICAL CLINICAL ALERT: Maternal Emergency Threshold Detected'
                : 'CLINICAL CAUTION: Vital Signs Exceed Normal Maternal Range'}
            </span>
          </div>

          <div className="space-y-1.5 pl-7">
            {safetyEval.alerts.map((alert, idx) => (
              <div key={idx} className="text-xs space-y-0.5">
                <span className="font-bold underline decoration-rose-400">{alert.title}:</span>{' '}
                <span className="text-gray-700">{alert.message}</span>
                {alert.action && (
                  <div className="font-semibold text-rose-800 text-[11px] mt-0.5">
                    ➔ Recommended Immediate Action: {alert.action}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* High-Risk Escalation Checkbox */}
          <div className="pt-2 border-t border-red-200/60 flex items-center gap-2 pl-7">
            <input 
              type="checkbox"
              id="flag_high_risk"
              checked={flagHighRisk}
              onChange={(e) => setFlagHighRisk(e.target.checked)}
              className="w-4 h-4 rounded text-red-600 accent-red-600 focus:ring-red-500"
            />
            <label htmlFor="flag_high_risk" className="text-xs font-bold text-red-900 cursor-pointer">
              Flag patient as "High-Risk Pregnancy" on primary medical chart
            </label>
          </div>
        </div>
      )}

      {/* Feedback Message */}
      {feedback && (
        <div className={`p-3 rounded-lg text-xs font-semibold flex items-center gap-2 ${
          feedback.type === 'success' 
            ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' 
            : 'bg-red-50 text-red-800 border border-red-200'
        }`}>
          {feedback.type === 'success' ? <CheckCircle className="w-4 h-4 text-emerald-600" /> : <AlertTriangle className="w-4 h-4 text-red-600" />}
          <span>{feedback.message}</span>
        </div>
      )}

      {/* Action Footer */}
      <div className="flex items-center justify-between pt-2">
        <div className="text-xs text-gray-500 font-medium">
          {obstetricCalc?.edcFormatted && (
            <span>Expected Date of Confinement: <strong className="text-gray-800">{obstetricCalc.edcFormatted}</strong></span>
          )}
        </div>

        <Button 
          type="submit" 
          disabled={isPending}
          className="bg-rose-500 hover:bg-rose-600 text-white rounded-xl px-8 h-11 font-bold shadow-md shadow-rose-200 transition-all gap-2"
        >
          {isPending ? 'Validating & Saving...' : 'Save Clinical Visit'}
        </Button>
      </div>
    </form>
  );
}
