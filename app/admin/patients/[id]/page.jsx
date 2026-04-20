// app/admin/patients/[id]/page.jsx
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { createClient } from "@/utils/supabase/server";
import { 
  addVisitLog, 
  updateBirthPlan, 
  updatePrenatal, 
  sendConsultationMessage,
  uploadAttachment,
  deleteAttachment,
  updateModularData
} from "../../../actions";
import { 
  MessageSquare, 
  Send,
  Plus,
  Trash2,
  FileUp,
  FileIcon,
  ImageIcon,
  ExternalLink,
  ClipboardList,
  AlertCircle
} from "lucide-react";
import { ModularRecordEditor } from "@/components/admin/modular-record-editor";

export default async function PatientDetailPage({ params }) {
  // Await the Next.js 15+ dynamic params object securely
  const resolvedParams = await params;
  const id = resolvedParams.id;
  
  const supabase = await createClient();

  // Parallel data fetching for instant load speeds
  const [
    { data: patient },
    { data: birthPlan },
    { data: prenatalRecord },
    { data: visitLogs },
    { data: consultationMessages },
    { data: attachments },
    { data: { user: staffUser } }
  ] = await Promise.all([
    supabase.from('patients').select('*').eq('id', id).single(),
    supabase.from('birth_plans').select('*').eq('patient_id', id).single(),
    supabase.from('prenatal_records').select('*').eq('patient_id', id).single(),
    supabase.from('visit_logs').select('*').eq('patient_id', id).order('visit_date', { ascending: false }),
    supabase.from('consultation_messages').select('*').eq('patient_id', id).order('created_at', { ascending: true }),
    supabase.from('patient_attachments').select('*').eq('patient_id', id).order('created_at', { ascending: false }),
    supabase.auth.getUser()
  ]);

  // Handle Edge Case where UUID might be malformed or missing
  if (!patient) {
    return (
      <div className="flex h-64 items-center justify-center text-gray-400">
        Record not found or invalid patient ID.
      </div>
    );
  }

  // Safe extraction of nested JSONB fields
  const healthDetails = prenatalRecord?.health_history?.details || '';
  const labDetails = prenatalRecord?.lab_results?.details || '';

  return (
    <div className="max-w-5xl">
      <div className="mb-6">
        <h2 className="text-3xl font-bold text-gray-900 tracking-tight">{patient.full_name || 'Anonymous Patient'}</h2>
        <div className="flex items-center gap-4 text-sm text-gray-500 mt-2 font-medium">
          <span>Patient ID: <span className="font-mono bg-gray-100 px-1 rounded">{id.split('-')[0]}</span></span>
          <span className="text-gray-300">•</span>
          <span>Age: {patient.age || '--'}</span>
          <span className="text-gray-300">•</span>
          <span>Contact Number: {patient.contact_number || '--'}</span>
        </div>
      </div>

      <Tabs defaultValue="clinical" className="w-full">
        <TabsList className="bg-white p-1 rounded-xl border border-gray-100 shadow-sm mb-6 flex flex-wrap h-auto">
          <TabsTrigger value="clinical" className="rounded-lg px-6 py-2.5 data-[state=active]:bg-rose-500 data-[state=active]:text-white transition-all font-bold text-sm">Clinical Observations</TabsTrigger>
          <TabsTrigger value="prenatal" className="rounded-lg px-6 py-2.5 data-[state=active]:bg-rose-500 data-[state=active]:text-white transition-all font-bold text-sm">Modular Records</TabsTrigger>
          <TabsTrigger value="birthplan" className="rounded-lg px-6 py-2.5 data-[state=active]:bg-rose-500 data-[state=active]:text-white transition-all font-bold text-sm">Birth Plan</TabsTrigger>
          <TabsTrigger value="files" className="rounded-lg px-6 py-2.5 data-[state=active]:bg-rose-500 data-[state=active]:text-white transition-all font-bold text-sm">Files & Labs</TabsTrigger>
          <TabsTrigger value="consultation" className="rounded-lg px-6 py-2.5 data-[state=active]:bg-rose-500 data-[state=active]:text-white transition-all font-bold text-sm">Consultation</TabsTrigger>
        </TabsList>

        {/* ─── TAB 1: Clinical Observations ────────────────── */}
        <TabsContent value="clinical">
          <Card className="border-none shadow-md">
            <CardHeader className="border-b bg-gray-50/50 pb-6 rounded-t-xl">
              <CardTitle>Clinical Visit Logs</CardTitle>
              <CardDescription>Track all routine prenatal check-ups and vitals for this patient.</CardDescription>
            </CardHeader>
            <CardContent className="p-6">
              <form action={addVisitLog} className="mb-8 p-5 bg-rose-50/30 rounded-lg border border-rose-100 shadow-sm space-y-5">
                <div className="flex items-center justify-between border-b border-rose-100 pb-3">
                  <h3 className="text-base font-bold text-rose-700">Log New Visit</h3>
                </div>
                <input type="hidden" name="patient_id" value={id} />
                
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="bp" className="text-gray-600">Blood Pressure</Label>
                    <Input id="bp" name="bp" placeholder="e.g. 120/80" className="focus-visible:ring-rose-500" required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="weight" className="text-gray-600">Weight Context</Label>
                    <Input id="weight" name="weight" placeholder="e.g. 62 kg" className="focus-visible:ring-rose-500" required />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="doctor_notes" className="text-gray-600">Clinical Observations & Checkup Notes</Label>
                  <textarea 
                    id="doctor_notes" 
                    name="doctor_notes" 
                    className="flex min-h-[90px] w-full rounded-md border border-input bg-white px-3 py-2 text-sm shadow-sm placeholder:text-gray-400 focus-visible:outline-none focus-[ring=1] focus:ring-rose-500" 
                    placeholder="Heart rate normal, prescribed additional iron supplements..." 
                    required 
                  />
                </div>
                <Button type="submit" className="bg-rose-500 hover:bg-rose-600 text-white rounded-full px-6">
                  Save Visit Log
                </Button>
              </form>

              <div className="space-y-4">
                <h4 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-4">Past Records</h4>
                {visitLogs && visitLogs.length > 0 ? visitLogs.map((log) => (
                  <div key={log.id} className="flex flex-col md:flex-row items-start gap-4 p-4 bg-white border border-gray-100 rounded-xl shadow-sm hover:border-gray-200 transition-colors">
                    <div className="md:w-32 shrink-0">
                      <span className="inline-block bg-gray-100 text-gray-600 text-xs font-bold px-2.5 py-1 rounded-full">
                        {new Date(log.visit_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                      </span>
                    </div>
                    <div className="flex-1">
                      <p className="text-sm text-gray-800 leading-relaxed mb-3">{log.doctor_notes}</p>
                      <div className="flex flex-wrap gap-3">
                        <span className="text-xs bg-rose-50 text-rose-700 font-medium px-2 py-0.5 rounded border border-rose-100">
                          BP: {log.bp}
                        </span>
                        <span className="text-xs bg-blue-50 text-blue-700 font-medium px-2 py-0.5 rounded border border-blue-100">
                          Weight: {log.weight}
                        </span>
                      </div>
                    </div>
                  </div>
                )) : (
                  <div className="py-8 text-center bg-gray-50 rounded-lg border border-dashed border-gray-200">
                    <p className="text-sm text-gray-500">No visit logs have been recorded for this patient yet.</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ─── TAB 2: Modular Records ────────────────────── */}
        <TabsContent value="prenatal">
          <ModularRecordEditor 
            patientId={id} 
            initialModularData={prenatalRecord?.modular_data} 
            updateModularData={updateModularData} 
          />
        </TabsContent>

        {/* ─── TAB 3: Birth Plan ────────────────────────────── */}
        <TabsContent value="birthplan">
          <Card className="border-none shadow-md">
            <CardHeader className="border-b bg-gray-50/50 pb-6 rounded-t-xl">
              <CardTitle>Comprehensive Birth Plan</CardTitle>
              <CardDescription>Document patient preferences, emergency contacts, and delivery logistics.</CardDescription>
            </CardHeader>
            <CardContent className="p-8">
              <form action={updateBirthPlan} className="space-y-10 max-w-4xl mx-auto">
                <input type="hidden" name="patient_id" value={id} />
                
                {/* Section 1: Logistics (Tagalog) */}
                <div className="grid md:grid-cols-2 gap-8">
                  <div className="space-y-4">
                    <h3 className="text-lg font-black text-gray-900 border-l-4 border-rose-500 pl-3">Logistics & Delivery</h3>
                    
                    <div className="space-y-2">
                      <Label className="text-sm font-bold text-gray-700">Ako ay manganganak sa (I will give birth at):</Label>
                      <select name="delivery_location" defaultValue={birthPlan?.delivery_location} className="w-full h-11 rounded-xl border border-gray-200 bg-white px-3 focus:ring-2 focus:ring-rose-500/20 outline-none font-medium">
                        <option value="Lying-in Clinic">Lying-in Clinic</option>
                        <option value="Bahay (Home)">Bahay (Home)</option>
                        <option value="Ospital (Hospital)">Ospital (Hospital)</option>
                      </select>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-sm font-bold text-gray-700">Ang magpapaanak sa akin ay (Attendant):</Label>
                      <Input name="birth_attendant" defaultValue={birthPlan?.birth_attendant} placeholder="e.g. Doctor, Midwife, Hilot" className="h-11 rounded-xl" />
                    </div>

                    <div className="space-y-2">
                      <Label className="text-sm font-bold text-gray-700">Sasakyang gagamitin (Vehicle):</Label>
                      <Input name="transportation" defaultValue={birthPlan?.transportation} placeholder="e.g. Ambulansya, Jeep, Tricycle" className="h-11 rounded-xl" />
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h3 className="text-lg font-black text-gray-900 border-l-4 border-rose-500 pl-3">Companions & PhilHealth</h3>
                    
                    <div className="space-y-2">
                      <Label className="text-sm font-bold text-gray-700">Kasama sa lugar ng panganganak (Companion):</Label>
                      <Input name="companion_name" defaultValue={birthPlan?.companion_name} placeholder="e.g. Asawa, Kapamilya" className="h-11 rounded-xl" />
                    </div>

                    <div className="grid grid-cols-2 gap-4 pt-2">
                      <div className="space-y-2">
                        <Label className="text-sm font-bold text-gray-700 text-xs">PhilHealth Member?</Label>
                        <select name="is_philhealth_member" defaultValue={birthPlan?.is_philhealth_member} className="w-full h-11 rounded-xl border border-gray-200 bg-white px-3 focus:ring-2 focus:ring-rose-500/20 outline-none">
                          <option value="OO (Yes)">OO (Yes)</option>
                          <option value="HINDI (No)">HINDI (No)</option>
                        </select>
                      </div>
                      <div className="space-y-2">
                        <Label className="text-sm font-bold text-gray-700 text-xs">Mode of Payment</Label>
                        <select name="payment_method" defaultValue={birthPlan?.payment_method} className="w-full h-11 rounded-xl border border-gray-200 bg-white px-3 focus:ring-2 focus:ring-rose-500/20 outline-none">
                          <option value="Cash">Cash</option>
                          <option value="PhilHealth">PhilHealth</option>
                          <option value="Insurance">Medical Insurance</option>
                        </select>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Section 2: Emergencies */}
                <div className="bg-rose-50/50 rounded-3xl p-6 border border-rose-100 space-y-6">
                  <h3 className="text-lg font-black text-rose-800 flex items-center gap-2">
                    <AlertCircle className="w-5 h-5" />
                    Emergency Contact & Backup Plan
                  </h3>
                  
                  <div className="grid md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <Label className="text-xs font-black text-rose-400 uppercase tracking-widest block mb-2">Primary Emergency Contact</Label>
                      <Input name="emergency_name" defaultValue={birthPlan?.emergency_name} placeholder="Contact Name" className="h-11 rounded-xl border-rose-200" />
                      <Input name="emergency_contact" defaultValue={birthPlan?.emergency_contact} placeholder="Contact Number" className="h-11 rounded-xl border-rose-200" />
                    </div>

                    <div className="space-y-4">
                      <Label className="text-xs font-black text-rose-400 uppercase tracking-widest block mb-2">Hospital Referral (Backup)</Label>
                      <select name="backup_hospital_type" defaultValue={birthPlan?.backup_hospital_type} className="w-full h-11 rounded-xl border border-rose-200 bg-white px-3 focus:ring-2 focus:ring-rose-500/20 outline-none">
                        <option value="Government Hospital">Government Hospital</option>
                        <option value="Private Hospital">Private Hospital</option>
                      </select>
                      <Input name="blood_donor_contact" defaultValue={birthPlan?.blood_donor_contact} placeholder="Potential Blood Donor Name/Contact" className="h-11 rounded-xl border-rose-200" />
                    </div>
                  </div>
                </div>

                <div className="flex justify-end pt-6 border-t border-gray-100">
                  <Button type="submit" className="bg-rose-500 hover:bg-rose-600 text-white rounded-2xl h-14 px-10 font-black text-lg shadow-lg shadow-rose-100 transition-all active:scale-95">
                    Save Complete Birth Plan
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ─── TAB 4: Files & Lab Results ───────────────────── */}
        <TabsContent value="files">
          <Card className="border-none shadow-md">
            <CardHeader className="border-b bg-gray-50/50 pb-6 rounded-t-xl flex flex-row items-center justify-between">
              <div>
                <CardTitle>Files & Lab Results</CardTitle>
                <CardDescription>Manage ultrasound images, PDF lab results, and other medical documents.</CardDescription>
              </div>
            </CardHeader>
            <CardContent className="p-6">
              {/* Upload Form */}
              <div className="bg-rose-50/50 border border-rose-100 rounded-2xl p-6 mb-8">
                <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <FileUp className="w-5 h-5 text-rose-500" />
                  Upload New Document
                </h3>
                <form action={uploadAttachment} className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <input type="hidden" name="patient_id" value={id} />
                  
                  <div className="md:col-span-1">
                    <Label className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2 block">Category</Label>
                    <select 
                      name="category" 
                      className="w-full h-11 rounded-xl border border-gray-200 bg-white px-3 text-sm focus:ring-2 focus:ring-rose-500/20 outline-none"
                    >
                      <option value="Lab Result">Lab Result</option>
                      <option value="Ultrasound">Ultrasound</option>
                      <option value="Prescription">Prescription</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>

                  <div className="md:col-span-1">
                    <Label className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2 block">Select File</Label>
                    <Input 
                      type="file" 
                      name="file" 
                      required 
                      className="h-11 border-dashed border-2 border-rose-200 bg-white file:bg-rose-50 file:text-rose-600 file:border-none file:h-full file:px-4 file:mr-4 file:font-bold text-xs"
                    />
                  </div>

                  <div className="flex items-end">
                    <Button type="submit" className="w-full bg-rose-500 hover:bg-rose-600 text-white rounded-xl h-11 font-bold gap-2">
                      <Plus className="w-4 h-4" />
                      Upload File
                    </Button>
                  </div>
                </form>
              </div>

              {/* Files Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {attachments?.length > 0 ? attachments.map((file) => {
                  const isImage = ['jpg', 'jpeg', 'png', 'webp', 'gif'].includes(file.file_type?.toLowerCase());
                  return (
                    <div key={file.id} className="group relative bg-white border border-gray-100 rounded-2xl p-4 hover:shadow-lg transition-all">
                      <div className="flex items-start gap-3">
                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${isImage ? 'bg-blue-50 text-blue-500' : 'bg-rose-50 text-rose-500'}`}>
                          {isImage ? <ImageIcon className="w-6 h-6" /> : <FileIcon className="w-6 h-6" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-gray-900 text-sm truncate pr-6" title={file.file_name}>
                            {file.file_name}
                          </p>
                          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-0.5">
                            {file.category} • {file.file_type?.toUpperCase()}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-50">
                        <span className="text-[10px] font-bold text-gray-300">
                          {new Date(file.created_at).toLocaleDateString()}
                        </span>
                        <div className="flex gap-2">
                          <a 
                            href={file.file_url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="p-2 bg-gray-50 text-gray-400 hover:bg-rose-50 hover:text-rose-600 rounded-lg transition-colors"
                          >
                            <ExternalLink className="w-4 h-4" />
                          </a>
                          <form action={deleteAttachment}>
                            <input type="hidden" name="id" value={file.id} />
                            <input type="hidden" name="file_url" value={file.file_url} />
                            <input type="hidden" name="patient_id" value={id} />
                            <Button 
                              type="submit" 
                              variant="ghost" 
                              className="p-2 h-auto text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </form>
                        </div>
                      </div>
                    </div>
                  );
                }) : (
                  <div className="col-span-full py-20 text-center">
                    <FileIcon className="w-16 h-16 text-gray-100 mx-auto mb-4" />
                    <p className="text-gray-400 font-medium">No documents uploaded for this patient yet.</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="consultation">
          <Card className="border-none shadow-md">
            <CardHeader className="border-b bg-gray-50/50 pb-6 rounded-t-xl">
              <CardTitle>Online Consultation Thread</CardTitle>
              <CardDescription>Direct communication history with {patient.full_name}.</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <div className="flex flex-col h-[500px]">
                {/* Messages List */}
                <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-gray-50/30">
                  {consultationMessages?.length > 0 ? consultationMessages.map((msg) => {
                    const isStaff = msg.sender_role === 'staff';
                    return (
                      <div key={msg.id} className={`flex ${isStaff ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[80%] px-4 py-2.5 rounded-2xl text-sm ${
                          isStaff 
                            ? 'bg-rose-500 text-white rounded-br-none' 
                            : 'bg-white border border-gray-200 text-gray-800 rounded-bl-none shadow-sm'
                        }`}>
                          <p className="font-medium leading-relaxed">{msg.content}</p>
                          <p className={`text-[10px] mt-1 ${isStaff ? 'text-rose-100' : 'text-gray-400'}`}>
                            {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>
                      </div>
                    );
                  }) : (
                    <div className="h-full flex flex-col items-center justify-center text-gray-400 space-y-2">
                      <MessageSquare className="w-10 h-10 opacity-20" />
                      <p>No messages exchanged yet.</p>
                    </div>
                  )}
                </div>

                {/* Staff Reply Form */}
                <div className="p-4 border-t bg-white rounded-b-xl">
                  <form action={sendConsultationMessage} className="flex gap-2">
                    <input type="hidden" name="patient_id" value={id} />
                    <input type="hidden" name="sender_id" value={staffUser?.id} />
                    <input type="hidden" name="sender_role" value="staff" />
                    
                    <Input 
                      name="content" 
                      placeholder="Type a reply..." 
                      className="flex-1 focus-visible:ring-rose-500 bg-gray-50" 
                      required 
                    />
                    <Button type="submit" className="bg-rose-500 hover:bg-rose-600 text-white gap-2 px-6">
                      <Send className="w-4 h-4" />
                      Reply
                    </Button>
                  </form>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

      </Tabs>
    </div>
  );
}
