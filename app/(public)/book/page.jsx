import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle2, ShieldCheck, Calendar, Download, ExternalLink, Sparkles, UserCheck } from "lucide-react";
import { createClient } from "@/utils/supabase/server";
import { createAppointment } from "../../(auth)/actions";
import { BookingWizard } from "@/components/forms/booking-wizard";

function getGoogleCalendarUrl({ service, date, time, clinicAddress }) {
  const title = encodeURIComponent(`${service || 'Clinic Appointment'} — AR-JEN Maternity Clinic`);
  const details = encodeURIComponent(
    `Confirmed maternal appointment at AR-JEN Maternity Clinic.\n\n` +
    `Service: ${service || 'Maternal Care'}\n` +
    `Scheduled Date: ${date || 'Today'}\n` +
    `Time Window: ${time || 'Scheduled Shift'}\n` +
    `Location: ${clinicAddress || 'Dasmariñas City, Cavite'}\n\n` +
    `Clinic Reminders:\n` +
    `• Please arrive 15 minutes early for initial vitals screening.\n` +
    `• Bring your Pink Mother & Child Passport.\n` +
    `• Bring a valid government ID or PhilHealth Member Data Record (MDR).`
  );
  const location = encodeURIComponent(clinicAddress || 'AR-JEN Maternity Clinic, Dasmariñas City, Cavite');

  const cleanDate = (date || '').replace(/-/g, '');
  let startHour = 8;
  let endHour = 10;
  if (time) {
    const upper = time.toUpperCase();
    if (upper.includes('PM') && !upper.startsWith('11') && !upper.startsWith('12')) {
      startHour = 13;
      endHour = 15;
    }
  }
  const utcStartH = String((startHour - 8 + 24) % 24).padStart(2, '0');
  const utcEndH = String((endHour - 8 + 24) % 24).padStart(2, '0');
  const datesParam = `${cleanDate}T${utcStartH}0000Z/${cleanDate}T${utcEndH}0000Z`;

  return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${datesParam}&details=${details}&location=${location}`;
}

function getIcsDownloadUrl({ service, date, time, clinicAddress }) {
  const cleanDate = (date || '').replace(/-/g, '');
  let startHour = "080000";
  let endHour = "100000";
  if (time && time.toUpperCase().includes('PM')) {
    startHour = "130000";
    endHour = "150000";
  }
  const icsContent = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//AR-JEN Maternity Clinic//Public Booking//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `SUMMARY:${service || 'Clinic Appointment'} — AR-JEN Maternity Clinic`,
    `DESCRIPTION:Confirmed appointment at AR-JEN Maternity Clinic. Time: ${time || 'Scheduled Shift'}. Bring your Pink Mother & Child Passport.`,
    `LOCATION:${clinicAddress || 'AR-JEN Maternity Clinic, Dasmariñas City, Cavite'}`,
    `DTSTART;TZID=Asia/Manila:${cleanDate}T${startHour}`,
    `DTEND;TZID=Asia/Manila:${cleanDate}T${endHour}`,
    "STATUS:CONFIRMED",
    "END:VEVENT",
    "END:VCALENDAR"
  ].join("\r\n");

  return `data:text/calendar;charset=utf8,${encodeURIComponent(icsContent)}`;
}

async function getScheduleContext(supabase, user) {
  // Active configurable time slots
  const { data: slots } = await supabase
    .from("time_slots")
    .select("id, label, max_capacity, start_time, end_time")
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

        {(() => {
          const isAutoApproved = params?.success && params?.status === 'Approved';
          const isSubmitted = params?.success && !isAutoApproved;
          const calendarService = params?.service || "Maternal Care Appointment";
          const calendarDate = params?.date || "";
          const calendarTime = params?.time || "";
          const clinicAddress = scheduleContext?.clinicAddress || "Dasmariñas City, Cavite";

          const googleCalUrl = (calendarDate && calendarTime)
            ? getGoogleCalendarUrl({ service: calendarService, date: calendarDate, time: calendarTime, clinicAddress })
            : null;

          const icsDownloadUrl = (calendarDate && calendarTime)
            ? getIcsDownloadUrl({ service: calendarService, date: calendarDate, time: calendarTime, clinicAddress })
            : null;

          if (isAutoApproved) {
            return (
              <div className="bg-emerald-50/80 backdrop-blur-sm text-emerald-900 p-6 sm:p-8 rounded-3xl mb-6 flex flex-col items-center justify-center gap-3 border border-emerald-200/60 shadow-lg shadow-emerald-500/10 animate-in fade-in slide-in-from-top-4 duration-700 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-teal-400/20 blur-3xl rounded-full" />
                <div className="absolute bottom-0 left-0 w-32 h-32 bg-emerald-400/20 blur-3xl rounded-full" />
                <div className="bg-white p-3 rounded-2xl shadow-sm mb-2 border border-emerald-100 z-10">
                  <CheckCircle2 className="w-8 h-8 text-emerald-500" />
                </div>
                <div className="text-center z-10 space-y-1.5">
                  <span className="inline-block px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-[10px] font-black uppercase tracking-wider mb-1">
                    Smart Triage: Auto-Approved
                  </span>
                  <h3 className="font-black text-xl sm:text-2xl text-emerald-950">You&apos;re all set!</h3>
                  <p className="font-medium text-sm text-emerald-700 max-w-md mx-auto leading-relaxed">
                    Your appointment has been instantly approved by our clinical smart triage system without waiting for staff review. A confirmation email with your schedule and clinic reminders has been sent to your inbox.
                  </p>
                </div>

                {/* 1-Click Calendar Synchronization & Patient Portal Action Buttons */}
                <div className="flex flex-wrap items-center justify-center gap-2.5 mt-2 z-10">
                  {googleCalUrl && (
                    <a
                      href={googleCalUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] text-white font-bold text-xs flex items-center gap-1.5 shadow-md shadow-emerald-600/20 transition-all cursor-pointer"
                    >
                      <Calendar className="w-4 h-4" />
                      <span>Add to Google Calendar</span>
                    </a>
                  )}

                  {icsDownloadUrl && (
                    <a
                      href={icsDownloadUrl}
                      download="arjen-appointment.ics"
                      className="py-2.5 px-4 rounded-xl bg-white hover:bg-emerald-50 active:scale-[0.98] text-emerald-800 border border-emerald-200 font-bold text-xs flex items-center gap-1.5 shadow-xs transition-all cursor-pointer"
                    >
                      <Download className="w-4 h-4 text-emerald-600" />
                      <span>Download .ics Slip</span>
                    </a>
                  )}

                  <Link
                    href="/patient/appointments"
                    className="py-2.5 px-4 rounded-xl bg-white hover:bg-emerald-50 active:scale-[0.98] text-emerald-800 border border-emerald-200 font-bold text-xs flex items-center gap-1.5 shadow-xs transition-all cursor-pointer"
                  >
                    <UserCheck className="w-4 h-4 text-emerald-600" />
                    <span>View in Portal</span>
                  </Link>
                </div>
              </div>
            );
          }

          if (isSubmitted) {
            return (
              <div className="bg-emerald-50 text-emerald-800 p-5 rounded-3xl mb-6 border border-emerald-200 shadow-md animate-in fade-in slide-in-from-top-4 duration-500 space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-white flex items-center justify-center shadow-xs border border-emerald-100 shrink-0">
                    <CheckCircle2 className="w-6 h-6 text-emerald-500" />
                  </div>
                  <div>
                    <h4 className="font-black text-sm text-emerald-950">Appointment Request Received</h4>
                    <p className="font-medium text-xs text-emerald-700">
                      Your appointment request has been scheduled in our queue. Our clinical staff will review your notes and finalize your slot promptly.
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-emerald-200/80">
                  {googleCalUrl && (
                    <a
                      href={googleCalUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer"
                    >
                      <Calendar className="w-3.5 h-3.5" />
                      <span>Add to Calendar</span>
                    </a>
                  )}
                  <Link
                    href="/patient/appointments"
                    className="py-2 px-3 rounded-xl bg-white hover:bg-emerald-100/70 text-emerald-800 border border-emerald-200 font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer"
                  >
                    <ExternalLink className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Track in Patient Portal</span>
                  </Link>
                </div>
              </div>
            );
          }

          return null;
        })()}

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
