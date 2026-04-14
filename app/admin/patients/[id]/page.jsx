// app/admin/patients/[id]/page.jsx
// This is the DYNAMIC patient detail page.
// Next.js will read the [id] segment from the URL, e.g. /admin/patients/3 → id = "3"

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

// ─── Placeholder patient detail data ─────────────────────────────────────────
// In a real app we would call: supabase.from('patients').select('*').eq('id', id)
const PLACEHOLDER_PATIENT = {
  id: '1',
  name: 'Maria Santos',
  age: 28,
  address: 'Brgy. San Roque, Zamboanga City',
  contact: '0917-123-4567',
  bloodType: 'O+',
  gravida: 2,
  para: 1,
  lmp: '2024-09-10',
  edd: '2025-06-17',
  aog: '20 weeks',
};

// ─── Page component ───────────────────────────────────────────────────────────
// `params` is automatically provided by Next.js; it contains { id: "..." }
export default function PatientDetailPage({ params }) {
  const patient = PLACEHOLDER_PATIENT; // TODO: fetch real patient by params.id

  return (
    <div>
      {/* Patient name header */}
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-800">{patient.name}</h2>
        <p className="text-sm text-gray-500 mt-1">
          Patient ID: {params.id} · {patient.address}
        </p>
      </div>

      {/* ─── Tabs: three sections of the patient record ─── */}
      <Tabs defaultValue="prenatal" className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="prenatal">Prenatal Record</TabsTrigger>
          <TabsTrigger value="birthplan">Birth Plan</TabsTrigger>
          <TabsTrigger value="visitlogs">Visit Logs</TabsTrigger>
        </TabsList>

        {/* ─── TAB 1: Prenatal Record ───────────────────────── */}
        <TabsContent value="prenatal">
          <Card>
            <CardHeader>
              <CardTitle>Prenatal Record</CardTitle>
              <CardDescription>
                Basic obstetric information for this pregnancy.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {/* Simple two-column grid of fields */}
              <div className="grid grid-cols-2 gap-4 text-sm">
                <InfoRow label="Age" value={patient.age} />
                <InfoRow label="Blood Type" value={patient.bloodType} />
                <InfoRow label="Gravida" value={patient.gravida} />
                <InfoRow label="Para" value={patient.para} />
                <InfoRow label="Last Menstrual Period (LMP)" value={patient.lmp} />
                <InfoRow label="Estimated Date of Delivery (EDD)" value={patient.edd} />
                <InfoRow label="Age of Gestation (AOG)" value={patient.aog} />
                <InfoRow label="Contact Number" value={patient.contact} />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ─── TAB 2: Birth Plan (Bilingual Layout) ────────── */}
        <TabsContent value="birthplan">
          <Card>
            <CardHeader>
              <CardTitle>Birth Plan</CardTitle>
              <CardDescription>
                Ang plano sa panganganak / Delivery preferences of the patient.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              {/*
               * Each BilingualField shows:
               *   - English label (bold)
               *   - Tagalog question in smaller gray text below
               *   - The patient's answer
               */}
              <BilingualField
                english="Delivery Location"
                tagalog="Ako ay manganganak sa:"
                value="AR-JEN Lying-in Clinic"
              />
              <BilingualField
                english="Birth Companion"
                tagalog="Ang aking kasama sa panganganak ay:"
                value="Husband — Juan Santos"
              />
              <BilingualField
                english="Preferred Delivery Position"
                tagalog="Ang posisyon na gusto ko sa panganganak ay:"
                value="Semi-recumbent"
              />
              <BilingualField
                english="Pain Relief Preference"
                tagalog="Para sa sakit, gusto ko ng:"
                value="Breathing techniques / Lamaze"
              />
              <BilingualField
                english="Cord Clamping"
                tagalog="Para sa pusod ng sanggol:"
                value="Delayed cord clamping preferred"
              />
              <BilingualField
                english="Breastfeeding Plan"
                tagalog="Plano ko sa pagpapasuso:"
                value="Immediate breastfeeding after birth"
              />
              <BilingualField
                english="Emergency Contact"
                tagalog="Makikipag-ugnayan sa:"
                value="Juan Santos — 0917-987-6543"
              />
            </CardContent>
          </Card>
        </TabsContent>

        {/* ─── TAB 3: Visit Logs ────────────────────────────── */}
        <TabsContent value="visitlogs">
          <Card>
            <CardHeader>
              <CardTitle>Visit Logs</CardTitle>
              <CardDescription>
                History of prenatal check-up visits.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {/* Placeholder visit log entries */}
              <div className="space-y-3">
                {PLACEHOLDER_VISIT_LOGS.map((log) => (
                  <VisitLogRow key={log.id} log={log} />
                ))}
              </div>

              {/* TODO: Replace with a form that calls the createVisitLog server action */}
              <p className="text-xs text-gray-400 mt-6">
                * Add new visit logs using the form below (coming soon).
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ─── Helper: key-value row for prenatal fields ────────────────────────────────
function InfoRow({ label, value }) {
  return (
    <div className="py-2 border-b border-gray-100">
      <p className="text-gray-500 text-xs uppercase tracking-wide">{label}</p>
      <p className="font-semibold text-gray-800 mt-0.5">{value}</p>
    </div>
  );
}

// ─── Helper: bilingual Birth Plan field ───────────────────────────────────────
// Shows the English label, the Tagalog question in gray, then the answer.
function BilingualField({ english, tagalog, value }) {
  return (
    <div className="border-b border-gray-100 pb-4 last:border-0">
      <p className="font-semibold text-gray-800">{english}</p>
      <p className="text-xs text-gray-400 italic mt-0.5">{tagalog}</p>
      <p className="text-sm text-gray-700 mt-1">{value}</p>
    </div>
  );
}

// ─── Helper: single visit log row ─────────────────────────────────────────────
function VisitLogRow({ log }) {
  return (
    <div className="flex items-start gap-4 p-3 bg-gray-50 rounded-md">
      <div className="text-xs text-gray-400 w-24 shrink-0">{log.date}</div>
      <div>
        <p className="text-sm font-medium text-gray-700">{log.notes}</p>
        <p className="text-xs text-gray-400 mt-0.5">BP: {log.bp} · Weight: {log.weight}</p>
      </div>
    </div>
  );
}

// ─── Placeholder visit log data ───────────────────────────────────────────────
const PLACEHOLDER_VISIT_LOGS = [
  {
    id: '1',
    date: '2025-01-15',
    notes: 'First prenatal check-up. Normal findings.',
    bp: '110/70',
    weight: '55 kg',
  },
  {
    id: '2',
    date: '2025-02-12',
    notes: 'AOG 24 weeks. FHT audible. Patient counselled on diet.',
    bp: '112/72',
    weight: '58 kg',
  },
  {
    id: '3',
    date: '2025-03-10',
    notes: 'AOG 28 weeks. Fundic height 26 cm. Iron supplements given.',
    bp: '115/75',
    weight: '60 kg',
  },
];
