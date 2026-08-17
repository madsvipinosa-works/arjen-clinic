import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle2, ShieldCheck } from "lucide-react";
import { createClient } from "@/utils/supabase/server";
import { createAppointment } from "../../(auth)/actions";
import { BookingWizard } from "@/components/forms/booking-wizard";

async function getScheduleContext(supabase, user) {
  // Active configurable time slots
  const { data: slots } = await supabase
    .from("time_slots")
    .select("id, label, max_capacity")
    .eq("is_active", true)
    .order("sort_order", { ascending: true });

  const { data: settings } = await supabase
    .from("clinic_settings")
    .select("block_saturday, block_sunday, services, clinic_contact, clinic_address")
    .eq("id", 1)
    .single();

  // Blocked specific dates
  const { data: blocked } = await supabase
    .from("blocked_dates")
    .select("blocked_date");
  const blockedDates = blocked?.map((b) => b.blocked_date) || [];

  // Count approved/pending appointments per date+slot label
  const { data: appts } = await supabase
    .from("appointments")
    .select("appointment_date, time_preference")
    .neq("status", "Rejected");

  // Build load map: { "2026-05-01": { "7:30 AM - 8:30 AM": 4, ... } }
  const loadMap = {};
  appts?.forEach((a) => {
    if (!a.appointment_date || !a.time_preference) return;
    if (!loadMap[a.appointment_date]) loadMap[a.appointment_date] = {};
    const label = a.time_preference;
    loadMap[a.appointment_date][label] = (loadMap[a.appointment_date][label] || 0) + 1;
  });

  return {
    timeSlots: slots || [],
    blockedDates,
    loadMap,
    services: settings?.services || [],
    clinicContact: settings?.clinic_contact || "+63 (123) 456-7890",
    clinicAddress: settings?.clinic_address || "Dasmariñas City, Cavite",
    blockSaturday: settings?.block_saturday || false,
    blockSunday:   settings?.block_sunday   || false,
    userProfile: {
      fullName: user?.user_metadata?.full_name || user?.user_metadata?.name || "",
      email: user?.email || "",
    }
  };
}

export default async function BookingPage({ searchParams }) {
  const params = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const scheduleContext = user ? await getScheduleContext(supabase, user) : {};

  // Unauthenticated gate
  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="max-w-md w-full border-none shadow-xl shadow-gray-200/50 p-6 text-center">
          <CardHeader>
            <CardTitle className="text-2xl font-bold text-gray-900">Sign In Required</CardTitle>
            <CardDescription>
              Please log in or register to securely book your appointment.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/login">
              <Button className="bg-rose-500 hover:bg-rose-600 text-white w-full rounded-full h-12 text-base font-medium mt-2">
                Login to Continue
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen bg-gradient-to-b from-rose-50/50 via-white to-rose-50/20 pt-6 pb-16 md:pt-8 md:pb-24 px-4 overflow-hidden">
      {/* Decorative ambient background glows matching landing page */}
      <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute top-8 left-1/4 h-48 w-48 rounded-full bg-rose-200/25 blur-3xl" />
        <div className="absolute top-20 right-1/4 h-56 w-56 rounded-full bg-pink-200/30 blur-3xl" />
      </div>

      <div className="container mx-auto max-w-3xl">
        {/* Header with reduced top space & elegant serif branding */}
        <div className="text-center mb-6 md:mb-8">
          <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-rose-500/10 px-4 py-1 text-xs font-bold text-rose-700 ring-1 ring-rose-500/20 shadow-sm">
            <ShieldCheck className="h-3.5 w-3.5 text-rose-600" />
            PhilHealth Accredited · Certified OB-GYN
          </div>

          <h1 className="font-serif text-3xl sm:text-4xl md:text-5xl font-black text-slate-900 tracking-tight leading-[1.15]">
            Request an Appointment
          </h1>
          <p className="text-slate-600 text-xs sm:text-sm md:text-base max-w-lg mx-auto mt-2 leading-relaxed">
            Answer a few quick questions to secure your clinic schedule. Our medical staff will confirm your slot shortly.
          </p>
        </div>

        {params?.success && (
          <div className="bg-emerald-50 text-emerald-800 p-4 sm:p-5 rounded-2xl mb-6 flex items-center justify-center gap-3 border border-emerald-200 shadow-md animate-in fade-in slide-in-from-top-4 duration-500">
            <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
            <span className="font-bold text-sm sm:text-base">
              Perfect! Your appointment request has been securely submitted.
            </span>
          </div>
        )}

        {params?.error && (
          <div className="bg-rose-50 border-2 border-rose-200 text-rose-900 p-4 sm:p-5 rounded-2xl mb-6 shadow-md text-center animate-in fade-in slide-in-from-top-4 duration-500 space-y-1.5">
            <div className="flex items-center justify-center gap-2 font-bold text-sm sm:text-base text-rose-700">
              <span className="text-lg">⚠️</span> {params.error}
            </div>
            {params.error.toLowerCase().includes("booked") && (
              <p className="text-xs text-rose-600 font-medium">
                💡 <span className="font-bold">Tip:</span> If the morning shift is full, try selecting an afternoon window, or choose the next available clinic day.
              </p>
            )}
          </div>
        )}

        <BookingWizard formAction={createAppointment} scheduleContext={scheduleContext} />
      </div>
    </div>
  );
}
