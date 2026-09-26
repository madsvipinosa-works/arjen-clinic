'use client';

import { useEffect, useRef, useState, useTransition } from 'react';
import { createClient } from '@/utils/supabase/client';
import { Send, MessageSquare, Loader2, AlertTriangle, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { formatRoleBadge } from '@/lib/rbac';
import { sendConsultationMessage } from '@/app/actions';

/**
 * ConsultationThread
 * Real-time consultation chat component using Supabase Realtime.
 *
 * Props:
 *  - patientId   : uuid of the patient whose thread to show
 *  - senderId    : uuid of the current user (staff or patient)
 *  - senderRole  : 'patient' | 'staff' | 'doctor' | 'midwife' | 'nurse' | 'admin'
 *  - initialMessages : messages fetched server-side for instant first render
 *  - compact     : boolean — if true, uses a smaller fixed-height layout (admin panel)
 */
export function ConsultationThread({
  patientId,
  senderId,
  senderRole,
  initialMessages = [],
  compact = false,
}) {
  const [messages, setMessages] = useState(initialMessages);
  const [sending, startTransition] = useTransition();
  const [inputValue, setInputValue] = useState('');
  const bottomRef = useRef(null);
  const supabase = createClient();

  // Scroll to bottom whenever messages change
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Subscribe to real-time inserts on this patient's thread
  useEffect(() => {
    const channel = supabase
      .channel(`consultation:${patientId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'consultation_messages',
          filter: `patient_id=eq.${patientId}`,
        },
        (payload) => {
          setMessages((prev) => {
            // Avoid duplicates (our own optimistic message may already be there)
            if (prev.some((m) => m.id === payload.new.id)) return prev;
            return [...prev, payload.new];
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [patientId]);

  const handleSend = (e) => {
    e.preventDefault();
    const content = inputValue.trim();
    if (!content) return;

    // Optimistic UI — instantly show the message before server confirms
    const optimistic = {
      id: `optimistic-${Date.now()}`,
      patient_id: patientId,
      sender_id: senderId,
      sender_role: senderRole,
      content,
      created_at: new Date().toISOString(),
      is_flagged_urgent: false,
    };
    setMessages((prev) => [...prev, optimistic]);
    setInputValue('');

    const fd = new FormData();
    fd.append('patient_id', patientId);
    fd.append('sender_id', senderId);
    fd.append('sender_role', senderRole);
    fd.append('content', content);

    startTransition(() => sendConsultationMessage(fd));
  };

  const isStaffViewing = ['admin', 'doctor', 'midwife', 'nurse', 'staff'].includes(senderRole);
  const containerHeight = compact ? 'h-[500px]' : 'flex-1';

  return (
    <div className={`flex flex-col ${containerHeight} ${compact ? '' : 'h-[calc(100vh-280px)]'}`}>
      
      {/* Patient Emergency Triage Disclaimer */}
      {!isStaffViewing && !compact && (
        <div className="bg-amber-50/90 border-b border-amber-200 px-4 py-2.5 flex items-center gap-2.5 text-xs text-amber-900">
          <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
          <span>
            <strong>Non-Emergency Advisory:</strong> This teleconsultation chat is for routine advice. If you experience severe bleeding, severe abdominal pain, or your water breaks, go to AR-JEN Clinic immediately.
          </span>
        </div>
      )}

      {/* Messages List */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-gray-50/30 scrollbar-thin scrollbar-thumb-rose-100">
        {messages.length > 0 ? (
          messages.map((msg) => {
            const isMine = msg.sender_role === senderRole;
            const isMsgStaff = ['admin', 'doctor', 'midwife', 'nurse', 'staff'].includes(msg.sender_role);
            const roleBadge = formatRoleBadge(msg.sender_role);

            return (
              <div key={msg.id} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] sm:max-w-[75%] flex items-end gap-2 ${isMine ? 'flex-row-reverse' : 'flex-row'}`}>
                  
                  {/* Avatar */}
                  <div className={`w-8 h-8 rounded-2xl flex-shrink-0 flex items-center justify-center text-[10px] font-black shadow-sm ${
                    isMsgStaff ? 'bg-rose-500 text-white' : 'bg-slate-200 text-slate-700'
                  }`}>
                    {isMsgStaff ? (roleBadge.shortLabel?.charAt(0) || 'S') : 'PT'}
                  </div>

                  {/* Bubble Container */}
                  <div className={`flex flex-col ${isMine ? 'items-end' : 'items-start'}`}>
                    
                    {/* Header info */}
                    <div className="flex items-center gap-1.5 mb-1 px-1">
                      <span className="text-[11px] font-bold text-gray-700">
                        {isMsgStaff ? (msg.sender_name || 'Clinic Clinician') : (msg.sender_name || 'Patient')}
                      </span>
                      <span className={`text-[9px] px-1.5 py-0.2 rounded font-bold uppercase tracking-wider ${roleBadge.badgeClass}`}>
                        {roleBadge.shortLabel}
                      </span>
                    </div>

                    {/* Bubble Content */}
                    <div className={`px-4 py-3 rounded-2xl text-xs sm:text-sm font-medium shadow-xs leading-relaxed ${
                      isMine
                        ? 'bg-rose-500 text-white rounded-br-xs'
                        : msg.is_flagged_urgent
                        ? 'bg-red-50 text-red-900 border border-red-200 rounded-bl-xs'
                        : 'bg-white border border-gray-200 text-gray-800 rounded-bl-xs'
                    } ${msg.id?.startsWith('optimistic') ? 'opacity-70' : ''}`}>
                      {msg.is_flagged_urgent && !isMsgStaff && (
                        <div className="flex items-center gap-1 font-bold text-red-700 text-[10px] uppercase tracking-wider mb-1">
                          <AlertTriangle className="w-3 h-3" /> Potential Danger Sign Flagged
                        </div>
                      )}
                      <p className="whitespace-pre-wrap">{msg.content}</p>
                    </div>

                    <span className="text-[10px] font-semibold text-gray-400 mt-1 font-mono">
                      {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>

                </div>
              </div>
            );
          })
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-gray-400 space-y-3">
            <MessageSquare className="w-12 h-12 text-gray-200" />
            <p className="text-sm font-semibold text-gray-600">No messages in this consultation thread yet.</p>
            <p className="text-xs text-gray-400 max-w-xs text-center">
              Send a query to the AR-JEN clinical team regarding your pregnancy, prenatal symptoms, or schedules.
            </p>
          </div>
        )}
        {/* Auto-scroll anchor */}
        <div ref={bottomRef} />
      </div>

      {/* Input Form */}
      <div className={`p-4 border-t bg-white ${compact ? 'rounded-b-xl' : 'rounded-b-3xl'}`}>
        <form onSubmit={handleSend} className="flex gap-2">
          <Input
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder={isStaffViewing ? 'Type clinical triage response...' : 'Describe your symptoms or inquiry...'}
            className="flex-1 focus-visible:ring-rose-500 bg-gray-50 text-xs sm:text-sm rounded-xl"
            disabled={sending}
          />
          <Button
            type="submit"
            disabled={sending || !inputValue.trim()}
            className="bg-rose-500 hover:bg-rose-600 text-white gap-2 px-5 rounded-xl font-bold text-xs"
          >
            {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            {!compact && <span>{isStaffViewing ? 'Reply' : 'Send'}</span>}
          </Button>
        </form>
        {!compact && (
          <p className="text-[10px] text-center text-gray-400 font-semibold tracking-wider mt-2.5 flex items-center justify-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            DPA 2012 Encrypted Clinical Teleconsultation Protocol
          </p>
        )}
      </div>
    </div>
  );
}
