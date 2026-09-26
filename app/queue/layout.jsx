export const metadata = {
  title: "Waiting Lobby Queue Display | AR-JEN Clinic",
  description: "Live real-time patient queue and triage display for clinic lobby screen.",
};

export default function QueueLayout({ children }) {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 antialiased selection:bg-rose-500 selection:text-white">
      {children}
    </div>
  );
}
