import { Link } from "react-router-dom";

export default function InfoCard({ title, text, link, cta }) {
  return (
    <div className="info-card">
      <h2>{title}</h2>
      <p>{text}</p>
      <div className="info-actions">
        <Link className="btn ghost" to={link}>
          {cta}
        </Link>
      </div>
    </div>
  );
}
