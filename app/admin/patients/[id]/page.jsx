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
import { ClinicalOverviewBento } from '@/components/admin/clinical/clinical-overview-bento';
import { PrenatalLabsSection } from '@/components/admin/clinical/prenatal-labs-section';
import { PatientClinicalHeader } from '@/components/admin/clinical/patient-clinical-header';
import { PrenatalVisitsTab } from '@/components/admin/clinical/prenatal-visits-tab';
import { PostpartumTabContent } from '@/components/admin/clinical/postpartum-tab-content';
import { PatientTabsWrapper } from '@/components/admin/clinical/patient-tabs-wrapper';
import { BreadcrumbTrail } from '@/components/admin/shared/breadcrumb-trail';
import { Baby, FlaskConical } from 'lucide-react';
import Link from 'next/link';

export default async function PatientDetailPage({ params, searchParams }) {
  const resolvedParams = await params;
  const resolvedSearchParams = await searchParams;
  const id = resolvedParams.id;
  const selectedEpisodeId = resolvedSearchParams?.episode;
  const defaultTab = resolvedSearchParams?.tab || 'profile';
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
    { data: staffUsersList },
    { data: prenatalLabResults },
    { data: postpartumRecords }
  ] = await Promise.all([
    supabase.from('patients').select('*').eq('id', id).single(),
    supabase.from('birth_plans').select('*').eq('patient_id', id).single(),
    supabase.from('prenatal_records').select('*').eq('patient_id', id).single(),
    supabase.from('visit_logs').select('*').eq('patient_id', id).order('visit_date', { ascending: false }),
    supabase.from('consultation_messages').select('*').eq('patient_id', id).order('created_at', { ascending: true }),
    supabase.from('patient_attachments').select('*').eq('patient_id', id).order('created_at', { ascending: false }),
    supabase.auth.getUser(),
    supabase.from('maternal_episodes').select('*').eq('patient_id', id).order('created_at', { ascending: false }),
    supabase.from('users').select('id, email, role'),
    supabase.from('prenatal_lab_results').select('*').eq('patient_id', id).order('test_date', { ascending: false }),
    supabase.from('postpartum_records').select('*').eq('patient_id', id).order('created_at', { ascending: false })
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

  const activeEpisode = (selectedEpisodeId ? maternalEpisodes?.find(e => e.id === selectedEpisodeId) : null)
    || maternalEpisodes?.find(e => e.status === 'Active')
    || maternalEpisodes?.[0]
    || null;

  return (
    <div className="w-full max-w-7xl mx-auto space-y-6">
      {/* ── Breadcrumb Navigation Trail ── */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2 flex-wrap">
          <BreadcrumbTrail
            items={[
              { label: 'Patient Directory', href: '/admin/patients' },
              { label: patient.full_name || 'Patient Chart', isCurrent: true },
            ]}
          />
          <span className="font-mono text-xs font-bold text-gray-500 bg-gray-100 px-2 py-0.5 rounded-md border border-gray-200">
            #{patient.id.slice(0, 8).toUpperCase()}
          </span>
          {patient.is_high_risk ? (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-red-50 text-red-700 border border-red-200">
              <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-ping" />
              High Risk Monitoring
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              Standard Care
            </span>
          )}
        </div>
      </div>

      {/* ── 3-Second Clinical Snapshot Banner & Maternal Episode Switcher ── */}
      <PatientClinicalHeader
        patient={patient}
        maternalEpisodes={maternalEpisodes || []}
        activeEpisode={activeEpisode}
        birthPlan={birthPlan}
        id={id}
        latestVisitLog={visitLogs?.[0] || null}
      />

      <PatientTabsWrapper
        defaultTab={defaultTab}
        tabs={[
          { value: 'profile', label: 'Overview & Profile' },
          { value: 'clinical', label: 'Prenatal Visits' },
          { value: 'labs', label: 'Structured Labs & Ultrasound' },
          { value: 'postpartum', label: 'Postpartum & Newborn Care' },
          { value: 'birthplan', label: 'Birth Plan & Documents' },
        ]}
      >

        {/* ─── TAB: Overview & Profile (Bento Grid Workspace) ─────────────────────────── */}
        <TabsContent value="profile">
          <ClinicalOverviewBento
            patient={patient}
            activeEpisode={activeEpisode}
            latestVisitLog={visitLogs?.[0] || null}
            latestLabResult={prenatalLabResults?.[0] || null}
            postpartumRecord={postpartumRecords?.[0] || null}
            birthPlan={birthPlan}
            consultationMessages={consultationMessages || []}
            modularData={prenatalRecord?.modular_data}
            updateModularData={updateModularData}
            visitLogs={visitLogs || []}
          />
        </TabsContent>

        {/* ─── TAB: Clinical Observations (Progressive Checkup Form + History) ─── */}
        <TabsContent value="clinical">
          <PrenatalVisitsTab
            patientId={id}
            activeEpisode={activeEpisode}
            patientAge={patient.age}
            previousLog={visitLogs?.[0] || null}
            isHighRisk={patient.is_high_risk}
            latestUrinalysisProtein={prenatalLabResults?.[0]?.urinalysis_protein}
            addVisitLogAction={addVisitLog}
            visitLogs={visitLogs || []}
            staffMap={staffMap}
          />
        </TabsContent>

        {/* ─── TAB: Structured Labs ─────────────────────── */}
        <TabsContent value="labs">
          <PrenatalLabsSection
            patientId={id}
            activeEpisodeId={activeEpisode?.id}
            labResults={prenatalLabResults || []}
            patientBloodType={patient.blood_type}
          />
        </TabsContent>

        {/* ─── TAB: Postpartum & DOH Newborn Care (EINC) ─── */}
        <TabsContent value="postpartum">
          <PostpartumTabContent
            patient={patient}
            activeEpisode={activeEpisode}
            postpartumRecord={postpartumRecords?.[0] || null}
            postpartumRecords={postpartumRecords || []}
          />
        </TabsContent>

        {/* ─── TAB: Birth Plan & Medical Documents ──────────────────── */}
        <TabsContent value="birthplan" className="space-y-6">
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
                    { label: 'Manganganak sa', value: birthPlan.delivery_location },
                    { label: 'Magpapaanak', value: birthPlan.birth_attendant },
                    { label: 'Kasama', value: birthPlan.companion_type === 'Kapamilya' ? `Kapamilya${birthPlan.companion_family_name ? ` — ${birthPlan.companion_family_name}` : ''}` : birthPlan.companion_type },
                    { label: 'PhilHealth Facility', value: birthPlan.is_philhealth_facility },
                    { label: 'Active PhilHealth Member', value: birthPlan.is_philhealth_member },
                    { label: 'PhilHealth No.', value: birthPlan.philhealth_number },
                    { label: 'Mode of Payment', value: birthPlan.payment_method },
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

          {/* ── Patient Files, Ultrasounds & Lab Documents ── */}
          <Card className="border-none shadow-md">
            <CardHeader className="border-b bg-gray-50/50 pb-6 rounded-t-xl">
              <CardTitle>Medical Documents &amp; Uploads</CardTitle>
              <CardDescription>Manage ultrasound scans, PDF lab results, and patient consent documents.</CardDescription>
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
      </PatientTabsWrapper>
    </div>
  );
}
