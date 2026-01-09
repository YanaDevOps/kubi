import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchValidation } from "../api/client";
import { useNamespace } from "../state/namespace";
import { useSearch } from "../state/search";

function severityBadge(severity: string) {
  switch (severity) {
    case "critical":
      return "bg-rose-500/20 text-rose-300";
    case "warning":
      return "bg-amber-500/20 text-amber-300";
    default:
      return "bg-slatey-800 text-slatey-300";
  }
}

export default function Validation() {
  const { namespace } = useNamespace();
  const { query, labelSelector } = useSearch();
  const { data, isLoading, error } = useQuery({
    queryKey: ["validation", namespace, labelSelector],
    queryFn: () => fetchValidation({ namespace, labelSelector }),
  });

  const filtered = useMemo(() => {
    if (!data) return [];
    const needle = query.trim().toLowerCase();
    if (!needle) return data.items;
    return data.items.filter((item) =>
      `${item.title} ${item.details} ${item.objects.join(" ")}`.toLowerCase().includes(needle)
    );
  }, [data, query]);

  if (isLoading) {
    return <div className="text-sm text-slatey-400">Loading validations...</div>;
  }

  if (error || !data) {
    return (
      <div className="text-sm text-accent-error">
        Failed to load validation checks. Ensure the backend can reach the cluster.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Validation</h1>
          <p className="mt-2 text-sm text-slatey-400">
            Sanity checks for missing endpoints, readiness issues, and risky RBAC patterns.
          </p>
        </div>
        <div className="rounded-full bg-slatey-800 px-3 py-1 text-xs text-slatey-300">
          Namespace: {namespace}
        </div>
      </div>

      <div className="space-y-3">
        {filtered.length === 0 ? (
          <div className="rounded-xl border border-slatey-800/80 bg-slatey-900/70 px-4 py-3 text-sm text-slatey-500">
            No validation issues found.
          </div>
        ) : (
          filtered.map((item) => (
            <div key={item.id} className="rounded-xl border border-slatey-800/80 bg-slatey-900/70 p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <div className="text-sm font-semibold text-slate-100">{item.title}</div>
                  <div className="mt-1 text-xs text-slatey-400">{item.details}</div>
                </div>
                <div className={`rounded-full px-3 py-1 text-xs uppercase tracking-widest ${severityBadge(item.severity)}`}>
                  {item.severity}
                </div>
              </div>
              {item.objects.length > 0 ? (
                <div className="mt-3 text-sm text-slatey-300">
                  {item.objects.slice(0, 8).map((obj) => (
                    <div key={obj}>{obj}</div>
                  ))}
                  {item.objects.length > 8 ? (
                    <div className="text-xs text-slatey-500">+{item.objects.length - 8} more</div>
                  ) : null}
                </div>
              ) : null}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
