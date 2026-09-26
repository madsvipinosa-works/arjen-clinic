'use client';

import React, { useState, useTransition } from 'react';
import { 
  Baby, Heart, CalendarDays, CheckCircle2, ShieldCheck, 
  AlertTriangle, Sparkles, Syringe, Eye, Award, Pencil, 
  Plus, ChevronDown, ChevronUp, Clock, Activity, FileText, Check, X, ArrowLeft
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { checkDOHNewbornProtocols } from '@/lib/clinical-protocols';
import { createPostpartumRecord, updatePostpartumRecord } from '@/app/actions';

export function PostpartumTabContent({
  patient,
  activeEpisode = null,
  postpartumRecord = null,
  postpartumRecords = [],
}) {
  const [selectedRecordId, setSelectedRecordId] = useState(postpartumRecord?.id || null);
  const [isEditing, setIsEditing] = useState(!postpartumRecord);
  const [isPending, startTransition] = useTransition();
  const [formError, setFormError] = useState(null);
  const [formSuccess, setFormSuccess] = useState(null);

  // Active record to display in the Bento grid
  const currentRecord = postpartumRecords.find((r) => r.id === selectedRecordId) || postpartumRecord || null;
  const isUpdate = !!currentRecord;
  const babyVitals = currentRecord?.baby_vitals || {};

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
              Delivery #{postpartumRecords.length - idx} • {rec.delivery_date ? new Date(rec.delivery_date).toLocaleDateString('en-PH') : 'Date unset'}
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

      {/* ── MODE 1: EDIT / RECORD FORM (Appears right at the top when toggled) ── */}
      {isEditing ? (
        <form onSubmit={handleSubmit} className="space-y-6 animate-in fade-in slide-in-from-top-2 duration-200">
          {/* Hidden inputs */}
          <input type="hidden" name="patient_id" value={patient.id} />
          {activeEpisode?.id && <input type="hidden" name="maternal_episode_id" value={activeEpisode.id} />}
          {isUpdate && <input type="hidden" name="id" value={currentRecord.id} />}

          <div className="bg-white/95 backdrop-blur-md border border-rose-200/90 rounded-3xl p-6 md:p-8 shadow-sm space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-gray-100">
              <div>
                <h3 className="text-base font-black text-gray-900 tracking-tight flex items-center gap-2">
                  <Pencil className="w-4 h-4 text-rose-500" />
                  {isUpdate ? 'Edit Postpartum & Newborn Record' : 'Record New Delivery & Newborn Care'}
                </h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  Fulfills PhilHealth Maternal & Newborn Care Package (MCP / NCP) statutory data requirements.
                </p>
              </div>

              <Button
                type="button"
                variant="ghost"
                onClick={() => setIsEditing(false)}
                className="text-gray-400 hover:text-gray-700 rounded-xl text-xs gap-1.5 font-bold"
              >
                <X className="w-3.5 h-3.5" />
                <span>Cancel</span>
              </Button>
            </div>

            {/* Form Section 1: Delivery Details */}
            <div className="space-y-3">
              <h4 className="text-xs font-black uppercase tracking-wider text-rose-700 flex items-center gap-1.5">
                <CalendarDays className="w-3.5 h-3.5" />
                1. Delivery Modality & Feeding
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="delivery_date" className="text-xs font-bold text-gray-700">Delivery Date *</Label>
                  <Input
                    id="delivery_date"
                    name="delivery_date"
                    type="date"
                    required
                    defaultValue={currentRecord?.delivery_date ?? ''}
                    className="h-10 rounded-xl"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="delivery_type" className="text-xs font-bold text-gray-700">Delivery Type *</Label>
                  <select
                    id="delivery_type"
                    name="delivery_type"
                    defaultValue={currentRecord?.delivery_type ?? 'Vaginal'}
                    className="flex h-10 w-full rounded-xl border border-input bg-white px-3 py-1 text-sm shadow-xs focus:ring-1 focus:ring-rose-500 outline-none"
                  >
                    <option value="Vaginal">Spontaneous Vaginal Delivery (NSVD)</option>
                    <option value="Cesarean">Cesarean Section (Transferred)</option>
                    <option value="VBAC">Vaginal Birth After Cesarean (VBAC)</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="feeding_method" className="text-xs font-bold text-gray-700">Feeding Method *</Label>
                  <select
                    id="feeding_method"
                    name="feeding_method"
                    defaultValue={currentRecord?.feeding_method ?? 'Breastfeeding'}
                    className="flex h-10 w-full rounded-xl border border-input bg-white px-3 py-1 text-sm shadow-xs focus:ring-1 focus:ring-rose-500 outline-none"
                  >
                    <option value="Breastfeeding">Exclusive Breastfeeding (EBF)</option>
                    <option value="Formula">Formula Feeding</option>
                    <option value="Mixed">Mixed Feeding</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="follow_up_date" className="text-xs font-bold text-gray-700">Follow-up Date</Label>
                  <Input
                    id="follow_up_date"
                    name="follow_up_date"
                    type="date"
                    defaultValue={currentRecord?.follow_up_date ?? ''}
                    className="h-10 rounded-xl"
                  />
                </div>
              </div>
            </div>

            {/* Form Section 2: DOH EINC Checklist */}
            <div className="space-y-3 pt-4 border-t border-gray-100">
              <h4 className="text-xs font-black uppercase tracking-wider text-rose-700 flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5" />
                2. DOH Essential Intrapartum and Newborn Care (Unang Yakap)
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <label className="flex items-start gap-3 p-3.5 bg-rose-50/30 rounded-2xl border border-rose-100 cursor-pointer hover:border-rose-300 transition-colors">
                  <input 
                    type="checkbox"
                    name="skin_to_skin_initiated"
                    value="true"
                    defaultChecked={currentRecord?.skin_to_skin_initiated ?? true}
                    className="w-4 h-4 mt-0.5 accent-rose-600 rounded text-rose-600"
                  />
                  <div>
                    <span className="text-xs font-bold text-gray-900 block">Immediate Skin-to-Skin</span>
                    <span className="text-[11px] text-gray-500">Uninterrupted prone contact ≥ 90 mins</span>
                  </div>
                </label>

                <label className="flex items-start gap-3 p-3.5 bg-rose-50/30 rounded-2xl border border-rose-100 cursor-pointer hover:border-rose-300 transition-colors">
                  <input 
                    type="checkbox"
                    name="cord_care_done"
                    value="true"
                    defaultChecked={currentRecord?.cord_care_done ?? true}
                    className="w-4 h-4 mt-0.5 accent-rose-600 rounded text-rose-600"
                  />
                  <div>
                    <span className="text-xs font-bold text-gray-900 block">Delayed Cord Clamping</span>
                    <span className="text-[11px] text-gray-500">Clamped at 1–3 mins or pulsation ceases</span>
                  </div>
                </label>

                <label className="flex items-start gap-3 p-3.5 bg-rose-50/30 rounded-2xl border border-rose-100 cursor-pointer hover:border-rose-300 transition-colors">
                  <input 
                    type="checkbox"
                    name="early_breastfeeding_initiated"
                    value="true"
                    defaultChecked={currentRecord?.early_breastfeeding_initiated ?? true}
                    className="w-4 h-4 mt-0.5 accent-rose-600 rounded text-rose-600"
                  />
                  <div>
                    <span className="text-xs font-bold text-gray-900 block">Early Breastfeeding</span>
                    <span className="text-[11px] text-gray-500">Initiated within first hour of life</span>
                  </div>
                </label>
              </div>
            </div>

            {/* Form Section 3: Baby Anthropometrics */}
            <div className="space-y-3 pt-4 border-t border-gray-100">
              <h4 className="text-xs font-black uppercase tracking-wider text-rose-700 flex items-center gap-1.5">
                <Baby className="w-3.5 h-3.5" />
                3. Baby Anthropometrics & Apgar Score
              </h4>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="baby_weight_kg" className="text-xs font-bold text-gray-700">Birth Weight (kg) *</Label>
                  <Input
                    id="baby_weight_kg"
                    name="baby_weight_kg"
                    type="number"
                    step="0.001"
                    min="0"
                    placeholder="e.g. 3.250"
                    defaultValue={babyVitals.weight_kg ?? ''}
                    className="h-10 rounded-xl"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="baby_length_cm" className="text-xs font-bold text-gray-700">Birth Length (cm)</Label>
                  <Input
                    id="baby_length_cm"
                    name="baby_length_cm"
                    type="number"
                    step="0.1"
                    min="0"
                    placeholder="e.g. 50.0"
                    defaultValue={babyVitals.length_cm ?? ''}
                    className="h-10 rounded-xl"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="baby_apgar_score" className="text-xs font-bold text-gray-700">Apgar Score (1m / 5m)</Label>
                  <Input
                    id="baby_apgar_score"
                    name="baby_apgar_score"
                    type="text"
                    placeholder="e.g. 9/10"
                    defaultValue={babyVitals.apgar_score ?? ''}
                    className="h-10 rounded-xl"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="baby_gender" className="text-xs font-bold text-gray-700">Infant Sex *</Label>
                  <select
                    id="baby_gender"
                    name="baby_gender"
                    defaultValue={babyVitals.gender ?? 'Female'}
                    className="flex h-10 w-full rounded-xl border border-input bg-white px-3 py-1 text-sm shadow-xs focus:ring-1 focus:ring-rose-500 outline-none"
                  >
                    <option value="Female">Female</option>
                    <option value="Male">Male</option>
                    <option value="Ambiguous">Ambiguous</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Form Section 4: Prophylaxis & Screening */}
            <div className="space-y-3 pt-4 border-t border-gray-100">
              <h4 className="text-xs font-black uppercase tracking-wider text-rose-700 flex items-center gap-1.5">
                <Syringe className="w-3.5 h-3.5" />
                4. Newborn Prophylaxis & PhilHealth NCP Screening
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <label className="flex items-center gap-3 p-3.5 bg-gray-50 rounded-2xl border border-gray-200 cursor-pointer hover:bg-rose-50/30 transition-colors">
                  <input 
                    type="checkbox"
                    name="vit_k_given"
                    value="true"
                    defaultChecked={currentRecord?.vit_k_given ?? false}
                    className="w-4 h-4 accent-rose-600 rounded text-rose-600"
                  />
                  <div>
                    <span className="text-xs font-bold text-gray-900 block">Vitamin K Prophylaxis (1 mg IM)</span>
                    <span className="text-[11px] text-gray-500">Prevents Vitamin K Deficiency Bleeding</span>
                  </div>
                </label>

                <label className="flex items-center gap-3 p-3.5 bg-gray-50 rounded-2xl border border-gray-200 cursor-pointer hover:bg-rose-50/30 transition-colors">
                  <input 
                    type="checkbox"
                    name="eye_prophylaxis_given"
                    value="true"
                    defaultChecked={currentRecord?.eye_prophylaxis_given ?? false}
                    className="w-4 h-4 accent-rose-600 rounded text-rose-600"
                  />
                  <div>
                    <span className="text-xs font-bold text-gray-900 block">Erythromycin Eye Prophylaxis</span>
                    <span className="text-[11px] text-gray-500">Ophthalmia neonatorum prevention</span>
                  </div>
                </label>
              </div>

              {/* Vaccines */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                <div className="p-3.5 bg-gray-50 rounded-2xl border border-gray-200 space-y-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input 
                      type="checkbox"
                      name="hepb_given"
                      value="true"
                      defaultChecked={currentRecord?.hepb_given ?? false}
                      className="w-4 h-4 accent-rose-600 rounded text-rose-600"
                    />
                    <span className="text-xs font-bold text-gray-900">Hepatitis B Birth Dose (&lt; 24h)</span>
                  </label>
                  <div className="space-y-1 pl-6">
                    <Label className="text-[10px] text-gray-400 uppercase font-black">Date Administered</Label>
                    <Input 
                      name="hepb_date" 
                      type="date" 
                      defaultValue={currentRecord?.hepb_date ?? ''}
                      className="h-8 text-xs bg-white rounded-lg" 
                    />
                  </div>
                </div>

                <div className="p-3.5 bg-gray-50 rounded-2xl border border-gray-200 space-y-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input 
                      type="checkbox"
                      name="bcg_given"
                      value="true"
                      defaultChecked={currentRecord?.bcg_given ?? false}
                      className="w-4 h-4 accent-rose-600 rounded text-rose-600"
                    />
                    <span className="text-xs font-bold text-gray-900">BCG Vaccine (0.05 mL ID)</span>
                  </label>
                  <div className="space-y-1 pl-6">
                    <Label className="text-[10px] text-gray-400 uppercase font-black">Date Administered</Label>
                    <Input 
                      name="bcg_date" 
                      type="date" 
                      defaultValue={currentRecord?.bcg_date ?? ''}
                      className="h-8 text-xs bg-white rounded-lg" 
                    />
                  </div>
                </div>
              </div>

              {/* NBS & Hearing */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-gray-700">NBS Filter Card Number</Label>
                  <Input 
                    name="nbs_filter_card_number" 
                    placeholder="e.g. NBS-2026-98124" 
                    defaultValue={currentRecord?.nbs_filter_card_number ?? ''}
                    className="h-10 font-mono text-xs rounded-xl" 
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-gray-700">NBS Date Collected (24-72h)</Label>
                  <Input 
                    name="nbs_date_collected" 
                    type="date" 
                    defaultValue={currentRecord?.nbs_date_collected ?? ''}
                    className="h-10 rounded-xl" 
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-gray-700">NBS Status</Label>
                  <select
                    name="nbs_status"
                    defaultValue={currentRecord?.nbs_status ?? 'Pending'}
                    className="flex h-10 w-full rounded-xl border border-input bg-white px-3 py-1 text-sm shadow-xs focus:ring-1 focus:ring-rose-500 outline-none"
                  >
                    <option value="Pending">Pending Collection</option>
                    <option value="Sample Sent">Sample Sent to NBS Center</option>
                    <option value="Normal">Normal (Negative)</option>
                    <option value="For Confirmatory">For Confirmatory Testing</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1.5 pt-2">
                <Label className="text-xs font-bold text-gray-700">Newborn Hearing Screening (RA 9709)</Label>
                <select
                  name="hearing_screening_status"
                  defaultValue={currentRecord?.hearing_screening_status ?? 'Pending'}
                  className="flex h-10 w-full sm:max-w-xs rounded-xl border border-input bg-white px-3 py-1 text-sm shadow-xs focus:ring-1 focus:ring-rose-500 outline-none"
                >
                  <option value="Pending">Pending Screening</option>
                  <option value="Passed">Passed (Both Ears)</option>
                  <option value="Refer">Refer (Requires Diagnostic ABR)</option>
                  <option value="Not Performed">Not Performed</option>
                </select>
              </div>
            </div>

            {/* Form Section 5: Maternal Recovery Notes */}
            <div className="space-y-2 pt-4 border-t border-gray-100">
              <Label htmlFor="maternal_recovery_notes" className="text-xs font-black uppercase tracking-wider text-rose-700 flex items-center gap-1.5">
                <Heart className="w-3.5 h-3.5" />
                5. Maternal Recovery, Uterine Involution & Lochia Notes
              </Label>
              <textarea
                id="maternal_recovery_notes"
                name="maternal_recovery_notes"
                rows={3}
                placeholder="Uterus firmly contracted at level of umbilicus, lochia rubra moderate without foul odor, perineum intact, ambulating well..."
                defaultValue={currentRecord?.maternal_recovery_notes ?? ''}
                className="flex w-full rounded-2xl border border-gray-200 bg-white p-3.5 text-xs shadow-xs focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 outline-none resize-none"
              />
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsEditing(false)}
                className="rounded-2xl text-xs font-bold h-11 px-6"
                disabled={isPending}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isPending}
                className="bg-gradient-to-r from-rose-500 to-rose-600 hover:from-rose-600 hover:to-rose-700 text-white font-bold rounded-2xl h-11 px-8 text-xs shadow-md shadow-rose-500/20 active:scale-[0.98] transition-all"
              >
                {isPending ? 'Saving...' : isUpdate ? 'Update Delivery & Newborn Record' : 'Save Delivery & Newborn Record'}
              </Button>
            </div>
          </div>
        </form>
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
                  {currentRecord.delivery_date
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
                    {currentRecord.follow_up_date
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
