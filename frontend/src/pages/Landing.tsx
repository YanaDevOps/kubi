import { Link } from "react-router-dom";

export default function Landing() {
  return (
    <div className="landing-shell">
      <div className="landing-ambient landing-ambient--left"></div>
      <div className="landing-ambient landing-ambient--right"></div>
      <div className="landing-grid"></div>
      <div className="landing-scene">
        <div className="landing-frame">
          <div className="landing-arc"></div>
          <header className="landing-header">
            <img
              src="/branding/logo-lockup.png"
              alt="KUBI"
              className="landing-logo"
            />
          </header>
          <main className="landing-hero">
            <span className="landing-descriptor landing-font">
              Read-only Kubernetes visualizer
            </span>
            <h1 className="landing-title landing-font">KUBI</h1>
            <p className="landing-copy landing-font">
              Calm visibility into workloads, ports, and policies—engineered for operators who
              need clarity without changes.
            </p>
            <Link to="/app" className="landing-cta landing-button">
              TEST MVP
            </Link>
          </main>
        </div>
      </div>
    </div>
  );
}
