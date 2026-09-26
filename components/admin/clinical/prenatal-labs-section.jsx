'use client';

import { useState, useTransition, useMemo } from 'react';
import { 
  FlaskConical, Plus, Trash2, AlertTriangle, ShieldAlert,
  CheckCircle2, Clock, Calendar, FileText, Activity, AlertCircle, Sparkles
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { getClinicTodayDateString } from '@/lib/utils';
import { evaluatePrenatalLabResults } from '@/lib/clinical-protocols';
import { addPrenatalLabResult, deletePrenatalLabResult } from '@/app/actions';

export function PrenatalLabsSection({ 
  patientId, 
  activeEpisodeId, 
  labResults = [],
  patientBloodType = null 
}) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  // Modal Form State for real-time anomaly detection
  const [testDate, setTestDate] = useState(getClinicTodayDateString());
  const [labName, setLabName] = useState('AR-JEN Clinic Laboratory');
  const [hb, setHb] = useState('');
  const [hct, setHct] = useState('');
  const [bloodType, setBloodType] = useState(patientBloodType || '');
  const [protein, setProtein] = useState('Negative');
  const [glucose, setGlucose] = useState('Negative');
  const [pusCells, setPusCells] = useState('');
  const [rbc, setRbc] = useState('');
  const [hbsag, setHbsag] = useState('Non-Reactive');
  const [vdrl, setVdrl] = useState('Non-Reactive');
  const [hiv, setHiv] = useState('Non-Reactive');
  const [fbs, setFbs] = useState('');
  const [ogtt1, setOgtt1] = useState('');
  const [ogtt2, setOgtt2] = useState('');
  const [ultrasound, setUltrasound] = useState('');
  const [remarks, setRemarks] = useState('');

  // Live anomaly calculation as staff types into form
  const liveEvaluation = useMemo(() => {
    return evaluatePrenatalLabResults({
      hemoglobin: hb,
      hematocrit: hct,
      blood_type: bloodType,
      urinalysis_protein: protein,
      urinalysis_glucose: glucose,
      hbsag_status: hbsag,
      vdrl_rpr_status: vdrl,
      hiv_screening_status: hiv,
      ogtt_fasting: fbs,
      ogtt_1hr: ogtt1,
      ogtt_2hr: ogtt2,
    });
  }, [hb, hct, bloodType, protein, glucose, hbsag, vdrl, hiv, fbs, ogtt1, ogtt2]);

  const latestLab = labResults && labResults.length > 0 ? labResults[0] : null;

  const handleDelete = (id) => {
    if (!window.confirm('Delete this laboratory result? This action cannot be undone.')) return;
    const fd = new FormData();
    fd.append('id', id);
    fd.append('patient_id', patientId);
    startTransition(async () => {
      await deletePrenatalLabResult(fd);
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      const res = await addPrenatalLabResult(fd);
      if (res?.success) {
        setIsModalOpen(false);
        // Reset inputs
        setHb('');
        setHct('');
        setPusCells('');
        setRbc('');
        setFbs('');
        setOgtt1('');
        setOgtt2('');
        setUltrasound('');
        setRemarks('');
      } else {
        alert(res?.error || 'Failed to record lab result.');
      }
    });
  };

  return (
    <Card className="border-none shadow-md overflow-hidden">
      <CardHeader className="border-b bg-gradient-to-r from-gray-50/80 via-white to-rose-50/30 pb-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <CardTitle className="text-xl font-bold flex items-center gap-2 text-gray-900">
              <FlaskConical className="w-5 h-5 text-rose-500" />
              Structured Prenatal Laboratory Panel
            </CardTitle>
            <CardDescription className="text-xs text-gray-500 mt-1">
              Standardized prenatal diagnostic tests: Complete Blood Count, Urinalysis, Serology, and OGTT.
            </CardDescription>
          </div>
          <Button 
            onClick={() => setIsModalOpen(true)}
            className="bg-rose-500 hover:bg-rose-600 text-white font-bold rounded-xl gap-2 shadow-sm shadow-rose-200"
          >
            <Plus className="w-4 h-4" /> Log Lab Results
          </Button>
        </div>
      </CardHeader>

      <CardContent className="p-6 space-y-8">
        
        {/* Quick Clinical Status Cards (Latest Test Snapshot) */}
        {latestLab ? (
          <div>
            <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-rose-500" /> Latest Panel Findings ({new Date(latestLab.test_date).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })})
            </h4>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              {/* Hemoglobin */}
              <div className={`p-3.5 rounded-xl border ${
                latestLab.hemoglobin && latestLab.hemoglobin < 10.5 
                  ? 'bg-red-50/80 border-red-200' 
                  : 'bg-emerald-50/50 border-emerald-100'
              }`}>
                <p className="text-[10px] font-black uppercase tracking-wider text-gray-400">Hemoglobin</p>
                <p className="text-base font-bold text-gray-900 mt-1">
                  {latestLab.hemoglobin ? `${latestLab.hemoglobin} g/dL` : '—'}
                </p>
                {latestLab.hemoglobin && latestLab.hemoglobin < 10.5 && (
                  <span className="inline-block mt-1 text-[10px] font-bold text-red-600 uppercase">
                    Maternal Anemia
                  </span>
                )}
              </div>

              {/* Blood Type */}
              <div className={`p-3.5 rounded-xl border ${
                latestLab.blood_type?.includes('-')
                  ? 'bg-amber-50/80 border-amber-200'
                  : 'bg-gray-50/60 border-gray-100'
              }`}>
                <p className="text-[10px] font-black uppercase tracking-wider text-gray-400">Blood / Rh</p>
                <p className="text-base font-bold text-gray-900 mt-1">
                  {latestLab.blood_type || patientBloodType || '—'}
                </p>
                {latestLab.blood_type?.includes('-') && (
                  <span className="inline-block mt-1 text-[10px] font-bold text-amber-700 uppercase">
                    Rh Negative Risk
                  </span>
                )}
              </div>

              {/* Urine Protein */}
              <div className={`p-3.5 rounded-xl border ${
                ['1+', '2+', '3+', '4+'].includes(latestLab.urinalysis_protein)
                  ? 'bg-red-50/80 border-red-200'
                  : 'bg-gray-50/60 border-gray-100'
              }`}>
                <p className="text-[10px] font-black uppercase tracking-wider text-gray-400">Urine Protein</p>
                <p className="text-base font-bold text-gray-900 mt-1">
                  {latestLab.urinalysis_protein || '—'}
                </p>
                {['1+', '2+', '3+', '4+'].includes(latestLab.urinalysis_protein) && (
                  <span className="inline-block mt-1 text-[10px] font-bold text-red-600 uppercase">
                    Proteinuria
                  </span>
                )}
              </div>

              {/* Hep B */}
              <div className={`p-3.5 rounded-xl border ${
                latestLab.hbsag_status === 'Reactive'
                  ? 'bg-red-50/80 border-red-200'
                  : 'bg-gray-50/60 border-gray-100'
              }`}>
                <p className="text-[10px] font-black uppercase tracking-wider text-gray-400">HBsAg (Hep B)</p>
                <p className="text-base font-bold text-gray-900 mt-1">
                  {latestLab.hbsag_status || 'Pending'}
                </p>
                {latestLab.hbsag_status === 'Reactive' && (
                  <span className="inline-block mt-1 text-[10px] font-bold text-red-600 uppercase">
                    Reactive (HBIG Req)
                  </span>
                )}
              </div>

              {/* Syphilis */}
              <div className={`p-3.5 rounded-xl border ${
                latestLab.vdrl_rpr_status === 'Reactive'
                  ? 'bg-red-50/80 border-red-200'
                  : 'bg-gray-50/60 border-gray-100'
              }`}>
                <p className="text-[10px] font-black uppercase tracking-wider text-gray-400">VDRL / RPR</p>
                <p className="text-base font-bold text-gray-900 mt-1">
                  {latestLab.vdrl_rpr_status || 'Pending'}
                </p>
                {latestLab.vdrl_rpr_status === 'Reactive' && (
                  <span className="inline-block mt-1 text-[10px] font-bold text-red-600 uppercase">
                    Reactive
                  </span>
                )}
              </div>

              {/* OGTT Fasting */}
              <div className={`p-3.5 rounded-xl border ${
                latestLab.ogtt_fasting && latestLab.ogtt_fasting >= 92
                  ? 'bg-amber-50/80 border-amber-200'
                  : 'bg-gray-50/60 border-gray-100'
              }`}>
                <p className="text-[10px] font-black uppercase tracking-wider text-gray-400">FBS / OGTT</p>
                <p className="text-base font-bold text-gray-900 mt-1">
                  {latestLab.ogtt_fasting ? `${latestLab.ogtt_fasting} mg/dL` : '—'}
                </p>
                {latestLab.ogtt_fasting && latestLab.ogtt_fasting >= 92 && (
                  <span className="inline-block mt-1 text-[10px] font-bold text-amber-700 uppercase">
                    GDM Cutoff Met
                  </span>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="py-8 text-center bg-gray-50 rounded-2xl border border-dashed border-gray-200">
            <FlaskConical className="w-8 h-8 text-gray-400 mx-auto mb-2" />
            <p className="text-sm font-semibold text-gray-600">No laboratory panels on file yet</p>
            <p className="text-xs text-gray-400 mt-0.5">Click "Log Lab Results" to record Complete Blood Count, Urinalysis, or Serology.</p>
          </div>
        )}

        {/* Historical Results Timeline */}
        {labResults && labResults.length > 0 && (
          <div className="space-y-4">
            <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest">
              Laboratory History ({labResults.length})
            </h4>

            <div className="divide-y divide-gray-100 border rounded-2xl overflow-hidden bg-white shadow-sm">
              {labResults.map((result) => {
                const evalData = evaluatePrenatalLabResults(result);

                return (
                  <div key={result.id} className="p-5 hover:bg-gray-50/50 transition-colors space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-xs font-bold text-gray-900 font-mono bg-rose-50 text-rose-700 px-2.5 py-1 rounded-md border border-rose-100">
                          {new Date(result.test_date).toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: 'numeric' })}
                        </span>
                        <span className="text-xs text-gray-500 font-medium">
                          {result.laboratory_name || 'Clinic Lab'}
                        </span>
                        {evalData.criticalCount > 0 && (
                          <span className="bg-red-500 text-white text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider flex items-center gap-1 shadow-sm">
                            <AlertCircle className="w-3 h-3" /> Critical Finding
                          </span>
                        )}
                        {evalData.hasAnomalies && evalData.criticalCount === 0 && (
                          <span className="bg-amber-100 text-amber-800 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                            Requires Monitoring
                          </span>
                        )}
                      </div>

                      <Button 
                        type="button" 
                        variant="ghost" 
                        size="sm"
                        disabled={isPending}
                        onClick={() => handleDelete(result.id)}
                        className="h-8 w-8 p-0 text-gray-400 hover:text-red-600 hover:bg-red-50"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>

                    {/* Test Breakdown Grid */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-2 text-xs">
                      <div className="p-2 rounded-lg bg-gray-50">
                        <span className="text-gray-400 font-bold block text-[10px]">Hemoglobin</span>
                        <span className={`font-semibold ${result.hemoglobin && result.hemoglobin < 10.5 ? 'text-red-600' : 'text-gray-800'}`}>
                          {result.hemoglobin ? `${result.hemoglobin} g/dL` : '—'}
                        </span>
                      </div>
                      <div className="p-2 rounded-lg bg-gray-50">
                        <span className="text-gray-400 font-bold block text-[10px]">Hematocrit</span>
                        <span className="font-semibold text-gray-800">
                          {result.hematocrit ? `${result.hematocrit}%` : '—'}
                        </span>
                      </div>
                      <div className="p-2 rounded-lg bg-gray-50">
                        <span className="text-gray-400 font-bold block text-[10px]">Blood Type</span>
                        <span className="font-semibold text-gray-800">
                          {result.blood_type || '—'}
                        </span>
                      </div>
                      <div className="p-2 rounded-lg bg-gray-50">
                        <span className="text-gray-400 font-bold block text-[10px]">Urine Protein</span>
                        <span className={`font-semibold ${['1+', '2+', '3+', '4+'].includes(result.urinalysis_protein) ? 'text-red-600' : 'text-gray-800'}`}>
                          {result.urinalysis_protein || '—'}
                        </span>
                      </div>
                      <div className="p-2 rounded-lg bg-gray-50">
                        <span className="text-gray-400 font-bold block text-[10px]">HBsAg</span>
                        <span className={`font-semibold ${result.hbsag_status === 'Reactive' ? 'text-red-600 font-bold' : 'text-gray-800'}`}>
                          {result.hbsag_status || '—'}
                        </span>
                      </div>
                      <div className="p-2 rounded-lg bg-gray-50">
                        <span className="text-gray-400 font-bold block text-[10px]">VDRL/RPR</span>
                        <span className={`font-semibold ${result.vdrl_rpr_status === 'Reactive' ? 'text-red-600 font-bold' : 'text-gray-800'}`}>
                          {result.vdrl_rpr_status || '—'}
                        </span>
                      </div>
                    </div>

                    {/* Anomalies List */}
                    {evalData.anomalies.length > 0 && (
                      <div className="p-3 rounded-xl bg-amber-50/70 border border-amber-200/80 text-xs text-amber-900 space-y-1">
                        <span className="font-bold block text-[10px] uppercase tracking-wider text-amber-700">Clinical Attention Required:</span>
                        <ul className="list-disc list-inside space-y-0.5">
                          {evalData.anomalies.map((a, i) => (
                            <li key={i}>
                              <strong className="text-amber-950">{a.title}:</strong> {a.message}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Ultrasound Summary */}
                    {result.ultrasound_summary && (
                      <div className="p-3 rounded-xl bg-purple-50/50 border border-purple-100 text-xs text-purple-900">
                        <span className="font-bold block text-[10px] uppercase tracking-wider text-purple-700 mb-0.5">Ultrasound Summary</span>
                        <p className="text-gray-700">{result.ultrasound_summary}</p>
                      </div>
                    )}

                    {result.remarks && (
                      <p className="text-xs text-gray-500 italic">
                        <strong>Remarks:</strong> {result.remarks}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </CardContent>

      {/* ── MODAL: LOG NEW PRENATAL LAB RESULTS ── */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto border border-gray-100 p-6 sm:p-8 space-y-6">
            
            <div className="flex items-center justify-between pb-4 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-rose-500 text-white flex items-center justify-center shadow-md shadow-rose-200">
                  <FlaskConical className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900">Record Prenatal Laboratory Results</h3>
                  <p className="text-xs text-gray-500">Structured data with automated reference range checks.</p>
                </div>
              </div>
              <button 
                type="button" 
                onClick={() => setIsModalOpen(false)}
                className="text-gray-400 hover:text-gray-700 text-sm font-bold p-2"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              <input type="hidden" name="patient_id" value={patientId} />
              {activeEpisodeId && (
                <input type="hidden" name="maternal_episode_id" value={activeEpisodeId} />
              )}

              {/* Row 1: Test Date & Lab Name */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-gray-600 uppercase tracking-wider">Test Date *</Label>
                  <Input 
                    name="test_date" 
                    type="date" 
                    value={testDate}
                    onChange={(e) => setTestDate(e.target.value)}
                    required 
                    className="h-10" 
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-gray-600 uppercase tracking-wider">Laboratory Facility</Label>
                  <Input 
                    name="laboratory_name" 
                    value={labName}
                    onChange={(e) => setLabName(e.target.value)}
                    className="h-10" 
                  />
                </div>
              </div>

              {/* Section 1: Complete Blood Count (CBC) */}
              <div className="space-y-3">
                <h4 className="text-xs font-black text-rose-600 uppercase tracking-widest border-b pb-1">
                  1. Complete Blood Count (CBC) & Blood Typing
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs font-bold text-gray-600">Hemoglobin (g/dL)</Label>
                    <Input 
                      name="hemoglobin" 
                      type="number" 
                      step="0.1" 
                      value={hb}
                      onChange={(e) => setHb(e.target.value)}
                      placeholder="e.g. 11.5" 
                      className="h-9" 
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs font-bold text-gray-600">Hematocrit (%)</Label>
                    <Input 
                      name="hematocrit" 
                      type="number" 
                      step="0.1" 
                      value={hct}
                      onChange={(e) => setHct(e.target.value)}
                      placeholder="e.g. 35.0" 
                      className="h-9" 
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs font-bold text-gray-600">Blood Type & Rh</Label>
                    <select
                      name="blood_type"
                      value={bloodType}
                      onChange={(e) => setBloodType(e.target.value)}
                      className="w-full h-9 rounded-md border border-gray-200 bg-white px-3 text-sm focus:ring-1 focus:ring-rose-500 outline-none"
                    >
                      <option value="">Select blood type...</option>
                      {['O+', 'A+', 'B+', 'AB+', 'O-', 'A-', 'B-', 'AB-'].map(bt => (
                        <option key={bt} value={bt}>{bt}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Section 2: Routine Urinalysis */}
              <div className="space-y-3">
                <h4 className="text-xs font-black text-rose-600 uppercase tracking-widest border-b pb-1">
                  2. Urinalysis Panel (Proteinuria & Infection Screen)
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs font-bold text-gray-600">Urine Protein</Label>
                    <select
                      name="urinalysis_protein"
                      value={protein}
                      onChange={(e) => setProtein(e.target.value)}
                      className="w-full h-9 rounded-md border border-gray-200 bg-white px-2.5 text-xs font-semibold focus:ring-1 focus:ring-rose-500 outline-none"
                    >
                      {['Negative', 'Trace', '1+', '2+', '3+', '4+'].map(p => (
                        <option key={p} value={p}>{p}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs font-bold text-gray-600">Urine Glucose</Label>
                    <select
                      name="urinalysis_glucose"
                      value={glucose}
                      onChange={(e) => setGlucose(e.target.value)}
                      className="w-full h-9 rounded-md border border-gray-200 bg-white px-2.5 text-xs font-semibold focus:ring-1 focus:ring-rose-500 outline-none"
                    >
                      {['Negative', 'Trace', '1+', '2+', '3+', '4+'].map(g => (
                        <option key={g} value={g}>{g}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs font-bold text-gray-600">Pus Cells (/hpf)</Label>
                    <Input 
                      name="urinalysis_pus_cells" 
                      value={pusCells}
                      onChange={(e) => setPusCells(e.target.value)}
                      placeholder="e.g. 0-2" 
                      className="h-9 text-xs" 
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs font-bold text-gray-600">RBC (/hpf)</Label>
                    <Input 
                      name="urinalysis_rbc" 
                      value={rbc}
                      onChange={(e) => setRbc(e.target.value)}
                      placeholder="e.g. 0-1" 
                      className="h-9 text-xs" 
                    />
                  </div>
                </div>
              </div>

              {/* Section 3: Infectious Disease Serology */}
              <div className="space-y-3">
                <h4 className="text-xs font-black text-rose-600 uppercase tracking-widest border-b pb-1">
                  3. Serology & Infectious Disease Screening
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs font-bold text-gray-600">HBsAg (Hepatitis B)</Label>
                    <select
                      name="hbsag_status"
                      value={hbsag}
                      onChange={(e) => setHbsag(e.target.value)}
                      className="w-full h-9 rounded-md border border-gray-200 bg-white px-3 text-xs font-semibold focus:ring-1 focus:ring-rose-500 outline-none"
                    >
                      <option value="Non-Reactive">Non-Reactive</option>
                      <option value="Reactive">Reactive (Positive)</option>
                      <option value="Pending">Pending</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs font-bold text-gray-600">VDRL / RPR (Syphilis)</Label>
                    <select
                      name="vdrl_rpr_status"
                      value={vdrl}
                      onChange={(e) => setVdrl(e.target.value)}
                      className="w-full h-9 rounded-md border border-gray-200 bg-white px-3 text-xs font-semibold focus:ring-1 focus:ring-rose-500 outline-none"
                    >
                      <option value="Non-Reactive">Non-Reactive</option>
                      <option value="Reactive">Reactive (Positive)</option>
                      <option value="Pending">Pending</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs font-bold text-gray-600">HIV Screening</Label>
                    <select
                      name="hiv_screening_status"
                      value={hiv}
                      onChange={(e) => setHiv(e.target.value)}
                      className="w-full h-9 rounded-md border border-gray-200 bg-white px-3 text-xs font-semibold focus:ring-1 focus:ring-rose-500 outline-none"
                    >
                      <option value="Non-Reactive">Non-Reactive</option>
                      <option value="Reactive">Reactive</option>
                      <option value="Pending">Pending</option>
                      <option value="Declined">Declined</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Section 4: 75g OGTT (Gestational Diabetes) */}
              <div className="space-y-3">
                <h4 className="text-xs font-black text-rose-600 uppercase tracking-widest border-b pb-1">
                  4. 75g Oral Glucose Tolerance Test (OGTT - Gestational Diabetes)
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs font-bold text-gray-600">Fasting (FBS) mg/dL</Label>
                    <Input 
                      name="ogtt_fasting" 
                      type="number" 
                      step="0.1" 
                      value={fbs}
                      onChange={(e) => setFbs(e.target.value)}
                      placeholder="Cutoff ≥ 92" 
                      className="h-9 text-xs" 
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs font-bold text-gray-600">1-Hour Blood Sugar</Label>
                    <Input 
                      name="ogtt_1hr" 
                      type="number" 
                      step="0.1" 
                      value={ogtt1}
                      onChange={(e) => setOgtt1(e.target.value)}
                      placeholder="Cutoff ≥ 180" 
                      className="h-9 text-xs" 
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs font-bold text-gray-600">2-Hour Blood Sugar</Label>
                    <Input 
                      name="ogtt_2hr" 
                      type="number" 
                      step="0.1" 
                      value={ogtt2}
                      onChange={(e) => setOgtt2(e.target.value)}
                      placeholder="Cutoff ≥ 153" 
                      className="h-9 text-xs" 
                    />
                  </div>
                </div>
              </div>

              {/* Section 5: Ultrasound & Remarks */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-gray-600 uppercase tracking-wider">Ultrasound Summary</Label>
                  <textarea
                    name="ultrasound_summary"
                    rows={2}
                    value={ultrasound}
                    onChange={(e) => setUltrasound(e.target.value)}
                    placeholder="Biometry, AFI, single live intrauterine fetus, cephalic, grade 2 placenta..."
                    className="w-full rounded-md border border-gray-200 p-2 text-xs focus:ring-1 focus:ring-rose-500 outline-none"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-gray-600 uppercase tracking-wider">Clinical Remarks / Orders</Label>
                  <textarea
                    name="remarks"
                    rows={2}
                    value={remarks}
                    onChange={(e) => setRemarks(e.target.value)}
                    placeholder="Ferrous sulfate prescribed, repeat test in 4 weeks..."
                    className="w-full rounded-md border border-gray-200 p-2 text-xs focus:ring-1 focus:ring-rose-500 outline-none"
                  />
                </div>
              </div>

              {/* Live Anomaly Detection Alert in Modal */}
              {liveEvaluation.hasAnomalies && (
                <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-300 text-xs text-amber-950 space-y-1.5">
                  <div className="flex items-center gap-1.5 font-bold text-amber-900">
                    <AlertTriangle className="w-4 h-4 text-amber-600" />
                    <span>Clinical Validation Warnings Detected:</span>
                  </div>
                  <ul className="list-disc list-inside space-y-1 pl-1">
                    {liveEvaluation.anomalies.map((ano, i) => (
                      <li key={i}>
                        <strong className="text-amber-950">{ano.title}:</strong> {ano.message}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-gray-100">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setIsModalOpen(false)}
                  className="rounded-xl px-5"
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  disabled={isPending}
                  className="bg-rose-500 hover:bg-rose-600 text-white rounded-xl px-7 font-bold shadow-md shadow-rose-200"
                >
                  {isPending ? 'Saving Record...' : 'Save Laboratory Results'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

    </Card>
  );
}
