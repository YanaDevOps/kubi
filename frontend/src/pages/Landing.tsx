import { Link } from "react-router-dom";

export default function Landing() {
  return (
    <div className="landing-shell">
      <div className="landing-ambient landing-ambient--left"></div>
      <div className="landing-ambient landing-ambient--right"></div>
      <div className="landing-ambient landing-ambient--bottom"></div>
      <div className="landing-grid"></div>
      <div className="landing-orbit"></div>
      <div className="landing-orbit landing-orbit--inner"></div>
      <div className="landing-stage">
        <div className="landing-hero font-landing">
          <span className="landing-eyebrow">Read-only Kubernetes visualizer</span>
          <div className="landing-wordmark" role="img" aria-label="KUBI"></div>
          <p className="landing-copy">
            KUBI maps workloads, ports, and policies into a single calm view—built to help operators
            understand cluster reality without changing it.
          </p>
          <div className="landing-actions">
            <Link to="/app" className="landing-cta">
              Test MVP
            </Link>
            <span className="landing-meta">Local-first • No writes • Secure defaults</span>
          </div>
        </div>
        <div className="landing-base"></div>
      </div>
    </div>
  );
}
