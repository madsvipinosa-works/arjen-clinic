'use client';

import { useState } from 'react';
import { 
  Search, Filter, Receipt, Printer, Coins, 
  CheckCircle2, Clock, XCircle, AlertCircle, Ban
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { formatPHP } from '@/lib/billing-protocols';
import { PrintableReceiptModal } from './printable-receipt-modal';
import { CounterPaymentModal } from './counter-payment-modal';
import { cancelInvoice } from '@/app/actions';

export function InvoicesTable({ invoices = [], clinicSettings = {} }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL'); // ALL | Paid | Unpaid | Partially Paid | Cancelled
  const [selectedInvoiceForPrint, setSelectedInvoiceForPrint] = useState(null);
  const [selectedInvoiceForPay, setSelectedInvoiceForPay] = useState(null);

  // Filter invoices
  const filteredInvoices = invoices.filter(inv => {
    const matchesStatus = statusFilter === 'ALL' || inv.payment_status === statusFilter;
    const term = searchTerm.toLowerCase();
    const patientName = inv.patient?.full_name?.toLowerCase() || '';
    const invNumber = inv.invoice_number?.toLowerCase() || '';
    const ref = inv.payment_reference?.toLowerCase() || '';
    const orNum = inv.official_receipt_number?.toLowerCase() || '';

    const matchesSearch = patientName.includes(term) || 
                          invNumber.includes(term) || 
                          ref.includes(term) || 
                          orNum.includes(term);

    return matchesStatus && matchesSearch;
  });

  const handleCancel = async (invId) => {
    const reason = window.prompt('Reason for voiding/cancelling this invoice:');
    if (!reason) return;
    const fd = new FormData();
    fd.append('invoice_id', invId);
    fd.append('reason', reason);
    await cancelInvoice(fd);
  };

  return (
    <div className="space-y-4">
      
      {/* Search and Filters Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <Input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search invoice #, patient, GCash ref..."
            className="pl-9 h-10 border-gray-200 rounded-xl text-xs"
          />
        </div>

        <div className="flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
          {['ALL', 'Paid', 'Partially Paid', 'Unpaid', 'Cancelled'].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                statusFilter === st
                  ? 'bg-rose-500 text-white shadow-sm shadow-rose-200'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {st === 'ALL' ? 'All Invoices' : st}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-gray-50/80 border-b border-gray-100 text-gray-500 font-bold uppercase tracking-wider">
              <tr>
                <th className="py-3 px-4">Invoice # & Date</th>
                <th className="py-3 px-4">Patient</th>
                <th className="py-3 px-3 text-right">Subtotal</th>
                <th className="py-3 px-3 text-right">Deductions</th>
                <th className="py-3 px-3 text-right">Amount Due</th>
                <th className="py-3 px-3 text-right">Amount Paid</th>
                <th className="py-3 px-3 text-center">Status</th>
                <th className="py-3 px-3 text-center">Payment Info</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filteredInvoices.length > 0 ? (
                filteredInvoices.map((inv) => {
                  const isPaid = inv.payment_status === 'Paid';
                  const isPartiallyPaid = inv.payment_status === 'Partially Paid';
                  const isCancelled = inv.payment_status === 'Cancelled';
                  const deductions = (parseFloat(inv.philhealth_discount) || 0) + (parseFloat(inv.senior_pwd_discount) || 0);

                  return (
                    <tr key={inv.id} className="hover:bg-rose-50/20 transition-colors">
                      <td className="py-3 px-4">
                        <span className="font-mono font-bold text-gray-900 block">{inv.invoice_number}</span>
                        <span className="text-[11px] text-gray-400">
                          {new Date(inv.created_at).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </span>
                      </td>

                      <td className="py-3 px-4">
                        <span className="font-bold text-gray-800 block">{inv.patient?.full_name || 'Patient'}</span>
                        <span className="text-[11px] text-gray-400">{inv.patient?.contact_number || 'No contact'}</span>
                      </td>

                      <td className="py-3 px-3 text-right font-mono font-medium text-gray-600">
                        {formatPHP(inv.subtotal)}
                      </td>

                      <td className="py-3 px-3 text-right font-mono font-medium text-emerald-700">
                        {deductions > 0 ? `- ${formatPHP(deductions)}` : '—'}
                      </td>

                      <td className="py-3 px-3 text-right font-mono font-bold text-gray-900 text-sm">
                        {formatPHP(inv.amount_due)}
                      </td>

                      <td className="py-3 px-3 text-right font-mono font-bold text-emerald-600">
                        {formatPHP(inv.amount_paid)}
                      </td>

                      <td className="py-3 px-3 text-center">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                          isPaid ? 'bg-emerald-100 text-emerald-800' :
                          isPartiallyPaid ? 'bg-amber-100 text-amber-800' :
                          isCancelled ? 'bg-red-100 text-red-800' :
                          'bg-gray-100 text-gray-700'
                        }`}>
                          {inv.payment_status}
                        </span>
                      </td>

                      <td className="py-3 px-3 text-center text-[11px] text-gray-500">
                        <span className="font-semibold text-gray-700 block">{inv.payment_method}</span>
                        {inv.payment_reference && (
                          <span className="font-mono text-[10px] text-gray-400 block truncate max-w-[120px]">
                            {inv.payment_reference}
                          </span>
                        )}
                      </td>

                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setSelectedInvoiceForPrint(inv)}
                            className="h-8 text-xs font-semibold rounded-lg gap-1 border-gray-200 hover:bg-rose-50 hover:text-rose-600"
                          >
                            <Printer className="w-3.5 h-3.5" /> Receipt
                          </Button>

                          {!isPaid && !isCancelled && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setSelectedInvoiceForPay(inv)}
                              className="h-8 text-xs font-semibold rounded-lg gap-1 bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100"
                            >
                              <Coins className="w-3.5 h-3.5" /> Pay
                            </Button>
                          )}

                          {!isCancelled && !isPaid && (
                            <button
                              type="button"
                              onClick={() => handleCancel(inv.id)}
                              title="Void Invoice"
                              className="p-1.5 text-gray-400 hover:text-red-500 rounded-lg transition-colors"
                            >
                              <Ban className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={9} className="py-10 text-center text-gray-400 text-xs">
                    No invoices match your search or filter.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Printable Receipt Modal */}
      {selectedInvoiceForPrint && (
        <PrintableReceiptModal
          isOpen={!!selectedInvoiceForPrint}
          onClose={() => setSelectedInvoiceForPrint(null)}
          invoice={selectedInvoiceForPrint}
          clinicSettings={clinicSettings}
        />
      )}

      {/* Record Counter Payment Modal */}
      {selectedInvoiceForPay && (
        <CounterPaymentModal
          isOpen={!!selectedInvoiceForPay}
          onClose={() => setSelectedInvoiceForPay(null)}
          invoice={selectedInvoiceForPay}
        />
      )}

    </div>
  );
}
