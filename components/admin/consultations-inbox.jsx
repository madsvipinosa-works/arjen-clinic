'use client';

import React, { useState, useEffect, useRef, useTransition } from 'react';
import { 
  MessageSquare, Send, ShieldCheck, AlertCircle, AlertTriangle, 
  Search, CheckCircle2, Clock, User, Phone, Calendar, 
  Sparkles, ChevronRight, ArrowLeft, RefreshCw, FileText, Check, Tag
} from 'lucide-react';
import { createClient } from '@/utils/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { formatRoleBadge } from '@/lib/rbac';
import { calculateObstetricDates } from '@/lib/clinical-protocols';
import { sendConsultationMessage, updateConsultationStatus } from '@/app/actions';
import Link from 'next/link';

// Quick clinical macro responses tailored for lying-in & maternity care
const CLINICAL_MACROS = [
  {
    title: 'Emergency Clinic Visit',
    text: 'Please proceed directly to AR-JEN Clinic immediately for urgent maternal triage, blood pressure check, and fetal heart tone monitoring.',
    urgent: true,
  },
  {
    title: 'Fetal Kick Count Protocol',
    text: 'Please rest comfortably on your left side and count baby kicks. You should feel at least 10 distinct kicks within 2 hours. If fewer or absent, come to the clinic right away.',
    urgent: false,
  },
  {
    title: 'Prenatal Care Routine',
    text: 'Your query has been noted by our clinical team. Please continue your prescribed prenatal vitamins and keep yourself well hydrated.',
    urgent: false,
  },
  {
    title: 'Lab Follow-Up',
    text: 'Kindly bring the official printed copy of your requested laboratory results (CBC / Urinalysis / Ultrasound) on your next prenatal checkup.',
    urgent: false,
  },
];

export function ConsultationsInbox({ 
  initialThreads = [], 
  currentStaffRole = 'admin',
  currentStaffId = null,
  currentStaffEmail = '',
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
  const [isSending, startSendTransition] = useTransition();
  const [isUpdatingStatus, startStatusTransition] = useTransition();

  const messagesEndRef = useRef(null);
  const supabase = createClient();

  // Active thread details
  const activeThread = threads.find(t => t.patient?.id === selectedPatientId) || threads[0] || null;
  const activePatient = activeThread?.patient;
  const activeEpisode = activePatient?.maternal_episodes?.find(e => e.status === 'Active') || activePatient?.maternal_episodes?.[0];

  // Dynamic Obstetric Metrics calculation
  let obst = { aogFormatted: null, trimester: null };
  if (activeEpisode?.lmp) {
    obst = calculateObstetricDates(activeEpisode.lmp);
  }

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
              // Patient not yet in list; refresh would be ideal
              return prevThreads;
            }
            const updatedThreads = [...prevThreads];
            const targetThread = { ...updatedThreads[threadIndex] };
            
            // Check duplicate
            if (!targetThread.messages.some(m => m.id === newMsg.id)) {
              targetThread.messages = [...targetThread.messages, newMsg];
              targetThread.lastMessage = newMsg;
              targetThread.hasUrgent = targetThread.hasUrgent || newMsg.is_flagged_urgent;
              targetThread.status = newMsg.sender_role === 'patient' ? 'unread' : targetThread.status;
            }

            // Move updated thread to top
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
    const phone = t.patient?.phone_number || '';
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
      sender_name: currentStaffEmail.split('@')[0],
      content,
      created_at: new Date().toISOString(),
      is_flagged_urgent: false,
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

    const fd = new FormData();
    fd.append('patient_id', selectedPatientId);
    fd.append('content', content);
    fd.append('sender_role', currentStaffRole);

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
    <div className="flex flex-col h-[calc(100vh-5.5rem)] bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
      
      {/* Top Teleconsultation Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-white">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-rose-500 text-white flex items-center justify-center shadow-md shadow-rose-200">
            <MessageSquare className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-gray-900">
              Online Teleconsultation Hub
            </h1>
            <p className="text-xs text-gray-500">
              Direct patient-to-clinical staff triage & asynchronous messaging.
            </p>
          </div>
        </div>

        {/* Clinical Disclaimer Tag */}
        <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-[11px] font-medium">
          <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
          <span>Non-emergency clinical guidance. Direct acute cases to lying-in triage.</span>
        </div>
      </div>

      {/* Main Split-Screen Workspace */}
      <div className="flex-1 flex overflow-hidden">

        {/* ── LEFT PANEL: Patients & Threads List ── */}
        <div className="w-full sm:w-80 md:w-96 border-r border-gray-100 flex flex-col bg-gray-50/50">
          
          {/* Search Bar */}
          <div className="p-3 border-b border-gray-100 bg-white">
            <div className="relative">
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <Input
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search patient or message..."
                className="pl-9 h-9 text-xs rounded-xl border-gray-200 bg-gray-50"
              />
            </div>
          </div>

          {/* Filter Chips */}
          <div className="flex items-center gap-1 p-2 border-b border-gray-100 bg-white overflow-x-auto text-[11px] font-bold">
            {[
              { id: 'ALL', label: 'All' },
              { id: 'NEEDS_REPLY', label: 'Needs Reply' },
              { id: 'URGENT', label: '🚨 Urgent' },
              { id: 'HIGH_RISK', label: 'High-Risk' },
              { id: 'RESOLVED', label: 'Resolved' },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setFilterTab(tab.id)}
                className={`px-2.5 py-1 rounded-lg transition-all whitespace-nowrap ${
                  filterTab === tab.id
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Threads List Scroll Area */}
          <div className="flex-1 overflow-y-auto divide-y divide-gray-100">
            {filteredThreads.length > 0 ? (
              filteredThreads.map(thread => {
                const isSelected = thread.patient?.id === selectedPatientId;
                const isUnanswered = thread.lastMessage?.sender_role === 'patient' && thread.status !== 'resolved';
                const hasUrgentMsg = thread.hasUrgent;

                return (
                  <button
                    key={thread.patient?.id}
                    onClick={() => setSelectedPatientId(thread.patient?.id)}
                    className={`w-full text-left p-3.5 transition-all flex items-start gap-3 ${
                      isSelected
                        ? 'bg-rose-50/80 border-r-4 border-rose-500 shadow-xs'
                        : 'hover:bg-white/80'
                    }`}
                  >
                    {/* Avatar */}
                    <div className="relative shrink-0">
                      <div className="w-10 h-10 rounded-2xl bg-slate-100 border border-gray-200 text-gray-700 flex items-center justify-center font-black text-sm">
                        {thread.patient?.full_name?.charAt(0) || 'P'}
                      </div>
                      {isUnanswered && (
                        <span className="absolute -top-1 -right-1 w-3 h-3 bg-amber-500 rounded-full border-2 border-white ring-1 ring-amber-200" />
                      )}
                    </div>

                    {/* Content preview */}
                    <div className="flex-1 min-w-0">
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

                      <div className="flex items-center gap-1.5 mt-0.5">
                        {hasUrgentMsg && (
                          <span className="text-[10px] px-1.5 py-0.2 rounded bg-red-100 text-red-700 font-black uppercase tracking-wider">
                            Urgent
                          </span>
                        )}
                        {thread.patient?.is_high_risk && (
                          <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-100 text-amber-800 font-bold">
                            High Risk
                          </span>
                        )}
                        {thread.status === 'resolved' && (
                          <span className="text-[10px] px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-800 font-bold">
                            Resolved
                          </span>
                        )}
                      </div>

                      <p className="text-[11px] text-gray-500 truncate mt-1">
                        {thread.lastMessage?.sender_role === 'patient' ? (
                          <span className="font-semibold text-gray-700">Patient: </span>
                        ) : (
                          <span className="font-semibold text-rose-600">Staff: </span>
                        )}
                        {thread.lastMessage?.content || 'No messages yet'}
                      </p>
                    </div>
                  </button>
                );
              })
            ) : (
              <div className="p-8 text-center text-xs text-gray-400 italic">
                No teleconsultation threads match this filter.
              </div>
            )}
          </div>
        </div>

        {/* ── RIGHT PANEL: Active Consultation Workspace ── */}
        {activeThread ? (
          <div className="flex-1 flex flex-col bg-white">
            
            {/* Active Thread Patient Header Bar */}
            <div className="p-4 border-b border-gray-100 bg-white flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center font-black">
                  <User className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-base font-bold text-gray-900">
                      {activePatient?.full_name}
                    </h2>
                    {activePatient?.is_high_risk && (
                      <Badge variant="destructive" className="text-[10px] px-2 py-0">
                        High Risk
                      </Badge>
                    )}
                    {activeThread.status === 'resolved' ? (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                        ✓ Resolved
                      </span>
                    ) : (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">
                        Active Inactive
                      </span>
                    )}
                  </div>
                  
                  <div className="flex items-center gap-3 text-xs text-gray-500 mt-0.5 font-medium">
                    {activePatient?.age && <span>{activePatient.age} yrs old</span>}
                    {obst.aogFormatted && (
                      <span>• AOG: <strong className="text-gray-800">{obst.aogFormatted}</strong> ({obst.trimester})</span>
                    )}
                    {activePatient?.phone_number && (
                      <a href={`tel:${activePatient.phone_number}`} className="flex items-center gap-1 text-rose-600 hover:underline">
                        <Phone className="w-3 h-3" /> {activePatient.phone_number}
                      </a>
                    )}
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleToggleResolve}
                  disabled={isUpdatingStatus}
                  className="rounded-xl text-xs font-bold gap-1.5"
                >
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  {activeThread.status === 'resolved' ? 'Reopen Thread' : 'Mark as Resolved'}
                </Button>

                <Link href={`/admin/patients/${activePatient?.id}`}>
                  <Button size="sm" variant="ghost" className="rounded-xl text-xs font-bold gap-1 text-gray-600">
                    <FileText className="w-3.5 h-3.5" /> Full Chart
                  </Button>
                </Link>
              </div>
            </div>

            {/* Acute Warning Banner if thread contains urgent flagged message */}
            {activeThread.hasUrgent && (
              <div className="px-4 py-2.5 bg-red-50 border-b border-red-200 flex items-center gap-2.5 text-red-900 text-xs">
                <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
                <div className="flex-1">
                  <span className="font-bold">Obstetric Emergency Symptom Flagged: </span>
                  <span>Patient reported danger signs. Advise immediate in-person clinic triage or emergency room evaluation.</span>
                </div>
              </div>
            )}

            {/* Message Stream */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50/40">
              {activeThread.messages?.map((msg) => {
                const isStaff = ['admin', 'doctor', 'midwife', 'nurse', 'staff'].includes(msg.sender_role);
                const roleBadge = formatRoleBadge(msg.sender_role);
                const dateObj = new Date(msg.created_at);
                const timeStr = dateObj.toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit' });

                return (
                  <div
                    key={msg.id}
                    className={`flex flex-col ${isStaff ? 'items-end' : 'items-start'}`}
                  >
                    <div className="flex items-center gap-2 mb-1 px-1">
                      <span className="text-[11px] font-bold text-gray-700">
                        {isStaff ? (msg.sender_name || 'Clinic Clinician') : (msg.sender_name || activePatient?.full_name)}
                      </span>
                      <span className={`text-[10px] px-1.5 py-0.2 rounded-md font-bold uppercase ${roleBadge.badgeClass}`}>
                        {roleBadge.shortLabel}
                      </span>
                      <span className="text-[10px] text-gray-400 font-mono">{timeStr}</span>
                    </div>

                    <div
                      className={`max-w-lg p-3.5 rounded-2xl text-xs leading-relaxed shadow-xs ${
                        isStaff
                          ? 'bg-rose-600 text-white rounded-tr-xs'
                          : msg.is_flagged_urgent
                          ? 'bg-red-50 text-red-900 border border-red-200 rounded-tl-xs'
                          : 'bg-white text-gray-800 border border-gray-100 rounded-tl-xs'
                      }`}
                    >
                      {msg.is_flagged_urgent && !isStaff && (
                        <div className="flex items-center gap-1 font-bold text-red-700 text-[10px] uppercase tracking-wider mb-1">
                          <AlertTriangle className="w-3 h-3" /> Danger Sign Detected
                        </div>
                      )}
                      <p className="whitespace-pre-wrap">{msg.content}</p>
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            {/* Clinical Quick Macros */}
            <div className="px-4 py-2 bg-white border-t border-gray-100 flex items-center gap-1.5 overflow-x-auto text-xs">
              <span className="text-[11px] font-bold text-gray-400 shrink-0 flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-rose-500" /> Macros:
              </span>
              {CLINICAL_MACROS.map((macro, idx) => (
                <button
                  key={idx}
                  onClick={() => setReplyText(macro.text)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-colors shrink-0 ${
                    macro.urgent
                      ? 'bg-red-50 text-red-700 hover:bg-red-100 border border-red-200'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {macro.title}
                </button>
              ))}
            </div>

            {/* Message Reply Form */}
            <form onSubmit={handleSendReply} className="p-3 bg-white border-t border-gray-100 flex items-end gap-2">
              <Textarea
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                placeholder="Type clinical guidance, triage advice, or select a macro..."
                rows={2}
                className="flex-1 min-h-[50px] max-h-32 text-xs rounded-xl border-gray-200 resize-none focus:ring-rose-500"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSendReply();
                  }
                }}
              />
              <Button
                type="submit"
                disabled={isSending || !replyText.trim()}
                className="h-12 px-4 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs gap-1.5 shadow-sm"
              >
                <Send className="w-4 h-4" />
                <span>Send</span>
              </Button>
            </form>

          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-gray-400">
            <MessageSquare className="w-12 h-12 text-gray-200 mb-3" />
            <h3 className="text-base font-bold text-gray-700">No Patient Selected</h3>
            <p className="text-xs max-w-sm mt-1">
              Select a teleconsultation conversation from the left to view clinical message history and provide triage advice.
            </p>
          </div>
        )}

      </div>
    </div>
  );
}
