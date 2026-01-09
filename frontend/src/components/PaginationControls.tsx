type PaginationControlsProps = {
  limit: number;
  setLimit: (value: number) => void;
  hasMore: boolean;
  loading: boolean;
  onLoadMore: () => void;
  label?: string;
};

const LIMITS = [25, 50, 100, 200];

export default function PaginationControls({
  limit,
  setLimit,
  hasMore,
  loading,
  onLoadMore,
  label,
}: PaginationControlsProps) {
  return (
    <div className="flex items-center justify-between">
      <div className="text-xs text-slatey-500">
        {label} {hasMore ? "More results available." : "End of list."}
      </div>
      <div className="flex items-center gap-2">
        <label className="flex items-center gap-2 rounded-full bg-slatey-800 px-3 py-1 text-xs text-slatey-300">
          Limit
          <select
            className="bg-transparent text-slate-100 focus:outline-none"
            value={limit}
            onChange={(event) => setLimit(Number(event.target.value))}
          >
            {LIMITS.map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
        </label>
        <button
          className="rounded-lg border border-slatey-800 px-4 py-2 text-xs uppercase tracking-widest text-slatey-300 hover:text-slate-100 disabled:opacity-50"
          onClick={onLoadMore}
          disabled={!hasMore || loading}
        >
          {loading ? "Loading..." : "Load more"}
        </button>
      </div>
    </div>
  );
}
