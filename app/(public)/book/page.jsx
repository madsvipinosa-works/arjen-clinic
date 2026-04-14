import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle2 } from "lucide-react";
import { createClient } from "@/utils/supabase/server";
import { createAppointment } from "../../(auth)/actions";
import { BookingWizard } from "@/components/forms/booking-wizard";

// Fetch everything the wizard needs to enforce scheduling rules
async function getScheduleContext(supabase) {
  // Active configurable time slots
  const { data: slots } = await supabase
    .from("time_slots")
    .select("id, label, max_capacity")
    .eq("is_active", true)
    .order("sort_order", { ascending: true });

  const { data: settings } = await supabase
    .from("clinic_settings")
    .select("block_saturday, block_sunday")
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
    blockSaturday: settings?.block_saturday || false,
    blockSunday:   settings?.block_sunday   || false,
  };
}

export default async function BookingPage({ searchParams }) {
  const params = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const scheduleContext = user ? await getScheduleContext(supabase) : {};

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
    <div className="min-h-screen bg-gray-50 py-12 md:py-24 px-4 overflow-hidden">
      <div className="container mx-auto max-w-3xl">
        <div className="text-center mb-10">
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4 tracking-tight">
            Request an Appointment
          </h1>
          <p className="text-gray-500 max-w-xl mx-auto">
            Answer a few quick questions to secure your clinic schedule. Our medical staff will
            confirm your slot shortly.
          </p>
        </div>

        {params?.success && (
          <div className="bg-emerald-50 text-emerald-800 p-5 rounded-2xl mb-8 flex items-center justify-center gap-3 border border-emerald-200 shadow-md animate-in fade-in slide-in-from-top-4 duration-500">
            <CheckCircle2 className="w-6 h-6 text-emerald-500" />
            <span className="font-semibold text-base">
              Perfect! Your appointment request has been securely submitted.
            </span>
          </div>
        )}

        {params?.error && (
          <div className="bg-red-50 text-red-800 p-5 rounded-2xl mb-8 border border-red-200 shadow-md text-center animate-in fade-in slide-in-from-top-4 duration-500">
            <span className="font-semibold text-base">{params.error}</span>
          </div>
        )}

        <BookingWizard formAction={createAppointment} scheduleContext={scheduleContext} />
      </div>
    </div>
  );
}
