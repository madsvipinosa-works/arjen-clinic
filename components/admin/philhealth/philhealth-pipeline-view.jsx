'use client';

import { useState } from 'react';
import { 
  ShieldCheck, AlertTriangle, Clock, CheckCircle2, 
  Send, XCircle, Search, Filter, Calendar, User, ArrowRight
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { formatPHP, calculatePhilHealthDeadline } from '@/lib/billing-protocols';
import { PhilHealthStatusModal } from './philhealth-status-modal';

const PIPELINE_COLUMNS = [
  { id: 'Draft', title: 'Draft / Preparation', subtitle: 'Preparing CF1, CF2 & MDR', color: 'border-gray-200 bg-gray-50/60' },
  { id: 'Transmitted', title: 'Transmitted', subtitle: 'Submitted to PhilHealth LHIO', color: 'border-blue-200 bg-blue-50/40' },
  { id: 'In Process', title: 'In Process', subtitle: 'Under adjudication', color: 'border-purple-200 bg-purple-50/40' },
  { id: 'Approved_Reimbursed', title: 'Reimbursed', subtitle: 'Credit / Cheque received', color: 'border-emerald-200 bg-emerald-50/40' },
  { id: 'Denied_Returned', title: 'Denied / RTH', subtitle: 'Returned to Hospital', color: 'border-red-200 bg-red-50/40' },
];

export function PhilHealthPipelineView({ claims = [] }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [packageFilter, setPackageFilter] = useState('ALL');
  const [selectedClaimForStatus, setSelectedClaimForStatus] = useState(null);

  // Filter Claims
  const filteredClaims = claims.filter(c => {
    const matchesPackage = packageFilter === 'ALL' || c.package_type === packageFilter;
    const term = searchTerm.toLowerCase();
    const patientName = c.patient?.full_name?.toLowerCase() || '';
    const series = c.claim_series_number?.toLowerCase() || '';
    const pin = c.philhealth_member_id?.toLowerCase() || '';

    const matchesSearch = patientName.includes(term) || series.includes(term) || pin.includes(term);
    return matchesPackage && matchesSearch;
  });

  // Calculate Critical Statutory 60-Day Claims (< 15 days remaining or expired in active pipeline)
  const criticalStatutoryClaims = claims.filter(c => {
    if (c.status === 'Approved_Reimbursed' || c.status === 'Denied_Returned') return false;
    const metrics = calculatePhilHealthDeadline(c.date_of_delivery);
    return metrics.isCritical || metrics.isExpired;
  });

  return (
    <div className="space-y-6">

      {/* 60-Day Statutory Deadline Urgency Banner */}
      {criticalStatutoryClaims.length > 0 && (
        <div className="p-4 rounded-2xl bg-gradient-to-r from-red-500 via-rose-500 to-pink-600 text-white shadow-md space-y-2">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-amber-200 flex-shrink-0 animate-bounce" />
            <h3 className="text-sm font-bold tracking-tight">
              Statutory 60-Day PhilHealth Filing Deadline Alert ({criticalStatutoryClaims.length} Pending Claim{criticalStatutoryClaims.length > 1 ? 's' : ''} at Risk)
            </h3>
          </div>
          <p className="text-xs text-white/90">
            Section 40, RA 7875 requires all claims to be filed within 60 days of delivery. The following claims are approaching expiration or require immediate transmission:
          </p>
          <div className="flex flex-wrap gap-2 pt-1">
            {criticalStatutoryClaims.map(c => {
              const m = calculatePhilHealthDeadline(c.date_of_delivery);
              return (
                <button
                  key={c.id}
                  onClick={() => setSelectedClaimForStatus(c)}
                  className="px-2.5 py-1 rounded-xl bg-white/20 hover:bg-white/30 backdrop-blur-sm border border-white/30 text-xs font-semibold flex items-center gap-1.5 transition-colors"
                >
                  <span>{c.claim_series_number}:</span>
                  <span className="font-bold">{c.patient?.full_name}</span>
                  <span className="bg-red-900/60 text-amber-200 px-1.5 py-0.2 rounded text-[10px] uppercase font-black">
                    {m.statusLabel}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <Input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search series #, patient name, PIN..."
            className="pl-9 h-10 border-gray-200 rounded-xl text-xs"
          />
        </div>

        <div className="flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
          {['ALL', 'MCP', 'NCP', 'MCP+NCP'].map((pkg) => (
            <button
              key={pkg}
              onClick={() => setPackageFilter(pkg)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                packageFilter === pkg
                  ? 'bg-blue-600 text-white shadow-sm shadow-blue-200'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {pkg === 'ALL' ? 'All Packages' : pkg}
            </button>
          ))}
        </div>
      </div>

      {/* Kanban Pipeline Columns */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 items-start">
        {PIPELINE_COLUMNS.map((col) => {
          const colClaims = filteredClaims.filter(c => c.status === col.id);

          return (
            <div key={col.id} className={`rounded-2xl border ${col.color} p-3.5 space-y-3 min-h-[500px] flex flex-col`}>
              
              {/* Column Header */}
              <div className="flex items-center justify-between pb-2 border-b border-gray-200/60">
                <div>
                  <h4 className="text-xs font-bold text-gray-800 uppercase tracking-wider">{col.title}</h4>
                  <p className="text-[10px] text-gray-500">{col.subtitle}</p>
                </div>
                <span className="w-5 h-5 rounded-full bg-white text-gray-700 text-xs font-black flex items-center justify-center border border-gray-200">
                  {colClaims.length}
                </span>
              </div>

              {/* Cards List */}
              <div className="space-y-2.5 flex-1 overflow-y-auto">
                {colClaims.length > 0 ? (
                  colClaims.map((claim) => {
                    const deadline = calculatePhilHealthDeadline(claim.date_of_delivery);

                    return (
                      <div 
                        key={claim.id}
                        className="p-3.5 rounded-xl bg-white border border-gray-200/80 shadow-sm hover:shadow transition-shadow space-y-2.5 text-xs"
                      >
                        {/* Top Line: Series & Package */}
                        <div className="flex items-center justify-between">
                          <span className="font-mono font-bold text-blue-700">{claim.claim_series_number}</span>
                          <span className="px-1.5 py-0.5 rounded font-black text-[10px] bg-blue-100 text-blue-800">
                            {claim.package_type}
                          </span>
                        </div>

                        {/* Patient & Details */}
                        <div>
                          <p className="font-bold text-gray-900 text-sm">{claim.patient?.full_name || 'Patient'}</p>
                          <p className="text-[11px] text-gray-500 font-mono">
                            PIN: {claim.philhealth_member_id || 'Not on file'}
                          </p>
                        </div>

                        {/* Financial Amount */}
                        <div className="flex items-center justify-between text-[11px] pt-1 border-t border-gray-100">
                          <span className="text-gray-400">Claim Amount:</span>
                          <span className="font-mono font-bold text-gray-800">{formatPHP(claim.claim_amount)}</span>
                        </div>

                        {/* Statutory 60-Day Deadline Pill */}
                        <div className="pt-0.5">
                          <div className={`p-1.5 rounded-lg border text-[10px] flex items-center justify-between font-bold ${
                            deadline.isExpired ? 'bg-red-50 text-red-800 border-red-200' :
                            deadline.isCritical ? 'bg-amber-50 text-amber-900 border-amber-200' :
                            'bg-gray-50 text-gray-600 border-gray-200'
                          }`}>
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              <span>Delivery: {claim.date_of_delivery}</span>
                            </span>
                            <span className="font-black">{deadline.statusLabel}</span>
                          </div>
                        </div>

                        {/* Reimbursed / Reference Information */}
                        {claim.status === 'Approved_Reimbursed' && (
                          <div className="p-2 rounded-lg bg-emerald-50 text-emerald-800 text-[10px] space-y-0.5 border border-emerald-200">
                            <p className="font-bold">Reimbursed: {claim.reimbursed_date}</p>
                            {claim.check_or_reference_number && (
                              <p className="font-mono">Ref: {claim.check_or_reference_number}</p>
                            )}
                          </div>
                        )}

                        {/* Return to Hospital / Denial Reason */}
                        {claim.status === 'Denied_Returned' && claim.denial_reason && (
                          <div className="p-2 rounded-lg bg-red-50 text-red-800 text-[10px] space-y-0.5 border border-red-200">
                            <p className="font-bold">RTH Reason:</p>
                            <p className="italic">{claim.denial_reason}</p>
                          </div>
                        )}

                        {/* Action: Advance Stage */}
                        <div className="pt-1">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setSelectedClaimForStatus(claim)}
                            className="w-full h-7 text-[11px] font-bold rounded-lg gap-1 border-gray-200 hover:bg-blue-50 hover:text-blue-700 hover:border-blue-200 transition-colors"
                          >
                            <span>Update Stage</span>
                            <ArrowRight className="w-3 h-3" />
                          </Button>
                        </div>

                      </div>
                    );
                  })
                ) : (
                  <div className="py-8 text-center text-gray-400 text-xs italic">
                    No claims in this stage.
                  </div>
                )}
              </div>

            </div>
          );
        })}
      </div>

      {/* Advance Stage Modal */}
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
