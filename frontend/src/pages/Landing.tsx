import { Link } from "react-router-dom";

export default function Landing() {
  return (
    <div className="landing-shell">
      <div className="landing-blob landing-blob--teal"></div>
      <div className="landing-blob landing-blob--blue"></div>
      <div className="landing-blob landing-blob--violet"></div>
      <div className="landing-ambient landing-ambient--left"></div>
      <div className="landing-ambient landing-ambient--right"></div>
      <div className="landing-grid"></div>
      <header className="landing-header landing-header--centered">
        <img
          src="/branding/icon-512.png"
          alt="KUBI"
          className="landing-logo landing-logo--mark"
        />
      </header>
      <main className="landing-hero">
        <span className="landing-descriptor">
          Read-only Kubernetes visualizer
        </span>
        <h1 className="landing-title landing-font">KUBI</h1>
        <p className="landing-copy">
          Calm visibility into workloads, ports, and policies—engineered for operators who
          need clarity without changes.
        </p>
        <Link to="/app" className="landing-cta landing-button">
          TEST MVP
        </Link>
        <div className="landing-benefits">
          <span>Read-only by design</span>
          <span>Local-first security</span>
          <span>Instant topology clarity</span>
        </div>
      </main>
    </div>
  );
}
