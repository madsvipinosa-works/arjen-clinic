'use client';

import React, { useState } from 'react';
import { 
  ShieldCheck, ShieldAlert, ScrollText, Search, Filter, 
  Calendar, Clock, User, Eye, ArrowUpRight, CheckCircle2,
  FileText, Activity, AlertCircle, Sparkles, ChevronDown, ChevronRight
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { formatRoleBadge } from '@/lib/rbac';

const ACTION_COLORS = {
  LOG_PRENATAL_VISIT: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  RECORD_DELIVERY_EINC: 'bg-rose-100 text-rose-800 border-rose-200',
  REGISTER_WALKIN: 'bg-blue-100 text-blue-800 border-blue-200',
  EXPORT_CLINICAL_SUMMARY: 'bg-purple-100 text-purple-800 border-purple-200',
  UPDATE_TRIAGE_STATUS: 'bg-sky-100 text-sky-800 border-sky-200',
  RECORD_LAB_PANEL: 'bg-teal-100 text-teal-800 border-teal-200',
  DELETE_VISIT_LOG: 'bg-red-100 text-red-800 border-red-200',
  DELETE_LAB_PANEL: 'bg-red-100 text-red-800 border-red-200',
  UPDATE_VITALS: 'bg-amber-100 text-amber-800 border-amber-200',
  LOGIN: 'bg-gray-100 text-gray-800 border-gray-200',
};

export function AuditLogsViewer({ logs = [], currentUserRole = 'admin' }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [actionFilter, setActionFilter] = useState('ALL');
  const [roleFilter, setRoleFilter] = useState('ALL');
  const [expandedLogId, setExpandedLogId] = useState(null);

  // Filter logs
  const filteredLogs = logs.filter(log => {
    const matchesAction = actionFilter === 'ALL' || log.action === actionFilter;
    const matchesRole = roleFilter === 'ALL' || (log.user_role?.toLowerCase() === roleFilter.toLowerCase());
    
    const term = searchTerm.toLowerCase();
    const email = log.user_email?.toLowerCase() || '';
    const act = log.action?.toLowerCase() || '';
    const entity = log.entity_type?.toLowerCase() || '';
    const detailsStr = JSON.stringify(log.details || {}).toLowerCase();

    const matchesSearch = email.includes(term) || act.includes(term) || entity.includes(term) || detailsStr.includes(term);

    return matchesAction && matchesRole && matchesSearch;
  });

  const toggleExpand = (id) => {
    setExpandedLogId(prev => (prev === id ? null : id));
  };

  return (
    <div className="space-y-6">

      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-slate-900 text-white flex items-center justify-center shadow-sm">
              <ScrollText className="w-5 h-5 text-rose-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-gray-900">
                Medical Audit Trail & PHI Access Logs
              </h1>
              <p className="text-xs text-gray-500 mt-0.5">
                Append-only surveillance log recording every creation, update, and export of Protected Health Information.
              </p>
            </div>
          </div>
        </div>

        {/* DPA 2012 Statutory Compliance Badge */}
        <div className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-emerald-50 border border-emerald-200 shadow-xs">
          <ShieldCheck className="w-5 h-5 text-emerald-600 flex-shrink-0" />
          <div className="text-left">
            <span className="block text-[11px] font-black uppercase text-emerald-800 tracking-wider">
              DPA of 2012 (RA 10173) Compliant
            </span>
            <span className="block text-[10px] text-emerald-600 font-medium">
              Immutable Append-Only Surveillance Log
            </span>
          </div>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        <Card className="rounded-2xl border-gray-100 shadow-sm bg-white overflow-hidden">
          <CardContent className="p-4">
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Total Recorded Events</span>
            <p className="text-2xl font-black font-mono text-gray-900 mt-1">{logs.length}</p>
            <p className="text-[11px] text-gray-400 mt-1">Immutable ledger entries</p>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-gray-100 shadow-sm bg-white overflow-hidden">
          <CardContent className="p-4">
            <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider">Prenatal Visits Logged</span>
            <p className="text-2xl font-black font-mono text-emerald-700 mt-1">
              {logs.filter(l => l.action === 'LOG_PRENATAL_VISIT').length}
            </p>
            <p className="text-[11px] text-gray-400 mt-1">Antenatal consultations</p>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-gray-100 shadow-sm bg-white overflow-hidden">
          <CardContent className="p-4">
            <span className="text-[10px] font-bold text-rose-600 uppercase tracking-wider">Delivery & EINC Logs</span>
            <p className="text-2xl font-black font-mono text-rose-700 mt-1">
              {logs.filter(l => l.action === 'RECORD_DELIVERY_EINC').length}
            </p>
            <p className="text-[11px] text-gray-400 mt-1">Unang Yakap protocols</p>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-gray-100 shadow-sm bg-white overflow-hidden">
          <CardContent className="p-4">
            <span className="text-[10px] font-bold text-purple-600 uppercase tracking-wider">PHI Record Exports</span>
            <p className="text-2xl font-black font-mono text-purple-700 mt-1">
              {logs.filter(l => l.action === 'EXPORT_CLINICAL_SUMMARY').length}
            </p>
            <p className="text-[11px] text-gray-400 mt-1">Printed medical summaries</p>
          </CardContent>
        </Card>

      </div>

      {/* Search & Filter Bar */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
        
        {/* Search */}
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <Input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search email, action, entity, details..."
            className="pl-9 h-10 border-gray-200 rounded-xl text-xs"
          />
        </div>

        {/* Action Filter Chips */}
        <div className="flex items-center gap-1.5 w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
          {[
            { id: 'ALL', label: 'All Actions' },
            { id: 'LOG_PRENATAL_VISIT', label: 'Prenatal Visits' },
            { id: 'RECORD_DELIVERY_EINC', label: 'Delivery / EINC' },
            { id: 'REGISTER_WALKIN', label: 'Walk-ins' },
            { id: 'EXPORT_CLINICAL_SUMMARY', label: 'Record Exports' },
            { id: 'RECORD_LAB_PANEL', label: 'Lab Panels' },
            { id: 'UPDATE_TRIAGE_STATUS', label: 'Triage Queue' },
          ].map((act) => (
            <button
              key={act.id}
              onClick={() => setActionFilter(act.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                actionFilter === act.id
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {act.label}
            </button>
          ))}
        </div>

      </div>

      {/* Main Audit Log Table */}
      <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-gray-50/80 border-b border-gray-100 text-gray-500 font-bold uppercase tracking-wider">
              <tr>
                <th className="py-3.5 px-4 w-10"></th>
                <th className="py-3.5 px-3">Timestamp (PHT)</th>
                <th className="py-3.5 px-4">Staff Member</th>
                <th className="py-3.5 px-3">Clinical Role</th>
                <th className="py-3.5 px-3">Action Tag</th>
                <th className="py-3.5 px-3">Entity Type</th>
                <th className="py-3.5 px-4">Details Summary</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filteredLogs.length > 0 ? (
                filteredLogs.map((log) => {
                  const roleBadge = formatRoleBadge(log.user_role);
                  const isExpanded = expandedLogId === log.id;
                  const dateObj = new Date(log.created_at);
                  const formattedDate = dateObj.toLocaleDateString('en-PH', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  });
                  const formattedTime = dateObj.toLocaleTimeString('en-PH', {
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit',
                  });

                  const actionColor = ACTION_COLORS[log.action] || 'bg-gray-100 text-gray-800 border-gray-200';

                  return (
                    <React.Fragment key={log.id}>
                      <tr 
                        onClick={() => toggleExpand(log.id)}
                        className="hover:bg-slate-50/60 cursor-pointer transition-colors"
                      >
                        <td className="py-3 px-4 text-gray-400">
                          {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                        </td>

                        <td className="py-3 px-3 whitespace-nowrap">
                          <span className="font-semibold text-gray-900 block">{formattedDate}</span>
                          <span className="text-[11px] text-gray-400 font-mono">{formattedTime} PHT</span>
                        </td>

                        <td className="py-3 px-4">
                          <span className="font-bold text-gray-800 block truncate max-w-[200px]">{log.user_email}</span>
                          <span className="text-[10px] text-gray-400 font-mono block">UID: {log.user_id ? log.user_id.slice(0, 8) : 'sys'}</span>
                        </td>

                        <td className="py-3 px-3">
                          <span className={`inline-flex px-2.5 py-0.5 rounded-full text-[10px] font-black border uppercase tracking-wider ${roleBadge.badgeClass}`}>
                            {roleBadge.shortLabel}
                          </span>
                        </td>

                        <td className="py-3 px-3">
                          <span className={`inline-flex px-2.5 py-1 rounded-lg text-[10px] font-mono font-bold border uppercase tracking-wider ${actionColor}`}>
                            {log.action}
                          </span>
                        </td>

                        <td className="py-3 px-3">
                          <span className="font-mono text-[11px] font-semibold text-gray-700 bg-gray-100 px-2 py-0.5 rounded-md">
                            {log.entity_type}
                          </span>
                        </td>

                        <td className="py-3 px-4">
                          <span className="text-gray-600 block truncate max-w-xs font-mono text-[11px]">
                            {JSON.stringify(log.details || {})}
                          </span>
                        </td>
                      </tr>

                      {/* Expandable JSON Detail Drawer */}
                      {isExpanded && (
                        <tr className="bg-slate-50/90 border-b border-gray-100">
                          <td colSpan={7} className="p-4 pl-12 space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500">
                                Immutable Audit Event Metadata (ID: {log.id})
                              </span>
                              <span className="text-[10px] text-gray-400 font-mono">
                                Entity ID: {log.entity_id || 'N/A'}
                              </span>
                            </div>
                            <pre className="p-3 rounded-xl bg-slate-900 text-emerald-400 text-xs font-mono overflow-x-auto border border-slate-800">
                              {JSON.stringify({
                                event_id: log.id,
                                timestamp_utc: log.created_at,
                                staff_email: log.user_email,
                                staff_role: log.user_role,
                                action: log.action,
                                target_table: log.entity_type,
                                target_id: log.entity_id,
                                metadata: log.details,
                              }, null, 2)}
                            </pre>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-gray-400 text-xs italic">
                    No audit log records match the selected filter.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
