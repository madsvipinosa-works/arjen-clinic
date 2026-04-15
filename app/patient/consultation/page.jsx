import { createClient } from "@/utils/supabase/server";
import { format } from "date-fns";
import { Send, User, MessageSquare, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { sendConsultationMessage } from "../../actions";

export default async function ConsultationPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return null;

  // Fetch the patient's record to get their patient_id (which is same as user.id in this schema)
  const [
    { data: patient },
    { data: messages }
  ] = await Promise.all([
    supabase.from("patients").select("*").eq("id", user.id).single(),
    supabase.from("consultation_messages")
      .select("*")
      .eq("patient_id", user.id)
      .order("created_at", { ascending: true })
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
          <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Clinic Status</p>
          <p className="text-sm font-bold text-emerald-500 flex items-center justify-end gap-1.5">
            <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
            Responsive
          </p>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 bg-white border-x border-gray-100 overflow-y-auto p-6 space-y-6 scrollbar-thin scrollbar-thumb-rose-100">
        {messages?.length > 0 ? (
          messages.map((msg) => {
            const isMe = msg.sender_role === 'patient';
            return (
              <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[80%] flex items-end gap-3 ${isMe ? 'flex-row-reverse' : 'flex-row'}`}>
                  {/* Avatar */}
                  <div className={`w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center text-[10px] font-black shadow-sm ${
                    isMe ? 'bg-rose-500 text-white' : 'bg-gray-100 text-gray-400 border border-gray-100'
                  }`}>
                    {isMe ? 'ME' : 'DR'}
                  </div>
                  
                  {/* Bubble */}
                  <div className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                    <div className={`px-5 py-3 rounded-2xl text-sm font-medium shadow-sm leading-relaxed ${
                      isMe 
                        ? 'bg-rose-500 text-white rounded-br-none' 
                        : 'bg-gray-50 text-gray-800 border border-gray-100 rounded-bl-none'
                    }`}>
                      {msg.content}
                    </div>
                    <span className="text-[10px] font-bold text-gray-300 mt-1.5 uppercase tracking-widest">
                      {format(new Date(msg.created_at), "h:mm a")}
                    </span>
                  </div>
                </div>
              </div>
            );
          })
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-center px-10">
            <div className="w-20 h-20 bg-rose-50 rounded-full flex items-center justify-center mb-6">
              <MessageSquare className="w-10 h-10 text-rose-300" />
            </div>
            <h3 className="text-xl font-black text-gray-900">No messages yet</h3>
            <p className="text-gray-400 font-medium max-w-xs mt-2">
              Start a consultation by sending your health queries below. A staff member will reply soon.
            </p>
          </div>
        )}
      </div>

      {/* Input Area */}
      <div className="bg-white border border-rose-100 rounded-b-3xl p-5 shadow-inner">
        <form action={sendConsultationMessage} className="flex gap-3">
          <input type="hidden" name="patient_id" value={user.id} />
          <input type="hidden" name="sender_id" value={user.id} />
          <input type="hidden" name="sender_role" value="patient" />
          
          <div className="flex-1 relative group">
            <textarea
              name="content"
              placeholder="Type your message here..."
              required
              rows={1}
              className="w-full bg-gray-50 border border-gray-200 rounded-2xl px-5 py-3.5 pr-12 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 focus:bg-white transition-all resize-none font-medium"
            />
          </div>
          <Button 
            type="submit" 
            className="w-12 h-12 rounded-2xl bg-rose-500 hover:bg-rose-600 text-white shadow-md shadow-rose-200 flex-shrink-0 flex items-center justify-center transition-transform hover:scale-105 active:scale-95"
          >
            <Send className="w-5 h-5" />
          </Button>
        </form>
        <p className="text-[10px] text-center text-gray-300 font-bold uppercase tracking-widest mt-4">
          Safe and confidential communication
        </p>
      </div>
    </div>
  );
}
