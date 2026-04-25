'use client';

import { useState, useTransition } from 'react';
import { Save, Loader2, History, Stethoscope, Baby, ClipboardList, Pencil, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';

const RECORD_MODULES = [
  { id: 'health_history',  label: 'Health History',      icon: History,       desc: 'Allergies, Asthma, Hypertension, Diabetes, etc.' },
  { id: 'ob_history',      label: 'Obstetrical History', icon: Baby,          desc: 'G_ P_ (L-P-A-L), LMP, EDC by LMP/UTZ.' },
  { id: 'physical_exam',   label: 'Physical Exam',       icon: Stethoscope,   desc: 'Skin, Conjunctiva, Breast, Abdomen, Extremities.' },
  { id: 'lab_results',     label: 'Laboratory Tests',    icon: ClipboardList, desc: 'CBC (Hgb, Hct), Urinalysis, HbsAg, VDRL, HIV.' },
];

export function ModularRecordEditor({ patientId, initialModularData, updateModularData }) {
  const [activeModule, setActiveModule] = useState(RECORD_MODULES[0].id);
  const [editing, setEditing] = useState(false);
  const [isPending, startTransition] = useTransition();

  const handleSave = (e) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    startTransition(async () => {
      await updateModularData(formData);
      setEditing(false);
    });
  };

  return (
    <div className="grid lg:grid-cols-4 gap-6">
      {/* Module Navigation */}
      <div className="lg:col-span-1 space-y-2">
        {RECORD_MODULES.map((mod) => (
          <button
            key={mod.id}
            onClick={() => { setActiveModule(mod.id); setEditing(false); }}
            className={`w-full flex items-center gap-3 p-4 rounded-2xl border transition-all text-left ${
              activeModule === mod.id
                ? 'bg-rose-500 border-rose-600 text-white shadow-lg shadow-rose-200'
                : 'bg-white border-gray-100 text-gray-500 hover:bg-rose-50 hover:text-rose-600'
            }`}
          >
            <mod.icon className="w-5 h-5 flex-shrink-0" />
            <div className="min-w-0">
              <p className="font-bold text-sm tracking-tight truncate">{mod.label}</p>
              {activeModule === mod.id && (
                <p className="text-[10px] font-medium text-rose-100 uppercase tracking-widest mt-0.5">Active</p>
              )}
            </div>
          </button>
        ))}
      </div>

      {/* Module Content */}
      <div className="lg:col-span-3">
        {RECORD_MODULES.map((mod) => {
          if (activeModule !== mod.id) return null;
          const moduleData = initialModularData?.[mod.id] || {};
          const hasContent = !!moduleData.content;

          return (
            <div key={mod.id} className="bg-white rounded-3xl border border-gray-100 shadow-xl shadow-gray-200/20 overflow-hidden animate-in fade-in slide-in-from-right-4 duration-300">
              {/* Header */}
              <div className="p-8 border-b border-gray-50 bg-gray-50/30 flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <div className="p-2 bg-rose-500 rounded-xl text-white"><mod.icon className="w-5 h-5" /></div>
                    <h3 className="text-xl font-black text-gray-900 tracking-tight">{mod.label}</h3>
                  </div>
                  <p className="text-sm font-medium text-gray-400">{mod.desc}</p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setEditing(!editing)}
                  className={`gap-2 ${editing ? 'border-rose-300 text-rose-600' : 'hover:border-emerald-300 hover:text-emerald-700'}`}
                >
                  {editing ? <><Eye className="w-3.5 h-3.5" /> View</> : <><Pencil className="w-3.5 h-3.5" /> Edit</>}
                </Button>
              </div>

              {/* View Mode */}
              {!editing && (
                <div className="p-8">
                  {hasContent ? (
                    <div className="space-y-4">
                      <div className="prose prose-sm max-w-none">
                        <pre className="whitespace-pre-wrap font-sans text-sm text-gray-700 leading-relaxed bg-gray-50 rounded-2xl p-6 border border-gray-100">
                          {moduleData.content}
                        </pre>
                      </div>
                      <p className="text-[10px] font-black text-gray-300 uppercase tracking-widest">
                        Last saved: {moduleData.updated_at ? new Date(moduleData.updated_at).toLocaleString() : 'Unknown'}
                      </p>
                    </div>
                  ) : (
                    <div className="py-16 text-center">
                      <mod.icon className="w-12 h-12 text-gray-100 mx-auto mb-4" />
                      <p className="text-gray-400 font-medium">No {mod.label.toLowerCase()} recorded yet.</p>
                      <Button type="button" onClick={() => setEditing(true)} variant="outline" size="sm" className="mt-4 gap-2">
                        <Pencil className="w-3.5 h-3.5" /> Add Record
                      </Button>
                    </div>
                  )}
                </div>
              )}

              {/* Edit Mode */}
              {editing && (
                <form onSubmit={handleSave} className="p-8 space-y-6">
                  <input type="hidden" name="patient_id" value={patientId} />
                  <input type="hidden" name="module_id" value={mod.id} />
                  <textarea
                    id={`content-${mod.id}`}
                    name="content"
                    defaultValue={moduleData.content || ''}
                    rows={12}
                    className="w-full bg-gray-50 border border-gray-200 rounded-2xl p-6 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 focus:bg-white transition-all leading-relaxed"
                    placeholder={`Start typing ${mod.label.toLowerCase()} details here...`}
                  />
                  <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100">
                    <Button type="button" variant="ghost" size="sm" onClick={() => setEditing(false)}>Cancel</Button>
                    <Button
                      type="submit"
                      disabled={isPending}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl h-12 px-8 font-black gap-2"
                    >
                      {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                      Save {mod.label}
                    </Button>
                  </div>
                </form>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
