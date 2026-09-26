"use client";

import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import {
  Clock,
  Volume2,
  VolumeX,
  Maximize2,
  Minimize2,
  Stethoscope,
  Activity,
  Users,
  CheckCircle2,
  Sparkles,
  Ticket,
  Footprints,
  RefreshCw
} from "lucide-react";
import { createClient } from "@/utils/supabase/client";

const SERVICE_LABELS = {
  prenatal: "Prenatal Check-up",
  delivery: "Safe Delivery",
  family: "Family Planning",
  general: "General Consult",
};

// Gentle, professional medical chime synthesizer using Web Audio API
function playClinicChime() {
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
      gain.gain.linearRampToValueAtTime(0.25, time + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.001, time + duration);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(time);
      osc.stop(time + duration);
    };

    const now = ctx.currentTime;
    playTone(587.33, now, 0.8);        // D5
    playTone(880.00, now + 0.22, 1.2); // A5
  } catch (e) {
    console.error("Audio chime error:", e);
  }
}

// Gentle, professional medical voice synthesizer
function speakTicketCall(ticketNumber, patientName, roomName = "Consultation Room 1") {
  try {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    const formattedTicket = (ticketNumber || "").replace("-", " ");
    const text = `Now calling. Ticket ${formattedTicket}. ${patientName || "Patient"}. Please proceed to ${roomName}.`;
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.88;
    utterance.pitch = 1.0;
    utterance.lang = "en-US";
    window.speechSynthesis.speak(utterance);
  } catch (err) {
    console.error("Speech announcement error:", err);
  }
}

export default function QueueDisplayPage() {
  const [mounted, setMounted] = useState(false);
  const [queue, setQueue] = useState([]);
  const [clinicInfo, setClinicInfo] = useState({ name: "AR-JEN Maternity and Lying-In Clinic" });
  const [currentTime, setCurrentTime] = useState("");
  const [currentDate, setCurrentDate] = useState("");
  const [audioEnabled, setAudioEnabled] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [lastCalledTicket, setLastCalledTicket] = useState(null);
  const [callingFlash, setCallingFlash] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);

  const prevConsultationRef = useRef(new Set());

  // 1. Clock timer
  useEffect(() => {
    setMounted(true);
    setLastUpdated(new Date());

    const updateTime = () => {
      const now = new Date();
      setCurrentTime(
        now.toLocaleTimeString("en-PH", {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
          hour12: true,
        })
      );
      setCurrentDate(
        now.toLocaleDateString("en-PH", {
          weekday: "long",
          year: "numeric",
          month: "long",
          day: "numeric",
        })
      );
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // 2. Fetch initial queue data
  const fetchQueue = async () => {
    try {
      const res = await fetch("/api/queue", { cache: "no-store" });
      const data = await res.json();
      if (data?.success) {
        setClinicInfo(data.clinic || { name: "AR-JEN Maternity and Lying-In Clinic" });
        setQueue(data.queue || []);
        setLastUpdated(new Date());

        // Check if a new ticket moved into Consultation
        const consultationList = (data.queue || []).filter(
          (q) => q.triage_status?.toLowerCase() === "consultation" && q.ticket_number !== "—"
        );
        const consultationTickets = consultationList.map((q) => q.ticket_number);

        const prevSet = prevConsultationRef.current;
        const newlyCalledItem = consultationList.find((q) => !prevSet.has(q.ticket_number));

        if (newlyCalledItem) {
          setLastCalledTicket(newlyCalledItem.ticket_number);
          setCallingFlash(true);
          setTimeout(() => setCallingFlash(false), 6000);
          if (audioEnabled) {
            playClinicChime();
            setTimeout(() => {
              speakTicketCall(newlyCalledItem.ticket_number, newlyCalledItem.patient_name, "Consultation Room 1");
            }, 900);
          }
        }

        prevConsultationRef.current = new Set(consultationTickets);
      }
    } catch (err) {
      console.error("Failed to load queue:", err);
    }
  };

  useEffect(() => {
    fetchQueue();
    // Background polling fallback every 20 seconds
    const interval = setInterval(fetchQueue, 20000);
    return () => clearInterval(interval);
  }, [audioEnabled]);

  // 3. Supabase Realtime Subscription for Instant Updates
  useEffect(() => {
    const supabase = createClient();

    const channel = supabase
      .channel("public-lobby-queue-stream")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "appointments" },
        () => {
          // Immediately re-fetch queue data when any appointment changes
          fetchQueue();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [audioEnabled]);

  // 4. Fullscreen handler
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {});
    }
  };

  // Group queue by triage status (case-insensitive)
  const nowCalling = queue.filter((q) => q.triage_status?.toLowerCase() === "consultation");
  const inTriage = queue.filter((q) => q.triage_status?.toLowerCase() === "vital signs");
  const waitingList = queue.filter((q) => !q.triage_status || q.triage_status?.toLowerCase() === "waiting");
  const dischargedList = queue.filter((q) => q.triage_status?.toLowerCase() === "discharged").slice(-8).reverse();

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-slate-950 p-4 md:p-6 select-none font-sans">
      
      {/* ── Top TV Display Header ────────────────────────────────────── */}
      <header className="flex items-center justify-between pb-4 border-b border-slate-800/80">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-rose-500 to-pink-500 text-white flex items-center justify-center font-black shadow-lg shadow-rose-500/20 text-lg tracking-wider">
            AJ
          </div>
          <div>
            <h1 className="text-xl md:text-2xl font-black text-white tracking-tight flex items-center gap-2">
              <span>{clinicInfo.name}</span>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs font-bold">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                LIVE QUEUE
              </span>
            </h1>
            <p className="text-xs text-slate-400 font-medium">
              Real-time patient intake & triage board • Patient names masked for privacy
            </p>
          </div>
        </div>

        {/* Time, Audio Toggle, Fullscreen */}
        <div className="flex items-center gap-3">
          {/* Audio Chime Toggle */}
          <button
            type="button"
            onClick={() => {
              const next = !audioEnabled;
              setAudioEnabled(next);
              if (next) playClinicChime();
            }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
              audioEnabled
                ? "bg-rose-500/20 border-rose-500/40 text-rose-300"
                : "bg-slate-900 border-slate-800 text-slate-400 hover:text-white"
            }`}
            title="Enable audio notification chime on TV screen"
          >
            {audioEnabled ? <Volume2 className="w-4 h-4 text-rose-400" /> : <VolumeX className="w-4 h-4" />}
            <span className="hidden sm:inline">{audioEnabled ? "Chime On" : "Chime Off"}</span>
          </button>

          {/* Fullscreen Button */}
          <button
            type="button"
            onClick={toggleFullscreen}
            className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer"
            title="Toggle Fullscreen"
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>

          {/* Live Digital Clock */}
          <div className="text-right bg-slate-900/90 border border-slate-800/80 px-4 py-1.5 rounded-2xl shadow-inner">
            <div 
              className="text-base md:text-lg font-mono font-black text-rose-400 tracking-wider"
              suppressHydrationWarning
            >
              {mounted && currentTime ? currentTime : "--:--:--"}
            </div>
            <div 
              className="text-[10px] uppercase font-bold text-slate-400"
              suppressHydrationWarning
            >
              {mounted && currentDate ? currentDate : "Live Queue"}
            </div>
          </div>
        </div>
      </header>

      {/* ── Main Display Body (3-Column Layout) ───────────────────────── */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-5 pt-4 overflow-hidden">
        
        {/* ── LEFT & CENTER: NOW CALLING & CONSULTATION (7 Cols) ─────── */}
        <div className="lg:col-span-7 flex flex-col gap-4 overflow-hidden">
          
          {/* NOW CALLING HERO CARD */}
          <div className={`relative rounded-3xl p-6 border transition-all duration-500 flex flex-col justify-between overflow-hidden shadow-2xl ${
            callingFlash
              ? "bg-gradient-to-br from-rose-950/90 via-slate-900 to-slate-950 border-rose-500 ring-4 ring-rose-500/40 animate-pulse"
              : "bg-gradient-to-br from-rose-950/40 via-slate-900/90 to-slate-950 border-rose-500/30"
          }`}>
            <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
              <Stethoscope className="w-44 h-44 text-rose-400" />
            </div>

            <div className="flex items-center justify-between mb-3 z-10">
              <span className="text-xs font-black uppercase tracking-widest px-3 py-1 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/40 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-rose-400 animate-spin" />
                NOW CALLING / IN CONSULTATION
              </span>
              <span className="text-xs font-bold text-slate-400">
                Clinic Room 1 & 2
              </span>
            </div>

            {nowCalling.length === 0 ? (
              <div className="py-12 text-center text-slate-500 space-y-2 z-10">
                <Stethoscope className="w-12 h-12 mx-auto opacity-30 text-rose-400" />
                <h3 className="text-xl font-bold text-slate-400">Consultation Room Standing By</h3>
                <p className="text-xs text-slate-500">
                  Next patient ticket will appear here once called by the midwife or physician.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 my-auto py-2 z-10">
                {nowCalling.map((item) => (
                  <div
                    key={item.id}
                    className="p-5 rounded-2xl bg-slate-900/90 border border-rose-500/30 shadow-xl flex flex-col justify-between space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-4xl md:text-5xl font-mono font-black text-rose-400 tracking-tight">
                        {item.ticket_number}
                      </span>
                      {item.is_walk_in && (
                        <span className="px-2 py-0.5 rounded-md bg-rose-500/20 border border-rose-500/30 text-rose-300 text-[10px] font-black uppercase tracking-wider">
                          Walk-in
                        </span>
                      )}
                    </div>

                    <div>
                      <h4 className="text-lg md:text-xl font-bold text-white tracking-tight">
                        {item.patient_name}
                      </h4>
                      <p className="text-xs text-slate-300 font-medium">
                        {SERVICE_LABELS[item.service_type?.toLowerCase()] || item.service_type}
                      </p>
                    </div>

                    <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
                      <span className="font-semibold text-emerald-400">
                        Consultation Room 1 • {item.attending_staff || "Attending Midwife"}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400 z-10">
              <span>Please proceed to the designated consultation room when your ticket is shown.</span>
              <span className="font-mono text-[11px] text-slate-500">
                Active: {nowCalling.length}
              </span>
            </div>
          </div>

          {/* TRIAGE & VITAL SIGNS ROOM (BOTTOM LEFT) */}
          <div className="flex-1 rounded-3xl p-5 bg-slate-900/60 border border-slate-800/80 flex flex-col overflow-hidden">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-indigo-500/20 border border-indigo-500/30 text-indigo-400 flex items-center justify-center font-bold">
                  <Activity className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-xs font-black uppercase tracking-wider text-white">
                    Triage & Vital Signs Room
                  </h3>
                  <p className="text-[10px] text-slate-400">Blood pressure, weight & maternal health intake</p>
                </div>
              </div>
              <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                {inTriage.length} in progress
              </span>
            </div>

            <div className="flex-1 overflow-y-auto pt-3 space-y-2.5">
              {inTriage.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-slate-500 text-xs">
                  <Activity className="w-6 h-6 opacity-30 mb-1" />
                  No patients currently at the triage station.
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {inTriage.map((item) => (
                    <div
                      key={item.id}
                      className="p-3.5 rounded-2xl bg-slate-900 border border-indigo-500/20 flex items-center justify-between shadow-md"
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-2xl font-mono font-black text-indigo-400">
                          {item.ticket_number}
                        </span>
                        <div>
                          <div className="text-sm font-bold text-white">{item.patient_name}</div>
                          <div className="text-[11px] text-slate-400">{SERVICE_LABELS[item.service_type?.toLowerCase()] || item.service_type}</div>
                        </div>
                      </div>
                      <span className="text-[10px] font-bold text-indigo-300 bg-indigo-500/15 px-2 py-0.5 rounded-full">
                        At Triage
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── RIGHT COLUMN: WAITING ROOM & NEXT IN LINE (5 Cols) ─────── */}
        <div className="lg:col-span-5 flex flex-col gap-4 overflow-hidden">
          
          {/* WAITING LIST CARD */}
          <div className="flex-1 rounded-3xl p-5 bg-slate-900/60 border border-slate-800/80 flex flex-col overflow-hidden">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-amber-500/20 border border-amber-500/30 text-amber-400 flex items-center justify-center font-bold">
                  <Users className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-xs font-black uppercase tracking-wider text-white">
                    Waiting Room • Next in Line
                  </h3>
                  <p className="text-[10px] text-slate-400">Please prepare your ticket and ID</p>
                </div>
              </div>
              <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                {waitingList.length} waiting
              </span>
            </div>

            <div className="flex-1 overflow-y-auto pt-3 space-y-2 pr-1">
              {waitingList.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-slate-500 text-xs">
                  <Users className="w-8 h-8 opacity-30 mb-2" />
                  Waiting room is currently clear.
                </div>
              ) : (
                waitingList.map((item, idx) => (
                  <div
                    key={item.id}
                    className={`p-3 rounded-2xl border transition-all flex items-center justify-between ${
                      idx === 0
                        ? "bg-amber-500/10 border-amber-500/30 shadow-md"
                        : "bg-slate-900/80 border-slate-800/80"
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className={`text-xl font-mono font-black ${idx === 0 ? "text-amber-400" : "text-slate-300"}`}>
                        {item.ticket_number}
                      </span>
                      <div className="min-w-0">
                        <div className="text-sm font-bold text-white truncate flex items-center gap-2">
                          <span>{item.patient_name}</span>
                          {idx === 0 && (
                            <span className="text-[9px] font-black uppercase px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                              Next
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-400 truncate">
                          {SERVICE_LABELS[item.service_type?.toLowerCase()] || item.service_type}
                        </div>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <span className="text-[11px] font-mono text-slate-400">
                        #{idx + 1}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* RECENTLY COMPLETED / DISCHARGED (BOTTOM RIGHT) */}
          <div className="rounded-3xl p-4 bg-slate-900/40 border border-slate-800/60">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-black uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> Recently Discharged
              </span>
              <span className="text-[10px] text-slate-500">Today</span>
            </div>

            {dischargedList.length === 0 ? (
              <p className="text-[11px] text-slate-500 italic">No patients discharged yet today.</p>
            ) : (
              <div className="flex items-center gap-2 flex-wrap">
                {dischargedList.map((item) => (
                  <span
                    key={item.id}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs font-mono font-bold"
                  >
                    ✓ {item.ticket_number} ({item.patient_name})
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

      </div>

      {/* ── Footer Ticker / Announcements ────────────────────────────── */}
      <footer className="mt-3 pt-3 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
          <span>Real-time Sync Active • AR-JEN Smart Clinic Operations</span>
        </div>
        <div className="flex items-center gap-3">
          <span>Priority is given to emergencies and high-risk cases.</span>
          <span className="font-mono text-slate-500" suppressHydrationWarning>
            Updated: {mounted && lastUpdated ? lastUpdated.toLocaleTimeString("en-PH") : "Live"}
          </span>
        </div>
      </footer>
    </div>
  );
}
