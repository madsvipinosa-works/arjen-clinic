'use client';

import { useState } from 'react';
import { 
  Plus, Receipt, Coins, ArrowUpRight, TrendingUp, 
  ShieldCheck, AlertCircle, Wallet, CheckCircle2 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { formatPHP } from '@/lib/billing-protocols';
import { InvoicesTable } from './invoices-table';
import { InvoiceCreatorModal } from './invoice-creator-modal';

export function BillingDashboardClient({ 
  invoices = [], 
  patients = [], 
  clinicSettings = {} 
}) {
  const [isCreatorOpen, setIsCreatorOpen] = useState(false);

  // Compute Metrics
  const todayStr = new Date().toISOString().split('T')[0];

  const todayInvoices = invoices.filter(inv => {
    return inv.created_at && inv.created_at.startsWith(todayStr);
  });

  const todayCollections = todayInvoices.reduce((acc, inv) => acc + (parseFloat(inv.amount_paid) || 0), 0);
  
  const todayCash = todayInvoices
    .filter(inv => inv.payment_method === 'Cash')
    .reduce((acc, inv) => acc + (parseFloat(inv.amount_paid) || 0), 0);

  const todayGCash = todayInvoices
    .filter(inv => inv.payment_method === 'GCash')
    .reduce((acc, inv) => acc + (parseFloat(inv.amount_paid) || 0), 0);

  const totalUnpaidBalance = invoices
    .filter(inv => inv.payment_status === 'Unpaid' || inv.payment_status === 'Partially Paid')
    .reduce((acc, inv) => {
      const due = parseFloat(inv.amount_due) || 0;
      const paid = parseFloat(inv.amount_paid) || 0;
      return acc + Math.max(0, due - paid);
    }, 0);

  const totalPhilHealthDeducted = invoices
    .reduce((acc, inv) => acc + (parseFloat(inv.philhealth_discount) || 0), 0);

  return (
    <div className="space-y-6">
      
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900 flex items-center gap-2.5">
            <Receipt className="h-7 w-7 text-rose-500" />
            Clinic Cashiering & Billing Ledger
          </h1>
          <p className="text-xs text-gray-500 mt-1">
            Internal administrative counter ledger. Record cash, manual GCash references, and issue official patient receipts.
          </p>
        </div>

        <Button
          onClick={() => setIsCreatorOpen(true)}
          className="bg-rose-500 hover:bg-rose-600 text-white font-bold rounded-2xl gap-2 shadow-sm shadow-rose-200 h-11 px-5"
        >
          <Plus className="w-4 h-4" /> Create Invoice / Counter Payment
        </Button>
      </div>

      {/* KPI Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Today's Collections */}
        <Card className="rounded-2xl border-gray-100 shadow-sm bg-gradient-to-br from-emerald-50/50 via-white to-white overflow-hidden">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Today&apos;s Collections</span>
              <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
                <Coins className="w-4 h-4" />
              </div>
            </div>
            <p className="text-2xl font-black font-mono text-gray-900 mt-3">{formatPHP(todayCollections)}</p>
            <div className="flex items-center gap-3 mt-2 text-[11px] text-gray-500">
              <span>Cash: <strong className="text-gray-800 font-mono">{formatPHP(todayCash)}</strong></span>
              <span>•</span>
              <span>GCash: <strong className="text-gray-800 font-mono">{formatPHP(todayGCash)}</strong></span>
            </div>
          </CardContent>
        </Card>

        {/* Outstanding Unpaid Balances */}
        <Card className="rounded-2xl border-gray-100 shadow-sm bg-gradient-to-br from-amber-50/50 via-white to-white overflow-hidden">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Outstanding Balances</span>
              <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center">
                <AlertCircle className="w-4 h-4" />
              </div>
            </div>
            <p className="text-2xl font-black font-mono text-amber-700 mt-3">{formatPHP(totalUnpaidBalance)}</p>
            <p className="text-[11px] text-gray-400 mt-2">
              Unsettled patient account receivables
            </p>
          </CardContent>
        </Card>

        {/* PhilHealth Total Deductions */}
        <Card className="rounded-2xl border-gray-100 shadow-sm bg-gradient-to-br from-blue-50/50 via-white to-white overflow-hidden">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">PhilHealth Deductions</span>
              <div className="w-8 h-8 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center">
                <ShieldCheck className="w-4 h-4" />
              </div>
            </div>
            <p className="text-2xl font-black font-mono text-blue-700 mt-3">{formatPHP(totalPhilHealthDeducted)}</p>
            <p className="text-[11px] text-gray-400 mt-2">
              Total MCP/NCP benefit claimed for mothers
            </p>
          </CardContent>
        </Card>

        {/* Total Invoices Recorded */}
        <Card className="rounded-2xl border-gray-100 shadow-sm bg-gradient-to-br from-rose-50/50 via-white to-white overflow-hidden">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Total Invoices</span>
              <div className="w-8 h-8 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center">
                <Receipt className="w-4 h-4" />
              </div>
            </div>
            <p className="text-2xl font-black font-mono text-gray-900 mt-3">{invoices.length}</p>
            <p className="text-[11px] text-gray-400 mt-2">
              {todayInvoices.length} created today
            </p>
          </CardContent>
        </Card>

      </div>

      {/* Main Ledger Table */}
      <InvoicesTable invoices={invoices} clinicSettings={clinicSettings} />

      {/* Invoice Creator Modal */}
      {isCreatorOpen && (
        <InvoiceCreatorModal
          isOpen={isCreatorOpen}
          onClose={() => setIsCreatorOpen(false)}
          patients={patients}
        />
      )}

    </div>
  );
}
