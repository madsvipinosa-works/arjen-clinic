"use client";

import { useState, useEffect, useCallback, useRef, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  Ticket,
  Clock,
  Sparkles,
  Footprints,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Volume2,
  VolumeX,
  BellRing,
  RefreshCw,
  Search,
  ShieldCheck,
  ChevronRight,
  Users
} from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import { fetchTicketStatus, markPatientReturning } from "@/app/actions";

function playAlertChime() {
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();

    const playTone = (freq, time, duration) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, time);
      gain.gain.setValueAtTime(0, time);
      gain.gain.linearRampToValueAtTime(0.3, time + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.001, time + duration);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(time);
      osc.stop(time + duration);
    };

    const now = ctx.currentTime;
    playTone(587.33, now, 0.6);        // D5
    playTone(880.00, now + 0.18, 0.9); // A5
  } catch (err) {
    console.error("Audio error:", err);
  }
}

function triggerHapticFeedback() {
  try {
    if (typeof window !== "undefined" && "vibrate" in navigator) {
      navigator.vibrate([300, 150, 300, 150, 500]);
    }
  } catch (err) {
    console.error("Vibration error:", err);
  }
}

function PocketTrackerContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const rawTicket = searchParams.get("ticket") || "";

  const [ticketInput, setTicketInput] = useState(rawTicket);
  const [activeTicket, setActiveTicket] = useState(rawTicket.trim().toUpperCase());
  const [loading, setLoading] = useState(!!rawTicket);
  const [data, setData] = useState(null);
  const [errorMsg, setErrorMsg] = useState("");
  const [audioEnabled, setAudioEnabled] = useState(false);
  const [isReturningLoading, setIsReturningLoading] = useState(false);
  const [lastRefreshed, setLastRefreshed] = useState(null);

  const prevStatusRef = useRef(null);

  // Load ticket from local storage if parameter is not supplied
  useEffect(() => {
    if (!activeTicket && typeof window !== "undefined") {
      const savedTicket = localStorage.getItem("arjen_pocket_ticket");
      if (savedTicket) {
        setActiveTicket(savedTicket);
        setTicketInput(savedTicket);
      }
    }
  }, [activeTicket]);

  const loadTicket = useCallback(async (ticketNum) => {
    if (!ticketNum) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setErrorMsg("");

    try {
      const res = await fetchTicketStatus(ticketNum);
      if (res.success) {
        setData(res);
        setLastRefreshed(new Date());
        if (typeof window !== "undefined") {
          localStorage.setItem("arjen_pocket_ticket", ticketNum);
        }

        const currentStatus = res.ticket?.triageStatus?.toLowerCase();
        const prevStatus = prevStatusRef.current;

        // Trigger alert if status transitioned to Consultation or Vital Signs
        if (
          prevStatus &&
          prevStatus !== currentStatus &&
          (currentStatus === "consultation" || currentStatus === "vital signs")
        ) {
          triggerHapticFeedback();
          if (audioEnabled) {
            playAlertChime();
          }
        }
        prevStatusRef.current = currentStatus;
      } else {
        setErrorMsg(res.error || `Ticket ${ticketNum} was not found for today.`);
        setData(null);
      }
    } catch (err) {
      setErrorMsg("Failed to check queue status. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [audioEnabled]);

  // Initial load
  useEffect(() => {
    if (activeTicket) {
      loadTicket(activeTicket);
    }
  }, [activeTicket, loadTicket]);

  // Realtime subscription via Supabase
  useEffect(() => {
    if (!activeTicket) return;

    const supabase = createClient();
    const channel = supabase
      .channel(`pocket-queue-${activeTicket}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "appointments" },
        () => {
          loadTicket(activeTicket);
        }
      )
      .subscribe();

    // Fallback polling every 12 seconds
    const interval = setInterval(() => {
      loadTicket(activeTicket);
    }, 12000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(interval);
    };
  }, [activeTicket, loadTicket]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    const clean = ticketInput.trim().toUpperCase();
    if (!clean) return;
    setActiveTicket(clean);
    router.replace(`/queue/track?ticket=${clean}`);
  };

  const handleImReturning = async () => {
    if (!activeTicket || isReturningLoading) return;
    setIsReturningLoading(true);

    // Optimistic UI update
    setData((prev) =>
      prev
        ? {
            ...prev,
            ticket: {
              ...prev.ticket,
              triageStatus: "Returning",
            },
          }
        : prev
    );

    try {
      const res = await markPatientReturning(activeTicket);
      if (!res.success) {
        console.error("Failed to notify clinic:", res.error);
        loadTicket(activeTicket);
      }
    } catch (err) {
      console.error("Error marking returning:", err);
      loadTicket(activeTicket);
    } finally {
      setIsReturningLoading(false);
    }
  };

  const triageStatus = data?.ticket?.triageStatus?.toLowerCase();
  const isConsultation = triageStatus === "consultation";
  const isVitalSigns = triageStatus === "vital signs";
  const isSteppedOut = triageStatus === "stepped out";
  const isReturning = triageStatus === "returning";
  const isDischarged = triageStatus === "discharged" || data?.ticket?.overallStatus === "Completed";
  const isWaiting = triageStatus === "waiting" || !triageStatus;

  return (
    <div className="min-h-screen bg-gradient-to-b from-rose-50/70 via-white to-gray-50 text-slate-800 flex flex-col items-center justify-between p-4 sm:p-6 font-sans">
      
      {/* ── Top Header ────────────────────────────────────────── */}
      <header className="w-full max-w-md flex items-center justify-between py-2">
        <Link href="/" className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-rose-500 to-rose-600 flex items-center justify-center text-white font-black text-sm shadow-md shadow-rose-500/20">
            AJ
          </div>
          <div>
            <span className="text-sm font-black tracking-tight text-slate-900 block leading-tight">
              AR-JEN Clinic
            </span>
            <span className="text-[11px] font-bold text-rose-600 uppercase tracking-widest block">
              Pocket Queue Tracker
            </span>
          </div>
        </Link>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              const next = !audioEnabled;
              setAudioEnabled(next);
              if (next) {
                playAlertChime();
                triggerHapticFeedback();
              }
            }}
            className={`p-2.5 rounded-xl border transition-all text-xs font-bold flex items-center gap-1.5 cursor-pointer ${
              audioEnabled
                ? "bg-rose-50 text-rose-600 border-rose-200 shadow-xs"
                : "bg-white text-slate-400 border-gray-200"
            }`}
            title={audioEnabled ? "Turn Alert Chime ON" : "Turn Alert Chime OFF"}
          >
            {audioEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </button>

          {activeTicket && (
            <button
              type="button"
              onClick={() => loadTicket(activeTicket)}
              disabled={loading}
              className="p-2.5 rounded-xl bg-white border border-gray-200 text-slate-600 hover:text-slate-900 transition-all cursor-pointer shadow-2xs"
              title="Refresh queue status"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin text-rose-500" : ""}`} />
            </button>
          )}
        </div>
      </header>

      {/* ── Main Container ────────────────────────────────────── */}
      <main className="w-full max-w-md my-auto py-6 space-y-5">
        
        {/* Ticket Selector / Form if no ticket active */}
        {!activeTicket ? (
          <div className="bg-white/80 backdrop-blur-md rounded-3xl border border-gray-200/80 p-6 shadow-xl shadow-rose-500/5 space-y-5 text-center">
            <div className="w-16 h-16 rounded-2xl bg-rose-50 text-rose-600 mx-auto flex items-center justify-center">
              <Ticket className="w-8 h-8" />
            </div>

            <div className="space-y-1.5">
              <h1 className="text-xl font-black text-slate-900 tracking-tight">
                Track Your Queue Ticket
              </h1>
              <p className="text-xs text-slate-500">
                Enter the ticket code printed on your clinic slip or shown on your booking confirmation.
              </p>
            </div>

            <form onSubmit={handleSearchSubmit} className="space-y-3">
              <div className="relative">
                <input
                  type="text"
                  maxLength={8}
                  value={ticketInput}
                  onChange={(e) => setTicketInput(e.target.value.toUpperCase().slice(0, 8))}
                  placeholder="e.g. W-001 or P-004"
                  className="w-full px-4 py-3.5 rounded-2xl bg-gray-50 border border-gray-200 text-center font-mono text-2xl font-black tracking-widest text-slate-900 placeholder:text-gray-400 placeholder:font-sans placeholder:text-sm focus:outline-none focus:ring-2 focus:ring-rose-500/30 focus:border-rose-500 uppercase"
                  autoFocus
                />
              </div>

              <button
                type="submit"
                className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-rose-500 to-rose-600 text-white font-bold text-sm tracking-wide shadow-lg shadow-rose-500/25 active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>Track My Position</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          </div>
        ) : (
          <div className="space-y-4">
            
            {/* ── HERO TICKET CARD ────────────────────────────── */}
            <div className={`relative overflow-hidden rounded-3xl border shadow-xl transition-all duration-300 p-6 ${
              isConsultation
                ? "bg-rose-600 text-white border-rose-500 shadow-rose-500/30 ring-4 ring-rose-500/20 animate-pulse"
                : isVitalSigns
                ? "bg-indigo-600 text-white border-indigo-500 shadow-indigo-500/20"
                : isSteppedOut
                ? "bg-amber-50 text-amber-950 border-amber-300 shadow-amber-500/10"
                : isReturning
                ? "bg-cyan-50 text-cyan-950 border-cyan-300 shadow-cyan-500/10"
                : isDischarged
                ? "bg-emerald-50 text-emerald-950 border-emerald-300 shadow-emerald-500/10"
                : "bg-white/90 backdrop-blur-md text-slate-900 border-gray-200/90 shadow-rose-500/5"
            }`}>
              
              {/* Card top banner badge */}
              <div className="flex items-center justify-between mb-4">
                <span className={`text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full ${
                  isConsultation
                    ? "bg-white text-rose-600"
                    : isVitalSigns
                    ? "bg-white text-indigo-600"
                    : isSteppedOut
                    ? "bg-amber-200/80 text-amber-900"
                    : isReturning
                    ? "bg-cyan-200/80 text-cyan-900"
                    : isDischarged
                    ? "bg-emerald-200/80 text-emerald-900"
                    : "bg-rose-50 text-rose-600 border border-rose-100"
                }`}>
                  {data?.ticket?.serviceType || "Clinic Service"}
                </span>

                <button
                  type="button"
                  onClick={() => {
                    setActiveTicket("");
                    setTicketInput("");
                    setData(null);
                    if (typeof window !== "undefined") {
                      localStorage.removeItem("arjen_pocket_ticket");
                    }
                    router.replace("/queue/track");
                  }}
                  className={`text-xs font-bold underline transition-opacity cursor-pointer ${
                    isConsultation || isVitalSigns ? "text-white/80 hover:text-white" : "text-slate-400 hover:text-slate-600"
                  }`}
                >
                  Change
                </button>
              </div>

              {/* Big Ticket Number */}
              <div className="text-center my-2">
                <div className={`text-6xl sm:text-7xl font-mono font-black tracking-tight ${
                  isConsultation || isVitalSigns ? "text-white" : "text-slate-900"
                }`}>
                  {activeTicket}
                </div>
                <p className={`text-xs font-semibold tracking-wide mt-1 uppercase ${
                  isConsultation || isVitalSigns ? "text-white/80" : "text-slate-500"
                }`}>
                  Your Queue Ticket
                </p>
              </div>

              {/* Dynamic Status Display */}
              <div className="mt-6 pt-5 border-t border-current/10">
                {isConsultation && (
                  <div className="text-center space-y-2">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/20 text-white text-xs font-black uppercase tracking-wider">
                      <Sparkles className="w-3.5 h-3.5 animate-spin" />
                      Now Calling • Your Turn!
                    </div>
                    <h2 className="text-xl font-black text-white leading-tight">
                      Please Proceed to the Consultation Room
                    </h2>
                    <p className="text-xs text-white/90">
                      Our clinician is ready for your visit. Head inside immediately!
                    </p>
                  </div>
                )}

                {isVitalSigns && (
                  <div className="text-center space-y-2">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/20 text-white text-xs font-black uppercase tracking-wider">
                      <Sparkles className="w-3.5 h-3.5" />
                      Triage Station Calling
                    </div>
                    <h2 className="text-xl font-black text-white leading-tight">
                      Please Proceed for Vital Signs
                    </h2>
                    <p className="text-xs text-white/90">
                      Our midwife is taking your blood pressure and initial triage.
                    </p>
                  </div>
                )}

                {isSteppedOut && (
                  <div className="text-center space-y-3">
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-200 text-amber-900 text-xs font-black uppercase tracking-wider">
                      <Footprints className="w-3.5 h-3.5" />
                      Status: Stepped Out / Grace Hold
                    </div>
                    <h2 className="text-lg font-black text-amber-900 leading-tight">
                      Your number was called while away
                    </h2>
                    <p className="text-xs text-amber-800 leading-relaxed">
                      Don&apos;t worry! Your place is safely held on the grace shelf. When you return to the clinic, tap the button below so the midwife can resume your turn without delay.
                    </p>

                    <button
                      type="button"
                      onClick={handleImReturning}
                      disabled={isReturningLoading}
                      className="w-full py-3.5 px-4 rounded-2xl bg-amber-500 hover:bg-amber-600 active:scale-[0.98] text-white font-black text-sm tracking-wide shadow-lg shadow-amber-500/30 transition-all flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <Footprints className="w-4 h-4" />
                      <span>{isReturningLoading ? "Notifying Clinic..." : "I'm on My Way Back!"}</span>
                    </button>
                  </div>
                )}

                {isReturning && (
                  <div className="text-center space-y-2">
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-cyan-200 text-cyan-900 text-xs font-black uppercase tracking-wider animate-pulse">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Staff Notified: On Way Back
                    </div>
                    <h2 className="text-lg font-black text-cyan-900 leading-tight">
                      Midwives alerted that you are returning
                    </h2>
                    <p className="text-xs text-cyan-800">
                      Please approach the front desk or lobby triage upon arrival so you can be placed right back into the next open spot.
                    </p>
                  </div>
                )}

                {isDischarged && (
                  <div className="text-center space-y-2">
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-200 text-emerald-900 text-xs font-black uppercase tracking-wider">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Consultation Completed
                    </div>
                    <h2 className="text-lg font-black text-emerald-900 leading-tight">
                      Thank You for Visiting AR-JEN
                    </h2>
                    <p className="text-xs text-emerald-800">
                      Take care of yourself and your little one! We hope to see you at your next prenatal visit.
                    </p>
                  </div>
                )}

                {isWaiting && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-gray-50/80 rounded-2xl p-3.5 text-center border border-gray-100">
                        <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-0.5">
                          Ahead of You
                        </span>
                        <span className="text-3xl font-mono font-black text-rose-600 block">
                          {data?.patientsAhead ?? "—"}
                        </span>
                        <span className="text-[10px] text-slate-400 font-medium">
                          patient{(data?.patientsAhead ?? 0) === 1 ? "" : "s"} waiting
                        </span>
                      </div>

                      <div className="bg-gray-50/80 rounded-2xl p-3.5 text-center border border-gray-100">
                        <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-0.5">
                          Estimated Wait
                        </span>
                        <span className="text-3xl font-mono font-black text-slate-800 block">
                          ~{data?.estimatedWaitMinutes ?? 15}
                        </span>
                        <span className="text-[10px] text-slate-400 font-medium">
                          minutes
                        </span>
                      </div>
                    </div>

                    <div className="bg-rose-50/60 rounded-2xl p-3 border border-rose-100/80 flex items-start gap-2.5 text-left">
                      <Clock className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                      <p className="text-xs text-slate-600 leading-relaxed">
                        Feel free to sit in the shade or grab water nearby. Keep this page open—your phone will vibrate and alert you when your turn approaches!
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* ── CLINIC LIVE SNAPSHOT ────────────────────────── */}
            <div className="bg-white/80 backdrop-blur-md rounded-3xl border border-gray-200/80 p-5 shadow-sm space-y-3">
              <div className="flex items-center justify-between text-xs font-bold text-slate-500 uppercase tracking-wider">
                <span className="flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5 text-rose-500" />
                  Clinic Lobby Status
                </span>
                <span className="flex items-center gap-1.5 font-mono text-[10px] text-emerald-600">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                  Live Sync
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-1">
                <div className="bg-slate-50 rounded-2xl p-3 border border-gray-100">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    Now in Consultation
                  </span>
                  <span className="text-xl font-mono font-black text-slate-800 block mt-0.5">
                    {data?.nowServing || "—"}
                  </span>
                </div>

                <div className="bg-slate-50 rounded-2xl p-3 border border-gray-100">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    Now in Triage (BP)
                  </span>
                  <span className="text-xl font-mono font-black text-slate-800 block mt-0.5">
                    {data?.nowInTriage || "—"}
                  </span>
                </div>
              </div>
            </div>

            {/* Error Message if lookup failed */}
            {errorMsg && (
              <div className="bg-red-50 border border-red-200 rounded-2xl p-4 text-red-700 text-xs flex items-center gap-3">
                <AlertTriangle className="w-5 h-5 shrink-0 text-red-500" />
                <p>{errorMsg}</p>
              </div>
            )}

            {/* DPA 2012 Privacy Notice */}
            <div className="flex items-center justify-center gap-1.5 text-[11px] text-slate-400 font-medium">
              <ShieldCheck className="w-3.5 h-3.5 text-slate-400" />
              <span>Compliant with PH Data Privacy Act of 2012</span>
            </div>

          </div>
        )}

      </main>

      {/* ── Bottom Footer ─────────────────────────────────────── */}
      <footer className="w-full max-w-md text-center py-2 text-[11px] text-slate-400">
        <p>© AR-JEN Maternity & Lying-In Clinic</p>
        {lastRefreshed && (
          <p className="text-[10px] text-slate-400/80 mt-0.5 font-mono">
            Last updated: {lastRefreshed.toLocaleTimeString("en-PH", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: true })}
          </p>
        )}
      </footer>

    </div>
  );
}

export default function PocketTrackerPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-slate-50 flex items-center justify-center font-sans text-sm font-semibold text-slate-500">
        Loading Pocket Queue Tracker...
      </div>
    }>
      <PocketTrackerContent />
    </Suspense>
  );
}
