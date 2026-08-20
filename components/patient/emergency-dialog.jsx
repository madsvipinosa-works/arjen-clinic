"use client";

import { useState } from "react";
import { 
  PhoneCall, 
  AlertTriangle, 
  MapPin, 
  Clock, 
  HeartHandshake, 
  X,
  ShieldAlert
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export function EmergencyContactModal({ trigger, open: controlledOpen, onOpenChange: controlledOnOpenChange }) {
  const [internalOpen, setInternalOpen] = useState(false);
  const isControlled = controlledOpen !== undefined;
  const isOpen = isControlled ? controlledOpen : internalOpen;
  const setIsOpen = isControlled ? controlledOnOpenChange : setInternalOpen;

  const emergencySigns = [
    "Severe abdominal pain or cramping",
    "Bright red vaginal bleeding or spotting",
    "Sudden swelling in face, hands, or feet",
    "Severe headache or blurred/spotted vision",
    "Noticeable decrease in baby's movement",
    "Sudden gush or trickle of fluid (water breaking)"
  ];

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
      <DialogContent className="sm:max-w-lg bg-card border-border rounded-3xl p-6 sm:p-8 shadow-2xl">
        <DialogHeader className="text-left space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-destructive/10 text-destructive flex items-center justify-center shadow-sm">
            <ShieldAlert className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <DialogTitle className="text-2xl font-black text-foreground tracking-tight">
              Urgent Clinic & Emergency Triage
            </DialogTitle>
            <DialogDescription className="text-muted-foreground text-sm font-medium mt-1">
              If you are experiencing any warning signs, contact our maternity staff immediately.
            </DialogDescription>
          </div>
        </DialogHeader>

        <div className="space-y-6 pt-2">
          {/* Quick Call Button */}
          <a 
            href="tel:+639171234567" 
            className="w-full flex items-center justify-center gap-3 bg-primary text-primary-foreground hover:bg-primary/90 font-black h-14 rounded-2xl shadow-lg transition-all active:scale-[0.98] text-base"
          >
            <PhoneCall className="w-5 h-5 animate-bounce" />
            <span>Call Clinic Hotline: (0917) 123-4567</span>
          </a>

          {/* Warning Signs List */}
          <div className="bg-muted/50 border border-border rounded-2xl p-4 sm:p-5 space-y-3">
            <div className="flex items-center gap-2 text-foreground font-bold text-xs uppercase tracking-wider">
              <AlertTriangle className="w-4 h-4 text-primary" />
              <span>When to Call or Visit Immediately</span>
            </div>
            <ul className="grid grid-cols-1 gap-2 text-xs font-medium text-muted-foreground">
              {emergencySigns.map((sign, idx) => (
                <li key={idx} className="flex items-start gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 shrink-0" />
                  <span>{sign}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Clinic Location & Hours Info */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-muted-foreground">
            <div className="flex items-start gap-2.5 p-3 rounded-xl bg-card border border-border">
              <MapPin className="w-4 h-4 text-primary shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-foreground">Clinic Address</p>
                <p className="text-[11px] leading-tight mt-0.5">AR-JEN Maternity Clinic, Main Bldg.</p>
              </div>
            </div>
            <div className="flex items-start gap-2.5 p-3 rounded-xl bg-card border border-border">
              <Clock className="w-4 h-4 text-primary shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-foreground">Labor & Triage</p>
                <p className="text-[11px] leading-tight mt-0.5">24/7 On-Call Midwife / OB Team</p>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
