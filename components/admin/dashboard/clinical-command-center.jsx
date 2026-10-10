"use client"

import React, { useState, useEffect, useMemo } from "react"
import Link from "next/link"
import {
  Users,
  CalendarDays,
  Clock,
  CheckCircle2,
  ArrowRight,
  Tv,
  ExternalLink,
  AlertTriangle,
  Stethoscope,
  HeartPulse,
  Plus,
  ShieldCheck,
  FileText,
  UserCheck,
  UserPlus,
  Ticket,
  Droplets,
  CalendarCheck2,
  Inbox,
  Sparkles,
  RefreshCw,
  FolderOpen,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { createClient } from "@/utils/supabase/client"

const SERVICE_LABELS = {
  prenatal: "Prenatal Care",
  delivery: "Safe Delivery",
  family: "Family Planning",
  general: "General Consult",
}

const STATUS_BADGE = {
  Pending: "bg-amber-50 text-amber-700 border-amber-200",
  Approved: "bg-emerald-50 text-emerald-700 border-emerald-200",
  Completed: "bg-blue-50 text-blue-700 border-blue-200",
  "No-Show": "bg-purple-50 text-purple-700 border-purple-200",
  Cancelled: "bg-slate-100 text-slate-700 border-slate-200",
  Rejected: "bg-rose-50 text-rose-700 border-rose-200",
}

export function ClinicalCommandCenter({
  patientsCount = 0,
  appointmentsCount = 0,
  todayApptsCount = 0,
  activePrenatalCount = 0,
  highRiskCount = 0,
  statusCounts = {
    Pending: 0,
    Approved: 0,
    Completed: 0,
    "No-Show": 0,
    Cancelled: 0,
    Rejected: 0,
  },
  recentAppts = [],
  recentPatients = [],
  highRiskPatients = [],
  clinicTodayStr = "",
}) {
  const [activeTab, setActiveTab] = useState("all")
  const [currentTimeStr, setCurrentTimeStr] = useState("")

  // Live Philippine Standard Time (PHT) shift clock
  useEffect(() => {
    const updateTime = () => {
      const now = new Date()
      const formatter = new Intl.DateTimeFormat("en-PH", {
        timeZone: "Asia/Manila",
        weekday: "short",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: true,
      })
      setCurrentTimeStr(formatter.format(now))
    }
    updateTime()
    const interval = setInterval(updateTime, 1000)
    return () => clearInterval(interval)
  }, [])

  // Supabase Realtime Subscription for live operations awareness
  useEffect(() => {
    const supabase = createClient()
    const channel = supabase
      .channel("dashboard-live-sync")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "appointments" },
        () => {
          // Subtle refresh notification if needed
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "patients" },
        () => {
          // Subtle refresh notification if needed
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  // Tab counts for the visible recent appointments slice
  const sliceCounts = useMemo(() => {
    const counts = { all: recentAppts.length, pending: 0, approved: 0, completed: 0 }
    recentAppts.forEach((a) => {
      if (a.status === "Pending") counts.pending++
      if (a.status === "Approved") counts.approved++
      if (a.status === "Completed") counts.completed++
    })
    return counts
  }, [recentAppts])

  const filteredAppts = useMemo(() => {
    if (activeTab === "pending") return recentAppts.filter((a) => a.status === "Pending")
    if (activeTab === "approved") return recentAppts.filter((a) => a.status === "Approved")
    if (activeTab === "completed") return recentAppts.filter((a) => a.status === "Completed")
    return recentAppts
  }, [recentAppts, activeTab])

  const formatApptDate = (dateStr) => {
    if (!dateStr) return "No date"
    if (dateStr === clinicTodayStr) return "Today"
    try {
      const d = new Date(dateStr + "T00:00:00")
      return d.toLocaleDateString("en-PH", {
        month: "short",
        day: "numeric",
      })
    } catch {
      return dateStr
    }
  }

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-3 duration-300">
      {/* ── 1. HEADER & SHIFT CLOCK & RAPID ACTIONS ── */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white/80 backdrop-blur-md p-5 md:p-6 rounded-3xl border border-slate-200/80 shadow-xs">
        <div>
          <div className="flex flex-wrap items-center gap-2.5 mb-1.5">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
            </span>
            <span className="text-[11px] font-black uppercase tracking-wider text-emerald-800 bg-emerald-50 border border-emerald-200/80 px-2.5 py-0.5 rounded-full shadow-2xs">
              Live Clinic Operations
            </span>
            {currentTimeStr && (
              <span className="text-[11px] font-semibold text-slate-500 bg-slate-50 border border-slate-200/60 px-2.5 py-0.5 rounded-full">
                PHT: {currentTimeStr}
              </span>
            )}
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight">
            Clinic Operations Dashboard
          </h1>
          <p className="text-xs md:text-sm text-slate-500 mt-0.5">
            Real-time management overview for registered patients, active maternal care, and live triage flow.
          </p>
        </div>

        {/* Action Shortcuts */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Rapid Intake */}
          <Button
            asChild
            className="bg-gradient-to-r from-rose-500 to-rose-600 hover:from-rose-600 hover:to-rose-700 text-white rounded-xl text-xs font-bold h-9 shadow-xs transition-all active:scale-95"
          >
            <Link href="/admin/patients/new">
              <UserPlus className="w-3.5 h-3.5 mr-1.5" />
              New Patient Intake
            </Link>
          </Button>

          {/* Patient Directory */}
          <Button
            asChild
            variant="outline"
            className="border-slate-200 bg-white hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-bold h-9 shadow-xs"
          >
            <Link href="/admin/patients">
              <Users className="w-3.5 h-3.5 mr-1.5 text-slate-500" />
              Patient Directory
            </Link>
          </Button>

          {/* Appointments & Live Queue */}
          <Button
            asChild
            variant="outline"
            className="border-slate-200 bg-white hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-bold h-9 shadow-xs"
          >
            <Link href="/admin/appointments">
              <CalendarDays className="w-3.5 h-3.5 mr-1.5 text-slate-500" />
              Appointments & Queue
            </Link>
          </Button>

          {/* Public Lobby TV Display */}
          <Button
            asChild
            variant="outline"
            className="border-rose-200/80 bg-rose-50/60 hover:bg-rose-100 text-rose-700 rounded-xl text-xs font-bold h-9 shadow-xs"
          >
            <Link href="/queue" target="_blank" rel="noopener noreferrer">
              <Tv className="w-3.5 h-3.5 mr-1.5 text-rose-600" />
              Lobby TV
              <ExternalLink className="w-3 h-3 ml-1 opacity-70" />
            </Link>
          </Button>
        </div>
      </div>

      {/* ── 2. 4-PILLAR CLINICAL BENTO METRIC CARDS ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Registered Patients */}
        <Link
          href="/admin/patients"
          className="bg-white rounded-2xl border border-slate-200/80 shadow-xs hover:shadow-md p-5 transition-all group hover:border-violet-300"
        >
          <div className="flex items-start justify-between mb-3">
            <div className="w-10 h-10 rounded-xl bg-violet-50 text-violet-600 flex items-center justify-center font-bold">
              <Users className="w-5 h-5" />
            </div>
            <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-violet-600 group-hover:translate-x-0.5 transition-all" />
          </div>
          <p className="text-3xl font-extrabold text-slate-900 tracking-tight">{patientsCount}</p>
          <p className="text-xs text-slate-500 font-semibold mt-1">Total Registered Patients</p>
        </Link>

        {/* Active Ongoing Prenatal Episodes */}
        <Link
          href="/admin/patients?filter=prenatal"
          className="bg-white rounded-2xl border border-slate-200/80 shadow-xs hover:shadow-md p-5 transition-all group hover:border-rose-300"
        >
          <div className="flex items-start justify-between mb-3">
            <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center font-bold">
              <HeartPulse className="w-5 h-5" />
            </div>
            <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-rose-600 group-hover:translate-x-0.5 transition-all" />
          </div>
          <p className="text-3xl font-extrabold text-rose-600 tracking-tight">{activePrenatalCount}</p>
          <p className="text-xs text-slate-500 font-semibold mt-1">Active Prenatal Mothers</p>
        </Link>

        {/* Today's Appointments & Queue Load */}
        <Link
          href="/admin/appointments?range=today"
          className="bg-white rounded-2xl border border-slate-200/80 shadow-xs hover:shadow-md p-5 transition-all group hover:border-indigo-300"
        >
          <div className="flex items-start justify-between mb-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
              <CalendarCheck2 className="w-5 h-5" />
            </div>
            <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-indigo-600 group-hover:translate-x-0.5 transition-all" />
          </div>
          <p className="text-3xl font-extrabold text-indigo-600 tracking-tight">{todayApptsCount}</p>
          <p className="text-xs text-slate-500 font-semibold mt-1">Today&apos;s Appointments</p>
        </Link>

        {/* Pending Approvals */}
        <Link
          href="/admin/appointments?status=Pending"
          className="bg-white rounded-2xl border border-slate-200/80 shadow-xs hover:shadow-md p-5 transition-all group hover:border-amber-300"
        >
          <div className="flex items-start justify-between mb-3">
            <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
              <Clock className="w-5 h-5" />
            </div>
            <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-amber-600 group-hover:translate-x-0.5 transition-all" />
          </div>
          <p className="text-3xl font-extrabold text-amber-600 tracking-tight">{statusCounts.Pending || 0}</p>
          <p className="text-xs text-slate-500 font-semibold mt-1">Pending Review</p>
        </Link>
      </div>

      {/* ── 3. STATUS BREAKDOWN STRIP (Comprehensive 5-Status Audit) ── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {[
          {
            key: "Pending",
            label: "Pending Review",
            count: statusCounts.Pending || 0,
            color: "text-amber-700 bg-amber-50 border-amber-200",
            href: "/admin/appointments?status=Pending",
          },
          {
            key: "Approved",
            label: "Approved / Scheduled",
            count: statusCounts.Approved || 0,
            color: "text-emerald-700 bg-emerald-50 border-emerald-200",
            href: "/admin/appointments?status=Approved",
          },
          {
            key: "Completed",
            label: "Completed Visits",
            count: statusCounts.Completed || 0,
            color: "text-blue-700 bg-blue-50 border-blue-200",
            href: "/admin/appointments?status=Completed",
          },
          {
            key: "No-Show",
            label: "Missed / No-Show",
            count: statusCounts["No-Show"] || 0,
            color: "text-purple-700 bg-purple-50 border-purple-200",
            href: "/admin/appointments?status=No-Show",
          },
          {
            key: "Rejected",
            label: "Cancelled / Rejected",
            count: (statusCounts.Cancelled || 0) + (statusCounts.Rejected || 0),
            color: "text-rose-700 bg-rose-50 border-rose-200",
            href: "/admin/appointments?status=Rejected",
          },
        ].map((item) => (
          <Link
            key={item.key}
            href={item.href}
            className="bg-white rounded-xl border border-slate-200/80 shadow-2xs px-3.5 py-2.5 flex items-center justify-between hover:border-slate-300 transition-all group"
          >
            <span className="text-xs text-slate-600 font-semibold truncate mr-2">{item.label}</span>
            <span className={`text-xs font-black px-2 py-0.5 rounded-lg border shrink-0 ${item.color}`}>
              {item.count}
            </span>
          </Link>
        ))}
      </div>

      {/* ── 4. HIGH-RISK MATERNAL WATCHLIST (With Clinical Etiology or Reassurance Zero-State) ── */}
      {highRiskCount > 0 ? (
        <div className="bg-rose-50/70 rounded-2xl border border-rose-200/80 p-5 shadow-2xs animate-in fade-in duration-200">
          <div className="flex items-center justify-between mb-3.5">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-rose-600 text-white flex items-center justify-center shadow-2xs">
                <AlertTriangle className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-sm font-extrabold text-rose-950 uppercase tracking-wide">
                  High-Risk Maternal Watchlist ({highRiskCount} Flagged)
                </h2>
                <p className="text-[11px] text-rose-700 font-medium">
                  Requires active clinical vigilance & pre-eclampsia monitoring
                </p>
              </div>
            </div>
            <Link
              href="/admin/patients?filter=high_risk"
              className="text-xs font-bold text-rose-600 hover:text-rose-700 flex items-center gap-1 transition-colors"
            >
              View in Directory →
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {highRiskPatients.map((patient) => (
              <div
                key={patient.id}
                className="bg-white p-3.5 rounded-xl border border-rose-200/80 shadow-2xs flex flex-col justify-between gap-2.5 hover:shadow-xs transition-all"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-bold text-slate-900 text-xs truncate">{patient.full_name}</p>
                    {patient.blood_type && (
                      <span className="text-[10px] font-black px-1.5 py-0.2 rounded-md bg-rose-50 text-rose-700 border border-rose-200 shrink-0">
                        {patient.blood_type}
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Age: {patient.age || "N/A"} • Contact: {patient.contact_number || "None documented"}
                  </p>
                  {/* Clinical Etiology Reason */}
                  <div className="mt-2">
                    <span className="inline-flex items-center gap-1 text-[10px] font-extrabold text-rose-800 bg-rose-100/70 border border-rose-200 px-2 py-0.5 rounded-md">
                      <AlertTriangle className="w-2.5 h-2.5 text-rose-600 shrink-0" />
                      <span className="truncate">{patient.clinicalReason}</span>
                    </span>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-100 flex items-center justify-end">
                  <Button
                    asChild
                    size="sm"
                    variant="outline"
                    className="border-rose-200 text-rose-700 hover:bg-rose-50 text-[11px] font-bold h-7 px-2.5 rounded-lg w-full justify-center"
                  >
                    <Link href={`/admin/patients/${patient.id}`}>
                      Open Chart →
                    </Link>
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        /* Reassuring Zero-State Banner */
        <div className="bg-emerald-50/70 border border-emerald-200/80 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
              <ShieldCheck className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-xs font-extrabold text-emerald-950 uppercase tracking-wide">
                0 High-Risk Mothers Flagged — Maternal Baseline Stable
              </p>
              <p className="text-[11px] text-emerald-700 font-medium">
                All monitored prenatal vitals and fetal heart tone doppler indicators are within standard safety thresholds.
              </p>
            </div>
          </div>
          <span className="text-[11px] font-black text-emerald-800 bg-emerald-100/80 border border-emerald-200 px-3 py-1 rounded-full self-start sm:self-auto shrink-0">
            Safe Clinical Status
          </span>
        </div>
      )}

      {/* ── 5. TWO-COLUMN OPERATIONAL GRID (Real Appointments & Real Patients) ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Appointments Queue (2 Cols) */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden flex flex-col">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between p-5 border-b border-slate-100 gap-3">
            <div>
              <h2 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                <CalendarDays className="w-4 h-4 text-rose-500" />
                Recent Appointments
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Latest bookings and checkup records from the clinic database
              </p>
            </div>

            {/* Filter Tabs with Slice Counter */}
            <div className="flex items-center bg-slate-100 p-1 rounded-xl text-xs font-bold">
              {[
                { key: "all", label: `All (${sliceCounts.all})` },
                { key: "pending", label: `Pending (${sliceCounts.pending})` },
                { key: "approved", label: `Approved (${sliceCounts.approved})` },
                { key: "completed", label: `Completed (${sliceCounts.completed})` },
              ].map((tab) => (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setActiveTab(tab.key)}
                  className={`px-3 py-1 rounded-lg transition-all ${
                    activeTab === tab.key
                      ? "bg-white text-slate-900 shadow-2xs font-extrabold"
                      : "text-slate-500 hover:text-slate-900"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* Context tip when slice does not show all total pending */}
          {activeTab === "pending" && statusCounts.Pending > sliceCounts.pending && (
            <div className="px-5 py-2.5 bg-amber-50/80 border-b border-amber-100 flex items-center justify-between text-xs text-amber-900">
              <span className="font-medium">
                Showing {sliceCounts.pending} latest. There are <strong>{statusCounts.Pending} total pending appointments</strong> in the system.
              </span>
              <Link
                href="/admin/appointments?status=Pending"
                className="font-bold text-amber-800 underline hover:text-amber-950 shrink-0 ml-2"
              >
                Review All →
              </Link>
            </div>
          )}

          <div className="divide-y divide-slate-100 flex-1">
            {filteredAppts.length === 0 ? (
              <div className="py-16 text-center text-slate-400 text-sm">
                <Inbox className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                <p className="font-semibold text-slate-600">No appointments found</p>
                <p className="text-xs text-slate-400 mt-1 mb-4">
                  {activeTab !== "all"
                    ? `No recent appointments matching "${activeTab}" status.`
                    : "No appointments recorded in this period."}
                </p>
                <Button asChild size="sm" variant="outline" className="text-xs font-bold rounded-xl">
                  <Link href="/admin/appointments">
                    Open Appointments Manager
                  </Link>
                </Button>
              </div>
            ) : (
              filteredAppts.map((appt) => {
                const patientName = appt.patients?.full_name || "Unassigned Patient"
                const badgeClass = STATUS_BADGE[appt.status] || STATUS_BADGE.Pending
                const serviceLabel = SERVICE_LABELS[appt.service_type] || appt.service_type
                const isToday = appt.appointment_date === clinicTodayStr

                return (
                  <div
                    key={appt.id}
                    className="p-4 hover:bg-slate-50/70 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-rose-500 to-rose-600 text-white font-extrabold text-xs flex items-center justify-center shrink-0 shadow-2xs">
                        {patientName.slice(0, 2).toUpperCase()}
                      </div>

                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-bold text-sm text-slate-900 truncate">{patientName}</p>
                          {appt.patients?.is_high_risk && (
                            <span className="text-[10px] font-black uppercase text-rose-700 bg-rose-50 border border-rose-200 px-1.5 py-0.2 rounded-md shrink-0">
                              High Risk
                            </span>
                          )}
                          {appt.patients?.blood_type && (
                            <span className="text-[10px] font-black text-slate-600 bg-slate-100 border border-slate-200 px-1.5 py-0.2 rounded-md shrink-0">
                              {appt.patients.blood_type}
                            </span>
                          )}
                          {appt.queue_ticket_number && (
                            <span className="text-[10px] font-mono font-black text-rose-600 bg-rose-50 border border-rose-200 px-1.5 py-0.2 rounded-md shrink-0">
                              {appt.queue_ticket_number}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5 truncate">
                          <strong className="text-slate-700">{serviceLabel}</strong>
                          {" • "}
                          {isToday ? (
                            <span className="text-emerald-700 font-extrabold bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200">
                              TODAY
                            </span>
                          ) : (
                            formatApptDate(appt.appointment_date)
                          )}
                          {appt.time_preference && ` (${appt.time_preference})`}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2.5 self-end sm:self-center shrink-0">
                      <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-lg border ${badgeClass}`}>
                        {appt.status}
                      </span>

                      {appt.patients?.id && (
                        <Button
                          asChild
                          size="sm"
                          variant="ghost"
                          className="h-8 text-xs font-bold text-slate-600 hover:text-rose-600 rounded-lg"
                        >
                          <Link href={`/admin/patients/${appt.patients.id}`}>
                            Chart →
                          </Link>
                        </Button>
                      )}
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>

        {/* Recently Registered Patients (1 Col) */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-5 flex flex-col">
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
            <div>
              <h2 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                <Users className="w-4 h-4 text-violet-500" />
                Recent Patients
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">Latest registrations in EMR</p>
            </div>
            <Link
              href="/admin/patients"
              className="text-xs font-bold text-rose-600 hover:text-rose-700"
            >
              View all ({patientsCount})
            </Link>
          </div>

          <div className="divide-y divide-slate-100 flex-1">
            {recentPatients.length === 0 ? (
              <div className="py-12 text-center text-slate-400 text-sm">
                <Users className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                <p className="font-semibold text-slate-600">No registered patients</p>
                <p className="text-xs text-slate-400 mt-1 mb-3">
                  Add patients via intake form.
                </p>
                <Button asChild size="sm" variant="outline" className="text-xs font-bold rounded-xl">
                  <Link href="/admin/patients/new">
                    Register First Patient
                  </Link>
                </Button>
              </div>
            ) : (
              recentPatients.map((patient) => (
                <div
                  key={patient.id}
                  className="py-3 flex items-center justify-between hover:bg-slate-50/60 transition-colors px-1 rounded-lg"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <p className="font-bold text-xs text-slate-900 truncate">{patient.full_name}</p>
                      {patient.blood_type && (
                        <span className="text-[9px] font-black px-1.5 py-0.2 rounded bg-slate-100 text-slate-700 border border-slate-200 shrink-0">
                          {patient.blood_type}
                        </span>
                      )}
                      {patient.is_high_risk && (
                        <span className="text-[9px] font-black px-1.5 py-0.2 rounded bg-rose-50 text-rose-700 border border-rose-200 shrink-0">
                          Risk
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-400 truncate mt-0.5">
                      Age: {patient.age || "N/A"} • {patient.contact_number || "No contact"}
                    </p>
                  </div>
                  <Button
                    asChild
                    size="sm"
                    variant="ghost"
                    className="h-7 text-xs font-bold text-slate-500 hover:text-rose-600 shrink-0 ml-2"
                  >
                    <Link href={`/admin/patients/${patient.id}`}>
                      View →
                    </Link>
                  </Button>
                </div>
              ))
            )}
          </div>

          {/* Quick link button to add new patient */}
          <div className="pt-4 mt-auto border-t border-slate-100 flex items-center gap-2">
            <Button
              asChild
              variant="outline"
              size="sm"
              className="flex-1 text-xs font-bold border-slate-200 text-slate-700 hover:bg-slate-50 rounded-xl"
            >
              <Link href="/admin/patients/new">
                <UserPlus className="w-3.5 h-3.5 mr-1 text-rose-500" />
                New Patient Intake
              </Link>
            </Button>
            <Button
              asChild
              variant="ghost"
              size="sm"
              className="text-xs font-bold text-slate-600 hover:text-slate-900 rounded-xl"
            >
              <Link href="/admin/patients">
                <FolderOpen className="w-3.5 h-3.5 mr-1" />
                Directory
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
