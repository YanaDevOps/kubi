import { useEffect, useState } from "react";
import {
  fetchKubeconfigContexts,
  KubeconfigTestResult,
  saveKubeconfig,
  testKubeconfig,
} from "../api/client";

export default function Settings() {
  const [kubeconfig, setKubeconfig] = useState("");
  const [contexts, setContexts] = useState<string[]>([]);
  const [context, setContext] = useState("");
  const [status, setStatus] = useState<{
    state: "idle" | "saving" | "saved" | "testing" | "success" | "error";
    message?: string;
    details?: string;
  }>({ state: "idle" });

  useEffect(() => {
    fetchKubeconfigContexts()
      .then((data) => {
        if (data.contexts?.length) {
          setContexts(data.contexts);
          setContext(data.currentContext || data.contexts[0]);
        }
      })
      .catch(() => {});
  }, []);

  const onSave = async () => {
    setStatus({ state: "saving", message: "Saving kubeconfig..." });
    try {
      const data = await saveKubeconfig({ kubeconfig, context });
      setContexts(data.contexts);
      setContext(data.currentContext || data.contexts[0] || "");
      setStatus({ state: "saved", message: "Kubeconfig saved in memory." });
    } catch (err) {
      setStatus({ state: "error", message: (err as Error).message });
    }
  };

  const onTest = async () => {
    setStatus({ state: "testing", message: "Testing connection..." });
    try {
      const data: KubeconfigTestResult = await testKubeconfig({ context });
      if (data.ok) {
        setStatus({
          state: "success",
          message: `Connected: ${data.context}`,
          details: [data.clusterUrl, data.serverVersion].filter(Boolean).join(" · "),
        });
      } else {
        setStatus({
          state: "error",
          message: data.error || "Connection failed.",
        });
      }
    } catch (err) {
      setStatus({ state: "error", message: (err as Error).message });
    }
  };

  const statusColor =
    status.state === "success"
      ? "text-emerald-300"
      : status.state === "error"
        ? "text-rose-300"
        : "text-slatey-300";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Settings</h1>
        <p className="mt-2 text-sm text-slatey-400">
          Paste a kubeconfig to connect and test cluster access. Stored in memory only.
        </p>
      </div>

      <section className="space-y-4">
        <div className="text-xs uppercase tracking-widest text-slatey-500">Kubeconfig</div>
        <textarea
          value={kubeconfig}
          onChange={(event) => setKubeconfig(event.target.value)}
          placeholder="Paste kubeconfig YAML here..."
          rows={10}
          className="w-full rounded-xl border border-slatey-800/80 bg-slatey-900/70 p-4 text-sm text-slate-100 placeholder:text-slatey-500 focus:outline-none focus:ring-2 focus:ring-accent-info/40"
        />
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2 text-sm text-slatey-300">
            <span>Context:</span>
            <select
              className="rounded-lg border border-slatey-800 bg-slatey-900 px-3 py-2 text-sm text-slate-100"
              value={context}
              onChange={(event) => setContext(event.target.value)}
              disabled={contexts.length === 0}
            >
              {contexts.length === 0 ? (
                <option value="">No contexts loaded</option>
              ) : (
                contexts.map((ctx) => (
                  <option key={ctx} value={ctx}>
                    {ctx}
                  </option>
                ))
              )}
            </select>
          </div>
          <button
            className="rounded-lg border border-slatey-800/80 bg-slatey-900/70 px-4 py-2 text-xs uppercase tracking-widest text-slatey-300 transition hover:text-slate-100"
            onClick={onSave}
            disabled={!kubeconfig}
          >
            Save
          </button>
          <button
            className="rounded-lg border border-slatey-800/80 bg-slatey-900/70 px-4 py-2 text-xs uppercase tracking-widest text-slatey-300 transition hover:text-slate-100"
            onClick={onTest}
            disabled={!context}
          >
            Test connection
          </button>
        </div>
        <div className={`rounded-lg border border-slatey-800/80 bg-slatey-900/70 px-4 py-3 text-sm ${statusColor}`}>
          {status.message || "No connection test yet."}
          {status.details ? <div className="mt-1 text-xs text-slatey-400">{status.details}</div> : null}
        </div>
      </section>
    </div>
  );
}
