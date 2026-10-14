"use client";

import { useState } from "react";
import { Plus, Trash2, LayoutGrid, Save, Loader2, Check, AlertTriangle, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function ServiceManager({ initialServices, updateServices }) {
  const [services, setServices] = useState(initialServices || []);
  const [isPending, setIsPending] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  const addService = () => {
    const newService = {
      id: `svc_${Date.now()}`,
      label: "New Service",
      desc: "Service description and clinical care details..."
    };
    setServices([...services, newService]);
  };

  const updateService = (id, field, value) => {
    setServices(services.map(s => s.id === id ? { ...s, [field]: value } : s));
  };

  const confirmDelete = (id) => {
    setServices(services.filter(s => s.id !== id));
    setDeletingId(null);
  };

  const handleSave = async () => {
    setIsPending(true);
    setIsSaved(false);
    try {
      await updateServices(services);
      setIsSaved(true);
      setTimeout(() => setIsSaved(false), 3000);
    } finally {
      setIsPending(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-rose-100 shadow-xl shadow-rose-950/5 overflow-hidden transition-all duration-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between px-6 py-5 border-b border-rose-100 bg-gradient-to-r from-rose-50/70 via-white to-rose-50/30 gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-gradient-to-tr from-rose-600 to-rose-500 text-white rounded-xl shadow-md shadow-rose-500/20">
            <LayoutGrid className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <h2 className="font-bold text-gray-900 text-lg">Clinic Services Directory</h2>
              <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-rose-100 text-rose-800 border border-rose-200/60">
                {services.length} {services.length === 1 ? "Service" : "Services"} Active
              </span>
            </div>
            <p className="text-xs text-gray-500 mt-0.5">
              Manage clinical procedures and lying-in maternal care services displayed across the portal.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {isSaved && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-700 text-xs font-bold border border-emerald-200 animate-in fade-in zoom-in-95 duration-200">
              <Check className="w-3.5 h-3.5" />
              Saved
            </span>
          )}
          <Button 
            onClick={handleSave} 
            disabled={isPending}
            className="bg-rose-600 hover:bg-rose-700 text-white rounded-xl h-10 px-5 font-bold gap-2 shadow-sm transition-all duration-200 cursor-pointer"
          >
            {isPending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            Save Services
          </Button>
        </div>
      </div>

      {/* Services List */}
      <div className="p-6 space-y-4">
        {services.length === 0 ? (
          <div className="p-8 text-center rounded-2xl border-2 border-dashed border-rose-200/80 bg-rose-50/20">
            <Sparkles className="w-8 h-8 text-rose-400 mx-auto mb-2 opacity-70" />
            <h4 className="text-sm font-bold text-gray-800">No Services Configured</h4>
            <p className="text-xs text-gray-500 mt-1 max-w-sm mx-auto">
              Add your clinical lying-in services, prenatal packages, newborn screening, or postpartum consultations.
            </p>
          </div>
        ) : (
          services.map((svc, index) => (
            <div 
              key={svc.id} 
              className="flex flex-col sm:flex-row gap-4 p-4 bg-gray-50/80 hover:bg-white border border-gray-100 hover:border-rose-200 rounded-2xl group relative transition-all duration-200 hover:shadow-md"
            >
              {/* Order Indicator */}
              <div className="hidden sm:flex items-center justify-center w-8 text-xs font-black text-gray-400 group-hover:text-rose-500">
                #{index + 1}
              </div>

              {/* Input Fields */}
              <div className="flex-1 space-y-3">
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <Label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">
                      Service Title
                    </Label>
                    <span className="text-[10px] text-gray-400 font-mono">
                      {svc.label?.length || 0}/80
                    </span>
                  </div>
                  <Input 
                    value={svc.label || ""} 
                    maxLength={80}
                    onChange={(e) => updateService(svc.id, 'label', e.target.value)}
                    placeholder="e.g. Comprehensive Prenatal Check-up"
                    className="h-10 bg-white border-gray-200 focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20 rounded-xl text-sm font-semibold text-gray-900"
                  />
                </div>
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <Label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">
                      Clinical Description / Inclusions
                    </Label>
                    <span className="text-[10px] text-gray-400 font-mono">
                      {svc.desc?.length || 0}/200
                    </span>
                  </div>
                  <Input 
                    value={svc.desc || ""} 
                    maxLength={200}
                    onChange={(e) => updateService(svc.id, 'desc', e.target.value)}
                    placeholder="e.g. Includes fetal heart tone listening, vitals evaluation, and obstetrical guidance."
                    className="h-10 bg-white border-gray-200 focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20 rounded-xl text-xs text-gray-700"
                  />
                </div>
              </div>

              {/* Action / Safe Deletion Confirmation */}
              <div className="flex items-end justify-end shrink-0 pt-2 sm:pt-0">
                {deletingId === svc.id ? (
                  <div className="flex items-center gap-2 p-2 bg-rose-50 border border-rose-200 rounded-xl animate-in fade-in duration-150">
                    <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                    <span className="text-xs font-bold text-rose-900">Delete service?</span>
                    <Button 
                      size="sm"
                      variant="destructive"
                      onClick={() => confirmDelete(svc.id)}
                      className="h-7 px-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold cursor-pointer"
                    >
                      Confirm
                    </Button>
                    <Button 
                      size="sm"
                      variant="outline"
                      onClick={() => setDeletingId(null)}
                      className="h-7 px-2.5 rounded-lg text-xs font-medium cursor-pointer"
                    >
                      Cancel
                    </Button>
                  </div>
                ) : (
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => setDeletingId(svc.id)}
                    title="Remove service"
                    className="h-10 w-10 p-0 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                )}
              </div>
            </div>
          ))
        )}

        {/* Add Service Button */}
        <Button 
          onClick={addService} 
          variant="outline" 
          className="w-full h-13 border-dashed border-2 border-rose-200/80 hover:border-rose-500 hover:bg-rose-50/60 text-gray-500 hover:text-rose-700 rounded-2xl font-bold gap-2 transition-all duration-200 cursor-pointer shadow-xs"
        >
          <Plus className="w-4 h-4 text-rose-500" />
          Add New Clinical Service
        </Button>
      </div>
    </div>
  );
}
