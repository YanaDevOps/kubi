type StatCardProps = {
  label: string;
  value: string;
  hint?: string;
};

export default function StatCard({ label, value, hint }: StatCardProps) {
  return (
    <div className="kubi-card rounded-xl p-4">
      <div className="text-xs uppercase tracking-[0.2em] text-slatey-500">{label}</div>
      <div className="mt-2 text-2xl font-semibold text-slate-100">{value}</div>
      {hint ? <div className="mt-1 text-xs text-slatey-500">{hint}</div> : null}
    </div>
  );
}
