'use client';

import React, { useState, useEffect, useRef, useTransition } from 'react';
import Link from 'next/link';
import { 
  MessageSquare, Send, AlertTriangle, 
  Search, CheckCircle2, Clock, CheckCheck,
  AlertOctagon, ExternalLink, X, Paperclip, Check,
  Stethoscope, HeartPulse, Activity, Baby,
  Droplets, Phone, ShieldCheck, PanelRightClose, PanelRightOpen
} from 'lucide-react';
import { createClient } from '@/utils/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { formatRoleBadge } from '@/lib/rbac';
import { calculateObstetricDates } from '@/lib/clinical-protocols';
import { sendConsultationMessage, updateConsultationStatus } from '@/app/actions';

// Clinical obstetric macro responses formulated under DOH BEmONC & maternal safety standards
const CLINICAL_MACROS = [
  {
    title: 'Admit for In-Clinic Exam',
    text: 'Please proceed directly to AR-JEN Maternity Clinic immediately for urgent maternal triage, blood pressure check, and continuous fetal heart doppler monitoring. Avoid physical exertion and have your companion accompany you.',
    urgent: true,
  },
  {
    title: 'Hydration & Rest',
    text: 'Please rest comfortably on your left side in a quiet room and ensure you are well-hydrated. If symptoms persist or worsen, please visit the clinic.',
    urgent: false,
  },
  {
    title: 'Normal Sensation Guidance',
    text: 'What you are experiencing can be normal at this stage of pregnancy. Please continue your routine prenatal vitamins and observe. Contact us immediately if you experience bleeding, severe pain, or decreased fetal movement.',
    urgent: false,
  },
  {
    title: 'Fetal Kick Count',
    text: 'Please monitor your baby\'s kicks. You should feel at least 10 distinct movements within 2 hours while resting on your side. If kicks are fewer, weak, or absent, please proceed to the clinic right away.',
    urgent: false,
  }
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

  const [filterTab, setFilterTab] = useState('ALL'); // 'ALL' | 'NEEDS_REPLY' | 'URGENT' | 'RESOLVED'
  const [searchTerm, setSearchTerm] = useState('');
  const [replyText, setReplyText] = useState('');
  const [isUrgentReply, setIsUrgentReply] = useState(false);
  const [isSending, startSendTransition] = useTransition();
  const [isUpdatingStatus, startStatusTransition] = useTransition();

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

  // Toggle for right clinical snapshot drawer (default open)
  const [showRightDrawer, setShowRightDrawer] = useState(true);

  // Latest bedside vitals from visit logs
  const latestVitals = activeThread?.latestVisitLog;
  
  // Blood pressure classification
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

  // Fetal heart tone Doppler classification (standard normal: 110 - 160 bpm)
  const isFhrAbnormal = (() => {
    const rawFht = latestVitals?.fht || latestVitals?.fhr;
    if (!rawFht) return false;
    const fhr = parseInt(rawFht, 10);
    return !isNaN(fhr) && (fhr < 110 || fhr > 160);
  })();

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

  // Real allergies filter (ignores 'na', 'none', etc.)
  const hasRealAllergies = Boolean(
    activePatient?.allergies && 
    !['na', 'n/a', 'none', 'no', 'nil', '-', 'none documented'].includes(activePatient.allergies.trim().toLowerCase())
  );

  // Patient age calculation (fallback from date_of_birth if age is not explicitly set)
  const patientAge = activePatient?.age || (() => {
    if (!activePatient?.date_of_birth) return null;
    const dob = new Date(activePatient.date_of_birth);
    if (isNaN(dob.getTime())) return null;
    const ageDiff = Date.now() - dob.getTime();
    const ageDate = new Date(ageDiff);
    return Math.abs(ageDate.getUTCFullYear() - 1970);
  })();

  // Formatted clinical risk reasons from maternal episodes or visit logs
  const highRiskReasonsList = (() => {
    const reasons = activeEpisode?.high_risk_reasons || latestVitals?.high_risk_reasons || activePatient?.high_risk_reasons;
    if (!reasons) return [];
    if (Array.isArray(reasons)) return reasons.filter(Boolean);
    if (typeof reasons === 'string') return [reasons];
    return [];
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
  }, [supabase]);

  // Filter threads
  const filteredThreads = threads.filter(t => {
    const patientName = t.patient?.full_name?.toLowerCase() || '';
    const lastMsgContent = t.lastMessage?.content?.toLowerCase() || '';
    const term = searchTerm.toLowerCase();

    const matchesSearch = patientName.includes(term) || lastMsgContent.includes(term);
    if (!matchesSearch) return false;

    if (filterTab === 'NEEDS_REPLY') {
      return t.lastMessage?.sender_role === 'patient' && t.status !== 'resolved';
    }
    if (filterTab === 'URGENT') {
      return t.hasUrgent || t.patient?.is_high_risk;
    }
    if (filterTab === 'RESOLVED') {
      return t.status === 'resolved';
    }
    return true;
  });

  // Queue Counters
  const awaitingReplyCount = threads.filter(t => t.lastMessage?.sender_role === 'patient' && t.status !== 'resolved').length;
  const urgentCount = threads.filter(t => t.hasUrgent || t.patient?.is_high_risk).length;

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

  return (
    <div className="flex flex-col h-[calc(100vh-5rem)] bg-white/90 backdrop-blur-md rounded-3xl border border-gray-100 shadow-sm overflow-hidden font-jakarta">
      
      {/* ──────────────────────────────────────────────────────────── */}
      {/* MAIN 2-COLUMN WORKSPACE CONTAINER                             */}
      {/* ──────────────────────────────────────────────────────────── */}
      <div className="flex-1 flex overflow-hidden">

        {/* ══════════════════════════════════════════════════════════════ */}
        {/* LEFT COLUMN: THREAD DIRECTORY (~360px - 400px)               */}
        {/* ══════════════════════════════════════════════════════════════ */}
        <section className="w-80 md:w-96 border-r border-gray-100 bg-white/60 flex flex-col shrink-0">
          
          {/* Queue Header & Search */}
          <div className="p-5 border-b border-gray-100 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-[15px] font-bold text-gray-900 tracking-tight">
                Consultations & Triage
              </h2>
              <span className="px-2.5 py-0.5 rounded-full bg-rose-50 text-rose-700 font-bold text-xs border border-rose-100">
                {threads.length} Active
              </span>
            </div>

            {/* Live Search Input */}
            <div className="relative">
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <Input
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search patient name, PIN, or triage note..."
                className="pl-9 h-10 text-[13px] rounded-xl border-gray-200 bg-white hover:bg-gray-50 focus:bg-white transition-colors shadow-sm"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-0.5"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Filter Tabs Chips */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1 text-[11px] font-semibold no-scrollbar">
              {[
                { id: 'ALL', label: `All` },
                { id: 'NEEDS_REPLY', label: `Awaiting Reply` },
                { id: 'URGENT', label: `Urgent / High Risk` },
                { id: 'RESOLVED', label: 'Resolved' },
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setFilterTab(tab.id)}
                  className={`px-3 py-1.5 rounded-full transition-all whitespace-nowrap border ${
                    filterTab === tab.id
                      ? 'bg-rose-600 text-white border-rose-600 shadow-sm'
                      : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* Patient Threads Scroll Area */}
          <div className="flex-1 overflow-y-auto">
            {filteredThreads.length > 0 ? (
              <div className="p-3 space-y-2">
                {filteredThreads.map(thread => {
                  const isSelected = thread.patient?.id === selectedPatientId;
                  const isUnanswered = thread.lastMessage?.sender_role === 'patient' && thread.status !== 'resolved';
                  const hasUrgentMsg = thread.hasUrgent;

                  // Patient Obstetric Metrics
                  const ep = thread.patient?.maternal_episodes?.find(e => e.status === 'Active') || thread.patient?.maternal_episodes?.[0];
                  const obst = calculateObstetricDates(ep?.lmp || thread.patient?.lmp);
                  
                  // Patient initials
                  const initials = thread.patient?.full_name
                    ? thread.patient.full_name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()
                    : 'PT';

                  return (
                    <button
                      key={thread.patient?.id}
                      onClick={() => setSelectedPatientId(thread.patient?.id)}
                      className={`w-full text-left p-4 transition-all rounded-2xl flex items-start gap-3.5 relative border ${
                        isSelected
                          ? 'bg-rose-50/50 border-rose-200 shadow-sm ring-1 ring-inset ring-rose-100'
                          : 'bg-white border-transparent hover:border-gray-200 hover:shadow-sm'
                      }`}
                    >
                      {/* Active Indicator Accent Line */}
                      {isSelected && (
                        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-rose-500 rounded-r-full" />
                      )}

                      {/* Patient Avatar */}
                      <div className="relative shrink-0 mt-0.5">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm ${
                          isSelected 
                            ? 'bg-rose-600 text-white' 
                            : 'bg-slate-100 text-slate-600 border border-slate-200'
                        }`}>
                          {initials}
                        </div>
                        {isUnanswered && (
                          <span className="absolute -top-1 -right-1 w-3 h-3 bg-amber-500 rounded-full border-2 border-white" />
                        )}
                      </div>

                      {/* Patient Context & Snippet */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <span className="font-bold text-[14px] text-gray-900 truncate">
                            {thread.patient?.full_name}
                          </span>
                          <span className="text-[11px] text-gray-400 shrink-0">
                            {thread.lastMessage?.created_at
                              ? new Date(thread.lastMessage.created_at).toLocaleTimeString('en-PH', {
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })
                              : ''}
                          </span>
                        </div>

                        <div className="flex items-center gap-1.5 flex-wrap mb-1.5">
                          {obst?.aogFormatted ? (
                            <span className="text-[10px] font-semibold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md">
                              {obst.aogFormatted} AOG
                            </span>
                          ) : null}
                          
                          {(hasUrgentMsg || thread.patient?.is_high_risk) ? (
                            <span className="text-[10px] px-2 py-0.5 rounded-md bg-rose-50 text-rose-700 font-bold border border-rose-100">
                              High Risk
                            </span>
                          ) : (
                            <span className="text-[10px] px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 font-semibold border border-emerald-100">
                              Routine / Low Risk
                            </span>
                          )}
                          
                          {isUnanswered && (
                            <span className="text-[10px] px-2 py-0.5 rounded-md bg-amber-50 text-amber-700 font-bold border border-amber-100">
                              Needs Reply
                            </span>
                          )}
                        </div>

                        <p className="text-[12px] text-gray-500 line-clamp-1">
                          {thread.lastMessage?.content || <span className="italic text-gray-400">No messages yet</span>}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="p-8 text-center text-[13px] text-gray-400 space-y-3 mt-10">
                <div className="w-12 h-12 rounded-full bg-slate-50 flex items-center justify-center mx-auto mb-2 border border-slate-100">
                  <MessageSquare className="w-5 h-5 text-slate-300" />
                </div>
                <p>No active consultations match your filters.</p>
              </div>
            )}
          </div>
        </section>

        {/* ══════════════════════════════════════════════════════════════ */}
        {/* RIGHT COLUMN: ACTIVE CHAT & TRIAGE WORKSPACE                 */}
        {/* ══════════════════════════════════════════════════════════════ */}
        {activeThread ? (
          <section className="flex-1 flex flex-col bg-[#F8FAFC] relative overflow-hidden">
            
            {/* Active Patient Chat Header */}
            <div className="px-6 py-4 bg-white/95 backdrop-blur-md border-b border-slate-200/60 flex items-center justify-between shrink-0 z-10 shadow-[0_1px_3px_0_rgba(0,0,0,0.02)]">
              <div className="flex flex-col gap-1 min-w-0">
                <div className="flex items-center gap-3">
                  <h2 className="text-lg font-bold text-slate-900 tracking-tight truncate">
                    {activePatient?.full_name}
                    {activePatient?.age ? `, ${activePatient.age} y/o` : ''}
                  </h2>
                  {activeThread.status === 'resolved' && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200 uppercase tracking-wider">
                      ✓ Resolved
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2 text-[11px] font-medium flex-wrap">
                  {obstetricData?.aogFormatted && (
                    <span className="px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-100">
                      {obstetricData.aogFormatted} AOG • G{gravida}P{para}
                    </span>
                  )}
                  {activePatient?.philhealth_number && (
                    <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-100 flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" /> PhilHealth MCP Verified
                    </span>
                  )}
                  {activePatient?.is_high_risk && (
                    <span className="px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-100 flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3" /> High Risk
                      {highRiskReasonsList.length > 0 ? ` - ${highRiskReasonsList[0]}` : ''}
                    </span>
                  )}
                </div>
              </div>

              {/* Header Action Buttons */}
              <div className="flex items-center gap-2 shrink-0">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setShowRightDrawer(!showRightDrawer)}
                  className={`rounded-xl text-xs font-semibold gap-1.5 transition-colors h-9 ${
                    showRightDrawer 
                      ? 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100' 
                      : 'border-slate-200 text-slate-600 hover:bg-slate-50 bg-white'
                  }`}
                  title={showRightDrawer ? "Hide Bedside Snapshot" : "Show Bedside Snapshot"}
                >
                  {showRightDrawer ? <PanelRightClose className="w-3.5 h-3.5" /> : <PanelRightOpen className="w-3.5 h-3.5" />}
                  <span className="hidden sm:inline">{showRightDrawer ? 'Hide Snapshot' : 'Bedside Snapshot'}</span>
                </Button>

                <Link
                  href={`/admin/patients/${activePatient?.id}`}
                  className="hidden md:flex"
                  target="_blank"
                >
                  <Button
                    size="sm"
                    variant="outline"
                    className="rounded-xl text-xs font-semibold gap-1.5 border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors bg-white h-9"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    Full Chart
                  </Button>
                </Link>
                <Button
                  size="sm"
                  onClick={handleToggleResolve}
                  disabled={isUpdatingStatus}
                  className={`rounded-xl text-xs font-bold h-9 px-4 transition-colors ${
                    activeThread.status === 'resolved' 
                      ? 'bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200' 
                      : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200'
                  }`}
                >
                  {activeThread.status === 'resolved' ? 'Reopen Thread' : 'Mark Resolved'}
                </Button>
              </div>
            </div>

            {/* Acute Danger Sign Warning Alert Banner */}
            {(activeThread.hasUrgent || activePatient?.is_high_risk) && (
              <div className="mx-6 mt-4 p-3.5 bg-rose-50 border border-rose-200 rounded-2xl shadow-xs flex items-start gap-3 shrink-0">
                <AlertOctagon className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                <div className="text-xs">
                  <h4 className="font-bold text-rose-900 uppercase tracking-wide">
                    Flagged for Priority Clinical Alert
                  </h4>
                  <p className="text-rose-800 leading-snug mt-0.5">
                    {highRiskReasonsList.length > 0 
                      ? `Clinical Triggers: ${highRiskReasonsList.join(', ')}. Guideline: Advise immediate in-clinic evaluation.`
                      : 'Patient reported potential danger signs. Guideline: Advise immediate in-clinic evaluation.'
                    }
                  </p>
                </div>
              </div>
            )}

            {/* Chronological Message Stream */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {activeThread.messages && activeThread.messages.length > 0 ? (
                activeThread.messages.map((msg) => {
                  const isStaff = ['admin', 'doctor', 'midwife', 'nurse', 'staff'].includes(msg.sender_role);
                  const roleBadge = formatRoleBadge(msg.sender_role);
                  const timeStr = new Date(msg.created_at).toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit' });

                  return (
                    <div
                      key={msg.id}
                      className={`flex flex-col ${isStaff ? 'items-end' : 'items-start'} max-w-[85%] ${isStaff ? 'ml-auto' : 'mr-auto'}`}
                    >
                      <div className={`flex items-center gap-2 mb-1.5 px-1 ${isStaff ? 'flex-row-reverse' : 'flex-row'}`}>
                        <span className="text-[13px] font-bold text-slate-700">
                          {isStaff ? (msg.sender_name || 'Clinic Clinician') : (msg.sender_name || activePatient?.full_name)}
                        </span>
                        {isStaff ? (
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${roleBadge.badgeClass}`}>
                            {roleBadge.shortLabel}
                          </span>
                        ) : (
                          <span className="text-[10px] font-semibold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full border border-indigo-100">
                            Patient Portal
                          </span>
                        )}
                        <span className="text-[11px] text-slate-400 font-medium">
                          {timeStr}
                        </span>
                      </div>

                      <div
                        className={`p-4 text-[14px] leading-relaxed relative ${
                          isStaff
                            ? 'bg-slate-800 text-white rounded-2xl rounded-tr-sm shadow-md'
                            : msg.is_flagged_urgent
                            ? 'bg-rose-50 text-rose-900 border border-rose-200 rounded-2xl rounded-tl-sm shadow-sm'
                            : 'bg-white text-slate-800 border border-slate-200 rounded-2xl rounded-tl-sm shadow-sm'
                        }`}
                      >
                        {msg.is_flagged_urgent && !isStaff && (
                          <div className="flex items-center gap-1.5 font-bold text-rose-700 text-[11px] uppercase tracking-wider mb-2 pb-1.5 border-b border-rose-200">
                            <AlertTriangle className="w-3.5 h-3.5" />
                            <span>Urgent Inquiry</span>
                          </div>
                        )}

                        <p className="whitespace-pre-wrap">{msg.content}</p>

                        {isStaff && (
                          <div className="mt-2 pt-2 border-t border-slate-700 flex justify-end">
                            <span className="flex items-center gap-1 text-[10px] text-slate-300 font-medium">
                              <CheckCheck className="w-3.5 h-3.5" /> Verified Clinical Advice
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-slate-400 space-y-3">
                  <MessageSquare className="w-12 h-12 text-slate-200" />
                  <p className="text-[14px] font-medium text-slate-500">No consultation messages logged yet.</p>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Bottom Message Input Area */}
            <div className="p-4 bg-white border-t border-slate-200 shrink-0">
              {/* Quick Clinical Macros */}
              <div className="flex items-center gap-2 overflow-x-auto pb-3 text-xs no-scrollbar">
                {CLINICAL_MACROS.map((macro, idx) => (
                  <button
                    key={idx}
                    onClick={() => {
                      setReplyText(macro.text);
                      if (macro.urgent) setIsUrgentReply(true);
                    }}
                    className={`px-3 py-1.5 rounded-full text-[11px] font-semibold transition-all shrink-0 flex items-center border hover:shadow-sm ${
                      macro.urgent
                        ? 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100'
                        : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    + {macro.title}
                  </button>
                ))}
              </div>

              {/* Compose Box */}
              <form onSubmit={handleSendReply} className="flex gap-3 items-end">
                <div className="flex-1 relative bg-slate-50 rounded-2xl border border-slate-200 focus-within:border-rose-400 focus-within:ring-2 focus-within:ring-rose-100 transition-all shadow-sm">
                  <Textarea
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    placeholder="Type clinical advice or triage notes here..."
                    className="w-full bg-transparent p-4 text-[14px] border-none shadow-none focus-visible:ring-0 resize-none min-h-[56px] max-h-32 text-slate-800 placeholder:text-slate-400"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSendReply();
                      }
                    }}
                  />
                  <div className="absolute bottom-3 right-3 flex items-center gap-2">
                    <button type="button" className="p-1.5 text-slate-400 hover:text-slate-600 transition-colors rounded-lg hover:bg-slate-100">
                      <Paperclip className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <Button
                  type="submit"
                  disabled={isSending || !replyText.trim()}
                  className="h-[56px] px-6 rounded-2xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-[14px] gap-2 shadow-sm shadow-rose-200 transition-all flex items-center"
                >
                  <Send className="w-4 h-4" />
                  <span>Send Advice</span>
                </Button>
              </form>
            </div>
          </section>
        ) : (
          <section className="flex-1 flex flex-col items-center justify-center p-8 text-center text-slate-400 bg-slate-50">
            <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-sm border border-slate-100 mb-4">
              <MessageSquare className="w-8 h-8 text-slate-300" />
            </div>
            <h3 className="text-lg font-bold text-slate-700">No Thread Selected</h3>
            <p className="text-[14px] max-w-sm mt-2 text-slate-500">
              Select a patient from the queue to review their clinical history and provide telehealth triage.
            </p>
          </section>
        )}

        {/* ══════════════════════════════════════════════════════════════ */}
        {/* COLUMN 3: BEDSIDE CLINICAL SNAPSHOT DRAWER (~320-340px)      */}
        {/* ══════════════════════════════════════════════════════════════ */}
        {showRightDrawer && activeThread && (
          <aside className="w-80 2xl:w-[340px] flex flex-col border-l border-slate-200/80 bg-white/95 backdrop-blur-md overflow-y-auto shrink-0 shadow-xs">
            {/* Drawer Header */}
            <div className="p-3.5 border-b border-slate-100 bg-white/95 backdrop-blur-md flex items-center justify-between sticky top-0 z-10">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
                  <Stethoscope className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                    Clinical Snapshot
                  </h3>
                  <span className="text-[10px] text-slate-400">Bedside Reference</span>
                </div>
              </div>

              <div className="flex items-center gap-1.5">
                <Link
                  href={`/admin/patients/${activePatient?.id}`}
                  className="text-[11px] font-bold text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 px-2.5 py-1 rounded-lg flex items-center gap-1 transition-colors"
                  target="_blank"
                >
                  <span>Full Chart</span>
                  <ExternalLink className="w-3 h-3" />
                </Link>
                <button
                  onClick={() => setShowRightDrawer(false)}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
                  title="Close Snapshot Panel"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="p-3.5 space-y-3">
              {/* 1. Mother's Demographics Card */}
              <div className="p-3.5 rounded-2xl bg-slate-50/80 border border-slate-200/70 space-y-2.5 shadow-2xs">
                <div className="flex items-start justify-between">
                  <div className="min-w-0 pr-2">
                    <span className="font-bold text-sm text-slate-900 block truncate">
                      {activePatient?.full_name}
                    </span>
                    <span className="text-[11px] text-slate-500">
                      {patientAge ? `${patientAge} yrs old` : 'Age unrecorded'}
                      {activePatient?.date_of_birth ? ` • DOB: ${activePatient.date_of_birth}` : ''}
                    </span>
                  </div>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border shrink-0 ${
                    activePatient?.philhealth_number 
                      ? 'bg-emerald-50 text-emerald-800 border-emerald-200' 
                      : 'bg-slate-100 text-slate-600 border-slate-200'
                  }`}>
                    {activePatient?.philhealth_number ? 'PhilHealth MCP' : 'Private / Cash'}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-200/60 text-xs">
                  <div>
                    <span className="text-slate-400 block text-[10px]">PhilHealth PIN</span>
                    <span className="font-mono font-bold text-slate-800 text-[11px] truncate block">
                      {activePatient?.philhealth_number || 'Not registered'}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">Blood Type / Rh</span>
                    <span className="font-bold text-rose-700 text-[11px] flex items-center gap-1">
                      <Droplets className="w-3 h-3 text-rose-500" />
                      {activePatient?.blood_type || activeThread?.recentLabs?.[0]?.blood_type || 'Pending test'}
                    </span>
                  </div>
                </div>
              </div>

              {/* 2. Obstetric Profile & Gestation Progress Bar */}
              <div className="p-3.5 rounded-2xl bg-white border border-slate-200/80 shadow-2xs space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-900">Obstetric Profile</span>
                  <div className="flex items-center gap-1.5">
                    {obstetricData?.trimester && (
                      <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 text-[10px] font-semibold">
                        {obstetricData.trimester}
                      </span>
                    )}
                    <span className="px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 text-[10px] font-black border border-rose-200">
                      G{gravida} P{para}
                    </span>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs font-semibold">
                    <span className="text-rose-700 font-bold">
                      {obstetricData?.aogFormatted ? `${obstetricData.aogFormatted} AOG` : latestVitals?.aog_by_lmp || 'Pending GA'} 
                      {progressPercent > 0 ? ` (${progressPercent}% Term)` : ''}
                    </span>
                    <span className="text-slate-500 text-[11px]">
                      EDC: {activeEpisode?.edc ? new Date(activeEpisode.edc).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' }) : obstetricData?.edcFormatted || 'Pending'}
                    </span>
                  </div>
                  
                  <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
                    <div 
                      className="h-full rounded-full bg-gradient-to-r from-rose-500 to-rose-600 transition-all duration-500" 
                      style={{ width: `${progressPercent}%` }} 
                    />
                  </div>

                  <div className="flex justify-between text-[10px] text-slate-400 pt-0.5">
                    <span>LMP: {lmpDate ? new Date(lmpDate).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Not recorded'}</span>
                    {daysToDue !== null && (
                      <span className="font-bold text-rose-600">
                        {daysToDue > 0 ? `~${daysToDue} days to EDC` : daysToDue === 0 ? 'Due today!' : `${Math.abs(daysToDue)} days post-term`}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* 3. Latest Bedside Clinic Vitals (Real Visit Logs) */}
              <div className="p-3.5 rounded-2xl bg-white border border-slate-200/80 shadow-2xs space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                    <HeartPulse className="w-4 h-4 text-rose-600" /> Latest Clinic Vitals
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono">
                    {latestVitals?.visit_date ? new Date(latestVitals.visit_date).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' }) : 'No logs yet'}
                  </span>
                </div>

                {latestVitals ? (
                  <div className="space-y-2">
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      {/* BP */}
                      <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/60">
                        <div className="flex items-center justify-between text-slate-500 mb-0.5">
                          <span className="text-[10px] font-medium">Blood Pressure</span>
                          {isBpHypertensive ? (
                            <AlertTriangle className="w-3 h-3 text-red-600" />
                          ) : (
                            <Activity className="w-3 h-3 text-emerald-600" />
                          )}
                        </div>
                        <div className={`text-base font-black ${isBpHypertensive ? 'text-red-700' : 'text-slate-900'}`}>
                          {latestVitals.bp || '--/--'}
                        </div>
                        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded inline-block mt-0.5 ${
                          isBpHypertensive ? 'bg-red-100 text-red-800' : 'bg-emerald-100 text-emerald-800'
                        }`}>
                          {isBpHypertensive ? 'Hypertensive Watch' : 'Normotensive'}
                        </span>
                      </div>

                      {/* FHT / Doppler */}
                      <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/60">
                        <div className="flex items-center justify-between text-slate-500 mb-0.5">
                          <span className="text-[10px] font-medium">Fetal Heart (FHT)</span>
                          <Baby className="w-3 h-3 text-teal-600" />
                        </div>
                        <div className={`text-base font-black ${isFhrAbnormal ? 'text-amber-700' : 'text-teal-700'}`}>
                          {latestVitals.fht || latestVitals.fhr || '--'} <span className="text-[10px] font-normal text-slate-500">bpm</span>
                        </div>
                        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded inline-block mt-0.5 ${
                          isFhrAbnormal ? 'bg-amber-100 text-amber-800' : 'bg-teal-100 text-teal-800'
                        }`}>
                          {isFhrAbnormal ? 'Monitor Doppler' : 'Reassuring (120-160)'}
                        </span>
                      </div>

                      {/* Weight */}
                      <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/60">
                        <div className="text-slate-500 text-[10px] font-medium mb-0.5">Maternal Weight</div>
                        <div className="text-base font-black text-slate-900">
                          {latestVitals.weight || '--'} <span className="text-[10px] font-normal text-slate-500">kg</span>
                        </div>
                        <span className="text-[9px] text-slate-400">Clinic scale</span>
                      </div>

                      {/* Fundic Height */}
                      <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/60">
                        <div className="text-slate-500 text-[10px] font-medium mb-0.5">Fundic Height</div>
                        <div className="text-base font-black text-slate-900">
                          {latestVitals.fh || latestVitals.fundic_height || '--'} <span className="text-[10px] font-normal text-slate-500">cm</span>
                        </div>
                        <span className="text-[9px] text-teal-700 font-semibold">Uterine growth</span>
                      </div>
                    </div>

                    {(latestVitals.temp || latestVitals.pr) && (
                      <div className="p-2 rounded-xl bg-slate-50 border border-slate-200/60 flex items-center justify-between text-[11px] text-slate-600">
                        {latestVitals.temp && (
                          <span>Temp: <strong className="text-slate-800">{latestVitals.temp}°C</strong></span>
                        )}
                        {latestVitals.pr && (
                          <span>Pulse: <strong className="text-slate-800">{latestVitals.pr} bpm</strong></span>
                        )}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="p-4 rounded-xl bg-slate-50 text-center text-xs text-slate-400 space-y-1">
                    <HeartPulse className="w-5 h-5 text-slate-300 mx-auto" />
                    <p className="font-semibold text-slate-600">No Bedside Vitals Logged</p>
                    <p className="text-[10px] text-slate-400">Prenatal visit records will appear here automatically.</p>
                  </div>
                )}
              </div>

              {/* 4. Active High-Risk Clinical Checklist & Allergies */}
              <div className={`p-3.5 rounded-2xl border space-y-2 ${
                activePatient?.is_high_risk 
                  ? 'bg-rose-50/70 border-rose-200' 
                  : 'bg-slate-50/80 border-slate-200/70'
              }`}>
                <div className="flex items-center justify-between">
                  <span className={`text-xs font-bold flex items-center gap-1.5 ${
                    activePatient?.is_high_risk ? 'text-rose-900' : 'text-slate-800'
                  }`}>
                    {activePatient?.is_high_risk ? (
                      <AlertTriangle className="w-4 h-4 text-rose-600" />
                    ) : (
                      <ShieldCheck className="w-4 h-4 text-emerald-600" />
                    )}
                    Clinical Safety Status
                  </span>
                  {activePatient?.is_high_risk ? (
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75" />
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500" />
                    </span>
                  ) : (
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                  )}
                </div>

                <div className="space-y-1.5 text-xs">
                  <div className="flex items-start gap-1.5">
                    <span className="font-semibold text-slate-600">Risk Tier:</span>
                    <strong className={activePatient?.is_high_risk ? 'text-rose-700' : 'text-emerald-700'}>
                      {activePatient?.is_high_risk ? 'Flagged High-Risk' : 'Standard Routine Care'}
                    </strong>
                  </div>

                  {highRiskReasonsList.length > 0 && (
                    <div className="pt-1 border-t border-rose-100 text-rose-800 space-y-1 text-[11px]">
                      <span className="font-semibold block text-[10px] uppercase tracking-wider text-rose-700">Identified Safety Triggers:</span>
                      {highRiskReasonsList.map((reason, idx) => (
                        <div key={idx} className="flex items-start gap-1.5">
                          <span className="text-rose-600 font-bold">•</span>
                          <span>{reason}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="pt-1.5 border-t border-slate-200/60 flex items-start gap-1.5">
                    <span className="font-semibold text-slate-600">Allergies:</span>
                    <strong className={hasRealAllergies ? 'text-amber-800 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200' : 'text-slate-700'}>
                      {hasRealAllergies ? activePatient.allergies : 'No known drug allergies (NKDA)'}
                    </strong>
                  </div>
                </div>
              </div>

              {/* 5. Emergency Kin / Partner Contact */}
              <div className="p-3.5 rounded-2xl bg-white border border-slate-200/80 shadow-2xs space-y-2">
                <span className="text-xs font-bold text-slate-900 block">Emergency Kin Contact</span>

                {activePatient?.husband_partner_name || activePatient?.contact_number ? (
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <span className="text-xs font-bold text-slate-900 block truncate">
                        {activePatient.husband_partner_name || 'Partner / Relative'}
                      </span>
                      <span className="text-[11px] text-slate-500 block truncate">
                        {activePatient.contact_number || activePatient.phone_number || 'No contact phone recorded'}
                      </span>
                    </div>

                    {(activePatient.contact_number || activePatient.phone_number) && (
                      <a 
                        href={`tel:${activePatient.contact_number || activePatient.phone_number}`}
                        className="p-2 rounded-xl bg-teal-50 hover:bg-teal-100 text-teal-700 transition-colors shrink-0 flex items-center justify-center"
                        title="Call Emergency Contact"
                      >
                        <Phone className="w-3.5 h-3.5" />
                      </a>
                    )}
                  </div>
                ) : (
                  <p className="text-xs text-slate-400 italic">No emergency contact recorded</p>
                )}
              </div>
            </div>
          </aside>
        )}
      </div>
    </div>
  );
}
