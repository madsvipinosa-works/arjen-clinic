'use client';

import { useState, useTransition, useMemo } from 'react';
import { 
  X, Plus, Trash2, Receipt, Calculator, ShieldCheck, 
  Coins, CreditCard, Sparkles, CheckCircle2, User, AlertCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  CLINIC_SERVICES_PRESETS, 
  PHILHEALTH_BENEFIT_RATES, 
  formatPHP, 
  calculateCounterChange 
} from '@/lib/billing-protocols';
import { createInvoice } from '@/app/actions';

export function InvoiceCreatorModal({ 
  isOpen, 
  onClose, 
  patients = [], 
  preselectedPatientId = null,
  preselectedAppointmentId = null,
  onSuccess 
}) {
  const [isPending, startTransition] = useTransition();

  // Selected Patient State
  const [patientId, setPatientId] = useState(preselectedPatientId || (patients[0]?.id || ''));
  const [appointmentId, setAppointmentId] = useState(preselectedAppointmentId || '');

  // Line Items State
  const [items, setItems] = useState([
    { description: 'Routine Prenatal Consultation', item_type: 'Service', quantity: 1, unit_price: 350.00, total_price: 350.00 }
  ]);

  // Discounts
  const [hasPhilHealthDeduction, setHasPhilHealthDeduction] = useState(false);
  const [philHealthPackage, setPhilHealthPackage] = useState('MCP'); // MCP (6500) | NCP (1750) | MCP_NCP (8250)
  const [hasSeniorDiscount, setHasSeniorDiscount] = useState(false);

  // Counter Payment Entry
  const [paymentMethod, setPaymentMethod] = useState('Cash'); // Cash | GCash | Bank Transfer | PhilHealth | Mixed
  const [amountTendered, setAmountTendered] = useState('');
  const [paymentReference, setPaymentReference] = useState('');
  const [orBookletNumber, setOrBookletNumber] = useState('');
  const [notes, setNotes] = useState('');
  const [errorMsg, setErrorMsg] = useState(null);

  // Calculate Subtotal
  const subtotal = useMemo(() => {
    return items.reduce((acc, item) => acc + (parseFloat(item.total_price) || 0), 0);
  }, [items]);

  // Calculate PhilHealth Deduction
  const philhealthDiscount = useMemo(() => {
    if (!hasPhilHealthDeduction) return 0;
    if (philHealthPackage === 'MCP') return Math.min(subtotal, PHILHEALTH_BENEFIT_RATES.MCP.amount);
    if (philHealthPackage === 'NCP') return Math.min(subtotal, PHILHEALTH_BENEFIT_RATES.NCP.amount);
    if (philHealthPackage === 'MCP_NCP') return Math.min(subtotal, PHILHEALTH_BENEFIT_RATES.MCP_NCP_COMBINED.amount);
    return 0;
  }, [hasPhilHealthDeduction, philHealthPackage, subtotal]);

  // Calculate Senior/PWD Discount (20% on consultations/services)
  const seniorPwdDiscount = useMemo(() => {
    if (!hasSeniorDiscount) return 0;
    const eligibleAmount = items
      .filter(i => i.item_type === 'Service')
      .reduce((acc, i) => acc + (parseFloat(i.total_price) || 0), 0);
    return Math.round(eligibleAmount * 0.20 * 100) / 100;
  }, [hasSeniorDiscount, items]);

  // Net Amount Due
  const amountDue = useMemo(() => {
    const raw = subtotal - philhealthDiscount - seniorPwdDiscount;
    return Math.max(0, Math.round(raw * 100) / 100);
  }, [subtotal, philhealthDiscount, seniorPwdDiscount]);

  // Change Calculation
  const counterReconciliation = useMemo(() => {
    return calculateCounterChange({
      amountDue,
      amountPaid: parseFloat(amountTendered) || 0,
    });
  }, [amountDue, amountTendered]);

  if (!isOpen) return null;

  // Add Item from Clinic Preset
  const handleAddPreset = (preset) => {
    setItems(prev => [
      ...prev,
      {
        description: preset.label,
        item_type: preset.category,
        quantity: 1,
        unit_price: preset.price,
        total_price: preset.price,
      }
    ]);
  };

  // Add Empty Custom Line Item
  const handleAddCustomItem = () => {
    setItems(prev => [
      ...prev,
      { description: '', item_type: 'Service', quantity: 1, unit_price: 0, total_price: 0 }
    ]);
  };

  // Update item field
  const handleItemChange = (index, field, value) => {
    setItems(prev => {
      const copy = [...prev];
      const item = { ...copy[index], [field]: value };
      if (field === 'quantity' || field === 'unit_price') {
        const q = field === 'quantity' ? parseInt(value, 10) || 0 : item.quantity;
        const p = field === 'unit_price' ? parseFloat(value) || 0 : item.unit_price;
        item.total_price = Math.round(q * p * 100) / 100;
      }
      copy[index] = item;
      return copy;
    });
  };

  // Remove Item
  const handleRemoveItem = (index) => {
    if (items.length <= 1) return;
    setItems(prev => prev.filter((_, idx) => idx !== index));
  };

  // Fast Full Amount Tendered Shortcut
  const handlePayExact = () => {
    setAmountTendered(String(amountDue));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!patientId) {
      setErrorMsg('Please select a patient.');
      return;
    }

    if (items.some(i => !i.description.trim() || i.unit_price < 0)) {
      setErrorMsg('Please fill in valid descriptions and prices for all items.');
      return;
    }

    const payload = {
      patient_id: patientId,
      appointment_id: appointmentId || null,
      subtotal,
      philhealth_discount: philhealthDiscount,
      senior_pwd_discount: seniorPwdDiscount,
      amount_due: amountDue,
      amount_paid: parseFloat(amountTendered) || 0,
      change_given: counterReconciliation.changeDue,
      payment_method: paymentMethod,
      payment_reference: paymentReference || null,
      payment_status: counterReconciliation.isFullyPaid ? 'Paid' : (parseFloat(amountTendered) > 0 ? 'Partially Paid' : 'Unpaid'),
      official_receipt_number: orBookletNumber || null,
      notes: notes || null,
      items,
    };

    startTransition(async () => {
      const res = await createInvoice(payload);
      if (res?.success) {
        if (onSuccess) onSuccess(res);
        onClose();
      } else {
        setErrorMsg(res?.error || 'Failed to create invoice.');
      }
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-4xl max-h-[92vh] flex flex-col bg-white rounded-3xl shadow-2xl overflow-hidden border border-gray-100">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-rose-50/70 via-white to-pink-50/30">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-2xl bg-rose-500 text-white flex items-center justify-center shadow-sm shadow-rose-200">
              <Receipt className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-gray-900">Create Clinic Invoice & Counter Ledger</h2>
              <p className="text-xs text-gray-500">Record in-clinic counter charges, PhilHealth deductions, and receipts.</p>
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

        {/* Scrollable Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
          
          {errorMsg && (
            <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-semibold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Row 1: Patient Selection */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-gray-600 uppercase tracking-wider flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-rose-500" /> Patient *
              </Label>
              {preselectedPatientId ? (
                <div className="h-10 px-3.5 rounded-xl border border-gray-200 bg-gray-50 flex items-center text-sm font-semibold text-gray-900">
                  {patients.find(p => p.id === preselectedPatientId)?.full_name || 'Selected Patient'}
                </div>
              ) : (
                <select
                  value={patientId}
                  onChange={(e) => setPatientId(e.target.value)}
                  className="w-full h-10 px-3 rounded-xl border border-gray-200 bg-white text-sm font-medium focus:ring-2 focus:ring-rose-500 outline-none"
                  required
                >
                  <option value="">Select a patient...</option>
                  {patients.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.full_name} {p.philhealth_number ? `(PhilHealth: ${p.philhealth_number})` : ''}
                    </option>
                  ))}
                </select>
              )}
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-gray-600 uppercase tracking-wider">
                Paper Booklet OR # (Optional)
              </Label>
              <Input
                value={orBookletNumber}
                onChange={(e) => setOrBookletNumber(e.target.value)}
                placeholder="e.g. OR-84920"
                className="h-10 border-gray-200 rounded-xl text-sm"
              />
            </div>
          </div>

          {/* Quick Preset Chips */}
          <div className="space-y-2">
            <Label className="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-rose-500" /> Quick Add Clinic Presets
            </Label>
            <div className="flex flex-wrap gap-1.5">
              {CLINIC_SERVICES_PRESETS.slice(0, 10).map((preset) => (
                <button
                  type="button"
                  key={preset.id}
                  onClick={() => handleAddPreset(preset)}
                  className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-gray-100/80 hover:bg-rose-50 hover:text-rose-700 hover:border-rose-200 border border-gray-200 transition-colors"
                >
                  + {preset.label} ({formatPHP(preset.price)})
                </button>
              ))}
            </div>
          </div>

          {/* Line Items Table */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-bold text-gray-700 uppercase tracking-wider">
                Itemized Charges & Services
              </Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleAddCustomItem}
                className="text-xs font-semibold rounded-lg gap-1 border-rose-200 text-rose-600 hover:bg-rose-50"
              >
                <Plus className="w-3.5 h-3.5" /> Add Custom Line
              </Button>
            </div>

            <div className="border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
              <table className="w-full text-left text-xs">
                <thead className="bg-gray-50 border-b border-gray-200 text-gray-500 font-bold uppercase">
                  <tr>
                    <th className="py-2.5 px-3">Description</th>
                    <th className="py-2.5 px-2 w-28">Category</th>
                    <th className="py-2.5 px-2 w-16 text-center">Qty</th>
                    <th className="py-2.5 px-2 w-28 text-right">Price (₱)</th>
                    <th className="py-2.5 px-3 w-28 text-right">Total (₱)</th>
                    <th className="py-2.5 px-2 w-10 text-center"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {items.map((item, idx) => (
                    <tr key={idx} className="hover:bg-gray-50/40">
                      <td className="py-2 px-3">
                        <Input
                          value={item.description}
                          onChange={(e) => handleItemChange(idx, 'description', e.target.value)}
                          placeholder="Service name..."
                          className="h-8 text-xs border-gray-200 rounded-lg"
                          required
                        />
                      </td>
                      <td className="py-2 px-2">
                        <select
                          value={item.item_type}
                          onChange={(e) => handleItemChange(idx, 'item_type', e.target.value)}
                          className="h-8 px-2 rounded-lg border border-gray-200 bg-white text-xs w-full outline-none"
                        >
                          <option value="Service">Service</option>
                          <option value="Package">Package</option>
                          <option value="Laboratory">Laboratory</option>
                          <option value="Medication">Medication</option>
                          <option value="Other">Other</option>
                        </select>
                      </td>
                      <td className="py-2 px-2 text-center">
                        <Input
                          type="number"
                          min="1"
                          value={item.quantity}
                          onChange={(e) => handleItemChange(idx, 'quantity', e.target.value)}
                          className="h-8 text-xs text-center border-gray-200 rounded-lg font-mono"
                          required
                        />
                      </td>
                      <td className="py-2 px-2 text-right">
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          value={item.unit_price}
                          onChange={(e) => handleItemChange(idx, 'unit_price', e.target.value)}
                          className="h-8 text-xs text-right border-gray-200 rounded-lg font-mono"
                          required
                        />
                      </td>
                      <td className="py-2 px-3 text-right font-mono font-bold text-gray-800">
                        {formatPHP(item.total_price)}
                      </td>
                      <td className="py-2 px-2 text-center">
                        <button
                          type="button"
                          onClick={() => handleRemoveItem(idx)}
                          disabled={items.length <= 1}
                          className="text-gray-400 hover:text-red-500 disabled:opacity-30 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Statutory Deductions & PhilHealth Benefit Toggles */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-2xl bg-gray-50/80 border border-gray-200">
            {/* PhilHealth Benefit Deduction */}
            <div className="space-y-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={hasPhilHealthDeduction}
                  onChange={(e) => setHasPhilHealthDeduction(e.target.checked)}
                  className="rounded text-rose-600 focus:ring-rose-500 w-4 h-4"
                />
                <span className="text-xs font-bold text-gray-800 flex items-center gap-1">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" /> Apply PhilHealth Deduction
                </span>
              </label>

              {hasPhilHealthDeduction && (
                <div className="space-y-1.5 pl-6">
                  <select
                    value={philHealthPackage}
                    onChange={(e) => setPhilHealthPackage(e.target.value)}
                    className="w-full h-8 px-2 rounded-lg border border-gray-200 bg-white text-xs font-medium"
                  >
                    <option value="MCP">MCP - Maternal Care Package (₱6,500.00)</option>
                    <option value="NCP">NCP - Newborn Care Package (₱1,750.00)</option>
                    <option value="MCP_NCP">MCP + NCP Combined Delivery (₱8,250.00)</option>
                  </select>
                  <p className="text-[11px] text-emerald-700 font-medium">
                    Benefit Deducted: - {formatPHP(philhealthDiscount)}
                  </p>
                </div>
              )}
            </div>

            {/* Senior Citizen / PWD 20% Discount */}
            <div className="space-y-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={hasSeniorDiscount}
                  onChange={(e) => setHasSeniorDiscount(e.target.checked)}
                  className="rounded text-blue-600 focus:ring-blue-500 w-4 h-4"
                />
                <span className="text-xs font-bold text-gray-800">
                  Senior Citizen / PWD Statutory 20% Concession
                </span>
              </label>

              {hasSeniorDiscount && (
                <p className="text-[11px] text-blue-700 font-medium pl-6">
                  20% on Professional/Consultation Services: - {formatPHP(seniorPwdDiscount)}
                </p>
              )}
            </div>
          </div>

          {/* Totals & Counter Payment Reconciliation */}
          <div className="p-5 rounded-2xl bg-gradient-to-br from-rose-50/50 via-white to-pink-50/30 border border-rose-100 space-y-4">
            <div className="flex flex-col sm:flex-row justify-between gap-4 pb-4 border-b border-rose-100">
              <div className="text-xs space-y-1 text-gray-500">
                <p>Gross Subtotal: <span className="font-mono font-bold text-gray-800">{formatPHP(subtotal)}</span></p>
                {philhealthDiscount > 0 && (
                  <p className="text-emerald-700">PhilHealth: <span className="font-mono font-bold">- {formatPHP(philhealthDiscount)}</span></p>
                )}
                {seniorPwdDiscount > 0 && (
                  <p className="text-blue-700">Senior/PWD: <span className="font-mono font-bold">- {formatPHP(seniorPwdDiscount)}</span></p>
                )}
              </div>

              <div className="text-right">
                <span className="text-[10px] font-black uppercase text-gray-400 tracking-wider">Net Amount Due</span>
                <p className="text-2xl font-black font-mono text-rose-600">{formatPHP(amountDue)}</p>
              </div>
            </div>

            {/* Counter Payment Inputs */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-1">
                <Label className="text-xs font-bold text-gray-600">Counter Payment Method</Label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="w-full h-9 px-2 rounded-xl border border-gray-200 bg-white text-xs font-semibold outline-none"
                >
                  <option value="Cash">Cash (Counter)</option>
                  <option value="GCash">GCash (Manual Ref)</option>
                  <option value="Bank Transfer">Bank Transfer (Deposit Ref)</option>
                  <option value="PhilHealth">PhilHealth 100% Covered</option>
                  <option value="Mixed">Mixed (Cash + GCash)</option>
                </select>
              </div>

              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-bold text-gray-600">Amount Tendered</Label>
                  <button
                    type="button"
                    onClick={handlePayExact}
                    className="text-[10px] text-rose-600 font-bold hover:underline"
                  >
                    Exact Due
                  </button>
                </div>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={amountTendered}
                  onChange={(e) => setAmountTendered(e.target.value)}
                  placeholder="0.00"
                  className="h-9 border-gray-200 rounded-xl text-xs font-mono font-bold"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-bold text-gray-600">
                  {paymentMethod === 'GCash' ? 'GCash 13-digit Ref #' : paymentMethod === 'Bank Transfer' ? 'Bank Deposit Ref #' : 'Payment Ref (Optional)'}
                </Label>
                <Input
                  value={paymentReference}
                  onChange={(e) => setPaymentReference(e.target.value)}
                  placeholder={paymentMethod === 'GCash' ? 'e.g. 1029384756102' : 'Reference note...'}
                  className="h-9 border-gray-200 rounded-xl text-xs font-mono"
                />
              </div>
            </div>

            {/* Change & Remaining Balance Badges */}
            <div className="flex items-center justify-between pt-2 text-xs">
              <div className="flex items-center gap-2">
                <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                  counterReconciliation.isFullyPaid 
                    ? 'bg-emerald-100 text-emerald-800' 
                    : (parseFloat(amountTendered) > 0 ? 'bg-amber-100 text-amber-800' : 'bg-gray-100 text-gray-700')
                }`}>
                  Status: {counterReconciliation.isFullyPaid ? 'Fully Paid' : (parseFloat(amountTendered) > 0 ? 'Partially Paid' : 'Unpaid')}
                </span>
              </div>

              <div className="flex items-center gap-4">
                {counterReconciliation.changeDue > 0 && (
                  <span className="font-bold text-emerald-700 bg-emerald-50 px-3 py-1 rounded-xl border border-emerald-200">
                    Change to Return: <span className="font-mono text-sm">{formatPHP(counterReconciliation.changeDue)}</span>
                  </span>
                )}
                {counterReconciliation.remainingBalance > 0 && (
                  <span className="font-bold text-red-600 bg-red-50 px-3 py-1 rounded-xl border border-red-200">
                    Remaining Due: <span className="font-mono text-sm">{formatPHP(counterReconciliation.remainingBalance)}</span>
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-bold text-gray-600">Internal Remarks / Cashier Notes</Label>
            <Input
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Patient paid partial cash, remaining balance due on follow-up checkup..."
              className="h-9 border-gray-200 rounded-xl text-xs"
            />
          </div>

          {/* Footer Actions */}
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
              className="bg-rose-500 hover:bg-rose-600 text-white font-bold rounded-xl text-xs px-5 shadow-sm shadow-rose-200"
            >
              {isPending ? 'Generating Statement...' : 'Save & Record Counter Payment'}
            </Button>
          </div>

        </form>

      </div>
    </div>
  );
}
