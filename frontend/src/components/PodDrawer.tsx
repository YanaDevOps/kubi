import { PodItem } from "../api/client";

type PodDrawerProps = {
  pod: PodItem | null;
  onClose: () => void;
};

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
}

export default function PodDrawer({ pod, onClose }: PodDrawerProps) {
  if (!pod) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/40">
      <div className="h-full w-full max-w-md border-l border-slatey-800/80 bg-slatey-900/95 p-6 text-slate-100 shadow-xl">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-xs uppercase tracking-widest text-slatey-500">Pod detail</div>
            <h2 className="text-xl font-semibold">{pod.name}</h2>
            <div className="text-xs text-slatey-400">{pod.namespace}</div>
          </div>
          <button
            className="rounded-lg border border-slatey-800 px-3 py-2 text-xs uppercase tracking-widest text-slatey-300 hover:text-slate-100"
            onClick={onClose}
          >
            Close
          </button>
        </div>

        <div className="mt-6 space-y-4 text-sm">
          <div className="rounded-lg border border-slatey-800/80 bg-slatey-900/70 p-3">
            <div className="text-xs uppercase tracking-widest text-slatey-500">Status</div>
            <div className="mt-2">Phase: {pod.phase}</div>
            <div>Ready: {pod.ready ? "Yes" : "No"}</div>
            <div>Restarts: {pod.restarts}</div>
          </div>
          <div className="rounded-lg border border-slatey-800/80 bg-slatey-900/70 p-3">
            <div className="text-xs uppercase tracking-widest text-slatey-500">Images</div>
            <div className="mt-2 space-y-1 text-slatey-300">
              {pod.images && pod.images.length > 0 ? (
                pod.images.map((image) => <div key={image}>{image}</div>)
              ) : (
                <div>-</div>
              )}
            </div>
          </div>
          <div className="rounded-lg border border-slatey-800/80 bg-slatey-900/70 p-3">
            <div className="text-xs uppercase tracking-widest text-slatey-500">Placement</div>
            <div className="mt-2">Node: {pod.node || "-"}</div>
            <div>Pod IP: {pod.podIp || "-"}</div>
          </div>
          <div className="rounded-lg border border-slatey-800/80 bg-slatey-900/70 p-3">
            <div className="text-xs uppercase tracking-widest text-slatey-500">Metadata</div>
            <div className="mt-2">Created: {formatDate(pod.createdAt)}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
