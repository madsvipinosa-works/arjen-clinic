import { createClient } from '@/utils/supabase/server';
import { MessageSquare, ShieldCheck } from 'lucide-react';
import { ConsultationThread } from '@/components/shared/consultation-thread';

export default async function ConsultationPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return null;

  const [{ data: messages }] = await Promise.all([
    supabase
      .from('consultation_messages')
      .select('*')
      .eq('patient_id', user.id)
      .order('created_at', { ascending: true }),
  ]);

  return (
    <div className="max-w-4xl mx-auto flex flex-col h-[calc(100vh-180px)] animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Thread Header */}
      <div className="bg-white rounded-t-3xl border-x border-t border-rose-100 p-6 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-rose-500 rounded-2xl flex items-center justify-center shadow-lg shadow-rose-200">
            <MessageSquare className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-black text-gray-900">Online Consultation</h1>
            <p className="text-sm font-semibold text-rose-500 flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5" />
              Private & Encrypted Thread
            </p>
          </div>
        </div>
        <div className="hidden sm:block text-right">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Status</p>
          <p className="text-sm font-bold text-emerald-500 flex items-center justify-end gap-1.5">
            <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
            Live
          </p>
        </div>
      </div>

      {/* Real-time Thread */}
      <div className="flex-1 bg-white border-x border-b border-rose-100 rounded-b-3xl overflow-hidden shadow-sm">
        <ConsultationThread
          patientId={user.id}
          senderId={user.id}
          senderRole="patient"
          initialMessages={messages || []}
          compact={false}
        />
      </div>
    </div>
  );
}
