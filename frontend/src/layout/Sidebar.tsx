import { NavLink, useLocation } from "react-router-dom";
import {
  Activity,
  AlertTriangle,
  Boxes,
  Braces,
  ChevronDown,
  Circle,
  Database,
  KeyRound,
  LayoutDashboard,
  Moon,
  Network,
  Plug,
  Route,
  Server,
  Settings,
  Share2,
  ShieldCheck,
  SquareStack,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";

const groupDefs = [
  {
    id: "cluster",
    label: "Cluster",
    icon: LayoutDashboard,
    items: [
      { label: "Overview", to: "/app", icon: LayoutDashboard },
      { label: "Topology", to: "/app/topology", icon: Network },
      { label: "Traffic", to: "/app/traffic", icon: Route },
      { label: "Validation", to: "/app/validation", icon: AlertTriangle },
    ],
  },
  {
    id: "workloads",
    label: "Workloads",
    icon: Boxes,
    items: [
      { label: "Workloads", to: "/app/workloads", icon: Boxes },
      { label: "Pods", to: "/app/pods", icon: Circle },
      { label: "Namespaces", to: "/app/namespaces", icon: SquareStack },
    ],
  },
  {
    id: "networking",
    label: "Networking",
    icon: Share2,
    items: [
      { label: "Ports", to: "/app/ports", icon: Plug },
      { label: "Networking", to: "/app/networking", icon: Share2 },
    ],
  },
  {
    id: "security",
    label: "Security",
    icon: ShieldCheck,
    items: [
      { label: "RBAC", to: "/app/rbac", icon: ShieldCheck },
      { label: "Secrets", to: "/app/secrets", icon: KeyRound },
    ],
  },
  {
    id: "platform",
    label: "Platform",
    icon: Server,
    items: [
      { label: "CRDs & Components", to: "/app/crds", icon: Braces },
      { label: "Storage", to: "/app/storage", icon: Database },
      { label: "Metrics", to: "/app/metrics", icon: Activity },
    ],
  },
  {
    id: "settings",
    label: "Settings",
    icon: Settings,
    items: [{ label: "Settings", to: "/app/settings", icon: Settings }],
  },
];

const STORAGE_KEY = "kubi.sidebar.groups";

type SidebarProps = {
  collapsed: boolean;
};

export default function Sidebar({ collapsed }: SidebarProps) {
  const location = useLocation();
  const [darkMode, setDarkMode] = useState(true);

  const [openGroupId, setOpenGroupId] = useState<string>(() => {
    if (typeof window === "undefined") return "cluster";
    try {
      const value = window.localStorage.getItem(STORAGE_KEY);
      if (!value) return "cluster";
      const parsed = JSON.parse(value);
      if (typeof parsed === "string" && parsed.length > 0) return parsed;
      if (Array.isArray(parsed) && parsed.length > 0) return parsed[0];
      return "cluster";
    } catch {
      return "cluster";
    }
  });

  const activeGroup = useMemo(() => {
    return groupDefs.find((group) => group.items.some((item) => item.to === location.pathname));
  }, [location.pathname]);

  useEffect(() => {
    if (!activeGroup) return;
    setOpenGroupId(activeGroup.id);
  }, [activeGroup, setOpenGroupId]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(openGroupId));
  }, [openGroupId]);

  return (
    <aside
      className={`kubi-sidebar flex min-h-screen flex-col border-r border-slatey-800/80 bg-slatey-900/95 px-4 py-6 transition-all ${
        collapsed ? "w-20" : "w-64"
      }`}
    >
      <div className={`mb-4 flex items-center ${collapsed ? "justify-center" : "justify-start pt-0"}`}>
        <img
          src={collapsed ? "/branding/logo-mark.png" : "/branding/logo-lockup.png"}
          alt="KUBI"
          className={collapsed ? "sidebar-logo-collapsed" : "sidebar-logo"}
        />
      </div>

      <nav className="space-y-3 text-sm">
        {groupDefs.map((group) => {
          const Icon = group.icon;
          const isActiveGroup = activeGroup?.id === group.id;
          const isOpen = openGroupId === group.id;

          if (collapsed) {
            return (
              <div key={group.id} className="relative group">
                <button
                  className={`nav-group-button flex w-full items-center justify-center rounded-lg transition ${
                    isActiveGroup ? "nav-group-active border-accent-info/70 text-accent-info" : ""
                  }`}
                >
                  <Icon className="nav-icon h-5 w-5" />
                </button>
                <div className="pointer-events-none absolute left-full top-0 ml-3 hidden w-56 rounded-xl border border-slatey-800/80 bg-slatey-900/95 p-3 text-sm text-slate-100 shadow-panel group-hover:block">
                  <div className="text-xs uppercase tracking-widest text-slatey-500">{group.label}</div>
                  <div className="mt-2 space-y-1">
                    {group.items.map((item) => (
                      <div key={item.to} className="text-slatey-300">
                        {item.label}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            );
          }

          return (
            <div key={group.id} className="space-y-2">
              <button
                className={`nav-group-button flex w-full items-center justify-between rounded-lg text-left transition ${
                  isActiveGroup ? "nav-group-active border-accent-info/70 text-slate-100" : ""
                }`}
                onClick={() => setOpenGroupId(group.id)}
              >
                <span className="flex items-center gap-3">
                  <Icon className="nav-icon h-4 w-4" />
                  <span className="text-xs uppercase tracking-widest">{group.label}</span>
                </span>
                <ChevronDown className={`h-4 w-4 transition ${isOpen ? "rotate-180" : ""}`} />
              </button>
              {isOpen ? (
                <div className="space-y-1 pl-1">
                  {group.items.map((item) => {
                    const ItemIcon = item.icon;
                    return (
                      <NavLink
                        key={item.to}
                        to={item.to}
                        end={item.to === "/app"}
                        className={({ isActive }) =>
                          [
                            "nav-item flex items-center gap-3 rounded-lg transition",
                            isActive ? "nav-item-active" : "",
                          ].join(" ")
                        }
                      >
                        <ItemIcon className="nav-icon h-4 w-4" />
                        <span>{item.label}</span>
                      </NavLink>
                    );
                  })}
                </div>
              ) : null}
            </div>
          );
        })}
      </nav>
      <div className="mt-auto pt-6">
        <div
          className={`flex w-full items-center gap-3 text-sm text-slatey-300 ${
            collapsed ? "justify-center" : "justify-between px-3.5"
          }`}
        >
          <span className="flex items-center gap-3">
            <Moon className="h-4 w-4" />
            {!collapsed ? <span>Dark Mode</span> : null}
          </span>
          {!collapsed ? (
            <div
              role="switch"
              aria-checked={darkMode}
              tabIndex={0}
              className={`relative h-5 w-10 cursor-pointer rounded-full transition ${
                darkMode ? "bg-[#2EE6A6]/70" : "bg-white/15"
              }`}
              onClick={() => setDarkMode((prev) => !prev)}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  setDarkMode((prev) => !prev);
                }
              }}
            >
              <span
                className={`absolute top-0.5 h-4 w-4 rounded-full bg-slatey-900 transition ${
                  darkMode ? "left-5" : "left-1"
                }`}
              />
            </div>
          ) : null}
        </div>
      </div>
    </aside>
  );
}
