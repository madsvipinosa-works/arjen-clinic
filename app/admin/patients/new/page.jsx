// app/admin/patients/new/page.jsx
import { createPatient } from '../../../actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import Link from 'next/link';
import { ArrowLeft, UserPlus } from 'lucide-react';

export default function NewPatientPage() {
  return (
    <div className="max-w-4xl">
      {/* Header */}
      <div className="mb-8 flex items-center gap-4">
        <Link
          href="/admin/patients"
          className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-800 font-semibold transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Patients
        </Link>
      </div>

      <div className="flex items-center gap-4 mb-8">
        <div className="w-12 h-12 bg-emerald-500 rounded-2xl flex items-center justify-center shadow-lg shadow-emerald-100">
          <UserPlus className="w-6 h-6 text-white" />
        </div>
        <div>
          <h1 className="text-3xl font-black text-gray-900 tracking-tight">Register New Patient</h1>
          <p className="text-gray-500 font-medium mt-1">Fill in the patient's complete demographic and clinical intake information.</p>
        </div>
      </div>

      <form action={createPatient} className="space-y-8">
        {/* Personal Information */}
        <Card className="border-none shadow-md">
          <CardHeader className="border-b bg-gray-50/50 pb-5 rounded-t-xl">
            <CardTitle className="text-base">Personal Information</CardTitle>
            <CardDescription>Basic identity and contact details.</CardDescription>
          </CardHeader>
          <CardContent className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="md:col-span-2 space-y-2">
              <Label htmlFor="full_name" className="font-bold text-gray-700">Full Name <span className="text-rose-500">*</span></Label>
              <Input id="full_name" name="full_name" placeholder="e.g. Maria Santos" required className="h-11 focus-visible:ring-emerald-500" />
            </div>

            <div className="space-y-2">
              <Label htmlFor="date_of_birth" className="font-bold text-gray-700">Date of Birth</Label>
              <Input id="date_of_birth" name="date_of_birth" type="date" className="h-11 focus-visible:ring-emerald-500" />
            </div>

            <div className="space-y-2">
              <Label htmlFor="age" className="font-bold text-gray-700">Age</Label>
              <Input id="age" name="age" type="number" placeholder="e.g. 27" min="10" max="60" className="h-11 focus-visible:ring-emerald-500" />
            </div>

            <div className="space-y-2">
              <Label htmlFor="civil_status" className="font-bold text-gray-700">Civil Status</Label>
              <select id="civil_status" name="civil_status" className="w-full h-11 rounded-md border border-input bg-white px-3 text-sm focus:ring-2 focus:ring-emerald-500/20 focus:outline-none">
                <option value="">Select status</option>
                <option value="Single">Single</option>
                <option value="Married">Married</option>
                <option value="Widowed">Widowed</option>
                <option value="Separated">Separated</option>
                <option value="Live-in">Live-in</option>
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="husband_partner_name" className="font-bold text-gray-700">Husband / Partner Name</Label>
              <Input id="husband_partner_name" name="husband_partner_name" placeholder="e.g. Juan Santos" className="h-11 focus-visible:ring-emerald-500" />
            </div>

            <div className="space-y-2">
              <Label htmlFor="contact_number" className="font-bold text-gray-700">Contact Number</Label>
              <Input id="contact_number" name="contact_number" placeholder="e.g. 09171234567" className="h-11 focus-visible:ring-emerald-500" />
            </div>

            <div className="space-y-2">
              <Label htmlFor="blood_type" className="font-bold text-gray-700">Blood Type</Label>
              <select id="blood_type" name="blood_type" className="w-full h-11 rounded-md border border-input bg-white px-3 text-sm focus:ring-2 focus:ring-emerald-500/20 focus:outline-none">
                <option value="">Select blood type</option>
                {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map(bt => (
                  <option key={bt} value={bt}>{bt}</option>
                ))}
              </select>
            </div>

            <div className="md:col-span-2 space-y-2">
              <Label htmlFor="address" className="font-bold text-gray-700">Home Address</Label>
              <Input id="address" name="address" placeholder="e.g. Brgy. Salitran, Dasmariñas City, Cavite" className="h-11 focus-visible:ring-emerald-500" />
            </div>
          </CardContent>
        </Card>

        {/* Clinical Information */}
        <Card className="border-none shadow-md">
          <CardHeader className="border-b bg-rose-50/50 pb-5 rounded-t-xl">
            <CardTitle className="text-base text-rose-800">Clinical / Obstetric Information</CardTitle>
            <CardDescription>Required for prenatal tracking and EDC calculation.</CardDescription>
          </CardHeader>
          <CardContent className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="lmp" className="font-bold text-gray-700">
                Last Menstrual Period (LMP)
              </Label>
              <Input id="lmp" name="lmp" type="date" className="h-11 focus-visible:ring-rose-500" />
              <p className="text-xs text-gray-400 font-medium">The Estimated Date of Confinement (EDC) will be calculated automatically.</p>
            </div>
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex items-center justify-end gap-4 pt-4 border-t border-gray-100">
          <Link href="/admin/patients">
            <Button type="button" variant="outline" className="h-12 px-8 rounded-xl">
              Cancel
            </Button>
          </Link>
          <Button type="submit" className="bg-emerald-600 hover:bg-emerald-700 text-white h-12 px-10 rounded-xl font-bold shadow-lg shadow-emerald-100">
            <UserPlus className="w-4 h-4 mr-2" />
            Register Patient
          </Button>
        </div>
      </form>
    </div>
  );
}
