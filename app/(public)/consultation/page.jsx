// app/(public)/consultation/page.jsx
// AR-JEN Maternity & Lying-In Clinic: Online Teleconsultation Public Portal

import Link from 'next/link';
import { 
  MessageSquare, ShieldCheck, Clock, AlertTriangle, Phone, 
  CheckCircle2, ArrowRight, HeartPulse, UserCheck, Sparkles 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { createClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';

export const metadata = {
  title: 'Online Teleconsultation | AR-JEN Maternity Clinic',
  description: 'Asynchronous clinical messaging and maternal triage guidance with AR-JEN registered midwives and attending physicians.',
};

export default async function PublicConsultationPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // If user is already authenticated, redirect straight to their personal consultation thread
  if (user) {
    redirect('/patient/consultation');
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-rose-50/50 via-white to-slate-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto space-y-10">

        {/* Hero Section */}
        <div className="text-center space-y-4">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-rose-100 text-rose-800 text-xs font-bold tracking-wide">
            <HeartPulse className="w-4 h-4 text-rose-600" />
            <span>Maternal Health Teleconsultation</span>
          </div>

          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight text-gray-900">
            Professional Midwife & OB Triage <br />
            <span className="text-rose-600">From the Safety of Your Home</span>
          </h1>

          <p className="text-sm sm:text-base text-gray-600 max-w-2xl mx-auto leading-relaxed">
            AR-JEN Maternity & Lying-In Clinic offers private, encrypted asynchronous messaging for non-emergency maternal guidance, prenatal symptom clarification, and routine pregnancy advice.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            <Link href="/login?redirect=/patient/consultation">
              <Button size="lg" className="w-full sm:w-auto bg-rose-600 hover:bg-rose-700 text-white rounded-2xl font-bold px-8 shadow-md shadow-rose-200 gap-2">
                <span>Sign In to Start Consultation</span>
                <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
            <Link href="/register">
              <Button size="lg" variant="outline" className="w-full sm:w-auto rounded-2xl font-bold px-6 border-gray-300 hover:bg-gray-50">
                <span>Create New Patient Account</span>
              </Button>
            </Link>
          </div>
        </div>

        {/* Obstetric Emergency Triage Advisory (Red Flag Warning) */}
        <div className="p-6 rounded-3xl bg-red-50 border border-red-200 shadow-sm space-y-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-red-600 text-white flex items-center justify-center shrink-0 shadow-sm">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-red-950">
                Emergency Protocol & Acute Danger Signs
              </h3>
              <p className="text-xs text-red-800">
                Online consultation is strictly for <strong>non-emergency</strong> inquiries.
              </p>
            </div>
          </div>

          <p className="text-xs text-red-900 leading-relaxed">
            If you or your baby are experiencing any of the following acute symptoms, <strong>do not wait for an online reply</strong>. Proceed immediately to AR-JEN Maternity Clinic or the nearest hospital emergency room:
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs font-semibold text-red-900">
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-red-600" />
              <span>Active vaginal bleeding or spotting</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-red-600" />
              <span>Sudden gush or continuous leakage of water</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-red-600" />
              <span>Severe, unremitting abdominal or pelvic pain</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-red-600" />
              <span>Significantly decreased or absent baby movements</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-red-600" />
              <span>Severe headache with blurred vision (Pre-eclampsia)</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-red-600" />
              <span>High fever, chills, or persistent vomiting</span>
            </div>
          </div>

          <div className="pt-2 border-t border-red-200 flex flex-wrap items-center justify-between gap-2">
            <span className="text-xs font-bold text-red-800">24/7 Lying-In Emergency Hotline:</span>
            <a href="tel:09171234567" className="text-xs font-black text-red-700 hover:underline flex items-center gap-1">
              <Phone className="w-3.5 h-3.5" /> +63 917 123 4567 / (02) 8123-4567
            </a>
          </div>
        </div>

        {/* Feature Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="rounded-3xl border-gray-100 shadow-sm bg-white overflow-hidden">
            <CardContent className="p-6 space-y-3">
              <div className="w-10 h-10 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center">
                <UserCheck className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-base text-gray-900">Registered Midwives & Doctors</h3>
              <p className="text-xs text-gray-500 leading-relaxed">
                Direct responses from AR-JEN licensed clinical staff who have access to your ongoing prenatal records and history.
              </p>
            </CardContent>
          </Card>

          <Card className="rounded-3xl border-gray-100 shadow-sm bg-white overflow-hidden">
            <CardContent className="p-6 space-y-3">
              <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-base text-gray-900">DPA 2012 Encrypted</h3>
              <p className="text-xs text-gray-500 leading-relaxed">
                Your medical inquiries and health data are stored securely under Republic Act No. 10173 privacy and security standards.
              </p>
            </CardContent>
          </Card>

          <Card className="rounded-3xl border-gray-100 shadow-sm bg-white overflow-hidden">
            <CardContent className="p-6 space-y-3">
              <div className="w-10 h-10 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center">
                <Clock className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-base text-gray-900">Clinic Response Hours</h3>
              <p className="text-xs text-gray-500 leading-relaxed">
                Teleconsultations are reviewed Monday to Saturday, 8:00 AM to 5:00 PM. Messages sent after hours are triaged the next morning.
              </p>
            </CardContent>
          </Card>
        </div>

      </div>
    </div>
  );
}
