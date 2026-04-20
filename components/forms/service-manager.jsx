"use client";

import { useState } from "react";
import { Plus, Trash2, LayoutGrid, Save, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function ServiceManager({ initialServices, updateServices }) {
  const [services, setServices] = useState(initialServices || []);
  const [isPending, setIsPending] = useState(false);

  const addService = () => {
    setServices([
      ...services,
      { id: `svc_${Date.now()}`, label: "New Service", desc: "Service description..." }
    ]);
  };

  const updateService = (id, field, value) => {
    setServices(services.map(s => s.id === id ? { ...s, [field]: value } : s));
  };

  const removeService = (id) => {
    setServices(services.filter(s => s.id !== id));
  };

  const handleSave = async () => {
    setIsPending(true);
    try {
      await updateServices(services);
    } finally {
      setIsPending(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-xl shadow-gray-200/30 overflow-hidden">
      <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100 bg-blue-50/40">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-500 rounded-xl shadow-md">
            <LayoutGrid className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="font-bold text-gray-900 text-lg">Clinic Services</h2>
            <p className="text-xs text-gray-500">Manage the list of medical services offered publicly.</p>
          </div>
        </div>
        <Button 
          onClick={handleSave} 
          disabled={isPending}
          className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl h-10 px-6 font-bold gap-2 shadow-sm"
        >
          {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          Save Services
        </Button>
      </div>

      <div className="p-6 space-y-4">
        {services.map((svc) => (
          <div key={svc.id} className="flex flex-col sm:flex-row gap-4 p-4 bg-gray-50 border border-gray-100 rounded-2xl group relative transition-all hover:bg-white hover:shadow-md">
            <div className="flex-1 space-y-3">
              <div className="space-y-1">
                <Label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Service Name</Label>
                <Input 
                  value={svc.label} 
                  onChange={(e) => updateService(svc.id, 'label', e.target.value)}
                  className="h-10 border-gray-200 focus:ring-blue-500"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Description</Label>
                <Input 
                  value={svc.desc} 
                  onChange={(e) => updateService(svc.id, 'desc', e.target.value)}
                  className="h-10 border-gray-200 focus:ring-blue-500"
                />
              </div>
            </div>
            <div className="flex items-end">
              <Button 
                variant="ghost" 
                onClick={() => removeService(svc.id)}
                className="h-10 w-10 p-0 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
              >
                <Trash2 className="w-5 h-5" />
              </Button>
            </div>
          </div>
        ))}

        <Button 
          onClick={addService} 
          variant="outline" 
          className="w-full h-14 border-dashed border-2 border-gray-200 hover:border-blue-500 hover:bg-blue-50 text-gray-400 hover:text-blue-600 rounded-2xl font-bold gap-2 transition-all"
        >
          <Plus className="w-5 h-5" />
          Add New Service
        </Button>
      </div>
    </div>
  );
}
