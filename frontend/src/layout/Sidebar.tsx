import { NavLink } from "react-router-dom";

const navItems = [
  { label: "Overview", to: "/" },
  { label: "Topology", to: "/topology" },
  { label: "Ports", to: "/ports" },
  { label: "Traffic", to: "/traffic" },
  { label: "Workloads", to: "/workloads" },
  { label: "Namespaces", to: "/namespaces" },
  { label: "Pods", to: "/pods" },
  { label: "Nodes", to: "/nodes" },
  { label: "Networking", to: "/networking" },
  { label: "RBAC", to: "/rbac" },
  { label: "Secrets", to: "/secrets" },
  { label: "CRDs & Components", to: "/crds" },
  { label: "Storage", to: "/storage" },
  { label: "Metrics", to: "/metrics" },
  { label: "Validation", to: "/validation" },
  { label: "Settings", to: "/settings" },
];

export default function Sidebar() {
  return (
    <aside className="min-h-screen w-64 border-r border-slatey-800/80 bg-slatey-900/90 px-6 py-8">
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
                "block rounded-lg px-3 py-2 transition",
                isActive
                  ? "bg-slatey-800 text-white shadow-panel"
                  : "text-slatey-400 hover:bg-slatey-850/60 hover:text-slate-100",
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
