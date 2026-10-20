'use client';

import React, { useState, useEffect, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Plus, Trash2, FileUp, FileIcon, ImageIcon, ExternalLink,
  AlertTriangle, ShieldAlert, CheckCircle2, HeartPulse,
  FlaskConical, Baby, FileText, Sparkles, Clock, ArrowLeft, RefreshCw
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { BreadcrumbTrail } from '@/components/admin/shared/breadcrumb-trail';
import { PatientClinicalHeader } from '@/components/admin/clinical/patient-clinical-header';
import { ClinicalOverviewBento } from '@/components/admin/clinical/clinical-overview-bento';
import { PrenatalVisitsTab } from '@/components/admin/clinical/prenatal-visits-tab';
import { PrenatalLabsSection } from '@/components/admin/clinical/prenatal-labs-section';
import { PostpartumTabContent } from '@/components/admin/clinical/postpartum-tab-content';
import { DeleteAttachmentButton } from '@/components/admin/patients/delete-attachment-button';
import { PatientTabsContext } from '@/components/admin/clinical/patient-tabs-wrapper';
import {
  addVisitLog,
  updateBirthPlan,
  uploadAttachment,
  updateModularData
} from '@/app/actions';

/**
 * TabErrorBoundary — Prevents a single sub-component error from crashing the entire patient chart.
 */
class TabErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  componentDidCatch(error, errorInfo) {
    console.error(`[PatientChart:${this.props.name}] Error caught:`, error, errorInfo);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="p-8 rounded-3xl bg-white/95 backdrop-blur-md border border-red-200/90 shadow-sm text-center space-y-3 my-4">
          <div className="w-12 h-12 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center mx-auto font-bold">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <h3 className="font-black text-gray-900 text-base">{this.props.name} Section Temporarily Unavailable</h3>
          <p className="text-xs text-gray-500 max-w-md mx-auto leading-relaxed">
            {this.state.error?.message || 'A transient issue occurred while rendering this clinical tab. Patient data is intact.'}
          </p>
          <Button
            type="button"
            size="sm"
            onClick={() => this.setState({ hasError: false, error: null })}
            className="rounded-xl text-xs font-bold bg-rose-500 hover:bg-rose-600 text-white gap-1.5 h-9 px-4"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Retry Section
          </Button>
        </div>
      );
    }
    return this.props.children;
  }
}

export function PatientDetailClient({
  patient,
  birthPlan,
  prenatalRecord,
  visitLogs = [],
  consultationMessages = [],
  attachmentsWithSignedUrls = [],
  maternalEpisodes = [],
  staffMap = {},
  prenatalLabResults = [],
  postpartumRecords = [],
  activeEpisode = null,
  id,
  defaultTab = 'profile'
}) {
  const router = useRouter();
  const [currentTab, setCurrentTab] = useState(defaultTab);
  const [isPending, startTransition] = useTransition();

  // Birth Plan & Upload form statuses
  const [birthPlanStatus, setBirthPlanStatus] = useState(null);
  const [uploadStatus, setUploadStatus] = useState(null);

  useEffect(() => {
    if (defaultTab) {
      setCurrentTab(defaultTab);
    }
  }, [defaultTab]);

  const handleTabChange = (val) => {
    setCurrentTab(val);
    if (typeof window !== 'undefined') {
      try {
        const url = new URL(window.location.href);
        url.searchParams.set('tab', val);
        window.history.replaceState(null, '', url.toString());
      } catch (err) {
        console.warn('[PatientDetailClient] URL sync fallback:', err);
      }
    }
  };

  const tabs = [
    { value: 'profile', label: 'Overview & Profile', icon: HeartPulse },
    { value: 'clinical', label: 'Prenatal Visits', icon: Clock },
    { value: 'labs', label: 'Structured Labs & Ultrasound', icon: FlaskConical },
    { value: 'postpartum', label: 'Postpartum & Newborn Care', icon: Baby },
    { value: 'birthplan', label: 'Birth Plan & Documents', icon: FileText },
  ];

  const patientShortId = typeof patient?.id === 'string'
    ? patient.id.slice(0, 8).toUpperCase()
    : String(patient?.id || '').slice(0, 8).toUpperCase();

  // Birth Plan Form submit with non-blocking transition
  const handleBirthPlanSubmit = (e) => {
    e.preventDefault();
    setBirthPlanStatus({ type: 'loading', msg: 'Saving birth plan preferences...' });
    const fd = new FormData(e.currentTarget);

    startTransition(async () => {
      try {
        const res = await updateBirthPlan(fd);
        if (res?.success === false) {
          setBirthPlanStatus({ type: 'error', msg: res.error || 'Failed to update birth plan.' });
        } else {
          setBirthPlanStatus({ type: 'success', msg: 'Birth plan preferences saved successfully!' });
          router.refresh();
        }
      } catch (err) {
        setBirthPlanStatus({ type: 'error', msg: err?.message || 'Network error occurred while saving.' });
      }
    });
  };

  // Upload Attachment Form submit with non-blocking transition
  const handleUploadSubmit = (e) => {
    e.preventDefault();
    setUploadStatus({ type: 'loading', msg: 'Uploading clinical attachment...' });
    const form = e.currentTarget;
    const fd = new FormData(form);

    startTransition(async () => {
      try {
        const res = await uploadAttachment(fd);
        if (res?.success === false) {
          setUploadStatus({ type: 'error', msg: res.error || 'Failed to upload document.' });
        } else {
          setUploadStatus({ type: 'success', msg: 'Document uploaded successfully!' });
          form.reset();
          router.refresh();
        }
      } catch (err) {
        setUploadStatus({ type: 'error', msg: err?.message || 'Network error occurred while uploading.' });
      }
    });
  };

  return (
    <PatientTabsContext.Provider value={{ currentTab, switchTab: handleTabChange }}>
      <div className="w-full max-w-7xl mx-auto space-y-6">

        {/* ── Breadcrumb Navigation Trail ── */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2 flex-wrap">
            <BreadcrumbTrail
              items={[
                { label: 'Patient Directory', href: '/admin/patients' },
                { label: patient?.full_name || 'Patient Chart', isCurrent: true },
              ]}
            />
            <span className="font-mono text-xs font-bold text-gray-500 bg-gray-100 px-2 py-0.5 rounded-md border border-gray-200">
              #{patientShortId}
            </span>
            {patient?.is_high_risk ? (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-red-50 text-red-700 border border-red-200">
                <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-ping" />
                High Risk Monitoring
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                Standard Care
              </span>
            )}
          </div>
        </div>

        {/* ── 3-Second Clinical Snapshot Banner & Maternal Episode Switcher ── */}
        <TabErrorBoundary name="Clinical Header">
          <PatientClinicalHeader
            patient={patient}
            maternalEpisodes={maternalEpisodes || []}
            activeEpisode={activeEpisode}
            birthPlan={birthPlan}
            id={id}
            latestVisitLog={visitLogs?.[0] || null}
          />
        </TabErrorBoundary>

        {/* ── Magic UI Ergonomic Tab Strip ── */}
        <div className="w-full">
          <div className="bg-white/95 backdrop-blur-md p-1.5 rounded-2xl border border-gray-100 shadow-sm mb-6 flex flex-wrap h-auto gap-1.5">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = currentTab === tab.value;
              return (
                <button
                  key={tab.value}
                  type="button"
                  onClick={() => handleTabChange(tab.value)}
                  className={`flex items-center gap-2 rounded-xl px-4 py-2.5 font-bold text-xs sm:text-sm transition-all duration-200 cursor-pointer ${
                    isActive
                      ? 'bg-rose-500 text-white shadow-md shadow-rose-500/20 active:scale-[0.98]'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                  }`}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* ── Tab 1: Overview & Profile (Bento Grid Workspace) ── */}
          {currentTab === 'profile' && (
            <TabErrorBoundary name="Overview & Profile">
              <ClinicalOverviewBento
                patient={patient}
                activeEpisode={activeEpisode}
                latestVisitLog={visitLogs?.[0] || null}
                latestLabResult={prenatalLabResults?.[0] || null}
                postpartumRecord={postpartumRecords?.[0] || null}
                birthPlan={birthPlan}
                consultationMessages={consultationMessages || []}
                modularData={prenatalRecord?.modular_data}
                updateModularData={updateModularData}
                visitLogs={visitLogs || []}
                onSwitchTab={handleTabChange}
              />
            </TabErrorBoundary>
          )}

          {/* ── Tab 2: Clinical Observations (Progressive Checkup Form + History) ── */}
          {currentTab === 'clinical' && (
            <TabErrorBoundary name="Prenatal Visits">
              <PrenatalVisitsTab
                patientId={id}
                activeEpisode={activeEpisode}
                patientAge={patient?.age}
                previousLog={visitLogs?.[0] || null}
                isHighRisk={patient?.is_high_risk}
                latestUrinalysisProtein={prenatalLabResults?.[0]?.urinalysis_protein}
                addVisitLogAction={addVisitLog}
                visitLogs={visitLogs || []}
                staffMap={staffMap}
              />
            </TabErrorBoundary>
          )}

          {/* ── Tab 3: Structured Labs ── */}
          {currentTab === 'labs' && (
            <TabErrorBoundary name="Structured Labs">
              <PrenatalLabsSection
                patientId={id}
                activeEpisodeId={activeEpisode?.id}
                labResults={prenatalLabResults || []}
                patientBloodType={patient?.blood_type}
              />
            </TabErrorBoundary>
          )}

          {/* ── Tab 4: Postpartum & DOH Newborn Care (EINC) ── */}
          {currentTab === 'postpartum' && (
            <TabErrorBoundary name="Postpartum Care">
              <PostpartumTabContent
                patient={patient}
                activeEpisode={activeEpisode}
                postpartumRecord={postpartumRecords?.[0] || null}
                postpartumRecords={postpartumRecords || []}
              />
            </TabErrorBoundary>
          )}

          {/* ── Tab 5: Birth Plan & Medical Documents ── */}
          {currentTab === 'birthplan' && (
            <TabErrorBoundary name="Birth Plan & Documents">
              <div className="space-y-6">
                {/* ── Card 1: Birth Plan Preferences ── */}
                <Card className="border border-gray-200/80 shadow-sm bg-white/95 backdrop-blur-md rounded-3xl overflow-hidden">
                  <CardHeader className="border-b border-gray-100 bg-gradient-to-r from-rose-50/40 via-white to-gray-50/30 p-5 md:p-6">
                    <CardTitle className="text-xl font-black text-gray-900 tracking-tight">Birth Plan</CardTitle>
                    <CardDescription className="text-xs text-gray-500 font-medium mt-0.5">
                      Based on AR-JEN Clinic official birth plan form. Records patient preferences and emergency readiness.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="p-6 md:p-8 space-y-6">

                    {/* Read-only summary banner if plan exists */}
                    {birthPlan && (
                      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 p-5 bg-rose-50/40 border border-rose-100 rounded-2xl">
                        {[
                          { label: 'Manganganak sa', value: birthPlan.delivery_location },
                          { label: 'Magpapaanak', value: birthPlan.birth_attendant },
                          { label: 'Kasama', value: birthPlan.companion_type === 'Kapamilya' ? `Kapamilya${birthPlan.companion_family_name ? ` (${birthPlan.companion_family_name})` : ''}` : birthPlan.companion_type },
                          { label: 'PhilHealth Facility', value: birthPlan.is_philhealth_facility },
                          { label: 'Active Member', value: birthPlan.is_philhealth_member },
                          { label: 'PhilHealth No.', value: birthPlan.philhealth_number },
                          { label: 'Mode of Payment', value: birthPlan.payment_method },
                        ].map((item) => (
                          <div key={item.label} className="space-y-0.5">
                            <p className="text-[10px] font-black text-rose-500 uppercase tracking-widest">{item.label}</p>
                            <p className="font-bold text-gray-900 text-sm">{item.value || '—'}</p>
                          </div>
                        ))}
                      </div>
                    )}

                    {birthPlanStatus && (
                      <div className={`p-4 rounded-2xl text-xs font-bold flex items-center gap-2 ${
                        birthPlanStatus.type === 'success'
                          ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                          : birthPlanStatus.type === 'error'
                          ? 'bg-rose-50 text-rose-800 border border-rose-200'
                          : 'bg-blue-50 text-blue-800 border border-blue-200'
                      }`}>
                        {birthPlanStatus.type === 'success' ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : <AlertTriangle className="w-4 h-4 text-rose-600" />}
                        <span>{birthPlanStatus.msg}</span>
                      </div>
                    )}

                    {/* Collapsible Birth Plan Form */}
                    <details className="group" open={!birthPlan}>
                      <summary className="cursor-pointer list-none flex items-center gap-2 text-sm font-bold text-rose-600 hover:text-rose-700 mb-6">
                        <span className="border border-rose-200 rounded-xl px-4 py-2 hover:bg-rose-50 transition-colors shadow-2xs">
                          {birthPlan ? '✏️ Edit Birth Plan Form' : '+ Fill Birth Plan Form'}
                        </span>
                      </summary>

                      <form onSubmit={handleBirthPlanSubmit} className="space-y-8 max-w-2xl pt-2">
                        <input type="hidden" name="patient_id" value={id} />

                        {/* Section 1 */}
                        <div className="space-y-3">
                          <h3 className="text-xs font-black text-gray-700 uppercase tracking-widest border-b pb-2">Ako ay manganganak sa:</h3>
                          {['Lying-in Clinic', 'Bahay', 'Ospital'].map((opt) => (
                            <label key={opt} className="flex items-center gap-3 cursor-pointer group/radio">
                              <input
                                type="radio"
                                name="delivery_location"
                                value={opt}
                                defaultChecked={birthPlan?.delivery_location === opt || (!birthPlan && opt === 'Lying-in Clinic')}
                                className="w-4 h-4 accent-rose-500 cursor-pointer"
                              />
                              <span className="text-sm font-semibold text-gray-700 group-hover/radio:text-rose-600 transition-colors">{opt}</span>
                            </label>
                          ))}
                        </div>

                        {/* Section 2 */}
                        <div className="space-y-3">
                          <h3 className="text-xs font-black text-gray-700 uppercase tracking-widest border-b pb-2">Ang magpapaanak sa akin ay:</h3>
                          {['Doctor', 'Midwife', 'Hilot'].map((opt) => (
                            <label key={opt} className="flex items-center gap-3 cursor-pointer group/radio">
                              <input
                                type="radio"
                                name="birth_attendant"
                                value={opt}
                                defaultChecked={birthPlan?.birth_attendant === opt || (!birthPlan && opt === 'Midwife')}
                                className="w-4 h-4 accent-rose-500 cursor-pointer"
                              />
                              <span className="text-sm font-semibold text-gray-700 group-hover/radio:text-rose-600 transition-colors">{opt}</span>
                            </label>
                          ))}
                        </div>

                        {/* Section 3 */}
                        <div className="space-y-3">
                          <h3 className="text-xs font-black text-gray-700 uppercase tracking-widest border-b pb-2">Ang kasama ko pagpunta sa lugar ng aking pag-aanakan ay:</h3>
                          {['Asawa', 'Kapamilya', 'Kaibigan', 'Kapitbahay'].map((opt) => (
                            <div key={opt}>
                              <label className="flex items-center gap-3 cursor-pointer group/radio">
                                <input
                                  type="radio"
                                  name="companion_type"
                                  value={opt}
                                  defaultChecked={birthPlan?.companion_type === opt || (!birthPlan && opt === 'Asawa')}
                                  className="w-4 h-4 accent-rose-500 cursor-pointer"
                                />
                                <span className="text-sm font-semibold text-gray-700 group-hover/radio:text-rose-600 transition-colors">
                                  {opt}{opt === 'Kapamilya' ? ' (kaano-ano)' : ''}
                                </span>
                              </label>
                              {opt === 'Kapamilya' && (
                                <Input
                                  name="companion_family_name"
                                  defaultValue={birthPlan?.companion_family_name}
                                  placeholder="Pangalan ng kapamilya"
                                  className="ml-7 mt-2 max-w-xs h-9 rounded-xl focus-visible:ring-rose-500 text-sm"
                                />
                              )}
                            </div>
                          ))}
                        </div>

                        {/* Section 4 */}
                        <div className="space-y-3">
                          <h3 className="text-xs font-black text-gray-700 uppercase tracking-widest border-b pb-2">Ang aking pag-aanakan ay isang PhilHealth Facility:</h3>
                          {['OO', 'HINDI'].map((opt) => (
                            <label key={opt} className="flex items-center gap-3 cursor-pointer group/radio">
                              <input
                                type="radio"
                                name="is_philhealth_facility"
                                value={opt}
                                defaultChecked={birthPlan?.is_philhealth_facility === opt || (!birthPlan && opt === 'OO')}
                                className="w-4 h-4 accent-rose-500 cursor-pointer"
                              />
                              <span className="text-sm font-semibold text-gray-700 group-hover/radio:text-rose-600 transition-colors">{opt}</span>
                            </label>
                          ))}
                        </div>

                        {/* Section 5 */}
                        <div className="space-y-3">
                          <h3 className="text-xs font-black text-gray-700 uppercase tracking-widest border-b pb-2">Ako ay Active PhilHealth Member:</h3>
                          {['OO', 'HINDI'].map((opt) => (
                            <label key={opt} className="flex items-center gap-3 cursor-pointer group/radio">
                              <input
                                type="radio"
                                name="is_philhealth_member"
                                value={opt}
                                defaultChecked={birthPlan?.is_philhealth_member === opt || (!birthPlan && opt === 'OO')}
                                className="w-4 h-4 accent-rose-500 cursor-pointer"
                              />
                              <span className="text-sm font-semibold text-gray-700 group-hover/radio:text-rose-600 transition-colors">{opt}</span>
                            </label>
                          ))}
                          <div className="ml-7">
                            <Label className="text-xs font-bold text-gray-500">PhilHealth Number</Label>
                            <Input
                              name="philhealth_number"
                              defaultValue={birthPlan?.philhealth_number || patient?.philhealth_number}
                              maxLength={14}
                              placeholder="00-000000000-0"
                              className="mt-1 max-w-xs h-9 rounded-xl focus-visible:ring-rose-500 text-sm"
                            />
                          </div>
                        </div>

                        {/* Section 6 */}
                        <div className="space-y-3">
                          <h3 className="text-xs font-black text-gray-700 uppercase tracking-widest border-b pb-2">Ang pambayad na gagamitin ko sa aking panganganak ay:</h3>
                          {['Cash', 'Philhealth', 'Medical Insurance'].map((opt) => (
                            <label key={opt} className="flex items-center gap-3 cursor-pointer group/radio">
                              <input
                                type="radio"
                                name="payment_method"
                                value={opt}
                                defaultChecked={birthPlan?.payment_method === opt || (!birthPlan && opt === 'Philhealth')}
                                className="w-4 h-4 accent-rose-500 cursor-pointer"
                              />
                              <span className="text-sm font-semibold text-gray-700 group-hover/radio:text-rose-600 transition-colors">{opt}</span>
                            </label>
                          ))}
                        </div>

                        <div className="pt-4 border-t border-gray-100 flex items-center gap-3">
                          <Button
                            type="submit"
                            disabled={isPending}
                            className="bg-gradient-to-r from-rose-500 to-rose-600 hover:from-rose-600 hover:to-rose-700 text-white rounded-2xl h-12 px-8 font-black shadow-md shadow-rose-500/20 active:scale-[0.98] transition-all"
                          >
                            {isPending ? 'Saving Plan...' : 'Save Birth Plan'}
                          </Button>
                        </div>
                      </form>
                    </details>
                  </CardContent>
                </Card>

                {/* ── Card 2: Patient Files, Ultrasounds & Lab Documents ── */}
                <Card className="border border-gray-200/80 shadow-sm bg-white/95 backdrop-blur-md rounded-3xl overflow-hidden">
                  <CardHeader className="border-b border-gray-100 bg-gradient-to-r from-rose-50/40 via-white to-gray-50/30 p-5 md:p-6">
                    <CardTitle className="text-xl font-black text-gray-900 tracking-tight">Medical Documents &amp; Uploads</CardTitle>
                    <CardDescription className="text-xs text-gray-500 font-medium mt-0.5">
                      Upload ultrasound scans, PDF lab reports, and signed consent documentation.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="p-6 md:p-8 space-y-6">

                    {/* Upload Form */}
                    <div className="bg-gradient-to-br from-rose-50/50 via-white to-rose-50/20 border border-rose-100 rounded-3xl p-6 shadow-2xs">
                      <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2 text-sm">
                        <FileUp className="w-4 h-4 text-rose-500" /> Upload New Clinical Document
                      </h3>

                      {uploadStatus && (
                        <div className={`p-3.5 mb-4 rounded-xl text-xs font-bold flex items-center gap-2 ${
                          uploadStatus.type === 'success'
                            ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                            : uploadStatus.type === 'error'
                            ? 'bg-rose-50 text-rose-800 border border-rose-200'
                            : 'bg-blue-50 text-blue-800 border border-blue-200'
                        }`}>
                          {uploadStatus.type === 'success' ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : <AlertTriangle className="w-4 h-4 text-rose-600" />}
                          <span>{uploadStatus.msg}</span>
                        </div>
                      )}

                      <form onSubmit={handleUploadSubmit} className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                        <input type="hidden" name="patient_id" value={id} />
                        <div>
                          <Label className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-1.5 block">Category</Label>
                          <select
                            name="category"
                            className="w-full h-11 rounded-xl border border-gray-200 bg-white px-3 text-xs font-semibold focus:ring-2 focus:ring-rose-500/20 outline-none"
                          >
                            <option value="Lab Result">Lab Result</option>
                            <option value="Ultrasound">Ultrasound</option>
                            <option value="Prescription">Prescription</option>
                            <option value="Other">Other</option>
                          </select>
                        </div>
                        <div>
                          <Label className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-1.5 block">Select File (Max 10MB)</Label>
                          <Input
                            type="file"
                            name="file"
                            required
                            accept="image/*,.pdf,.doc,.docx"
                            className="h-11 rounded-xl border-dashed border-2 border-rose-200 bg-white file:bg-rose-50 file:text-rose-600 file:border-none file:h-full file:px-4 file:mr-4 file:font-bold text-xs"
                          />
                        </div>
                        <div>
                          <Button
                            type="submit"
                            disabled={isPending}
                            className="w-full bg-gradient-to-r from-rose-500 to-rose-600 hover:from-rose-600 hover:to-rose-700 text-white rounded-xl h-11 font-bold text-xs gap-2 shadow-md shadow-rose-500/20 active:scale-[0.98] transition-all"
                          >
                            <Plus className="w-4 h-4" /> {isPending ? 'Uploading...' : 'Upload File'}
                          </Button>
                        </div>
                      </form>
                    </div>

                    {/* Files Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      {attachmentsWithSignedUrls && attachmentsWithSignedUrls.length > 0 ? (
                        attachmentsWithSignedUrls.map((file) => {
                          const isImage = ['jpg', 'jpeg', 'png', 'webp', 'gif'].includes(file.file_type?.toLowerCase());
                          return (
                            <div key={file.id} className="group bg-white border border-gray-100 rounded-2xl overflow-hidden hover:shadow-lg transition-all">
                              {isImage && (
                                <div className="w-full h-40 bg-gray-50 overflow-hidden">
                                  <img
                                    src={file.file_url}
                                    alt={file.file_name}
                                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                  />
                                </div>
                              )}
                              {!isImage && (
                                <div className="w-full h-28 bg-rose-50/70 flex items-center justify-center">
                                  <FileIcon className="w-10 h-10 text-rose-400" />
                                </div>
                              )}

                              <div className="p-4">
                                <p className="font-bold text-gray-900 text-sm truncate" title={file.file_name}>{file.file_name}</p>
                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-0.5">
                                  {file.category} • {file.file_type?.toUpperCase()}
                                </p>
                                <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-50">
                                  <span className="text-[10px] font-bold text-gray-400">
                                    {file?.created_at && !isNaN(new Date(file.created_at).getTime())
                                      ? new Date(file.created_at).toLocaleDateString('en-PH')
                                      : 'Recent'}
                                  </span>
                                  <div className="flex items-center gap-1">
                                    <a
                                      href={file.file_url}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="p-1.5 bg-gray-50 text-gray-400 hover:bg-rose-50 hover:text-rose-600 rounded-lg transition-colors"
                                      title="Open document in new tab"
                                    >
                                      <ExternalLink className="w-4 h-4" />
                                    </a>
                                    <DeleteAttachmentButton
                                      attachmentId={file.id}
                                      fileUrl={file.file_url}
                                      filePath={file.file_path}
                                      patientId={id}
                                    />
                                  </div>
                                </div>
                              </div>
                            </div>
                          );
                        })
                      ) : (
                        <div className="col-span-full py-16 text-center bg-gray-50/50 rounded-2xl border border-dashed border-gray-200">
                          <FileIcon className="w-12 h-12 text-gray-300 mx-auto mb-2" />
                          <p className="text-xs font-bold text-gray-600">No documents uploaded for this patient yet</p>
                          <p className="text-[11px] text-gray-400 mt-0.5">Use the upload box above to attach ultrasound scans or lab records.</p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabErrorBoundary>
          )}
        </div>
      </div>
    </PatientTabsContext.Provider>
  );
}
