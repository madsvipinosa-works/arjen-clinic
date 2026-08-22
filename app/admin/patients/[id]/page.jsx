// app/admin/patients/[id]/page.jsx
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { createClient } from '@/utils/supabase/server';
import {
  addVisitLog,
  updateBirthPlan,
  uploadAttachment,
  deleteAttachment,
  updateModularData
} from '../../../actions';
import {
  Plus, Trash2, FileUp, FileIcon,
  ImageIcon, ExternalLink, AlertTriangle, ShieldAlert
} from 'lucide-react';
import { ModularRecordEditor } from '@/components/admin/modular-record-editor';
import { PatientProfileTab } from '@/components/admin/patient-profile-tab';
import { VisitLogCard } from '@/components/admin/visit-log-card';
import { MaternalEpisodesSection } from '@/components/admin/maternal-episodes-section';
import { ConsultationThread } from '@/components/shared/consultation-thread';
import { PrintRecordButton } from '@/components/admin/patients/print-record-button';

export default async function PatientDetailPage({ params }) {
  const resolvedParams = await params;
  const id = resolvedParams.id;
  const supabase = await createClient();

  const [
    { data: patient },
    { data: birthPlan },
    { data: prenatalRecord },
    { data: visitLogs },
    { data: consultationMessages },
    { data: attachments },
    { data: { user: staffUser } },
    { data: maternalEpisodes },
    { data: staffUsersList }
  ] = await Promise.all([
    supabase.from('patients').select('*').eq('id', id).single(),
    supabase.from('birth_plans').select('*').eq('patient_id', id).single(),
    supabase.from('prenatal_records').select('*').eq('patient_id', id).single(),
    supabase.from('visit_logs').select('*').eq('patient_id', id).order('visit_date', { ascending: false }),
    supabase.from('consultation_messages').select('*').eq('patient_id', id).order('created_at', { ascending: true }),
    supabase.from('patient_attachments').select('*').eq('patient_id', id).order('created_at', { ascending: false }),
    supabase.auth.getUser(),
    supabase.from('maternal_episodes').select('*').eq('patient_id', id).order('created_at', { ascending: false }),
    supabase.from('users').select('id, email, role')
  ]);

  if (!patient) {
    return (
      <div className="flex h-64 items-center justify-center text-gray-400">
        Record not found or invalid patient ID.
      </div>
    );
  }

  // Create staff name map
  const staffMap = {};
  staffUsersList?.forEach(u => {
    staffMap[u.id] = u.email ? u.email.split('@')[0] : `Staff (${u.id.slice(0, 6)})`;
  });

  const activeEpisode = maternalEpisodes?.find(e => e.status === 'Active') || maternalEpisodes?.[0] || null;

  return (
    <div className="max-w-5xl">
      {/* Patient Header */}
      <div className="mb-6 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-3xl font-bold text-gray-900 tracking-tight">{patient.full_name || 'Anonymous Patient'}</h2>
            <div className="flex flex-wrap items-center gap-3 mt-2">
              <span className="text-sm text-gray-500 font-medium">
                ID: <span className="font-mono bg-gray-100 px-1.5 py-0.5 rounded text-xs">{id.split('-')[0]}</span>
              </span>
              {patient.age && <><span className="text-gray-300 text-sm">•</span><span className="text-sm text-gray-500">Age: {patient.age}</span></>}
              {patient.contact_number && <><span className="text-gray-300 text-sm">•</span><span className="text-sm text-gray-500">{patient.contact_number}</span></>}
              {patient.blood_type && (
                <span className="bg-rose-100 text-rose-700 font-black text-xs px-2.5 py-0.5 rounded-full border border-rose-200">
                  Blood: {patient.blood_type}
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <PrintRecordButton patientId={id} />
          </div>
        </div>

        {/* Prominent Clinical Alerts in Header */}
        <div className="flex flex-wrap gap-2.5 pt-1">
          {patient.is_high_risk && (
            <div className="bg-red-500 text-white font-bold text-xs px-3.5 py-1.5 rounded-full flex items-center gap-1.5 shadow-sm shadow-red-200 animate-pulse">
              <ShieldAlert className="w-4 h-4" />
              <span>HIGH RISK PREGNANCY</span>
            </div>
          )}

          {patient.allergies && (
            <div className="bg-amber-100 border border-amber-300 text-amber-900 font-bold text-xs px-3.5 py-1.5 rounded-full flex items-center gap-1.5 shadow-sm">
              <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0" />
              <span>Allergies: {patient.allergies}</span>
            </div>
          )}
        </div>
      </div>

      {/* Maternal Episode Management (Multiple Pregnancies) */}
      <MaternalEpisodesSection patientId={id} episodes={maternalEpisodes || []} />

      <Tabs defaultValue="profile" className="w-full">
        <TabsList className="bg-white p-1 rounded-xl border border-gray-100 shadow-sm mb-6 flex flex-wrap h-auto gap-1">
          {[
            { value: 'profile',      label: 'Profile' },
            { value: 'clinical',     label: 'Clinical Observations' },
            { value: 'prenatal',     label: 'Modular Records' },
            { value: 'birthplan',    label: 'Birth Plan' },
            { value: 'files',        label: 'Files & Labs' },
            { value: 'consultation', label: 'Consultation' },
          ].map(tab => (
            <TabsTrigger key={tab.value} value={tab.value}
              className="rounded-lg px-5 py-2.5 data-[state=active]:bg-rose-500 data-[state=active]:text-white transition-all font-bold text-sm">
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>

        {/* ─── TAB: Profile ─────────────────────────────── */}
        <TabsContent value="profile">
          <PatientProfileTab patient={patient} />
        </TabsContent>

        {/* ─── TAB: Clinical Observations ───────────────── */}
        <TabsContent value="clinical">
          <Card className="border-none shadow-md">
            <CardHeader className="border-b bg-gray-50/50 pb-6 rounded-t-xl">
              <CardTitle>Clinical Visit Logs</CardTitle>
              <CardDescription>Track all routine prenatal check-ups, vital metrics, and attending clinician notes.</CardDescription>
            </CardHeader>
            <CardContent className="p-6">
              {/* New Visit Form */}
              <form action={addVisitLog} className="mb-8 p-5 bg-rose-50/30 rounded-2xl border border-rose-100 shadow-sm space-y-5">
                <div className="flex items-center justify-between border-b border-rose-100 pb-3">
                  <h3 className="text-base font-bold text-rose-700">Log New Visit</h3>
                  {activeEpisode && (
                    <span className="text-xs font-semibold text-rose-600 bg-rose-100/70 px-2.5 py-0.5 rounded-full">
                      Tied to: {activeEpisode.lmp ? `LMP ${new Date(activeEpisode.lmp).toLocaleDateString()}` : 'Active Episode'}
                    </span>
                  )}
                </div>
                <input type="hidden" name="patient_id" value={id} />
                {activeEpisode?.id && (
                  <input type="hidden" name="maternal_episode_id" value={activeEpisode.id} />
                )}

                {/* Row 1 */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Date</Label>
                    <Input name="visit_date" type="date" defaultValue={new Date().toISOString().split('T')[0]} className="focus-visible:ring-rose-500 h-9" required />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs font-bold text-gray-500 uppercase tracking-wider">AOG by LMP</Label>
                    <Input name="aog_by_lmp" placeholder="e.g. 28 2/7" className="h-9 focus-visible:ring-rose-500" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs font-bold text-gray-500 uppercase tracking-wider">AOG by UTZ</Label>
                    <Input name="aog_by_utz" placeholder="e.g. 28 3/7" className="h-9 focus-visible:ring-rose-500" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs font-bold text-gray-500 uppercase tracking-wider">BP</Label>
                    <Input name="bp" placeholder="120/80" className="h-9 focus-visible:ring-rose-500" required />
                  </div>
                </div>

                {/* Row 2 */}
                <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Temp</Label>
                    <Input name="temp" placeholder="36.5°C" className="h-9 focus-visible:ring-rose-500" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs font-bold text-gray-500 uppercase tracking-wider">PR</Label>
                    <Input name="pr" placeholder="80 bpm" className="h-9 focus-visible:ring-rose-500" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs font-bold text-gray-500 uppercase tracking-wider">RR</Label>
                    <Input name="rr" placeholder="18 rpm" className="h-9 focus-visible:ring-rose-500" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Wt (kg)</Label>
                    <Input name="weight" placeholder="62" className="h-9 focus-visible:ring-rose-500" required />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs font-bold text-gray-500 uppercase tracking-wider">FH (cm)</Label>
                    <Input name="fh" placeholder="28" className="h-9 focus-visible:ring-rose-500" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs font-bold text-gray-500 uppercase tracking-wider">FHT</Label>
                    <Input name="fht" placeholder="140 bpm" className="h-9 focus-visible:ring-rose-500" />
                  </div>
                </div>

                {/* Row 3 */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs font-bold text-gray-500 uppercase tracking-wider">IE (Internal Examination)</Label>
                    <Input name="ie" placeholder="e.g. Cervix closed, effaced 50%" className="h-9 focus-visible:ring-rose-500" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Next Visit</Label>
                    <Input name="next_visit" type="date" className="h-9 focus-visible:ring-rose-500" />
                  </div>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Doctor's / Midwife's Note</Label>
                  <textarea
                    name="doctor_notes"
                    className="flex min-h-[80px] w-full rounded-md border border-input bg-white px-3 py-2 text-sm shadow-sm placeholder:text-gray-400 focus-visible:outline-none focus:ring-1 focus:ring-rose-500"
                    placeholder="Clinical findings, prescriptions, instructions..."
                    required
                  />
                </div>
                <Button type="submit" className="bg-rose-500 hover:bg-rose-600 text-white rounded-full px-6">
                  Save Visit Log
                </Button>
              </form>

              {/* Visit Log List */}
              <div className="space-y-4">
                <h4 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-4">Past Records</h4>
                {visitLogs && visitLogs.length > 0 ? visitLogs.map((log) => (
                  <VisitLogCard 
                    key={log.id} 
                    log={log} 
                    patientId={id} 
                    staffName={staffMap[log.attending_staff_id]}
                  />
                )) : (
                  <div className="py-8 text-center bg-gray-50 rounded-lg border border-dashed border-gray-200">
                    <p className="text-sm text-gray-500">No visit logs recorded yet.</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ─── TAB: Modular Records ──────────────────────── */}
        <TabsContent value="prenatal">
          <ModularRecordEditor
            patientId={id}
            initialModularData={prenatalRecord?.modular_data}
            updateModularData={updateModularData}
          />
        </TabsContent>

        {/* ─── TAB: Birth Plan ──────────────────────────── */}
        <TabsContent value="birthplan">
          <Card className="border-none shadow-md">
            <CardHeader className="border-b bg-gray-50/50 pb-6 rounded-t-xl">
              <CardTitle>Birth Plan</CardTitle>
              <CardDescription>Based on the AR-JEN Clinic paper birth plan form. Record patient preferences for delivery.</CardDescription>
            </CardHeader>
            <CardContent className="p-8">

              {/* ── Read-only summary ── */}
              {birthPlan && (
                <div className="mb-8 grid grid-cols-2 md:grid-cols-3 gap-4 p-5 bg-blue-50/50 border border-blue-100 rounded-2xl">
                  {[
                    { label: 'Manganganak sa',         value: birthPlan.delivery_location },
                    { label: 'Magpapaanak',             value: birthPlan.birth_attendant },
                    { label: 'Kasama',                  value: birthPlan.companion_type === 'Kapamilya' ? `Kapamilya${birthPlan.companion_family_name ? ` — ${birthPlan.companion_family_name}` : ''}` : birthPlan.companion_type },
                    { label: 'PhilHealth Facility',     value: birthPlan.is_philhealth_facility },
                    { label: 'Active PhilHealth Member',value: birthPlan.is_philhealth_member },
                    { label: 'PhilHealth No.',          value: birthPlan.philhealth_number },
                    { label: 'Mode of Payment',         value: birthPlan.payment_method },
                  ].map(item => (
                    <div key={item.label}>
                      <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest">{item.label}</p>
                      <p className="font-bold text-gray-900 mt-1">{item.value || '—'}</p>
                    </div>
                  ))}
                </div>
              )}

              {/* ── Collapsible form ── */}
              <details className="group">
                <summary className="cursor-pointer list-none flex items-center gap-2 text-sm font-bold text-rose-600 hover:text-rose-700 mb-6">
                  <span className="border border-rose-200 rounded-lg px-4 py-2 hover:bg-rose-50 transition-colors">
                    {birthPlan ? '✏️ Edit Birth Plan' : '+ Create Birth Plan'}
                  </span>
                </summary>

                <form action={updateBirthPlan} className="space-y-8 max-w-2xl">
                  <input type="hidden" name="patient_id" value={id} />

                  {/* Section 1 */}
                  <div className="space-y-3">
                    <h3 className="text-sm font-black text-gray-700 uppercase tracking-widest border-b pb-2">Ako ay manganganak sa:</h3>
                    {['Lying-in Clinic', 'Bahay', 'Ospital'].map(opt => (
                      <label key={opt} className="flex items-center gap-3 cursor-pointer group/radio">
                        <input type="radio" name="delivery_location" value={opt}
                          defaultChecked={birthPlan?.delivery_location === opt}
                          className="w-4 h-4 accent-rose-500" />
                        <span className="text-sm font-semibold text-gray-700 group-hover/radio:text-rose-600 transition-colors">{opt}</span>
                      </label>
                    ))}
                  </div>

                  {/* Section 2 */}
                  <div className="space-y-3">
                    <h3 className="text-sm font-black text-gray-700 uppercase tracking-widest border-b pb-2">Ang magpapaanak sa akin ay:</h3>
                    {['Doctor', 'Midwife', 'Hilot'].map(opt => (
                      <label key={opt} className="flex items-center gap-3 cursor-pointer group/radio">
                        <input type="radio" name="birth_attendant" value={opt}
                          defaultChecked={birthPlan?.birth_attendant === opt}
                          className="w-4 h-4 accent-rose-500" />
                        <span className="text-sm font-semibold text-gray-700 group-hover/radio:text-rose-600 transition-colors">{opt}</span>
                      </label>
                    ))}
                  </div>

                  {/* Section 3 */}
                  <div className="space-y-3">
                    <h3 className="text-sm font-black text-gray-700 uppercase tracking-widest border-b pb-2">Ang kasama ko pagpunta sa lugar ng aking pag-aanakan ay:</h3>
                    {['Asawa', 'Kapamilya', 'Kaibigan', 'Kapitbahay'].map(opt => (
                      <div key={opt}>
                        <label className="flex items-center gap-3 cursor-pointer group/radio">
                          <input type="radio" name="companion_type" value={opt}
                            defaultChecked={birthPlan?.companion_type === opt}
                            className="w-4 h-4 accent-rose-500" />
                          <span className="text-sm font-semibold text-gray-700 group-hover/radio:text-rose-600 transition-colors">
                            {opt}{opt === 'Kapamilya' ? ' (kaano-ano)' : ''}
                          </span>
                        </label>
                        {opt === 'Kapamilya' && (
                          <Input name="companion_family_name" defaultValue={birthPlan?.companion_family_name}
                            placeholder="Pangalan ng kapamilya"
                            className="ml-7 mt-2 max-w-xs h-9 focus-visible:ring-rose-500 text-sm" />
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Section 4 */}
                  <div className="space-y-3">
                    <h3 className="text-sm font-black text-gray-700 uppercase tracking-widest border-b pb-2">Ang aking pag-aanakan ay isang PhilHealth Facility:</h3>
                    {['OO', 'HINDI'].map(opt => (
                      <label key={opt} className="flex items-center gap-3 cursor-pointer group/radio">
                        <input type="radio" name="is_philhealth_facility" value={opt}
                          defaultChecked={birthPlan?.is_philhealth_facility === opt}
                          className="w-4 h-4 accent-rose-500" />
                        <span className="text-sm font-semibold text-gray-700 group-hover/radio:text-rose-600 transition-colors">{opt}</span>
                      </label>
                    ))}
                  </div>

                  {/* Section 5 */}
                  <div className="space-y-3">
                    <h3 className="text-sm font-black text-gray-700 uppercase tracking-widest border-b pb-2">Ako ay Active PhilHealth Member:</h3>
                    {['OO', 'HINDI'].map(opt => (
                      <label key={opt} className="flex items-center gap-3 cursor-pointer group/radio">
                        <input type="radio" name="is_philhealth_member" value={opt}
                          defaultChecked={birthPlan?.is_philhealth_member === opt}
                          className="w-4 h-4 accent-rose-500" />
                        <span className="text-sm font-semibold text-gray-700 group-hover/radio:text-rose-600 transition-colors">{opt}</span>
                      </label>
                    ))}
                    <div className="ml-7">
                      <Label className="text-xs font-bold text-gray-500">PhilHealth Number</Label>
                      <Input name="philhealth_number" defaultValue={birthPlan?.philhealth_number}
                        placeholder="00-000000000-0"
                        className="mt-1 max-w-xs h-9 focus-visible:ring-rose-500 text-sm" />
                    </div>
                  </div>

                  {/* Section 6 */}
                  <div className="space-y-3">
                    <h3 className="text-sm font-black text-gray-700 uppercase tracking-widest border-b pb-2">Ang pambayad na gagamitin ko sa aking panganganak ay:</h3>
                    {['Cash', 'Philhealth', 'Medical Insurance'].map(opt => (
                      <label key={opt} className="flex items-center gap-3 cursor-pointer group/radio">
                        <input type="radio" name="payment_method" value={opt}
                          defaultChecked={birthPlan?.payment_method === opt}
                          className="w-4 h-4 accent-rose-500" />
                        <span className="text-sm font-semibold text-gray-700 group-hover/radio:text-rose-600 transition-colors">{opt}</span>
                      </label>
                    ))}
                  </div>

                  <div className="pt-4 border-t border-gray-100">
                    <Button type="submit" className="bg-rose-500 hover:bg-rose-600 text-white rounded-2xl h-12 px-10 font-black shadow-lg shadow-rose-100">
                      Save Birth Plan
                    </Button>
                  </div>
                </form>
              </details>
            </CardContent>
          </Card>
        </TabsContent>



        {/* ─── TAB: Files & Labs ────────────────────────── */}
        <TabsContent value="files">
          <Card className="border-none shadow-md">
            <CardHeader className="border-b bg-gray-50/50 pb-6 rounded-t-xl">
              <CardTitle>Files & Lab Results</CardTitle>
              <CardDescription>Manage ultrasound images, PDF lab results, and other medical documents.</CardDescription>
            </CardHeader>
            <CardContent className="p-6">
              {/* Upload Form */}
              <div className="bg-rose-50/50 border border-rose-100 rounded-2xl p-6 mb-8">
                <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <FileUp className="w-5 h-5 text-rose-500" /> Upload New Document
                </h3>
                <form action={uploadAttachment} className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <input type="hidden" name="patient_id" value={id} />
                  <div>
                    <Label className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2 block">Category</Label>
                    <select name="category" className="w-full h-11 rounded-xl border border-gray-200 bg-white px-3 text-sm focus:ring-2 focus:ring-rose-500/20 outline-none">
                      <option value="Lab Result">Lab Result</option>
                      <option value="Ultrasound">Ultrasound</option>
                      <option value="Prescription">Prescription</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                  <div>
                    <Label className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2 block">Select File</Label>
                    <Input
                      type="file" name="file" required
                      accept="image/*,.pdf,.doc,.docx"
                      className="h-11 border-dashed border-2 border-rose-200 bg-white file:bg-rose-50 file:text-rose-600 file:border-none file:h-full file:px-4 file:mr-4 file:font-bold text-xs"
                    />
                  </div>
                  <div className="flex items-end">
                    <Button type="submit" className="w-full bg-rose-500 hover:bg-rose-600 text-white rounded-xl h-11 font-bold gap-2">
                      <Plus className="w-4 h-4" /> Upload File
                    </Button>
                  </div>
                </form>
              </div>

              {/* Files Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {attachments?.length > 0 ? attachments.map((file) => {
                  const isImage = ['jpg', 'jpeg', 'png', 'webp', 'gif'].includes(file.file_type?.toLowerCase());
                  return (
                    <div key={file.id} className="group bg-white border border-gray-100 rounded-2xl overflow-hidden hover:shadow-lg transition-all">
                      {/* Inline image preview */}
                      {isImage && (
                        <div className="w-full h-40 bg-gray-50 overflow-hidden">
                          <img
                            src={file.file_url}
                            alt={file.file_name}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                        </div>
                      )}
                      {!isImage && (
                        <div className="w-full h-28 bg-rose-50 flex items-center justify-center">
                          <FileIcon className="w-10 h-10 text-rose-300" />
                        </div>
                      )}

                      <div className="p-4">
                        <p className="font-bold text-gray-900 text-sm truncate" title={file.file_name}>{file.file_name}</p>
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-0.5">
                          {file.category} • {file.file_type?.toUpperCase()}
                        </p>
                        <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-50">
                          <span className="text-[10px] font-bold text-gray-300">
                            {new Date(file.created_at).toLocaleDateString()}
                          </span>
                          <div className="flex gap-1">
                            <a href={file.file_url} target="_blank" rel="noopener noreferrer"
                              className="p-1.5 bg-gray-50 text-gray-400 hover:bg-rose-50 hover:text-rose-600 rounded-lg transition-colors">
                              <ExternalLink className="w-4 h-4" />
                            </a>
                            <form action={deleteAttachment}>
                              <input type="hidden" name="id" value={file.id} />
                              <input type="hidden" name="file_url" value={file.file_url} />
                              <input type="hidden" name="patient_id" value={id} />
                              <Button type="submit" variant="ghost"
                                className="p-1.5 h-auto text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg"
                                onClick={(e) => { if (!window.confirm('Delete this file permanently?')) e.preventDefault(); }}>
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </form>
                          </div>
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

        {/* ─── TAB: Consultation ────────────────────────── */}
        <TabsContent value="consultation">
          <Card className="border-none shadow-md">
            <CardHeader className="border-b bg-gray-50/50 pb-6 rounded-t-xl">
              <CardTitle>Online Consultation Thread</CardTitle>
              <CardDescription>
                Live communication with {patient.full_name}. Messages appear instantly on both sides.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <ConsultationThread
                patientId={id}
                senderId={staffUser?.id}
                senderRole="staff"
                initialMessages={consultationMessages || []}
                compact={true}
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
