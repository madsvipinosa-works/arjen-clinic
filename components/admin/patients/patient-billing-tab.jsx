'use client';

import { useState } from 'react';
import { 
  Receipt, Plus, Coins, ShieldCheck, Printer, 
  Clock, CheckCircle2, AlertTriangle, FileText, Ban 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { formatPHP, calculatePhilHealthDeadline } from '@/lib/billing-protocols';
import { InvoiceCreatorModal } from '@/components/admin/billing/invoice-creator-modal';
import { CounterPaymentModal } from '@/components/admin/billing/counter-payment-modal';
import { PrintableReceiptModal } from '@/components/admin/billing/printable-receipt-modal';
import { PhilHealthClaimModal } from '@/components/admin/philhealth/philhealth-claim-modal';
import { PhilHealthStatusModal } from '@/components/admin/philhealth/philhealth-status-modal';

export function PatientBillingTab({ 
  patient, 
  invoices = [], 
  claims = [], 
  clinicSettings = {} 
}) {
  const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState(false);
  const [isClaimModalOpen, setIsClaimModalOpen] = useState(false);
  const [selectedInvoiceForPrint, setSelectedInvoiceForPrint] = useState(null);
  const [selectedInvoiceForPay, setSelectedInvoiceForPay] = useState(null);
  const [selectedClaimForStatus, setSelectedClaimForStatus] = useState(null);

  // Financial Aggregations
  const totalBilled = invoices.reduce((acc, inv) => acc + (parseFloat(inv.amount_due) || 0), 0);
  const totalPaid = invoices.reduce((acc, inv) => acc + (parseFloat(inv.amount_paid) || 0), 0);
  const outstandingBalance = Math.max(0, totalBilled - totalPaid);
  const totalPhilHealthDeductions = invoices.reduce((acc, inv) => acc + (parseFloat(inv.philhealth_discount) || 0), 0);

  return (
    <div className="space-y-6">

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-white border border-gray-100 shadow-sm space-y-1">
          <p className="text-[10px] uppercase font-bold text-gray-400">Total Billed Due</p>
          <p className="text-xl font-bold font-mono text-gray-900">{formatPHP(totalBilled)}</p>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-gray-100 shadow-sm space-y-1">
          <p className="text-[10px] uppercase font-bold text-gray-400">Total Payments Recorded</p>
          <p className="text-xl font-bold font-mono text-emerald-600">{formatPHP(totalPaid)}</p>
        </div>

        <div className={`p-4 rounded-2xl border shadow-sm space-y-1 ${
          outstandingBalance > 0 ? 'bg-red-50/60 border-red-200' : 'bg-white border-gray-100'
        }`}>
          <p className="text-[10px] uppercase font-bold text-gray-400">Outstanding Balance</p>
          <p className={`text-xl font-bold font-mono ${outstandingBalance > 0 ? 'text-red-600' : 'text-gray-900'}`}>
            {formatPHP(outstandingBalance)}
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-gray-100 shadow-sm space-y-1">
          <p className="text-[10px] uppercase font-bold text-gray-400">PhilHealth Coverage</p>
          <p className="text-xl font-bold font-mono text-blue-600">{formatPHP(totalPhilHealthDeductions)}</p>
        </div>
      </div>

      {/* ── Section 1: Invoices & Receipts ── */}
      <Card className="border-none shadow-md overflow-hidden">
        <CardHeader className="border-b bg-gray-50/50 pb-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <CardTitle className="text-lg font-bold flex items-center gap-2 text-gray-900">
                <Receipt className="w-5 h-5 text-rose-500" />
                Clinic Invoices & Counter Receipts
              </CardTitle>
              <CardDescription className="text-xs text-gray-500">
                Itemized bills, cash & GCash counter payments, and printable Official Receipts for this patient.
              </CardDescription>
            </div>
            <Button
              onClick={() => setIsInvoiceModalOpen(true)}
              className="bg-rose-500 hover:bg-rose-600 text-white font-bold rounded-xl text-xs gap-1.5 shadow-sm shadow-rose-200"
            >
              <Plus className="w-3.5 h-3.5" /> New Invoice
            </Button>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-gray-50/70 border-b border-gray-100 text-gray-400 font-bold uppercase">
                <tr>
                  <th className="py-2.5 px-4">Invoice #</th>
                  <th className="py-2.5 px-3">Date</th>
                  <th className="py-2.5 px-3 text-right">Amount Due</th>
                  <th className="py-2.5 px-3 text-right">Paid</th>
                  <th className="py-2.5 px-3 text-center">Status</th>
                  <th className="py-2.5 px-3 text-center">Method / Ref</th>
                  <th className="py-2.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {invoices.length > 0 ? (
                  invoices.map((inv) => {
                    const isPaid = inv.payment_status === 'Paid';
                    const isPartiallyPaid = inv.payment_status === 'Partially Paid';
                    const isCancelled = inv.payment_status === 'Cancelled';

                    return (
                      <tr key={inv.id} className="hover:bg-gray-50/50">
                        <td className="py-2.5 px-4 font-mono font-bold text-gray-900">
                          {inv.invoice_number}
                        </td>
                        <td className="py-2.5 px-3 text-gray-500">
                          {new Date(inv.created_at).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono font-bold text-gray-800">
                          {formatPHP(inv.amount_due)}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono font-bold text-emerald-600">
                          {formatPHP(inv.amount_paid)}
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                            isPaid ? 'bg-emerald-100 text-emerald-800' :
                            isPartiallyPaid ? 'bg-amber-100 text-amber-800' :
                            isCancelled ? 'bg-red-100 text-red-800' :
                            'bg-gray-100 text-gray-700'
                          }`}>
                            {inv.payment_status}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-center text-gray-500">
                          <span className="font-semibold text-gray-700">{inv.payment_method}</span>
                          {inv.payment_reference && (
                            <span className="font-mono text-[10px] text-gray-400 block truncate max-w-[100px] mx-auto">
                              {inv.payment_reference}
                            </span>
                          )}
                        </td>
                        <td className="py-2.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setSelectedInvoiceForPrint(inv)}
                              className="h-7 text-xs font-semibold rounded-lg gap-1 border-gray-200 hover:bg-rose-50 hover:text-rose-600"
                            >
                              <Printer className="w-3 h-3" /> Receipt
                            </Button>

                            {!isPaid && !isCancelled && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setSelectedInvoiceForPay(inv)}
                                className="h-7 text-xs font-semibold rounded-lg gap-1 bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100"
                              >
                                <Coins className="w-3 h-3" /> Pay
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-gray-400 text-xs italic">
                      No invoices recorded for this patient yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* ── Section 2: PhilHealth Claims ── */}
      <Card className="border-none shadow-md overflow-hidden">
        <CardHeader className="border-b bg-gray-50/50 pb-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <CardTitle className="text-lg font-bold flex items-center gap-2 text-gray-900">
                <ShieldCheck className="w-5 h-5 text-blue-600" />
                PhilHealth MCP & NCP Claims Tracker
              </CardTitle>
              <CardDescription className="text-xs text-gray-500">
                Statutory 60-day claims tracking for Maternal Care Package and Newborn Care Package reimbursements.
              </CardDescription>
            </div>
            <Button
              onClick={() => setIsClaimModalOpen(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs gap-1.5 shadow-sm shadow-blue-200"
            >
              <Plus className="w-3.5 h-3.5" /> File PhilHealth Claim
            </Button>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-gray-50/70 border-b border-gray-100 text-gray-400 font-bold uppercase">
                <tr>
                  <th className="py-2.5 px-4">Series #</th>
                  <th className="py-2.5 px-3">Package</th>
                  <th className="py-2.5 px-3 text-right">Benefit Rate</th>
                  <th className="py-2.5 px-3">Delivery Date</th>
                  <th className="py-2.5 px-3">60-Day Deadline</th>
                  <th className="py-2.5 px-3 text-center">Pipeline Status</th>
                  <th className="py-2.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {claims.length > 0 ? (
                  claims.map((claim) => {
                    const deadline = calculatePhilHealthDeadline(claim.date_of_delivery);

                    return (
                      <tr key={claim.id} className="hover:bg-gray-50/50">
                        <td className="py-2.5 px-4 font-mono font-bold text-blue-700">
                          {claim.claim_series_number}
                        </td>
                        <td className="py-2.5 px-3 font-semibold text-gray-800">
                          {claim.package_type}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono font-bold text-gray-800">
                          {formatPHP(claim.claim_amount)}
                        </td>
                        <td className="py-2.5 px-3 text-gray-600">
                          {claim.date_of_delivery}
                        </td>
                        <td className="py-2.5 px-3">
                          <span className={`px-2 py-0.5 rounded-full font-bold text-[10px] ${
                            deadline.isExpired ? 'bg-red-100 text-red-800' :
                            deadline.isCritical ? 'bg-amber-100 text-amber-900' :
                            'bg-emerald-100 text-emerald-800'
                          }`}>
                            {deadline.statusLabel}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <span className="px-2 py-0.5 rounded-full font-bold text-[10px] bg-blue-100 text-blue-800 uppercase">
                            {claim.status}
                          </span>
                        </td>
                        <td className="py-2.5 px-4 text-right">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setSelectedClaimForStatus(claim)}
                            className="h-7 text-xs font-semibold rounded-lg border-gray-200 hover:bg-blue-50 hover:text-blue-700"
                          >
                            Update Stage
                          </Button>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-gray-400 text-xs italic">
                      No PhilHealth claims filed for this patient.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Modals */}
      {isInvoiceModalOpen && (
        <InvoiceCreatorModal
          isOpen={isInvoiceModalOpen}
          onClose={() => setIsInvoiceModalOpen(false)}
          patients={[patient]}
          preselectedPatientId={patient.id}
        />
      )}

      {isClaimModalOpen && (
        <PhilHealthClaimModal
          isOpen={isClaimModalOpen}
          onClose={() => setIsClaimModalOpen(false)}
          patients={[patient]}
          preselectedPatientId={patient.id}
          invoices={invoices}
        />
      )}

      {selectedInvoiceForPrint && (
        <PrintableReceiptModal
          isOpen={!!selectedInvoiceForPrint}
          onClose={() => setSelectedInvoiceForPrint(null)}
          invoice={{ ...selectedInvoiceForPrint, patient }}
          clinicSettings={clinicSettings}
        />
      )}

      {selectedInvoiceForPay && (
        <CounterPaymentModal
          isOpen={!!selectedInvoiceForPay}
          onClose={() => setSelectedInvoiceForPay(null)}
          invoice={selectedInvoiceForPay}
        />
      )}

      {selectedClaimForStatus && (
        <PhilHealthStatusModal
          isOpen={!!selectedClaimForStatus}
          onClose={() => setSelectedClaimForStatus(null)}
          claim={selectedClaimForStatus}
        />
      )}

    </div>
  );
}
