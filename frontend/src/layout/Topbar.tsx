import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { NamespaceList, fetchHealth, fetchNamespaces } from "../api/client";
import { useNamespace } from "../state/namespace";
import { useSearch } from "../state/search";
import SearchInput from "../components/SearchInput";

function formatUptime(seconds: number) {
  const mins = Math.floor(seconds / 60);
  const hrs = Math.floor(mins / 60);
  const days = Math.floor(hrs / 24);
  if (days > 0) return `${days}d ${hrs % 24}h`;
  if (hrs > 0) return `${hrs}h ${mins % 60}m`;
  if (mins > 0) return `${mins}m`;
  return `${seconds}s`;
}

export default function Topbar() {
  const { namespace, setNamespace, userSet, setUserSet } = useNamespace();
  const { query, setQuery, labelSelector, setLabelSelector } = useSearch();
  const { data } = useQuery({
    queryKey: ["health"],
    queryFn: fetchHealth,
    refetchInterval: 15000,
  });
  const namespacesQuery = useQuery<NamespaceList>({
    queryKey: ["namespaces"],
    queryFn: () => fetchNamespaces(),
  });

  useEffect(() => {
    if (!userSet && data?.namespace && data.namespace !== "all") {
      setNamespace(data.namespace);
    }
  }, [data?.namespace, setNamespace, userSet]);

  const status = data?.ok ? "Healthy" : "Unknown";
  const statusClass = data?.ok ? "kubi-chip kubi-chip-status" : "kubi-chip kubi-chip-muted";

  return (
    <header className="kubi-topbar flex items-center justify-between border-b border-slatey-800/80 px-8 py-4">
      <div className="flex items-center gap-4">
        <div className="kubi-chip rounded-full px-3 py-1 text-xs text-slatey-300">
          Context: {data?.context || "default"}
        </div>
        <div className="kubi-chip flex items-center gap-2 rounded-full px-3 py-1 text-xs text-slatey-300">
          <span>Namespace:</span>
          <select
            className="bg-transparent text-slate-100 focus:outline-none"
            value={namespace}
            onChange={(event) => {
              setNamespace(event.target.value);
              setUserSet(true);
            }}
          >
            <option value="all">all</option>
            {namespacesQuery.data?.items.map((ns) => (
              <option key={ns.name} value={ns.name}>
                {ns.name}
              </option>
            ))}
          </select>
        </div>
        <div className={`rounded-full px-3 py-1 text-xs ${statusClass}`}>
          API: {status}
        </div>
        {data?.uptimeSeconds ? (
          <div className="kubi-chip rounded-full px-3 py-1 text-xs text-slatey-300">
            Uptime: {formatUptime(data.uptimeSeconds)}
          </div>
        ) : null}
      </div>
      <div className="flex items-center gap-3">
        <SearchInput value={query} onChange={setQuery} placeholder="Search resources" />
        <SearchInput
          value={labelSelector}
          onChange={setLabelSelector}
          placeholder="Label selector (app=foo)"
        />
        <button className="kubi-button px-4 py-2 text-xs">
          Settings
        </button>
      </div>
    </header>
  );
}
