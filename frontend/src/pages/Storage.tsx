import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchStorage } from "../api/client";
import { useNamespace } from "../state/namespace";
import { useSearch } from "../state/search";

export default function Storage() {
  const { namespace } = useNamespace();
  const { query, labelSelector } = useSearch();
  const { data, isLoading, error } = useQuery({
    queryKey: ["storage", namespace, labelSelector],
    queryFn: () => fetchStorage({ namespace, labelSelector }),
  });

  const filtered = useMemo(() => {
    if (!data) return null;
    const needle = query.trim().toLowerCase();
    const filterName = (value: string) => !needle || value.toLowerCase().includes(needle);
    return {
      storageClasses: data.storageClasses.filter((sc) => filterName(sc.name)),
      volumes: data.volumes.filter((pv) => filterName(pv.name)),
      claims: data.claims.filter((pvc) => filterName(`${pvc.namespace}/${pvc.name}`)),
      csiDrivers: data.csiDrivers.filter((driver) => filterName(driver.name)),
    };
  }, [data, query]);

  if (isLoading) {
    return <div className="text-sm text-slatey-400">Loading storage...</div>;
  }

  if (error || !data || !filtered) {
    return (
      <div className="text-sm text-accent-error">
        Failed to load storage data. Ensure the backend can reach the cluster.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Storage</h1>
          <p className="mt-2 text-sm text-slatey-400">
            StorageClasses, PVs, PVCs, and CSI drivers overview.
          </p>
        </div>
        <div className="rounded-full bg-slatey-800 px-3 py-1 text-xs text-slatey-300">
          Namespace: {namespace}
        </div>
      </div>

      <section className="space-y-2">
        <div className="text-xs uppercase tracking-widest text-slatey-500">StorageClasses</div>
        <div className="overflow-hidden rounded-xl border border-slatey-800/80">
          <table className="w-full text-left text-sm">
            <thead className="bg-slatey-900/80 text-xs uppercase tracking-widest text-slatey-500">
              <tr>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Provisioner</th>
                <th className="px-4 py-3">Reclaim</th>
                <th className="px-4 py-3">Expand</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slatey-800/80">
              {filtered.storageClasses.length === 0 ? (
                <tr className="bg-slatey-900/60">
                  <td className="px-4 py-3 text-slatey-500" colSpan={4}>
                    No storage classes found.
                  </td>
                </tr>
              ) : (
                filtered.storageClasses.map((sc) => (
                  <tr key={sc.name} className="bg-slatey-900/60">
                    <td className="px-4 py-3 text-slate-100">{sc.name}</td>
                    <td className="px-4 py-3 text-slatey-300">{sc.provisioner}</td>
                    <td className="px-4 py-3 text-slatey-300">{sc.reclaimPolicy || "-"}</td>
                    <td className="px-4 py-3 text-slatey-300">
                      {sc.allowVolumeExpand ? "Yes" : "No"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="space-y-2">
        <div className="text-xs uppercase tracking-widest text-slatey-500">PersistentVolumes</div>
        <div className="overflow-hidden rounded-xl border border-slatey-800/80">
          <table className="w-full text-left text-sm">
            <thead className="bg-slatey-900/80 text-xs uppercase tracking-widest text-slatey-500">
              <tr>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Capacity</th>
                <th className="px-4 py-3">Class</th>
                <th className="px-4 py-3">Claim</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slatey-800/80">
              {filtered.volumes.length === 0 ? (
                <tr className="bg-slatey-900/60">
                  <td className="px-4 py-3 text-slatey-500" colSpan={5}>
                    No persistent volumes found.
                  </td>
                </tr>
              ) : (
                filtered.volumes.map((pv) => (
                  <tr key={pv.name} className="bg-slatey-900/60">
                    <td className="px-4 py-3 text-slate-100">{pv.name}</td>
                    <td className="px-4 py-3 text-slatey-300">{pv.status}</td>
                    <td className="px-4 py-3 text-slatey-300">{pv.capacity || "-"}</td>
                    <td className="px-4 py-3 text-slatey-300">{pv.storageClass || "-"}</td>
                    <td className="px-4 py-3 text-slatey-300">{pv.claim || "-"}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="space-y-2">
        <div className="text-xs uppercase tracking-widest text-slatey-500">PersistentVolumeClaims</div>
        <div className="overflow-hidden rounded-xl border border-slatey-800/80">
          <table className="w-full text-left text-sm">
            <thead className="bg-slatey-900/80 text-xs uppercase tracking-widest text-slatey-500">
              <tr>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Capacity</th>
                <th className="px-4 py-3">Class</th>
                <th className="px-4 py-3">Volume</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slatey-800/80">
              {filtered.claims.length === 0 ? (
                <tr className="bg-slatey-900/60">
                  <td className="px-4 py-3 text-slatey-500" colSpan={5}>
                    No persistent volume claims found.
                  </td>
                </tr>
              ) : (
                filtered.claims.map((pvc) => (
                  <tr key={`${pvc.namespace}/${pvc.name}`} className="bg-slatey-900/60">
                    <td className="px-4 py-3 text-slate-100">
                      {pvc.namespace}/{pvc.name}
                    </td>
                    <td className="px-4 py-3 text-slatey-300">{pvc.status}</td>
                    <td className="px-4 py-3 text-slatey-300">{pvc.capacity || "-"}</td>
                    <td className="px-4 py-3 text-slatey-300">{pvc.storageClass || "-"}</td>
                    <td className="px-4 py-3 text-slatey-300">{pvc.volume || "-"}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="space-y-2">
        <div className="text-xs uppercase tracking-widest text-slatey-500">CSI Drivers</div>
        <div className="overflow-hidden rounded-xl border border-slatey-800/80">
          <table className="w-full text-left text-sm">
            <thead className="bg-slatey-900/80 text-xs uppercase tracking-widest text-slatey-500">
              <tr>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Created</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slatey-800/80">
              {filtered.csiDrivers.length === 0 ? (
                <tr className="bg-slatey-900/60">
                  <td className="px-4 py-3 text-slatey-500" colSpan={2}>
                    No CSI drivers found.
                  </td>
                </tr>
              ) : (
                filtered.csiDrivers.map((driver) => (
                  <tr key={driver.name} className="bg-slatey-900/60">
                    <td className="px-4 py-3 text-slate-100">{driver.name}</td>
                    <td className="px-4 py-3 text-slatey-300">
                      {new Date(driver.createdAt).toLocaleString()}
                    </td>
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
