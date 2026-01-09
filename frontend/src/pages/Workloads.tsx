import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchPods, fetchWorkloads, PodItem, WorkloadItem } from "../api/client";
import PodDrawer from "../components/PodDrawer";
import { useNamespace } from "../state/namespace";
import { useSearch } from "../state/search";

type SectionProps = {
  title: string;
  items: WorkloadItem[];
};

function WorkloadSection({ title, items }: SectionProps) {
  return (
    <section className="space-y-2">
      <div className="text-xs uppercase tracking-widest text-slatey-500">{title}</div>
      <div className="overflow-hidden rounded-xl border border-slatey-800/80">
        <table className="w-full text-left text-sm">
          <thead className="bg-slatey-900/80 text-xs uppercase tracking-widest text-slatey-500">
            <tr>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Namespace</th>
              <th className="px-4 py-3">Ready</th>
              <th className="px-4 py-3">Available</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slatey-800/80">
            {items.length === 0 ? (
              <tr className="bg-slatey-900/60">
                <td className="px-4 py-3 text-slatey-500" colSpan={4}>
                  No resources found.
                </td>
              </tr>
            ) : (
              items.map((item) => (
                <tr key={`${item.namespace}/${item.name}`} className="bg-slatey-900/60">
                  <td className="px-4 py-3 text-slate-100">{item.name}</td>
                  <td className="px-4 py-3 text-slatey-300">{item.namespace}</td>
                  <td className="px-4 py-3 text-slatey-300">
                    {item.readyReplicas}/{item.desiredReplicas}
                  </td>
                  <td className="px-4 py-3 text-slatey-300">{item.availableReplicas}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

type PodSectionProps = {
  items: PodItem[];
  onSelect: (pod: PodItem) => void;
};

function PodSection({ items, onSelect }: PodSectionProps) {
  return (
    <section className="space-y-2">
      <div className="text-xs uppercase tracking-widest text-slatey-500">Pods</div>
      <div className="overflow-hidden rounded-xl border border-slatey-800/80">
        <table className="w-full text-left text-sm">
          <thead className="bg-slatey-900/80 text-xs uppercase tracking-widest text-slatey-500">
            <tr>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Namespace</th>
              <th className="px-4 py-3">Phase</th>
              <th className="px-4 py-3">Ready</th>
              <th className="px-4 py-3">Restarts</th>
              <th className="px-4 py-3">Details</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slatey-800/80">
            {items.length === 0 ? (
              <tr className="bg-slatey-900/60">
                <td className="px-4 py-3 text-slatey-500" colSpan={6}>
                  No pods found.
                </td>
              </tr>
            ) : (
              items.slice(0, 10).map((pod) => (
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
                  <td className="px-4 py-3">
                    <button
                      className="rounded-lg border border-slatey-800 px-3 py-1 text-xs uppercase tracking-widest text-slatey-300 hover:text-slate-100"
                      onClick={() => onSelect(pod)}
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
    </section>
  );
}

export default function Workloads() {
  const { namespace } = useNamespace();
  const { labelSelector, query } = useSearch();
  const [selectedPod, setSelectedPod] = useState<PodItem | null>(null);
  const { data, isLoading, error } = useQuery({
    queryKey: ["workloads", namespace, labelSelector],
    queryFn: () => fetchWorkloads({ namespace, labelSelector }),
  });
  const podsQuery = useQuery({
    queryKey: ["pods", namespace, labelSelector],
    queryFn: () => fetchPods({ namespace, limit: 50, labelSelector }),
  });

  if (isLoading || podsQuery.isLoading) {
    return <div className="text-sm text-slatey-400">Loading workloads...</div>;
  }

  if (error || podsQuery.error || !data || !podsQuery.data) {
    return (
      <div className="text-sm text-accent-error">
        Failed to load workloads. Ensure the backend can reach the cluster.
      </div>
    );
  }

  const needle = query.trim().toLowerCase();
  const filterWorkloads = (items: WorkloadItem[]) => {
    if (!needle) return items;
    return items.filter((item) =>
      `${item.namespace}/${item.name}`.toLowerCase().includes(needle)
    );
  };
  const filterPods = (items: PodItem[]) => {
    if (!needle) return items;
    return items.filter((item) =>
      `${item.namespace}/${item.name}`.toLowerCase().includes(needle)
    );
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Workloads</h1>
        <p className="mt-2 text-sm text-slatey-400">
          Deployments, StatefulSets, and DaemonSets with replica health.
        </p>
      </div>
      <WorkloadSection title="Deployments" items={filterWorkloads(data.deployments)} />
      <WorkloadSection title="StatefulSets" items={filterWorkloads(data.statefulSets)} />
      <WorkloadSection title="DaemonSets" items={filterWorkloads(data.daemonSets)} />
      <PodSection items={filterPods(podsQuery.data.items)} onSelect={setSelectedPod} />
      <PodDrawer pod={selectedPod} onClose={() => setSelectedPod(null)} />
    </div>
  );
}
