'use client';

import { useState, useTransition, useMemo } from 'react';
import { 
  X, ShieldCheck, Calendar, Clock, AlertTriangle, 
  CheckCircle2, AlertCircle, FileText, User 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  PHILHEALTH_BENEFIT_RATES, 
  calculatePhilHealthDeadline, 
  formatPHP 
} from '@/lib/billing-protocols';
import { createPhilHealthClaim } from '@/app/actions';

export function PhilHealthClaimModal({ 
  isOpen, 
  onClose, 
  patients = [], 
  preselectedPatientId = null,
  preselectedDeliveryDate = null,
  invoices = [],
  onSuccess 
}) {
  const [isPending, startTransition] = useTransition();

  const [patientId, setPatientId] = useState(preselectedPatientId || (patients[0]?.id || ''));
  const [packageType, setPackageType] = useState('MCP'); // MCP | NCP | MCP+NCP
  const [dateOfDelivery, setDateOfDelivery] = useState(preselectedDeliveryDate || new Date().toISOString().split('T')[0]);
  const [memberId, setMemberId] = useState('');
  const [memberCategory, setMemberCategory] = useState('Formal Economy');
  const [relationship, setRelationship] = useState('Member');
  const [invoiceId, setInvoiceId] = useState('');
  const [notes, setNotes] = useState('');
  const [errorMsg, setErrorMsg] = useState(null);

  // Auto-fill member ID if selected patient has it
  const selectedPatient = useMemo(() => {
    return patients.find(p => p.id === patientId) || null;
  }, [patients, patientId]);

  // Synchronize PhilHealth PIN from patient record
  const currentPin = memberId || selectedPatient?.philhealth_number || '';

  // Calculate default claim amount based on package
  const claimAmount = useMemo(() => {
    if (packageType === 'MCP') return PHILHEALTH_BENEFIT_RATES.MCP.amount;
    if (packageType === 'NCP') return PHILHEALTH_BENEFIT_RATES.NCP.amount;
    if (packageType === 'MCP+NCP') return PHILHEALTH_BENEFIT_RATES.MCP_NCP_COMBINED.amount;
    return 6500;
  }, [packageType]);

  // 60-Day Statutory Deadline Calculation
  const deadlineMetrics = useMemo(() => {
    return calculatePhilHealthDeadline(dateOfDelivery);
  }, [dateOfDelivery]);

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!patientId) {
      setErrorMsg('Please select a patient.');
      return;
    }
    if (!dateOfDelivery) {
      setErrorMsg('Please specify date of delivery.');
      return;
    }

    const fd = new FormData();
    fd.append('patient_id', patientId);
    fd.append('package_type', packageType);
    fd.append('claim_amount', String(claimAmount));
    fd.append('date_of_delivery', dateOfDelivery);
    if (currentPin) fd.append('philhealth_member_id', currentPin);
    fd.append('member_category', memberCategory);
    fd.append('patient_relationship', relationship);
    if (invoiceId) fd.append('invoice_id', invoiceId);
    if (notes) fd.append('notes', notes);

    startTransition(async () => {
      const res = await createPhilHealthClaim(fd);
      if (res?.success) {
        if (onSuccess) onSuccess(res);
        onClose();
      } else {
        setErrorMsg(res?.error || 'Failed to file claim.');
      }
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl max-h-[92vh] flex flex-col bg-white rounded-3xl shadow-2xl overflow-hidden border border-gray-100">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-blue-50/70 via-white to-cyan-50/30">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-2xl bg-blue-600 text-white flex items-center justify-center shadow-sm shadow-blue-200">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-gray-900">File PhilHealth Reimbursement Claim</h2>
              <p className="text-xs text-gray-500">Maternal Care Package (MCP) & Newborn Care Package (NCP) Pipeline.</p>
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

        {/* Scrollable Form */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-5">
          
          {errorMsg && (
            <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-semibold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Statutory 60-Day Deadline Banner */}
          {deadlineMetrics.isValid && (
            <div className={`p-4 rounded-2xl border transition-colors ${
              deadlineMetrics.isExpired ? 'bg-red-50 border-red-200 text-red-900' :
              deadlineMetrics.isCritical ? 'bg-amber-50 border-amber-200 text-amber-900' :
              'bg-emerald-50/80 border-emerald-200 text-emerald-900'
            }`}>
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2">
                  {deadlineMetrics.isExpired || deadlineMetrics.isCritical ? (
                    <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0" />
                  ) : (
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
                  )}
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider">
                      PhilHealth Statutory 60-Day Filing Rule (Sec 40, RA 7875)
                    </h4>
                    <p className="text-xs mt-0.5 opacity-90">
                      Must be submitted to PhilHealth on or before: <strong>{deadlineMetrics.filingDeadlineFormatted}</strong>
                    </p>
                  </div>
                </div>

                <span className={`px-2.5 py-1 rounded-full text-xs font-black uppercase whitespace-nowrap ${
                  deadlineMetrics.isExpired ? 'bg-red-200 text-red-900' :
                  deadlineMetrics.isCritical ? 'bg-amber-200 text-amber-900' :
                  'bg-emerald-200 text-emerald-900'
                }`}>
                  {deadlineMetrics.statusLabel}
                </span>
              </div>
            </div>
          )}

          {/* Patient & Delivery Date */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-gray-600 uppercase tracking-wider flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-blue-600" /> Patient *
              </Label>
              {preselectedPatientId ? (
                <div className="h-10 px-3.5 rounded-xl border border-gray-200 bg-gray-50 flex items-center text-sm font-semibold text-gray-900">
                  {selectedPatient?.full_name || 'Selected Patient'}
                </div>
              ) : (
                <select
                  value={patientId}
                  onChange={(e) => setPatientId(e.target.value)}
                  className="w-full h-10 px-3 rounded-xl border border-gray-200 bg-white text-sm font-medium focus:ring-2 focus:ring-blue-500 outline-none"
                  required
                >
                  <option value="">Select mother...</option>
                  {patients.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.full_name} {p.philhealth_number ? `(PIN: ${p.philhealth_number})` : ''}
                    </option>
                  ))}
                </select>
              )}
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-gray-600 uppercase tracking-wider flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-blue-600" /> Date of Delivery *
              </Label>
              <Input
                type="date"
                value={dateOfDelivery}
                onChange={(e) => setDateOfDelivery(e.target.value)}
                className="h-10 border-gray-200 rounded-xl text-sm"
                required
              />
            </div>
          </div>

          {/* Package Type & Benefit Amount */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-gray-600 uppercase tracking-wider">
                PhilHealth Package Type *
              </Label>
              <select
                value={packageType}
                onChange={(e) => setPackageType(e.target.value)}
                className="w-full h-10 px-3 rounded-xl border border-gray-200 bg-white text-sm font-semibold outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="MCP">Maternal Care Package (MCP) — ₱6,500.00</option>
                <option value="NCP">Newborn Care Package (NCP) — ₱1,750.00</option>
                <option value="MCP+NCP">MCP + NCP Combined Delivery — ₱8,250.00</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-gray-600 uppercase tracking-wider">
                Claim Reimbursement Value (PHP)
              </Label>
              <div className="h-10 px-3.5 rounded-xl border border-blue-200 bg-blue-50/50 flex items-center justify-between text-sm font-bold text-blue-900 font-mono">
                <span>{formatPHP(claimAmount)}</span>
                <span className="text-[10px] uppercase font-bold text-blue-600">Standard Package Rate</span>
              </div>
            </div>
          </div>

          {/* Member Details */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-gray-600 uppercase tracking-wider">
                PhilHealth Member ID (12-digit)
              </Label>
              <Input
                value={currentPin}
                onChange={(e) => setMemberId(e.target.value)}
                placeholder="12-345678901-2"
                className="h-10 border-gray-200 rounded-xl text-xs font-mono"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-gray-600 uppercase tracking-wider">
                Member Category
              </Label>
              <select
                value={memberCategory}
                onChange={(e) => setMemberCategory(e.target.value)}
                className="w-full h-10 px-2.5 rounded-xl border border-gray-200 bg-white text-xs font-medium outline-none"
              >
                <option value="Formal Economy">Formal Economy (Employed)</option>
                <option value="Informal Economy">Informal Economy (Self-employed)</option>
                <option value="Indigent / 4Ps">Indigent / 4Ps Beneficiary</option>
                <option value="Senior Citizen">Senior Citizen</option>
                <option value="Lifetime Member">Lifetime Member</option>
                <option value="Sponsored">Sponsored / LGU</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-gray-600 uppercase tracking-wider">
                Patient Relationship
              </Label>
              <select
                value={relationship}
                onChange={(e) => setRelationship(e.target.value)}
                className="w-full h-10 px-2.5 rounded-xl border border-gray-200 bg-white text-xs font-medium outline-none"
              >
                <option value="Member">Principal Member</option>
                <option value="Dependent - Spouse">Dependent - Spouse</option>
                <option value="Dependent - Child">Dependent - Child</option>
              </select>
            </div>
          </div>

          {/* Linked Invoice & Notes */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-gray-600 uppercase tracking-wider">
                Link to Clinic Invoice (Optional)
              </Label>
              <select
                value={invoiceId}
                onChange={(e) => setInvoiceId(e.target.value)}
                className="w-full h-10 px-3 rounded-xl border border-gray-200 bg-white text-xs font-medium outline-none"
              >
                <option value="">No linked invoice</option>
                {invoices.map(inv => (
                  <option key={inv.id} value={inv.id}>
                    {inv.invoice_number} ({formatPHP(inv.amount_due)})
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-gray-600 uppercase tracking-wider">
                Internal Claim Notes
              </Label>
              <Input
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="e.g. CF1, CF2 signed. Transmitting via liaison on Tuesday..."
                className="h-10 border-gray-200 rounded-xl text-xs"
              />
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100">
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
              {isPending ? 'Filing Claim...' : 'File Claim in Draft'}
            </Button>
          </div>

        </form>

      </div>
    </div>
  );
}
