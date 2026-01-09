import { ReactNode, useState } from "react";
import { Outlet } from "react-router-dom";
import { ChevronLeft, ChevronRight } from "lucide-react";
import Sidebar from "./Sidebar";
import Topbar from "./Topbar";

type LayoutProps = {
  children?: ReactNode;
};

export default function Layout({ children }: LayoutProps) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="min-h-screen text-slate-100">
      <div className="flex">
        <div className="relative">
          <Sidebar collapsed={collapsed} />
          <button
            className="absolute top-6 -right-4 rounded-full border border-slatey-800/80 bg-slatey-900/90 p-1.5 text-slatey-300 shadow-panel transition hover:text-slate-100"
            onClick={() => setCollapsed((prev) => !prev)}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {collapsed ? <ChevronRight className="h-3.5 w-3.5" /> : <ChevronLeft className="h-3.5 w-3.5" />}
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
