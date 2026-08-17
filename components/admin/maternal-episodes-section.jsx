'use client';

import { useState, useTransition } from 'react';
import { Baby, Calendar, Plus, Pencil, CheckCircle2, History, AlertCircle, Save, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { createMaternalEpisode, updateMaternalEpisode } from '@/app/actions';

export function MaternalEpisodesSection({ patientId, episodes = [] }) {
  const [selectedEpisodeId, setSelectedEpisodeId] = useState(() => {
    const active = episodes.find(e => e.status === 'Active');
    return active ? active.id : (episodes[0]?.id || 'none');
  });
  const [isCreating, setIsCreating] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState(null);

  const currentEpisode = episodes.find(e => e.id === selectedEpisodeId) || episodes[0] || null;

  // Compute gestational age & EDC display for current episode
  let gestationalAge = null;
  let edcDisplay = null;
  if (currentEpisode?.lmp) {
    const lmpDate = new Date(currentEpisode.lmp);
    const diffDays = Math.floor((Date.now() - lmpDate.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays >= 0) {
      const weeks = Math.floor(diffDays / 7);
      const days = diffDays % 7;
      gestationalAge = `${weeks}w + ${days}d`;
    }
    const edcDate = currentEpisode.edc 
      ? new Date(currentEpisode.edc) 
      : new Date(lmpDate.getTime() + 280 * 24 * 60 * 60 * 1000);
    edcDisplay = edcDate.toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' });
  }

  const handleCreate = (e) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      const res = await createMaternalEpisode(fd);
      if (res?.success === false) {
        setError(res.error);
      } else {
        setIsCreating(false);
        setError(null);
      }
    });
  };

  const handleUpdate = (e) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      const res = await updateMaternalEpisode(fd);
      if (res?.success === false) {
        setError(res.error);
      } else {
        setIsEditing(false);
        setError(null);
      }
    });
  };

  return (
    <div className="bg-white border border-rose-100 rounded-3xl p-6 shadow-sm mb-6 space-y-6">
      {/* Header & Episode Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-100 pb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-500 shadow-sm">
            <Baby className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-gray-900 text-base">Maternal Episodes (Pregnancies)</h3>
            <p className="text-xs text-gray-500">Track current and previous pregnancy records for this patient.</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {episodes.length > 0 && (
            <select
              value={selectedEpisodeId}
              onChange={(e) => {
                setSelectedEpisodeId(e.target.value);
                setIsEditing(false);
                setIsCreating(false);
              }}
              className="h-10 rounded-xl border border-gray-200 bg-white px-3 text-xs font-bold text-gray-700 focus:outline-none focus:ring-2 focus:ring-rose-500/20"
            >
              {episodes.map((ep, idx) => (
                <option key={ep.id} value={ep.id}>
                  {ep.status === 'Active' ? '🟢 Active: ' : '⚪ Past: '} 
                  {ep.lmp ? `LMP ${new Date(ep.lmp).toLocaleDateString()}` : `Pregnancy #${episodes.length - idx}`}
                  {ep.status ? ` (${ep.status})` : ''}
                </option>
              ))}
            </select>
          )}

          {!isCreating && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                setIsCreating(true);
                setIsEditing(false);
              }}
              className="rounded-xl border-rose-200 text-rose-600 hover:bg-rose-50 text-xs font-bold gap-1.5 h-10"
            >
              <Plus className="w-3.5 h-3.5" /> New Pregnancy
            </Button>
          )}
        </div>
      </div>

      {error && (
        <div className="bg-red-50 text-red-600 text-xs font-bold p-3 rounded-xl border border-red-100 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          {error}
        </div>
      )}

      {/* Form: Create New Episode */}
      {isCreating && (
        <form onSubmit={handleCreate} className="bg-rose-50/50 border border-rose-100 rounded-2xl p-5 space-y-4">
          <input type="hidden" name="patient_id" value={patientId} />
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-black text-rose-700 uppercase tracking-widest">Start New Maternal Episode</h4>
            <Button type="button" variant="ghost" size="sm" onClick={() => setIsCreating(false)} className="h-7 w-7 p-0 text-gray-400">
              <X className="w-4 h-4" />
            </Button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
            <div className="space-y-1">
              <Label className="text-xs font-bold text-gray-600">LMP (Last Menstrual Period)</Label>
              <Input name="lmp" type="date" className="h-9 bg-white" required />
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-bold text-gray-600">Gravida (Total Pregnancies)</Label>
              <Input name="gravida" type="number" min="1" defaultValue="1" className="h-9 bg-white" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-bold text-gray-600">Para (Deliveries)</Label>
              <Input name="para" type="number" min="0" defaultValue="0" className="h-9 bg-white" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-bold text-gray-600">Episode Status</Label>
              <select name="status" defaultValue="Active" className="w-full h-9 rounded-md border border-input bg-white px-3 text-xs font-bold focus:outline-none">
                <option value="Active">Active</option>
                <option value="Delivered">Delivered</option>
                <option value="Archived">Archived</option>
              </select>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" size="sm" onClick={() => setIsCreating(false)} className="text-xs font-semibold">
              Cancel
            </Button>
            <Button type="submit" disabled={isPending} size="sm" className="bg-rose-500 hover:bg-rose-600 text-white text-xs font-bold px-5">
              {isPending ? 'Saving...' : 'Create Episode'}
            </Button>
          </div>
        </form>
      )}

      {/* Form: Edit Selected Episode */}
      {isEditing && currentEpisode && (
        <form onSubmit={handleUpdate} className="bg-amber-50/40 border border-amber-200 rounded-2xl p-5 space-y-4">
          <input type="hidden" name="id" value={currentEpisode.id} />
          <input type="hidden" name="patient_id" value={patientId} />
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-black text-amber-800 uppercase tracking-widest">Edit Maternal Episode Details</h4>
            <Button type="button" variant="ghost" size="sm" onClick={() => setIsEditing(false)} className="h-7 w-7 p-0 text-gray-400">
              <X className="w-4 h-4" />
            </Button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
            <div className="space-y-1">
              <Label className="text-xs font-bold text-gray-600">LMP</Label>
              <Input name="lmp" type="date" defaultValue={currentEpisode.lmp || ''} className="h-9 bg-white" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-bold text-gray-600">Gravida</Label>
              <Input name="gravida" type="number" min="1" defaultValue={currentEpisode.gravida || ''} className="h-9 bg-white" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-bold text-gray-600">Para</Label>
              <Input name="para" type="number" min="0" defaultValue={currentEpisode.para ?? ''} className="h-9 bg-white" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-bold text-gray-600">Status</Label>
              <select name="status" defaultValue={currentEpisode.status || 'Active'} className="w-full h-9 rounded-md border border-input bg-white px-3 text-xs font-bold focus:outline-none">
                <option value="Active">Active</option>
                <option value="Delivered">Delivered</option>
                <option value="Archived">Archived</option>
              </select>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" size="sm" onClick={() => setIsEditing(false)} className="text-xs font-semibold">
              Cancel
            </Button>
            <Button type="submit" disabled={isPending} size="sm" className="bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold px-5">
              {isPending ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </form>
      )}

      {/* Episode Summary Display */}
      {!isCreating && !isEditing && currentEpisode ? (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="bg-rose-50/70 border border-rose-100 rounded-2xl p-4 text-center">
            <p className="text-[10px] font-black text-rose-400 uppercase tracking-widest mb-1">Gestational Age</p>
            <p className="text-xl font-black text-rose-700">{gestationalAge || '—'}</p>
            <p className="text-[10px] text-gray-500 mt-1">LMP: {currentEpisode.lmp ? new Date(currentEpisode.lmp).toLocaleDateString() : 'Not set'}</p>
          </div>

          <div className="bg-emerald-50/70 border border-emerald-100 rounded-2xl p-4 text-center">
            <p className="text-[10px] font-black text-emerald-500 uppercase tracking-widest mb-1">Estimated Due Date</p>
            <p className="text-lg font-black text-emerald-700">{edcDisplay || '—'}</p>
            <p className="text-[10px] text-gray-500 mt-1">EDC / EDD (+280d)</p>
          </div>

          <div className="bg-violet-50/70 border border-violet-100 rounded-2xl p-4 text-center">
            <p className="text-[10px] font-black text-violet-400 uppercase tracking-widest mb-1">Obstetric Score</p>
            <p className="text-lg font-black text-violet-700">
              G{currentEpisode.gravida || 1} P{currentEpisode.para ?? 0}
            </p>
            <p className="text-[10px] text-gray-500 mt-1">Gravida & Para</p>
          </div>

          <div className="bg-gray-50 border border-gray-100 rounded-2xl p-4 flex flex-col items-center justify-center text-center">
            <span className={`text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider mb-2 ${
              currentEpisode.status === 'Active' 
                ? 'bg-emerald-100 text-emerald-700' 
                : currentEpisode.status === 'Delivered'
                ? 'bg-blue-100 text-blue-700'
                : 'bg-gray-200 text-gray-700'
            }`}>
              {currentEpisode.status || 'Active'}
            </span>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setIsEditing(true)}
              className="text-xs text-gray-500 hover:text-gray-900 gap-1 h-7"
            >
              <Pencil className="w-3 h-3" /> Edit Details
            </Button>
          </div>
        </div>
      ) : !isCreating && !isEditing ? (
        <div className="text-center py-8 bg-gray-50/60 rounded-2xl border border-dashed border-gray-200">
          <Baby className="w-8 h-8 text-gray-300 mx-auto mb-2" />
          <p className="text-xs font-medium text-gray-500">No active maternal episode recorded for this patient.</p>
          <Button
            type="button"
            variant="link"
            size="sm"
            onClick={() => setIsCreating(true)}
            className="text-xs font-bold text-rose-600 mt-1"
          >
            + Create First Pregnancy Record
          </Button>
        </div>
      ) : null}
    </div>
  );
}
