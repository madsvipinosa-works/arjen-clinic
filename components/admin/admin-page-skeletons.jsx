const Bar = ({ className = "" }) => <div className={`animate-pulse rounded-lg bg-slate-200/80 ${className}`} />;

function PageFrame({ children }) {
  return <div aria-label="Loading page" aria-busy="true" className="mx-auto w-full max-w-7xl space-y-6">{children}</div>;
}

function Header({ compact = false }) {
  return <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
    <Bar className="h-3 w-28" /><Bar className={`mt-4 h-8 ${compact ? "w-1/2" : "w-2/5"}`} /><Bar className="mt-3 h-4 w-3/5" />
  </div>;
}

export function DashboardSkeleton() {
  return <PageFrame><Header /><div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{Array.from({ length: 4 }, (_, i) => <div key={i} className="rounded-3xl border bg-white p-6"><Bar className="h-3 w-28" /><Bar className="mt-4 h-9 w-20" /><Bar className="mt-5 h-3 w-36" /></div>)}</div><div className="grid gap-6 xl:grid-cols-3"><div className="space-y-4 rounded-3xl border bg-white p-6 xl:col-span-2"><Bar className="h-5 w-48" />{Array.from({ length: 5 }, (_, i) => <Bar key={i} className="h-14 w-full" />)}</div><div className="space-y-4 rounded-3xl border bg-white p-6"><Bar className="h-5 w-40" />{Array.from({ length: 4 }, (_, i) => <Bar key={i} className="h-16 w-full" />)}</div></div></PageFrame>;
}

export function AppointmentsSkeleton() {
  return <PageFrame><Header /><div className="flex flex-wrap gap-3 rounded-2xl border bg-white p-4"><Bar className="h-10 w-64" /><Bar className="h-10 w-36" /><Bar className="h-10 w-36" /><Bar className="h-10 w-32" /></div><div className="grid gap-4 xl:grid-cols-4">{Array.from({ length: 4 }, (_, i) => <div key={i} className="min-h-72 rounded-2xl border bg-white p-4"><Bar className="h-5 w-28" /><div className="mt-5 space-y-3">{Array.from({ length: 3 }, (_, j) => <Bar key={j} className="h-20 w-full" />)}</div></div>)}</div></PageFrame>;
}

export function PatientDirectorySkeleton() {
  return <PageFrame><Header /><div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{Array.from({ length: 4 }, (_, i) => <Bar key={i} className="h-28 rounded-3xl" />)}</div><div className="flex gap-3 rounded-2xl border bg-white p-4"><Bar className="h-10 flex-1" /><Bar className="h-10 w-32" /></div><div className="overflow-hidden rounded-3xl border bg-white p-5"><div className="space-y-3">{Array.from({ length: 7 }, (_, i) => <Bar key={i} className="h-14 w-full" />)}</div></div></PageFrame>;
}

export function PatientRecordSkeleton() {
  return <PageFrame><div className="rounded-3xl border bg-white p-6"><div className="flex items-center gap-4"><Bar className="h-16 w-16 rounded-2xl" /><div className="flex-1 space-y-3"><Bar className="h-7 w-64" /><Bar className="h-4 w-80" /></div><Bar className="h-10 w-32" /></div><div className="mt-6 flex gap-3 border-t pt-4">{Array.from({ length: 5 }, (_, i) => <Bar key={i} className="h-9 w-28 rounded-full" />)}</div></div><div className="grid gap-5 lg:grid-cols-3"><div className="space-y-4 lg:col-span-2"><Bar className="h-56 rounded-3xl" /><div className="grid gap-4 sm:grid-cols-2"><Bar className="h-44 rounded-3xl" /><Bar className="h-44 rounded-3xl" /></div></div><div className="space-y-4"><Bar className="h-44 rounded-3xl" /><Bar className="h-56 rounded-3xl" /></div></div></PageFrame>;
}

export function FormPageSkeleton() {
  return <PageFrame><div className="mx-auto max-w-4xl"><Header compact /><div className="mt-6 space-y-6 rounded-3xl border bg-white p-6 md:p-8">{Array.from({ length: 4 }, (_, i) => <div key={i} className="grid gap-4 sm:grid-cols-2"><div className="space-y-2"><Bar className="h-3 w-28" /><Bar className="h-11 w-full" /></div><div className="space-y-2"><Bar className="h-3 w-28" /><Bar className="h-11 w-full" /></div></div>)}<Bar className="h-32 w-full" /><Bar className="h-11 w-40" /></div></div></PageFrame>;
}

export function AnalyticsPageSkeleton() {
  return <PageFrame><Header /><div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{Array.from({ length: 4 }, (_, i) => <Bar key={i} className="h-32 rounded-3xl" />)}</div><div className="grid gap-6 lg:grid-cols-2"><Bar className="h-[380px] rounded-3xl" /><Bar className="h-[380px] rounded-3xl" /></div></PageFrame>;
}

export function AuditLogsSkeleton() {
  return <PageFrame><Header compact /><div className="flex gap-3 rounded-2xl border bg-white p-4"><Bar className="h-10 flex-1" /><Bar className="h-10 w-40" /><Bar className="h-10 w-32" /></div><div className="space-y-3 rounded-3xl border bg-white p-5">{Array.from({ length: 9 }, (_, i) => <Bar key={i} className="h-12 w-full" />)}</div></PageFrame>;
}

export function ConsultationsSkeleton() {
  return <PageFrame><Header compact /><div className="grid min-h-[650px] overflow-hidden rounded-3xl border bg-white lg:grid-cols-[320px_1fr]"><div className="space-y-4 border-r p-4"><Bar className="h-10 w-full" />{Array.from({ length: 7 }, (_, i) => <Bar key={i} className="h-16 w-full" />)}</div><div className="flex flex-col justify-between p-6"><div className="space-y-4">{Array.from({ length: 5 }, (_, i) => <Bar key={i} className={`h-16 ${i % 2 ? "ml-auto w-3/5" : "w-3/4"}`} />)}</div><Bar className="h-24 w-full" /></div></div></PageFrame>;
}

export function CmsSkeleton() {
  return <PageFrame><Header compact /><div className="flex gap-2 border-b pb-3">{Array.from({ length: 5 }, (_, i) => <Bar key={i} className="h-10 w-28 rounded-full" />)}</div><div className="grid gap-6 lg:grid-cols-2">{Array.from({ length: 4 }, (_, i) => <div key={i} className="space-y-4 rounded-3xl border bg-white p-6"><Bar className="h-5 w-40" /><Bar className="h-4 w-3/4" /><Bar className="h-11 w-full" /><Bar className="h-36 w-full" /><Bar className="h-10 w-32" /></div>)}</div></PageFrame>;
}

export function ScheduleSkeleton() {
  return <PageFrame><Header compact /><div className="grid gap-6 xl:grid-cols-2"><div className="space-y-4 rounded-3xl border bg-white p-6"><Bar className="h-6 w-44" />{Array.from({ length: 5 }, (_, i) => <Bar key={i} className="h-16 w-full" />)}</div><div className="space-y-4 rounded-3xl border bg-white p-6"><Bar className="h-6 w-44" /><Bar className="h-64 w-full" /><Bar className="h-12 w-full" /></div></div><Bar className="h-56 rounded-3xl" /></PageFrame>;
}

export function SettingsSkeleton() {
  return <PageFrame><Header compact /><div className="grid gap-8 lg:grid-cols-2">{Array.from({ length: 2 }, (_, i) => <div key={i} className="space-y-6 rounded-3xl border bg-white p-8"><Bar className="h-8 w-48" />{Array.from({ length: 5 }, (_, j) => <div key={j} className="space-y-2"><Bar className="h-3 w-32" /><Bar className="h-11 w-full" /></div>)}<Bar className="h-11 w-36" /></div>)}</div></PageFrame>;
}

export function SetupSkeleton() {
  return <div aria-label="Loading setup" aria-busy="true" className="flex min-h-[70vh] items-center justify-center"><div className="w-full max-w-lg space-y-5 rounded-3xl border bg-white p-8 shadow-sm"><Bar className="mx-auto h-14 w-14 rounded-2xl" /><Bar className="mx-auto h-7 w-2/3" /><Bar className="mx-auto h-4 w-4/5" />{Array.from({ length: 3 }, (_, i) => <div key={i} className="space-y-2"><Bar className="h-3 w-24" /><Bar className="h-11 w-full" /></div>)}<Bar className="h-11 w-full" /></div></div>;
}

export function PrintRecordSkeleton() {
  return <div aria-label="Loading printable clinical record" aria-busy="true" className="mx-auto max-w-5xl space-y-5 bg-white p-8"><div className="flex items-center justify-between border-b pb-6"><div className="space-y-3"><Bar className="h-7 w-72" /><Bar className="h-4 w-56" /></div><Bar className="h-16 w-16 rounded-full" /></div><Bar className="h-24 w-full" /><div className="grid grid-cols-2 gap-5">{Array.from({ length: 6 }, (_, i) => <Bar key={i} className="h-28 w-full" />)}</div><Bar className="h-52 w-full" /></div>;
}
