// app/admin/patients/[id]/postpartum/page.jsx
// Postpartum Care module — staff view for recording delivery details, baby vitals, and maternal recovery.

import { createClient } from '@/utils/supabase/server';
import { createPostpartumRecord, updatePostpartumRecord } from '../../../../actions';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Baby, Heart, CalendarDays, ArrowLeft, CheckCircle2 } from 'lucide-react';
import Link from 'next/link';

// ─── Server Component — data is fetched at render time ───────────────────────
export default async function PostpartumPage({ params }) {
  const { id } = await params;
  const supabase = await createClient();

  const [{ data: patient }, { data: record }] = await Promise.all([
    supabase.from('patients').select('id, full_name, lmp, edc').eq('id', id).single(),
    supabase.from('postpartum_records').select('*').eq('patient_id', id).order('created_at', { ascending: false }).limit(1).single(),
  ]);

  if (!patient) {
    return (
      <div className="flex h-64 items-center justify-center text-muted-foreground">
        Patient not found.
      </div>
    );
  }

  const isUpdate = !!record;
  const action = isUpdate ? updatePostpartumRecord : createPostpartumRecord;

  // Pre-fill values if a record already exists
  const v = record?.baby_vitals || {};

  return (
    <div className="max-w-4xl mx-auto space-y-6">

      {/* ── Breadcrumb ── */}
      <div className="flex items-center gap-3">
        <Link
          href={`/admin/patients/${id}`}
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to {patient.full_name}
        </Link>
      </div>

      {/* ── Page Header ── */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Baby className="h-6 w-6 text-primary" />
            Postpartum Care Record
          </h1>
          <p className="text-muted-foreground mt-1">
            {patient.full_name} — Record delivery, baby vitals, and maternal recovery.
          </p>
        </div>
        {isUpdate && (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-green-100 px-3 py-1 text-xs font-medium text-green-700">
            <CheckCircle2 className="h-3.5 w-3.5" />
            Record on file
          </span>
        )}
      </div>

      <form action={action}>
        {/* Hidden fields */}
        <input type="hidden" name="patient_id" value={id} />
        {isUpdate && <input type="hidden" name="id" value={record.id} />}

        <div className="grid gap-6">

          {/* ── Delivery Details Card ── */}
          <Card className="border-border shadow-sm">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2 text-base text-primary">
                <CalendarDays className="h-4 w-4" />
                Delivery Details
              </CardTitle>
              <CardDescription>
                Record the date, method, and feeding preference.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">

              <div className="space-y-1.5">
                <Label htmlFor="delivery_date">Delivery Date *</Label>
                <Input
                  id="delivery_date"
                  name="delivery_date"
                  type="date"
                  required
                  defaultValue={record?.delivery_date ?? ''}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="follow_up_date">Next Follow-up Date</Label>
                <Input
                  id="follow_up_date"
                  name="follow_up_date"
                  type="date"
                  defaultValue={record?.follow_up_date ?? ''}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="delivery_type">Delivery Type</Label>
                <select
                  id="delivery_type"
                  name="delivery_type"
                  defaultValue={record?.delivery_type ?? ''}
                  className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                >
                  <option value="">Select type…</option>
                  <option value="Vaginal">Vaginal</option>
                  <option value="Cesarean">Cesarean</option>
                  <option value="VBAC">VBAC</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="feeding_method">Feeding Method</Label>
                <select
                  id="feeding_method"
                  name="feeding_method"
                  defaultValue={record?.feeding_method ?? ''}
                  className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                >
                  <option value="">Select method…</option>
                  <option value="Breastfeeding">Breastfeeding</option>
                  <option value="Formula">Formula</option>
                  <option value="Mixed">Mixed</option>
                </select>
              </div>

            </CardContent>
          </Card>

          {/* ── Baby Vitals Card ── */}
          <Card className="border-border shadow-sm">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2 text-base text-primary">
                <Baby className="h-4 w-4" />
                Baby Vitals
              </CardTitle>
              <CardDescription>
                Record the newborn's measurements and Apgar score at birth.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">

              <div className="space-y-1.5">
                <Label htmlFor="baby_weight_kg">Birth Weight (kg)</Label>
                <Input
                  id="baby_weight_kg"
                  name="baby_weight_kg"
                  type="number"
                  step="0.001"
                  min="0"
                  placeholder="e.g. 3.200"
                  defaultValue={v.weight_kg ?? ''}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="baby_length_cm">Birth Length (cm)</Label>
                <Input
                  id="baby_length_cm"
                  name="baby_length_cm"
                  type="number"
                  step="0.1"
                  min="0"
                  placeholder="e.g. 50.0"
                  defaultValue={v.length_cm ?? ''}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="baby_apgar_score">Apgar Score</Label>
                <Input
                  id="baby_apgar_score"
                  name="baby_apgar_score"
                  type="text"
                  placeholder="e.g. 9/10"
                  defaultValue={v.apgar_score ?? ''}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="baby_gender">Baby&apos;s Sex</Label>
                <select
                  id="baby_gender"
                  name="baby_gender"
                  defaultValue={v.gender ?? ''}
                  className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                >
                  <option value="">Select…</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                </select>
              </div>

            </CardContent>
          </Card>

          {/* ── Maternal Recovery Card ── */}
          <Card className="border-border shadow-sm">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2 text-base text-primary">
                <Heart className="h-4 w-4" />
                Maternal Recovery Notes
              </CardTitle>
              <CardDescription>
                Document the mother&apos;s recovery status, any complications, or clinical observations.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <textarea
                id="maternal_recovery_notes"
                name="maternal_recovery_notes"
                rows={6}
                placeholder="Enter clinical notes on the mother's postpartum recovery, wound healing, mood, pain management, etc."
                defaultValue={record?.maternal_recovery_notes ?? ''}
                className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-none"
              />
            </CardContent>
          </Card>

          {/* ── Submit ── */}
          <div className="flex justify-end gap-3">
            <Link href={`/admin/patients/${id}`}>
              <Button type="button" variant="outline">
                Cancel
              </Button>
            </Link>
            <Button type="submit" className="bg-primary text-primary-foreground hover:bg-primary/90 min-w-[140px]">
              {isUpdate ? 'Update Record' : 'Save Record'}
            </Button>
          </div>

        </div>
      </form>

      {/* ── Existing Record Summary (read-only display) ── */}
      {isUpdate && (
        <Card className="border-dashed border-muted-foreground/30 bg-muted/40">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Last Saved Record — {new Date(record.created_at).toLocaleDateString('en-PH', { year: 'numeric', month: 'long', day: 'numeric' })}
            </CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground text-xs uppercase tracking-wide">Delivery</p>
              <p className="font-medium">{record.delivery_type || '—'}</p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs uppercase tracking-wide">Feeding</p>
              <p className="font-medium">{record.feeding_method || '—'}</p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs uppercase tracking-wide">Baby Weight</p>
              <p className="font-medium">{v.weight_kg ? `${v.weight_kg} kg` : '—'}</p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs uppercase tracking-wide">Apgar</p>
              <p className="font-medium">{v.apgar_score || '—'}</p>
            </div>
          </CardContent>
        </Card>
      )}

    </div>
  );
}
