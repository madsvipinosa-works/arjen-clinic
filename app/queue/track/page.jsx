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
  Users,
  Share2,
  Sun,
  SunMedium,
  Wifi,
  WifiOff,
  Copy,
  Check
} from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import { fetchTicketStatus, markPatientReturning } from "@/app/actions";

// Shared AudioContext for mobile browsers to avoid garbage collection and suspended state
let globalAudioCtx = null;

function getAudioContext() {
  if (typeof window === "undefined") return null;
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextClass) return null;
  if (!globalAudioCtx) {
    globalAudioCtx = new AudioContextClass();
  }
  if (globalAudioCtx.state === "suspended") {
    globalAudioCtx.resume().catch(() => {});
  }
  return globalAudioCtx;
}

/**
 * Dual-harmonic melodic chime (D5 -> A5) for turn notification
 */
function playAlertChime() {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const playTone = (freq, time, duration) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, time);
      gain.gain.setValueAtTime(0, time);
      gain.gain.linearRampToValueAtTime(0.35, time + 0.05);
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
    console.error("Audio chime error:", err);
  }
}

/**
 * Haptic pulse pattern for Android devices that support Web Vibration API
 */
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
  const [audioAutoPromptDismissed, setAudioAutoPromptDismissed] = useState(false);
  const [isReturningLoading, setIsReturningLoading] = useState(false);
  const [lastRefreshed, setLastRefreshed] = useState(null);
  const [relativeTimeStr, setRelativeTimeStr] = useState("Just now");

  // Cross-platform visual sensory alert (iOS Safari fallback)
  const [isVisualAlerting, setIsVisualAlerting] = useState(false);

  // 60-Second "On My Way Back" Cooldown Lock
  const [cooldownRemaining, setCooldownRemaining] = useState(0);

  // Screen Wake Lock API
  const [wakeLockActive, setWakeLockActive] = useState(false);
  const [wakeLockEnabled, setWakeLockEnabled] = useState(true);
  const wakeLockRef = useRef(null);

  // Companion Share State
  const [shareCopied, setShareCopied] = useState(false);

  // Realtime Connection Heartbeat
  const [connectionStatus, setConnectionStatus] = useState("live"); // 'live' | 'polling' | 'offline'

  const prevStatusRef = useRef(null);
  const titleIntervalRef = useRef(null);

  // Load ticket and audio preferences from local storage on mount
  useEffect(() => {
    if (typeof window === "undefined") return;

    if (!activeTicket) {
      const savedTicket = localStorage.getItem("arjen_pocket_ticket");
      if (savedTicket) {
        setActiveTicket(savedTicket);
        setTicketInput(savedTicket);
      }
    }

    const savedAudio = localStorage.getItem("arjen_pocket_audio");
    if (savedAudio === "true") {
      setAudioEnabled(true);
      getAudioContext();
    }
  }, [activeTicket]);

  // First-gesture global listener to unlock Web Audio context on iOS / Chrome
  useEffect(() => {
    if (typeof window === "undefined") return;

    const handleFirstGesture = () => {
      getAudioContext();
      window.removeEventListener("click", handleFirstGesture);
      window.removeEventListener("touchstart", handleFirstGesture);
      window.removeEventListener("keydown", handleFirstGesture);
    };

    window.addEventListener("click", handleFirstGesture, { passive: true });
    window.addEventListener("touchstart", handleFirstGesture, { passive: true });
    window.addEventListener("keydown", handleFirstGesture, { passive: true });

    return () => {
      window.removeEventListener("click", handleFirstGesture);
      window.removeEventListener("touchstart", handleFirstGesture);
      window.removeEventListener("keydown", handleFirstGesture);
    };
  }, []);

  // Check and manage 60-second cooldown from sessionStorage
  useEffect(() => {
    if (!activeTicket || typeof window === "undefined") return;

    const cooldownKey = `arjen_returning_cooldown_${activeTicket}`;
    const storedExpiry = sessionStorage.getItem(cooldownKey);

    if (storedExpiry) {
      const expiryTime = parseInt(storedExpiry, 10);
      const remaining = Math.max(0, Math.ceil((expiryTime - Date.now()) / 1000));
      if (remaining > 0) {
        setCooldownRemaining(remaining);
      } else {
        sessionStorage.removeItem(cooldownKey);
      }
    }
  }, [activeTicket]);

  // Ticking interval for cooldown countdown
  useEffect(() => {
    if (cooldownRemaining <= 0) return;

    const timer = setInterval(() => {
      setCooldownRemaining((prev) => {
        if (prev <= 1) {
          if (typeof window !== "undefined" && activeTicket) {
            sessionStorage.removeItem(`arjen_returning_cooldown_${activeTicket}`);
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [cooldownRemaining, activeTicket]);

  // Relative elapsed time updater
  useEffect(() => {
    if (!lastRefreshed) return;

    const updateRelative = () => {
      const diffSec = Math.floor((Date.now() - lastRefreshed.getTime()) / 1000);
      if (diffSec < 5) setRelativeTimeStr("Just now");
      else if (diffSec < 60) setRelativeTimeStr(`${diffSec}s ago`);
      else {
        const mins = Math.floor(diffSec / 60);
        setRelativeTimeStr(`${mins}m ago`);
      }
    };

    updateRelative();
    const interval = setInterval(updateRelative, 5000);
    return () => clearInterval(interval);
  }, [lastRefreshed]);

  // Screen Wake Lock API management
  const requestWakeLock = useCallback(async () => {
    if (typeof window === "undefined" || !("wakeLock" in navigator) || !wakeLockEnabled) return;
    try {
      if (document.visibilityState === "visible") {
        const lock = await navigator.wakeLock.request("screen");
        wakeLockRef.current = lock;
        setWakeLockActive(true);
        lock.addEventListener("release", () => {
          setWakeLockActive(false);
        });
      }
    } catch (err) {
      setWakeLockActive(false);
    }
  }, [wakeLockEnabled]);

  const releaseWakeLock = useCallback(() => {
    if (wakeLockRef.current) {
      try {
        wakeLockRef.current.release().catch(() => {});
      } catch (err) {}
      wakeLockRef.current = null;
      setWakeLockActive(false);
    }
  }, []);

  // Monitor visibilitychange to re-acquire wake lock when tab returns
  useEffect(() => {
    if (typeof document === "undefined") return;

    const handleVisibility = () => {
      if (document.visibilityState === "visible") {
        if (activeTicket && wakeLockEnabled) {
          requestWakeLock();
        }
        // Stop title oscillation when user focuses the tab
        if (titleIntervalRef.current) {
          clearInterval(titleIntervalRef.current);
          titleIntervalRef.current = null;
          if (activeTicket) {
            document.title = `Ticket ${activeTicket} | Pocket Queue Tracker`;
          }
        }
        setIsVisualAlerting(false);
      }
    };

    document.addEventListener("visibilitychange", handleVisibility);
    window.addEventListener("focus", handleVisibility);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibility);
      window.removeEventListener("focus", handleVisibility);
    };
  }, [activeTicket, wakeLockEnabled, requestWakeLock]);

  // Network online/offline listeners
  useEffect(() => {
    if (typeof window === "undefined") return;

    const handleOnline = () => setConnectionStatus("live");
    const handleOffline = () => setConnectionStatus("offline");

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    if (!navigator.onLine) {
      setConnectionStatus("offline");
    }

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  // Trigger cross-platform sensory alert (Visual flash, Title oscillation, Audio, Vibration)
  const triggerTurnAlert = useCallback((ticketNum, isTest = false) => {
    // 1. Audio Chime
    getAudioContext();
    playAlertChime();

    // 2. Web Vibration (Android)
    triggerHapticFeedback();

    // 3. High-Contrast Visual Beacon (iOS Safari & All Devices)
    setIsVisualAlerting(true);
    setTimeout(() => {
      setIsVisualAlerting(false);
    }, 8000);

    // 4. Background Document Title Oscillation
    if (typeof document !== "undefined") {
      if (titleIntervalRef.current) clearInterval(titleIntervalRef.current);
      let toggle = false;
      titleIntervalRef.current = setInterval(() => {
        document.title = toggle
          ? `🔔 YOUR TURN! Ticket ${ticketNum}`
          : `AR-JEN Clinic Tracker`;
        toggle = !toggle;
      }, 1000);

      // Auto-clear title after 20 seconds if user doesn't focus
      setTimeout(() => {
        if (titleIntervalRef.current) {
          clearInterval(titleIntervalRef.current);
          titleIntervalRef.current = null;
          document.title = `Ticket ${ticketNum} | Pocket Queue Tracker`;
        }
      }, 20000);
    }
  }, []);

  // Load ticket data from server action
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
          triggerTurnAlert(ticketNum);
        }
        prevStatusRef.current = currentStatus;
      } else {
        setErrorMsg(res.error || `Ticket ${ticketNum} was not found for today.`);
        setData(null);
      }
    } catch (err) {
      setErrorMsg("Failed to check queue status. Please check your connection.");
    } finally {
      setLoading(false);
    }
  }, [triggerTurnAlert]);

  // Initial load
  useEffect(() => {
    if (activeTicket) {
      loadTicket(activeTicket);
    }
  }, [activeTicket, loadTicket]);

  // Manage Wake Lock based on active ticket status
  useEffect(() => {
    if (!activeTicket || !data) {
      releaseWakeLock();
      return;
    }

    const currentStatus = data?.ticket?.triageStatus?.toLowerCase();
    const isCompleted = currentStatus === "discharged" || data?.ticket?.overallStatus === "Completed";

    if (isCompleted || !wakeLockEnabled) {
      releaseWakeLock();
    } else {
      requestWakeLock();
    }

    return () => {
      releaseWakeLock();
    };
  }, [activeTicket, data, wakeLockEnabled, requestWakeLock, releaseWakeLock]);

  // Realtime subscription via Supabase with Heartbeat tracking
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
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          setConnectionStatus("live");
        } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT" || status === "CLOSED") {
          setConnectionStatus("polling");
        }
      });

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

    // First user gesture: unlock audio
    getAudioContext();

    setActiveTicket(clean);
    router.replace(`/queue/track?ticket=${clean}`);
  };

  const handleImReturning = async () => {
    if (!activeTicket || isReturningLoading || cooldownRemaining > 0) return;
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
      if (res.success) {
        // Activate 60s cooldown lock
        const expiryTime = Date.now() + 60 * 1000;
        if (typeof window !== "undefined") {
          sessionStorage.setItem(`arjen_returning_cooldown_${activeTicket}`, expiryTime.toString());
        }
        setCooldownRemaining(60);
      } else {
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

  // Companion share action using Web Share API or Clipboard copy
  const handleShareTracker = async () => {
    const url = typeof window !== "undefined" ? window.location.href : "";
    const title = `Ticket ${activeTicket} | AR-JEN Clinic Queue Tracker`;
    const text = `Tracking Queue Ticket ${activeTicket} at AR-JEN Maternity Clinic. View live queue position and estimated wait time here:`;

    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({ title, text, url });
        return;
      } catch (err) {
        // User cancelled or share failed, fallback to clipboard
      }
    }

    if (typeof navigator !== "undefined" && navigator.clipboard) {
      try {
        await navigator.clipboard.writeText(url);
        setShareCopied(true);
        setTimeout(() => setShareCopied(false), 2500);
      } catch (err) {
        console.error("Clipboard copy failed:", err);
      }
    }
  };

  const enableAudioAndTest = () => {
    getAudioContext();
    setAudioEnabled(true);
    if (typeof window !== "undefined") {
      localStorage.setItem("arjen_pocket_audio", "true");
    }
    triggerTurnAlert(activeTicket || "W-001", true);
  };

  const triageStatus = data?.ticket?.triageStatus?.toLowerCase();
  const isConsultation = triageStatus === "consultation";
  const isVitalSigns = triageStatus === "vital signs";
  const isSteppedOut = triageStatus === "stepped out";
  const isReturning = triageStatus === "returning" || cooldownRemaining > 0;
  const isDischarged = triageStatus === "discharged" || data?.ticket?.overallStatus === "Completed";
  const isWaiting = triageStatus === "waiting" || !triageStatus;

  return (
    <div className={`min-h-screen bg-gradient-to-b from-rose-50/70 via-white to-gray-50 text-slate-800 flex flex-col items-center justify-between p-4 sm:p-6 font-sans transition-colors duration-500 ${
      isVisualAlerting ? "bg-rose-100 ring-8 ring-rose-500/40 ring-inset" : ""
    }`}>
      
      {/* ── Top Header ────────────────────────────────────────── */}
      <header className="w-full max-w-md flex items-center justify-between py-2 border-b border-gray-100 pb-3">
        <Link href="/" className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-rose-500 to-rose-600 flex items-center justify-center text-white font-black text-sm shadow-md shadow-rose-500/20">
            AJ
          </div>
          <div>
            <span className="text-sm font-black tracking-tight text-slate-900 block leading-tight">
              AR-JEN Clinic
            </span>
            <span className="text-[10px] font-bold text-rose-600 uppercase tracking-widest block">
              Pocket Queue Tracker
            </span>
          </div>
        </Link>

        {/* Header Controls: Audio Toggle, WakeLock, Refresh */}
        <div className="flex items-center gap-1.5">
          {/* Screen Wake Lock Toggle */}
          {"wakeLock" in (typeof navigator !== "undefined" ? navigator : {}) && (
            <button
              type="button"
              onClick={() => {
                const next = !wakeLockEnabled;
                setWakeLockEnabled(next);
                if (!next) releaseWakeLock();
                else requestWakeLock();
              }}
              className={`p-2 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                wakeLockActive && wakeLockEnabled
                  ? "bg-amber-50 text-amber-700 border-amber-200 shadow-2xs"
                  : "bg-white text-slate-400 border-gray-200"
              }`}
              title={wakeLockActive ? "Screen Keep-Awake is Active" : "Click to Keep Screen Awake"}
            >
              {wakeLockActive ? <Sun className="w-4 h-4 text-amber-500 animate-pulse" /> : <SunMedium className="w-4 h-4" />}
            </button>
          )}

          {/* Audio Chime Toggle */}
          <button
            type="button"
            onClick={() => {
              const next = !audioEnabled;
              setAudioEnabled(next);
              if (typeof window !== "undefined") {
                localStorage.setItem("arjen_pocket_audio", next ? "true" : "false");
              }
              if (next) {
                getAudioContext();
                playAlertChime();
                triggerHapticFeedback();
              }
            }}
            className={`p-2 rounded-xl border transition-all text-xs font-bold flex items-center gap-1.5 cursor-pointer ${
              audioEnabled
                ? "bg-rose-50 text-rose-600 border-rose-200 shadow-2xs"
                : "bg-white text-slate-400 border-gray-200"
            }`}
            title={audioEnabled ? "Alert Sound is ON" : "Alert Sound is MUTED (Click to Enable)"}
          >
            {audioEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </button>

          {/* Refresh Button */}
          {activeTicket && (
            <button
              type="button"
              onClick={() => loadTicket(activeTicket)}
              disabled={loading}
              className="p-2 rounded-xl bg-white border border-gray-200 text-slate-600 hover:text-slate-900 transition-all cursor-pointer shadow-2xs"
              title="Refresh queue status"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin text-rose-500" : ""}`} />
            </button>
          )}
        </div>
      </header>

      {/* ── Main Container ────────────────────────────────────── */}
      <main className="w-full max-w-md my-auto py-4 space-y-4">
        
        {/* First-Gesture Audio Enablement Prompt Banner */}
        {!audioEnabled && !audioAutoPromptDismissed && (
          <div className="bg-gradient-to-r from-rose-50 via-white to-rose-50 border border-rose-200/90 rounded-2xl p-3 shadow-sm flex items-center justify-between gap-3 text-left">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-xl bg-rose-500 text-white flex items-center justify-center shrink-0 shadow-sm shadow-rose-500/20">
                <BellRing className="w-4 h-4 animate-bounce" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-black text-slate-900 leading-tight">
                  Enable Audible Turn Alert
                </p>
                <p className="text-[11px] text-slate-500 truncate">
                  Your phone will chime loudly when called.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={enableAudioAndTest}
                className="py-1.5 px-3 rounded-xl bg-rose-600 hover:bg-rose-700 active:scale-[0.98] text-white text-xs font-black tracking-wide shadow-sm shadow-rose-600/30 transition-all cursor-pointer"
              >
                Turn On
              </button>
              <button
                type="button"
                onClick={() => setAudioAutoPromptDismissed(true)}
                className="text-slate-400 hover:text-slate-600 text-xs px-1.5 py-1"
                title="Dismiss"
              >
                ✕
              </button>
            </div>
          </div>
        )}

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
              isVisualAlerting
                ? "ring-8 ring-rose-500 shadow-2xl shadow-rose-500/40 animate-pulse bg-rose-600 text-white border-rose-400"
                : isConsultation
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
              
              {/* Card top banner badge & action utilities */}
              <div className="flex items-center justify-between mb-3">
                <span className={`text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full ${
                  isConsultation || isVisualAlerting
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

                <div className="flex items-center gap-2">
                  {/* Share Tracker Button */}
                  <button
                    type="button"
                    onClick={handleShareTracker}
                    className={`p-1.5 rounded-lg border text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                      isConsultation || isVitalSigns || isVisualAlerting
                        ? "bg-white/20 text-white border-white/30 hover:bg-white/30"
                        : "bg-gray-50 text-slate-600 border-gray-200 hover:bg-gray-100"
                    }`}
                    title="Share tracker link with companion"
                  >
                    {shareCopied ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-500" />
                        <span className="text-[10px] font-bold">Copied!</span>
                      </>
                    ) : (
                      <>
                        <Share2 className="w-3.5 h-3.5" />
                        <span className="text-[10px] hidden xs:inline">Share</span>
                      </>
                    )}
                  </button>

                  {/* Switch / Change Ticket */}
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
                      isConsultation || isVitalSigns || isVisualAlerting ? "text-white/80 hover:text-white" : "text-slate-400 hover:text-slate-600"
                    }`}
                  >
                    Change
                  </button>
                </div>
              </div>

              {/* Big Ticket Number */}
              <div className="text-center my-2">
                <div className={`text-6xl sm:text-7xl font-mono font-black tracking-tight ${
                  isConsultation || isVitalSigns || isVisualAlerting ? "text-white" : "text-slate-900"
                }`}>
                  {activeTicket}
                </div>
                <p className={`text-xs font-semibold tracking-wide mt-1 uppercase ${
                  isConsultation || isVitalSigns || isVisualAlerting ? "text-white/80" : "text-slate-500"
                }`}>
                  Your Queue Ticket
                </p>
              </div>

              {/* Dynamic Status Display */}
              <div className="mt-5 pt-4 border-t border-current/10">
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

                {isSteppedOut && !isReturning && (
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
                      disabled={isReturningLoading || cooldownRemaining > 0}
                      className="w-full py-3.5 px-4 rounded-2xl bg-amber-500 hover:bg-amber-600 active:scale-[0.98] text-white font-black text-sm tracking-wide shadow-lg shadow-amber-500/30 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-75 disabled:pointer-events-none"
                    >
                      <Footprints className="w-4 h-4" />
                      <span>{isReturningLoading ? "Notifying Clinic..." : "I'm on My Way Back!"}</span>
                    </button>
                  </div>
                )}

                {isReturning && (
                  <div className="text-center space-y-2.5">
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-cyan-200 text-cyan-900 text-xs font-black uppercase tracking-wider animate-pulse">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Staff Notified: On Way Back
                    </div>
                    <h2 className="text-lg font-black text-cyan-900 leading-tight">
                      Midwives alerted that you are returning
                    </h2>
                    <p className="text-xs text-cyan-800">
                      Your ticket is highlighted in cyan on the clinic board. Please approach the front desk or lobby triage upon arrival so you can be placed right back into the next open spot.
                    </p>

                    {cooldownRemaining > 0 && (
                      <div className="w-full py-2.5 px-3 rounded-xl bg-cyan-100/70 border border-cyan-200 text-cyan-900 font-bold text-[11px] flex items-center justify-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-cyan-700 animate-spin" />
                        <span>Midwife Notified • Approach Front Desk ({cooldownRemaining}s)</span>
                      </div>
                    )}
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
                          ~{data?.estimatedWaitMinutes ?? 12}
                        </span>
                        <span className="text-[10px] text-slate-400 font-medium">
                          minutes
                        </span>
                      </div>
                    </div>

                    <div className="bg-rose-50/60 rounded-2xl p-3 border border-rose-100/80 flex items-start gap-2.5 text-left">
                      <Clock className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                      <div className="space-y-0.5">
                        <p className="text-xs text-slate-700 leading-relaxed font-medium">
                          Feel free to sit in the shaded gazebo or grab water nearby. Keep this page open—your phone will chime and alert you when your turn approaches!
                        </p>
                        {data?.patientsAhead > 0 && (
                          <p className="text-[10px] text-slate-500">
                            Estimated from {data.patientsAhead} patient{data.patientsAhead === 1 ? "" : "s"} ahead
                            {data?.serviceBreakdown?.laborCount > 0 ? " (includes Labor Intake triage)" : ""}
                          </p>
                        )}
                      </div>
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
                
                {/* Heartbeat Status Indicator */}
                <div className="flex items-center gap-1.5 font-mono text-[10px]">
                  {connectionStatus === "live" && (
                    <span className="flex items-center gap-1.5 text-emerald-600">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                      Live Sync
                    </span>
                  )}
                  {connectionStatus === "polling" && (
                    <span className="flex items-center gap-1.5 text-amber-600">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                      Auto-Refreshing
                    </span>
                  )}
                  {connectionStatus === "offline" && (
                    <span className="flex items-center gap-1.5 text-red-600">
                      <WifiOff className="w-3 h-3 text-red-500" />
                      Offline
                    </span>
                  )}
                </div>
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

              {/* Test Alert Button */}
              <div className="pt-1 flex items-center justify-between text-[11px] text-slate-500">
                <span>Want to check your phone&apos;s alert?</span>
                <button
                  type="button"
                  onClick={() => triggerTurnAlert(activeTicket, true)}
                  className="font-bold text-rose-600 hover:text-rose-700 underline cursor-pointer"
                >
                  ⚡ Test Alert Now
                </button>
              </div>
            </div>

            {/* Error Message if lookup failed */}
            {errorMsg && (
              <div className="bg-red-50 border border-red-200 rounded-2xl p-4 text-red-700 text-xs flex items-center gap-3">
                <AlertTriangle className="w-5 h-5 shrink-0 text-red-500" />
                <p>{errorMsg}</p>
              </div>
            )}

            {/* DPA 2012 Privacy Notice & Screen Wake Pill */}
            <div className="flex items-center justify-between text-[11px] text-slate-400 font-medium px-1">
              <div className="flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-slate-400" />
                <span>Compliant with PH DPA 2012</span>
              </div>
              {wakeLockActive && (
                <span className="text-[10px] text-amber-600 font-bold flex items-center gap-1">
                  <Sun className="w-3 h-3 text-amber-500" />
                  Screen Awake
                </span>
              )}
            </div>

          </div>
        )}

      </main>

      {/* ── Bottom Footer ─────────────────────────────────────── */}
      <footer className="w-full max-w-md text-center py-2 text-[11px] text-slate-400 border-t border-gray-100 pt-3">
        <p>© AR-JEN Maternity & Lying-In Clinic</p>
        {lastRefreshed && (
          <p className="text-[10px] text-slate-400/80 mt-0.5 font-mono">
            Synced {relativeTimeStr} • {lastRefreshed.toLocaleTimeString("en-PH", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: true })}
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
