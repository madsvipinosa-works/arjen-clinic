'use client';

import { useState, useTransition } from 'react';
import { Pencil, Trash2, Save, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { updateVisitLog, deleteVisitLog } from '@/app/actions';

export function VisitLogCard({ log, patientId }) {
  const [editing, setEditing] = useState(false);
  const [isPending, startTransition] = useTransition();

  const handleDelete = () => {
    if (!window.confirm('Delete this visit log? This cannot be undone.')) return;
    const fd = new FormData();
    fd.append('id', log.id);
    fd.append('patient_id', patientId);
    startTransition(() => deleteVisitLog(fd));
  };

  if (editing) {
    return (
      <form
        onSubmit={(e) => {
          e.preventDefault();
          const fd = new FormData(e.currentTarget);
          startTransition(async () => {
            await updateVisitLog(fd);
            setEditing(false);
          });
        }}
        className="p-4 bg-white border-2 border-emerald-200 rounded-xl shadow-sm space-y-4"
      >
        <input type="hidden" name="id" value={log.id} />
        <input type="hidden" name="patient_id" value={patientId} />
        
        {/* Edit Row 1 */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="space-y-1">
            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Date</label>
            <Input name="visit_date" type="date" defaultValue={log.visit_date} required className="h-9 focus-visible:ring-emerald-500" />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">AOG by LMP</label>
            <Input name="aog_by_lmp" defaultValue={log.aog_by_lmp} placeholder="e.g. 28 2/7" className="h-9 focus-visible:ring-emerald-500" />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">AOG by UTZ</label>
            <Input name="aog_by_utz" defaultValue={log.aog_by_utz} placeholder="e.g. 28 3/7" className="h-9 focus-visible:ring-emerald-500" />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">BP</label>
            <Input name="bp" defaultValue={log.bp} placeholder="120/80" className="h-9 focus-visible:ring-emerald-500" required />
          </div>
        </div>

        {/* Edit Row 2 */}
        <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
          <div className="space-y-1">
            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Temp</label>
            <Input name="temp" defaultValue={log.temp} placeholder="36.5°C" className="h-9 focus-visible:ring-emerald-500" />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">PR</label>
            <Input name="pr" defaultValue={log.pr} placeholder="80" className="h-9 focus-visible:ring-emerald-500" />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">RR</label>
            <Input name="rr" defaultValue={log.rr} placeholder="18" className="h-9 focus-visible:ring-emerald-500" />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Wt (kg)</label>
            <Input name="weight" defaultValue={log.weight} placeholder="62" className="h-9 focus-visible:ring-emerald-500" required />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">FH (cm)</label>
            <Input name="fh" defaultValue={log.fh} placeholder="28" className="h-9 focus-visible:ring-emerald-500" />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">FHT</label>
            <Input name="fht" defaultValue={log.fht} placeholder="140" className="h-9 focus-visible:ring-emerald-500" />
          </div>
        </div>

        {/* Edit Row 3 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="space-y-1">
            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">IE</label>
            <Input name="ie" defaultValue={log.ie} placeholder="Internal Examination findings" className="h-9 focus-visible:ring-emerald-500" />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Next Visit</label>
            <Input name="next_visit" type="date" defaultValue={log.next_visit} className="h-9 focus-visible:ring-emerald-500" />
          </div>
        </div>

        <div className="space-y-1">
          <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Clinical Notes</label>
          <textarea name="doctor_notes" defaultValue={log.doctor_notes} rows={3}
            className="w-full rounded-md border border-input bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500"
            required
          />
        </div>
        <div className="flex gap-2 justify-end">
          <Button type="button" variant="ghost" size="sm" onClick={() => setEditing(false)} className="gap-1">
            <X className="w-3.5 h-3.5" /> Cancel
          </Button>
          <Button type="submit" size="sm" disabled={isPending} className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1">
            <Save className="w-3.5 h-3.5" /> Save Changes
          </Button>
        </div>
      </form>
    );
  }

  return (
    <div className="flex flex-col gap-4 p-5 bg-white border border-gray-100 rounded-2xl shadow-sm hover:border-emerald-100 transition-all group">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <span className="bg-emerald-50 text-emerald-700 text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-widest border border-emerald-100">
            {new Date(log.visit_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
          </span>
          {log.next_visit && (
            <span className="bg-amber-50 text-amber-700 text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-widest border border-amber-100">
              Next: {new Date(log.next_visit).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
            </span>
          )}
        </div>
        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button type="button" variant="ghost" size="sm" onClick={() => setEditing(true)}
            className="h-8 w-8 p-0 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50">
            <Pencil className="w-3.5 h-3.5" />
          </Button>
          <Button type="button" variant="ghost" size="sm" onClick={handleDelete} disabled={isPending}
            className="h-8 w-8 p-0 text-gray-400 hover:text-red-500 hover:bg-red-50">
            <Trash2 className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
        {log.aog_by_lmp && (
          <div className="p-2 bg-gray-50 rounded-lg border border-gray-100">
            <p className="text-[9px] font-black text-gray-400 uppercase tracking-tighter">AOG (LMP)</p>
            <p className="text-xs font-bold text-gray-700">{log.aog_by_lmp}</p>
          </div>
        )}
        {log.aog_by_utz && (
          <div className="p-2 bg-gray-50 rounded-lg border border-gray-100">
            <p className="text-[9px] font-black text-gray-400 uppercase tracking-tighter">AOG (UTZ)</p>
            <p className="text-xs font-bold text-gray-700">{log.aog_by_utz}</p>
          </div>
        )}
        <div className="p-2 bg-gray-50 rounded-lg border border-gray-100">
          <p className="text-[9px] font-black text-gray-400 uppercase tracking-tighter">BP / Weight</p>
          <p className="text-xs font-bold text-gray-700">{log.bp} • {log.weight}kg</p>
        </div>
        {(log.temp || log.pr || log.rr) && (
          <div className="p-2 bg-gray-50 rounded-lg border border-gray-100">
            <p className="text-[9px] font-black text-gray-400 uppercase tracking-tighter">Vitals</p>
            <p className="text-xs font-bold text-gray-700">
              {log.temp && `${log.temp}° `}
              {log.pr && `PR:${log.pr} `}
              {log.rr && `RR:${log.rr}`}
            </p>
          </div>
        )}
        {(log.fh || log.fht) && (
          <div className="p-2 bg-gray-50 rounded-lg border border-gray-100">
            <p className="text-[9px] font-black text-gray-400 uppercase tracking-tighter">Fetal</p>
            <p className="text-xs font-bold text-gray-700">
              {log.fh && `FH:${log.fh}cm `}
              {log.fht && `FHT:${log.fht}`}
            </p>
          </div>
        )}
      </div>

      {log.ie && (
        <div className="px-3 py-2 bg-emerald-50/30 rounded-lg border border-emerald-100/50">
          <p className="text-[9px] font-black text-emerald-600 uppercase tracking-widest mb-1">IE Findings</p>
          <p className="text-xs font-medium text-gray-700 italic">"{log.ie}"</p>
        </div>
      )}

      <div>
        <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">Observations & Notes</p>
        <p className="text-sm text-gray-800 leading-relaxed">{log.doctor_notes}</p>
      </div>
    </div>
  );
}
