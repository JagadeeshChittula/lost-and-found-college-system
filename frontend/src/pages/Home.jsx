import { Link } from "react-router-dom";
import Feature from "../components/common/Feature.jsx";
import InfoCard from "../components/common/InfoCard.jsx";

export default function Home({ user }) {
  return (
    <>
      <section className="home-hero">
        <div className="hero-content">
          <span className="eyebrow">Campus Lost & Found</span>
          <h1>Find what matters in minutes.</h1>
          <p>
            Report lost items, announce found items, and connect safely using verified chat. A clear path from report to
            reunion.
          </p>
          <div className="cta-row">
            <Link className="btn" to="/lost">
              Report Lost
            </Link>
            <Link className="btn ghost" to="/found">
              Report Found
            </Link>
          </div>
          <div className="hero-metrics">
            <div className="metric-card">
              <div className="stat">1,240+</div>
              <div className="label">Items Reunited</div>
            </div>
            <div className="metric-card">
              <div className="stat">24/7</div>
              <div className="label">Secure Chat</div>
            </div>
            <div className="metric-card">
              <div className="stat">2 mins</div>
              <div className="label">Avg. Claim Time</div>
            </div>
          </div>
        </div>
        <div className="hero-visual">
          <div className="hero-card-stack">
            <div className="hero-mini-card">
              <div className="mini-title">Lost</div>
              <div className="mini-desc">Blue AirPods near library</div>
              <div className="mini-tag">Verified</div>
            </div>
            <div className="hero-mini-card">
              <div className="mini-title">Found</div>
              <div className="mini-desc">Graphing calculator - Room 204</div>
              <div className="mini-tag">Matched</div>
            </div>
            <div className="hero-mini-card">
              <div className="mini-title">Chat</div>
              <div className="mini-desc">Private message opened</div>
              <div className="mini-tag">Safe</div>
            </div>
          </div>
          <div className="hero-orbit"></div>
        </div>
      </section>

      <section className="home-grid">
        <InfoCard title="How it works" text="Post a report in seconds. Search by category, location, and time." link="/items" cta="Browse Items" />
        <InfoCard title="Fast, verified claims" text="Claim ownership with one click and open a secure chat once verified." link={user ? "/items" : "/login"} cta={user ? "Browse Items" : "Login to Claim"} />
        <InfoCard title="Built for students" text="Clean, focused interface designed to reduce confusion and speed up returns." link={user ? "/items" : "/register"} cta={user ? "Browse Items" : "Create Account"} />
      </section>

      <section className="feature-strip">
        <Feature title="Search & Filter" text="Zero clutter. Find the right item fast." />
        <Feature title="Claim Ownership" text="Verified flow keeps everyone safe." />
        <Feature title="Admin Moderation" text="Reports are reviewed for trust." />
        <Feature title="Realtime Chat" text="Private messages, simple handoff." />
      </section>
    </>
  );
}
