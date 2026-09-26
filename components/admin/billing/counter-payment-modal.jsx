'use client';

import { useState, useTransition, useMemo } from 'react';
import { 
  X, Coins, Receipt, CheckCircle2, AlertCircle, ArrowRight
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { formatPHP, calculateCounterChange } from '@/lib/billing-protocols';
import { recordCounterPayment } from '@/app/actions';

export function CounterPaymentModal({ isOpen, onClose, invoice, onSuccess }) {
  const [isPending, startTransition] = useTransition();

  const [paymentMethod, setPaymentMethod] = useState('Cash');
  const [amountTendered, setAmountTendered] = useState('');
  const [paymentReference, setPaymentReference] = useState('');
  const [orBookletNumber, setOrBookletNumber] = useState('');
  const [notes, setNotes] = useState('');
  const [errorMsg, setErrorMsg] = useState(null);

  if (!isOpen || !invoice) return null;

  const currentPaid = parseFloat(invoice.amount_paid) || 0;
  const amountDue = parseFloat(invoice.amount_due) || 0;
  const remainingDue = Math.max(0, amountDue - currentPaid);

  const tenderedNum = parseFloat(amountTendered) || 0;
  const changeDue = tenderedNum > remainingDue ? Math.round((tenderedNum - remainingDue) * 100) / 100 : 0;
  const newBalance = Math.max(0, Math.round((remainingDue - tenderedNum) * 100) / 100);

  const handlePayExact = () => {
    setAmountTendered(String(remainingDue));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setErrorMsg(null);

    if (tenderedNum <= 0) {
      setErrorMsg('Please enter a payment amount greater than zero.');
      return;
    }

    const fd = new FormData();
    fd.append('invoice_id', invoice.id);
    fd.append('amount_tendered', String(tenderedNum));
    fd.append('payment_method', paymentMethod);
    if (paymentReference) fd.append('payment_reference', paymentReference);
    if (orBookletNumber) fd.append('official_receipt_number', orBookletNumber);
    if (notes) fd.append('notes', notes);

    startTransition(async () => {
      const res = await recordCounterPayment(fd);
      if (res?.success) {
        if (onSuccess) onSuccess(res);
        onClose();
      } else {
        setErrorMsg(res?.error || 'Failed to record payment.');
      }
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl overflow-hidden border border-gray-100">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gray-50/80">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-emerald-500 text-white flex items-center justify-center shadow-sm shadow-emerald-200">
              <Coins className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-gray-900">Record Counter Payment</h3>
              <p className="text-xs text-gray-500">Invoice: {invoice.invoice_number}</p>
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
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          
          {errorMsg && (
            <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-semibold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Balance Overview Box */}
          <div className="p-4 rounded-2xl bg-gray-50 border border-gray-200 grid grid-cols-3 gap-2 text-center text-xs">
            <div>
              <p className="text-gray-500 text-[10px] uppercase font-bold">Total Bill</p>
              <p className="font-mono font-bold text-gray-800 text-sm mt-0.5">{formatPHP(amountDue)}</p>
            </div>
            <div>
              <p className="text-gray-500 text-[10px] uppercase font-bold">Already Paid</p>
              <p className="font-mono font-bold text-emerald-600 text-sm mt-0.5">{formatPHP(currentPaid)}</p>
            </div>
            <div>
              <p className="text-red-500 text-[10px] uppercase font-black">Remaining Due</p>
              <p className="font-mono font-black text-red-600 text-sm mt-0.5">{formatPHP(remainingDue)}</p>
            </div>
          </div>

          {/* Payment Method */}
          <div className="space-y-1.5">
            <Label className="text-xs font-bold text-gray-600 uppercase tracking-wider">
              Payment Method
            </Label>
            <select
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value)}
              className="w-full h-10 px-3 rounded-xl border border-gray-200 bg-white text-sm font-semibold outline-none focus:ring-2 focus:ring-rose-500"
            >
              <option value="Cash">Cash (Counter Tender)</option>
              <option value="GCash">GCash (Manual Confirmation Ref)</option>
              <option value="Bank Transfer">Bank Transfer (Deposit Slip Ref)</option>
              <option value="Mixed">Mixed</option>
            </select>
          </div>

          {/* Amount Tendered */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-bold text-gray-600 uppercase tracking-wider">
                Amount Tendered (PHP) *
              </Label>
              <button
                type="button"
                onClick={handlePayExact}
                className="text-xs text-rose-600 font-bold hover:underline"
              >
                Pay Exact Balance ({formatPHP(remainingDue)})
              </button>
            </div>
            <Input
              type="number"
              step="0.01"
              min="0"
              value={amountTendered}
              onChange={(e) => setAmountTendered(e.target.value)}
              placeholder="0.00"
              className="h-11 border-gray-200 rounded-xl text-base font-mono font-black text-gray-900"
              required
            />
          </div>

          {/* Change & Balance Output */}
          {tenderedNum > 0 && (
            <div className="p-3.5 rounded-xl bg-emerald-50/70 border border-emerald-200 flex items-center justify-between text-xs">
              <div>
                <span className="text-emerald-800 font-medium">New Status: </span>
                <span className="font-bold text-emerald-900">
                  {newBalance === 0 ? 'Will be Fully Paid' : 'Partially Paid'}
                </span>
              </div>
              <div>
                {changeDue > 0 ? (
                  <span className="text-emerald-800 font-bold">
                    Change to Return: <span className="font-mono text-sm">{formatPHP(changeDue)}</span>
                  </span>
                ) : newBalance > 0 ? (
                  <span className="text-red-700 font-bold">
                    New Balance: <span className="font-mono text-sm">{formatPHP(newBalance)}</span>
                  </span>
                ) : (
                  <span className="text-emerald-800 font-bold">Exact payment received</span>
                )}
              </div>
            </div>
          )}

          {/* Reference Number */}
          <div className="space-y-1.5">
            <Label className="text-xs font-bold text-gray-600 uppercase tracking-wider">
              {paymentMethod === 'GCash' ? 'GCash 13-digit Reference #' : 'Transaction Reference / Deposit # (Optional)'}
            </Label>
            <Input
              value={paymentReference}
              onChange={(e) => setPaymentReference(e.target.value)}
              placeholder={paymentMethod === 'GCash' ? 'e.g. 1029384756102' : 'Reference notes...'}
              className="h-10 border-gray-200 rounded-xl text-sm font-mono"
            />
          </div>

          {/* Paper Booklet OR Number */}
          <div className="space-y-1.5">
            <Label className="text-xs font-bold text-gray-600 uppercase tracking-wider">
              Paper Booklet Official Receipt (OR) # (Optional)
            </Label>
            <Input
              value={orBookletNumber}
              onChange={(e) => setOrBookletNumber(e.target.value)}
              placeholder="e.g. OR-84921"
              className="h-10 border-gray-200 rounded-xl text-sm"
            />
          </div>

          {/* Notes */}
          <div className="space-y-1.5">
            <Label className="text-xs font-bold text-gray-600 uppercase tracking-wider">
              Payment Remarks
            </Label>
            <Input
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Cleared remaining balance upon discharge..."
              className="h-10 border-gray-200 rounded-xl text-sm"
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
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs px-5 shadow-sm shadow-emerald-200"
            >
              {isPending ? 'Processing...' : 'Confirm Counter Payment'}
            </Button>
          </div>

        </form>

      </div>
    </div>
  );
}
