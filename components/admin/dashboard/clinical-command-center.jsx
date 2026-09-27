"use client"

import React, { useState } from "react"
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
} from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"

const SERVICE_LABELS = {
  prenatal: "Prenatal Care",
  delivery: "Delivery / Birthing",
  family: "Family Planning",
  general: "General Consult",
}

const STATUS_BADGE = {
  Pending: "bg-amber-50 text-amber-700 border-amber-200",
  Approved: "bg-emerald-50 text-emerald-700 border-emerald-200",
  Completed: "bg-blue-50 text-blue-700 border-blue-200",
  Rejected: "bg-rose-50 text-rose-700 border-rose-200",
}

export function ClinicalCommandCenter({
  patientsCount = 0,
  appointmentsCount = 0,
  prenatalCount = 0,
  highRiskCount = 0,
  statusCounts = { Pending: 0, Approved: 0, Completed: 0, Rejected: 0 },
  recentAppts = [],
  recentPatients = [],
  highRiskPatients = [],
}) {
  const [activeTab, setActiveTab] = useState("all")

  const filteredAppts = recentAppts.filter((appt) => {
    if (activeTab === "pending") return appt.status === "Pending"
    if (activeTab === "approved") return appt.status === "Approved"
    if (activeTab === "completed") return appt.status === "Completed"
    return true
  })

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-3 duration-300">
      {/* ── 1. HEADER & REAL ACTIONS ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white/80 backdrop-blur-md p-5 md:p-6 rounded-2xl border border-slate-200/80 shadow-xs">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
            </span>
            <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-800 bg-emerald-50 border border-emerald-200/80 px-2.5 py-0.5 rounded-full">
              Live Clinic Operations
            </span>
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight">
            Clinic Operations Dashboard
          </h1>
          <p className="text-xs md:text-sm text-slate-500 mt-0.5">
            Real-time management overview for registered patients, appointments, and clinical records.
          </p>
        </div>

        {/* Action Shortcuts */}
        <div className="flex flex-wrap items-center gap-2">
          <Button
            asChild
            className="bg-gradient-to-r from-rose-500 to-rose-600 hover:from-rose-600 hover:to-rose-700 text-white rounded-xl text-xs font-bold h-9 shadow-xs"
          >
            <Link href="/admin/patients">
              <Plus className="w-3.5 h-3.5 mr-1.5" />
              Patient Directory
            </Link>
          </Button>

          <Button
            asChild
            variant="outline"
            className="border-slate-200 bg-white hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-bold h-9 shadow-xs"
          >
            <Link href="/admin/appointments">
              <CalendarDays className="w-3.5 h-3.5 mr-1.5 text-slate-500" />
              Appointments
            </Link>
          </Button>

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

      {/* ── 2. REAL METRIC CARDS (Direct from Database) ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Patients */}
        <Link
          href="/admin/patients"
          className="bg-white rounded-2xl border border-slate-200/80 shadow-xs hover:shadow-md p-5 transition-all group"
        >
          <div className="flex items-start justify-between mb-3">
            <div className="w-10 h-10 rounded-xl bg-violet-50 text-violet-600 flex items-center justify-center font-bold">
              <Users className="w-5 h-5" />
            </div>
            <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-slate-600 group-hover:translate-x-0.5 transition-all" />
          </div>
          <p className="text-3xl font-extrabold text-slate-900 tracking-tight">{patientsCount}</p>
          <p className="text-xs text-slate-500 font-semibold mt-1">Total Registered Patients</p>
        </Link>

        {/* Total Appointments */}
        <Link
          href="/admin/appointments"
          className="bg-white rounded-2xl border border-slate-200/80 shadow-xs hover:shadow-md p-5 transition-all group"
        >
          <div className="flex items-start justify-between mb-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
              <CalendarDays className="w-5 h-5" />
            </div>
            <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-slate-600 group-hover:translate-x-0.5 transition-all" />
          </div>
          <p className="text-3xl font-extrabold text-slate-900 tracking-tight">{appointmentsCount}</p>
          <p className="text-xs text-slate-500 font-semibold mt-1">Total Appointments</p>
        </Link>

        {/* Pending Approvals */}
        <Link
          href="/admin/appointments?status=Pending"
          className="bg-white rounded-2xl border border-slate-200/80 shadow-xs hover:shadow-md p-5 transition-all group"
        >
          <div className="flex items-start justify-between mb-3">
            <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
              <Clock className="w-5 h-5" />
            </div>
            <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-slate-600 group-hover:translate-x-0.5 transition-all" />
          </div>
          <p className="text-3xl font-extrabold text-amber-600 tracking-tight">{statusCounts.Pending || 0}</p>
          <p className="text-xs text-slate-500 font-semibold mt-1">Pending Review</p>
        </Link>

        {/* Completed Visits */}
        <Link
          href="/admin/appointments?status=Completed"
          className="bg-white rounded-2xl border border-slate-200/80 shadow-xs hover:shadow-md p-5 transition-all group"
        >
          <div className="flex items-start justify-between mb-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-slate-600 group-hover:translate-x-0.5 transition-all" />
          </div>
          <p className="text-3xl font-extrabold text-emerald-600 tracking-tight">{statusCounts.Completed || 0}</p>
          <p className="text-xs text-slate-500 font-semibold mt-1">Completed Appointments</p>
        </Link>
      </div>

      {/* ── 3. STATUS BREAKDOWN STRIP ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { key: "Pending", label: "Pending", count: statusCounts.Pending || 0, color: "text-amber-700 bg-amber-50 border-amber-200" },
          { key: "Approved", label: "Approved / Scheduled", count: statusCounts.Approved || 0, color: "text-emerald-700 bg-emerald-50 border-emerald-200" },
          { key: "Completed", label: "Completed Visits", count: statusCounts.Completed || 0, color: "text-blue-700 bg-blue-50 border-blue-200" },
          { key: "Rejected", label: "Cancelled / Rejected", count: statusCounts.Rejected || 0, color: "text-rose-700 bg-rose-50 border-rose-200" },
        ].map((item) => (
          <Link
            key={item.key}
            href={`/admin/appointments?status=${item.key}`}
            className="bg-white rounded-xl border border-slate-200/80 shadow-2xs px-4 py-3 flex items-center justify-between hover:border-slate-300 transition-all group"
          >
            <span className="text-xs text-slate-600 font-medium">{item.label}</span>
            <span className={`text-xs font-extrabold px-2.5 py-0.5 rounded-lg border ${item.color}`}>
              {item.count}
            </span>
          </Link>
        ))}
      </div>

      {/* ── 4. HIGH-RISK PATIENT WATCHLIST (Real data only if flagged in DB) ── */}
      {highRiskCount > 0 && (
        <div className="bg-rose-50/70 rounded-2xl border border-rose-200 p-5 shadow-2xs">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-rose-600 text-white flex items-center justify-center">
                <AlertTriangle className="w-4 h-4" />
              </div>
              <h2 className="text-sm font-extrabold text-rose-950 uppercase tracking-wide">
                High-Risk Maternal Watchlist ({highRiskCount} Flagged)
              </h2>
            </div>
            <Link
              href="/admin/patients?filter=high_risk"
              className="text-xs font-bold text-rose-600 hover:text-rose-700 flex items-center gap-1"
            >
              View in Directory →
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {highRiskPatients.map((patient) => (
              <div
                key={patient.id}
                className="bg-white p-3.5 rounded-xl border border-rose-200/80 shadow-2xs flex items-center justify-between"
              >
                <div>
                  <p className="font-bold text-slate-900 text-xs">{patient.full_name}</p>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Age: {patient.age || "N/A"} • Contact: {patient.contact_number || "None"}
                  </p>
                </div>
                <Button
                  asChild
                  size="sm"
                  variant="outline"
                  className="border-rose-200 text-rose-700 hover:bg-rose-50 text-[11px] font-bold h-7 px-2.5 rounded-lg"
                >
                  <Link href={`/admin/patients/${patient.id}`}>
                    Chart →
                  </Link>
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── 5. TWO-COLUMN OPERATIONAL GRID (Real Appointments & Real Patients) ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Appointments Queue (2 Cols) */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between p-5 border-b border-slate-100 gap-3">
            <div>
              <h2 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                <CalendarDays className="w-4 h-4 text-rose-500" />
                Recent Appointments
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Latest bookings and checkup records from the database
              </p>
            </div>

            {/* Filter Tabs */}
            <div className="flex items-center bg-slate-100 p-1 rounded-xl text-xs font-bold">
              {[
                { key: "all", label: `All (${recentAppts.length})` },
                { key: "pending", label: `Pending (${statusCounts.Pending || 0})` },
                { key: "approved", label: `Approved (${statusCounts.Approved || 0})` },
                { key: "completed", label: `Completed (${statusCounts.Completed || 0})` },
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

          <div className="divide-y divide-slate-100">
            {filteredAppts.length === 0 ? (
              <div className="py-16 text-center text-slate-400 text-sm">
                <CalendarDays className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                <p className="font-semibold text-slate-600">No appointments found</p>
                <p className="text-xs text-slate-400 mt-1">
                  {activeTab !== "all"
                    ? `No appointments matching "${activeTab}" status.`
                    : "No appointments have been booked yet."}
                </p>
              </div>
            ) : (
              filteredAppts.map((appt) => {
                const patientName = appt.patients?.full_name || "Unassigned Patient"
                const badgeClass = STATUS_BADGE[appt.status] || STATUS_BADGE.Pending
                const serviceLabel = SERVICE_LABELS[appt.service_type] || appt.service_type

                return (
                  <div
                    key={appt.id}
                    className="p-4 hover:bg-slate-50/70 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-rose-500 to-rose-600 text-white font-extrabold text-xs flex items-center justify-center shrink-0 shadow-2xs">
                        {patientName.slice(0, 2).toUpperCase()}
                      </div>

                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-bold text-sm text-slate-900">{patientName}</p>
                          {appt.patients?.is_high_risk && (
                            <span className="text-[10px] font-black uppercase text-rose-700 bg-rose-50 border border-rose-200 px-1.5 py-0.2 rounded-md">
                              High Risk
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5">
                          <strong className="text-slate-700">{serviceLabel}</strong>
                          {appt.appointment_date && ` • ${appt.appointment_date}`}
                          {appt.time_preference && ` (${appt.time_preference})`}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2.5 self-end sm:self-center">
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
                <p className="text-xs text-slate-400 mt-1">
                  Add patients via the Patient Directory.
                </p>
              </div>
            ) : (
              recentPatients.map((patient) => (
                <div
                  key={patient.id}
                  className="py-3 flex items-center justify-between hover:bg-slate-50/60 transition-colors px-1 rounded-lg"
                >
                  <div className="min-w-0">
                    <p className="font-bold text-xs text-slate-900 truncate">{patient.full_name}</p>
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
          <div className="pt-4 mt-auto border-t border-slate-100">
            <Button
              asChild
              variant="outline"
              size="sm"
              className="w-full text-xs font-bold border-slate-200 text-slate-700 hover:bg-slate-50 rounded-xl"
            >
              <Link href="/admin/patients">
                <Plus className="w-3.5 h-3.5 mr-1 text-slate-500" />
                Manage Patient Records
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
