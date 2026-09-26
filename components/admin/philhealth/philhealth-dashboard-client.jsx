'use client';

import { useState } from 'react';
import { 
  ShieldCheck, Plus, AlertTriangle, CheckCircle2, 
  Clock, DollarSign, FileText, Send 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { formatPHP, calculatePhilHealthDeadline } from '@/lib/billing-protocols';
import { PhilHealthPipelineView } from './philhealth-pipeline-view';
import { PhilHealthClaimModal } from './philhealth-claim-modal';

export function PhilHealthDashboardClient({ claims = [], patients = [], invoices = [] }) {
  const [isClaimModalOpen, setIsClaimModalOpen] = useState(false);

  // Compute Metrics
  const activePipelineClaims = claims.filter(c => c.status !== 'Approved_Reimbursed' && c.status !== 'Denied_Returned');
  const totalPendingAmount = activePipelineClaims.reduce((acc, c) => acc + (parseFloat(c.claim_amount) || 0), 0);
  
  const reimbursedClaims = claims.filter(c => c.status === 'Approved_Reimbursed');
  const totalReimbursedAmount = reimbursedClaims.reduce((acc, c) => acc + (parseFloat(c.claim_amount) || 0), 0);

  const criticalDeadlineCount = claims.filter(c => {
    if (c.status === 'Approved_Reimbursed' || c.status === 'Denied_Returned') return false;
    const m = calculatePhilHealthDeadline(c.date_of_delivery);
    return m.isCritical || m.isExpired;
  }).length;

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900 flex items-center gap-2.5">
            <ShieldCheck className="h-7 w-7 text-blue-600" />
            PhilHealth MCP & NCP Claims Tracker
          </h1>
          <p className="text-xs text-gray-500 mt-1">
            Maternal Care Package (₱6,500) & Newborn Care Package (₱1,750) lifecycle. Enforces statutory 60-day filing limits.
          </p>
        </div>

        <Button
          onClick={() => setIsClaimModalOpen(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-2xl gap-2 shadow-sm shadow-blue-200 h-11 px-5"
        >
          <Plus className="w-4 h-4" /> File PhilHealth Claim
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Active Claims in Pipeline */}
        <Card className="rounded-2xl border-gray-100 shadow-sm bg-gradient-to-br from-blue-50/50 via-white to-white overflow-hidden">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Active in Pipeline</span>
              <div className="w-8 h-8 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center">
                <Send className="w-4 h-4" />
              </div>
            </div>
            <p className="text-2xl font-black font-mono text-gray-900 mt-3">{activePipelineClaims.length}</p>
            <p className="text-[11px] text-gray-400 mt-2">
              Claims undergoing preparation & LHIO review
            </p>
          </CardContent>
        </Card>

        {/* Pending Reimbursement Value */}
        <Card className="rounded-2xl border-gray-100 shadow-sm bg-gradient-to-br from-purple-50/50 via-white to-white overflow-hidden">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Pending Reimbursement</span>
              <div className="w-8 h-8 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center">
                <Clock className="w-4 h-4" />
              </div>
            </div>
            <p className="text-2xl font-black font-mono text-purple-700 mt-3">{formatPHP(totalPendingAmount)}</p>
            <p className="text-[11px] text-gray-400 mt-2">
              Projected receivable from PhilHealth LHIO
            </p>
          </CardContent>
        </Card>

        {/* Total Reimbursed to Date */}
        <Card className="rounded-2xl border-gray-100 shadow-sm bg-gradient-to-br from-emerald-50/50 via-white to-white overflow-hidden">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Total Reimbursed</span>
              <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
                <CheckCircle2 className="w-4 h-4" />
              </div>
            </div>
            <p className="text-2xl font-black font-mono text-emerald-700 mt-3">{formatPHP(totalReimbursedAmount)}</p>
            <p className="text-[11px] text-gray-400 mt-2">
              {reimbursedClaims.length} cheques/credits credited to clinic
            </p>
          </CardContent>
        </Card>

        {/* 60-Day Critical Expiry Alerts */}
        <Card className="rounded-2xl border-gray-100 shadow-sm bg-gradient-to-br from-red-50/50 via-white to-white overflow-hidden">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Critical 60-Day Expiry</span>
              <div className="w-8 h-8 rounded-xl bg-red-100 text-red-700 flex items-center justify-center">
                <AlertTriangle className="w-4 h-4" />
              </div>
            </div>
            <p className="text-2xl font-black font-mono text-red-600 mt-3">{criticalDeadlineCount}</p>
            <p className="text-[11px] text-gray-400 mt-2">
              Claims with ≤ 15 days left before legal forfeiture
            </p>
          </CardContent>
        </Card>

      </div>

      {/* Claims Pipeline Board */}
      <PhilHealthPipelineView claims={claims} />

      {/* Claim Filing Modal */}
      {isClaimModalOpen && (
        <PhilHealthClaimModal
          isOpen={isClaimModalOpen}
          onClose={() => setIsClaimModalOpen(false)}
          patients={patients}
          invoices={invoices}
        />
      )}

    </div>
  );
}
