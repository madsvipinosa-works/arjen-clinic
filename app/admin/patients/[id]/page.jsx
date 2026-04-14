// app/admin/patients/[id]/page.jsx
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { createClient } from "@/utils/supabase/server";
import { addVisitLog, updateBirthPlan, updatePrenatal } from "../../../actions";

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
    { data: visitLogs }
  ] = await Promise.all([
    supabase.from('patients').select('*').eq('id', id).single(),
    supabase.from('birth_plans').select('*').eq('patient_id', id).single(),
    supabase.from('prenatal_records').select('*').eq('patient_id', id).single(),
    supabase.from('visit_logs').select('*').eq('patient_id', id).order('visit_date', { ascending: false })
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

      <Tabs defaultValue="visitlogs" className="w-full">
        <TabsList className="mb-6 bg-white border shadow-sm">
          <TabsTrigger value="visitlogs" className="data-[state=active]:bg-rose-500 data-[state=active]:text-white">Visit Logs</TabsTrigger>
          <TabsTrigger value="prenatal" className="data-[state=active]:bg-rose-500 data-[state=active]:text-white">Prenatal Record</TabsTrigger>
          <TabsTrigger value="birthplan" className="data-[state=active]:bg-rose-500 data-[state=active]:text-white">Birth Plan</TabsTrigger>
        </TabsList>

        {/* ─── TAB 1: Visit Logs ────────────────────────────── */}
        <TabsContent value="visitlogs">
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

        {/* ─── TAB 2: Prenatal Record ───────────────────────── */}
        <TabsContent value="prenatal">
          <Card className="border-none shadow-md">
            <CardHeader className="border-b bg-gray-50/50 pb-6 rounded-t-xl">
              <CardTitle>Prenatal Record</CardTitle>
              <CardDescription>Maintain persistent health history and evolving laboratory insights.</CardDescription>
            </CardHeader>
            <CardContent className="p-6">
              <form action={updatePrenatal} className="space-y-8">
                <input type="hidden" name="patient_id" value={id} />
                
                <div className="space-y-3">
                  <Label htmlFor="health_history" className="text-base text-gray-800">Health & Medical History</Label>
                  <p className="text-xs text-gray-500">Record past surgeries, chronic illnesses, or family conditions relevant to the pregnancy.</p>
                  <textarea 
                    id="health_history" 
                    name="health_history" 
                    defaultValue={healthDetails} 
                    className="flex min-h-[140px] w-full rounded-md border border-input bg-transparent px-4 py-3 text-sm shadow-sm focus-visible:outline-none focus:ring-1 focus:ring-rose-500 leading-relaxed" 
                    placeholder="Patient states she has a history of mild asthma..."
                  />
                </div>
                
                <div className="space-y-3">
                  <Label htmlFor="lab_results" className="text-base text-gray-800">Laboratory Results Summaries</Label>
                   <p className="text-xs text-gray-500">Log ultrasound findings, bloodwork panels, and urinalysis.</p>
                  <textarea 
                    id="lab_results" 
                    name="lab_results" 
                    defaultValue={labDetails} 
                    className="flex min-h-[140px] w-full rounded-md border border-input bg-transparent px-4 py-3 text-sm shadow-sm focus-visible:outline-none focus:ring-1 focus:ring-rose-500 leading-relaxed" 
                    placeholder="Latest CBC shows normal hemoglobin levels..."
                  />
                </div>
                
                <div className="flex justify-end pt-2 border-t border-gray-100">
                  <Button type="submit" className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-full px-8">Save Record</Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ─── TAB 3: Birth Plan ────────────────────────────── */}
        <TabsContent value="birthplan">
          <Card className="border-none shadow-md">
            <CardHeader className="border-b bg-gray-50/50 pb-6 rounded-t-xl">
              <CardTitle>Birth Plan Directives</CardTitle>
              <CardDescription>Document and respect the patient's delivery logistics and companion preferences.</CardDescription>
            </CardHeader>
            <CardContent className="p-6">
              <form action={updateBirthPlan} className="space-y-6 max-w-xl">
                <input type="hidden" name="patient_id" value={id} />
                
                <div className="space-y-2">
                  <Label htmlFor="delivery_location" className="text-gray-700 font-semibold">Primary Delivery Location</Label>
                  <p className="text-xs text-gray-500 italic mb-2">Saan plano manganak ang pasyente?</p>
                  <Input 
                    id="delivery_location" 
                    name="delivery_location" 
                    defaultValue={birthPlan?.delivery_location || ''} 
                    placeholder="e.g. AR-JEN Clinic Delivery Room 1" 
                    className="focus-visible:ring-rose-500" 
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="birth_attendant" className="text-gray-700 font-semibold">Designated Birth Companion / Attendant</Label>
                  <p className="text-xs text-gray-500 italic mb-2">Sino ang isasama sa loob ng delivery room?</p>
                  <Input 
                    id="birth_attendant" 
                    name="birth_attendant" 
                    defaultValue={birthPlan?.birth_attendant || ''} 
                    placeholder="e.g. Husband (Juan Santos)" 
                    className="focus-visible:ring-rose-500" 
                  />
                </div>
                
                <div className="pt-6 border-t border-gray-100">
                  <Button type="submit" className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-full px-8">Save Birth Plan</Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

      </Tabs>
    </div>
  );
}
