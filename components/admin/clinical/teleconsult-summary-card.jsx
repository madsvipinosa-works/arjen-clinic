'use client';

import React from 'react';
import Link from 'next/link';
import { 
  MessageSquare, ArrowRight, ShieldAlert, Clock, 
  CheckCircle2, User, Sparkles, AlertTriangle 
} from 'lucide-react';
import { Button } from '@/components/ui/button';

export function TeleconsultSummaryCard({
  patientId,
  patientName = 'Patient',
  messages = []
}) {
  const hasMessages = messages && messages.length > 0;
  const lastMessage = hasMessages ? messages[messages.length - 1] : null;
  const hasUrgent = messages.some((m) => m.is_flagged_urgent);
  const unreadCount = messages.filter((m) => m.status === 'unread').length;

  // Format timestamp of last message
  let formattedTime = 'No messages';
  if (lastMessage?.created_at) {
    const d = new Date(lastMessage.created_at);
    formattedTime = d.toLocaleDateString('en-PH', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  }

  return (
    <div className="bg-white/95 backdrop-blur-md border border-gray-200/90 rounded-3xl p-5 md:p-6 shadow-sm hover:shadow-md transition-all duration-300 space-y-4">
      {/* Header Tier */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-100 pb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-rose-500 via-rose-600 to-pink-500 text-white flex items-center justify-center shadow-md shadow-rose-500/20">
            <MessageSquare className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-black text-gray-900 text-base tracking-tight">
                Online Teleconsultation Channel
              </h3>
              <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full border bg-rose-50 text-rose-700 border-rose-200">
                {messages.length} {messages.length === 1 ? 'Message' : 'Messages'}
              </span>
            </div>
            <p className="text-xs text-gray-500 font-medium">
              Asynchronous obstetric messaging & triage advice with {patientName}.
            </p>
          </div>
        </div>

        {/* Status Pill Badge */}
        <div className="flex items-center gap-2">
          {hasUrgent ? (
            <div className="bg-gradient-to-r from-red-500 to-rose-600 text-white font-black text-xs px-3 py-1 rounded-full flex items-center gap-2 shadow-xs shadow-red-500/25">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-white" />
              </span>
              <ShieldAlert className="w-3.5 h-3.5" />
              <span>DANGER SIGNS FLAGGED</span>
            </div>
          ) : unreadCount > 0 ? (
            <div className="bg-amber-100 border border-amber-300 text-amber-900 font-bold text-xs px-3 py-1 rounded-full flex items-center gap-1.5 shadow-2xs">
              <Clock className="w-3.5 h-3.5 text-amber-600" />
              <span>{unreadCount} Unread {unreadCount === 1 ? 'Message' : 'Messages'}</span>
            </div>
          ) : hasMessages ? (
            <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 font-bold text-xs px-3 py-1 rounded-full flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              <span>Active Consultation</span>
            </div>
          ) : (
            <div className="bg-gray-100 text-gray-500 font-medium text-xs px-3 py-1 rounded-full">
              No Inquiries Yet
            </div>
          )}
        </div>
      </div>

      {/* Message Snippet or Empty Notice */}
      {hasMessages ? (
        <div className="bg-gray-50/80 border border-gray-100 rounded-2xl p-4 space-y-2">
          <div className="flex items-center justify-between text-xs text-gray-500">
            <span className="font-bold text-gray-700 flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-gray-400" />
              {lastMessage?.sender_name || (lastMessage?.sender_role === 'patient' ? patientName : 'Clinic Staff')}
              <span className="text-[10px] font-semibold text-gray-400">
                ({lastMessage?.sender_role === 'patient' ? 'Patient' : 'Staff'})
              </span>
            </span>
            <span className="text-[11px] font-medium text-gray-400">{formattedTime}</span>
          </div>

          <p className="text-sm text-gray-800 italic bg-white p-3 rounded-xl border border-gray-100 shadow-2xs line-clamp-2">
            &ldquo;{lastMessage?.message_text}&rdquo;
          </p>

          {lastMessage?.is_flagged_urgent && (
            <div className="flex items-center gap-1.5 text-xs font-bold text-red-600 pt-1">
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>Clinical priority keywords detected in this inquiry. Immediate review recommended.</span>
            </div>
          )}
        </div>
      ) : (
        <div className="bg-gray-50/60 border border-dashed border-gray-200 rounded-2xl p-6 text-center space-y-1.5">
          <p className="text-xs font-bold text-gray-700">No active teleconsultation history</p>
          <p className="text-[11px] text-gray-500 max-w-md mx-auto">
            {patientName} has not sent any teleconsultation inquiries yet. Staff can initiate an advice thread directly in the central hub.
          </p>
        </div>
      )}

      {/* Action Deep-Link Button */}
      <div className="flex items-center justify-between pt-1">
        <span className="text-xs text-gray-400 font-medium">
          Decoupled from legal EMR charts • Synchronized with Central Teleconsult Hub
        </span>

        <Link href={`/admin/consultations?patientId=${patientId}`}>
          <Button
            type="button"
            className="group bg-gradient-to-r from-rose-500 to-rose-600 hover:from-rose-600 hover:to-rose-700 text-white rounded-2xl font-bold h-10 px-5 text-xs shadow-md shadow-rose-500/20 active:scale-[0.98] transition-all gap-1.5"
          >
            <span>{hasMessages ? 'Open Live Conversation in Hub' : 'Start New Chat in Hub'}</span>
            <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
          </Button>
        </Link>
      </div>
    </div>
  );
}
