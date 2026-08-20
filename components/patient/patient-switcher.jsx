"use client";

import { useTransition } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { Users, User, Check, ChevronDown } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function PatientSwitcher({ patients = [], activePatientId }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  if (!patients || patients.length === 0) return null;

  const handleSelect = (newPatientId) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("patientId", newPatientId);
    startTransition(() => {
      router.push(`${pathname}?${params.toString()}`);
    });
  };

  const activePatient = patients.find(p => p.id === activePatientId) || patients[0];

  // If only 1 patient profile under this account
  if (patients.length === 1) {
    return (
      <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-secondary/30 border border-border text-xs font-semibold text-foreground">
        <User className="w-3.5 h-3.5 text-primary" />
        <span>Patient: <strong className="font-bold text-primary">{activePatient.full_name || "Self"}</strong></span>
      </div>
    );
  }

  // If multiple patients/dependents under this account
  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-2">
      <span className="text-xs font-bold text-muted-foreground flex items-center gap-1.5 uppercase tracking-wider">
        <Users className="w-3.5 h-3.5 text-primary" />
        Dependent Profile:
      </span>
      <div className="min-w-[200px]">
        <Select 
          value={activePatientId || activePatient.id} 
          onValueChange={handleSelect}
          disabled={isPending}
        >
          <SelectTrigger className="w-full h-10 bg-card border-border rounded-xl font-bold text-foreground text-xs shadow-sm focus:ring-primary/20">
            <SelectValue placeholder="Select patient" />
          </SelectTrigger>
          <SelectContent className="bg-popover border-border rounded-xl shadow-xl">
            {patients.map((p) => (
              <SelectItem 
                key={p.id} 
                value={p.id}
                className="text-xs font-medium cursor-pointer focus:bg-accent focus:text-accent-foreground rounded-lg"
              >
                <div className="flex items-center justify-between w-full gap-2">
                  <span className="font-bold text-foreground">{p.full_name || "Unnamed Patient"}</span>
                  {p.is_high_risk && (
                    <span className="text-[9px] font-black uppercase tracking-wider bg-destructive/10 text-destructive px-1.5 py-0.5 rounded">
                      High Risk
                    </span>
                  )}
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
