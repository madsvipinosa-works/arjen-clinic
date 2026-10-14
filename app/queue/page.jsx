"use client";

// app/queue/page.jsx
// AR-JEN Maternity Clinic: Public Lobby TV Queue Display
// 24/7 Unattended TV Kiosk Display with First-Gesture Audio Unlocker,
// Resilient WebSocket Heartbeats, Double-Call Voice Vocalizer,
// Stepped-Out Patient Recalls, and Anti-Burn-In Background.

import { useState, useEffect, useRef, useSyncExternalStore } from "react";
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
  Smartphone,
  Wifi,
  WifiOff,
  RefreshCw,
  Radio
} from "lucide-react";
import { createClient } from "@/utils/supabase/client";

const emptySubscribe = () => () => {};
function useIsMounted() {
  return useSyncExternalStore(emptySubscribe, () => true, () => false);
}

const SERVICE_LABELS = {
  prenatal: "Prenatal Check-up",
  delivery: "Safe Delivery",
  family: "Family Planning",
  general: "General Consult",
};

/**
 * Mask patient name for DPA / HIPAA healthcare privacy in public lobby
 * e.g., "Maria Clara Santos" -> "Maria S."
 */
function maskName(fullName) {
  if (!fullName) return "Patient";
  const parts = fullName.trim().split(" ");
  if (parts.length === 1) return parts[0];
  const first = parts[0];
  const lastInitial = parts[parts.length - 1].charAt(0).toUpperCase();
  return `${first} ${lastInitial}.`;
}

/**
 * Dual-frequency melodic chime (D5 -> A5)
 */
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
      gain.gain.linearRampToValueAtTime(0.3, time + 0.05);
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

/**
 * Double-call natural speech synthesis with en-PH adaptation
 */
function speakTicketCall(ticketNumber, patientName, roomName = "Consultation Room", isReturning = false) {
  try {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();

    // Spaced out for natural pronunciation of characters: "P-04" -> "P, 0 4"
    const cleaned = (ticketNumber || "").replace("-", " ");
    const spaced = cleaned.split("").join(" ");

    const prefix = isReturning 
      ? `Attention please. Returning patient, Ticket ${spaced}.` 
      : `Now calling. Ticket ${spaced}.`;

    const text = `${prefix} Ticket ${spaced}, please proceed to ${roomName}.`;

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.88;
    utterance.pitch = 1.0;

    // Prefer en-PH voice or standard clean voice
    const voices = window.speechSynthesis.getVoices();
    const preferredVoice = 
      voices.find((v) => v.lang.toLowerCase() === "en-ph") ||
      voices.find((v) => v.lang.toLowerCase().includes("en-us") && !v.name.includes("Google")) ||
      voices.find((v) => v.lang.toLowerCase().startsWith("en")) ||
      voices[0];

    if (preferredVoice) {
      utterance.voice = preferredVoice;
    }

    window.speechSynthesis.speak(utterance);
  } catch (err) {
    console.error("Speech announcement error:", err);
  }
}

export default function QueueDisplayPage() {
  const isMounted = useIsMounted();
  const [queue, setQueue] = useState([]);
  const [clinicInfo, setClinicInfo] = useState({ name: "AR-JEN Clinic", logo: null });
  const [currentTime, setCurrentTime] = useState("");
  const [currentDate, setCurrentDate] = useState("");
  const [audioEnabled, setAudioEnabled] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [lastCalledTicket, setLastCalledTicket] = useState(null);
  const [callingFlash, setCallingFlash] = useState(false);
  const [isLastCalledReturning, setIsLastCalledReturning] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [wsStatus, setWsStatus] = useState("connecting"); // "connected" | "connecting" | "reconnecting" | "offline"
  const [audioPromptDismissed, setAudioPromptDismissed] = useState(false);

  // References to preserve state across intervals without triggering re-subscriptions
  const audioEnabledRef = useRef(audioEnabled);
  useEffect(() => {
    audioEnabledRef.current = audioEnabled;
  }, [audioEnabled]);

  const prevConsultationRef = useRef(new Set());
  const [steppedOutTickets, setSteppedOutTickets] = useState(new Set());

  // 1. Clock interval
  useEffect(() => {
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
          weekday: "short",
          month: "short",
          day: "numeric",
        })
      );
    };

    const timer = setTimeout(updateTime, 0);
    const interval = setInterval(updateTime, 1000);
    return () => {
      clearTimeout(timer);
      clearInterval(interval);
    };
  }, []);

  // 2. Fetch Queue API
  const fetchQueue = async () => {
    try {
      const res = await fetch("/api/queue", { cache: "no-store" });
      const data = await res.json();
      if (data?.success) {
        setClinicInfo(data.clinic || { name: "AR-JEN Clinic", logo: null });
        setQueue(data.queue || []);
        setLastUpdated(new Date());

        // Track currently stepped-out tickets to identify returning recalls
        const currentSteppedOut = new Set(
          (data.queue || [])
            .filter((q) => {
              const s = q.triage_status?.toLowerCase();
              return s === "stepped out" || s === "returning";
            })
            .map((q) => q.ticket_number)
        );

        const consultationList = (data.queue || []).filter(
          (q) => q.triage_status?.toLowerCase() === "consultation" && q.ticket_number !== "—"
        );
        const consultationTickets = consultationList.map((q) => q.ticket_number);

        const prevSet = prevConsultationRef.current;
        const newlyCalledItem = consultationList.find((q) => !prevSet.has(q.ticket_number));

        if (newlyCalledItem) {
          const isReturning = currentSteppedOut.has(newlyCalledItem.ticket_number) || newlyCalledItem.triage_status?.toLowerCase() === "returning";
          setLastCalledTicket(newlyCalledItem.ticket_number);
          setIsLastCalledReturning(isReturning);
          setCallingFlash(true);
          setTimeout(() => setCallingFlash(false), 8000);

          if (audioEnabledRef.current) {
            playClinicChime();
            setTimeout(() => {
              speakTicketCall(
                newlyCalledItem.ticket_number, 
                "", 
                newlyCalledItem.attending_staff || "the Consultation Room",
                isReturning
              );
            }, 900);
          }
        }

        prevConsultationRef.current = new Set(consultationTickets);
        setSteppedOutTickets(currentSteppedOut);
      }
    } catch (err) {
      console.error("Failed to load queue:", err);
    }
  };

  // 3. Fallback Periodic Polling (Every 20 seconds)
  useEffect(() => {
    const timer = setTimeout(fetchQueue, 0);
    const interval = setInterval(fetchQueue, 20000);
    return () => {
      clearTimeout(timer);
      clearInterval(interval);
    };
  }, []);

  // 4. Decoupled Realtime WebSocket Subscription & Heartbeat
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
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          setWsStatus("connected");
        } else if (status === "CLOSED" || status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
          setWsStatus("reconnecting");
        }
      });

    const handleOnline = () => {
      setWsStatus("connected");
      fetchQueue();
    };
    const handleOffline = () => {
      setWsStatus("offline");
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      supabase.removeChannel(channel);
    };
  }, []);

  // 5. Autonomous First-Gesture Audio Unlocker
  useEffect(() => {
    if (audioEnabled) return;
    const unlockAudio = () => {
      setAudioEnabled(true);
      playClinicChime();
      window.removeEventListener("click", unlockAudio);
      window.removeEventListener("keydown", unlockAudio);
      window.removeEventListener("touchstart", unlockAudio);
    };

    window.addEventListener("click", unlockAudio);
    window.addEventListener("keydown", unlockAudio);
    window.addEventListener("touchstart", unlockAudio);

    return () => {
      window.removeEventListener("click", unlockAudio);
      window.removeEventListener("keydown", unlockAudio);
      window.removeEventListener("touchstart", unlockAudio);
    };
  }, [audioEnabled]);

  const toggleFullscreen = () => {
    if (typeof document === "undefined") return;
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {});
    }
  };

  // 6. Kiosk Hotkeys (F: Fullscreen, M/Space: Mute, R: Refresh)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA") return;

      if (e.key === "f" || e.key === "F" || e.key === "F11") {
        e.preventDefault();
        toggleFullscreen();
      } else if (e.key === "m" || e.key === "M" || e.code === "Space") {
        e.preventDefault();
        setAudioEnabled((prev) => {
          const next = !prev;
          if (next) playClinicChime();
          return next;
        });
      } else if (e.key === "r" || e.key === "R") {
        e.preventDefault();
        fetchQueue();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const nowCalling = queue.filter((q) => q.triage_status?.toLowerCase() === "consultation");
  const inTriage = queue.filter((q) => q.triage_status?.toLowerCase() === "vital signs");
  const waitingList = queue.filter((q) => !q.triage_status || q.triage_status?.toLowerCase() === "waiting").slice(0, 4);
  const steppedOutList = queue.filter((q) => {
    const s = q.triage_status?.toLowerCase();
    return s === "stepped out" || s === "returning";
  });

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-slate-950 text-white select-none font-sans relative">
      
      {/* ── Anti-Burn-In Slow Breathing Ambient Lights ─────────── */}
      <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full bg-rose-600/10 blur-[150px] pointer-events-none animate-pulse duration-[10000ms]" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[45%] h-[45%] rounded-full bg-indigo-600/10 blur-[150px] pointer-events-none animate-pulse duration-[12000ms]" />

      {/* ── Autonomous Audio Unlock Floating Banner ─────────────── */}
      {!audioEnabled && !audioPromptDismissed && (
        <div 
          onClick={() => {
            setAudioEnabled(true);
            playClinicChime();
          }}
          className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-rose-500/90 hover:bg-rose-500 text-white px-6 py-2.5 rounded-full shadow-2xl backdrop-blur-md flex items-center gap-3 cursor-pointer border border-rose-400/50 animate-bounce transition-all duration-300"
        >
          <VolumeX className="w-5 h-5 text-white animate-pulse" />
          <span className="text-xs md:text-sm font-black tracking-wide">
            AUDIO MUTED BY BROWSER — Click anywhere or press Spacebar to enable voice ticket calling
          </span>
          <span className="bg-white text-rose-600 px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider shadow-sm">
            Enable Sound
          </span>
        </div>
      )}
      
      {/* ── Top Header ────────────────────────────────────────── */}
      <header className="flex items-center justify-between px-8 md:px-10 py-5 border-b border-white/10 bg-slate-900/60 backdrop-blur-md relative z-10 shrink-0">
        <div className="flex items-center gap-6">
          {clinicInfo.logo ? (
            <Image src={clinicInfo.logo} alt="Logo" width={72} height={72} className="rounded-2xl bg-white shadow-xl" />
          ) : (
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-rose-500 to-rose-600 flex items-center justify-center font-black text-3xl shadow-lg shadow-rose-900/30">
              AJ
            </div>
          )}
          <div>
            <h1 className="text-4xl md:text-5xl font-black tracking-tight">{clinicInfo.name}</h1>
            <p className="text-xl md:text-2xl text-slate-400 font-medium tracking-wide mt-0.5">
              Live Waiting Lounge Queue
            </p>
          </div>
        </div>

        {/* Center Queue Velocity Summary Pills (1080p/4K Screens) */}
        <div className="hidden xl:flex items-center gap-3">
          <div className="px-4 py-2 bg-white/5 rounded-2xl border border-white/10 text-center">
            <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Total Patients</p>
            <p className="text-xl font-mono font-black text-white">{queue.length}</p>
          </div>
          <div className="px-4 py-2 bg-rose-500/10 rounded-2xl border border-rose-500/20 text-center">
            <p className="text-[10px] uppercase font-bold text-rose-400 tracking-wider">In Consult</p>
            <p className="text-xl font-mono font-black text-rose-300">{nowCalling.length}</p>
          </div>
          <div className="px-4 py-2 bg-indigo-500/10 rounded-2xl border border-indigo-500/20 text-center">
            <p className="text-[10px] uppercase font-bold text-indigo-400 tracking-wider">In Triage</p>
            <p className="text-xl font-mono font-black text-indigo-300">{inTriage.length}</p>
          </div>
          <div className="px-4 py-2 bg-amber-500/10 rounded-2xl border border-amber-500/20 text-center">
            <p className="text-[10px] uppercase font-bold text-amber-400 tracking-wider">Waiting</p>
            <p className="text-xl font-mono font-black text-amber-300">{waitingList.length}</p>
          </div>
        </div>

        {/* Right Controls & PHT Shift Clock */}
        <div className="flex items-center gap-5">
          {/* Audio Mute/Unmute Action */}
          <button
            onClick={() => {
              const next = !audioEnabled;
              setAudioEnabled(next);
              if (next) playClinicChime();
            }}
            title={audioEnabled ? "Sound enabled (Press M or Space to mute)" : "Sound muted (Click or press Space to enable)"}
            className={`p-3.5 rounded-2xl transition-all duration-200 border ${
              audioEnabled 
                ? "bg-rose-500/20 text-rose-400 border-rose-500/40 shadow-lg shadow-rose-950" 
                : "bg-white/5 text-slate-500 border-white/10 hover:bg-white/10"
            }`}
          >
            {audioEnabled ? <Volume2 className="w-7 h-7" /> : <VolumeX className="w-7 h-7" />}
          </button>
          
          {/* Fullscreen Action */}
          <button 
            onClick={toggleFullscreen} 
            title="Toggle Fullscreen (F)"
            className="p-3.5 rounded-2xl bg-white/5 text-slate-400 border border-white/10 hover:bg-white/10 transition-all duration-200"
          >
            {isFullscreen ? <Minimize2 className="w-7 h-7" /> : <Maximize2 className="w-7 h-7" />}
          </button>

          {/* Clock & PHT Shift Badge */}
          <div className="text-right pl-6 border-l border-white/10">
            <div className="text-5xl md:text-6xl font-mono font-black tracking-tighter" suppressHydrationWarning>
              {isMounted && currentTime ? currentTime : "--:--"}
            </div>
            <div className="flex items-center justify-end gap-2 text-lg font-bold text-slate-400 uppercase tracking-widest mt-0.5" suppressHydrationWarning>
              <span>{isMounted && currentDate ? currentDate : "..."}</span>
              <span className="text-xs font-mono font-bold text-rose-400">PHT (UTC+8)</span>
            </div>
          </div>
        </div>
      </header>

      {/* ── Main Display ───────────────────────────────────────── */}
      <div className="flex-1 grid grid-cols-12 gap-8 p-6 md:p-8 overflow-hidden relative z-10 min-h-0">
        
        {/* ── LEFT: NOW CALLING (7 Cols) ───────────────────────── */}
        <div className="col-span-7 flex flex-col min-h-0">
          <div className={`relative rounded-[3rem] p-8 md:p-10 border-4 transition-all duration-500 flex flex-col h-full shadow-2xl overflow-hidden ${
            callingFlash
              ? isLastCalledReturning
                ? "bg-slate-950 border-cyan-400 ring-[12px] ring-cyan-500/40 shadow-[0_0_90px_-10px_rgba(6,182,212,0.6)]"
                : "bg-rose-950/80 border-rose-500 ring-[10px] ring-rose-500/30 shadow-[0_0_80px_-10px_rgba(244,63,94,0.5)]"
              : "bg-slate-900 border-rose-500/30"
          }`}>
            <div className="flex items-center justify-between mb-6 shrink-0">
              <div className="flex items-center gap-4">
                <Sparkles className={`w-9 h-9 text-rose-500 ${callingFlash ? "animate-spin" : ""}`} />
                <h2 className="text-3xl md:text-4xl font-black uppercase tracking-[0.2em] text-rose-500">
                  Please Proceed To Clinic
                </h2>
              </div>

              {callingFlash && (
                <div className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-rose-500/20 border border-rose-500/40 text-rose-300 text-xs font-black uppercase tracking-widest animate-pulse">
                  <BellRing className="w-4 h-4 text-rose-400" />
                  <span>Now Calling</span>
                </div>
              )}
            </div>

            {nowCalling.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center text-slate-600 text-center">
                <BellRing className="w-28 h-28 opacity-20 mb-6" />
                <h3 className="text-4xl font-bold">Awaiting Next Patient</h3>
                <p className="text-xl text-slate-500 mt-2">Next ticket will be called momentarily</p>
              </div>
            ) : (
              <div className="flex-1 flex flex-col gap-6 justify-center overflow-y-auto pr-1">
                {nowCalling.map((item) => {
                  const isReturning = item.triage_status?.toLowerCase() === "returning" || steppedOutTickets.has(item.ticket_number);
                  return (
                    <div 
                      key={item.id} 
                      className={`rounded-[2.5rem] p-8 border text-center transition-all duration-300 ${
                        isReturning
                          ? "bg-slate-950/90 border-cyan-500/50 shadow-[0_0_50px_-5px_rgba(6,182,212,0.4)] ring-4 ring-cyan-500/20"
                          : "bg-slate-950/60 border-white/10 shadow-xl"
                      }`}
                    >
                      {isReturning && (
                        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-cyan-500/20 border border-cyan-500/40 text-cyan-300 text-xs font-black uppercase tracking-widest mb-3 animate-pulse">
                          <Footprints className="w-4 h-4" />
                          <span>Recall: Returning Stepped-Out Patient</span>
                        </div>
                      )}
                      <div className="text-[7.5rem] md:text-[8.5rem] leading-none font-mono font-black text-white tracking-tighter drop-shadow-2xl mb-4">
                        {item.ticket_number}
                      </div>
                      <div className="text-4xl md:text-5xl font-bold text-rose-300 tracking-tight mb-3">
                        {maskName(item.patient_name)}
                      </div>
                      <div className="text-2xl md:text-3xl text-slate-300 font-medium uppercase tracking-widest bg-white/5 inline-block px-8 py-2.5 rounded-2xl border border-white/10">
                        {item.attending_staff || "Consultation Room"}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* ── RIGHT: TRIAGE, WAITING & STEPPED OUT (5 Cols) ─────── */}
        <div className="col-span-5 flex flex-col gap-6 min-h-0 overflow-y-auto pr-1">
          
          {/* AT TRIAGE (VITALS) */}
          <div className="rounded-[2.5rem] p-6 bg-slate-900/80 border-2 border-indigo-500/30 flex flex-col shrink-0 shadow-lg">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <Activity className="w-7 h-7 text-indigo-400" />
                <h2 className="text-2xl font-black uppercase tracking-widest text-indigo-400">
                  At Triage (Vitals)
                </h2>
              </div>
              <span className="text-xs font-mono font-bold text-indigo-300 bg-indigo-500/20 px-3 py-1 rounded-full border border-indigo-500/30">
                {inTriage.length} Active
              </span>
            </div>
            
            <div className="space-y-3">
              {inTriage.length === 0 ? (
                <div className="py-4 text-center text-slate-500 text-lg font-medium">
                  No Active Triage
                </div>
              ) : (
                inTriage.map((item) => (
                  <div key={item.id} className="bg-slate-950 p-4 rounded-2xl border border-indigo-500/20 flex items-center justify-between">
                    <div className="flex items-center gap-5">
                      <span className="text-4xl font-mono font-black text-white">
                        {item.ticket_number}
                      </span>
                      <span className="text-2xl font-bold text-indigo-300">
                        {maskName(item.patient_name)}
                      </span>
                    </div>
                    <span className="text-xs font-medium text-slate-400 bg-white/5 px-3 py-1.5 rounded-xl border border-white/5">
                      Vitals Room
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* WAITING LIST */}
          <div className="rounded-[2.5rem] p-6 bg-slate-900/50 border-2 border-white/5 flex flex-col flex-1 min-h-[180px] shadow-lg">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <Users className="w-7 h-7 text-slate-400" />
                <h2 className="text-2xl font-black uppercase tracking-widest text-slate-400">
                  Next In Line
                </h2>
              </div>
              <span className="text-xs font-mono font-bold text-slate-400 bg-white/5 px-3 py-1 rounded-full border border-white/10">
                {waitingList.length} In Lobby
              </span>
            </div>
            
            <div className="flex-1 space-y-3 overflow-y-auto">
              {waitingList.length === 0 ? (
                <div className="h-full flex items-center justify-center text-slate-500 text-lg font-medium py-4">
                  Waiting lounge is clear
                </div>
              ) : (
                waitingList.map((item, idx) => (
                  <div key={item.id} className={`p-4 rounded-2xl flex items-center justify-between border-l-4 transition-all duration-200 ${
                    idx === 0 ? "bg-amber-500/10 border-amber-500" : "bg-white/5 border-white/10"
                  }`}>
                    <div className="flex items-center gap-5">
                      <span className={`text-3xl font-mono font-black ${idx === 0 ? "text-amber-400" : "text-slate-300"}`}>
                        {item.ticket_number}
                      </span>
                      <div className="flex flex-col">
                        <span className="text-xl font-bold text-white">
                          {maskName(item.patient_name)}
                        </span>
                        <span className="text-xs text-slate-400">
                          {SERVICE_LABELS[item.service_type?.toLowerCase()] || item.service_type}
                        </span>
                      </div>
                    </div>

                    {idx === 0 && (
                      <span className="text-[10px] font-black uppercase tracking-wider text-amber-950 bg-amber-400 px-2.5 py-1 rounded-full font-sans">
                        Next Up
                      </span>
                    )}
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

      {/* ── Footer Guidance & Heartbeat Bar ───────────────────── */}
      <footer className="px-8 md:px-10 py-3.5 border-t border-white/10 bg-slate-900/70 backdrop-blur-md flex items-center justify-between text-sm text-slate-400 relative z-10 shrink-0">
        <div className="flex items-center gap-3">
          <Smartphone className="w-4 h-4 text-rose-400 shrink-0" />
          <span>
            <strong className="text-white">Need to step out?</strong> Scan the QR code on your queue ticket to track your live position on your phone at <strong>/queue/track</strong>.
          </span>
        </div>

        <div className="flex items-center gap-6 text-xs font-mono">
          {/* WebSocket Heartbeat Indicator */}
          <div className="flex items-center gap-2">
            {wsStatus === "connected" && (
              <>
                <span className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                </span>
                <span className="text-emerald-400 font-bold uppercase tracking-wider text-[11px]">Live WebSocket Stream</span>
              </>
            )}
            {wsStatus === "reconnecting" && (
              <>
                <span className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-500"></span>
                </span>
                <span className="text-amber-400 font-bold uppercase tracking-wider text-[11px]">Reconnecting Stream...</span>
              </>
            )}
            {wsStatus === "offline" && (
              <>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-rose-500"></span>
                <span className="text-rose-400 font-bold uppercase tracking-wider text-[11px]">Offline (Polling Backup)</span>
              </>
            )}
          </div>

          {lastUpdated && (
            <span className="text-slate-500">
              Synced {lastUpdated.toLocaleTimeString("en-PH", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: true })}
            </span>
          )}
        </div>
      </footer>
    </div>
  );
}
