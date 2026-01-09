import { NavLink } from "react-router-dom";

const navItems = [
  { label: "Overview", to: "/app" },
  { label: "Topology", to: "/app/topology" },
  { label: "Ports", to: "/app/ports" },
  { label: "Traffic", to: "/app/traffic" },
  { label: "Workloads", to: "/app/workloads" },
  { label: "Namespaces", to: "/app/namespaces" },
  { label: "Pods", to: "/app/pods" },
  { label: "Nodes", to: "/app/nodes" },
  { label: "Networking", to: "/app/networking" },
  { label: "RBAC", to: "/app/rbac" },
  { label: "Secrets", to: "/app/secrets" },
  { label: "CRDs & Components", to: "/app/crds" },
  { label: "Storage", to: "/app/storage" },
  { label: "Metrics", to: "/app/metrics" },
  { label: "Validation", to: "/app/validation" },
  { label: "Settings", to: "/app/settings" },
];

export default function Sidebar() {
  return (
    <aside className="min-h-screen w-64 border-r border-slatey-800/80 bg-slatey-900/95 px-6 py-8">
      <div className="mb-10">
        <div className="text-sm uppercase tracking-[0.3em] text-slatey-500">KUBI</div>
        <div className="text-2xl font-semibold">MVP Console</div>
      </div>
      <nav className="space-y-2 text-sm">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              [
                "block rounded-lg border-l-2 px-3 py-2 transition",
                isActive
                  ? "border-accent-info bg-slatey-800/70 text-slate-50 shadow-panel"
                  : "border-transparent text-slatey-400 hover:bg-slatey-800/40 hover:text-slate-100",
              ].join(" ")
            }
          >
            {item.label}
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}
