import { useCallback, useEffect, useMemo, useState } from "react";
import { fetchNodes, NodeItem } from "../api/client";
import PaginationControls from "../components/PaginationControls";
import { useNamespace } from "../state/namespace";
import { useSearch } from "../state/search";

export default function Nodes() {
  const { namespace } = useNamespace();
  const { query, labelSelector } = useSearch();
  const [limit, setLimit] = useState(50);
  const [state, setState] = useState({
    items: [] as NodeItem[],
    continueToken: "",
    loading: false,
    error: null as string | null,
  });

  const load = useCallback(
    async (reset: boolean, cont?: string) => {
      setState((prev) => ({ ...prev, loading: true, error: null }));
      try {
        const res = await fetchNodes({
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
          error: err instanceof Error ? err.message : "Failed to load nodes",
        }));
      }
    },
    [labelSelector, limit]
  );

  useEffect(() => {
    load(true);
  }, [load]);

  const filteredItems = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return state.items;
    return state.items.filter((node) => {
      const roles = node.roles.join(" ");
      return `${node.name} ${roles}`.toLowerCase().includes(needle);
    });
  }, [state.items, query]);

  if (state.loading && state.items.length === 0) {
    return <div className="text-sm text-slatey-400">Loading nodes...</div>;
  }

  if (state.error) {
    return <div className="text-sm text-accent-error">{state.error}</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Nodes</h1>
          <p className="mt-2 text-sm text-slatey-400">
            Read-only node status and version info from the cluster.
          </p>
        </div>
        <div className="rounded-full bg-slatey-800 px-3 py-1 text-xs text-slatey-300">
          Namespace filter: {namespace} (cluster-wide)
        </div>
      </div>
      {filteredItems.length === 0 && state.items.length > 0 ? (
        <div className="text-xs text-slatey-500">No nodes match the current search.</div>
      ) : null}
      <div className="overflow-hidden rounded-xl border border-slatey-800/80">
        <table className="w-full text-left text-sm">
          <thead className="bg-slatey-900/80 text-xs uppercase tracking-widest text-slatey-500">
            <tr>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Ready</th>
              <th className="px-4 py-3">Roles</th>
              <th className="px-4 py-3">Kubelet</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slatey-800/80">
            {filteredItems.length === 0 ? (
              <tr className="bg-slatey-900/60">
                <td className="px-4 py-3 text-slatey-500" colSpan={4}>
                  No nodes found.
                </td>
              </tr>
            ) : (
              filteredItems.map((node) => (
                <tr key={node.name} className="bg-slatey-900/60">
                  <td className="px-4 py-3 text-slate-100">{node.name}</td>
                  <td className="px-4 py-3">
                    <span
                      className={
                        node.ready
                          ? "rounded-full bg-emerald-500/20 px-2 py-1 text-xs text-emerald-300"
                          : "rounded-full bg-rose-500/20 px-2 py-1 text-xs text-rose-300"
                      }
                    >
                      {node.ready ? "Ready" : "Not Ready"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slatey-300">{node.roles.join(", ")}</td>
                  <td className="px-4 py-3 text-slatey-300">{node.kubeletVersion}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      <PaginationControls
        label="Nodes."
        limit={limit}
        setLimit={setLimit}
        hasMore={state.continueToken !== ""}
        loading={state.loading}
        onLoadMore={() => load(false, state.continueToken)}
      />
    </div>
  );
}
