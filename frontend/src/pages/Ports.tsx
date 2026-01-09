import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { ContainerPortMapping, fetchPorts, IngressPortMapping, ServicePortMapping } from "../api/client";
import { useNamespace } from "../state/namespace";
import { useSearch } from "../state/search";

function downloadFile(content: string, filename: string, type: string) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function toCsv(headers: string[], rows: string[][]) {
  const escape = (value: string) => `"${value.replace(/"/g, '""')}"`;
  const csvRows = [headers.map(escape).join(",")];
  rows.forEach((row) => csvRows.push(row.map(escape).join(",")));
  return csvRows.join("\n");
}

export default function Ports() {
  const { namespace } = useNamespace();
  const { labelSelector, query } = useSearch();
  const { data, isLoading, error } = useQuery({
    queryKey: ["ports", namespace, labelSelector],
    queryFn: () => fetchPorts({ namespace, labelSelector }),
  });

  const filtered = useMemo(() => {
    if (!data) return null;
    const needle = query.trim().toLowerCase();
    const filterService = (item: ServicePortMapping) =>
      !needle || `${item.namespace}/${item.service}`.toLowerCase().includes(needle);
    const filterContainer = (item: ContainerPortMapping) =>
      !needle || `${item.namespace}/${item.pod}/${item.container}`.toLowerCase().includes(needle);
    const filterIngress = (item: IngressPortMapping) =>
      !needle || `${item.namespace}/${item.ingress}`.toLowerCase().includes(needle);
    return {
      services: data.services.filter(filterService),
      containers: data.containers.filter(filterContainer),
      ingresses: data.ingresses.filter(filterIngress),
    };
  }, [data, query]);

  if (isLoading) {
    return <div className="text-sm text-slatey-400">Loading ports...</div>;
  }

  if (error || !data || !filtered) {
    return (
      <div className="text-sm text-accent-error">
        Failed to load ports. Ensure the backend can reach the cluster.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Ports & exposure</h1>
          <p className="mt-2 text-sm text-slatey-400">
            Service mappings, container ports, and ingress backends.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="rounded-full bg-slatey-800 px-3 py-1 text-xs text-slatey-300">
            Namespace: {namespace}
          </div>
          <button
            className="rounded-lg border border-slatey-800 px-3 py-2 text-xs uppercase tracking-widest text-slatey-300 hover:text-slate-100"
            onClick={() => downloadFile(JSON.stringify(data, null, 2), "ports.json", "application/json")}
          >
            Export JSON
          </button>
        </div>
      </div>

      <section className="space-y-2">
        <div className="flex items-center justify-between">
          <div className="text-xs uppercase tracking-widest text-slatey-500">Services</div>
          <button
            className="rounded-lg border border-slatey-800 px-3 py-1 text-xs uppercase tracking-widest text-slatey-300 hover:text-slate-100"
            onClick={() => {
              const csv = toCsv(
                ["namespace", "service", "type", "port", "targetPort", "protocol", "nodePort", "externalIps", "podEndpoints"],
                data.services.map((row) => [
                  row.namespace,
                  row.service,
                  row.type,
                  String(row.port),
                  row.targetPort,
                  row.protocol,
                  String(row.nodePort),
                  row.externalIps.join(";"),
                  row.podEndpoints.join(";"),
                ])
              );
              downloadFile(csv, "services-ports.csv", "text/csv");
            }}
          >
            Export CSV
          </button>
        </div>
        <div className="overflow-hidden rounded-xl border border-slatey-800/80">
          <table className="w-full text-left text-sm">
            <thead className="bg-slatey-900/80 text-xs uppercase tracking-widest text-slatey-500">
              <tr>
                <th className="px-4 py-3">Service</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">Port</th>
                <th className="px-4 py-3">Target</th>
                <th className="px-4 py-3">Endpoints</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slatey-800/80">
              {filtered.services.length === 0 ? (
                <tr className="bg-slatey-900/60">
                  <td className="px-4 py-3 text-slatey-500" colSpan={5}>
                    No service ports found.
                  </td>
                </tr>
              ) : (
                filtered.services.map((row) => (
                  <tr key={`${row.namespace}/${row.service}/${row.port}`} className="bg-slatey-900/60">
                    <td className="px-4 py-3 text-slate-100">
                      {row.namespace}/{row.service}
                    </td>
                    <td className="px-4 py-3 text-slatey-300">{row.type}</td>
                    <td className="px-4 py-3 text-slatey-300">
                      {row.port}/{row.protocol}
                    </td>
                    <td className="px-4 py-3 text-slatey-300">{row.targetPort || "-"}</td>
                    <td className="px-4 py-3 text-slatey-300">
                      {row.podEndpoints.length > 0 ? row.podEndpoints.slice(0, 3).join(", ") : "-"}
                      {row.podEndpoints.length > 3 ? "…" : ""}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="space-y-2">
        <div className="flex items-center justify-between">
          <div className="text-xs uppercase tracking-widest text-slatey-500">Container ports</div>
          <button
            className="rounded-lg border border-slatey-800 px-3 py-1 text-xs uppercase tracking-widest text-slatey-300 hover:text-slate-100"
            onClick={() => {
              const csv = toCsv(
                ["namespace", "pod", "container", "port", "protocol", "hostPort"],
                data.containers.map((row) => [
                  row.namespace,
                  row.pod,
                  row.container,
                  String(row.port),
                  row.protocol,
                  String(row.hostPort),
                ])
              );
              downloadFile(csv, "container-ports.csv", "text/csv");
            }}
          >
            Export CSV
          </button>
        </div>
        <div className="overflow-hidden rounded-xl border border-slatey-800/80">
          <table className="w-full text-left text-sm">
            <thead className="bg-slatey-900/80 text-xs uppercase tracking-widest text-slatey-500">
              <tr>
                <th className="px-4 py-3">Pod</th>
                <th className="px-4 py-3">Container</th>
                <th className="px-4 py-3">Port</th>
                <th className="px-4 py-3">Host</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slatey-800/80">
              {filtered.containers.length === 0 ? (
                <tr className="bg-slatey-900/60">
                  <td className="px-4 py-3 text-slatey-500" colSpan={4}>
                    No container ports found.
                  </td>
                </tr>
              ) : (
                filtered.containers.map((row, index) => (
                  <tr key={`${row.namespace}/${row.pod}/${row.container}/${index}`} className="bg-slatey-900/60">
                    <td className="px-4 py-3 text-slate-100">
                      {row.namespace}/{row.pod}
                    </td>
                    <td className="px-4 py-3 text-slatey-300">{row.container}</td>
                    <td className="px-4 py-3 text-slatey-300">
                      {row.port}/{row.protocol}
                    </td>
                    <td className="px-4 py-3 text-slatey-300">{row.hostPort || "-"}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="space-y-2">
        <div className="flex items-center justify-between">
          <div className="text-xs uppercase tracking-widest text-slatey-500">Ingress backends</div>
          <button
            className="rounded-lg border border-slatey-800 px-3 py-1 text-xs uppercase tracking-widest text-slatey-300 hover:text-slate-100"
            onClick={() => {
              const csv = toCsv(
                ["namespace", "ingress", "host", "path", "service", "port"],
                data.ingresses.map((row) => [
                  row.namespace,
                  row.ingress,
                  row.host,
                  row.path,
                  row.service,
                  row.port,
                ])
              );
              downloadFile(csv, "ingress-backends.csv", "text/csv");
            }}
          >
            Export CSV
          </button>
        </div>
        <div className="overflow-hidden rounded-xl border border-slatey-800/80">
          <table className="w-full text-left text-sm">
            <thead className="bg-slatey-900/80 text-xs uppercase tracking-widest text-slatey-500">
              <tr>
                <th className="px-4 py-3">Ingress</th>
                <th className="px-4 py-3">Host</th>
                <th className="px-4 py-3">Path</th>
                <th className="px-4 py-3">Service</th>
                <th className="px-4 py-3">Port</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slatey-800/80">
              {filtered.ingresses.length === 0 ? (
                <tr className="bg-slatey-900/60">
                  <td className="px-4 py-3 text-slatey-500" colSpan={5}>
                    No ingress backends found.
                  </td>
                </tr>
              ) : (
                filtered.ingresses.map((row, index) => (
                  <tr key={`${row.namespace}/${row.ingress}/${index}`} className="bg-slatey-900/60">
                    <td className="px-4 py-3 text-slate-100">
                      {row.namespace}/{row.ingress}
                    </td>
                    <td className="px-4 py-3 text-slatey-300">{row.host || "*"}</td>
                    <td className="px-4 py-3 text-slatey-300">{row.path || "*"}</td>
                    <td className="px-4 py-3 text-slatey-300">{row.service}</td>
                    <td className="px-4 py-3 text-slatey-300">{row.port}</td>
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
