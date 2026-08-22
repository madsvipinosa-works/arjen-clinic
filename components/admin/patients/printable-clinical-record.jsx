import React from 'react';

/**
 * Format a date string into readable Philippine Date (e.g. Oct 24, 2026)
 */
function formatDate(dateStr) {
  if (!dateStr) return '—';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString('en-PH', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

/**
 * Format timestamp in Asia/Manila (PHT)
 */
function formatPHTDateTime(date = new Date()) {
  try {
    return new Intl.DateTimeFormat('en-PH', {
      timeZone: 'Asia/Manila',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true,
    }).format(new Date(date));
  } catch {
    return new Date(date).toLocaleString();
  }
}

/**
 * Calculate Gestational Age (AOG) from LMP
 */
function calculateAOG(lmpStr) {
  if (!lmpStr) return null;
  try {
    const lmpDate = new Date(lmpStr);
    const now = new Date();
    const diffTime = now.getTime() - lmpDate.getTime();
    if (diffTime < 0) return null;
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    const weeks = Math.floor(diffDays / 7);
    const days = diffDays % 7;
    return `${weeks} ${days}/7 wks`;
  } catch {
    return null;
  }
}

export function PrintableClinicalRecord({
  patient,
  maternalEpisodes = [],
  activeEpisode = null,
  visitLogs = [],
  prenatalRecord = null,
  birthPlan = null,
  generatedBy = 'AR-JEN Clinic Staff',
  documentId = null,
}) {
  const currentEpisode = activeEpisode || maternalEpisodes?.[0] || null;
  const aogCalculated = calculateAOG(currentEpisode?.lmp);
  const docRef = documentId || `ARJ-${(patient?.id || '0000').slice(0, 8).toUpperCase()}-${Date.now().toString().slice(-6)}`;
  const phtTimestamp = formatPHTDateTime();

  const modularData = prenatalRecord?.modular_data || {};
  const healthHistory = modularData?.health_history?.content || prenatalRecord?.health_history;
  const labResults = modularData?.lab_results?.content || prenatalRecord?.lab_results;
  const obHistoryText = modularData?.ob_history?.content;
  const physicalExamText = modularData?.physical_exam?.content;

  return (
    <div className="w-full max-w-[210mm] mx-auto bg-white text-gray-900 font-sans p-6 sm:p-10 print:p-0 print:max-w-none text-xs leading-normal">
      {/* ── CLINICAL HEADER & BRANDING ── */}
      <header className="border-b-2 border-gray-900 pb-4 mb-5 avoid-break">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            {/* Inline SVG Clinic Logo */}
            <div className="w-14 h-14 rounded-xl border-2 border-rose-600 bg-rose-50 flex items-center justify-center p-1.5 flex-shrink-0 print:border-gray-900 print:bg-white">
              <svg
                viewBox="0 0 48 48"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                className="w-full h-full text-rose-600 print:text-gray-900"
              >
                <path
                  d="M24 6C17.5 6 12 11.5 12 18C12 28.5 24 42 24 42C24 42 36 28.5 36 18C36 11.5 30.5 6 24 6Z"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M24 14V22M20 18H28"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                />
              </svg>
            </div>

            <div>
              <h1 className="text-lg sm:text-xl font-black tracking-tight text-gray-900 uppercase">
                AR-JEN Maternity &amp; Lying-In Clinic
              </h1>
              <p className="text-[11px] font-semibold text-gray-600 print:text-gray-800">
                Maternal, Neonatal &amp; Primary Healthcare Services
              </p>
              <p className="text-[10px] text-gray-500 print:text-gray-700 mt-0.5">
                Main Clinic Bldg., Manila, Philippines • Tel: (02) 8123-4567 • PhilHealth Accredited Facility
              </p>
            </div>
          </div>

          {/* Verification Badge */}
          <div className="text-right flex-shrink-0">
            <div className="inline-block border border-gray-900 px-2.5 py-1 rounded bg-gray-50 print:bg-white text-right">
              <div className="text-[9px] font-bold uppercase tracking-wider text-gray-500 print:text-gray-700">Document Ref</div>
              <div className="font-mono font-bold text-[11px] text-gray-900">{docRef}</div>
            </div>
            <div className="text-[9px] text-gray-500 mt-1">DPA 2012 COMPLIANT</div>
          </div>
        </div>

        {/* Document Title Banner */}
        <div className="mt-4 pt-3 border-t border-dashed border-gray-300 flex items-center justify-between">
          <div className="text-sm font-black tracking-wider uppercase text-gray-900">
            Official Clinical Summary &amp; Prenatal Chart
          </div>
          <div className="flex items-center gap-2">
            {patient?.is_high_risk && (
              <span className="border border-red-600 text-red-700 font-bold px-2 py-0.5 rounded text-[10px] uppercase tracking-wider print:border-gray-900 print:text-black">
                ⚠️ HIGH RISK PREGNANCY
              </span>
            )}
            <span className="bg-gray-100 print:bg-white border border-gray-300 text-gray-800 font-bold px-2 py-0.5 rounded text-[10px] uppercase tracking-wider">
              {currentEpisode?.status ? `${currentEpisode.status} Episode` : 'Active Record'}
            </span>
          </div>
        </div>
      </header>

      {/* ── PATIENT DEMOGRAPHICS & OBSTETRIC PROFILE ── */}
      <section className="mb-5 avoid-break">
        <div className="border border-gray-900 rounded-lg overflow-hidden">
          <div className="bg-gray-100 print:bg-gray-200 border-b border-gray-900 px-3 py-1.5 font-bold uppercase tracking-wider text-[11px] text-gray-900 flex justify-between items-center">
            <span>I. Patient Identification &amp; Demographics</span>
            <span className="text-[10px] font-mono font-normal">Patient No: {patient?.id?.slice(0, 13)}</span>
          </div>

          <div className="p-3 grid grid-cols-2 sm:grid-cols-4 gap-x-4 gap-y-2.5">
            <div>
              <div className="text-[9px] uppercase font-bold text-gray-500 print:text-gray-700">Patient Full Name</div>
              <div className="font-bold text-[12px] text-gray-900">{patient?.full_name || '—'}</div>
            </div>

            <div>
              <div className="text-[9px] uppercase font-bold text-gray-500 print:text-gray-700">Age / Date of Birth</div>
              <div className="font-semibold text-gray-900">
                {patient?.age ? `${patient.age} yrs` : '—'} {patient?.date_of_birth ? `(${formatDate(patient.date_of_birth)})` : ''}
              </div>
            </div>

            <div>
              <div className="text-[9px] uppercase font-bold text-gray-500 print:text-gray-700">Blood Type</div>
              <div className="font-bold text-rose-700 print:text-gray-900">{patient?.blood_type || 'Unspecified'}</div>
            </div>

            <div>
              <div className="text-[9px] uppercase font-bold text-gray-500 print:text-gray-700">Civil Status</div>
              <div className="font-semibold text-gray-900">{patient?.civil_status || '—'}</div>
            </div>

            <div>
              <div className="text-[9px] uppercase font-bold text-gray-500 print:text-gray-700">Contact Number</div>
              <div className="font-semibold text-gray-900">{patient?.contact_number || '—'}</div>
            </div>

            <div>
              <div className="text-[9px] uppercase font-bold text-gray-500 print:text-gray-700">Spouse / Partner</div>
              <div className="font-semibold text-gray-900">{patient?.husband_partner_name || '—'}</div>
            </div>

            <div className="sm:col-span-2">
              <div className="text-[9px] uppercase font-bold text-gray-500 print:text-gray-700">Residential Address</div>
              <div className="font-semibold text-gray-900">{patient?.address || '—'}</div>
            </div>

            {patient?.allergies && (
              <div className="col-span-2 sm:col-span-4 bg-amber-50 print:bg-white border border-amber-300 print:border-gray-900 p-2 rounded">
                <span className="font-bold text-amber-900 print:text-black uppercase text-[10px]">Known Allergies: </span>
                <span className="font-semibold text-gray-900">{patient.allergies}</span>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ── OBSTETRIC SCORE & CURRENT PREGNANCY PROFILE ── */}
      <section className="mb-5 avoid-break">
        <div className="border border-gray-900 rounded-lg overflow-hidden">
          <div className="bg-gray-100 print:bg-gray-200 border-b border-gray-900 px-3 py-1.5 font-bold uppercase tracking-wider text-[11px] text-gray-900">
            II. Obstetrical Profile &amp; Gestational Status
          </div>

          <div className="p-3 grid grid-cols-2 sm:grid-cols-5 gap-3 text-center sm:text-left">
            <div className="border-r border-gray-200 print:border-gray-300 pr-2">
              <div className="text-[9px] uppercase font-bold text-gray-500 print:text-gray-700">Obstetric Score</div>
              <div className="font-black text-sm text-gray-900 mt-0.5">
                G{currentEpisode?.gravida ?? '—'} P{currentEpisode?.para ?? '—'}
              </div>
              <div className="text-[9px] text-gray-500 font-mono">
                {currentEpisode?.gravida != null && currentEpisode?.para != null ? `(TPAL: ${currentEpisode.para}-0-0-${currentEpisode.para})` : ''}
              </div>
            </div>

            <div className="border-r border-gray-200 print:border-gray-300 pr-2">
              <div className="text-[9px] uppercase font-bold text-gray-500 print:text-gray-700">LMP (Last Menses)</div>
              <div className="font-bold text-gray-900 mt-0.5">{formatDate(currentEpisode?.lmp)}</div>
            </div>

            <div className="border-r border-gray-200 print:border-gray-300 pr-2">
              <div className="text-[9px] uppercase font-bold text-gray-500 print:text-gray-700">EDD / EDC (Due Date)</div>
              <div className="font-bold text-rose-700 print:text-gray-900 mt-0.5">{formatDate(currentEpisode?.edc)}</div>
            </div>

            <div className="border-r border-gray-200 print:border-gray-300 pr-2">
              <div className="text-[9px] uppercase font-bold text-gray-500 print:text-gray-700">Calculated AOG</div>
              <div className="font-bold text-gray-900 mt-0.5">{aogCalculated || '—'}</div>
            </div>

            <div>
              <div className="text-[9px] uppercase font-bold text-gray-500 print:text-gray-700">PhilHealth PIN</div>
              <div className="font-semibold text-gray-900 mt-0.5">
                {birthPlan?.philhealth_number || (birthPlan?.is_philhealth_member === 'OO' ? 'Active Member' : 'None / Private')}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── CLINICAL OBSERVATIONS & PRENATAL VISITS TABLE ── */}
      <section className="mb-5">
        <div className="border border-gray-900 rounded-lg overflow-hidden">
          <div className="bg-gray-100 print:bg-gray-200 border-b border-gray-900 px-3 py-1.5 font-bold uppercase tracking-wider text-[11px] text-gray-900 flex justify-between items-center">
            <span>III. Prenatal Visit Logs &amp; Vital Signs Tracking</span>
            <span className="text-[10px] font-normal">Total Visits: {visitLogs?.length || 0}</span>
          </div>

          <table className="w-full text-left border-collapse text-[10px]">
            <thead>
              <tr className="border-b border-gray-900 bg-gray-50 print:bg-gray-100 font-bold uppercase text-gray-700 print:text-gray-900">
                <th className="py-2 px-2 border-r border-gray-300 w-20">Date</th>
                <th className="py-2 px-2 border-r border-gray-300 w-16">AOG</th>
                <th className="py-2 px-2 border-r border-gray-300 w-16">BP</th>
                <th className="py-2 px-2 border-r border-gray-300 w-12">Wt</th>
                <th className="py-2 px-2 border-r border-gray-300 w-12">FH</th>
                <th className="py-2 px-2 border-r border-gray-300 w-14">FHT</th>
                <th className="py-2 px-2 border-r border-gray-300">Clinical Notes &amp; Management</th>
                <th className="py-2 px-2 w-20">Next Visit</th>
              </tr>
            </thead>
            <tbody>
              {visitLogs && visitLogs.length > 0 ? (
                visitLogs.map((log, idx) => (
                  <tr
                    key={log.id || idx}
                    className="border-b border-gray-200 print:border-gray-300 avoid-break odd:bg-white even:bg-gray-50/50 print:even:bg-white"
                  >
                    <td className="py-2 px-2 border-r border-gray-200 font-bold text-gray-900 whitespace-nowrap">
                      {formatDate(log.visit_date)}
                    </td>
                    <td className="py-2 px-2 border-r border-gray-200 whitespace-nowrap">
                      {log.aog_by_lmp || log.aog_by_utz || '—'}
                    </td>
                    <td className="py-2 px-2 border-r border-gray-200 font-semibold whitespace-nowrap">
                      {log.bp || '—'}
                    </td>
                    <td className="py-2 px-2 border-r border-gray-200 whitespace-nowrap">
                      {log.weight ? `${log.weight} kg` : '—'}
                    </td>
                    <td className="py-2 px-2 border-r border-gray-200 whitespace-nowrap">
                      {log.fh ? `${log.fh} cm` : '—'}
                    </td>
                    <td className="py-2 px-2 border-r border-gray-200 whitespace-nowrap">
                      {log.fht ? `${log.fht} bpm` : '—'}
                    </td>
                    <td className="py-2 px-2 border-r border-gray-200 text-gray-800 leading-snug">
                      <div>{log.doctor_notes || 'Routine checkup.'}</div>
                      {log.ie && (
                        <div className="text-[9px] text-gray-600 mt-0.5">
                          <span className="font-bold">IE:</span> {log.ie}
                        </div>
                      )}
                    </td>
                    <td className="py-2 px-2 font-medium text-gray-700 whitespace-nowrap">
                      {formatDate(log.next_visit)}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={8} className="py-4 text-center text-gray-400 italic">
                    No clinical visit logs recorded.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* ── MODULAR CLINICAL RECORDS & LABS (IF AVAILABLE) ── */}
      {(healthHistory || labResults || obHistoryText || physicalExamText) && (
        <section className="mb-5 avoid-break">
          <div className="border border-gray-900 rounded-lg overflow-hidden">
            <div className="bg-gray-100 print:bg-gray-200 border-b border-gray-900 px-3 py-1.5 font-bold uppercase tracking-wider text-[11px] text-gray-900">
              IV. Supplementary Clinical Findings &amp; Diagnostics
            </div>
            <div className="p-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
              {healthHistory && (
                <div className="border border-gray-200 rounded p-2.5 bg-gray-50/50 print:bg-white">
                  <div className="font-bold uppercase text-[9px] text-gray-600 mb-1">Health &amp; Medical History</div>
                  <div className="whitespace-pre-wrap text-gray-800 text-[10px] leading-relaxed">
                    {typeof healthHistory === 'string' ? healthHistory : JSON.stringify(healthHistory, null, 2)}
                  </div>
                </div>
              )}

              {labResults && (
                <div className="border border-gray-200 rounded p-2.5 bg-gray-50/50 print:bg-white">
                  <div className="font-bold uppercase text-[9px] text-gray-600 mb-1">Laboratory &amp; Diagnostic Results</div>
                  <div className="whitespace-pre-wrap text-gray-800 text-[10px] leading-relaxed">
                    {typeof labResults === 'string' ? labResults : JSON.stringify(labResults, null, 2)}
                  </div>
                </div>
              )}

              {obHistoryText && (
                <div className="border border-gray-200 rounded p-2.5 bg-gray-50/50 print:bg-white">
                  <div className="font-bold uppercase text-[9px] text-gray-600 mb-1">Obstetrical History Details</div>
                  <div className="whitespace-pre-wrap text-gray-800 text-[10px] leading-relaxed">{obHistoryText}</div>
                </div>
              )}

              {physicalExamText && (
                <div className="border border-gray-200 rounded p-2.5 bg-gray-50/50 print:bg-white">
                  <div className="font-bold uppercase text-[9px] text-gray-600 mb-1">Physical Examination</div>
                  <div className="whitespace-pre-wrap text-gray-800 text-[10px] leading-relaxed">{physicalExamText}</div>
                </div>
              )}
            </div>
          </div>
        </section>
      )}

      {/* ── BIRTH PLAN SUMMARY (IF AVAILABLE) ── */}
      {birthPlan && (
        <section className="mb-5 avoid-break">
          <div className="border border-gray-900 rounded-lg overflow-hidden">
            <div className="bg-gray-100 print:bg-gray-200 border-b border-gray-900 px-3 py-1.5 font-bold uppercase tracking-wider text-[11px] text-gray-900">
              V. Birth &amp; Delivery Plan Preferences
            </div>
            <div className="p-3 grid grid-cols-2 sm:grid-cols-4 gap-2 text-[10px]">
              <div>
                <span className="font-bold text-gray-500">Planned Location:</span>{' '}
                <span className="font-semibold text-gray-900">{birthPlan.delivery_location || '—'}</span>
              </div>
              <div>
                <span className="font-bold text-gray-500">Birth Attendant:</span>{' '}
                <span className="font-semibold text-gray-900">{birthPlan.birth_attendant || '—'}</span>
              </div>
              <div>
                <span className="font-bold text-gray-500">Accompanying Person:</span>{' '}
                <span className="font-semibold text-gray-900">
                  {birthPlan.companion_type} {birthPlan.companion_family_name ? `(${birthPlan.companion_family_name})` : ''}
                </span>
              </div>
              <div>
                <span className="font-bold text-gray-500">Payment / Coverage:</span>{' '}
                <span className="font-semibold text-gray-900">{birthPlan.payment_method || 'PhilHealth / Out-of-pocket'}</span>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ── CLINICIAN SIGNATURE & AUTHENTICATION BLOCK ── */}
      <section className="mt-8 pt-4 border-t-2 border-gray-900 avoid-break">
        <div className="grid grid-cols-2 gap-8 items-end">
          <div>
            <div className="text-[10px] text-gray-500 print:text-gray-700 leading-tight">
              <p className="font-bold text-gray-800">CLINICAL ATTESTATION</p>
              <p className="mt-1">
                I hereby certify that the clinical findings, prenatal check-up logs, and vital evaluations contained herein reflect the accurate medical records of the aforementioned patient at AR-JEN Maternity and Lying-In Clinic.
              </p>
            </div>
            <div className="mt-4 text-[9px] text-gray-400 font-mono">
              Printed on {phtTimestamp} (PHT) by {generatedBy}
            </div>
          </div>

          <div className="text-center">
            <div className="border-b border-gray-900 pb-1 mb-1 mx-auto max-w-[240px]">
              {/* Clinician Signature Line */}
            </div>
            <div className="font-bold text-[11px] text-gray-900 uppercase">Attending Clinician / Licensed Midwife</div>
            <div className="text-[10px] text-gray-600">PRC License No. &amp; Clinic Stamp</div>
          </div>
        </div>
      </section>

      {/* ── PRIVACY & DPA 2012 COMPLIANCE FOOTER ── */}
      <footer className="mt-6 pt-3 border-t border-dashed border-gray-300 text-[9px] text-gray-500 flex justify-between items-center avoid-break">
        <div>
          <span className="font-bold">CONFIDENTIAL MEDICAL RECORD:</span> Privileged communication protected under Republic Act No. 10173 (Philippine Data Privacy Act of 2012).
        </div>
        <div className="font-mono font-semibold">
          Doc Ref: {docRef}
        </div>
      </footer>
    </div>
  );
}
