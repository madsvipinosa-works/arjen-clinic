'use client';

import React, { useState, useTransition, useMemo } from 'react';
import Link from 'next/link';
import { 
  UserPlus, Calendar, Baby, ShieldAlert, HeartPulse, Sparkles, 
  AlertTriangle, ArrowLeft, Droplets, ShieldCheck, Clock, Phone, MapPin 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { calculateObstetricDates } from '@/lib/clinical-protocols';
import { createPatient } from '@/app/actions';

export function NewPatientForm() {
  const [isPending, startTransition] = useTransition();

  // Form State for dynamic calculation
  const [dob, setDob] = useState('');
  const [age, setAge] = useState('');
  const [lmp, setLmp] = useState('');
  const [gravida, setGravida] = useState(1);
  const [para, setPara] = useState(0);
  const [isHighRisk, setIsHighRisk] = useState(false);
  const [contactNumber, setContactNumber] = useState('');
  const [philhealthNo, setPhilhealthNo] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  // 1. Auto-calculate Age when Date of Birth changes
  const handleDobChange = (e) => {
    const val = e.target.value;
    setDob(val);
    if (!val) return;

    try {
      const birthDate = new Date(val);
      const today = new Date();
      if (!isNaN(birthDate.getTime())) {
        let computedAge = today.getFullYear() - birthDate.getFullYear();
        const m = today.getMonth() - birthDate.getMonth();
        if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
          computedAge--;
        }
        if (computedAge >= 5 && computedAge <= 120) {
          setAge(computedAge.toString());
        }
      }
    } catch {
      // Keep existing age on error
    }
  };

  // 2. Live Obstetric Calculation from LMP
  const obstetricPreview = useMemo(() => {
    if (!lmp) return null;
    return calculateObstetricDates(lmp);
  }, [lmp]);

  // Form submit handler
  const handleSubmit = (e) => {
    e.preventDefault();
    setErrorMessage('');
    const form = e.currentTarget;
    const formData = new FormData(form);

    startTransition(async () => {
      const res = await createPatient(formData);
      if (res && res.error) {
        setErrorMessage(res.error);
      }
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8 animate-in fade-in duration-200">
      {errorMessage && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-bold flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* ── CARD 1: Personal & Demographic Information ── */}
      <Card className="border border-gray-200/90 shadow-xs bg-white/95 backdrop-blur-md rounded-3xl overflow-hidden">
        <CardHeader className="border-b border-gray-100 bg-gradient-to-r from-gray-50/70 via-white to-emerald-50/30 p-5 md:p-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
              <UserPlus className="w-5 h-5" />
            </div>
            <div>
              <CardTitle className="text-base font-black text-gray-900 tracking-tight">
                1. Personal &amp; Demographic Profile
              </CardTitle>
              <CardDescription className="text-xs text-gray-500 font-medium mt-0.5">
                Official patient identification and community contact details.
              </CardDescription>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-5 md:p-6 grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Full Name */}
          <div className="md:col-span-2 space-y-1.5">
            <Label htmlFor="full_name" className="text-xs font-bold text-gray-700">
              Full Name (First, Middle, Last) <span className="text-rose-500">*</span>
            </Label>
            <Input
              id="full_name"
              name="full_name"
              placeholder="e.g. Maria Santos dela Cruz"
              required
              className="h-11 rounded-xl text-sm focus-visible:ring-emerald-500"
            />
          </div>

          {/* Date of Birth & Auto Age */}
          <div className="space-y-1.5">
            <Label htmlFor="date_of_birth" className="text-xs font-bold text-gray-700">
              Date of Birth
            </Label>
            <Input
              id="date_of_birth"
              name="date_of_birth"
              type="date"
              value={dob}
              onChange={handleDobChange}
              className="h-11 rounded-xl text-sm focus-visible:ring-emerald-500"
            />
            <p className="text-[10px] text-gray-400 font-medium">Entering DOB auto-calculates completed age.</p>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="age" className="text-xs font-bold text-gray-700">
              Age (Years)
            </Label>
            <Input
              id="age"
              name="age"
              type="number"
              placeholder="e.g. 26"
              min="10"
              max="100"
              value={age}
              onChange={(e) => setAge(e.target.value)}
              className="h-11 rounded-xl text-sm focus-visible:ring-emerald-500 font-bold"
            />
          </div>

          {/* Civil Status */}
          <div className="space-y-1.5">
            <Label htmlFor="civil_status" className="text-xs font-bold text-gray-700">
              Civil Status
            </Label>
            <select
              id="civil_status"
              name="civil_status"
              className="w-full h-11 rounded-xl border border-input bg-white px-3 text-sm focus:ring-2 focus:ring-emerald-500/20 focus:outline-none"
              defaultValue="Married"
            >
              <option value="Single">Single</option>
              <option value="Married">Married</option>
              <option value="Live-in">Live-in</option>
              <option value="Widowed">Widowed</option>
              <option value="Separated">Separated</option>
            </select>
          </div>

          {/* Husband / Partner Name */}
          <div className="space-y-1.5">
            <Label htmlFor="husband_partner_name" className="text-xs font-bold text-gray-700">
              Husband / Partner Name
            </Label>
            <Input
              id="husband_partner_name"
              name="husband_partner_name"
              maxLength={100}
              placeholder="e.g. Juan dela Cruz"
              className="h-11 rounded-xl text-sm focus-visible:ring-emerald-500"
            />
          </div>

          {/* Contact Number */}
          <div className="space-y-1.5">
            <Label htmlFor="contact_number" className="text-xs font-bold text-gray-700">
              Mobile Contact Number (11 digits)
            </Label>
            <Input
              id="contact_number"
              name="contact_number"
              type="tel"
              maxLength={11}
              value={contactNumber}
              onChange={(e) => setContactNumber(e.target.value.replace(/\D/g, '').slice(0, 11))}
              placeholder="09171234567"
              className="h-11 rounded-xl text-sm focus-visible:ring-emerald-500 font-mono"
            />
            <p className="text-[10px] text-gray-400 font-medium">Standard Philippine 11-digit mobile format.</p>
          </div>

          {/* Blood Type */}
          <div className="space-y-1.5">
            <Label htmlFor="blood_type" className="text-xs font-bold text-gray-700">
              Blood Type &amp; Rh
            </Label>
            <select
              id="blood_type"
              name="blood_type"
              className="w-full h-11 rounded-xl border border-input bg-white px-3 text-sm focus:ring-2 focus:ring-emerald-500/20 focus:outline-none font-bold"
              defaultValue=""
            >
              <option value="">Select blood type if known...</option>
              {['O+', 'A+', 'B+', 'AB+', 'O-', 'A-', 'B-', 'AB-'].map(bt => (
                <option key={bt} value={bt}>{bt}</option>
              ))}
            </select>
          </div>

          {/* PhilHealth Number */}
          <div className="space-y-1.5">
            <Label htmlFor="philhealth_number" className="text-xs font-bold text-gray-700">
              PhilHealth Identification Number (PIN)
            </Label>
            <Input
              id="philhealth_number"
              name="philhealth_number"
              maxLength={14}
              value={philhealthNo}
              onChange={(e) => setPhilhealthNo(e.target.value)}
              placeholder="00-000000000-0"
              className="h-11 rounded-xl text-sm focus-visible:ring-emerald-500 font-mono"
            />
            <p className="text-[10px] text-gray-400 font-medium">PhilHealth Maternity Care Package (MCP) verification.</p>
          </div>

          {/* Allergies */}
          <div className="space-y-1.5">
            <Label htmlFor="allergies" className="text-xs font-bold text-gray-700">
              Known Drug &amp; Environmental Allergies
            </Label>
            <Input
              id="allergies"
              name="allergies"
              placeholder="e.g. Penicillin, Mefenamic Acid (or 'None')"
              className="h-11 rounded-xl text-sm focus-visible:ring-emerald-500"
            />
            <p className="text-[10px] text-gray-400 font-medium">Critical safety baseline for attending clinicians.</p>
          </div>

          {/* Home Address */}
          <div className="md:col-span-2 space-y-1.5">
            <Label htmlFor="address" className="text-xs font-bold text-gray-700">
              Home Address (Barangay, Municipality, Province)
            </Label>
            <Input
              id="address"
              name="address"
              placeholder="e.g. Brgy. San Vicente, Gapan City, Nueva Ecija"
              className="h-11 rounded-xl text-sm focus-visible:ring-emerald-500"
            />
          </div>
        </CardContent>
      </Card>

      {/* ── CARD 2: Obstetric Baseline & Maternal Episode Intake ── */}
      <Card className="border border-rose-200/90 shadow-xs bg-white/95 backdrop-blur-md rounded-3xl overflow-hidden">
        <CardHeader className="border-b border-rose-100 bg-gradient-to-r from-rose-50/60 via-white to-pink-50/30 p-5 md:p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center font-bold">
                <Baby className="w-5 h-5" />
              </div>
              <div>
                <CardTitle className="text-base font-black text-rose-900 tracking-tight">
                  2. Obstetric History &amp; Gestational Intake
                </CardTitle>
                <CardDescription className="text-xs text-rose-700/80 font-medium mt-0.5">
                  Establishes the active pregnancy episode and auto-calculates Naegele&apos;s EDC.
                </CardDescription>
              </div>
            </div>

            <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full bg-rose-100 text-rose-700 border border-rose-200">
              DOH BEmONC
            </span>
          </div>
        </CardHeader>

        <CardContent className="p-5 md:p-6 space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            {/* Last Menstrual Period (LMP) */}
            <div className="space-y-1.5">
              <Label htmlFor="lmp" className="text-xs font-bold text-gray-700">
                Last Menstrual Period (LMP)
              </Label>
              <Input
                id="lmp"
                name="lmp"
                type="date"
                value={lmp}
                onChange={(e) => setLmp(e.target.value)}
                className="h-11 rounded-xl text-sm focus-visible:ring-rose-500 font-bold"
              />
              <p className="text-[10px] text-gray-400 font-medium">Leave blank for non-pregnant gynecologic consultations.</p>
            </div>

            {/* Gravida */}
            <div className="space-y-1.5">
              <Label htmlFor="gravida" className="text-xs font-bold text-gray-700">
                Gravida (Total Pregnancies)
              </Label>
              <Input
                id="gravida"
                name="gravida"
                type="number"
                min="1"
                max="25"
                value={gravida}
                onChange={(e) => setGravida(Math.max(1, parseInt(e.target.value || '1', 10)))}
                className="h-11 rounded-xl text-sm focus-visible:ring-rose-500 font-mono font-bold"
              />
              <p className="text-[10px] text-gray-400 font-medium">Includes current pregnancy.</p>
            </div>

            {/* Para */}
            <div className="space-y-1.5">
              <Label htmlFor="para" className="text-xs font-bold text-gray-700">
                Para (Past Viable Deliveries)
              </Label>
              <Input
                id="para"
                name="para"
                type="number"
                min="0"
                max="25"
                value={para}
                onChange={(e) => setPara(Math.max(0, parseInt(e.target.value || '0', 10)))}
                className="h-11 rounded-xl text-sm focus-visible:ring-rose-500 font-mono font-bold"
              />
              <p className="text-[10px] text-gray-400 font-medium">Deliveries reaching viable gestational age.</p>
            </div>
          </div>

          {/* Live Obstetric Preview Banner */}
          {obstetricPreview?.isValid && (
            <div className="p-4 rounded-2xl bg-gradient-to-r from-rose-50 to-pink-50/60 border border-rose-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-in fade-in duration-200">
              <div className="space-y-1">
                <span className="text-[10px] font-black uppercase tracking-widest text-rose-500">
                  Calculated Gestational Baseline (Naegele&apos;s Rule)
                </span>
                <div className="flex items-center gap-3">
                  <span className="text-xl font-black text-rose-900 tracking-tight">
                    {obstetricPreview.aogDetailed}
                  </span>
                  <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-white text-rose-600 border border-rose-200">
                    {obstetricPreview.trimester}
                  </span>
                </div>
              </div>

              <div className="sm:text-right space-y-0.5">
                <span className="text-[10px] font-black uppercase tracking-wider text-gray-400">
                  Estimated Date of Confinement (EDC)
                </span>
                <p className="text-sm font-black text-gray-900">
                  {obstetricPreview.edcFormatted}
                </p>
              </div>
            </div>
          )}

          {/* High-Risk Clinical Flagging Checkbox */}
          <div className="pt-2 border-t border-gray-100">
            <label className="flex items-start gap-3 p-3.5 rounded-2xl border border-gray-200 bg-gray-50/70 hover:bg-amber-50/50 hover:border-amber-200 transition-colors cursor-pointer">
              <input
                type="checkbox"
                name="is_high_risk"
                checked={isHighRisk}
                onChange={(e) => setIsHighRisk(e.target.checked)}
                className="w-4 h-4 mt-0.5 accent-amber-600 rounded text-amber-600 cursor-pointer"
              />
              <div className="space-y-0.5">
                <span className="text-xs font-bold text-gray-900 flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                  Flag this mother for High-Risk Obstetric Monitoring
                </span>
                <p className="text-[11px] text-gray-500">
                  Marks the chart with an amber clinical alert beacon for history of hypertension, diabetes, previous C-section, or maternal age extremes.
                </p>
              </div>
            </label>
          </div>
        </CardContent>
      </Card>

      {/* ── Actions Footer ── */}
      <div className="flex items-center justify-between pt-2">
        <Link href="/admin/patients">
          <Button
            type="button"
            variant="outline"
            className="h-11 px-6 rounded-2xl text-xs font-bold text-gray-600 border-gray-200"
          >
            <ArrowLeft className="w-3.5 h-3.5 mr-1.5" /> Cancel
          </Button>
        </Link>

        <Button
          type="submit"
          disabled={isPending}
          className="bg-emerald-600 hover:bg-emerald-700 text-white h-12 px-8 rounded-2xl font-black text-xs shadow-md shadow-emerald-200 transition-all active:scale-[0.98] gap-2"
        >
          <UserPlus className="w-4 h-4" />
          <span>{isPending ? 'Registering Patient & Initializing Episode...' : 'Complete Patient Intake'}</span>
        </Button>
      </div>
    </form>
  );
}
