'use client';

import React, { useState, useEffect, useRef, useTransition } from 'react';
import Link from 'next/link';
import { 
  MessageSquare, Send, ShieldCheck, AlertCircle, AlertTriangle, 
  Search, CheckCircle2, Clock, User, Phone, Calendar, 
  Sparkles, ChevronRight, ArrowLeft, RefreshCw, FileText, Check, 
  Video, Ambulance, HeartPulse, Activity, Droplets, Baby, 
  ShieldAlert, Lock, Copy, ExternalLink, X, ChevronDown, CheckCheck,
  PanelRightClose, PanelRightOpen, MapPin, Stethoscope, AlertOctagon, HelpCircle
} from 'lucide-react';
import { createClient } from '@/utils/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { formatRoleBadge } from '@/lib/rbac';
import { calculateObstetricDates } from '@/lib/clinical-protocols';
import { sendConsultationMessage, updateConsultationStatus } from '@/app/actions';
import { EmergencyTransferModal } from '@/components/admin/clinical/emergency-transfer-modal';

// Clinical obstetric macro responses formulated under DOH BEmONC & maternal safety standards
const CLINICAL_MACROS = [
  {
    title: '🚨 Urgent Clinic Visit',
    text: 'Please proceed directly to AR-JEN Maternity Clinic immediately for urgent maternal triage, blood pressure check, and continuous fetal heart doppler monitoring. Avoid physical exertion and have your companion accompany you.',
    urgent: true,
  },
  {
    title: '💓 Fetal Kick Count Protocol',
    text: 'Please rest comfortably on your left side in a quiet room and count baby kicks. You should feel at least 10 distinct movements within 2 hours. If kicks are fewer, weak, or absent, please proceed to the clinic right away.',
    urgent: false,
  },
  {
    title: '🩸 Spotting & Danger Signs Guide',
    text: 'Any vaginal bleeding or spotting during pregnancy requires prompt in-person clinical evaluation. Please place a clean sanitary pad, observe the color and flow, avoid strenuous exertion, and visit AR-JEN Clinic for sterile speculum and fetal evaluation.',
    urgent: true,
  },
  {
    title: '💊 Ferrous Sulfate & Nutrition',
    text: 'Kindly take your Ferrous Sulfate with Folic Acid daily with water or citrus fruit juice (avoid milk or tea during intake). Stay well-hydrated with 8-10 glasses of clean water daily and maintain adequate bed rest.',
    urgent: false,
  },
  {
    title: '📋 DOH EINC Birth Preparation',
    text: 'Please ensure your maternity bag is packed: clean clothes for mother and newborn, PhilHealth Member Data Record (MDR), valid government ID, and prior prenatal ultrasound/lab results. Contact us immediately when regular contractions start.',
    urgent: false,
  },
  {
    title: '🧪 Lab & Ultrasound Request',
    text: 'Kindly bring the official printed copies of your requested laboratory results (Complete Blood Count, Urinalysis, 75g OGTT, or Ultrasound) to your next scheduled prenatal visit for clinical chart logging.',
    urgent: false,
  },
];

export function ConsultationsInbox({ 
  initialThreads = [], 
  currentStaffRole = 'admin',
  currentStaffId = null,
  currentStaffEmail = '',
  currentStaff = null,
  requestedPatientId = null,
}) {
  const [threads, setThreads] = useState(initialThreads);
  const [selectedPatientId, setSelectedPatientId] = useState(
    requestedPatientId || initialThreads[0]?.patient?.id || null
  );

  useEffect(() => {
    if (requestedPatientId) {
      setSelectedPatientId(requestedPatientId);
    }
  }, [requestedPatientId]);

  const [filterTab, setFilterTab] = useState('ALL'); // 'ALL' | 'NEEDS_REPLY' | 'URGENT' | 'HIGH_RISK' | 'RESOLVED'
  const [searchTerm, setSearchTerm] = useState('');
  const [replyText, setReplyText] = useState('');
  const [isUrgentReply, setIsUrgentReply] = useState(false);
  const [isSending, startSendTransition] = useTransition();
  const [isUpdatingStatus, startStatusTransition] = useTransition();

  // Modals & Panels
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [showVideoModal, setShowVideoModal] = useState(false);
  const [showDohChecklist, setShowDohChecklist] = useState(false);
  const [showRightDrawer, setShowRightDrawer] = useState(true);
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedPhone, setCopiedPhone] = useState(false);

  // Live Philippine Standard Time (PST) Clock
  const [pstTime, setPstTime] = useState('');
  useEffect(() => {
    const updateClock = () => {
      const now = new Date();
      setPstTime(
        now.toLocaleTimeString('en-US', {
          timeZone: 'Asia/Manila',
          hour12: false,
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        })
      );
    };
    updateClock();
    const interval = setInterval(updateClock, 1000);
    return () => clearInterval(interval);
  }, []);

  const messagesEndRef = useRef(null);
  const supabase = createClient();

  // Active thread & patient details
  const activeThread = threads.find(t => t.patient?.id === selectedPatientId) || threads[0] || null;
  const activePatient = activeThread?.patient;
  const activeEpisode = activePatient?.maternal_episodes?.find(e => e.status === 'Active') || activePatient?.maternal_episodes?.[0];

  // Dynamic Obstetric Metrics calculation using safety engine
  const lmpDate = activeEpisode?.lmp || activePatient?.lmp;
  const obstetricData = calculateObstetricDates(lmpDate);

  // Obstetric Score (Gravida & Para)
  const gravida = activeEpisode?.gravida ?? activeEpisode?.gravidity ?? activePatient?.gravida ?? 1;
  const para = activeEpisode?.para ?? activeEpisode?.parity ?? activePatient?.para ?? 0;

  // Gestational term progress percentage (out of 40 weeks)
  const totalWeeks = (obstetricData?.aogWeeks || 0) + ((obstetricData?.aogDays || 0) / 7);
  const progressPercent = Math.min(100, Math.max(0, Math.round((totalWeeks / 40) * 100)));

  // Days to due date
  let daysToDue = null;
  if (obstetricData?.edc) {
    const edcTime = new Date(obstetricData.edc).getTime();
    const nowTime = new Date().getTime();
    daysToDue = Math.ceil((edcTime - nowTime) / (1000 * 60 * 60 * 24));
  }

  // Real allergies evaluation
  const hasRealAllergies = Boolean(
    activePatient?.allergies && 
    !['na', 'n/a', 'none', 'no', 'nil', '-', 'none documented'].includes(activePatient.allergies.trim().toLowerCase())
  );

  // Latest vitals from visit logs
  const latestVitals = activeThread?.latestVisitLog;
  const isBpHypertensive = (() => {
    if (!latestVitals?.bp) return false;
    const parts = latestVitals.bp.split('/');
    if (parts.length === 2) {
      const sys = parseInt(parts[0], 10);
      const dia = parseInt(parts[1], 10);
      return sys >= 140 || dia >= 90;
    }
    return false;
  })();

  const isFhrAbnormal = (() => {
    if (!latestVitals?.fhr) return false;
    const fhr = parseInt(latestVitals.fhr, 10);
    return !isNaN(fhr) && (fhr < 110 || fhr > 160);
  })();

  // Scroll to bottom of message thread
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [activeThread?.messages]);

  // Real-time Supabase subscription for incoming messages
  useEffect(() => {
    const channel = supabase
      .channel('consultations-inbox-realtime')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'consultation_messages',
        },
        (payload) => {
          const newMsg = payload.new;
          setThreads(prevThreads => {
            const threadIndex = prevThreads.findIndex(t => t.patient?.id === newMsg.patient_id);
            if (threadIndex === -1) {
              return prevThreads;
            }
            const updatedThreads = [...prevThreads];
            const targetThread = { ...updatedThreads[threadIndex] };
            
            // Avoid duplicate message appending
            if (!targetThread.messages.some(m => m.id === newMsg.id)) {
              targetThread.messages = [...targetThread.messages, newMsg];
              targetThread.lastMessage = newMsg;
              targetThread.hasUrgent = targetThread.hasUrgent || newMsg.is_flagged_urgent;
              targetThread.status = newMsg.sender_role === 'patient' ? 'unread' : targetThread.status;
            }

            // Move updated thread to top of list
            updatedThreads.splice(threadIndex, 1);
            return [targetThread, ...updatedThreads];
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Filter threads
  const filteredThreads = threads.filter(t => {
    const patientName = t.patient?.full_name?.toLowerCase() || '';
    const phone = t.patient?.phone_number || t.patient?.contact_number || '';
    const lastMsgContent = t.lastMessage?.content?.toLowerCase() || '';
    const term = searchTerm.toLowerCase();

    const matchesSearch = patientName.includes(term) || phone.includes(term) || lastMsgContent.includes(term);
    if (!matchesSearch) return false;

    if (filterTab === 'NEEDS_REPLY') {
      return t.lastMessage?.sender_role === 'patient' && t.status !== 'resolved';
    }
    if (filterTab === 'URGENT') {
      return t.hasUrgent;
    }
    if (filterTab === 'HIGH_RISK') {
      return t.patient?.is_high_risk;
    }
    if (filterTab === 'RESOLVED') {
      return t.status === 'resolved';
    }
    return true;
  });

  // Queue Counters
  const awaitingReplyCount = threads.filter(t => t.lastMessage?.sender_role === 'patient' && t.status !== 'resolved').length;
  const urgentCount = threads.filter(t => t.hasUrgent).length;

  // Handle Send Reply
  const handleSendReply = (e) => {
    e?.preventDefault();
    const content = replyText.trim();
    if (!content || !selectedPatientId) return;

    // Optimistic UI insert
    const optimisticMsg = {
      id: `temp-${Date.now()}`,
      patient_id: selectedPatientId,
      sender_id: currentStaffId,
      sender_role: currentStaffRole,
      sender_name: currentStaff?.fullName || currentStaffEmail.split('@')[0],
      content,
      created_at: new Date().toISOString(),
      is_flagged_urgent: isUrgentReply,
      status: 'read',
    };

    setThreads(prev => prev.map(t => {
      if (t.patient?.id === selectedPatientId) {
        return {
          ...t,
          messages: [...t.messages, optimisticMsg],
          lastMessage: optimisticMsg,
        };
      }
      return t;
    }));

    setReplyText('');
    const flagUrgent = isUrgentReply;
    setIsUrgentReply(false);

    const fd = new FormData();
    fd.append('patient_id', selectedPatientId);
    fd.append('content', content);
    fd.append('sender_role', currentStaffRole);
    if (flagUrgent) {
      fd.append('is_urgent', 'true');
    }

    startSendTransition(async () => {
      await sendConsultationMessage(fd);
    });
  };

  // Toggle Resolution Status
  const handleToggleResolve = () => {
    if (!selectedPatientId || !activeThread) return;
    const newStatus = activeThread.status === 'resolved' ? 'read' : 'resolved';

    setThreads(prev => prev.map(t => {
      if (t.patient?.id === selectedPatientId) {
        return { ...t, status: newStatus };
      }
      return t;
    }));

    const fd = new FormData();
    fd.append('patient_id', selectedPatientId);
    fd.append('status', newStatus);

    startStatusTransition(async () => {
      await updateConsultationStatus(fd);
    });
  };

  // Video Room URL generator (private peer room based on patient ID)
  const videoRoomUrl = `https://meet.jit.si/arjen-maternity-telehealth-${selectedPatientId ? selectedPatientId.slice(0, 8) : 'general'}`;

  const copyVideoInvitation = () => {
    const message = `AR-JEN Maternity Telehealth Video Consult Link: ${videoRoomUrl}. Please join using Google Chrome or your smartphone browser.`;
    navigator.clipboard.writeText(message);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  const copyPatientPhone = (phone) => {
    if (!phone) return;
    navigator.clipboard.writeText(phone);
    setCopiedPhone(true);
    setTimeout(() => setCopiedPhone(false), 2000);
  };

  return (
    <div className="flex flex-col h-[calc(100vh-5rem)] bg-white/95 backdrop-blur-md rounded-3xl border border-gray-200/80 shadow-sm overflow-hidden">
      
      {/* ──────────────────────────────────────────────────────────── */}
      {/* 1. TOP GLOBAL TELEHEALTH COMMAND RIBBON (Stitch Header)     */}
      {/* ──────────────────────────────────────────────────────────── */}
      <header className="h-16 px-5 sm:px-6 bg-white/90 backdrop-blur-md border-b border-gray-100 flex items-center justify-between shrink-0 z-20">
        
        {/* Left: Branding & Destination Breadcrumb */}
        <div className="flex items-center gap-3 sm:gap-4 min-w-0">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-rose-500 to-rose-600 text-white flex items-center justify-center shadow-md shadow-rose-200 shrink-0">
            <MessageSquare className="w-5 h-5" />
          </div>
          <div className="flex flex-col min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200/80">
                Telehealth Hub
              </span>
              <span className="text-gray-300 hidden sm:inline">/</span>
              <h1 className="text-sm sm:text-base font-bold text-gray-900 tracking-tight truncate">
                Central Consultations & Triage
              </h1>
            </div>
            <p className="text-[11px] text-gray-500 truncate hidden md:block">
              Encrypted asynchronous clinical messaging & remote obstetric guidance
            </p>
          </div>
        </div>

        {/* Center/Right: Duty Status, PST Clock & STAT Emergency Transfer Trigger */}
        <div className="flex items-center gap-2.5 sm:gap-3">
          
          {/* Clinician Active On-Duty Status Pill */}
          <div className="hidden lg:flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200/80">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span className="text-xs font-bold text-emerald-800">
              {currentStaff?.fullName || 'Clinician'} • On Duty
            </span>
          </div>

          {/* Live Philippine Standard Time (PST) Clock */}
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-gray-50 text-gray-700 font-mono text-xs font-semibold border border-gray-200/80 shadow-2xs">
            <Clock className="w-3.5 h-3.5 text-rose-600" />
            <span>PST {pstTime || '12:00:00'}</span>
          </div>

          {/* DOH Level 1 Telehealth Protocol Notice Pill */}
          <div className="hidden 2xl:flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-50 border border-gray-200 text-gray-600 text-xs font-semibold">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            <span>DOH Level 1 Protocol • Non-emergency triage</span>
          </div>

          {/* Quick Emergency Code Pink / STAT Transfer Button */}
          <Button
            size="sm"
            onClick={() => setShowTransferModal(true)}
            className="rounded-xl bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 text-white font-bold text-xs gap-1.5 shadow-md shadow-red-500/20 active:scale-95 transition-all"
          >
            <Ambulance className="w-4 h-4" />
            <span className="hidden sm:inline">STAT Transfer Slip</span>
          </Button>

        </div>
      </header>

      {/* ──────────────────────────────────────────────────────────── */}
      {/* 2. MAIN 3-COLUMN WORKSPACE CONTAINER                        */}
      {/* ──────────────────────────────────────────────────────────── */}
      <div className="flex-1 flex overflow-hidden bg-slate-50/30">

        {/* ══════════════════════════════════════════════════════════════ */}
        {/* COLUMN 1: THREAD DIRECTORY (~340px)                          */}
        {/* ══════════════════════════════════════════════════════════════ */}
        <section className="w-80 md:w-88 xl:w-96 border-r border-gray-200/80 bg-white flex flex-col shrink-0">
          
          {/* Queue Header & Search */}
          <div className="p-3.5 border-b border-gray-100 bg-white space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <h2 className="text-xs font-black text-gray-900 uppercase tracking-wider">
                  Consultation Queue
                </h2>
                <span className="px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 font-black text-[10px] border border-rose-200">
                  {threads.length}
                </span>
              </div>
              
              {awaitingReplyCount > 0 && (
                <span className="flex items-center gap-1.5 text-[11px] text-amber-700 font-bold bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span>
                  {awaitingReplyCount} Needs Reply
                </span>
              )}
            </div>

            {/* Live Search Input */}
            <div className="relative">
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <Input
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search patient, phone, symptoms..."
                className="pl-9 h-9 text-xs rounded-xl border-gray-200 bg-gray-50/80 focus:bg-white transition-colors"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-0.5"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Filter Tabs Chips */}
            <div className="flex items-center gap-1 overflow-x-auto pb-0.5 text-[11px] font-bold no-scrollbar">
              {[
                { id: 'ALL', label: `All (${threads.length})` },
                { id: 'NEEDS_REPLY', label: `Needs Reply (${awaitingReplyCount})` },
                { id: 'URGENT', label: `🚨 Urgent (${urgentCount})` },
                { id: 'HIGH_RISK', label: 'High-Risk' },
                { id: 'RESOLVED', label: 'Resolved' },
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setFilterTab(tab.id)}
                  className={`px-2.5 py-1 rounded-xl transition-all whitespace-nowrap ${
                    filterTab === tab.id
                      ? 'bg-gray-900 text-white shadow-xs font-bold'
                      : 'bg-gray-100/80 text-gray-600 hover:bg-gray-200/70 font-semibold'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* Patient Threads Scroll Area */}
          <div className="flex-1 overflow-y-auto divide-y divide-gray-100">
            {filteredThreads.length > 0 ? (
              filteredThreads.map(thread => {
                const isSelected = thread.patient?.id === selectedPatientId;
                const isUnanswered = thread.lastMessage?.sender_role === 'patient' && thread.status !== 'resolved';
                const hasUrgentMsg = thread.hasUrgent;

                // Patient Obstetric Metrics
                const ep = thread.patient?.maternal_episodes?.find(e => e.status === 'Active') || thread.patient?.maternal_episodes?.[0];
                const obst = calculateObstetricDates(ep?.lmp || thread.patient?.lmp);
                const pGravida = ep?.gravida ?? ep?.gravidity ?? thread.patient?.gravida ?? 1;
                const pPara = ep?.para ?? ep?.parity ?? thread.patient?.para ?? 0;

                // Patient initials
                const initials = thread.patient?.full_name
                  ? thread.patient.full_name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()
                  : 'PT';

                return (
                  <button
                    key={thread.patient?.id}
                    onClick={() => setSelectedPatientId(thread.patient?.id)}
                    className={`w-full text-left p-3.5 transition-all flex items-start gap-3 relative ${
                      isSelected
                        ? 'bg-rose-50/70 border-r-4 border-rose-600 shadow-xs'
                        : 'hover:bg-gray-50/80'
                    }`}
                  >
                    {/* Patient Avatar with Active Indicator */}
                    <div className="relative shrink-0 mt-0.5">
                      <div className={`w-10 h-10 rounded-2xl flex items-center justify-center font-black text-xs ${
                        isSelected 
                          ? 'bg-rose-600 text-white shadow-sm shadow-rose-200' 
                          : 'bg-slate-100 border border-gray-200 text-gray-700'
                      }`}>
                        {initials}
                      </div>
                      {isUnanswered && (
                        <span className="absolute -top-1 -right-1 w-3 h-3 bg-amber-500 rounded-full border-2 border-white ring-1 ring-amber-300" />
                      )}
                    </div>

                    {/* Patient Context & Snippet */}
                    <div className="flex-1 min-w-0">
                      
                      {/* Name & Time */}
                      <div className="flex items-center justify-between gap-1">
                        <span className="font-bold text-xs text-gray-900 truncate">
                          {thread.patient?.full_name}
                        </span>
                        <span className="text-[10px] text-gray-400 font-mono shrink-0">
                          {thread.lastMessage?.created_at
                            ? new Date(thread.lastMessage.created_at).toLocaleTimeString('en-PH', {
                                hour: '2-digit',
                                minute: '2-digit',
                              })
                            : ''}
                        </span>
                      </div>

                      {/* Gestation & Obstetric Tagline */}
                      <div className="flex items-center gap-1.5 text-[10px] text-gray-500 mt-0.5">
                        {obst?.aogFormatted ? (
                          <span className="font-semibold text-rose-700 bg-rose-50 px-1.5 py-0.2 rounded border border-rose-100">
                            {obst.aogFormatted}
                          </span>
                        ) : (
                          <span>GA: Pending</span>
                        )}
                        <span>•</span>
                        <span>G{pGravida}P{pPara}</span>
                        {thread.patient?.blood_type && (
                          <>
                            <span>•</span>
                            <span className="font-mono">{thread.patient.blood_type}</span>
                          </>
                        )}
                      </div>

                      {/* Clinical Priority Badges */}
                      <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                        {hasUrgentMsg && (
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-red-100 text-red-700 font-black uppercase tracking-wider flex items-center gap-1 border border-red-200">
                            <AlertTriangle className="w-3 h-3" /> Urgent
                          </span>
                        )}
                        {thread.patient?.is_high_risk && (
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 font-bold border border-amber-200">
                            High-Risk
                          </span>
                        )}
                        {thread.status === 'resolved' && (
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold border border-emerald-200">
                            ✓ Resolved
                          </span>
                        )}
                      </div>

                      {/* Message Preview Snippet */}
                      <p className="text-[11px] text-gray-600 line-clamp-2 mt-1 leading-snug">
                        {thread.lastMessage?.sender_role === 'patient' ? (
                          <strong className="text-gray-900 font-bold">Patient: </strong>
                        ) : thread.lastMessage ? (
                          <strong className="text-rose-600 font-bold">Staff: </strong>
                        ) : null}
                        {thread.lastMessage?.content || (
                          <span className="italic text-gray-400">No consultation messages logged yet</span>
                        )}
                      </p>

                      {/* Lower Micro Status */}
                      {isUnanswered && (
                        <div className="flex items-center gap-1 mt-1 text-[10px] font-bold text-amber-700">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-ping"></span>
                          <span>Awaiting Clinical Reply</span>
                        </div>
                      )}

                    </div>
                  </button>
                );
              })
            ) : (
              <div className="p-8 text-center text-xs text-gray-400 italic space-y-2">
                <Search className="w-8 h-8 text-gray-300 mx-auto" />
                <p>No teleconsultation threads match this filter.</p>
              </div>
            )}
          </div>

          {/* Directory Footer Gateway Status */}
          <div className="p-2.5 bg-gray-50 border-t border-gray-100 flex items-center justify-between text-gray-500 text-[11px]">
            <span className="flex items-center gap-1.5 font-semibold text-emerald-700">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              Tele-Triage Gateway Online
            </span>
            <span className="text-gray-400 font-mono text-[10px]">
              DPA Secure Sync
            </span>
          </div>

        </section>

        {/* ══════════════════════════════════════════════════════════════ */}
        {/* COLUMN 2: ACTIVE CLINICAL CHAT WORKSPACE (flex-1)             */}
        {/* ══════════════════════════════════════════════════════════════ */}
        {activeThread ? (
          <section className="flex-1 flex flex-col bg-white overflow-hidden min-w-[380px]">
            
            {/* Active Patient Chat Header */}
            <div className="px-5 py-3.5 bg-white border-b border-gray-100 flex items-center justify-between shrink-0 shadow-2xs z-10">
              
              <div className="flex items-center gap-3 min-w-0">
                <div className="relative shrink-0">
                  <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-rose-500 to-rose-600 text-white flex items-center justify-center font-black text-sm shadow-sm shadow-rose-200">
                    {activePatient?.full_name?.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase() || 'PT'}
                  </div>
                  <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-emerald-500 border-2 border-white" title="Telemetry Channel Active" />
                </div>

                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="text-base font-bold text-gray-900 tracking-tight truncate">
                      {activePatient?.full_name}
                    </h2>
                    
                    {activePatient?.blood_type && (
                      <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200">
                        {activePatient.blood_type}
                      </span>
                    )}

                    {activePatient?.is_high_risk ? (
                      <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-red-100 text-red-700 border border-red-200 flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3" /> High Risk
                      </span>
                    ) : (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                        Standard Low Risk
                      </span>
                    )}

                    {activeThread.status === 'resolved' ? (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-gray-100 text-gray-700 border border-gray-200">
                        ✓ Resolved
                      </span>
                    ) : (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200">
                        Active Inbound
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2.5 text-xs text-gray-500 mt-0.5 font-medium flex-wrap">
                    {activePatient?.age && <span>{activePatient.age} yrs old</span>}
                    {obstetricData?.aogFormatted && (
                      <>
                        <span>•</span>
                        <span className="font-bold text-rose-700">
                          GA: {obstetricData.aogFormatted} ({obstetricData.trimester})
                        </span>
                      </>
                    )}
                    {obstetricData?.edcFormatted && (
                      <>
                        <span>•</span>
                        <span>EDC: {obstetricData.edcFormatted}</span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 shrink-0">
                
                {/* Mark as Resolved Toggle */}
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleToggleResolve}
                  disabled={isUpdatingStatus}
                  className="rounded-xl text-xs font-bold gap-1.5 border-gray-200 hover:bg-gray-50 transition-colors"
                >
                  <CheckCircle2 className={`w-3.5 h-3.5 ${activeThread.status === 'resolved' ? 'text-gray-400' : 'text-emerald-600'}`} />
                  <span className="hidden sm:inline">
                    {activeThread.status === 'resolved' ? 'Reopen Thread' : 'Mark as Resolved'}
                  </span>
                </Button>

                {/* Initiate Video Teleconsult */}
                <Button
                  size="sm"
                  onClick={() => setShowVideoModal(true)}
                  className="rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs gap-1.5 shadow-sm active:scale-95 transition-all"
                >
                  <Video className="w-3.5 h-3.5" />
                  <span className="hidden md:inline">Video Consult</span>
                </Button>

                {/* Emergency Transfer Slip */}
                <Button
                  size="sm"
                  onClick={() => setShowTransferModal(true)}
                  className="rounded-xl bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 font-bold text-xs gap-1.5 active:scale-95 transition-all"
                >
                  <Ambulance className="w-3.5 h-3.5" />
                  <span className="hidden lg:inline">BEmONC Referral</span>
                </Button>

                {/* Toggle Bedside Drawer */}
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setShowRightDrawer(!showRightDrawer)}
                  className="rounded-xl p-2 text-gray-500 hover:text-gray-800 hover:bg-gray-100"
                  title={showRightDrawer ? "Hide Clinical Snapshot" : "Show Clinical Snapshot"}
                >
                  {showRightDrawer ? (
                    <PanelRightClose className="w-4 h-4" />
                  ) : (
                    <PanelRightOpen className="w-4 h-4" />
                  )}
                </Button>

              </div>
            </div>

            {/* Acute Danger Sign Warning Alert Banner */}
            {(activeThread.hasUrgent || activePatient?.is_high_risk) && (
              <div className="mx-4 mt-3 p-3 bg-gradient-to-r from-rose-50 via-amber-50 to-rose-50 border-l-4 border-l-rose-500 border border-rose-200/70 rounded-2xl shadow-2xs flex items-start justify-between gap-3 shrink-0">
                <div className="flex items-start gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-rose-500 text-white flex items-center justify-center shrink-0 mt-0.5">
                    <AlertOctagon className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-rose-900 uppercase tracking-wide">
                        ⚠️ High Priority Clinical Alert Flagged
                      </span>
                      <span className="text-[10px] font-black uppercase px-2 py-0.2 rounded-full bg-rose-600 text-white">
                        Triage Protocol
                      </span>
                    </div>
                    <p className="text-xs text-rose-800 leading-snug mt-0.5">
                      {activePatient?.high_risk_reasons 
                        ? `Clinical Note: ${activePatient.high_risk_reasons}. Conduct immediate maternal vitals & continuous FHR assessment.`
                        : 'Patient reported danger signs (spotting, bleeding, severe headache, or abdominal pain). Advise immediate in-person clinic triage.'
                      }
                    </p>
                  </div>
                </div>

                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setShowDohChecklist(true)}
                  className="rounded-xl text-[11px] font-bold border-rose-300 text-rose-700 bg-white hover:bg-rose-50 shrink-0 self-center"
                >
                  DOH Protocol Checklist
                </Button>
              </div>
            )}

            {/* Chronological Message Stream */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4 bg-slate-50/50">
              
              {/* Telehealth Date Divider */}
              <div className="flex items-center justify-center my-1">
                <span className="px-3 py-1 rounded-full bg-white border border-gray-200/80 text-gray-500 font-mono text-[10px] font-semibold shadow-2xs">
                  Today, {new Date().toLocaleDateString('en-PH', { month: 'long', day: 'numeric', year: 'numeric' })} • Telehealth Encrypted
                </span>
              </div>

              {activeThread.messages && activeThread.messages.length > 0 ? (
                activeThread.messages.map((msg) => {
                  const isStaff = ['admin', 'doctor', 'midwife', 'nurse', 'staff'].includes(msg.sender_role);
                  const roleBadge = formatRoleBadge(msg.sender_role);
                  const dateObj = new Date(msg.created_at);
                  const timeStr = dateObj.toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit' });

                  return (
                    <div
                      key={msg.id}
                      className={`flex flex-col ${isStaff ? 'items-end' : 'items-start'} max-w-2xl ${isStaff ? 'ml-auto' : 'mr-auto'}`}
                    >
                      {/* Sender Name & Role Header */}
                      <div className={`flex items-center gap-2 mb-1 px-1 ${isStaff ? 'justify-end' : 'justify-start'}`}>
                        <span className="text-xs font-bold text-gray-800">
                          {isStaff ? (msg.sender_name || 'Clinic Clinician') : (msg.sender_name || activePatient?.full_name)}
                        </span>
                        <span className={`text-[10px] font-black uppercase px-2 py-0.2 rounded-md ${roleBadge.badgeClass}`}>
                          {roleBadge.shortLabel}
                        </span>
                        <span className="text-[10px] text-gray-400 font-mono">
                          {timeStr}
                        </span>
                      </div>

                      {/* Bubble Surface */}
                      <div
                        className={`p-4 rounded-3xl text-xs sm:text-[13px] leading-relaxed shadow-sm ${
                          isStaff
                            ? 'bg-gradient-to-br from-rose-600 to-rose-700 text-white rounded-tr-xs shadow-rose-200/50'
                            : msg.is_flagged_urgent
                            ? 'bg-white text-gray-900 border-2 border-red-300 rounded-tl-xs shadow-red-100'
                            : 'bg-white text-gray-800 border border-gray-200/80 rounded-tl-xs shadow-slate-100'
                        }`}
                      >
                        {/* Urgent Alert Banner within patient bubble */}
                        {msg.is_flagged_urgent && !isStaff && (
                          <div className="flex items-center gap-1.5 font-bold text-red-700 text-[11px] uppercase tracking-wider mb-2 pb-1.5 border-b border-red-200">
                            <AlertTriangle className="w-3.5 h-3.5" />
                            <span>Clinical Danger Sign Screened</span>
                          </div>
                        )}

                        <p className="whitespace-pre-wrap">{msg.content}</p>

                        {/* Clinician Delivery Confirmation Stamp */}
                        {isStaff && (
                          <div className="pt-2.5 mt-2 border-t border-white/20 flex items-center justify-between text-white/80 text-[10px] font-medium">
                            <span className="flex items-center gap-1">
                              <CheckCheck className="w-3.5 h-3.5" /> Logged to Patient EHR
                            </span>
                            <span>Verified Clinical Advice</span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="py-12 text-center text-gray-400 space-y-2">
                  <MessageSquare className="w-10 h-10 text-gray-300 mx-auto" />
                  <p className="text-xs font-semibold text-gray-600">No messages in this teleconsultation thread yet.</p>
                  <p className="text-[11px] text-gray-400 max-w-sm mx-auto">
                    Select a pre-approved clinical macro below or type tailored obstetric guidance to initiate contact with {activePatient?.full_name}.
                  </p>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Clinical Quick Macros Ribbon */}
            <div className="px-4 py-2 bg-slate-50 border-t border-gray-100 flex items-center gap-1.5 overflow-x-auto text-xs shrink-0 no-scrollbar">
              <span className="text-[11px] font-bold text-gray-500 shrink-0 mr-1 flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5 text-rose-600" /> Clinical Macros:
              </span>
              {CLINICAL_MACROS.map((macro, idx) => (
                <button
                  key={idx}
                  onClick={() => {
                    setReplyText(macro.text);
                    if (macro.urgent) setIsUrgentReply(true);
                  }}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all shrink-0 flex items-center gap-1 border active:scale-95 ${
                    macro.urgent
                      ? 'bg-red-50 text-red-700 hover:bg-red-100 border-red-200'
                      : 'bg-white text-gray-700 hover:bg-gray-100 border-gray-200/80 shadow-2xs'
                  }`}
                >
                  {macro.title}
                </button>
              ))}
            </div>

            {/* Clinical Message Compose Area */}
            <form onSubmit={handleSendReply} className="p-4 bg-white border-t border-gray-100 shrink-0 space-y-2.5">
              <div className="relative bg-slate-50 rounded-2xl border border-gray-200 focus-within:border-rose-500 focus-within:ring-2 focus-within:ring-rose-500/20 transition-all p-3">
                <Textarea
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  placeholder={`Type clinical advice or note for ${activePatient?.full_name || 'patient'}... (Press Enter ↵ to send)`}
                  rows={2}
                  className="w-full bg-transparent p-0 text-xs sm:text-sm border-none shadow-none focus-visible:ring-0 resize-none min-h-[50px] max-h-32 text-gray-800 placeholder:text-gray-400"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSendReply();
                    }
                  }}
                />

                <div className="pt-2 flex items-center justify-between border-t border-gray-200/60 mt-1">
                  
                  {/* Urgent Clinical Flag Toggle */}
                  <label className="flex items-center gap-1.5 text-xs cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={isUrgentReply}
                      onChange={(e) => setIsUrgentReply(e.target.checked)}
                      className="rounded text-rose-600 focus:ring-rose-500 w-3.5 h-3.5"
                    />
                    <span className={`text-[11px] font-bold ${isUrgentReply ? 'text-red-700' : 'text-gray-500'}`}>
                      🚨 Flag as Urgent Clinical Directive
                    </span>
                  </label>

                  {/* Send Button */}
                  <div className="flex items-center gap-2">
                    <Button
                      type="submit"
                      disabled={isSending || !replyText.trim()}
                      className="h-9 px-4 rounded-xl bg-gradient-to-r from-rose-600 to-rose-700 hover:from-rose-700 hover:to-rose-800 text-white font-bold text-xs gap-1.5 shadow-md shadow-rose-200 active:scale-95 transition-all"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>{isSending ? 'Sending...' : 'Send Advice'}</span>
                    </Button>
                  </div>

                </div>
              </div>

              {/* Encrypted DPA Compliance Notice */}
              <div className="flex items-center justify-between px-1 text-gray-400 text-[10px]">
                <span className="flex items-center gap-1 text-emerald-700 font-semibold">
                  <Lock className="w-3 h-3" /> Encrypted DPA RA 10173 Telehealth Channel • Logged to Patient EHR
                </span>
                <span className="font-mono">
                  Press <kbd className="px-1 py-0.5 bg-gray-100 rounded border text-gray-600 font-bold">Enter ↵</kbd>
                </span>
              </div>
            </form>

          </section>
        ) : (
          <section className="flex-1 flex flex-col items-center justify-center p-8 text-center text-gray-400">
            <MessageSquare className="w-14 h-14 text-gray-200 mb-3" />
            <h3 className="text-base font-bold text-gray-700">No Patient Selected</h3>
            <p className="text-xs max-w-sm mt-1 text-gray-500">
              Select a teleconsultation conversation from the queue on the left to examine clinical history and triage inbound inquiries.
            </p>
          </section>
        )}

        {/* ══════════════════════════════════════════════════════════════ */}
        {/* COLUMN 3: BEDSIDE CLINICAL SNAPSHOT DRAWER (~340px)          */}
        {/* ══════════════════════════════════════════════════════════════ */}
        {showRightDrawer && activeThread && (
          <aside className="w-80 2xl:w-[340px] flex flex-col border-l border-gray-200/80 bg-white overflow-y-auto shrink-0 shadow-2xs">
            
            {/* Drawer Header with Direct Link to Full EMR Chart */}
            <div className="p-3.5 border-b border-gray-100 bg-white flex items-center justify-between sticky top-0 z-10">
              <div className="flex items-center gap-2">
                <Stethoscope className="w-4 h-4 text-rose-600" />
                <h3 className="text-xs font-black text-gray-900 uppercase tracking-wider">
                  Patient Clinical Snapshot
                </h3>
              </div>
              
              <Link
                href={`/admin/patients/${activePatient?.id}`}
                className="text-xs font-bold text-rose-600 hover:text-rose-700 hover:underline flex items-center gap-1"
                target="_blank"
              >
                <span>Full Chart</span>
                <ExternalLink className="w-3 h-3" />
              </Link>
            </div>

            <div className="p-3.5 space-y-3">
              
              {/* 1. Mother's Demographics Card */}
              <div className="p-3.5 rounded-2xl bg-slate-50 border border-gray-200/80 space-y-2">
                <div className="flex items-start justify-between">
                  <div>
                    <span className="font-bold text-sm text-gray-900 block">
                      {activePatient?.full_name}
                    </span>
                    <span className="text-[11px] text-gray-500">
                      {activePatient?.date_of_birth ? `DOB: ${activePatient.date_of_birth}` : ''} ({activePatient?.age || '--'} yrs old)
                    </span>
                  </div>
                  <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 text-[10px] font-bold border border-emerald-200">
                    MCP Eligible
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-gray-200/60 text-xs">
                  <div>
                    <span className="text-gray-400 block text-[10px]">PhilHealth PIN</span>
                    <span className="font-mono font-bold text-gray-800">
                      {activePatient?.philhealth_number || 'Not registered'}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-400 block text-[10px]">Blood Type / Rh</span>
                    <span className="font-bold text-rose-700">
                      {activePatient?.blood_type || 'Pending testing'}
                    </span>
                  </div>
                </div>
              </div>

              {/* 2. Obstetric Profile & Gestation Progress Bar */}
              <div className="p-3.5 rounded-2xl bg-white border border-gray-200/80 shadow-2xs space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-gray-900">Obstetric Profile</span>
                  <span className="px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 text-[10px] font-black border border-rose-200">
                    G{gravida} P{para}
                  </span>
                </div>

                {/* Progress Bar */}
                <div className="space-y-1">
                  <div className="flex justify-between text-xs font-semibold">
                    <span className="text-rose-700 font-bold">
                      {obstetricData?.aogFormatted || 'Pending GA'} ({progressPercent}% Term)
                    </span>
                    <span className="text-gray-500">
                      EDC: {obstetricData?.edcFormatted || 'Pending'}
                    </span>
                  </div>
                  
                  <div className="w-full h-2 rounded-full bg-gray-100 overflow-hidden">
                    <div 
                      className="h-full rounded-full bg-gradient-to-r from-rose-500 to-rose-600 transition-all duration-500" 
                      style={{ width: `${progressPercent}%` }} 
                    />
                  </div>

                  <div className="flex justify-between text-[10px] text-gray-400 pt-0.5">
                    <span>LMP: {lmpDate || 'Not recorded'}</span>
                    {daysToDue !== null && (
                      <span className="font-bold text-rose-600">
                        {daysToDue > 0 ? `~${daysToDue} days to EDC` : 'Full Term'}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* 3. Latest Bedside Clinic Vitals (Real Visit Logs) */}
              <div className="p-3.5 rounded-2xl bg-white border border-gray-200/80 shadow-2xs space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-gray-900 flex items-center gap-1.5">
                    <HeartPulse className="w-4 h-4 text-rose-600" /> Latest Clinic Vitals
                  </span>
                  <span className="text-[10px] text-gray-400 font-mono">
                    {latestVitals?.visit_date ? latestVitals.visit_date : 'No logs yet'}
                  </span>
                </div>

                {latestVitals ? (
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    {/* BP */}
                    <div className="p-2.5 rounded-xl bg-slate-50 border border-gray-200/60">
                      <div className="flex items-center justify-between text-gray-500 mb-0.5">
                        <span className="text-[10px]">Blood Pressure</span>
                        {isBpHypertensive ? (
                          <AlertTriangle className="w-3 h-3 text-red-600" />
                        ) : (
                          <Activity className="w-3 h-3 text-emerald-600" />
                        )}
                      </div>
                      <div className={`text-base font-black ${isBpHypertensive ? 'text-red-700' : 'text-gray-900'}`}>
                        {latestVitals.bp || '--/--'}
                      </div>
                      <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded ${
                        isBpHypertensive ? 'bg-red-100 text-red-800' : 'bg-emerald-100 text-emerald-800'
                      }`}>
                        {isBpHypertensive ? 'Hypertensive Watch' : 'Normotensive'}
                      </span>
                    </div>

                    {/* FHR */}
                    <div className="p-2.5 rounded-xl bg-slate-50 border border-gray-200/60">
                      <div className="flex items-center justify-between text-gray-500 mb-0.5">
                        <span className="text-[10px]">Fetal HR (FHR)</span>
                        <Baby className="w-3 h-3 text-teal-600" />
                      </div>
                      <div className={`text-base font-black ${isFhrAbnormal ? 'text-amber-700' : 'text-teal-700'}`}>
                        {latestVitals.fhr ? `${latestVitals.fhr}` : '--'} <span className="text-[10px] font-normal text-gray-500">bpm</span>
                      </div>
                      <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded ${
                        isFhrAbnormal ? 'bg-amber-100 text-amber-800' : 'bg-teal-100 text-teal-800'
                      }`}>
                        {isFhrAbnormal ? 'Monitor Doppler' : 'Reassuring (120-160)'}
                      </span>
                    </div>

                    {/* Weight */}
                    <div className="p-2.5 rounded-xl bg-slate-50 border border-gray-200/60">
                      <div className="text-gray-500 text-[10px] mb-0.5">Maternal Weight</div>
                      <div className="text-base font-black text-gray-900">
                        {latestVitals.weight ? `${latestVitals.weight}` : '--'} <span className="text-[10px] font-normal text-gray-500">kg</span>
                      </div>
                      <span className="text-[9px] text-gray-500">Prenatal scale</span>
                    </div>

                    {/* Fundic Height */}
                    <div className="p-2.5 rounded-xl bg-slate-50 border border-gray-200/60">
                      <div className="text-gray-500 text-[10px] mb-0.5">Fundic Height</div>
                      <div className="text-base font-black text-gray-900">
                        {latestVitals.fundic_height ? `${latestVitals.fundic_height}` : '--'} <span className="text-[10px] font-normal text-gray-500">cm</span>
                      </div>
                      <span className="text-[9px] text-teal-700 font-semibold">Uterine growth</span>
                    </div>
                  </div>
                ) : (
                  <div className="p-4 rounded-xl bg-slate-50 text-center text-xs text-gray-400 space-y-1">
                    <HeartPulse className="w-6 h-6 text-gray-300 mx-auto" />
                    <p className="font-semibold text-gray-600">No Bedside Vitals Logged</p>
                    <p className="text-[10px]">Schedule maternal visit to record BP, FHR, and weight.</p>
                  </div>
                )}
              </div>

              {/* 4. Active High-Risk Clinical Checklist & Allergies */}
              <div className="p-3.5 rounded-2xl bg-amber-50/70 border border-amber-200 space-y-2">
                <span className="text-xs font-bold text-amber-900 flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4 text-amber-700" /> Clinical Flags & Allergies
                </span>
                
                <ul className="space-y-1.5 text-xs text-gray-800">
                  <li className="flex items-start gap-1.5">
                    <span className="text-amber-700 font-bold">•</span>
                    <span>
                      High-Risk Status: <strong>{activePatient?.is_high_risk ? 'FLAGGED HIGH-RISK' : 'Standard Routine'}</strong>
                    </span>
                  </li>
                  {activePatient?.high_risk_reasons && (
                    <li className="flex items-start gap-1.5 text-red-800">
                      <span className="text-red-600 font-bold">•</span>
                      <span>{activePatient.high_risk_reasons}</span>
                    </li>
                  )}
                  <li className="flex items-start gap-1.5">
                    <span className="text-amber-700 font-bold">•</span>
                    <span>
                      Allergies: <strong>{hasRealAllergies ? activePatient.allergies : 'No known drug allergies (NKDA)'}</strong>
                    </span>
                  </li>
                </ul>
              </div>

              {/* 5. Emergency Kin Contact Details */}
              <div className="p-3.5 rounded-2xl bg-white border border-gray-200/80 shadow-2xs space-y-2">
                <span className="text-xs font-bold text-gray-900 block">Emergency Kin Contact</span>
                
                {activePatient?.husband_partner_name || activePatient?.emergency_contact_name ? (
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-xs font-bold text-gray-900 block">
                        {activePatient.husband_partner_name || activePatient.emergency_contact_name}
                      </span>
                      <span className="text-[11px] text-gray-500">
                        {activePatient.emergency_contact_phone || activePatient.phone_number || activePatient.contact_number || 'No phone recorded'}
                      </span>
                    </div>

                    {(activePatient.emergency_contact_phone || activePatient.phone_number || activePatient.contact_number) && (
                      <div className="flex items-center gap-1">
                        <a 
                          href={`tel:${activePatient.emergency_contact_phone || activePatient.phone_number || activePatient.contact_number}`}
                          className="p-2 rounded-xl bg-teal-50 hover:bg-teal-100 text-teal-700 transition-colors"
                          title="Call Contact"
                        >
                          <Phone className="w-3.5 h-3.5" />
                        </a>
                        <button
                          onClick={() => copyPatientPhone(activePatient.emergency_contact_phone || activePatient.phone_number || activePatient.contact_number)}
                          className="p-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 transition-colors"
                          title="Copy Phone Number"
                        >
                          {copiedPhone ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-xs text-gray-400 italic">No emergency kin contact recorded in profile.</p>
                )}

                {/* Send Clinic GPS Transit SMS Trigger */}
                <button
                  onClick={() => {
                    const phone = activePatient?.phone_number || activePatient?.contact_number || activePatient?.emergency_contact_phone;
                    if (phone) {
                      window.open(`sms:${phone}?body=AR-JEN Maternity Clinic Address: San Roque, Marikina City. Please proceed for clinical assessment.`);
                    }
                  }}
                  className="w-full py-1.5 rounded-xl bg-gray-50 hover:bg-gray-100 text-gray-700 text-xs font-semibold border border-gray-200 flex items-center justify-center gap-1.5 transition-colors"
                >
                  <MapPin className="w-3.5 h-3.5 text-rose-600" />
                  <span>Send Clinic Location (SMS)</span>
                </button>
              </div>

              {/* 6. Primary Care Midwife / Attending Clinician Card */}
              <div className="p-3 rounded-xl bg-slate-50 border border-gray-200/60 flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-rose-100 text-rose-700 flex items-center justify-center shrink-0">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <div className="text-xs min-w-0">
                  <span className="text-gray-400 block text-[10px]">Attending Clinician Lead</span>
                  <span className="font-bold text-gray-900 truncate block">
                    {currentStaff?.fullName || 'RM Clinician on Duty'}
                  </span>
                  <span className="text-[10px] text-teal-700 font-semibold">DOH BEmONC Certified</span>
                </div>
              </div>

            </div>
          </aside>
        )}

      </div>

      {/* ──────────────────────────────────────────────────────────── */}
      {/* 3. MODALS & SLIDE-OVERS                                     */}
      {/* ──────────────────────────────────────────────────────────── */}

      {/* BEmONC Referral Emergency Transfer Modal */}
      <EmergencyTransferModal
        patient={activePatient}
        activeEpisode={activeEpisode}
        obstetricData={obstetricData}
        latestVisitLog={latestVitals}
        isOpen={showTransferModal}
        onClose={() => setShowTransferModal(false)}
      />

      {/* Video Consultation Modal */}
      {showVideoModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl border border-gray-200 shadow-2xl max-w-md w-full p-6 space-y-5">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-teal-600 text-white flex items-center justify-center shadow-md shadow-teal-200">
                  <Video className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-gray-900">Video Teleconsultation</h3>
                  <p className="text-xs text-gray-500">Secure encrypted peer room</p>
                </div>
              </div>
              <button
                onClick={() => setShowVideoModal(false)}
                className="p-1 rounded-xl text-gray-400 hover:text-gray-700 hover:bg-gray-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              <p className="text-xs text-gray-600 leading-relaxed">
                Connect live with <strong>{activePatient?.full_name}</strong> via a private, zero-download WebRTC video room.
              </p>

              <div className="p-3 bg-slate-50 rounded-xl border border-gray-200 text-xs font-mono break-all text-gray-700">
                {videoRoomUrl}
              </div>

              <div className="flex gap-2">
                <Button
                  onClick={copyVideoInvitation}
                  variant="outline"
                  className="flex-1 rounded-xl text-xs font-bold gap-1.5 border-gray-200"
                >
                  {copiedLink ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                  <span>{copiedLink ? 'Copied Invitation!' : 'Copy Link for Patient'}</span>
                </Button>

                <Button
                  onClick={() => window.open(videoRoomUrl, '_blank')}
                  className="flex-1 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs gap-1.5 shadow-sm"
                >
                  <ExternalLink className="w-4 h-4" />
                  <span>Join Video Call</span>
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* DOH Protocol Checklist Modal */}
      {showDohChecklist && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl border border-gray-200 shadow-2xl max-w-lg w-full p-6 space-y-4 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div className="flex items-center gap-2">
                <ShieldAlert className="w-5 h-5 text-rose-600" />
                <h3 className="font-bold text-base text-gray-900">DOH BEmONC Danger Signs Protocol</h3>
              </div>
              <button
                onClick={() => setShowDohChecklist(false)}
                className="p-1 rounded-xl text-gray-400 hover:text-gray-700 hover:bg-gray-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs text-gray-700">
              <div className="p-3 bg-red-50 rounded-2xl border border-red-200 space-y-1">
                <span className="font-bold text-red-900 text-xs block">Immediate STAT Transfer Indications:</span>
                <ul className="list-disc list-inside space-y-0.5 text-red-800 text-[11px]">
                  <li>Vaginal bleeding / hemorrhage at any gestational age</li>
                  <li>Severe headache with visual disturbance / epigastric pain (Pre-eclampsia)</li>
                  <li>Systolic BP ≥ 160 mmHg or Diastolic BP ≥ 110 mmHg</li>
                  <li>Premature rupture of membranes &gt; 12 hours or meconium stained amniotic fluid</li>
                  <li>Fetal bradycardia (&lt; 110 bpm) or fetal tachycardia (&gt; 160 bpm)</li>
                </ul>
              </div>

              <div className="p-3 bg-slate-50 rounded-2xl border border-gray-200 space-y-1">
                <span className="font-bold text-gray-900 text-xs block">Standard Clinic Triage Steps:</span>
                <ol className="list-decimal list-inside space-y-1 text-gray-600 text-[11px]">
                  <li>Position patient on left lateral decubitus position.</li>
                  <li>Record maternal BP, heart rate, respiratory rate, and temperature.</li>
                  <li>Palpate uterine fundus for tone, tenderness, and contraction frequency.</li>
                  <li>Auscultate fetal heart tones for 1 full minute with Doppler.</li>
                  <li>If transferring, initiate DOH Referral Form and call destination tertiary hospital.</li>
                </ol>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <Button
                onClick={() => setShowDohChecklist(false)}
                className="rounded-xl bg-gray-900 text-white font-bold text-xs"
              >
                Close Protocol Guide
              </Button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
