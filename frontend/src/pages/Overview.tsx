import { useQuery } from "@tanstack/react-query";
import { fetchHealth, fetchOverview } from "../api/client";
import StatCard from "../components/StatCard";

export default function Overview() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["overview"],
    queryFn: fetchOverview,
  });
  const healthQuery = useQuery({
    queryKey: ["health"],
    queryFn: fetchHealth,
    refetchInterval: 15000,
  });

  if (isLoading) {
    return <div className="text-sm text-slatey-400">Loading overview...</div>;
  }

  if (error || !data) {
    return (
      <div className="text-sm text-accent-error">
        Failed to load overview. Check that the backend is running.
      </div>
    );
  }

  const healthStatus = healthQuery.data?.ok ? "Healthy" : "Unknown";
  const healthClass = healthQuery.data?.ok ? "bg-emerald-500/20 text-emerald-300" : "bg-slatey-800 text-slatey-400";

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Cluster overview</h1>
          <p className="mt-2 text-sm text-slatey-400">
            A quick read-only snapshot of the current context and server status.
          </p>
        </div>
        <div className={`rounded-full px-3 py-1 text-xs ${healthClass}`}>
          API: {healthStatus}
        </div>
      </div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard label="App" value={data.app} hint={`Version ${data.version}`} />
        <StatCard label="Context" value={data.context || "default"} />
        <StatCard label="Namespace" value={data.namespace || "all"} />
        <StatCard label="Read-only" value={data.readonly ? "Enabled" : "Unknown"} />
      </div>
      <div className="kubi-card rounded-xl p-5">
        <div className="text-xs uppercase tracking-[0.2em] text-slatey-500">System</div>
        <div className="mt-3 space-y-2 text-sm text-slatey-300">
          <div>Go runtime: {data.goVersion}</div>
          <div>Timestamp: {new Date(data.timestamp).toLocaleString()}</div>
          <div>Cluster URL: {data.clusterUrl || "masked"}</div>
        </div>
      </div>
    </div>
  );
}
