import { useQuery } from "@tanstack/react-query";
import { useCallback, useEffect, useMemo, useState } from "react";
import { fetchNamespaces, fetchPods, NamespaceItem } from "../api/client";
import PaginationControls from "../components/PaginationControls";
import { useNamespace } from "../state/namespace";
import { useSearch } from "../state/search";

export default function Namespaces() {
  const { namespace } = useNamespace();
  const { query, labelSelector } = useSearch();
  const [limit, setLimit] = useState(50);
  const [state, setState] = useState({
    items: [] as NamespaceItem[],
    continueToken: "",
    loading: false,
    error: null as string | null,
  });
  const podsQuery = useQuery({
    queryKey: ["pods-count", namespace],
    queryFn: () => fetchPods({ namespace, limit: 200, labelSelector }),
    enabled: namespace !== "all",
  });

  const load = useCallback(
    async (reset: boolean, cont?: string) => {
      setState((prev) => ({ ...prev, loading: true, error: null }));
      try {
        const res = await fetchNamespaces({
          limit,
          cont: reset ? undefined : cont,
          labelSelector,
        });
        setState((prev) => ({
          items: reset ? res.items : [...prev.items, ...res.items],
          continueToken: res.continue,
          loading: false,
          error: null,
        }));
      } catch (err) {
        setState((prev) => ({
          ...prev,
          loading: false,
          error: err instanceof Error ? err.message : "Failed to load namespaces",
        }));
      }
    },
    [labelSelector, limit]
  );

  useEffect(() => {
    load(true);
  }, [load]);

  const filteredItems = useMemo(() => {
    const scoped = namespace === "all" ? state.items : state.items.filter((ns) => ns.name === namespace);
    const needle = query.trim().toLowerCase();
    if (!needle) return scoped;
    return scoped.filter((ns) => {
      const labelText = Object.entries(ns.labels ?? {})
        .map(([key, value]) => `${key}=${value}`)
        .join(" ");
      return `${ns.name} ${labelText}`.toLowerCase().includes(needle);
    });
  }, [state.items, namespace, query]);
  const podsCount = podsQuery.data?.items.length ?? 0;
  const podsHasMore = podsQuery.data?.continue ? true : false;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Namespaces</h1>
          <p className="mt-2 text-sm text-slatey-400">All namespaces and their status.</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="rounded-full bg-slatey-800 px-3 py-1 text-xs text-slatey-300">
            Filter: {namespace}
          </div>
          {namespace !== "all" ? (
            <div className="rounded-full bg-slatey-800 px-3 py-1 text-xs text-slatey-300">
              Pods: {podsCount}
              {podsHasMore ? "+" : ""}
            </div>
          ) : null}
        </div>
      </div>
      {state.error ? <div className="text-sm text-accent-error">{state.error}</div> : null}
      <div className="overflow-hidden rounded-xl border border-slatey-800/80">
        <table className="w-full text-left text-sm">
          <thead className="bg-slatey-900/80 text-xs uppercase tracking-widest text-slatey-500">
            <tr>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Labels</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slatey-800/80">
            {state.loading && state.items.length === 0 ? (
              <tr className="bg-slatey-900/60">
                <td className="px-4 py-3 text-slatey-500" colSpan={3}>
                  Loading namespaces...
                </td>
              </tr>
            ) : filteredItems.length === 0 ? (
              <tr className="bg-slatey-900/60">
                <td className="px-4 py-3 text-slatey-500" colSpan={3}>
                  No namespaces found.
                </td>
              </tr>
            ) : (
              filteredItems.map((ns) => (
                <tr key={ns.name} className="bg-slatey-900/60">
                  <td className="px-4 py-3 text-slate-100">{ns.name}</td>
                  <td className="px-4 py-3 text-slatey-300">{ns.status}</td>
                  <td className="px-4 py-3 text-slatey-300">
                    {Object.keys(ns.labels ?? {}).length > 0
                      ? Object.entries(ns.labels ?? {})
                          .slice(0, 3)
                          .map(([key, value]) => `${key}=${value}`)
                          .join(", ")
                      : "-"}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      <PaginationControls
        label="Namespaces."
        limit={limit}
        setLimit={setLimit}
        hasMore={state.continueToken !== ""}
        loading={state.loading}
        onLoadMore={() => load(false, state.continueToken)}
      />
    </div>
  );
}
