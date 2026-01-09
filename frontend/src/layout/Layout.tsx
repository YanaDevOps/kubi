import { ReactNode, useEffect, useState } from "react";
import { Outlet } from "react-router-dom";
import { ArrowLeft, ArrowRight } from "lucide-react";
import Sidebar from "./Sidebar";
import Topbar from "./Topbar";

type LayoutProps = {
  children?: ReactNode;
};

export default function Layout({ children }: LayoutProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [darkMode, setDarkMode] = useState(() => {
    if (typeof window === "undefined") return true;
    const stored = window.localStorage.getItem("kubi.theme");
    return stored !== "light";
  });

  useEffect(() => {
    if (typeof document === "undefined") return;
    const theme = darkMode ? "dark" : "light";
    document.documentElement.dataset.theme = theme;
    document.documentElement.style.colorScheme = theme;
    if (typeof window !== "undefined") {
      window.localStorage.setItem("kubi.theme", theme);
    }
  }, [darkMode]);

  return (
    <div className="min-h-screen text-slate-100">
      <div className="flex">
        <div className="relative">
          <Sidebar
            collapsed={collapsed}
            darkMode={darkMode}
            onToggleDarkMode={() => setDarkMode((prev) => !prev)}
          />
          <button
            className="absolute top-4 -right-4 z-50 h-[30px] w-[30px] rounded-full border border-white/10 bg-slatey-900/95 text-white/90 shadow-panel transition hover:shadow-[0_0_0_1px_rgba(46,230,166,0.35),0_0_12px_rgba(46,230,166,0.25)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-info/40"
            onClick={() => setCollapsed((prev) => !prev)}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {collapsed ? (
              <ArrowRight className="mx-auto h-4 w-4" strokeWidth={2.25} />
            ) : (
              <ArrowLeft className="mx-auto h-4 w-4" strokeWidth={2.25} />
            )}
          </button>
        </div>
        <div className="kubi-workspace flex-1">
          <Topbar />
          <main className="px-8 py-6">
            <div className="kubi-panel rounded-2xl p-6">
              {children ?? <Outlet />}
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
