'use client';

import React, { useState, useMemo, useTransition } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Users, Baby, AlertTriangle, HeartPulse, Search, Plus, Calendar,
  FileText, ArrowRight, CheckCircle2, ChevronRight, ShieldCheck,
  ShieldAlert, Sparkles, Droplets, Clock, Filter, Phone, UserPlus, MapPin
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Table, TableBody, TableCaption, TableCell,
  TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { calculateObstetricDates } from '@/lib/clinical-protocols';
import { cn } from '@/lib/utils';
import { ShimmerButton } from '@/components/magicui/shimmer-button';
import { AnimatedShinyText } from '@/components/magicui/animated-shiny-text';
import { BreadcrumbTrail } from '@/components/admin/shared/breadcrumb-trail';
import { PatientDirectoryBento } from '@/components/admin/patients/patient-directory-bento';
import { ClinicalFilterChips } from '@/components/admin/patients/clinical-filter-chips';

const AVATAR_COLORS = [
  'bg-rose-100 text-rose-700 border-rose-200',
  'bg-pink-100 text-pink-700 border-pink-200',
  'bg-purple-100 text-purple-700 border-purple-200',
  'bg-indigo-100 text-indigo-700 border-indigo-200',
  'bg-blue-100 text-blue-700 border-blue-200',
  'bg-emerald-100 text-emerald-700 border-emerald-200',
  'bg-amber-100 text-amber-700 border-amber-200',
];

function getInitials(name = '') {
  if (!name) return 'PT';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function getAvatarColor(name = '') {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % AVATAR_COLORS.length;
  return AVATAR_COLORS[index];
}

export function PatientDirectoryClient({ initialPatients = [], totalDbCount = 0 }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  // URL state synchronization
  const initialFilter = searchParams.get('filter') || 'all';
  const initialSearch = searchParams.get('search') || '';

  const [activeFilter, setActiveFilter] = useState(initialFilter);
  const [searchQuery, setSearchQuery] = useState(initialSearch);

  // Synchronize state when filter changes
  const handleSelectFilter = (filterId) => {
    setActiveFilter(filterId);
    const params = new URLSearchParams(searchParams.toString());
    if (filterId === 'all') {
      params.delete('filter');
    } else {
      params.set('filter', filterId);
    }
    startTransition(() => {
      router.push(`/admin/patients?${params.toString()}`);
    });
  };

  const handleSearchChange = (query) => {
    setSearchQuery(query);
  };

  const handleClearSearch = () => {
    setSearchQuery('');
    const params = new URLSearchParams(searchParams.toString());
    params.delete('search');
    startTransition(() => {
      router.push(`/admin/patients?${params.toString()}`);
    });
  };

  // Enrich each patient with computed obstetric metrics and cohort flags
  const enrichedPatients = useMemo(() => {
    const now = new Date();
    const fortyTwoDaysAgo = new Date(now.getTime() - 42 * 24 * 60 * 60 * 1000);

    return (initialPatients || []).map((patient) => {
      const episodes = patient.maternal_episodes || [];
      const activeEpisode = episodes.find((e) => e.status === 'Active') || episodes[0] || null;
      const postpartumRecords = patient.postpartum_records || [];

      // Check if recent delivery occurred (past 42 days / 6 weeks)
      const recentPostpartum = postpartumRecords.find((p) => {
        if (!p.delivery_date && !p.created_at) return false;
        const recordDate = new Date(p.delivery_date || p.created_at);
        return recordDate >= fortyTwoDaysAgo;
      }) || (activeEpisode?.status === 'Delivered' ? activeEpisode : null);

      const lmpDate = activeEpisode?.lmp;
      const obstetricData = calculateObstetricDates(lmpDate);

      const isPrenatal = activeEpisode?.status === 'Active' && obstetricData?.isValid;
      const isHighRisk = Boolean(patient.is_high_risk);
      const isPostpartum = Boolean(recentPostpartum);

      // Gestational maturity percentage
      let progressPercent = 0;
      if (isPrenatal && obstetricData?.aogWeeks != null) {
        const totalWeeks = obstetricData.aogWeeks + (obstetricData.aogDays || 0) / 7;
        progressPercent = Math.min(100, Math.max(0, Math.round((totalWeeks / 40) * 100)));
      }

      // EDC Countdown
      let daysToDue = null;
      if (isPrenatal && obstetricData?.edc) {
        const edcTime = new Date(obstetricData.edc).getTime();
        const diffDays = Math.ceil((edcTime - now.getTime()) / (1000 * 60 * 60 * 24));
        daysToDue = diffDays;
      }

      return {
        ...patient,
        activeEpisode,
        obstetricData,
        isPrenatal,
        isHighRisk,
        isPostpartum,
        progressPercent,
        daysToDue,
        gravida: activeEpisode?.gravida ?? 1,
        para: activeEpisode?.para ?? 0,
      };
    });
  }, [initialPatients]);

  // Aggregate stats across all loaded patients
  const stats = useMemo(() => {
    let prenatal = 0;
    let highRisk = 0;
    let postpartum = 0;

    enrichedPatients.forEach((p) => {
      if (p.isPrenatal) prenatal++;
      if (p.isHighRisk) highRisk++;
      if (p.isPostpartum) postpartum++;
    });

    return {
      total: Math.max(totalDbCount, enrichedPatients.length),
      prenatal,
      highRisk,
      postpartum,
    };
  }, [enrichedPatients, totalDbCount]);

  // Filter patients based on active chip and search query
  const filteredPatients = useMemo(() => {
    let result = enrichedPatients;

    // Filter by cohort chip
    if (activeFilter === 'prenatal') {
      result = result.filter((p) => p.isPrenatal);
    } else if (activeFilter === 'high_risk') {
      result = result.filter((p) => p.isHighRisk);
    } else if (activeFilter === 'postpartum') {
      result = result.filter((p) => p.isPostpartum);
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter((p) => {
        const name = (p.full_name || '').toLowerCase();
        const contact = (p.contact_number || '').toLowerCase();
        const address = (p.address || '').toLowerCase();
        const blood = (p.blood_type || '').toLowerCase();
        return name.includes(q) || contact.includes(q) || address.includes(q) || blood.includes(q);
      });
    }

    return result;
  }, [enrichedPatients, activeFilter, searchQuery]);

  return (
    <div className="w-full max-w-7xl mx-auto space-y-6">
      {/* ── Top Breadcrumbs & Page Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1.5">
          <BreadcrumbTrail items={[{ label: 'Patient Directory', isCurrent: true }]} />
          <div className="flex items-center gap-3 pt-1">
            <h1 className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight">
              Patient Directory
            </h1>
            <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-rose-50 text-rose-600 border border-rose-200/60">
              EMR System v2.1
            </span>
          </div>
          <p className="text-xs sm:text-sm text-gray-500 font-medium">
            Clinical maternal registry, real-time gestational tracking, and risk classification.
          </p>
        </div>

        {/* Action Button: Magic UI Shimmer Button */}
        <Link href="/admin/patients/new">
          <ShimmerButton className="shadow-sm">
            <UserPlus className="w-4 h-4" />
            <span>Register New Patient</span>
          </ShimmerButton>
        </Link>
      </div>

      {/* ── Magic UI Bento Grid: 4 Clinical Overview Cards ── */}
      <PatientDirectoryBento
        stats={stats}
        activeFilter={activeFilter}
        onSelectFilter={handleSelectFilter}
      />

      {/* ── Clinical Quick Filter Chips & Live Search Bar ── */}
      <ClinicalFilterChips
        activeFilter={activeFilter}
        onSelectFilter={handleSelectFilter}
        stats={stats}
        searchQuery={searchQuery}
        onSearchChange={handleSearchChange}
        onClearSearch={handleClearSearch}
      />

      {/* ── Main Patient Table Card ── */}
      <div className="bg-white rounded-3xl border border-gray-200/80 shadow-xs overflow-hidden transition-all duration-200">
        <div className="p-4 sm:p-5 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-gradient-to-r from-gray-50/50 to-white">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-rose-500" />
            <h3 className="text-sm font-black text-gray-900 uppercase tracking-wider">
              {activeFilter === 'all' && 'All Registered Patients'}
              {activeFilter === 'prenatal' && 'Active Prenatal Cohort'}
              {activeFilter === 'high_risk' && 'High-Risk Priority Cohort'}
              {activeFilter === 'postpartum' && 'Postpartum Recovery Cohort'}
            </h3>
            <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
              {filteredPatients.length} visible
            </span>
          </div>

          {(activeFilter !== 'all' || searchQuery) && (
            <button
              type="button"
              onClick={() => {
                setActiveFilter('all');
                setSearchQuery('');
                router.push('/admin/patients');
              }}
              className="text-xs font-bold text-rose-600 hover:text-rose-700 underline text-left cursor-pointer"
            >
              Reset all filters
            </button>
          )}
        </div>

        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-gray-50/70 border-b border-gray-100">
              <TableRow className="hover:bg-transparent">
                <TableHead className="font-bold text-gray-700 text-xs py-3.5 pl-5">Patient Name & Identity</TableHead>
                <TableHead className="font-bold text-gray-700 text-xs py-3.5">Gestational Age (AOG)</TableHead>
                <TableHead className="font-bold text-gray-700 text-xs py-3.5">Risk & Safety</TableHead>
                <TableHead className="font-bold text-gray-700 text-xs py-3.5">Obstetric Parity</TableHead>
                <TableHead className="font-bold text-gray-700 text-xs py-3.5">Contact & Location</TableHead>
                <TableHead className="font-bold text-gray-700 text-xs py-3.5 text-right pr-5">Clinical Action</TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {filteredPatients.length > 0 ? (
                filteredPatients.map((patient) => {
                  const avatarColor = getAvatarColor(patient.full_name);
                  const initials = getInitials(patient.full_name);

                  return (
                    <TableRow
                      key={patient.id}
                      className="group hover:bg-rose-50/20 transition-colors border-b border-gray-100/80"
                    >
                      {/* Column 1: Patient Identity & Avatar */}
                      <TableCell className="py-4 pl-5">
                        <div className="flex items-center gap-3">
                          <div
                            className={cn(
                              "w-10 h-10 rounded-2xl flex items-center justify-center font-black text-xs border shadow-2xs shrink-0 transition-transform duration-200 group-hover:scale-105",
                              avatarColor
                            )}
                          >
                            {initials}
                          </div>

                          <div className="min-w-0">
                            <Link
                              href={`/admin/patients/${patient.id}`}
                              className="font-bold text-gray-900 group-hover:text-rose-600 transition-colors text-sm hover:underline block truncate"
                            >
                              {patient.full_name || 'Unnamed Patient'}
                            </Link>
                            <div className="flex items-center gap-2 mt-0.5 text-xs text-gray-400 font-medium">
                              <span>Age: {patient.age ? `${patient.age} yrs` : 'N/A'}</span>
                              <span>•</span>
                              <span>
                                {patient.blood_type ? (
                                  <span className="font-bold text-gray-600 bg-gray-100 px-1.5 py-0.2 rounded">
                                    {patient.blood_type}
                                  </span>
                                ) : (
                                  'Blood: N/A'
                                )}
                              </span>
                            </div>
                          </div>
                        </div>
                      </TableCell>

                      {/* Column 2: Gestational Age / AOG & Trimester */}
                      <TableCell className="py-4">
                        {patient.isPrenatal && patient.obstetricData?.isValid ? (
                          <div className="space-y-1.5 min-w-[150px]">
                            <div className="flex items-baseline gap-1.5">
                              <span className="text-sm font-black text-gray-900 tracking-tight tabular-nums">
                                Wk {patient.obstetricData.aogWeeks} {patient.obstetricData.aogDays}/7
                              </span>
                              <span className="text-[10px] font-bold uppercase tracking-wider text-rose-600 bg-rose-50 border border-rose-100 px-1.5 py-0.2 rounded-full">
                                {patient.obstetricData.trimester?.replace('Trimester', 'Trim') || 'Active'}
                              </span>
                            </div>

                            {/* Gestational Progress Bar (Wk / 40) */}
                            <div className="w-full bg-gray-100 rounded-full h-1.5 overflow-hidden">
                              <div
                                className="bg-gradient-to-r from-rose-400 to-rose-600 h-full rounded-full transition-all duration-500"
                                style={{ width: `${patient.progressPercent}%` }}
                              />
                            </div>

                            <div className="flex items-center justify-between text-[10px] text-gray-400 font-medium">
                              <span>EDC: {patient.obstetricData.edcFormatted || '—'}</span>
                              {patient.daysToDue != null && (
                                <span className={cn(
                                  "font-bold",
                                  patient.daysToDue < 0
                                    ? "text-purple-600"
                                    : patient.daysToDue <= 14
                                    ? "text-rose-600 font-black animate-pulse"
                                    : "text-gray-500"
                                )}>
                                  {patient.daysToDue < 0
                                    ? `+${Math.abs(patient.daysToDue)}d post`
                                    : `in ${patient.daysToDue}d`}
                                </span>
                              )}
                            </div>
                          </div>
                        ) : patient.isPostpartum ? (
                          <div className="space-y-1">
                            <span className="inline-flex items-center gap-1.5 text-xs font-bold text-purple-700 bg-purple-50 border border-purple-200/80 px-2.5 py-1 rounded-full">
                              <HeartPulse className="w-3.5 h-3.5 text-purple-600" />
                              <span>Postpartum Recovery</span>
                            </span>
                            <p className="text-[10px] text-gray-400 font-medium pl-1">
                              Delivered within 6 wks
                            </p>
                          </div>
                        ) : (
                          <span className="inline-flex items-center text-xs font-semibold text-gray-400 bg-gray-50 px-2.5 py-1 rounded-full border border-gray-100">
                            Gyne / Non-Pregnant
                          </span>
                        )}
                      </TableCell>

                      {/* Column 3: Risk Classification & Safety Alerts */}
                      <TableCell className="py-4">
                        {patient.isHighRisk ? (
                          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-800 border border-amber-200/80 shadow-2xs">
                            <span className="relative flex h-2 w-2">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
                              <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500" />
                            </span>
                            <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                            <span>High Risk Alert</span>
                          </div>
                        ) : (
                          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium text-emerald-700 bg-emerald-50 border border-emerald-200/60">
                            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                            <span>Standard Care</span>
                          </div>
                        )}
                      </TableCell>

                      {/* Column 4: Obstetric Parity (G/P) */}
                      <TableCell className="py-4">
                        <div className="flex items-center gap-1.5 font-mono text-xs">
                          <span className="font-bold text-gray-700 bg-gray-100 px-2 py-0.5 rounded border border-gray-200/60">
                            G{patient.gravida}
                          </span>
                          <span className="font-bold text-gray-700 bg-gray-100 px-2 py-0.5 rounded border border-gray-200/60">
                            P{patient.para}
                          </span>
                        </div>
                        <p className="text-[10px] text-gray-400 font-medium mt-1">
                          Gravida / Para
                        </p>
                      </TableCell>

                      {/* Column 5: Contact & Location */}
                      <TableCell className="py-4">
                        <div className="space-y-1 text-xs">
                          <div className="flex items-center gap-1.5 text-gray-700 font-medium">
                            <Phone className="w-3 h-3 text-gray-400 shrink-0" />
                            <span className="truncate max-w-[130px]">
                              {patient.contact_number || 'No contact'}
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5 text-gray-500 text-[11px]">
                            <MapPin className="w-3 h-3 text-gray-400 shrink-0" />
                            <span className="truncate max-w-[140px]" title={patient.address || undefined}>
                              {patient.address || 'Address on file'}
                            </span>
                          </div>
                        </div>
                      </TableCell>

                      {/* Column 6: Action Button */}
                      <TableCell className="py-4 text-right pr-5">
                        <Link href={`/admin/patients/${patient.id}`}>
                          <Button
                            variant="outline"
                            size="sm"
                            className="group/btn h-8 px-3 rounded-xl border-gray-200 text-gray-700 hover:text-rose-600 hover:border-rose-300 hover:bg-rose-50/50 font-bold text-xs gap-1.5 transition-all duration-200 shadow-2xs"
                          >
                            <span>View Chart</span>
                            <ArrowRight className="w-3.5 h-3.5 text-gray-400 group-hover/btn:text-rose-600 group-hover/btn:translate-x-0.5 transition-all" />
                          </Button>
                        </Link>
                      </TableCell>
                    </TableRow>
                  );
                })
              ) : (
                /* ── Actionable Empty State ── */
                <TableRow>
                  <TableCell colSpan={6} className="py-14 text-center">
                    <div className="max-w-md mx-auto space-y-4">
                      <div className="w-16 h-16 rounded-3xl bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-500 mx-auto shadow-2xs">
                        <Users className="w-8 h-8" />
                      </div>

                      <div className="space-y-1">
                        <h4 className="text-base font-black text-gray-900 tracking-tight">
                          {searchQuery
                            ? `No patients matching "${searchQuery}"`
                            : activeFilter !== 'all'
                            ? `No patients found in "${activeFilter.replace('_', ' ')}" cohort`
                            : 'No patients registered in the directory yet'}
                        </h4>
                        <p className="text-xs text-gray-500 font-medium leading-relaxed">
                          {searchQuery || activeFilter !== 'all'
                            ? 'Try clearing your search keywords or switching back to the "All Patients" filter view.'
                            : 'Welcome to AR-JEN Clinic! Start onboarding mothers and recording gestational intakes.'}
                        </p>
                      </div>

                      <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                        {searchQuery || activeFilter !== 'all' ? (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setActiveFilter('all');
                              setSearchQuery('');
                              router.push('/admin/patients');
                            }}
                            className="rounded-xl border-gray-200 text-xs font-bold"
                          >
                            Clear All Filters
                          </Button>
                        ) : null}

                        <Link href="/admin/patients/new">
                          <Button
                            size="sm"
                            className="bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold gap-1.5 shadow-sm shadow-rose-200"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            Register First Patient
                          </Button>
                        </Link>
                      </div>
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}
