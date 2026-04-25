'use client';

import { useState, useTransition } from 'react';
import { Pencil, Save, X, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { updatePatient } from '@/app/actions';

const BLOOD_TYPES = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

function InfoRow({ label, value }) {
  return (
    <div className="space-y-1">
      <p className="text-xs font-black text-gray-400 uppercase tracking-widest">{label}</p>
      <p className="text-sm font-semibold text-gray-900">{value || <span className="text-gray-300 italic">Not set</span>}</p>
    </div>
  );
}

export function PatientProfileTab({ patient }) {
  const [editing, setEditing] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState(null);

  const handleSubmit = (e) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      const result = await updatePatient(fd);
      if (result?.success === false) {
        setError(result.error);
      } else {
        setEditing(false);
        setError(null);
      }
    });
  };

  // Gestational age computation
  let gestationalAge = null;
  let edcDisplay = null;
  if (patient.lmp) {
    const lmpDate = new Date(patient.lmp);
    const today = new Date();
    const diffDays = Math.floor((today - lmpDate) / (1000 * 60 * 60 * 24));
    const weeks = Math.floor(diffDays / 7);
    const days = diffDays % 7;
    gestationalAge = `${weeks} weeks + ${days} days`;
    const edc = new Date(lmpDate.getTime() + 280 * 24 * 60 * 60 * 1000);
    edcDisplay = edc.toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' });
  }

  if (!editing) {
    return (
      <div className="space-y-6">
        {/* Gestational Age Banner */}
        {gestationalAge && (
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-rose-50 border border-rose-100 rounded-2xl p-5 text-center">
              <p className="text-xs font-black text-rose-400 uppercase tracking-widest mb-1">Gestational Age</p>
              <p className="text-2xl font-black text-rose-700">{gestationalAge}</p>
            </div>
            <div className="bg-violet-50 border border-violet-100 rounded-2xl p-5 text-center">
              <p className="text-xs font-black text-violet-400 uppercase tracking-widest mb-1">Est. Date of Confinement</p>
              <p className="text-lg font-black text-violet-700">{edcDisplay}</p>
            </div>
          </div>
        )}

        {/* Profile Grid */}
        <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center">
                <User className="w-5 h-5 text-gray-500" />
              </div>
              <h3 className="font-black text-gray-900">Patient Profile</h3>
            </div>
            <Button onClick={() => setEditing(true)} variant="outline" size="sm" className="gap-2 hover:border-emerald-300 hover:text-emerald-700">
              <Pencil className="w-3.5 h-3.5" /> Edit Profile
            </Button>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
            <InfoRow label="Full Name" value={patient.full_name} />
            <InfoRow label="Date of Birth" value={patient.date_of_birth ? new Date(patient.date_of_birth).toLocaleDateString() : null} />
            <InfoRow label="Age" value={patient.age} />
            <InfoRow label="Civil Status" value={patient.civil_status} />
            <InfoRow label="Husband / Partner" value={patient.husband_partner_name} />
            <InfoRow label="Blood Type" value={patient.blood_type} />
            <InfoRow label="Contact Number" value={patient.contact_number} />
            <InfoRow label="LMP" value={patient.lmp ? new Date(patient.lmp).toLocaleDateString() : null} />
            <div className="col-span-2 md:col-span-1">
              <InfoRow label="Address" value={patient.address} />
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white border-2 border-emerald-200 rounded-2xl p-6 shadow-sm space-y-6">
      <input type="hidden" name="id" value={patient.id} />
      <div className="flex items-center justify-between">
        <h3 className="font-black text-gray-900">Editing Profile</h3>
        <Button type="button" variant="ghost" size="sm" onClick={() => setEditing(false)} className="gap-1 text-gray-500">
          <X className="w-3.5 h-3.5" /> Cancel
        </Button>
      </div>

      {error && <div className="bg-red-50 text-red-600 text-sm p-3 rounded-lg border border-red-100">{error}</div>}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div className="md:col-span-2 space-y-2">
          <Label htmlFor="edit_full_name" className="font-bold">Full Name <span className="text-rose-500">*</span></Label>
          <Input id="edit_full_name" name="full_name" defaultValue={patient.full_name} required className="focus-visible:ring-emerald-500" />
        </div>
        <div className="space-y-2">
          <Label className="font-bold">Date of Birth</Label>
          <Input name="date_of_birth" type="date" defaultValue={patient.date_of_birth} className="focus-visible:ring-emerald-500" />
        </div>
        <div className="space-y-2">
          <Label className="font-bold">Age</Label>
          <Input name="age" type="number" defaultValue={patient.age} min="10" max="60" className="focus-visible:ring-emerald-500" />
        </div>
        <div className="space-y-2">
          <Label className="font-bold">Civil Status</Label>
          <select name="civil_status" defaultValue={patient.civil_status || ''} className="w-full h-10 rounded-md border border-input bg-white px-3 text-sm focus:ring-2 focus:ring-emerald-500/20 focus:outline-none">
            <option value="">Select status</option>
            {['Single','Married','Widowed','Separated','Live-in'].map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <div className="space-y-2">
          <Label className="font-bold">Husband / Partner Name</Label>
          <Input name="husband_partner_name" defaultValue={patient.husband_partner_name} className="focus-visible:ring-emerald-500" />
        </div>
        <div className="space-y-2">
          <Label className="font-bold">Contact Number</Label>
          <Input name="contact_number" defaultValue={patient.contact_number} className="focus-visible:ring-emerald-500" />
        </div>
        <div className="space-y-2">
          <Label className="font-bold">Blood Type</Label>
          <select name="blood_type" defaultValue={patient.blood_type || ''} className="w-full h-10 rounded-md border border-input bg-white px-3 text-sm focus:ring-2 focus:ring-emerald-500/20 focus:outline-none">
            <option value="">Select blood type</option>
            {BLOOD_TYPES.map(bt => <option key={bt} value={bt}>{bt}</option>)}
          </select>
        </div>
        <div className="space-y-2">
          <Label className="font-bold">LMP (Last Menstrual Period)</Label>
          <Input name="lmp" type="date" defaultValue={patient.lmp} className="focus-visible:ring-emerald-500" />
        </div>
        <div className="md:col-span-2 space-y-2">
          <Label className="font-bold">Address</Label>
          <Input name="address" defaultValue={patient.address} className="focus-visible:ring-emerald-500" />
        </div>
      </div>

      <div className="flex justify-end pt-4 border-t border-gray-100">
        <Button type="submit" disabled={isPending} className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2 px-8">
          <Save className="w-4 h-4" />
          {isPending ? 'Saving...' : 'Save Profile'}
        </Button>
      </div>
    </form>
  );
}
