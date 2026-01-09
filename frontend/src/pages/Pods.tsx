import { useCallback, useEffect, useMemo, useState } from "react";
import { fetchPods, PodItem } from "../api/client";
import PaginationControls from "../components/PaginationControls";
import PodDrawer from "../components/PodDrawer";
import { useNamespace } from "../state/namespace";
import { useSearch } from "../state/search";

type LoadState = {
  items: PodItem[];
  continueToken: string;
  loading: boolean;
  error: string | null;
};

export default function Pods() {
  const { namespace } = useNamespace();
  const [limit, setLimit] = useState(50);
  const { query, labelSelector } = useSearch();
  const [selectedPod, setSelectedPod] = useState<PodItem | null>(null);
  const [state, setState] = useState<LoadState>({
    items: [],
    continueToken: "",
    loading: false,
    error: null,
  });

  const hasMore = useMemo(() => state.continueToken !== "", [state.continueToken]);
  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return state.items;
    return state.items.filter((item) =>
      `${item.namespace}/${item.name}`.toLowerCase().includes(needle)
    );
  }, [query, state.items]);

  const load = useCallback(
    async (reset: boolean, cont?: string) => {
      setState((prev) => ({ ...prev, loading: true, error: null }));
      try {
        const res = await fetchPods({
          namespace,
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
          error: err instanceof Error ? err.message : "Failed to load pods",
        }));
      }
    },
    [labelSelector, limit, namespace]
  );

  useEffect(() => {
    load(true);
  }, [load]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Pods</h1>
          <p className="mt-2 text-sm text-slatey-400">
            Pod inventory with status, readiness, and restarts.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="rounded-full bg-slatey-800 px-3 py-1 text-xs text-slatey-300">
            Namespace: {namespace}
          </div>
          <div className="rounded-full bg-slatey-800 px-3 py-1 text-xs text-slatey-300">
            Pods loaded: {state.items.length}
          </div>
        </div>
      </div>

      {state.error ? (
        <div className="text-sm text-accent-error">{state.error}</div>
      ) : null}

      <div className="overflow-hidden rounded-xl border border-slatey-800/80">
        <table className="w-full text-left text-sm">
          <thead className="bg-slatey-900/80 text-xs uppercase tracking-widest text-slatey-500">
            <tr>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Namespace</th>
              <th className="px-4 py-3">Phase</th>
              <th className="px-4 py-3">Ready</th>
              <th className="px-4 py-3">Restarts</th>
              <th className="px-4 py-3">Node</th>
              <th className="px-4 py-3">Details</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slatey-800/80">
            {state.loading && state.items.length === 0 ? (
              <tr className="bg-slatey-900/60">
                <td className="px-4 py-3 text-slatey-500" colSpan={7}>
                  Loading pods...
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr className="bg-slatey-900/60">
                <td className="px-4 py-3 text-slatey-500" colSpan={7}>
                  No pods found.
                </td>
              </tr>
            ) : (
              filtered.map((pod) => (
                <tr key={`${pod.namespace}/${pod.name}`} className="bg-slatey-900/60">
                  <td className="px-4 py-3 text-slate-100">{pod.name}</td>
                  <td className="px-4 py-3 text-slatey-300">{pod.namespace}</td>
                  <td className="px-4 py-3 text-slatey-300">{pod.phase}</td>
                  <td className="px-4 py-3">
                    <span
                      className={
                        pod.ready
                          ? "rounded-full bg-emerald-500/20 px-2 py-1 text-xs text-emerald-300"
                          : "rounded-full bg-rose-500/20 px-2 py-1 text-xs text-rose-300"
                      }
                    >
                      {pod.ready ? "Ready" : "Not Ready"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slatey-300">{pod.restarts}</td>
                  <td className="px-4 py-3 text-slatey-300">{pod.node || "-"}</td>
                  <td className="px-4 py-3">
                    <button
                      className="rounded-lg border border-slatey-800 px-3 py-1 text-xs uppercase tracking-widest text-slatey-300 hover:text-slate-100"
                      onClick={() => setSelectedPod(pod)}
                    >
                      View
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <PaginationControls
        label="Pods."
        limit={limit}
        setLimit={setLimit}
        hasMore={hasMore}
        loading={state.loading}
        onLoadMore={() => load(false, state.continueToken)}
      />
      <PodDrawer pod={selectedPod} onClose={() => setSelectedPod(null)} />
    </div>
  );
}
