import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { CRDItem, fetchCRDObjects, fetchInventory } from "../api/client";
import { useNamespace } from "../state/namespace";
import { useSearch } from "../state/search";

export default function CRDs() {
  const { namespace } = useNamespace();
  const { query, labelSelector } = useSearch();
  const [selectedCRD, setSelectedCRD] = useState<CRDItem | null>(null);

  const inventoryQuery = useQuery({
    queryKey: ["inventory", labelSelector],
    queryFn: () => fetchInventory({ labelSelector }),
  });

  const objectsQuery = useQuery({
    queryKey: ["crd-objects", selectedCRD?.name, namespace],
    queryFn: () => fetchCRDObjects(selectedCRD as CRDItem, namespace),
    enabled: selectedCRD !== null,
  });

  const filteredCRDs = useMemo(() => {
    if (!inventoryQuery.data) return [] as CRDItem[];
    const needle = query.trim().toLowerCase();
    if (!needle) return inventoryQuery.data.crds;
    return inventoryQuery.data.crds.filter((crd) =>
      `${crd.name} ${crd.group} ${crd.kind}`.toLowerCase().includes(needle)
    );
  }, [inventoryQuery.data, query]);

  if (inventoryQuery.isLoading) {
    return <div className="text-sm text-slatey-400">Loading CRDs and components...</div>;
  }

  if (inventoryQuery.error || !inventoryQuery.data) {
    return (
      <div className="text-sm text-accent-error">
        Failed to load CRDs or components. Ensure the backend can reach the cluster.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">CRDs & Components</h1>
          <p className="mt-2 text-sm text-slatey-400">
            Installed CRDs and detected cluster components with evidence.
          </p>
        </div>
        <div className="rounded-full bg-slatey-800 px-3 py-1 text-xs text-slatey-300">
          Namespace: {namespace}
        </div>
      </div>

      <section className="space-y-2">
        <div className="text-xs uppercase tracking-widest text-slatey-500">Components</div>
        <div className="overflow-hidden rounded-xl border border-slatey-800/80">
          <table className="w-full text-left text-sm">
            <thead className="bg-slatey-900/80 text-xs uppercase tracking-widest text-slatey-500">
              <tr>
                <th className="px-4 py-3">Component</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Evidence</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slatey-800/80">
              {inventoryQuery.data.components.length === 0 ? (
                <tr className="bg-slatey-900/60">
                  <td className="px-4 py-3 text-slatey-500" colSpan={3}>
                    No component detections.
                  </td>
                </tr>
              ) : (
                inventoryQuery.data.components.map((component) => (
                  <tr key={component.name} className="bg-slatey-900/60">
                    <td className="px-4 py-3 text-slate-100">{component.name}</td>
                    <td className="px-4 py-3 text-slatey-300">{component.status}</td>
                    <td className="px-4 py-3 text-slatey-300">
                      {component.evidence.length > 0
                        ? component.evidence.join(", ")
                        : "-"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="text-xs uppercase tracking-widest text-slatey-500">CRDs</div>
          <select
            className="rounded-lg border border-slatey-800 bg-slatey-900 px-3 py-2 text-sm text-slate-100"
            value={selectedCRD?.name ?? ""}
            onChange={(event) => {
              const target = inventoryQuery.data?.crds.find((crd) => crd.name === event.target.value) || null;
              setSelectedCRD(target);
            }}
          >
            <option value="">Select CRD</option>
            {filteredCRDs.map((crd) => (
              <option key={crd.name} value={crd.name}>
                {crd.name}
              </option>
            ))}
          </select>
        </div>
        <div className="overflow-hidden rounded-xl border border-slatey-800/80">
          <table className="w-full text-left text-sm">
            <thead className="bg-slatey-900/80 text-xs uppercase tracking-widest text-slatey-500">
              <tr>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Group</th>
                <th className="px-4 py-3">Kind</th>
                <th className="px-4 py-3">Scope</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slatey-800/80">
              {filteredCRDs.length === 0 ? (
                <tr className="bg-slatey-900/60">
                  <td className="px-4 py-3 text-slatey-500" colSpan={4}>
                    No CRDs found.
                  </td>
                </tr>
              ) : (
                filteredCRDs.map((crd) => (
                  <tr key={crd.name} className="bg-slatey-900/60">
                    <td className="px-4 py-3 text-slate-100">{crd.name}</td>
                    <td className="px-4 py-3 text-slatey-300">{crd.group}</td>
                    <td className="px-4 py-3 text-slatey-300">{crd.kind}</td>
                    <td className="px-4 py-3 text-slatey-300">{crd.scope}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="space-y-2">
        <div className="text-xs uppercase tracking-widest text-slatey-500">CRD objects</div>
        <div className="rounded-xl border border-slatey-800/80 bg-slatey-900/70 p-4 text-sm text-slatey-300">
          {selectedCRD ? (
            objectsQuery.isLoading ? (
              "Loading CRD objects..."
            ) : objectsQuery.data ? (
              <div className="space-y-2">
                {objectsQuery.data.objects.length === 0 ? (
                  <div>No objects found.</div>
                ) : (
                  objectsQuery.data.objects.slice(0, 20).map((obj) => (
                    <div key={`${obj.namespace}/${obj.name}`}>
                      {obj.namespace ? `${obj.namespace}/` : ""}{obj.name}
                    </div>
                  ))
                )}
                {objectsQuery.data.objects.length > 20 ? (
                  <div className="text-xs text-slatey-500">Showing first 20 objects.</div>
                ) : null}
              </div>
            ) : (
              "No data"
            )
          ) : (
            "Select a CRD to view objects."
          )}
        </div>
      </section>
    </div>
  );
}
