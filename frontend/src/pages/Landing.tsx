import { Link } from "react-router-dom";

export default function Landing() {
  return (
    <div className="min-h-screen bg-slatey-900 text-slate-100">
      <div className="mx-auto flex min-h-screen max-w-5xl flex-col items-center justify-center px-6 text-center">
        <div className="landing-wordmark" role="img" aria-label="KUBI"></div>
        <Link
          to="/app"
          className="mt-12 rounded-xl border border-transparent bg-accent-info/20 px-8 py-4 text-sm font-semibold uppercase tracking-[0.3em] text-accent-info transition hover:bg-accent-info/30 focus:outline-none focus:ring-2 focus:ring-accent-info/50"
        >
          Test MVP
        </Link>
      </div>
    </div>
  );
}
