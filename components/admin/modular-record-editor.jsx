"use client";

import { useState, useTransition } from "react";
import { Save, Loader2, History, Stethoscope, Baby, ClipboardList } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

// Define the core modules for the AR-JEN Clinic
const RECORD_MODULES = [
  { id: "health_history",   label: "Health History",      icon: History,       desc: "Allergies, Asthma, Hypertension, Diabetes, etc." },
  { id: "ob_history",       label: "Obstetrical History", icon: Baby,          desc: "G_ P_ (L-P-A-L), LMP, EDC by LMP/UTZ." },
  { id: "physical_exam",    label: "Physical Exam",       icon: Stethoscope,   desc: "Skin, Conjunctiva, Breast, Abdomen, Extremities." },
  { id: "lab_results",      label: "Laboratory Tests",    icon: ClipboardList, desc: "CBC (Hgb, Hct), Urinalysis, HbsAg, VDRL, HIV." },
];

export function ModularRecordEditor({ patientId, initialModularData, updateModularData }) {
  const [activeModule, setActiveModule] = useState(RECORD_MODULES[0].id);
  const [isPending, startTransition] = useTransition();

  const handleSave = (e) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    startTransition(async () => {
      await updateModularData(formData);
    });
  };

  return (
    <div className="grid lg:grid-cols-4 gap-6">
      {/* Module Navigation */}
      <div className="lg:col-span-1 space-y-2">
        {RECORD_MODULES.map((mod) => (
          <button
            key={mod.id}
            onClick={() => setActiveModule(mod.id)}
            className={`w-full flex items-center gap-3 p-4 rounded-2xl border transition-all text-left ${
              activeModule === mod.id
                ? "bg-rose-500 border-rose-600 text-white shadow-lg shadow-rose-200"
                : "bg-white border-gray-100 text-gray-500 hover:bg-rose-50 hover:text-rose-600"
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

      {/* Module Editor Content */}
      <div className="lg:col-span-3">
        {RECORD_MODULES.map((mod) => {
          if (activeModule !== mod.id) return null;
          
          const moduleData = initialModularData?.[mod.id] || {};
          
          return (
            <div key={mod.id} className="bg-white rounded-3xl border border-gray-100 shadow-xl shadow-gray-200/20 overflow-hidden animate-in fade-in slide-in-from-right-4 duration-300">
              <div className="p-8 border-b border-gray-50 bg-gray-50/30">
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 bg-rose-500 rounded-xl text-white">
                    <mod.icon className="w-5 h-5" />
                  </div>
                  <h3 className="text-xl font-black text-gray-900 tracking-tight">{mod.label}</h3>
                </div>
                <p className="text-sm font-medium text-gray-400">{mod.desc}</p>
              </div>

              <form onSubmit={handleSave} className="p-8 space-y-6">
                <input type="hidden" name="patient_id" value={patientId} />
                <input type="hidden" name="module_id" value={mod.id} />
                
                <div className="space-y-3">
                  <Label htmlFor={`content-${mod.id}`} className="text-xs font-black text-gray-400 uppercase tracking-widest">
                    Detailed Clinical Documentation
                  </Label>
                  <textarea
                    id={`content-${mod.id}`}
                    name="content"
                    defaultValue={moduleData.content || ""}
                    rows={12}
                    className="w-full bg-gray-50 border border-gray-200 rounded-2xl p-6 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 focus:bg-white transition-all leading-relaxed scrollbar-thin scrollbar-thumb-rose-100"
                    placeholder={`Start typing ${mod.label.toLowerCase()} details here...`}
                  />
                </div>

                <div className="flex items-center justify-between pt-6 border-t border-gray-100">
                  <div className="text-[10px] font-black text-gray-300 uppercase tracking-widest">
                    {moduleData.updated_at ? `Last saved: ${new Date(moduleData.updated_at).toLocaleString()}` : "Never saved"}
                  </div>
                  <Button 
                    type="submit" 
                    disabled={isPending}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl h-12 px-8 font-black gap-2 shadow-lg shadow-emerald-100 transition-all active:scale-95"
                  >
                    {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    Save {mod.label}
                  </Button>
                </div>
              </form>
            </div>
          );
        })}
      </div>
    </div>
  );
}
