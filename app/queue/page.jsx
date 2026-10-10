"use client";

import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import {
  Volume2,
  VolumeX,
  Maximize2,
  Minimize2,
  Activity,
  Users,
  Sparkles,
  BellRing,
  Footprints,
  Smartphone
} from "lucide-react";
import { createClient } from "@/utils/supabase/client";

const SERVICE_LABELS = {
  prenatal: "Prenatal Check-up",
  delivery: "Safe Delivery",
  family: "Family Planning",
  general: "General Consult",
};

function maskName(fullName) {
  if (!fullName) return "Patient";
  const parts = fullName.trim().split(" ");
  if (parts.length === 1) return parts[0];
  const first = parts[0];
  const lastInitial = parts[parts.length - 1].charAt(0).toUpperCase();
  return `${first} ${lastInitial}.`;
}

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

function speakTicketCall(ticketNumber, patientName, roomName = "Consultation Room") {
  try {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    const formattedTicket = (ticketNumber || "").replace("-", " ");
    const text = `Now calling. Ticket ${formattedTicket}. Please proceed to ${roomName}.`;
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
  const [clinicInfo, setClinicInfo] = useState({ name: "AR-JEN Clinic", logo: null });
  const [currentTime, setCurrentTime] = useState("");
  const [currentDate, setCurrentDate] = useState("");
  const [audioEnabled, setAudioEnabled] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [lastCalledTicket, setLastCalledTicket] = useState(null);
  const [callingFlash, setCallingFlash] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);

  const prevConsultationRef = useRef(new Set());

  useEffect(() => {
    setMounted(true);
    setLastUpdated(new Date());

    const updateTime = () => {
      const now = new Date();
      setCurrentTime(
        now.toLocaleTimeString("en-PH", {
          hour: "2-digit",
          minute: "2-digit",
          hour12: true,
        })
      );
      setCurrentDate(
        now.toLocaleDateString("en-PH", {
          month: "short",
          day: "numeric",
        })
      );
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  const fetchQueue = async () => {
    try {
      const res = await fetch("/api/queue", { cache: "no-store" });
      const data = await res.json();
      if (data?.success) {
        setClinicInfo(data.clinic || { name: "AR-JEN Clinic", logo: null });
        setQueue(data.queue || []);
        setLastUpdated(new Date());

        const consultationList = (data.queue || []).filter(
          (q) => q.triage_status?.toLowerCase() === "consultation" && q.ticket_number !== "—"
        );
        const consultationTickets = consultationList.map((q) => q.ticket_number);

        const prevSet = prevConsultationRef.current;
        const newlyCalledItem = consultationList.find((q) => !prevSet.has(q.ticket_number));

        if (newlyCalledItem) {
          setLastCalledTicket(newlyCalledItem.ticket_number);
          setCallingFlash(true);
          setTimeout(() => setCallingFlash(false), 8000);
          if (audioEnabled) {
            playClinicChime();
            setTimeout(() => {
              speakTicketCall(newlyCalledItem.ticket_number, "", "the Consultation Room");
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
    const interval = setInterval(fetchQueue, 20000);
    return () => clearInterval(interval);
  }, [audioEnabled]);

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel("public-lobby-queue-stream")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "appointments" },
        () => {
          fetchQueue();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [audioEnabled]);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {});
    }
  };

  const nowCalling = queue.filter((q) => q.triage_status?.toLowerCase() === "consultation");
  const inTriage = queue.filter((q) => q.triage_status?.toLowerCase() === "vital signs");
  const waitingList = queue.filter((q) => !q.triage_status || q.triage_status?.toLowerCase() === "waiting").slice(0, 4);
  const steppedOutList = queue.filter((q) => {
    const s = q.triage_status?.toLowerCase();
    return s === "stepped out" || s === "returning";
  });

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-slate-950 text-white select-none font-sans relative">
      
      {/* High-contrast dark background to eliminate glare and maximize visibility from afar */}
      <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full bg-rose-600/10 blur-[150px] pointer-events-none" />
      
      {/* ── Top Header ────────────────────────────────────── */}
      <header className="flex items-center justify-between px-10 py-6 border-b border-white/10 bg-slate-900/50 backdrop-blur-md relative z-10 shrink-0">
        <div className="flex items-center gap-6">
          {clinicInfo.logo ? (
             <Image src={clinicInfo.logo} alt="Logo" width={80} height={80} className="rounded-2xl bg-white shadow-xl" />
          ) : (
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-rose-500 to-rose-600 flex items-center justify-center font-black text-4xl">
              AJ
            </div>
          )}
          <div>
            <h1 className="text-5xl font-black tracking-tight">{clinicInfo.name}</h1>
            <p className="text-2xl text-slate-400 font-medium tracking-wide mt-1">
              Live Patient Queue
            </p>
          </div>
        </div>

        <div className="flex items-center gap-6">
          <button
            onClick={() => {
              const next = !audioEnabled;
              setAudioEnabled(next);
              if (next) playClinicChime();
            }}
            className={`p-4 rounded-2xl transition-all ${
              audioEnabled ? "bg-rose-500/20 text-rose-400" : "bg-white/5 text-slate-500"
            }`}
          >
            {audioEnabled ? <Volume2 className="w-8 h-8" /> : <VolumeX className="w-8 h-8" />}
          </button>
          
          <button onClick={toggleFullscreen} className="p-4 rounded-2xl bg-white/5 text-slate-400">
            {isFullscreen ? <Minimize2 className="w-8 h-8" /> : <Maximize2 className="w-8 h-8" />}
          </button>

          <div className="text-right pl-8 border-l border-white/10">
            <div className="text-6xl font-mono font-black tracking-tighter" suppressHydrationWarning>
              {mounted && currentTime ? currentTime : "--:--"}
            </div>
            <div className="text-2xl font-bold text-slate-400 uppercase tracking-widest mt-1" suppressHydrationWarning>
              {mounted && currentDate ? currentDate : "..."}
            </div>
          </div>
        </div>
      </header>

      {/* ── Main Display ───────────────────────── */}
      <div className="flex-1 grid grid-cols-12 gap-8 p-8 overflow-hidden relative z-10 min-h-0">
        
        {/* ── LEFT: NOW CALLING (7 Cols) ─────── */}
        <div className="col-span-7 flex flex-col min-h-0">
          <div className={`relative rounded-[3rem] p-10 border-4 transition-all duration-500 flex flex-col h-full shadow-2xl overflow-hidden ${
            callingFlash
              ? "bg-rose-950/80 border-rose-500 ring-[10px] ring-rose-500/30 shadow-[0_0_80px_-10px_rgba(244,63,94,0.5)]"
              : "bg-slate-900 border-rose-500/30"
          }`}>
            <div className="flex items-center gap-4 mb-6 shrink-0">
              <Sparkles className={`w-10 h-10 text-rose-500 ${callingFlash ? "animate-spin" : ""}`} />
              <h2 className="text-4xl font-black uppercase tracking-[0.2em] text-rose-500">
                Please Proceed To Clinic
              </h2>
            </div>

            {nowCalling.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center text-slate-600 text-center">
                <BellRing className="w-28 h-28 opacity-20 mb-6" />
                <h3 className="text-4xl font-bold">Awaiting Next Patient</h3>
              </div>
            ) : (
              <div className="flex-1 flex flex-col gap-6 justify-center overflow-y-auto">
                {nowCalling.map((item) => (
                  <div key={item.id} className="bg-slate-950/50 rounded-[2rem] p-8 border border-white/10 text-center">
                    <div className="text-[8.5rem] leading-none font-mono font-black text-white tracking-tighter drop-shadow-2xl mb-4">
                      {item.ticket_number}
                    </div>
                    <div className="text-5xl font-bold text-rose-300 tracking-tight mb-3">
                      {maskName(item.patient_name)}
                    </div>
                    <div className="text-3xl text-slate-400 font-medium uppercase tracking-widest bg-white/5 inline-block px-8 py-2.5 rounded-2xl">
                      {item.attending_staff || "Consultation Room"}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ── RIGHT: TRIAGE, WAITING & STEPPED OUT (5 Cols) ─────── */}
        <div className="col-span-5 flex flex-col gap-6 min-h-0 overflow-y-auto pr-1">
          
          {/* AT TRIAGE */}
          <div className="rounded-[2.5rem] p-6 bg-slate-900/80 border-2 border-indigo-500/30 flex flex-col shrink-0">
            <div className="flex items-center gap-3 mb-4">
              <Activity className="w-8 h-8 text-indigo-400" />
              <h2 className="text-2xl font-black uppercase tracking-widest text-indigo-400">
                At Triage (Vitals)
              </h2>
            </div>
            
            <div className="space-y-3">
              {inTriage.length === 0 ? (
                <div className="py-4 text-center text-slate-500 text-xl font-medium">
                  No Active Triage
                </div>
              ) : (
                inTriage.map((item) => (
                  <div key={item.id} className="bg-slate-950 p-4 rounded-2xl border border-indigo-500/20 flex items-center gap-6">
                    <span className="text-4xl font-mono font-black text-white">
                      {item.ticket_number}
                    </span>
                    <span className="text-2xl font-bold text-indigo-300">
                      {maskName(item.patient_name)}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* WAITING LIST */}
          <div className="rounded-[2.5rem] p-6 bg-slate-900/50 border-2 border-white/5 flex flex-col flex-1 min-h-[180px]">
            <div className="flex items-center gap-3 mb-4">
              <Users className="w-8 h-8 text-slate-400" />
              <h2 className="text-2xl font-black uppercase tracking-widest text-slate-400">
                Waiting List
              </h2>
            </div>
            
            <div className="flex-1 space-y-3 overflow-y-auto">
              {waitingList.length === 0 ? (
                <div className="h-full flex items-center justify-center text-slate-500 text-xl font-medium py-4">
                  Queue is clear
                </div>
              ) : (
                waitingList.map((item, idx) => (
                  <div key={item.id} className={`p-4 rounded-2xl flex items-center gap-6 border-l-4 ${
                    idx === 0 ? "bg-amber-500/10 border-amber-500" : "bg-white/5 border-white/10"
                  }`}>
                    <span className={`text-3xl font-mono font-black ${idx === 0 ? "text-amber-400" : "text-slate-300"}`}>
                      {item.ticket_number}
                    </span>
                    <div className="flex flex-col">
                       <span className="text-xl font-bold text-white">
                         {maskName(item.patient_name)}
                       </span>
                       <span className="text-sm text-slate-400">{SERVICE_LABELS[item.service_type?.toLowerCase()] || item.service_type}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* MISSED NUMBERS / STEPPED OUT (GRACE SHELF) */}
          {steppedOutList.length > 0 && (
            <div className="rounded-[2.5rem] p-6 bg-amber-950/30 border-2 border-amber-500/50 shadow-xl shrink-0 animate-in fade-in duration-300">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2.5">
                  <span className="relative flex h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-amber-500"></span>
                  </span>
                  <h2 className="text-xl font-black uppercase tracking-wider text-amber-300 flex items-center gap-2">
                    <Footprints className="w-5 h-5 text-amber-400" />
                    Missed Numbers / Stepped Out
                  </h2>
                </div>
                <span className="text-[11px] font-black uppercase tracking-widest text-amber-950 bg-amber-400 px-3 py-1 rounded-full shadow-xs">
                  Approach Front Desk
                </span>
              </div>
              
              <p className="text-xs text-amber-200/80 mb-3">
                If your number was called while you were outside, please inform the front desk to resume:
              </p>

              <div className="flex flex-wrap gap-2.5">
                {steppedOutList.map((item) => (
                  <div
                    key={item.id}
                    className="bg-slate-950/90 border border-amber-500/40 rounded-xl px-3.5 py-2 flex items-center gap-2.5 shadow-md"
                  >
                    <span className="font-mono font-black text-xl text-amber-300">
                      {item.ticket_number}
                    </span>
                    <span className="text-sm font-semibold text-slate-300">
                      {maskName(item.patient_name)}
                    </span>
                    {item.triage_status?.toLowerCase() === "returning" && (
                      <span className="text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 animate-pulse">
                        On Way Back
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>

      </div>

      {/* ── Footer Guidance Bar ───────────────────────── */}
      <footer className="px-10 py-3 border-t border-white/10 bg-slate-900/60 backdrop-blur-md flex items-center justify-between text-sm text-slate-400 relative z-10 shrink-0">
        <div className="flex items-center gap-3">
          <Smartphone className="w-4 h-4 text-rose-400 shrink-0" />
          <span>
            <strong className="text-white">Need to step out?</strong> Scan the QR code on your queue ticket to track your live position on your mobile phone.
          </span>
        </div>
        <div className="flex items-center gap-4 text-xs font-mono text-slate-500">
          <span>● Real-time Live Sync</span>
          {lastUpdated && (
            <span>Updated {lastUpdated.toLocaleTimeString("en-PH", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: true })}</span>
          )}
        </div>
      </footer>
    </div>
  );
}
