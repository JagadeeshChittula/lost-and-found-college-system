import { useCallback, useEffect, useState } from "react";
import { NavLink } from "react-router-dom";
import { api } from "../../api/client.js";
import Summary from "../../components/common/Summary.jsx";

export default function Admin({ view = "summary" }) {
  const [data, setData] = useState(null);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const load = useCallback(async () => {
    const query = view === "items" ? `?start_date=${startDate}&end_date=${endDate}` : "";
    setData(null);
    setData(await api.get(`/api/admin/${view === "summary" ? "summary" : view}${query}`));
  }, [endDate, startDate, view]);

  useEffect(() => {
    load();
  }, [load]);

  async function action(url, payload) {
    await api.post(url, payload);
    load();
  }

  return (
    <section className="admin">
      <div className="admin-hero">
        <div>
          <p className="eyebrow">Moderation Center</p>
          <h2>{view === "summary" ? "Admin Dashboard" : view[0].toUpperCase() + view.slice(1)}</h2>
          <p className="muted">Review users, items, claims, and reports in one place.</p>
        </div>
      </div>
      <nav className="admin-nav">
        <NavLink to="/admin" end className={({ isActive }) => (isActive ? "active" : "")}>Dashboard</NavLink>
        <NavLink to="/admin/users" className={({ isActive }) => (isActive ? "active" : "")}>Users</NavLink>
        <NavLink to="/admin/items" className={({ isActive }) => (isActive ? "active" : "")}>Items</NavLink>
        <NavLink to="/admin/claims" className={({ isActive }) => (isActive ? "active" : "")}>Claims</NavLink>
        <NavLink to="/admin/reports" className={({ isActive }) => (isActive ? "active" : "")}>Reports</NavLink>
      </nav>

      {view === "summary" && data ? (
        <div className="admin-summary">
          <Summary label="Users" value={data.users_count} />
          <Summary label="Items" value={data.items_count} />
          <Summary label="Claims" value={data.claims_count} />
          <Summary label="Reports" value={data.reports_count} />
        </div>
      ) : null}

      {view === "users" && data ? (
        <div className="admin-grid">
          {data.users.map((u) => (
            <div className="admin-card" key={u.id}>
              <div>
                <strong>{u.name}</strong> ({u.email})
              </div>
              <div className="muted">
                Admin: {u.is_admin ? "Yes" : "No"} | Blocked: {u.blocked ? "Yes" : "No"} | Muted: {u.muted ? "Yes" : "No"}
              </div>
              {!u.is_admin && !u.blocked ? <button className="btn danger" onClick={() => action("/api/admin/block_user", { user_id: u.id })}>Block User</button> : null}
              {!u.is_admin && !u.muted ? <button className="btn ghost" onClick={() => action("/api/admin/mute_user", { user_id: u.id })}>Mute User</button> : null}
              {!u.is_admin && u.muted ? <button className="btn" onClick={() => action("/api/admin/unmute_user", { user_id: u.id })}>Unmute User</button> : null}
            </div>
          ))}
        </div>
      ) : null}

      {view === "items" ? (
        <>
          <div className="admin-filter">
            <label>
              Start Date
              <input type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} />
            </label>
            <label>
              End Date
              <input type="date" value={endDate} onChange={(event) => setEndDate(event.target.value)} />
            </label>
            <button className="btn ghost" onClick={load}>
              Filter
            </button>
          </div>
          <div className="admin-grid">
            {(data?.items || []).map((item) => (
              <div className="admin-card" key={item.id}>
                <div>
                  <strong>{item.name}</strong> ({item.type})
                </div>
                <div className="muted">
                  Contact: {item.contact} | Email: {item.email}
                </div>
                <div className="muted">Date: {item.item_date || "N/A"}</div>
                <button className="btn danger" onClick={() => action("/api/admin/delete_item", { item_id: item.id })}>
                  Delete Item
                </button>
              </div>
            ))}
          </div>
        </>
      ) : null}

      {view === "claims" && data ? (
        <div className="admin-grid">
          {data.claims.map((claim) => (
            <div className="admin-card" key={claim.id}>
              <div>
                <strong>{claim.item_name}</strong> claimed by {claim.claimer_name}
              </div>
              <div className="muted">Status: {claim.status}</div>
            </div>
          ))}
        </div>
      ) : null}

      {view === "reports" && data ? (
        <div className="admin-grid">
          {data.reports.map((report) => (
            <div className="admin-card" key={report.id}>
              <div>
                <strong>{report.reporter_name}</strong> reported: {report.message_body}
              </div>
              <div className="muted">Reason: {report.reason}</div>
              <button className="btn danger" onClick={() => action("/api/admin/delete_message", { message_id: report.message_id })}>
                Delete Message
              </button>
            </div>
          ))}
        </div>
      ) : null}
    </section>
  );
}
