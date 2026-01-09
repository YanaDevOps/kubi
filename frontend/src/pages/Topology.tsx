import { useMemo, useState } from "react";
import ReactFlow, { Background, Controls } from "reactflow";
import "reactflow/dist/style.css";
import { useQuery } from "@tanstack/react-query";
import { fetchTopology, TopologyEdge, TopologyNode } from "../api/client";
import { useNamespace } from "../state/namespace";
import { useSearch } from "../state/search";

type ViewMode = "graph" | "table";

const KIND_ORDER = ["Ingress", "Service", "EndpointSlice", "Pod", "Node"];

export default function Topology() {
  const { namespace } = useNamespace();
  const { query, labelSelector } = useSearch();
  const [view, setView] = useState<ViewMode>("graph");
  const { data, isLoading, error } = useQuery({
    queryKey: ["topology", namespace, labelSelector],
    queryFn: () => fetchTopology({ namespace, labelSelector }),
  });

  const kinds = useMemo(() => {
    if (!data) return [];
    const set = new Set(data.nodes.map((node) => node.kind));
    return Array.from(set).sort((a, b) => KIND_ORDER.indexOf(a) - KIND_ORDER.indexOf(b));
  }, [data]);

  const [selectedKinds, setSelectedKinds] = useState<string[]>([]);
  const orderedKinds = useMemo(() => {
    const active = selectedKinds.length > 0 ? selectedKinds : kinds;
    return KIND_ORDER.filter((kind) => active.includes(kind)).concat(
      active.filter((kind) => !KIND_ORDER.includes(kind))
    );
  }, [kinds, selectedKinds]);

  const filtered = useMemo(() => {
    if (!data) return { nodes: [], edges: [] } as { nodes: TopologyNode[]; edges: TopologyEdge[] };
    const needle = query.trim().toLowerCase();
    const kindFilter = selectedKinds.length > 0 ? new Set(selectedKinds) : null;
    const nodes = data.nodes.filter((node) => {
      if (kindFilter && !kindFilter.has(node.kind)) return false;
      if (!needle) return true;
      const labelText = node.labels
        ? Object.entries(node.labels)
            .map(([key, value]) => `${key}=${value}`)
            .join(" ")
        : "";
      return `${node.kind} ${node.namespace ?? ""} ${node.name} ${labelText}`
        .toLowerCase()
        .includes(needle);
    });
    const nodeIds = new Set(nodes.map((node) => node.id));
    const edges = data.edges.filter((edge) => nodeIds.has(edge.from) && nodeIds.has(edge.to));
    return { nodes, edges };
  }, [data, query, selectedKinds]);

  const graphNodes = useMemo(() => {
    const grouped = new Map<string, TopologyNode[]>();
    filtered.nodes.forEach((node) => {
      if (!grouped.has(node.kind)) grouped.set(node.kind, []);
      grouped.get(node.kind)!.push(node);
    });

    return orderedKinds.flatMap((kind, columnIndex) => {
      const nodes = grouped.get(kind) ?? [];
      return nodes.map((node, rowIndex) => ({
        id: node.id,
        position: { x: columnIndex * 260, y: rowIndex * 90 },
        data: {
          label: `${node.name}${node.namespace ? `\n${node.namespace}` : ""}`,
        },
        style: {
          border: "1px solid #1F2937",
          background: "rgba(15, 23, 42, 0.9)",
          color: "#E5E7EB",
          padding: 10,
          borderRadius: 12,
          width: 200,
          whiteSpace: "pre-line",
        },
        type: "default",
      }));
    });
  }, [filtered.nodes, orderedKinds]);

  const graphEdges = useMemo(
    () =>
      filtered.edges.map((edge) => ({
        id: edge.id,
        source: edge.from,
        target: edge.to,
        animated: edge.kind === "IngressToService",
        style: { stroke: "#38BDF8" },
      })),
    [filtered.edges]
  );

  if (isLoading) {
    return <div className="text-sm text-slatey-400">Loading topology...</div>;
  }

  if (error || !data) {
    return (
      <div className="text-sm text-accent-error">
        Failed to load topology. Ensure the backend can reach the cluster.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Topology explorer</h1>
          <p className="mt-2 text-sm text-slatey-400">
            Graph and table views of nodes, services, endpoints, and ingress routing.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="rounded-full bg-slatey-800 px-3 py-1 text-xs text-slatey-300">
            Namespace: {namespace}
          </div>
          <button
            className={`rounded-lg border border-slatey-800 px-3 py-2 text-xs uppercase tracking-widest ${
              view === "graph" ? "text-slate-100" : "text-slatey-400"
            }`}
            onClick={() => setView("graph")}
          >
            Graph
          </button>
          <button
            className={`rounded-lg border border-slatey-800 px-3 py-2 text-xs uppercase tracking-widest ${
              view === "table" ? "text-slate-100" : "text-slatey-400"
            }`}
            onClick={() => setView("table")}
          >
            Table
          </button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 text-xs text-slatey-400">
        {kinds.map((kind) => {
          const active = selectedKinds.includes(kind);
          return (
            <button
              key={kind}
              className={`rounded-full border px-3 py-1 uppercase tracking-widest ${
                active
                  ? "border-accent-info text-accent-info"
                  : "border-slatey-800 text-slatey-400"
              }`}
              onClick={() => {
                setSelectedKinds((prev) =>
                  prev.includes(kind) ? prev.filter((item) => item !== kind) : [...prev, kind]
                );
              }}
            >
              {kind}
            </button>
          );
        })}
      </div>

      {view === "graph" ? (
        <div className="h-[600px] rounded-xl border border-slatey-800/80 bg-slatey-900/70">
          <ReactFlow nodes={graphNodes} edges={graphEdges} fitView>
            <Background color="#1F2937" gap={18} />
            <Controls />
          </ReactFlow>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="overflow-hidden rounded-xl border border-slatey-800/80">
            <table className="w-full text-left text-sm">
              <thead className="bg-slatey-900/80 text-xs uppercase tracking-widest text-slatey-500">
                <tr>
                  <th className="px-4 py-3">Kind</th>
                  <th className="px-4 py-3">Name</th>
                  <th className="px-4 py-3">Namespace</th>
                  <th className="px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slatey-800/80">
                {filtered.nodes.length === 0 ? (
                  <tr className="bg-slatey-900/60">
                    <td className="px-4 py-3 text-slatey-500" colSpan={4}>
                      No nodes match the current filters.
                    </td>
                  </tr>
                ) : (
                  filtered.nodes.map((node) => (
                    <tr key={node.id} className="bg-slatey-900/60">
                      <td className="px-4 py-3 text-slatey-300">{node.kind}</td>
                      <td className="px-4 py-3 text-slate-100">{node.name}</td>
                      <td className="px-4 py-3 text-slatey-300">{node.namespace || "-"}</td>
                      <td className="px-4 py-3 text-slatey-300">{node.status || "-"}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          <div className="overflow-hidden rounded-xl border border-slatey-800/80">
            <table className="w-full text-left text-sm">
              <thead className="bg-slatey-900/80 text-xs uppercase tracking-widest text-slatey-500">
                <tr>
                  <th className="px-4 py-3">Edge</th>
                  <th className="px-4 py-3">From</th>
                  <th className="px-4 py-3">To</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slatey-800/80">
                {filtered.edges.length === 0 ? (
                  <tr className="bg-slatey-900/60">
                    <td className="px-4 py-3 text-slatey-500" colSpan={3}>
                      No edges match the current filters.
                    </td>
                  </tr>
                ) : (
                  filtered.edges.map((edge) => (
                    <tr key={edge.id} className="bg-slatey-900/60">
                      <td className="px-4 py-3 text-slatey-300">{edge.kind}</td>
                      <td className="px-4 py-3 text-slatey-300">{edge.from}</td>
                      <td className="px-4 py-3 text-slatey-300">{edge.to}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
