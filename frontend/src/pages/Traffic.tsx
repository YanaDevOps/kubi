import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchTraffic } from "../api/client";
import { useNamespace } from "../state/namespace";
import { useSearch } from "../state/search";

export default function Traffic() {
  const { namespace } = useNamespace();
  const { query, labelSelector } = useSearch();
  const { data, isLoading, error } = useQuery({
    queryKey: ["traffic", namespace, labelSelector],
    queryFn: () => fetchTraffic({ namespace, labelSelector }),
  });

  const filtered = useMemo(() => {
    if (!data) return null;
    const needle = query.trim().toLowerCase();
    const filter = (value: string) => !needle || value.toLowerCase().includes(needle);
    return {
      serviceIntents: data.serviceIntents.filter((item) => filter(`${item.namespace}/${item.service}`)),
      ingressIntents: data.ingressIntents.filter((item) => filter(`${item.namespace}/${item.ingress}`)),
      networkPolicies: data.networkPolicies.filter((item) => filter(`${item.namespace}/${item.name}`)),
    };
  }, [data, query]);

  if (isLoading) {
    return <div className="text-sm text-slatey-400">Loading traffic intents...</div>;
  }

  if (error || !data || !filtered) {
    return (
      <div className="text-sm text-accent-error">
        Failed to load traffic data. Ensure the backend can reach the cluster.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Traffic (inferred)</h1>
          <p className="mt-2 text-sm text-slatey-400">
            Read-only connectivity intent inferred from Service selectors, Ingress backends, and NetworkPolicies.
          </p>
        </div>
        <div className="rounded-full bg-slatey-800 px-3 py-1 text-xs text-slatey-300">
          Namespace: {namespace}
        </div>
      </div>

      <section className="space-y-2">
        <div className="text-xs uppercase tracking-widest text-slatey-500">Service selectors</div>
        <div className="overflow-hidden rounded-xl border border-slatey-800/80">
          <table className="w-full text-left text-sm">
            <thead className="bg-slatey-900/80 text-xs uppercase tracking-widest text-slatey-500">
              <tr>
                <th className="px-4 py-3">Service</th>
                <th className="px-4 py-3">Selector</th>
                <th className="px-4 py-3">Pods</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slatey-800/80">
              {filtered.serviceIntents.length === 0 ? (
                <tr className="bg-slatey-900/60">
                  <td className="px-4 py-3 text-slatey-500" colSpan={3}>
                    No service intents found.
                  </td>
                </tr>
              ) : (
                filtered.serviceIntents.map((item) => (
                  <tr key={`${item.namespace}/${item.service}`} className="bg-slatey-900/60">
                    <td className="px-4 py-3 text-slate-100">
                      {item.namespace}/{item.service}
                    </td>
                    <td className="px-4 py-3 text-slatey-300">{item.selector}</td>
                    <td className="px-4 py-3 text-slatey-300">
                      {item.pods.length > 0 ? item.pods.slice(0, 6).join(", ") : "-"}
                      {item.pods.length > 6 ? "…" : ""}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="space-y-2">
        <div className="text-xs uppercase tracking-widest text-slatey-500">Ingress backends</div>
        <div className="overflow-hidden rounded-xl border border-slatey-800/80">
          <table className="w-full text-left text-sm">
            <thead className="bg-slatey-900/80 text-xs uppercase tracking-widest text-slatey-500">
              <tr>
                <th className="px-4 py-3">Ingress</th>
                <th className="px-4 py-3">Host</th>
                <th className="px-4 py-3">Path</th>
                <th className="px-4 py-3">Service</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slatey-800/80">
              {filtered.ingressIntents.length === 0 ? (
                <tr className="bg-slatey-900/60">
                  <td className="px-4 py-3 text-slatey-500" colSpan={4}>
                    No ingress intents found.
                  </td>
                </tr>
              ) : (
                filtered.ingressIntents.map((item, index) => (
                  <tr key={`${item.namespace}/${item.ingress}/${index}`} className="bg-slatey-900/60">
                    <td className="px-4 py-3 text-slate-100">
                      {item.namespace}/{item.ingress}
                    </td>
                    <td className="px-4 py-3 text-slatey-300">{item.host || "*"}</td>
                    <td className="px-4 py-3 text-slatey-300">{item.path || "*"}</td>
                    <td className="px-4 py-3 text-slatey-300">
                      {item.service} ({item.port})
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="space-y-2">
        <div className="text-xs uppercase tracking-widest text-slatey-500">NetworkPolicies</div>
        <div className="overflow-hidden rounded-xl border border-slatey-800/80">
          <table className="w-full text-left text-sm">
            <thead className="bg-slatey-900/80 text-xs uppercase tracking-widest text-slatey-500">
              <tr>
                <th className="px-4 py-3">Policy</th>
                <th className="px-4 py-3">Types</th>
                <th className="px-4 py-3">Selector</th>
                <th className="px-4 py-3">Ingress/Egress</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slatey-800/80">
              {filtered.networkPolicies.length === 0 ? (
                <tr className="bg-slatey-900/60">
                  <td className="px-4 py-3 text-slatey-500" colSpan={4}>
                    No network policies found.
                  </td>
                </tr>
              ) : (
                filtered.networkPolicies.map((policy) => (
                  <tr key={`${policy.namespace}/${policy.name}`} className="bg-slatey-900/60">
                    <td className="px-4 py-3 text-slate-100">
                      {policy.namespace}/{policy.name}
                    </td>
                    <td className="px-4 py-3 text-slatey-300">{policy.types.join(", ")}</td>
                    <td className="px-4 py-3 text-slatey-300">{policy.podSelector || "*"}</td>
                    <td className="px-4 py-3 text-slatey-300">
                      {policy.ingressRules}/{policy.egressRules}
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
