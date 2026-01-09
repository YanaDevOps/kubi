type StatCardProps = {
  label: string;
  value: string;
  hint?: string;
};

export default function StatCard({ label, value, hint }: StatCardProps) {
  return (
    <div className="rounded-xl border border-slatey-800/80 bg-slatey-900/80 p-4 shadow-panel">
      <div className="text-xs uppercase tracking-[0.2em] text-slatey-500">{label}</div>
      <div className="mt-2 text-2xl font-semibold text-slate-100">{value}</div>
      {hint ? <div className="mt-1 text-xs text-slatey-500">{hint}</div> : null}
    </div>
  );
}
