import { Link } from "react-router-dom";

export default function Landing() {
  return (
    <div className="landing-shell">
      <div className="landing-glow landing-glow--left"></div>
      <div className="landing-glow landing-glow--right"></div>
      <div className="landing-grid"></div>
      <div className="mx-auto flex min-h-screen max-w-6xl flex-col items-center justify-center px-6 text-center">
        <div className="landing-hero">
          <div className="landing-wordmark" role="img" aria-label="KUBI"></div>
          <div className="landing-underline"></div>
          <Link
            to="/app"
            className="landing-cta"
          >
            Test MVP
          </Link>
        </div>
      </div>
    </div>
  );
}
