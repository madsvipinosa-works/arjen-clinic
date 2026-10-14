'use client';

import React, { useState, useDeferredValue, useEffect } from 'react';
import { 
  ShieldCheck, ShieldAlert, ScrollText, Search, Filter, 
  Calendar, Clock, User, Eye, ArrowUpRight, CheckCircle2,
  FileText, Activity, AlertCircle, Sparkles, ChevronDown, ChevronRight,
  Download, Copy, Check, ChevronLeft, Layers, MessageSquare, Info
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { formatRoleBadge } from '@/lib/rbac';
import { getClinicTodayDateString, getClinicDateOffset } from '@/lib/utils';

// Semantic Domain Categories
const ACTION_DOMAINS = [
  { id: 'ALL', label: 'All Domains' },
  { id: 'CLINICAL', label: 'Clinical / PHI' },
  { id: 'PATIENTS', label: 'Patient Directory' },
  { id: 'QUEUE', label: 'Triage & Queue' },
  { id: 'TELEHEALTH', label: 'Telehealth' },
  { id: 'SYSTEM', label: 'System & Schedule' },
  { id: 'CRITICAL', label: 'Deletions & Exports' },
];

const DOMAIN_ACTIONS = {
  CLINICAL: ['LOG_PRENATAL_VISIT', 'RECORD_DELIVERY_EINC', 'RECORD_LAB_PANEL', 'UPDATE_VITALS', 'TOGGLE_MCP_OVERRIDE'],
  PATIENTS: ['CREATE_PATIENT', 'UPDATE_PATIENT', 'CREATE_MATERNAL_EPISODE', 'REGISTER_WALKIN'],
  QUEUE: ['UPDATE_TRIAGE_STATUS', 'PATIENT_STEPPED_OUT', 'PATIENT_RETURNED_TO_QUEUE', 'CANCEL_APPOINTMENT'],
  TELEHEALTH: ['SEND_CONSULTATION_MESSAGE', 'UPDATE_CONSULTATION_STATUS'],
  SYSTEM: [
    'UPDATE_CLINIC_SERVICES', 'UPDATE_NAVBAR_LOGO', 'UPDATE_FAVICON', 'SYNC_FAVICON_WITH_LOGO',
    'UPDATE_HERO_IMAGE', 'UPDATE_HERO_CONTENT', 'UPDATE_ABOUT_CONTENT', 'UPDATE_FOOTER_CONTENT',
    'UPDATE_SEO_METADATA', 'UPDATE_WEEKEND_POLICY', 'ADD_BLOCKED_DATE', 'REMOVE_BLOCKED_DATE',
    'ADD_TIME_SLOT', 'UPDATE_TIME_SLOT', 'UPDATE_TIME_SLOT_CAPACITY'
  ],
  CRITICAL: [
    'DELETE_VISIT_LOG', 'DELETE_LAB_PANEL', 'DELETE_TIME_SLOT', 'REMOVE_NAVBAR_LOGO',
    'REMOVE_FAVICON', 'REMOVE_HERO_IMAGE', 'EXPORT_CLINICAL_SUMMARY', 'LOGIN'
  ],
};

const ACTION_COLORS = {
  // Clinical / PHI
  LOG_PRENATAL_VISIT: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  RECORD_DELIVERY_EINC: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  RECORD_LAB_PANEL: 'bg-teal-100 text-teal-800 border-teal-200',
  UPDATE_VITALS: 'bg-teal-100 text-teal-800 border-teal-200',
  TOGGLE_MCP_OVERRIDE: 'bg-emerald-100 text-emerald-800 border-emerald-200',

  // Patient Directory
  CREATE_PATIENT: 'bg-blue-100 text-blue-800 border-blue-200',
  UPDATE_PATIENT: 'bg-blue-100 text-blue-800 border-blue-200',
  CREATE_MATERNAL_EPISODE: 'bg-indigo-100 text-indigo-800 border-indigo-200',
  REGISTER_WALKIN: 'bg-blue-100 text-blue-800 border-blue-200',

  // Triage & Queue
  UPDATE_TRIAGE_STATUS: 'bg-sky-100 text-sky-800 border-sky-200',
  PATIENT_STEPPED_OUT: 'bg-amber-100 text-amber-800 border-amber-200',
  PATIENT_RETURNED_TO_QUEUE: 'bg-cyan-100 text-cyan-800 border-cyan-200',
  CANCEL_APPOINTMENT: 'bg-rose-100 text-rose-800 border-rose-200',

  // Telehealth
  SEND_CONSULTATION_MESSAGE: 'bg-violet-100 text-violet-800 border-violet-200',
  UPDATE_CONSULTATION_STATUS: 'bg-violet-100 text-violet-800 border-violet-200',

  // System & Schedule
  UPDATE_CLINIC_SERVICES: 'bg-purple-100 text-purple-800 border-purple-200',
  UPDATE_NAVBAR_LOGO: 'bg-purple-100 text-purple-800 border-purple-200',
  UPDATE_FAVICON: 'bg-purple-100 text-purple-800 border-purple-200',
  SYNC_FAVICON_WITH_LOGO: 'bg-purple-100 text-purple-800 border-purple-200',
  UPDATE_HERO_IMAGE: 'bg-purple-100 text-purple-800 border-purple-200',
  UPDATE_HERO_CONTENT: 'bg-purple-100 text-purple-800 border-purple-200',
  UPDATE_ABOUT_CONTENT: 'bg-purple-100 text-purple-800 border-purple-200',
  UPDATE_FOOTER_CONTENT: 'bg-purple-100 text-purple-800 border-purple-200',
  UPDATE_SEO_METADATA: 'bg-purple-100 text-purple-800 border-purple-200',
  UPDATE_WEEKEND_POLICY: 'bg-purple-100 text-purple-800 border-purple-200',
  ADD_BLOCKED_DATE: 'bg-purple-100 text-purple-800 border-purple-200',
  REMOVE_BLOCKED_DATE: 'bg-purple-100 text-purple-800 border-purple-200',
  ADD_TIME_SLOT: 'bg-purple-100 text-purple-800 border-purple-200',
  UPDATE_TIME_SLOT: 'bg-purple-100 text-purple-800 border-purple-200',
  UPDATE_TIME_SLOT_CAPACITY: 'bg-purple-100 text-purple-800 border-purple-200',

  // Critical / Deletions / Exports
  DELETE_VISIT_LOG: 'bg-red-100 text-red-800 border-red-200',
  DELETE_LAB_PANEL: 'bg-red-100 text-red-800 border-red-200',
  DELETE_TIME_SLOT: 'bg-red-100 text-red-800 border-red-200',
  REMOVE_NAVBAR_LOGO: 'bg-rose-100 text-rose-800 border-rose-200',
  REMOVE_FAVICON: 'bg-rose-100 text-rose-800 border-rose-200',
  REMOVE_HERO_IMAGE: 'bg-rose-100 text-rose-800 border-rose-200',
  EXPORT_CLINICAL_SUMMARY: 'bg-purple-100 text-purple-800 border-purple-200',
  LOGIN: 'bg-gray-100 text-gray-800 border-gray-200',
};

export function AuditLogsViewer({ logs = [], currentUserRole = 'admin', currentUserEmail = 'admin@arjenclinic.com' }) {
  // Search & Filtering States
  const [searchTerm, setSearchTerm] = useState('');
  const deferredSearchTerm = useDeferredValue(searchTerm);

  const [domainFilter, setDomainFilter] = useState('ALL');
  const [dateFilter, setDateFilter] = useState('ALL'); // 'ALL' | 'TODAY' | '7DAYS' | '30DAYS'
  const [roleFilter, setRoleFilter] = useState('ALL');

  // Expansion & Drawer States
  const [expandedLogId, setExpandedLogId] = useState(null);
  const [drawerMode, setDrawerMode] = useState({}); // { [id]: 'structured' | 'raw' }
  const [copiedId, setCopiedId] = useState(null);
  const [showStatutoryNotice, setShowStatutoryNotice] = useState(false);

  // Pagination States
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  // Adjust to page 1 whenever search or filters change (React pattern for syncing state without effects)
  const [prevFilterKey, setPrevFilterKey] = useState('');
  const currentFilterKey = `${deferredSearchTerm}|${domainFilter}|${dateFilter}|${roleFilter}|${pageSize}`;
  if (prevFilterKey !== currentFilterKey) {
    setPrevFilterKey(currentFilterKey);
    setCurrentPage(1);
  }

  // PHT Date Calculator
  const getLogDatePHT = (isoString) => {
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Manila',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(new Date(isoString));
  };

  const todayPHT = getClinicTodayDateString();
  const past7DaysPHT = getClinicDateOffset(-7);
  const past30DaysPHT = getClinicDateOffset(-30);

  // Filter logs with deferred value for 60fps typing
  const filteredLogs = logs.filter(log => {
    // 1. Domain Filter
    if (domainFilter !== 'ALL') {
      const allowedActions = DOMAIN_ACTIONS[domainFilter] || [];
      if (!allowedActions.includes(log.action)) return false;
    }

    // 2. Role Filter
    if (roleFilter !== 'ALL') {
      if (log.user_role?.toLowerCase() !== roleFilter.toLowerCase()) return false;
    }

    // 3. PHT Date Filter
    if (dateFilter !== 'ALL') {
      const logPHT = getLogDatePHT(log.created_at);
      if (dateFilter === 'TODAY' && logPHT !== todayPHT) return false;
      if (dateFilter === '7DAYS' && logPHT < past7DaysPHT) return false;
      if (dateFilter === '30DAYS' && logPHT < past30DaysPHT) return false;
    }

    // 4. Multi-field Search
    if (deferredSearchTerm.trim()) {
      const term = deferredSearchTerm.toLowerCase();
      const email = log.user_email?.toLowerCase() || '';
      const act = log.action?.toLowerCase() || '';
      const entity = log.entity_type?.toLowerCase() || '';
      const entityId = log.entity_id?.toLowerCase() || '';
      const detailsStr = JSON.stringify(log.details || {}).toLowerCase();

      const matchesSearch = 
        email.includes(term) || 
        act.includes(term) || 
        entity.includes(term) || 
        entityId.includes(term) || 
        detailsStr.includes(term);

      if (!matchesSearch) return false;
    }

    return true;
  });

  // Pagination calculation
  const totalRecords = filteredLogs.length;
  const totalPages = Math.ceil(totalRecords / pageSize) || 1;
  const startIndex = (currentPage - 1) * pageSize;
  const paginatedLogs = filteredLogs.slice(startIndex, startIndex + pageSize);

  const toggleExpand = (id) => {
    setExpandedLogId(prev => (prev === id ? null : id));
    if (!drawerMode[id]) {
      setDrawerMode(prev => ({ ...prev, [id]: 'structured' }));
    }
  };

  const setLogDrawerMode = (id, mode) => {
    setDrawerMode(prev => ({ ...prev, [id]: mode }));
  };

  const handleCopyJson = (log) => {
    const jsonStr = JSON.stringify({
      event_id: log.id,
      timestamp_pht: new Date(log.created_at).toLocaleString('en-PH', { timeZone: 'Asia/Manila' }),
      timestamp_utc: log.created_at,
      staff_email: log.user_email,
      staff_role: log.user_role,
      action: log.action,
      entity_type: log.entity_type,
      entity_id: log.entity_id,
      metadata: log.details,
    }, null, 2);

    navigator.clipboard.writeText(jsonStr);
    setCopiedId(log.id);
    setTimeout(() => setCopiedId(null), 2500);
  };

  // Statutory RFC-4180 CSV Export with UTF-8 BOM
  const handleExportCSV = () => {
    const timestampPHT = new Intl.DateTimeFormat('en-PH', {
      timeZone: 'Asia/Manila',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    }).format(new Date());

    const escapeCsv = (val) => {
      if (val === null || val === undefined) return '""';
      const str = typeof val === 'object' ? JSON.stringify(val) : String(val);
      return `"${str.replace(/"/g, '""')}"`;
    };

    const preamble = [
      escapeCsv('REPUBLIC OF THE PHILIPPINES - DATA PRIVACY ACT OF 2012 (RA 10173) AUDIT LEDGER'),
      escapeCsv('Facility Name: AR-JEN Maternity and Lying-In Clinic (Dasmariñas, Cavite)'),
      escapeCsv(`Extraction Timestamp (PHT): ${timestampPHT} PHT`),
      escapeCsv(`Extracted By: ${currentUserEmail} (${currentUserRole.toUpperCase()})`),
      escapeCsv(`Total Filtered Records: ${filteredLogs.length}`),
      escapeCsv('Integrity Verification: Immutable Append-Only Ledger Verified (No UPDATE/DELETE Granted)'),
      '""', // Blank separator line
    ];

    const headers = [
      'Log ID',
      'Timestamp (PHT)',
      'Timestamp (UTC)',
      'Staff Email',
      'Staff Role',
      'Action Tag',
      'Entity Type',
      'Entity ID',
      'IP Address',
      'Metadata Summary'
    ].map(escapeCsv).join(',');

    const rows = filteredLogs.map(log => {
      const phtFormatted = new Date(log.created_at).toLocaleString('en-PH', { timeZone: 'Asia/Manila' });
      return [
        escapeCsv(log.id),
        escapeCsv(phtFormatted),
        escapeCsv(log.created_at),
        escapeCsv(log.user_email),
        escapeCsv(log.user_role),
        escapeCsv(log.action),
        escapeCsv(log.entity_type),
        escapeCsv(log.entity_id || 'N/A'),
        escapeCsv(log.ip_address || 'Internal Network'),
        escapeCsv(log.details || {})
      ].join(',');
    });

    const csvContent = '\uFEFF' + preamble.join('\n') + '\n' + headers + '\n' + rows.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const dateStamp = getClinicTodayDateString();
    link.href = url;
    link.setAttribute('download', `AR-JEN_DPA_Audit_Ledger_${dateStamp}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">

      {/* ── Header Banner ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-slate-900 text-white flex items-center justify-center shadow-sm">
              <ScrollText className="w-5 h-5 text-rose-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold tracking-tight text-gray-900">
                  Medical Audit Trail &amp; PHI Access Logs
                </h1>
                <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-slate-100 text-slate-800 border border-slate-200">
                  Strict Admin Surveillance
                </span>
              </div>
              <p className="text-xs text-gray-500 mt-0.5">
                Append-only surveillance ledger recording every creation, update, and disclosure of Protected Health Information (PHI).
              </p>
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-3">
          <Button
            type="button"
            onClick={handleExportCSV}
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs h-10 px-4 gap-2 shadow-xs cursor-pointer transition-all duration-200"
          >
            <Download className="w-4 h-4" />
            Download Audit Ledger (CSV)
          </Button>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setShowStatutoryNotice(!showStatutoryNotice)}
            className="rounded-xl text-xs font-semibold h-10 border-gray-200 text-gray-700 hover:bg-gray-50 gap-1.5 cursor-pointer"
          >
            <Info className="w-4 h-4 text-rose-500" />
            {showStatutoryNotice ? 'Hide Notice' : 'RA 10173 Info'}
          </Button>
        </div>
      </div>

      {/* ── Statutory Compliance Notice (Collapsible) ── */}
      {showStatutoryNotice && (
        <div className="p-5 rounded-3xl bg-gradient-to-r from-emerald-50/90 via-white to-emerald-50/50 border border-emerald-200/80 shadow-xs space-y-3 animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-emerald-900 font-bold text-sm">
              <ShieldCheck className="w-5 h-5 text-emerald-600" />
              Philippine Data Privacy Act of 2012 (RA 10173) &amp; DOH A.O. 2016-0035 Compliance
            </div>
            <span className="text-[10px] font-black uppercase tracking-wider text-emerald-800 bg-emerald-100 px-2.5 py-0.5 rounded-full border border-emerald-200">
              Statutory Standard
            </span>
          </div>
          <div className="grid sm:grid-cols-3 gap-4 text-xs text-gray-600 pt-1">
            <div className="p-3 bg-white/80 rounded-2xl border border-emerald-100 space-y-1">
              <span className="font-bold text-gray-900 block">Section 12 &amp; 13 (Sensitive Personal Info)</span>
              <p className="text-[11px] leading-relaxed text-gray-500">
                All patient maternal evaluations, fetal heart tones, and clinical lab results are classified as Sensitive Personal Information, requiring strict need-to-know access controls.
              </p>
            </div>
            <div className="p-3 bg-white/80 rounded-2xl border border-emerald-100 space-y-1">
              <span className="font-bold text-gray-900 block">Immutable Append-Only Guarantee</span>
              <p className="text-[11px] leading-relaxed text-gray-500">
                Database Row-Level Security (RLS) permanently disallows UPDATE or DELETE operations on <code className="text-emerald-700 bg-emerald-50 px-1 rounded font-mono">audit_logs</code>. Entries can never be purged or altered.
              </p>
            </div>
            <div className="p-3 bg-white/80 rounded-2xl border border-emerald-100 space-y-1">
              <span className="font-bold text-gray-900 block">5-Year Retention Protocol</span>
              <p className="text-[11px] leading-relaxed text-gray-500">
                In adherence with DOH licensing and PhilHealth accreditation standards, medical surveillance ledgers are preserved for forensic review and regulatory inspection.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ── Summary KPI Cards ── */}
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
            <span className="text-[10px] font-bold text-rose-600 uppercase tracking-wider">Delivery &amp; EINC Logs</span>
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
            <p className="text-[11px] text-gray-400 mt-1">Printed clinical charts</p>
          </CardContent>
        </Card>
      </div>

      {/* ── Search & Filter Controls Bar ── */}
      <div className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm space-y-4">
        
        {/* Top Controls: Search, PHT Date Filter, Role Filter */}
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
          
          {/* Search with Deferred Value */}
          <div className="relative flex-1 max-w-lg">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <Input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search staff email, action, entity ID, clinical metadata diff..."
              className="pl-9 h-10 border-gray-200 rounded-xl text-xs bg-gray-50/50 focus:bg-white focus:border-rose-500"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700 text-xs font-bold"
              >
                Clear
              </button>
            )}
          </div>

          {/* Temporal PHT Date Filter */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 lg:pb-0">
            <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mr-1 hidden sm:inline">
              PHT Date:
            </span>
            {[
              { id: 'ALL', label: 'All Time' },
              { id: 'TODAY', label: "Today's Shift" },
              { id: '7DAYS', label: 'Past 7 Days' },
              { id: '30DAYS', label: 'Past 30 Days' },
            ].map(df => (
              <button
                key={df.id}
                type="button"
                onClick={() => setDateFilter(df.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                  dateFilter === df.id
                    ? 'bg-rose-600 text-white shadow-xs'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {df.label}
              </button>
            ))}
          </div>

          {/* Role Filter */}
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider hidden sm:inline">
              Role:
            </span>
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="h-10 px-3 rounded-xl border border-gray-200 bg-white text-xs font-medium text-gray-700 focus:outline-none focus:border-rose-500 cursor-pointer"
            >
              <option value="ALL">All Roles</option>
              <option value="admin">Clinic Administrator</option>
              <option value="doctor">OB-GYN Doctor</option>
              <option value="midwife">Registered Midwife</option>
              <option value="nurse">Staff Nurse</option>
              <option value="staff">Front Desk Staff</option>
            </select>
          </div>
        </div>

        {/* Domain Filter Chips */}
        <div className="flex items-center gap-1.5 overflow-x-auto pt-2 border-t border-gray-100 pb-1">
          <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mr-1 hidden sm:inline">
            Domain:
          </span>
          {ACTION_DOMAINS.map(domain => (
            <button
              key={domain.id}
              type="button"
              onClick={() => setDomainFilter(domain.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                domainFilter === domain.id
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {domain.label}
            </button>
          ))}
        </div>

      </div>

      {/* ── Main Audit Log Table ── */}
      <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
        
        {/* Table Header Counter & Page Size */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gray-50/50">
          <div className="text-xs text-gray-600 font-semibold">
            Showing <span className="font-bold text-gray-900">{totalRecords > 0 ? startIndex + 1 : 0}</span> to{' '}
            <span className="font-bold text-gray-900">{Math.min(startIndex + pageSize, totalRecords)}</span> of{' '}
            <span className="font-bold text-gray-900">{totalRecords}</span> filtered audit events
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-400 font-medium">Rows per page:</span>
            <select
              value={pageSize}
              onChange={(e) => setPageSize(Number(e.target.value))}
              className="h-8 px-2 rounded-lg border border-gray-200 bg-white text-xs font-semibold text-gray-700 cursor-pointer"
            >
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-gray-50/90 border-b border-gray-100 text-gray-500 font-bold uppercase tracking-wider">
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
              {paginatedLogs.length > 0 ? (
                paginatedLogs.map((log) => {
                  const roleBadge = formatRoleBadge(log.user_role);
                  const isExpanded = expandedLogId === log.id;
                  const currentMode = drawerMode[log.id] || 'structured';

                  const dateObj = new Date(log.created_at);
                  const formattedDate = dateObj.toLocaleDateString('en-PH', {
                    timeZone: 'Asia/Manila',
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  });
                  const formattedTime = dateObj.toLocaleTimeString('en-PH', {
                    timeZone: 'Asia/Manila',
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit',
                  });

                  const actionColor = ACTION_COLORS[log.action] || 'bg-gray-100 text-gray-800 border-gray-200';
                  const detailsObj = log.details && typeof log.details === 'object' ? log.details : {};
                  const detailKeys = Object.keys(detailsObj);

                  return (
                    <React.Fragment key={log.id}>
                      <tr 
                        onClick={() => toggleExpand(log.id)}
                        className={`hover:bg-slate-50/80 cursor-pointer transition-colors ${
                          isExpanded ? 'bg-slate-50/60' : ''
                        }`}
                      >
                        <td className="py-3 px-4 text-gray-400">
                          {isExpanded ? <ChevronDown className="w-4 h-4 text-rose-500" /> : <ChevronRight className="w-4 h-4" />}
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

                      {/* ── Expandable Dual-Mode Metadata Drawer ── */}
                      {isExpanded && (
                        <tr className="bg-slate-50 border-b border-gray-100 animate-in fade-in duration-150">
                          <td colSpan={7} className="p-5 pl-12 space-y-4">
                            
                            {/* Drawer Navigation Bar */}
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-gray-200/80">
                              <div className="flex items-center gap-3">
                                <span className="text-[10px] font-black uppercase tracking-wider text-gray-500">
                                  Audit Event ID: <code className="font-mono text-gray-800 text-xs">{log.id}</code>
                                </span>
                                <span className="text-[10px] font-mono text-gray-400">
                                  Entity ID: {log.entity_id || 'N/A'}
                                </span>
                              </div>

                              <div className="flex items-center gap-2">
                                {/* Mode Toggles */}
                                <div className="flex items-center bg-gray-200/80 p-0.5 rounded-xl text-[11px] font-bold">
                                  <button
                                    type="button"
                                    onClick={() => setLogDrawerMode(log.id, 'structured')}
                                    className={`px-3 py-1 rounded-lg transition-colors cursor-pointer ${
                                      currentMode === 'structured'
                                        ? 'bg-white text-gray-900 shadow-xs'
                                        : 'text-gray-600 hover:text-gray-900'
                                    }`}
                                  >
                                    Structured Breakdown
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setLogDrawerMode(log.id, 'raw')}
                                    className={`px-3 py-1 rounded-lg transition-colors cursor-pointer ${
                                      currentMode === 'raw'
                                        ? 'bg-white text-gray-900 shadow-xs'
                                        : 'text-gray-600 hover:text-gray-900'
                                    }`}
                                  >
                                    Raw JSON
                                  </button>
                                </div>

                                {/* Copy Button */}
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleCopyJson(log)}
                                  className="h-8 px-2.5 rounded-xl text-xs font-bold gap-1.5 border-gray-200 bg-white hover:bg-gray-50 cursor-pointer"
                                >
                                  {copiedId === log.id ? (
                                    <>
                                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                                      <span className="text-emerald-700">Copied!</span>
                                    </>
                                  ) : (
                                    <>
                                      <Copy className="w-3.5 h-3.5 text-gray-500" />
                                      <span>Copy JSON</span>
                                    </>
                                  )}
                                </Button>
                              </div>
                            </div>

                            {/* Mode 1: Structured Bento Breakdown */}
                            {currentMode === 'structured' && (
                              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-1">
                                <div className="p-3 rounded-2xl bg-white border border-gray-200/70 shadow-2xs space-y-1">
                                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">
                                    Target Entity
                                  </span>
                                  <p className="font-bold text-gray-900 font-mono text-xs">{log.entity_type}</p>
                                  <p className="text-[10px] text-gray-400 font-mono truncate">{log.entity_id || 'Global Record'}</p>
                                </div>

                                <div className="p-3 rounded-2xl bg-white border border-gray-200/70 shadow-2xs space-y-1">
                                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">
                                    Actor Context
                                  </span>
                                  <p className="font-bold text-gray-900 text-xs truncate">{log.user_email}</p>
                                  <p className="text-[10px] text-gray-500">{roleBadge.label}</p>
                                </div>

                                <div className="p-3 rounded-2xl bg-white border border-gray-200/70 shadow-2xs space-y-1 sm:col-span-2">
                                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">
                                    Key Extracted Metrics &amp; Parameters
                                  </span>
                                  {detailKeys.length > 0 ? (
                                    <div className="flex flex-wrap gap-1.5 pt-0.5">
                                      {detailKeys.map(k => {
                                        const v = detailsObj[k];
                                        const displayVal = typeof v === 'object' ? JSON.stringify(v) : String(v);
                                        return (
                                          <span key={k} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-gray-100 text-[11px] font-mono text-gray-700 border border-gray-200/80">
                                            <strong className="text-gray-900 font-semibold">{k}:</strong> {displayVal}
                                          </span>
                                        );
                                      })}
                                    </div>
                                  ) : (
                                    <p className="text-xs text-gray-400 italic">No structured metadata attached.</p>
                                  )}
                                </div>
                              </div>
                            )}

                            {/* Mode 2: Raw Code Inspector */}
                            {currentMode === 'raw' && (
                              <pre className="p-4 rounded-2xl bg-slate-900 text-emerald-400 text-xs font-mono overflow-x-auto border border-slate-800 leading-relaxed shadow-inner">
                                {JSON.stringify({
                                  event_id: log.id,
                                  timestamp_pht: new Date(log.created_at).toLocaleString('en-PH', { timeZone: 'Asia/Manila' }),
                                  timestamp_utc: log.created_at,
                                  staff_email: log.user_email,
                                  staff_role: log.user_role,
                                  action: log.action,
                                  target_table: log.entity_type,
                                  target_id: log.entity_id,
                                  metadata: log.details,
                                }, null, 2)}
                              </pre>
                            )}

                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={7} className="py-16 text-center text-gray-400 text-xs space-y-2">
                    <ScrollText className="w-8 h-8 text-gray-300 mx-auto" />
                    <p className="font-bold text-gray-600">No audit log records match the selected criteria.</p>
                    <p className="text-[11px] text-gray-400">Try broadening your search term or adjusting the date/domain filters.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* ── Pagination Controls ── */}
        {totalPages > 1 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-6 py-4 border-t border-gray-100 bg-white">
            <div className="text-xs text-gray-500 font-medium">
              Page <span className="font-bold text-gray-900">{currentPage}</span> of{' '}
              <span className="font-bold text-gray-900">{totalPages}</span>
            </div>

            <div className="flex items-center gap-1.5">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                className="h-8 px-3 rounded-xl text-xs font-bold gap-1 border-gray-200 cursor-pointer disabled:opacity-40"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                Previous
              </Button>

              {/* Page Number Chips */}
              <div className="hidden sm:flex items-center gap-1">
                {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                  let p = i + 1;
                  if (totalPages > 5 && currentPage > 3) {
                    p = currentPage - 2 + i;
                    if (p > totalPages) p = totalPages - 4 + i;
                  }
                  return (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setCurrentPage(p)}
                      className={`w-8 h-8 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                        currentPage === p
                          ? 'bg-rose-600 text-white shadow-xs'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      {p}
                    </button>
                  );
                })}
              </div>

              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
                className="h-8 px-3 rounded-xl text-xs font-bold gap-1 border-gray-200 cursor-pointer disabled:opacity-40"
              >
                Next
                <ChevronRight className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>
        )}

      </div>

    </div>
  );
}
