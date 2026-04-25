'use client';

import { useEffect, useRef, useState, useTransition } from 'react';
import { createClient } from '@/utils/supabase/client';
import { Send, MessageSquare, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { sendConsultationMessage } from '@/app/actions';

/**
 * ConsultationThread
 * Real-time consultation chat component using Supabase Realtime.
 *
 * Props:
 *  - patientId   : uuid of the patient whose thread to show
 *  - senderId    : uuid of the current user (staff or patient)
 *  - senderRole  : 'staff' | 'patient'
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

  const isStaffViewing = senderRole === 'staff';
  const containerHeight = compact ? 'h-[500px]' : 'flex-1';

  return (
    <div className={`flex flex-col ${containerHeight} ${compact ? '' : 'h-[calc(100vh-280px)]'}`}>
      {/* Messages List */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-gray-50/30 scrollbar-thin scrollbar-thumb-rose-100">
        {messages.length > 0 ? (
          messages.map((msg) => {
            const isMine = msg.sender_role === senderRole;
            const isStaff = msg.sender_role === 'staff';

            return (
              <div key={msg.id} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[80%] flex items-end gap-2 ${isMine ? 'flex-row-reverse' : 'flex-row'}`}>
                  {/* Avatar */}
                  <div className={`w-7 h-7 rounded-full flex-shrink-0 flex items-center justify-center text-[9px] font-black shadow-sm ${
                    isStaff ? 'bg-rose-500 text-white' : 'bg-gray-200 text-gray-500'
                  }`}>
                    {isStaff ? 'DR' : 'PT'}
                  </div>
                  {/* Bubble */}
                  <div className={`flex flex-col ${isMine ? 'items-end' : 'items-start'}`}>
                    <div className={`px-4 py-2.5 rounded-2xl text-sm font-medium shadow-sm leading-relaxed ${
                      isMine
                        ? 'bg-rose-500 text-white rounded-br-none'
                        : 'bg-white border border-gray-200 text-gray-800 rounded-bl-none'
                    } ${msg.id?.startsWith('optimistic') ? 'opacity-70' : ''}`}>
                      {msg.content}
                    </div>
                    <span className="text-[10px] font-bold text-gray-300 mt-1 uppercase tracking-widest">
                      {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                </div>
              </div>
            );
          })
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-gray-400 space-y-3">
            <MessageSquare className="w-10 h-10 opacity-20" />
            <p className="text-sm font-medium">No messages yet. Start the conversation.</p>
          </div>
        )}
        {/* Auto-scroll anchor */}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className={`p-4 border-t bg-white ${compact ? 'rounded-b-xl' : 'rounded-b-3xl'}`}>
        <form onSubmit={handleSend} className="flex gap-2">
          <Input
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder={isStaffViewing ? 'Type a reply...' : 'Type your message...'}
            className="flex-1 focus-visible:ring-rose-500 bg-gray-50"
            disabled={sending}
          />
          <Button
            type="submit"
            disabled={sending || !inputValue.trim()}
            className="bg-rose-500 hover:bg-rose-600 text-white gap-2 px-5"
          >
            {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            {!compact && <span>{isStaffViewing ? 'Reply' : 'Send'}</span>}
          </Button>
        </form>
        {!compact && (
          <p className="text-[10px] text-center text-gray-300 font-bold uppercase tracking-widest mt-3">
            Safe and confidential communication
          </p>
        )}
      </div>
    </div>
  );
}
