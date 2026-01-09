import { ReactNode } from "react";
import Sidebar from "./Sidebar";
import Topbar from "./Topbar";

type LayoutProps = {
  children: ReactNode;
};

export default function Layout({ children }: LayoutProps) {
  return (
    <div className="min-h-screen text-slate-100">
      <div className="flex">
        <Sidebar />
        <div className="flex-1">
          <Topbar />
          <main className="px-8 py-6">
            <div className="rounded-2xl bg-slatey-900/70 shadow-panel border border-slatey-800/80 p-6">
              {children}
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
