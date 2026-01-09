import { ReactNode, useState } from "react";
import { Outlet } from "react-router-dom";
import { ArrowLeft, ArrowRight } from "lucide-react";
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
            className="absolute top-5 -right-5 z-50 h-10 w-10 rounded-full border border-white/15 bg-[rgba(12,14,20,0.7)] text-white/90 shadow-panel transition hover:border-white/25 hover:bg-[rgba(18,20,26,0.78)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-info/40"
            onClick={() => setCollapsed((prev) => !prev)}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {collapsed ? (
              <ArrowRight className="mx-auto h-5 w-5" strokeWidth={2.25} />
            ) : (
              <ArrowLeft className="mx-auto h-5 w-5" strokeWidth={2.25} />
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
