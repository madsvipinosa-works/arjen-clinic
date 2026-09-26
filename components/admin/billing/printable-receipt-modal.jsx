'use client';

import { useRef } from 'react';
import { 
  Printer, X, Receipt, CheckCircle2, Clock, 
  ShieldCheck, AlertCircle, Building2, Phone, MapPin
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { formatPHP } from '@/lib/billing-protocols';

export function PrintableReceiptModal({ isOpen, onClose, invoice, clinicSettings }) {
  const printRef = useRef(null);

  if (!isOpen || !invoice) return null;

  const clinicName = clinicSettings?.clinic_name || 'AR-JEN Maternity & Lying-In Clinic';
  const clinicAddress = clinicSettings?.clinic_address || '123 Health Street, San Jose, Bulacan, Philippines';
  const clinicContact = clinicSettings?.clinic_contact || '(044) 815-2026 / 0917-123-4567';

  const patient = invoice.patient || {};
  const items = invoice.invoice_items || invoice.items || [];
  const isPaid = invoice.payment_status === 'Paid';
  const isPartiallyPaid = invoice.payment_status === 'Partially Paid';
  const isCancelled = invoice.payment_status === 'Cancelled';

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl max-h-[90vh] flex flex-col bg-white rounded-3xl shadow-2xl overflow-hidden border border-gray-100">
        
        {/* Modal Top Actions (Hidden on Print) */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gray-50/80 print:hidden">
          <div className="flex items-center gap-2">
            <Receipt className="w-5 h-5 text-rose-500" />
            <span className="font-bold text-gray-900 text-sm">
              Official Statement & Counter Receipt — {invoice.invoice_number}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <Button
              onClick={handlePrint}
              className="bg-rose-500 hover:bg-rose-600 text-white font-bold rounded-xl gap-2 shadow-sm shadow-rose-200"
            >
              <Printer className="w-4 h-4" /> Print Receipt
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="rounded-xl text-gray-400 hover:text-gray-700"
            >
              <X className="w-5 h-5" />
            </Button>
          </div>
        </div>

        {/* Printable Paper Canvas */}
        <div className="p-8 overflow-y-auto space-y-6 print:p-0 print:m-0 print:overflow-visible text-gray-800" ref={printRef}>
          
          {/* Clinic Header */}
          <div className="text-center pb-6 border-b border-gray-200 space-y-1">
            <div className="flex items-center justify-center gap-2">
              <Building2 className="w-5 h-5 text-rose-600 print:hidden" />
              <h2 className="text-2xl font-black tracking-tight text-gray-900 uppercase">
                {clinicName}
              </h2>
            </div>
            <p className="text-xs text-gray-600 font-medium">
              DOH-Accredited Lying-In Clinic & PhilHealth MCP/NCP Provider
            </p>
            <p className="text-xs text-gray-500">
              {clinicAddress} • Tel: {clinicContact}
            </p>
          </div>

          {/* Receipt Title & Meta */}
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 text-xs">
            <div className="space-y-1">
              <span className="text-[10px] font-black uppercase text-gray-400 tracking-wider">Patient Particulars</span>
              <p className="font-bold text-sm text-gray-900">{patient.full_name || 'Patient'}</p>
              <p className="text-gray-500">Age: {patient.age ? `${patient.age} yrs` : '—'} • Contact: {patient.contact_number || '—'}</p>
              {patient.philhealth_number && (
                <p className="text-gray-600 font-mono">PhilHealth ID: {patient.philhealth_number}</p>
              )}
            </div>

            <div className="sm:text-right space-y-1">
              <span className="text-[10px] font-black uppercase text-gray-400 tracking-wider">Statement Details</span>
              <p className="font-mono font-bold text-sm text-rose-600">{invoice.invoice_number}</p>
              <p className="text-gray-500">Date: {new Date(invoice.created_at).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })}</p>
              {invoice.official_receipt_number && (
                <p className="text-gray-700 font-semibold">Booklet OR #: <span className="font-mono">{invoice.official_receipt_number}</span></p>
              )}
              <div>
                <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-black uppercase tracking-wider ${
                  isPaid ? 'bg-emerald-100 text-emerald-800' :
                  isPartiallyPaid ? 'bg-amber-100 text-amber-800' :
                  isCancelled ? 'bg-red-100 text-red-800' :
                  'bg-gray-100 text-gray-800'
                }`}>
                  {invoice.payment_status}
                </span>
              </div>
            </div>
          </div>

          {/* Line Items Table */}
          <div className="border border-gray-200 rounded-2xl overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="bg-gray-50 border-b border-gray-200 text-gray-500 font-bold uppercase tracking-wider">
                <tr>
                  <th className="py-2.5 px-4">Item / Service Description</th>
                  <th className="py-2.5 px-3 text-center">Type</th>
                  <th className="py-2.5 px-3 text-center">Qty</th>
                  <th className="py-2.5 px-3 text-right">Unit Price</th>
                  <th className="py-2.5 px-4 text-right">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {items.map((item, idx) => (
                  <tr key={idx} className="hover:bg-gray-50/50">
                    <td className="py-2.5 px-4 font-semibold text-gray-800">{item.description}</td>
                    <td className="py-2.5 px-3 text-center text-gray-500">{item.item_type || 'Service'}</td>
                    <td className="py-2.5 px-3 text-center font-mono">{item.quantity}</td>
                    <td className="py-2.5 px-3 text-right font-mono">{formatPHP(item.unit_price)}</td>
                    <td className="py-2.5 px-4 text-right font-mono font-bold text-gray-900">{formatPHP(item.total_price)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Financial Breakdown & Deductions */}
          <div className="flex flex-col sm:flex-row justify-between gap-6 pt-2">
            <div className="text-xs space-y-2 max-w-xs">
              <div className="p-3 bg-gray-50 rounded-xl border border-gray-200/80 space-y-1">
                <p className="font-bold text-gray-700">Payment Particulars:</p>
                <p className="text-gray-600">Method: <span className="font-semibold text-gray-900">{invoice.payment_method}</span></p>
                {invoice.payment_reference && (
                  <p className="text-gray-600">Reference #: <span className="font-mono font-bold text-gray-900">{invoice.payment_reference}</span></p>
                )}
                {invoice.notes && (
                  <p className="text-[11px] text-gray-500 italic mt-1">Note: {invoice.notes}</p>
                )}
              </div>
            </div>

            <div className="w-full sm:w-64 space-y-1.5 text-xs">
              <div className="flex justify-between text-gray-600">
                <span>Subtotal Gross:</span>
                <span className="font-mono font-semibold">{formatPHP(invoice.subtotal)}</span>
              </div>

              {parseFloat(invoice.philhealth_discount) > 0 && (
                <div className="flex justify-between text-emerald-700 font-medium">
                  <span>Less: PhilHealth Benefit:</span>
                  <span className="font-mono font-bold">- {formatPHP(invoice.philhealth_discount)}</span>
                </div>
              )}

              {parseFloat(invoice.senior_pwd_discount) > 0 && (
                <div className="flex justify-between text-blue-700 font-medium">
                  <span>Less: Senior / PWD (20%):</span>
                  <span className="font-mono font-bold">- {formatPHP(invoice.senior_pwd_discount)}</span>
                </div>
              )}

              <div className="border-t border-gray-200 pt-2 flex justify-between text-sm font-bold text-gray-900">
                <span>Net Amount Due:</span>
                <span className="font-mono text-base text-rose-600">{formatPHP(invoice.amount_due)}</span>
              </div>

              <div className="flex justify-between text-gray-700 pt-1">
                <span>Amount Paid / Tendered:</span>
                <span className="font-mono font-bold">{formatPHP(invoice.amount_paid)}</span>
              </div>

              {parseFloat(invoice.change_given) > 0 && (
                <div className="flex justify-between text-emerald-600 font-semibold">
                  <span>Change Given:</span>
                  <span className="font-mono">{formatPHP(invoice.change_given)}</span>
                </div>
              )}

              {parseFloat(invoice.amount_paid) < parseFloat(invoice.amount_due) && (
                <div className="flex justify-between text-red-600 font-bold border-t border-dashed border-red-200 pt-1">
                  <span>Remaining Balance:</span>
                  <span className="font-mono">{formatPHP(parseFloat(invoice.amount_due) - parseFloat(invoice.amount_paid))}</span>
                </div>
              )}
            </div>
          </div>

          {/* Signatures & Certification */}
          <div className="pt-8 border-t border-gray-200 flex justify-between items-end text-xs text-gray-500">
            <div className="space-y-1">
              <p className="text-[11px] text-gray-400">This document serves as an Official Statement of Account.</p>
              <p className="text-[10px] text-gray-400">Strictly for Internal Clinic Cashiering & Clinical Audit.</p>
            </div>

            <div className="text-center w-48 space-y-1">
              <div className="border-b border-gray-400 h-8"></div>
              <p className="font-bold text-gray-800">Authorized Cashier</p>
              <p className="text-[10px] text-gray-400">AR-JEN Maternity Clinic</p>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}
