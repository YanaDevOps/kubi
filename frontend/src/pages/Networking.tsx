import { useCallback, useEffect, useMemo, useState } from "react";
import { EndpointSliceItem, ServiceItem, fetchEndpointSlices, fetchServices } from "../api/client";
import PaginationControls from "../components/PaginationControls";
import { useNamespace } from "../state/namespace";
import { useSearch } from "../state/search";

export default function Networking() {
  const { namespace } = useNamespace();
  const { query, labelSelector } = useSearch();
  const [serviceLimit, setServiceLimit] = useState(50);
  const [serviceState, setServiceState] = useState({
    items: [] as ServiceItem[],
    continueToken: "",
    loading: false,
    error: null as string | null,
  });
  const [sliceLimit, setSliceLimit] = useState(50);
  const [sliceState, setSliceState] = useState({
    items: [] as EndpointSliceItem[],
    continueToken: "",
    loading: false,
    error: null as string | null,
  });

  const loadServices = useCallback(
    async (reset: boolean, cont?: string) => {
      setServiceState((prev) => ({ ...prev, loading: true, error: null }));
      try {
        const res = await fetchServices({
          namespace,
          limit: serviceLimit,
          cont: reset ? undefined : cont,
          labelSelector,
        });
        setServiceState((prev) => ({
          items: reset ? res.items : [...prev.items, ...res.items],
          continueToken: res.continue,
          loading: false,
          error: null,
        }));
      } catch (err) {
        setServiceState((prev) => ({
          ...prev,
          loading: false,
          error: err instanceof Error ? err.message : "Failed to load services",
        }));
      }
    },
    [labelSelector, namespace, serviceLimit]
  );

  const loadSlices = useCallback(
    async (reset: boolean, cont?: string) => {
      setSliceState((prev) => ({ ...prev, loading: true, error: null }));
      try {
        const res = await fetchEndpointSlices({
          namespace,
          limit: sliceLimit,
          cont: reset ? undefined : cont,
          labelSelector,
        });
        setSliceState((prev) => ({
          items: reset ? res.items : [...prev.items, ...res.items],
          continueToken: res.continue,
          loading: false,
          error: null,
        }));
      } catch (err) {
        setSliceState((prev) => ({
          ...prev,
          loading: false,
          error: err instanceof Error ? err.message : "Failed to load endpoint slices",
        }));
      }
    },
    [labelSelector, namespace, sliceLimit]
  );

  useEffect(() => {
    loadServices(true);
  }, [loadServices]);

  useEffect(() => {
    loadSlices(true);
  }, [loadSlices]);

  const filteredServices = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return serviceState.items;
    return serviceState.items.filter((svc) =>
      `${svc.namespace}/${svc.name}`.toLowerCase().includes(needle)
    );
  }, [query, serviceState.items]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Networking</h1>
          <p className="mt-2 text-sm text-slatey-400">
            Services and EndpointSlices for quick exposure checks.
          </p>
        </div>
        <div className="rounded-full bg-slatey-800 px-3 py-1 text-xs text-slatey-300">
          Namespace: {namespace}
        </div>
      </div>
      <section className="space-y-2">
        <div className="text-xs uppercase tracking-widest text-slatey-500">Services</div>
        {serviceState.error ? (
          <div className="text-sm text-accent-error">{serviceState.error}</div>
        ) : null}
        <div className="overflow-hidden rounded-xl border border-slatey-800/80">
          <table className="w-full text-left text-sm">
            <thead className="bg-slatey-900/80 text-xs uppercase tracking-widest text-slatey-500">
              <tr>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Namespace</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">Ports</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slatey-800/80">
              {serviceState.loading && serviceState.items.length === 0 ? (
                <tr className="bg-slatey-900/60">
                  <td className="px-4 py-3 text-slatey-500" colSpan={4}>
                    Loading services...
                  </td>
                </tr>
              ) : filteredServices.length === 0 ? (
                <tr className="bg-slatey-900/60">
                  <td className="px-4 py-3 text-slatey-500" colSpan={4}>
                    No services found.
                  </td>
                </tr>
              ) : (
                filteredServices.map((svc) => (
                  <tr key={`${svc.namespace}/${svc.name}`} className="bg-slatey-900/60">
                    <td className="px-4 py-3 text-slate-100">{svc.name}</td>
                    <td className="px-4 py-3 text-slatey-300">{svc.namespace}</td>
                    <td className="px-4 py-3 text-slatey-300">{svc.type}</td>
                    <td className="px-4 py-3 text-slatey-300">
                      {svc.ports.map((port) => `${port.port}/${port.protocol}`).join(", ")}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <PaginationControls
          label="Services."
          limit={serviceLimit}
          setLimit={setServiceLimit}
          hasMore={serviceState.continueToken !== ""}
          loading={serviceState.loading}
          onLoadMore={() => loadServices(false, serviceState.continueToken)}
        />
      </section>
      <section className="space-y-2">
        <div className="text-xs uppercase tracking-widest text-slatey-500">EndpointSlices</div>
        {sliceState.error ? (
          <div className="text-sm text-accent-error">{sliceState.error}</div>
        ) : null}
        <div className="overflow-hidden rounded-xl border border-slatey-800/80">
          <table className="w-full text-left text-sm">
            <thead className="bg-slatey-900/80 text-xs uppercase tracking-widest text-slatey-500">
              <tr>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Namespace</th>
                <th className="px-4 py-3">Ready</th>
                <th className="px-4 py-3">Ports</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slatey-800/80">
              {sliceState.loading && sliceState.items.length === 0 ? (
                <tr className="bg-slatey-900/60">
                  <td className="px-4 py-3 text-slatey-500" colSpan={4}>
                    Loading endpoint slices...
                  </td>
                </tr>
              ) : sliceState.items.length === 0 ? (
                <tr className="bg-slatey-900/60">
                  <td className="px-4 py-3 text-slatey-500" colSpan={4}>
                    No endpoint slices found.
                  </td>
                </tr>
              ) : (
                sliceState.items.map((slice) => (
                  <tr key={`${slice.namespace}/${slice.name}`} className="bg-slatey-900/60">
                    <td className="px-4 py-3 text-slate-100">{slice.name}</td>
                    <td className="px-4 py-3 text-slatey-300">{slice.namespace}</td>
                    <td className="px-4 py-3 text-slatey-300">
                      {slice.readyCount}/{slice.addresses}
                    </td>
                    <td className="px-4 py-3 text-slatey-300">{slice.ports.join(", ")}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <PaginationControls
          label="EndpointSlices."
          limit={sliceLimit}
          setLimit={setSliceLimit}
          hasMore={sliceState.continueToken !== ""}
          loading={sliceState.loading}
          onLoadMore={() => loadSlices(false, sliceState.continueToken)}
        />
      </section>
    </div>
  );
}
