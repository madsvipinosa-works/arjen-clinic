'use client';

import React, { useState, useTransition, useEffect } from 'react';
import { 
  Baby, Heart, CalendarDays, CheckCircle2, ShieldCheck, 
  AlertTriangle, Sparkles, Syringe, Eye, Award, Pencil, 
  Plus, ChevronDown, ChevronUp, Clock, Activity, FileText, Check, X, ArrowLeft
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { checkDOHNewbornProtocols } from '@/lib/clinical-protocols';
import { getClinicTodayDateString } from '@/lib/utils';
import { createPostpartumRecord, updatePostpartumRecord } from '@/app/actions';

export function PostpartumTabContent({
  patient,
  activeEpisode = null,
  postpartumRecord = null,
  postpartumRecords = [],
}) {
  const [selectedRecordId, setSelectedRecordId] = useState(postpartumRecord?.id || null);
  const [isEditing, setIsEditing] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [formError, setFormError] = useState(null);
  const [formSuccess, setFormSuccess] = useState(null);

  // Active record to display in the Bento grid
  const currentRecord = postpartumRecords.find((r) => r.id === selectedRecordId) || postpartumRecord || null;
  const isUpdate = !!currentRecord;
  const babyVitals = currentRecord?.baby_vitals || {};

  // Controlled form states for instant DOH protocol macro fill
  const [deliveryDate, setDeliveryDate] = useState(currentRecord?.delivery_date || getClinicTodayDateString());
  const [deliveryType, setDeliveryType] = useState(currentRecord?.delivery_type || 'Vaginal');
  const [feedingMethod, setFeedingMethod] = useState(currentRecord?.feeding_method || 'Breastfeeding');
  const [skinToSkin, setSkinToSkin] = useState(currentRecord?.skin_to_skin_initiated ?? true);
  const [cordCare, setCordCare] = useState(currentRecord?.cord_care_done ?? true);
  const [earlyBf, setEarlyBf] = useState(currentRecord?.early_breastfeeding_initiated ?? true);
  const [vitK, setVitK] = useState(currentRecord?.vit_k_given ?? false);
  const [eyeProp, setEyeProp] = useState(currentRecord?.eye_prophylaxis_given ?? false);
  const [hepb, setHepb] = useState(currentRecord?.hepb_given ?? false);
  const [hepbDate, setHepbDate] = useState(currentRecord?.hepb_date || '');
  const [bcg, setBcg] = useState(currentRecord?.bcg_given ?? false);
  const [bcgDate, setBcgDate] = useState(currentRecord?.bcg_date || '');
  const [weightKg, setWeightKg] = useState(babyVitals.weight_kg ? String(babyVitals.weight_kg) : '');
  const [weightGrams, setWeightGrams] = useState(babyVitals.weight_kg ? String(Math.round(babyVitals.weight_kg * 1000)) : '');
  const [nbsStatus, setNbsStatus] = useState(currentRecord?.nbs_status || 'Pending');
  const [hearingStatus, setHearingStatus] = useState(currentRecord?.hearing_screening_status || 'Pending');

  // Synchronize state when selected delivery record changes
  useEffect(() => {
    if (currentRecord) {
      setDeliveryDate(currentRecord.delivery_date || getClinicTodayDateString());
      setDeliveryType(currentRecord.delivery_type || 'Vaginal');
      setFeedingMethod(currentRecord.feeding_method || 'Breastfeeding');
      setSkinToSkin(currentRecord.skin_to_skin_initiated ?? true);
      setCordCare(currentRecord.cord_care_done ?? true);
      setEarlyBf(currentRecord.early_breastfeeding_initiated ?? true);
      setVitK(currentRecord.vit_k_given ?? false);
      setEyeProp(currentRecord.eye_prophylaxis_given ?? false);
      setHepb(currentRecord.hepb_given ?? false);
      setHepbDate(currentRecord.hepb_date || '');
      setBcg(currentRecord.bcg_given ?? false);
      setBcgDate(currentRecord.bcg_date || '');
      const wKg = babyVitals.weight_kg ? String(babyVitals.weight_kg) : '';
      setWeightKg(wKg);
      setWeightGrams(wKg ? String(Math.round(parseFloat(wKg) * 1000)) : '');
      setNbsStatus(currentRecord.nbs_status || 'Pending');
      setHearingStatus(currentRecord.hearing_screening_status || 'Pending');
    } else {
      setDeliveryDate(getClinicTodayDateString());
      setDeliveryType('Vaginal');
      setFeedingMethod('Breastfeeding');
      setSkinToSkin(true);
      setCordCare(true);
      setEarlyBf(true);
      setVitK(false);
      setEyeProp(false);
      setHepb(false);
      setHepbDate('');
      setBcg(false);
      setBcgDate('');
      setWeightKg('');
      setWeightGrams('');
      setNbsStatus('Pending');
      setHearingStatus('Pending');
    }
  }, [currentRecord]);

  // Macro: 1-Click Standard DOH BEmONC & EINC (Unang Yakap) Protocols
  const handleApplyStandardEINCProtocols = () => {
    const today = getClinicTodayDateString();
    setSkinToSkin(true);
    setCordCare(true);
    setEarlyBf(true);
    setVitK(true);
    setEyeProp(true);
    setHepb(true);
    setHepbDate(today);
    setBcg(true);
    setBcgDate(today);
    setFeedingMethod('Breastfeeding');
    setHearingStatus('Passed');
    setNbsStatus('Pending');
  };

  // Calculate DOH Compliance Metrics
  const compliance = checkDOHNewbornProtocols(currentRecord || {});

  // Handle form submission with useTransition
  const handleSubmit = (e) => {
    e.preventDefault();
    setFormError(null);
    setFormSuccess(null);

    const formData = new FormData(e.currentTarget);
    const action = isUpdate ? updatePostpartumRecord : createPostpartumRecord;

    startTransition(async () => {
      try {
        const res = await action(formData);
        if (res && res.success === false) {
          setFormError(res.error || 'Failed to save delivery and newborn record.');
        } else {
          setFormSuccess('Postpartum & Newborn Care record saved successfully.');
          setIsEditing(false);
        }
      } catch (err) {
        setFormError(err.message || 'An unexpected error occurred while saving.');
      }
    });
  };

  return (
    <div className="space-y-6">
      {/* ── Top Header Bar ────────────────────────────────────────── */}
      <div className="bg-white/95 backdrop-blur-md border border-gray-100 rounded-3xl p-5 md:p-6 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-purple-500 via-rose-500 to-pink-500 text-white flex items-center justify-center shadow-md shadow-rose-500/20 shrink-0">
            <Baby className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h2 className="text-lg md:text-xl font-black text-gray-900 tracking-tight">
                Postpartum & DOH Newborn Care (EINC)
              </h2>
              {currentRecord ? (
                compliance.isFullyCompliant ? (
                  <span className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-[11px] font-black uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-200">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                    </span>
                    DOH Compliant (100%)
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-[11px] font-black uppercase tracking-wider bg-amber-50 text-amber-800 border border-amber-200">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                    {compliance.percentage}% Protocols Met
                  </span>
                )
              ) : (
                <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-gray-100 text-gray-500 border border-gray-200">
                  No Delivery Record Yet
                </span>
              )}
            </div>
            <p className="text-xs text-gray-500 font-medium mt-0.5">
              Philippine DOH Administrative Order No. 2009-0025 (Unang Yakap) & PhilHealth Newborn Care Package.
            </p>
          </div>
        </div>

        {/* Action Toggle Button */}
        <div className="flex items-center gap-2 self-start sm:self-center">
          {isEditing ? (
            <Button
              type="button"
              onClick={() => setIsEditing(false)}
              variant="outline"
              className="rounded-2xl font-bold text-xs h-10 px-5 gap-2 border-gray-200 text-gray-700 hover:bg-gray-100 active:scale-[0.98] transition-all"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Summary</span>
            </Button>
          ) : currentRecord ? (
            <Button
              type="button"
              onClick={() => setIsEditing(true)}
              className="bg-gradient-to-r from-rose-500 to-rose-600 hover:from-rose-600 hover:to-rose-700 text-white font-bold rounded-2xl text-xs h-10 px-5 gap-2 shadow-sm shadow-rose-500/20 active:scale-[0.98] transition-all"
            >
              <Pencil className="w-3.5 h-3.5" />
              <span>Edit Delivery & Newborn Record</span>
            </Button>
          ) : (
            <Button
              type="button"
              onClick={() => setIsEditing(true)}
              className="bg-gradient-to-r from-rose-500 to-rose-600 hover:from-rose-600 hover:to-rose-700 text-white font-bold rounded-2xl text-xs h-10 px-5 gap-2 shadow-sm shadow-rose-500/20 active:scale-[0.98] transition-all"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Record Delivery & Newborn Care</span>
            </Button>
          )}
        </div>
      </div>

      {/* ── Multiple Deliveries Switcher (if patient has > 1 deliveries) ── */}
      {!isEditing && postpartumRecords.length > 1 && (
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          <span className="text-xs font-bold text-gray-400 uppercase tracking-widest pl-1">
            Deliveries:
          </span>
          {postpartumRecords.map((rec, idx) => (
            <button
              key={rec.id}
              type="button"
              onClick={() => {
                setSelectedRecordId(rec.id);
                setIsEditing(false);
              }}
              className={`px-3.5 py-1 rounded-full text-xs font-bold transition-all ${
                selectedRecordId === rec.id
                  ? 'bg-purple-600 text-white shadow-sm'
                  : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
              }`}
            >
              Delivery #{postpartumRecords.length - idx} • {rec.delivery_date && !isNaN(new Date(rec.delivery_date).getTime()) ? new Date(rec.delivery_date).toLocaleDateString('en-PH') : 'Date unset'}
            </button>
          ))}
        </div>
      )}

      {/* ── FEEDBACK ALERTS ────────────────────────────────────────── */}
      {formSuccess && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 flex items-center justify-between text-emerald-800 text-xs font-bold">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{formSuccess}</span>
          </div>
          <button type="button" onClick={() => setFormSuccess(null)} className="text-emerald-600 hover:text-emerald-800">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {formError && (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-4 flex items-center justify-between text-red-800 text-xs font-bold">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
            <span>{formError}</span>
          </div>
          <button type="button" onClick={() => setFormError(null)} className="text-red-600 hover:text-red-800">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* ── MODE 1: DEDICATED IN-PAGE CLINICAL WORKSPACE ── */}
      {isEditing ? (
        <div className="space-y-6 animate-in fade-in slide-in-from-top-2 duration-200">
          {/* Workspace Title & Quick Action Bar */}
          <div className="bg-gradient-to-r from-purple-500/10 via-rose-500/10 to-pink-500/10 border border-rose-200/80 rounded-3xl p-5 md:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm">
            <div className="flex items-center gap-3.5">
              <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-rose-500 to-pink-500 text-white flex items-center justify-center shadow-md shadow-rose-500/20 shrink-0">
                <Pencil className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-base md:text-lg font-black text-gray-900 tracking-tight">
                    {isUpdate ? 'Edit Delivery & Newborn Record' : 'Record New Delivery & Newborn Care'}
                  </h3>
                  <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-rose-100 text-rose-700 border border-rose-200">
                    PhilHealth MCP / NCP
                  </span>
                </div>
                <p className="text-xs text-gray-500 mt-0.5">
                  Fulfills PhilHealth Maternal & Newborn Care Package statutory data requirements & DOH AO 2009-0025.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 self-start sm:self-auto">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleApplyStandardEINCProtocols}
                className="rounded-2xl border-emerald-200 text-emerald-700 bg-emerald-50/80 hover:bg-emerald-100 text-xs font-bold gap-1.5 h-10 px-4 cursor-pointer shadow-xs active:scale-[0.98] transition-all"
              >
                <Sparkles className="w-4 h-4 text-emerald-600" />
                <span>⚡ Auto-fill Standard DOH Protocols</span>
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsEditing(false)}
                className="rounded-2xl border-gray-200 text-gray-700 bg-white hover:bg-gray-100 text-xs font-bold gap-1.5 h-10 px-4 cursor-pointer active:scale-[0.98] transition-all"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Cancel</span>
              </Button>
            </div>
          </div>

          <form id="postpartum-form" onSubmit={handleSubmit} className="space-y-6">
            {/* Hidden inputs */}
            <input type="hidden" name="patient_id" value={patient.id} />
            {activeEpisode?.id && <input type="hidden" name="maternal_episode_id" value={activeEpisode.id} />}
            {isUpdate && <input type="hidden" name="id" value={currentRecord.id} />}

            {/* ── CARD 1: Delivery Modality & Feeding ── */}
            <div className="bg-white/95 backdrop-blur-md border border-gray-200/80 rounded-3xl p-6 md:p-7 shadow-sm space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-gray-100">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
                    <CalendarDays className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-sm font-black text-gray-900 tracking-tight">1. Delivery Modality & Infant Feeding</h4>
                    <p className="text-xs text-gray-400">Date, delivery outcome, feeding choice, and postpartum visit schedule</p>
                  </div>
                </div>
                <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-gray-100 text-gray-600 border border-gray-200">
                  Required Fields
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                <div className="space-y-1.5">
                  <Label htmlFor="delivery_date" className="text-xs font-bold text-gray-700 flex items-center gap-1">
                    Delivery Date *
                  </Label>
                  <Input
                    id="delivery_date"
                    name="delivery_date"
                    type="date"
                    required
                    value={deliveryDate}
                    onChange={(e) => setDeliveryDate(e.target.value)}
                    className="h-11 rounded-2xl border-gray-200 focus-visible:ring-rose-500 bg-white"
                  />
                  <p className="text-[10px] text-gray-400">Actual date of child delivery</p>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="delivery_type" className="text-xs font-bold text-gray-700">Delivery Type *</Label>
                  <select
                    id="delivery_type"
                    name="delivery_type"
                    value={deliveryType}
                    onChange={(e) => setDeliveryType(e.target.value)}
                    className="flex h-11 w-full rounded-2xl border border-gray-200 bg-white px-3.5 py-2 text-sm shadow-xs focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 outline-none"
                  >
                    <option value="Vaginal">Spontaneous Vaginal Delivery (NSVD)</option>
                    <option value="Cesarean">Cesarean Section (Hospital Transfer)</option>
                    <option value="VBAC">Vaginal Birth After Cesarean (VBAC)</option>
                  </select>
                  <p className="text-[10px] text-gray-400">Clinical birth modality</p>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="feeding_method" className="text-xs font-bold text-gray-700">Feeding Method *</Label>
                  <select
                    id="feeding_method"
                    name="feeding_method"
                    value={feedingMethod}
                    onChange={(e) => setFeedingMethod(e.target.value)}
                    className="flex h-11 w-full rounded-2xl border border-gray-200 bg-white px-3.5 py-2 text-sm shadow-xs focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 outline-none"
                  >
                    <option value="Breastfeeding">Exclusive Breastfeeding (EBF) 🤱</option>
                    <option value="Formula">Formula Feeding</option>
                    <option value="Mixed">Mixed Feeding</option>
                  </select>
                  <p className="text-[10px] text-gray-400">Infant nutrition mode</p>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="follow_up_date" className="text-xs font-bold text-gray-700">Follow-up Date</Label>
                  <Input
                    id="follow_up_date"
                    name="follow_up_date"
                    type="date"
                    defaultValue={currentRecord?.follow_up_date ?? ''}
                    className="h-11 rounded-2xl border-gray-200 focus-visible:ring-rose-500 bg-white"
                  />
                  <p className="text-[10px] text-gray-400">Target postpartum checkup</p>
                </div>
              </div>
            </div>

            {/* ── CARD 2: DOH Essential Intrapartum and Newborn Care (Unang Yakap) ── */}
            <div className="bg-white/95 backdrop-blur-md border border-rose-100 rounded-3xl p-6 md:p-7 shadow-sm space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-rose-100 gap-2">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                    <ShieldCheck className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-sm font-black text-gray-900 tracking-tight">
                      2. DOH Essential Intrapartum and Newborn Care (Unang Yakap)
                    </h4>
                    <p className="text-xs text-gray-400">Mandatory time-bound standard of care under DOH AO 2009-0025</p>
                  </div>
                </div>
                <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 self-start sm:self-auto">
                  DOH AO 2009-0025 Protocol
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <label className={`flex items-start gap-3.5 p-4 rounded-2xl border cursor-pointer transition-all ${
                  skinToSkin 
                    ? 'bg-rose-50/50 border-rose-200 ring-1 ring-rose-200 shadow-2xs' 
                    : 'bg-gray-50/60 border-gray-200 hover:border-gray-300'
                }`}>
                  <input 
                    type="checkbox"
                    name="skin_to_skin_initiated"
                    value="true"
                    checked={skinToSkin}
                    onChange={(e) => setSkinToSkin(e.target.checked)}
                    className="w-5 h-5 mt-0.5 accent-rose-600 rounded text-rose-600"
                  />
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-black text-gray-900">Immediate Skin-to-Skin</span>
                      <span className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.2 rounded bg-rose-100 text-rose-700">Step 1</span>
                    </div>
                    <p className="text-[11px] text-gray-500 leading-relaxed">
                      Uninterrupted prone contact on maternal chest ≥ 90 mins. Maintains neonatal thermal stability and prevents hypothermia.
                    </p>
                  </div>
                </label>

                <label className={`flex items-start gap-3.5 p-4 rounded-2xl border cursor-pointer transition-all ${
                  cordCare 
                    ? 'bg-rose-50/50 border-rose-200 ring-1 ring-rose-200 shadow-2xs' 
                    : 'bg-gray-50/60 border-gray-200 hover:border-gray-300'
                }`}>
                  <input 
                    type="checkbox"
                    name="cord_care_done"
                    value="true"
                    checked={cordCare}
                    onChange={(e) => setCordCare(e.target.checked)}
                    className="w-5 h-5 mt-0.5 accent-rose-600 rounded text-rose-600"
                  />
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-black text-gray-900">Delayed Cord Clamping</span>
                      <span className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.2 rounded bg-rose-100 text-rose-700">Step 2</span>
                    </div>
                    <p className="text-[11px] text-gray-500 leading-relaxed">
                      Cord clamped at 1–3 mins or pulsation ceases. Prevents neonatal anemia and boosts initial blood volume.
                    </p>
                  </div>
                </label>

                <label className={`flex items-start gap-3.5 p-4 rounded-2xl border cursor-pointer transition-all ${
                  earlyBf 
                    ? 'bg-rose-50/50 border-rose-200 ring-1 ring-rose-200 shadow-2xs' 
                    : 'bg-gray-50/60 border-gray-200 hover:border-gray-300'
                }`}>
                  <input 
                    type="checkbox"
                    name="early_breastfeeding_initiated"
                    value="true"
                    checked={earlyBf}
                    onChange={(e) => setEarlyBf(e.target.checked)}
                    className="w-5 h-5 mt-0.5 accent-rose-600 rounded text-rose-600"
                  />
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-black text-gray-900">Early Breastfeeding</span>
                      <span className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.2 rounded bg-rose-100 text-rose-700">Step 3</span>
                    </div>
                    <p className="text-[11px] text-gray-500 leading-relaxed">
                      Initiated within first golden hour of life. Stimulates colostrum transfer and uterine contraction.
                    </p>
                  </div>
                </label>
              </div>
            </div>

            {/* ── CARD 3: Baby Anthropometrics & Apgar Score ── */}
            <div className="bg-white/95 backdrop-blur-md border border-gray-200/80 rounded-3xl p-6 md:p-7 shadow-sm space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-gray-100">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
                    <Baby className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-sm font-black text-gray-900 tracking-tight">3. Baby Anthropometrics & Apgar Score</h4>
                    <p className="text-xs text-gray-400">Neonatal birth physical metrics and transitional scores</p>
                  </div>
                </div>
                <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-purple-50 text-purple-700 border border-purple-200">
                  Neonatal Biometry
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                {/* Dual Grams / Kg Weight */}
                <div className="space-y-1.5 p-3.5 rounded-2xl bg-gray-50/70 border border-gray-200/70">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="baby_weight_kg" className="text-xs font-bold text-gray-700">Birth Weight *</Label>
                    <span className="text-[10px] font-black uppercase tracking-wider text-rose-600 bg-rose-50 px-2 py-0.5 rounded-full">
                      {weightGrams ? `${weightGrams} g` : 'Scale Input'}
                    </span>
                  </div>
                  <div className="relative">
                    <Input
                      id="baby_weight_kg"
                      name="baby_weight_kg"
                      type="number"
                      step="0.001"
                      min="0.5"
                      max="9.999"
                      value={weightKg}
                      onChange={(e) => {
                        setWeightKg(e.target.value);
                        const val = parseFloat(e.target.value);
                        setWeightGrams(!isNaN(val) ? String(Math.round(val * 1000)) : '');
                      }}
                      placeholder="e.g. 3.250"
                      className="h-10 rounded-xl pr-10 font-bold bg-white"
                      required
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-gray-400 pointer-events-none">
                      kg
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 pt-1">
                    <span className="text-[10px] text-gray-400 font-medium">Or in grams:</span>
                    <input
                      type="number"
                      placeholder="e.g. 3200"
                      value={weightGrams}
                      onChange={(e) => {
                        const g = e.target.value;
                        setWeightGrams(g);
                        const numG = parseFloat(g);
                        if (!isNaN(numG) && numG > 0) {
                          setWeightKg((numG / 1000).toFixed(3));
                        } else {
                          setWeightKg('');
                        }
                      }}
                      className="h-7 w-24 text-xs rounded-lg border border-gray-200 px-2 bg-white font-mono font-bold"
                    />
                    <span className="text-[10px] text-gray-400 font-medium">g</span>
                  </div>
                </div>

                <div className="space-y-1.5 p-3.5 rounded-2xl bg-gray-50/70 border border-gray-200/70">
                  <Label htmlFor="baby_length_cm" className="text-xs font-bold text-gray-700">Birth Length (cm)</Label>
                  <div className="relative">
                    <Input
                      id="baby_length_cm"
                      name="baby_length_cm"
                      type="number"
                      step="0.1"
                      min="15"
                      max="80"
                      maxLength={4}
                      placeholder="e.g. 50.0"
                      defaultValue={babyVitals.length_cm ?? ''}
                      className="h-10 rounded-xl pr-10 font-bold bg-white"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-gray-400 pointer-events-none">
                      cm
                    </span>
                  </div>
                  <p className="text-[10px] text-gray-400">Normal range: 45–55 cm</p>
                </div>

                <div className="space-y-1.5 p-3.5 rounded-2xl bg-gray-50/70 border border-gray-200/70">
                  <Label htmlFor="baby_apgar_score" className="text-xs font-bold text-gray-700">Apgar Score (1m / 5m)</Label>
                  <Input
                    id="baby_apgar_score"
                    name="baby_apgar_score"
                    type="text"
                    maxLength={7}
                    placeholder="e.g. 9/10"
                    defaultValue={babyVitals.apgar_score ?? ''}
                    className="h-10 rounded-xl font-bold bg-white"
                  />
                  <p className="text-[10px] text-gray-400">Score ≥ 7: Reassuring transition</p>
                </div>

                <div className="space-y-1.5 p-3.5 rounded-2xl bg-gray-50/70 border border-gray-200/70">
                  <Label htmlFor="baby_gender" className="text-xs font-bold text-gray-700">Infant Sex *</Label>
                  <select
                    id="baby_gender"
                    name="baby_gender"
                    defaultValue={babyVitals.gender ?? 'Female'}
                    className="flex h-10 w-full rounded-xl border border-gray-200 bg-white px-3 py-1 text-sm shadow-xs focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 outline-none font-bold"
                  >
                    <option value="Female">♀ Female</option>
                    <option value="Male">♂ Male</option>
                    <option value="Ambiguous">Ambiguous</option>
                  </select>
                  <p className="text-[10px] text-gray-400">Documented neonatal biological sex</p>
                </div>
              </div>
            </div>

            {/* ── CARD 4: Newborn Prophylaxis & PhilHealth NCP Screening ── */}
            <div className="bg-white/95 backdrop-blur-md border border-gray-200/80 rounded-3xl p-6 md:p-7 shadow-sm space-y-6">
              <div className="flex items-center justify-between pb-3 border-b border-gray-100">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                    <Syringe className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-sm font-black text-gray-900 tracking-tight">
                      4. Newborn Prophylaxis & PhilHealth NCP Screening
                    </h4>
                    <p className="text-xs text-gray-400">Statutory prophylaxis, immunizations, and diagnostic panels</p>
                  </div>
                </div>
                <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
                  PhilHealth NCP Package
                </span>
              </div>

              {/* Part A: Prophylaxis & Vaccines */}
              <div className="space-y-3">
                <p className="text-xs font-black uppercase tracking-wider text-gray-500">
                  A. Prophylaxis & Initial Immunizations
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Vit K */}
                  <label className="flex items-start gap-3.5 p-4 bg-gray-50/70 rounded-2xl border border-gray-200 cursor-pointer hover:bg-rose-50/30 hover:border-rose-200 transition-all">
                    <input 
                      type="checkbox"
                      name="vit_k_given"
                      value="true"
                      checked={vitK}
                      onChange={(e) => setVitK(e.target.checked)}
                      className="w-5 h-5 mt-0.5 accent-rose-600 rounded text-rose-600"
                    />
                    <div className="space-y-0.5">
                      <span className="text-xs font-bold text-gray-900 block">Vitamin K Prophylaxis (1 mg IM)</span>
                      <span className="text-[11px] text-gray-500">Injected into anterolateral thigh to prevent VKDB</span>
                    </div>
                  </label>

                  {/* Eye Prophylaxis */}
                  <label className="flex items-start gap-3.5 p-4 bg-gray-50/70 rounded-2xl border border-gray-200 cursor-pointer hover:bg-rose-50/30 hover:border-rose-200 transition-all">
                    <input 
                      type="checkbox"
                      name="eye_prophylaxis_given"
                      value="true"
                      checked={eyeProp}
                      onChange={(e) => setEyeProp(e.target.checked)}
                      className="w-5 h-5 mt-0.5 accent-rose-600 rounded text-rose-600"
                    />
                    <div className="space-y-0.5">
                      <span className="text-xs font-bold text-gray-900 block">Erythromycin Eye Prophylaxis</span>
                      <span className="text-[11px] text-gray-500">Ophthalmic ointment applied to prevent ophthalmia neonatorum</span>
                    </div>
                  </label>

                  {/* Hep B */}
                  <div className="p-4 bg-gray-50/70 rounded-2xl border border-gray-200 space-y-2.5">
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input 
                        type="checkbox"
                        name="hepb_given"
                        value="true"
                        checked={hepb}
                        onChange={(e) => setHepb(e.target.checked)}
                        className="w-5 h-5 accent-rose-600 rounded text-rose-600"
                      />
                      <span className="text-xs font-bold text-gray-900">Hepatitis B Birth Dose (&lt; 24h)</span>
                    </label>
                    <div className="space-y-1 pl-8">
                      <Label className="text-[10px] text-gray-400 uppercase font-black">Date Administered</Label>
                      <Input 
                        name="hepb_date" 
                        type="date" 
                        value={hepbDate}
                        onChange={(e) => setHepbDate(e.target.value)}
                        className="h-9 text-xs bg-white rounded-xl border-gray-200" 
                      />
                    </div>
                  </div>

                  {/* BCG */}
                  <div className="p-4 bg-gray-50/70 rounded-2xl border border-gray-200 space-y-2.5">
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input 
                        type="checkbox"
                        name="bcg_given"
                        value="true"
                        checked={bcg}
                        onChange={(e) => setBcg(e.target.checked)}
                        className="w-5 h-5 accent-rose-600 rounded text-rose-600"
                      />
                      <span className="text-xs font-bold text-gray-900">BCG Vaccine (0.05 mL ID)</span>
                    </label>
                    <div className="space-y-1 pl-8">
                      <Label className="text-[10px] text-gray-400 uppercase font-black">Date Administered</Label>
                      <Input 
                        name="bcg_date" 
                        type="date" 
                        value={bcgDate}
                        onChange={(e) => setBcgDate(e.target.value)}
                        className="h-9 text-xs bg-white rounded-xl border-gray-200" 
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Part B: Screening Diagnostics */}
              <div className="space-y-3 pt-3 border-t border-gray-100">
                <p className="text-xs font-black uppercase tracking-wider text-gray-500">
                  B. Newborn Screening (RA 9288) & Hearing (RA 9709)
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-gray-700">NBS Filter Card Number</Label>
                    <Input 
                      name="nbs_filter_card_number" 
                      placeholder="e.g. NBS-2026-98124" 
                      defaultValue={currentRecord?.nbs_filter_card_number ?? ''}
                      className="h-10 font-mono text-xs rounded-xl border-gray-200 bg-white" 
                    />
                    <p className="text-[10px] text-gray-400">DOH NBS Filter Card #</p>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-gray-700">NBS Date Collected (24-72h)</Label>
                    <Input 
                      name="nbs_date_collected" 
                      type="date" 
                      defaultValue={currentRecord?.nbs_date_collected ?? ''}
                      className="h-10 rounded-xl border-gray-200 bg-white" 
                    />
                    <p className="text-[10px] text-gray-400">Heel-prick collection date</p>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-gray-700">NBS Status</Label>
                    <select
                      name="nbs_status"
                      value={nbsStatus}
                      onChange={(e) => setNbsStatus(e.target.value)}
                      className="flex h-10 w-full rounded-xl border border-gray-200 bg-white px-3 py-1 text-sm shadow-xs focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 outline-none"
                    >
                      <option value="Pending">Pending Collection</option>
                      <option value="Sample Sent">Sample Sent to NBS Center</option>
                      <option value="Normal">Normal (Negative)</option>
                      <option value="For Confirmatory">For Confirmatory Testing</option>
                    </select>
                    <p className="text-[10px] text-gray-400">Laboratory processing status</p>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-gray-700">Hearing Screening (RA 9709)</Label>
                    <select
                      name="hearing_screening_status"
                      value={hearingStatus}
                      onChange={(e) => setHearingStatus(e.target.value)}
                      className="flex h-10 w-full rounded-xl border border-gray-200 bg-white px-3 py-1 text-sm shadow-xs focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 outline-none"
                    >
                      <option value="Pending">Pending Screening</option>
                      <option value="Passed">Passed (Both Ears)</option>
                      <option value="Refer">Refer (Requires Diagnostic ABR)</option>
                      <option value="Not Performed">Not Performed</option>
                    </select>
                    <p className="text-[10px] text-gray-400">OAE / ABR hearing test result</p>
                  </div>
                </div>
              </div>
            </div>

            {/* ── CARD 5: Maternal Recovery Notes ── */}
            <div className="bg-white/95 backdrop-blur-md border border-gray-200/80 rounded-3xl p-6 md:p-7 shadow-sm space-y-3">
              <div className="flex items-center gap-2 pb-2 border-b border-gray-100">
                <div className="w-8 h-8 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
                  <Heart className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-sm font-black text-gray-900 tracking-tight">
                    5. Maternal Recovery, Uterine Involution & Lochia Notes
                  </h4>
                  <p className="text-xs text-gray-400">Postpartum observations on fundic height, lochia characteristics, and perineal healing</p>
                </div>
              </div>

              <textarea
                id="maternal_recovery_notes"
                name="maternal_recovery_notes"
                rows={3}
                placeholder="Uterus firmly contracted at level of umbilicus, lochia rubra moderate without foul odor, perineum intact, ambulating well..."
                defaultValue={currentRecord?.maternal_recovery_notes ?? ''}
                className="flex w-full rounded-2xl border border-gray-200 bg-white p-4 text-xs shadow-xs focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 outline-none resize-none leading-relaxed"
              />
            </div>

            {/* ── Action Bar Card ── */}
            <div className="bg-white/95 backdrop-blur-md border border-gray-200/80 rounded-3xl p-5 md:p-6 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-2 text-xs text-gray-500">
                <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Encrypted medical record. Compliant with RA 10173 (DPA 2012) & PhilHealth MCP.</span>
              </div>

              <div className="flex items-center gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsEditing(false)}
                  className="rounded-2xl text-xs font-bold h-11 px-6 border-gray-200 hover:bg-gray-100"
                  disabled={isPending}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isPending}
                  className="bg-gradient-to-r from-rose-500 to-rose-600 hover:from-rose-600 hover:to-rose-700 text-white font-bold rounded-2xl h-11 px-8 text-xs shadow-md shadow-rose-500/20 active:scale-[0.98] transition-all gap-2"
                >
                  {isPending ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Saving Clinical Record...</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4" />
                      <span>{isUpdate ? 'Update Delivery & Newborn Record' : 'Save Delivery & Newborn Record'}</span>
                    </>
                  )}
                </Button>
              </div>
            </div>
          </form>
        </div>
      ) : currentRecord ? (
        /* ── MODE 2: BENTO GRID CLINICAL SNAPSHOT (View Mode) ── */
        <div className="space-y-6 animate-in fade-in duration-200">
          {/* Bento Grid Tier 1: Delivery Details, Newborn Anthropometrics, DOH Compliance */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-5">

            {/* Delivery Modality Card (4 cols) */}
            <div className="md:col-span-4 bg-white/95 backdrop-blur-md border border-gray-100 rounded-3xl p-5 md:p-6 shadow-sm flex flex-col justify-between space-y-4">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[10px] font-black uppercase tracking-wider text-rose-500 bg-rose-50 border border-rose-100 px-2.5 py-0.5 rounded-full">
                    Delivery Modality
                  </span>
                  <CalendarDays className="w-4 h-4 text-gray-400" />
                </div>
                <h3 className="text-2xl font-black text-gray-900 tracking-tight">
                  {currentRecord.delivery_date && !isNaN(new Date(currentRecord.delivery_date).getTime())
                    ? new Date(currentRecord.delivery_date).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })
                    : 'Date Not Documented'}
                </h3>
                <p className="text-xs font-bold text-gray-700 mt-1 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  {currentRecord.delivery_type === 'Vaginal' ? 'Spontaneous Vaginal Delivery (NSVD)' : 
                   currentRecord.delivery_type === 'Cesarean' ? 'Cesarean Section' :
                   currentRecord.delivery_type === 'VBAC' ? 'Vaginal Birth After Cesarean (VBAC)' : 
                   currentRecord.delivery_type || 'Unspecified'}
                </p>
              </div>

              <div className="pt-3 border-t border-gray-100 space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-gray-400 font-bold uppercase text-[10px]">Infant Nutrition:</span>
                  <span className="font-bold text-gray-800">
                    {currentRecord.feeding_method === 'Breastfeeding' ? 'Exclusive Breastfeeding (EBF) 🤱' :
                     currentRecord.feeding_method === 'Formula' ? 'Formula Feeding' :
                     currentRecord.feeding_method === 'Mixed' ? 'Mixed Feeding' : 'Not Specified'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-400 font-bold uppercase text-[10px]">Postpartum Follow-up:</span>
                  <span className="font-semibold text-gray-700">
                    {currentRecord.follow_up_date && !isNaN(new Date(currentRecord.follow_up_date).getTime())
                      ? new Date(currentRecord.follow_up_date).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })
                      : 'Not Scheduled'}
                  </span>
                </div>
              </div>
            </div>

            {/* Baby Anthropometrics & APGAR Card (4 cols) */}
            <div className="md:col-span-4 bg-white/95 backdrop-blur-md border border-gray-100 rounded-3xl p-5 md:p-6 shadow-sm flex flex-col justify-between space-y-4">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className={`text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full border ${
                    babyVitals.gender === 'Male'
                      ? 'bg-blue-50 text-blue-700 border-blue-200'
                      : babyVitals.gender === 'Female'
                      ? 'bg-rose-50 text-rose-700 border-rose-200'
                      : 'bg-purple-50 text-purple-700 border-purple-200'
                  }`}>
                    {babyVitals.gender || 'Infant'} Anthropometrics
                  </span>
                  <Baby className="w-4 h-4 text-gray-400" />
                </div>
                <div className="flex items-baseline gap-2">
                  <h3 className="text-3xl font-black text-gray-900 tracking-tight">
                    {babyVitals.weight_kg ? `${babyVitals.weight_kg} kg` : '—'}
                  </h3>
                  {babyVitals.weight_kg && (
                    <span className="text-xs text-gray-500 font-medium">
                      ({Math.round(parseFloat(babyVitals.weight_kg) * 1000)} g)
                    </span>
                  )}
                </div>
                <p className="text-xs text-gray-500 font-semibold mt-0.5">
                  Birth Length: <strong className="text-gray-800">{babyVitals.length_cm ? `${babyVitals.length_cm} cm` : 'Not Measured'}</strong>
                </p>
              </div>

              <div className="pt-3 border-t border-gray-100 flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">APGAR (1m / 5m)</p>
                  <p className="text-base font-black text-gray-900">{babyVitals.apgar_score || 'Not recorded'}</p>
                </div>
                <span className="text-[11px] font-bold px-2.5 py-1 rounded-xl bg-purple-50 text-purple-700 border border-purple-100">
                  Vigorous Transition
                </span>
              </div>
            </div>

            {/* DOH Unang Yakap Compliance Overview (4 cols) */}
            <div className={`md:col-span-4 rounded-3xl p-5 md:p-6 shadow-sm border flex flex-col justify-between space-y-4 ${
              compliance.isFullyCompliant 
                ? 'bg-gradient-to-br from-emerald-50/80 via-white to-teal-50/40 border-emerald-200/80' 
                : 'bg-gradient-to-br from-amber-50/80 via-white to-orange-50/40 border-amber-200/80'
            }`}>
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className={`text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full border ${
                    compliance.isFullyCompliant
                      ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                      : 'bg-amber-100 text-amber-800 border-amber-300'
                  }`}>
                    DOH EINC Protocols
                  </span>
                  <Award className={`w-4 h-4 ${compliance.isFullyCompliant ? 'text-emerald-600' : 'text-amber-600'}`} />
                </div>
                <div className="flex items-baseline gap-2">
                  <h3 className="text-3xl font-black text-gray-900 tracking-tight">
                    {compliance.percentage}%
                  </h3>
                  <span className="text-xs font-bold text-gray-600">
                    ({compliance.completed}/{compliance.total} Steps)
                  </span>
                </div>

                {/* Progress bar */}
                <div className="w-full bg-gray-200/80 h-2 rounded-full overflow-hidden mt-2.5">
                  <div 
                    className={`h-full transition-all duration-700 ${
                      compliance.isFullyCompliant ? 'bg-emerald-500' : 'bg-amber-500'
                    }`}
                    style={{ width: `${compliance.percentage}%` }}
                  />
                </div>
              </div>

              <div className="text-xs pt-2">
                {compliance.isFullyCompliant ? (
                  <p className="text-emerald-800 font-bold flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    All mandatory DOH newborn interventions fulfilled.
                  </p>
                ) : (
                  <p className="text-amber-900 font-bold flex items-center gap-1.5">
                    <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                    {compliance.pendingMandatory.length} mandatory DOH step(s) pending.
                  </p>
                )}
              </div>
            </div>

          </div>

          {/* Bento Grid Tier 2: EINC Protocol Sequence & Newborn Prophylaxis / Screening */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-5">

            {/* DOH EINC (Unang Yakap) 3-Step Core Protocol (5 cols) */}
            <div className="md:col-span-5 bg-white/95 backdrop-blur-md border border-gray-100 rounded-3xl p-5 md:p-6 shadow-sm space-y-4">
              <div className="flex items-center gap-2 pb-2 border-b border-gray-100">
                <ShieldCheck className="w-4 h-4 text-rose-600" />
                <h4 className="font-black text-gray-900 text-sm tracking-tight">
                  EINC Core Steps (AO 2009-0025)
                </h4>
              </div>

              <div className="space-y-2.5">
                {[
                  {
                    title: 'Immediate & Thorough Drying',
                    subtitle: 'Stimulation & hypothermia prevention',
                    done: true,
                  },
                  {
                    title: 'Early Skin-to-Skin Contact',
                    subtitle: 'Uninterrupted prone contact ≥ 90 mins',
                    done: currentRecord.skin_to_skin_initiated,
                  },
                  {
                    title: 'Delayed Cord Clamping',
                    subtitle: 'Clamped at 1–3 mins or pulsation stop',
                    done: currentRecord.cord_care_done,
                  },
                  {
                    title: 'Early Breastfeeding Initiation',
                    subtitle: 'Non-separation & feeding in first hour',
                    done: currentRecord.early_breastfeeding_initiated,
                  },
                ].map((step, idx) => (
                  <div
                    key={idx}
                    className={`flex items-center justify-between p-3 rounded-2xl border transition-all ${
                      step.done 
                        ? 'bg-rose-50/40 border-rose-100 text-rose-900' 
                        : 'bg-gray-50 border-gray-200 text-gray-500'
                    }`}
                  >
                    <div>
                      <p className="text-xs font-black">{step.title}</p>
                      <p className="text-[10px] text-gray-500 font-medium">{step.subtitle}</p>
                    </div>
                    {step.done ? (
                      <span className="w-5 h-5 rounded-full bg-rose-500 text-white flex items-center justify-center shrink-0">
                        <Check className="w-3 h-3 stroke-[3]" />
                      </span>
                    ) : (
                      <span className="w-5 h-5 rounded-full bg-gray-200 text-gray-400 flex items-center justify-center shrink-0">
                        <X className="w-3 h-3" />
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Prophylaxis & Screening Panel (7 cols) */}
            <div className="md:col-span-7 bg-white/95 backdrop-blur-md border border-gray-100 rounded-3xl p-5 md:p-6 shadow-sm space-y-4">
              <div className="flex items-center gap-2 pb-2 border-b border-gray-100">
                <Syringe className="w-4 h-4 text-purple-600" />
                <h4 className="font-black text-gray-900 text-sm tracking-tight">
                  Newborn Prophylaxis & PhilHealth NCP Screening
                </h4>
              </div>

              {/* 4 Mini Cards for Vaccines & Prophylaxis */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className={`p-3 rounded-2xl border text-center space-y-1 ${
                  currentRecord.vit_k_given ? 'bg-purple-50/70 border-purple-200 text-purple-900' : 'bg-gray-50 border-gray-200 text-gray-500'
                }`}>
                  <p className="text-[10px] font-black uppercase tracking-wider">Vitamin K</p>
                  <p className="text-xs font-bold">{currentRecord.vit_k_given ? '✅ Given 1mg' : '❌ Pending'}</p>
                </div>

                <div className={`p-3 rounded-2xl border text-center space-y-1 ${
                  currentRecord.eye_prophylaxis_given ? 'bg-purple-50/70 border-purple-200 text-purple-900' : 'bg-gray-50 border-gray-200 text-gray-500'
                }`}>
                  <p className="text-[10px] font-black uppercase tracking-wider">Eye Drops</p>
                  <p className="text-xs font-bold">{currentRecord.eye_prophylaxis_given ? '✅ Given (Eryth)' : '❌ Pending'}</p>
                </div>

                <div className={`p-3 rounded-2xl border text-center space-y-1 ${
                  currentRecord.hepb_given ? 'bg-blue-50/70 border-blue-200 text-blue-900' : 'bg-gray-50 border-gray-200 text-gray-500'
                }`}>
                  <p className="text-[10px] font-black uppercase tracking-wider">Hep B Dose</p>
                  <p className="text-xs font-bold">{currentRecord.hepb_given ? '✅ Administered' : '❌ Pending'}</p>
                  {currentRecord.hepb_date && <p className="text-[9px] text-gray-400 font-mono">{currentRecord.hepb_date}</p>}
                </div>

                <div className={`p-3 rounded-2xl border text-center space-y-1 ${
                  currentRecord.bcg_given ? 'bg-blue-50/70 border-blue-200 text-blue-900' : 'bg-gray-50 border-gray-200 text-gray-500'
                }`}>
                  <p className="text-[10px] font-black uppercase tracking-wider">BCG Vaccine</p>
                  <p className="text-xs font-bold">{currentRecord.bcg_given ? '✅ Administered' : '❌ Pending'}</p>
                  {currentRecord.bcg_date && <p className="text-[9px] text-gray-400 font-mono">{currentRecord.bcg_date}</p>}
                </div>
              </div>

              {/* Newborn Screening & Hearing Tests */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                <div className="bg-gray-50/90 border border-gray-200 rounded-2xl p-3.5 space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-black text-gray-700">Newborn Screening (NBS)</span>
                    <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${
                      currentRecord.nbs_status === 'Normal' ? 'bg-emerald-100 text-emerald-800' :
                      currentRecord.nbs_status === 'Sample Sent' ? 'bg-blue-100 text-blue-800' : 'bg-amber-100 text-amber-800'
                    }`}>
                      {currentRecord.nbs_status || 'Pending'}
                    </span>
                  </div>
                  <p className="text-xs text-gray-600 font-mono">
                    Filter Card: <strong className="text-gray-900">{currentRecord.nbs_filter_card_number || 'Not Recorded'}</strong>
                  </p>
                  {currentRecord.nbs_date_collected && (
                    <p className="text-[10px] text-gray-400">
                      Sample Date: {currentRecord.nbs_date_collected}
                    </p>
                  )}
                </div>

                <div className="bg-gray-50/90 border border-gray-200 rounded-2xl p-3.5 space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-black text-gray-700">Hearing Screening</span>
                    <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${
                      currentRecord.hearing_screening_status === 'Passed' ? 'bg-emerald-100 text-emerald-800' :
                      currentRecord.hearing_screening_status === 'Refer' ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-600'
                    }`}>
                      {currentRecord.hearing_screening_status || 'Pending'}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500">
                    Mandatory Philippine Hearing Registry (RA 9709).
                  </p>
                </div>
              </div>

            </div>

          </div>

          {/* Bento Grid Tier 3: Maternal Recovery & Lochia Assessment */}
          <div className="bg-white/95 backdrop-blur-md border border-gray-100 rounded-3xl p-5 md:p-6 shadow-sm space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <Heart className="w-4 h-4 text-rose-500" />
                <h4 className="font-black text-gray-900 text-sm tracking-tight">
                  Maternal Postpartum Recovery & Lochia Clinical Notes
                </h4>
              </div>
              <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-100">
                Uterine & Perineal Healing
              </span>
            </div>

            {currentRecord.maternal_recovery_notes ? (
              <p className="text-xs text-gray-800 italic bg-gray-50/90 p-4 rounded-2xl border border-gray-100 leading-relaxed font-serif">
                &ldquo;{currentRecord.maternal_recovery_notes}&rdquo;
              </p>
            ) : (
              <div className="text-center py-4 bg-gray-50 rounded-2xl border border-dashed border-gray-200 text-xs text-gray-400">
                No maternal lochia or recovery observations documented yet.
              </div>
            )}
          </div>
        </div>
      ) : (
        /* ── MODE 3: EMPTY STATE (When no record exists and not editing) ── */
        <div className="bg-white/95 backdrop-blur-md border border-dashed border-gray-200 rounded-3xl p-8 md:p-12 text-center space-y-4">
          <div className="w-16 h-16 rounded-3xl bg-rose-50 text-rose-500 flex items-center justify-center mx-auto shadow-inner">
            <Baby className="w-8 h-8" />
          </div>
          <div className="max-w-md mx-auto space-y-1">
            <h3 className="font-black text-gray-900 text-base">No Delivery or Postpartum Record on File</h3>
            <p className="text-xs text-gray-500 leading-relaxed">
              When {patient.full_name} delivers at the clinic, record delivery details, infant APGAR scores, anthropometrics, and the Philippine DOH Unang Yakap (EINC) protocols below.
            </p>
          </div>
          <Button
            type="button"
            onClick={() => setIsEditing(true)}
            className="bg-gradient-to-r from-rose-500 to-rose-600 hover:from-rose-600 hover:to-rose-700 text-white font-bold rounded-2xl px-6 h-11 text-xs shadow-md shadow-rose-500/20 gap-2"
          >
            <Plus className="w-4 h-4" />
            <span>Record Delivery & Newborn Care</span>
          </Button>
        </div>
      )}
    </div>
  );
}
