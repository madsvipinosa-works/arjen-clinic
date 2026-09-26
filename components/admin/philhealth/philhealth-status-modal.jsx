'use client';

import { useState, useTransition } from 'react';
import { 
  X, ShieldCheck, CheckCircle2, AlertTriangle, 
  Send, DollarSign, XCircle, ArrowRight, Calendar 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { updatePhilHealthClaimStatus } from '@/app/actions';
import { formatPHP } from '@/lib/billing-protocols';

export function PhilHealthStatusModal({ isOpen, onClose, claim, onSuccess }) {
  const [isPending, startTransition] = useTransition();

  const [status, setStatus] = useState(claim?.status || 'Draft');
  const [transmittedDate, setTransmittedDate] = useState(claim?.transmitted_date || new Date().toISOString().split('T')[0]);
  const [reimbursedDate, setReimbursedDate] = useState(claim?.reimbursed_date || new Date().toISOString().split('T')[0]);
  const [checkNumber, setCheckNumber] = useState(claim?.check_or_reference_number || '');
  const [denialReason, setDenialReason] = useState(claim?.denial_reason || '');
  const [notes, setNotes] = useState(claim?.notes || '');
  const [errorMsg, setErrorMsg] = useState(null);

  if (!isOpen || !claim) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    setErrorMsg(null);

    const fd = new FormData();
    fd.append('id', claim.id);
    fd.append('status', status);
    if (status === 'Transmitted') fd.append('transmitted_date', transmittedDate);
    if (status === 'Approved_Reimbursed') {
      fd.append('reimbursed_date', reimbursedDate);
      if (checkNumber) fd.append('check_or_reference_number', checkNumber);
    }
    if (status === 'Denied_Returned') {
      if (!denialReason.trim()) {
        setErrorMsg('Please specify the denial or return-to-hospital (RTH) reason.');
        return;
      }
      fd.append('denial_reason', denialReason);
    }
    if (notes) fd.append('notes', notes);

    startTransition(async () => {
      const res = await updatePhilHealthClaimStatus(fd);
      if (res?.success) {
        if (onSuccess) onSuccess(res);
        onClose();
      } else {
        setErrorMsg(res?.error || 'Failed to update claim status.');
      }
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl overflow-hidden border border-gray-100">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gray-50/80">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-sm shadow-blue-200">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-gray-900">Advance Claim Status</h3>
              <p className="text-xs text-gray-500 font-mono">{claim.claim_series_number} ({claim.package_type} — {formatPHP(claim.claim_amount)})</p>
            </div>
          </div>

          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="rounded-xl text-gray-400 hover:text-gray-700"
          >
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          
          {errorMsg && (
            <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-semibold">
              {errorMsg}
            </div>
          )}

          {/* Target Status Selector */}
          <div className="space-y-1.5">
            <Label className="text-xs font-bold text-gray-600 uppercase tracking-wider">
              Pipeline Stage
            </Label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {[
                { id: 'Draft', label: 'Draft (In Preparation)', icon: ShieldCheck, color: 'text-gray-700' },
                { id: 'Transmitted', label: 'Transmitted to LHIO', icon: Send, color: 'text-blue-700' },
                { id: 'In Process', label: 'In Process (Adjudication)', icon: Calendar, color: 'text-purple-700' },
                { id: 'Approved_Reimbursed', label: 'Approved & Reimbursed', icon: CheckCircle2, color: 'text-emerald-700' },
                { id: 'Denied_Returned', label: 'Denied / RTH (Return)', icon: XCircle, color: 'text-red-700' },
              ].map(s => (
                <button
                  type="button"
                  key={s.id}
                  onClick={() => setStatus(s.id)}
                  className={`p-2.5 rounded-xl border text-left text-xs font-bold transition-all flex items-center gap-2 ${
                    status === s.id
                      ? 'border-blue-500 bg-blue-50/70 text-blue-900 shadow-sm'
                      : 'border-gray-200 bg-white hover:bg-gray-50 text-gray-600'
                  }`}
                >
                  <s.icon className={`w-4 h-4 ${s.color}`} />
                  <span>{s.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Conditional Inputs based on Selected Status */}
          {status === 'Transmitted' && (
            <div className="space-y-1.5 p-3.5 rounded-2xl bg-blue-50/60 border border-blue-200">
              <Label className="text-xs font-bold text-blue-900 uppercase tracking-wider">
                Date Transmitted to PhilHealth LHIO *
              </Label>
              <Input
                type="date"
                value={transmittedDate}
                onChange={(e) => setTransmittedDate(e.target.value)}
                className="h-10 border-blue-200 bg-white rounded-xl text-sm"
                required
              />
            </div>
          )}

          {status === 'Approved_Reimbursed' && (
            <div className="space-y-3 p-3.5 rounded-2xl bg-emerald-50/60 border border-emerald-200">
              <div className="space-y-1">
                <Label className="text-xs font-bold text-emerald-900 uppercase tracking-wider">
                  Reimbursement Credit Date *
                </Label>
                <Input
                  type="date"
                  value={reimbursedDate}
                  onChange={(e) => setReimbursedDate(e.target.value)}
                  className="h-10 border-emerald-200 bg-white rounded-xl text-sm"
                  required
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-bold text-emerald-900 uppercase tracking-wider">
                  LBP Cheque # / Bank Credit Advice Reference
                </Label>
                <Input
                  value={checkNumber}
                  onChange={(e) => setCheckNumber(e.target.value)}
                  placeholder="e.g. LBP-CHK-0982314 or Advice #12"
                  className="h-10 border-emerald-200 bg-white rounded-xl text-sm font-mono"
                />
              </div>
            </div>
          )}

          {status === 'Denied_Returned' && (
            <div className="space-y-1.5 p-3.5 rounded-2xl bg-red-50/60 border border-red-200">
              <Label className="text-xs font-bold text-red-900 uppercase tracking-wider">
                PhilHealth Return-to-Hospital (RTH) / Denial Reason *
              </Label>
              <textarea
                value={denialReason}
                onChange={(e) => setDenialReason(e.target.value)}
                placeholder="e.g. Incomplete Part IV on CF2, missing Part III physician signature, or PhilHealth PIN discrepancy..."
                className="w-full p-2.5 rounded-xl border border-red-200 bg-white text-xs outline-none focus:ring-2 focus:ring-red-500 h-20"
                required
              />
            </div>
          )}

          {/* Internal Notes */}
          <div className="space-y-1.5">
            <Label className="text-xs font-bold text-gray-600 uppercase tracking-wider">
              Staff Processing Notes
            </Label>
            <Input
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Claim handed over to courier for regional PhilHealth office..."
              className="h-10 border-gray-200 rounded-xl text-xs"
            />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-2 pt-3 border-t border-gray-100">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="rounded-xl text-xs font-semibold"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isPending}
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs px-5 shadow-sm shadow-blue-200"
            >
              {isPending ? 'Updating...' : 'Save Stage Update'}
            </Button>
          </div>

        </form>

      </div>
    </div>
  );
}
