import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchMetrics } from "../api/client";
import { useNamespace } from "../state/namespace";
import { useSearch } from "../state/search";

export default function Metrics() {
  const { namespace } = useNamespace();
  const { query, labelSelector } = useSearch();
  const { data, isLoading, error } = useQuery({
    queryKey: ["metrics", namespace, labelSelector],
    queryFn: () => fetchMetrics({ namespace, labelSelector }),
  });

  const filtered = useMemo(() => {
    if (!data) return null;
    const needle = query.trim().toLowerCase();
    const filter = (value: string) => !needle || value.toLowerCase().includes(needle);
    return {
      nodes: data.nodes.filter((item) => filter(item.name)),
      pods: data.pods.filter((item) => filter(`${item.namespace}/${item.name}`)),
    };
  }, [data, query]);

  if (isLoading) {
    return <div className="text-sm text-slatey-400">Loading metrics...</div>;
  }

  if (error || !data || !filtered) {
    return (
      <div className="text-sm text-accent-error">
        Failed to load metrics. Ensure the backend can reach the cluster.
      </div>
    );
  }

  if (!data.available) {
    return (
      <div className="rounded-xl border border-slatey-800/80 bg-slatey-900/70 px-4 py-3 text-sm text-slatey-300">
        Metrics not available. {data.message || "Install metrics-server to enable."}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Metrics</h1>
          <p className="mt-2 text-sm text-slatey-400">
            Best-effort CPU and memory usage from metrics.k8s.io.
          </p>
        </div>
        <div className="rounded-full bg-slatey-800 px-3 py-1 text-xs text-slatey-300">
          Namespace: {namespace}
        </div>
      </div>

      <section className="space-y-2">
        <div className="text-xs uppercase tracking-widest text-slatey-500">Node metrics</div>
        <div className="overflow-hidden rounded-xl border border-slatey-800/80">
          <table className="w-full text-left text-sm">
            <thead className="bg-slatey-900/80 text-xs uppercase tracking-widest text-slatey-500">
              <tr>
                <th className="px-4 py-3">Node</th>
                <th className="px-4 py-3">CPU</th>
                <th className="px-4 py-3">Memory</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slatey-800/80">
              {filtered.nodes.length === 0 ? (
                <tr className="bg-slatey-900/60">
                  <td className="px-4 py-3 text-slatey-500" colSpan={3}>
                    No node metrics found.
                  </td>
                </tr>
              ) : (
                filtered.nodes.map((item) => (
                  <tr key={item.name} className="bg-slatey-900/60">
                    <td className="px-4 py-3 text-slate-100">{item.name}</td>
                    <td className="px-4 py-3 text-slatey-300">{item.cpu || "-"}</td>
                    <td className="px-4 py-3 text-slatey-300">{item.memory || "-"}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="space-y-2">
        <div className="text-xs uppercase tracking-widest text-slatey-500">Pod metrics</div>
        <div className="overflow-hidden rounded-xl border border-slatey-800/80">
          <table className="w-full text-left text-sm">
            <thead className="bg-slatey-900/80 text-xs uppercase tracking-widest text-slatey-500">
              <tr>
                <th className="px-4 py-3">Pod</th>
                <th className="px-4 py-3">CPU</th>
                <th className="px-4 py-3">Memory</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slatey-800/80">
              {filtered.pods.length === 0 ? (
                <tr className="bg-slatey-900/60">
                  <td className="px-4 py-3 text-slatey-500" colSpan={3}>
                    No pod metrics found.
                  </td>
                </tr>
              ) : (
                filtered.pods.map((item) => (
                  <tr key={`${item.namespace}/${item.name}`} className="bg-slatey-900/60">
                    <td className="px-4 py-3 text-slate-100">
                      {item.namespace ? `${item.namespace}/` : ""}{item.name}
                    </td>
                    <td className="px-4 py-3 text-slatey-300">{item.cpu || "-"}</td>
                    <td className="px-4 py-3 text-slatey-300">{item.memory || "-"}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
