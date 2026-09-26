'use client';

import React, { useState } from 'react';
import { Plus, X, Stethoscope, ClipboardList, Calendar, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { VisitLogForm } from './visit-log-form';
import { VisitLogCard } from '@/components/admin/visit-log-card';

export function PrenatalVisitsTab({
  patientId,
  activeEpisode,
  patientAge,
  previousLog,
  isHighRisk,
  latestUrinalysisProtein,
  addVisitLogAction,
  visitLogs = [],
  staffMap = {}
}) {
  // If no visit logs exist yet, show form by default; otherwise start collapsed to prioritize past history
  const [isFormOpen, setIsFormOpen] = useState(visitLogs.length === 0);

  return (
    <div className="space-y-4">
      <Card className="border border-gray-200/80 shadow-sm bg-white/95 backdrop-blur-md rounded-3xl overflow-hidden">
        <CardHeader className="border-b border-gray-100/80 bg-gradient-to-r from-rose-50/40 via-white to-gray-50/30 p-5 md:p-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-rose-500 to-pink-500 text-white flex items-center justify-center shadow-md shadow-rose-500/20">
                <Stethoscope className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <CardTitle className="text-xl font-black text-gray-900 tracking-tight">Prenatal Checkup Logs</CardTitle>
                  <span className="bg-rose-100/70 text-rose-700 text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full border border-rose-200/80 shadow-2xs">
                    {visitLogs.length} {visitLogs.length === 1 ? 'Record' : 'Records'}
                  </span>
                </div>
                <CardDescription className="text-xs text-gray-500 font-medium mt-0.5">
                  Track routine prenatal observations, vital metric trends, and attending clinician notes.
                </CardDescription>
              </div>
            </div>

            <Button
              type="button"
              onClick={() => setIsFormOpen(!isFormOpen)}
              className={`gap-2 rounded-2xl font-bold h-11 px-6 transition-all duration-200 shadow-sm active:scale-[0.98] ${
                isFormOpen
                  ? 'bg-gray-100 hover:bg-gray-200 text-gray-700 border border-gray-200'
                  : 'bg-gradient-to-r from-rose-500 to-rose-600 hover:from-rose-600 hover:to-rose-700 text-white shadow-md shadow-rose-500/20'
              }`}
            >
              {isFormOpen ? (
                <>
                  <X className="w-4 h-4" />
                  <span>Collapse Form</span>
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4" />
                  <span>+ Record Checkup Visit</span>
                </>
              )}
            </Button>
          </div>
        </CardHeader>

        <CardContent className="p-5 md:p-6">
          {/* Progressive Form Section */}
          {isFormOpen && (
            <div className="mb-8 border border-rose-200/80 bg-gradient-to-b from-rose-50/40 via-white to-white rounded-3xl p-5 md:p-6 shadow-sm animate-in fade-in slide-in-from-top-3 duration-200">
              <div className="flex items-center justify-between border-b border-rose-100 pb-3 mb-5">
                <div className="flex items-center gap-2">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500" />
                  </span>
                  <h3 className="font-black text-gray-900 text-xs tracking-wider uppercase">
                    New Prenatal Checkup Entry
                  </h3>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsFormOpen(false)}
                  className="h-8 text-xs font-bold text-gray-400 hover:text-gray-700 rounded-xl"
                >
                  Cancel
                </Button>
              </div>

              <VisitLogForm
                patientId={patientId}
                activeEpisode={activeEpisode}
                patientAge={patientAge}
                previousLog={previousLog}
                isHighRisk={isHighRisk}
                latestUrinalysisProtein={latestUrinalysisProtein}
                addVisitLogAction={addVisitLogAction}
                onSuccess={() => setIsFormOpen(false)}
              />
            </div>
          )}

          {/* Chronological Visit Logs Timeline */}
          <div className="space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-gray-100">
              <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
                <span>Checkup Timeline</span>
                <span className="w-1.5 h-1.5 rounded-full bg-gray-300" />
                <span className="text-gray-400 font-normal">Most recent first</span>
              </h4>
            </div>

            {visitLogs && visitLogs.length > 0 ? (
              <div className="space-y-4">
                {visitLogs.map((log) => (
                  <VisitLogCard
                    key={log.id}
                    log={log}
                    patientId={patientId}
                    staffName={staffMap[log.attending_staff_id]}
                  />
                ))}
              </div>
            ) : (
              <div className="py-16 text-center bg-gray-50/60 rounded-3xl border border-dashed border-gray-200">
                <div className="w-12 h-12 rounded-2xl bg-white border border-gray-200 shadow-2xs flex items-center justify-center mx-auto mb-3 text-gray-400">
                  <Stethoscope className="w-6 h-6 text-gray-400" />
                </div>
                <p className="text-sm font-bold text-gray-800">No prenatal checkups logged yet</p>
                <p className="text-xs text-gray-500 mt-1 max-w-sm mx-auto">
                  Click the button below to record the mother's first routine checkup, maternal vitals, and AOG.
                </p>
                {!isFormOpen && (
                  <Button
                    type="button"
                    onClick={() => setIsFormOpen(true)}
                    className="mt-4 bg-gradient-to-r from-rose-500 to-rose-600 hover:from-rose-600 hover:to-rose-700 text-white rounded-2xl text-xs font-bold gap-1.5 h-10 px-5 shadow-md shadow-rose-500/20 active:scale-[0.98] transition-all"
                  >
                    <Plus className="w-3.5 h-3.5" /> Record First Checkup
                  </Button>
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
