import React, { useCallback, useEffect, useMemo, useState } from "react";
import { BrowserRouter, Link, NavLink, Route, Routes, useLocation, useNavigate } from "react-router-dom";
import { io } from "socket.io-client";
import "./styles.css";

const api = {
  async get(url) {
    const res = await fetch(url, { credentials: "include" });
    return res.json();
  },
  async post(url, data, isForm = false) {
    const res = await fetch(url, {
      method: "POST",
      credentials: "include",
      headers: isForm ? {} : { "Content-Type": "application/json" },
      body: isForm ? data : JSON.stringify(data)
    });
    const json = await res.json();
    if (!res.ok) json.__status = res.status;
    return json;
  }
};

function useTheme() {
  const [theme, setTheme] = useState(() => {
    const stored = localStorage.getItem("theme");
    if (stored === "dark" || stored === "light") return stored;
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  });

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("theme", theme);
  }, [theme]);

  return [theme, setTheme];
}

function Layout({ user, setUser, children }) {
  const [theme, setTheme] = useTheme();
  const navigate = useNavigate();

  async function logout() {
    await api.post("/api/logout", {});
    setUser(null);
    navigate("/");
  }

  return (
    <>
      <header className="site-header">
        <div className="brand">Campus Lost & Found</div>
        <nav className="nav">
          <NavLink to="/">Home</NavLink>
          <NavLink to="/lost">Lost</NavLink>
          <NavLink to="/found">Found</NavLink>
          <NavLink to="/items">Items</NavLink>
          <button
            type="button"
            className="pill theme-toggle"
            aria-pressed={theme === "dark"}
            aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          >
            <svg className="theme-icon icon-moon" viewBox="0 0 24 24" aria-hidden="true">
              <path
                d="M21 12.8A9 9 0 0 1 11.2 3a7 7 0 1 0 9.8 9.8z"
                stroke="currentColor"
                strokeWidth="1.6"
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            <svg className="theme-icon icon-sun" viewBox="0 0 24 24" aria-hidden="true">
              <circle cx="12" cy="12" r="4" stroke="currentColor" strokeWidth="1.6" fill="none" />
              <path
                d="M12 2.5v3M12 18.5v3M4.2 4.2l2.1 2.1M17.7 17.7l2.1 2.1M2.5 12h3M18.5 12h3M4.2 19.8l2.1-2.1M17.7 6.3l2.1-2.1"
                stroke="currentColor"
                strokeWidth="1.6"
                fill="none"
                strokeLinecap="round"
              />
            </svg>
          </button>
          {user ? (
            <>
              <button type="button" className="pill" onClick={logout}>
                Logout
              </button>
              {user.is_admin ? (
                <NavLink to="/admin" className="pill">
                  Admin
                </NavLink>
              ) : null}
            </>
          ) : (
            <>
              <NavLink to="/login" className="pill">
                Login
              </NavLink>
              <NavLink to="/register" className="pill">
                Sign Up
              </NavLink>
            </>
          )}
        </nav>
      </header>

      <main className="page">{children}</main>

      <footer className="site-footer" id="contact">
        <div>Contact: campuslostfound@adityatekkali.edu.in</div>
        <div>&copy; 2026 Campus Lost & Found. All rights reserved.</div>
      </footer>
    </>
  );
}

function Home({ user }) {
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

function InfoCard({ title, text, link, cta }) {
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

function Feature({ title, text }) {
  return (
    <div className="feature-card">
      <h3>{title}</h3>
      <p>{text}</p>
    </div>
  );
}

function ItemForm({ type }) {
  const isLost = type === "lost";
  const [status, setStatus] = useState("");
  const [fileName, setFileName] = useState("No file chosen");

  async function submitItem(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);
    formData.append("type", type);
    const res = await api.post("/api/items", formData, true);
    if (res.ok) {
      setStatus(`${type} item submitted.`);
      setFileName("No file chosen");
      form.reset();
    } else {
      setStatus(res.error || "Please login to submit.");
    }
  }

  return (
    <section className="form-card">
      <h2>{isLost ? "Report a Lost Item" : "Report a Found Item"}</h2>
      <p>{isLost ? "Fill in the details below. The admin can help moderate spam and guide recoveries." : "Help someone get their item back by submitting the details."}</p>
      <form className="form" encType="multipart/form-data" onSubmit={submitItem}>
        <div className="grid">
          <label>
            {isLost ? "Item Name" : "Found Item Name"}
            <input type="text" name="name" required />
          </label>
          <label>
            Contact Person
            <input type="text" name="contact" required />
          </label>
          <label>
            Email
            <input type="email" name="email" />
          </label>
          <label>
            {isLost ? "Date Lost" : "Date Found"}
            <input type="date" name="item_date" required />
          </label>
          <label>
            Description
            <input type="text" name="description" placeholder={isLost ? "Color, location, time" : "Where found, color"} />
          </label>
          <label>Upload Photo</label>
          <div className="file-field">
            <input
              id={`${type}Photo`}
              className="file-input"
              type="file"
              name="image"
              accept="image/*"
              onChange={(event) => setFileName(event.target.files?.[0]?.name || "No file chosen")}
            />
            <label className="file-button" htmlFor={`${type}Photo`}>
              Choose File
            </label>
            <span className="file-name">{fileName}</span>
          </div>
        </div>
        <button className="btn" type="submit">
          Submit {isLost ? "Lost" : "Found"} Item
        </button>
        <div className="form-status">{status}</div>
      </form>
    </section>
  );
}

function AuthForm({ mode, setUser }) {
  const navigate = useNavigate();
  const [error, setError] = useState("");
  const isLogin = mode === "login";

  async function submit(event) {
    event.preventDefault();
    const data = Object.fromEntries(new FormData(event.currentTarget).entries());
    const res = await api.post(isLogin ? "/api/login" : "/api/register", data);
    if (res.ok) {
      if (isLogin) setUser(res.user);
      navigate(isLogin ? "/" : "/login");
    } else {
      setError(res.error || "Something went wrong.");
    }
  }

  return (
    <section className="login-card">
      <div className="login-panel">
        <h2>{isLogin ? "Login" : "Create Account"}</h2>
        <form className="form" onSubmit={submit}>
          {!isLogin ? (
            <label>
              Name
              <input type="text" name="name" required />
            </label>
          ) : null}
          <label>
            Email
            <input type="email" name="email" required />
          </label>
          <label>
            Password
            <input type="password" name="password" required />
          </label>
          <button className="btn" type="submit">
            {isLogin ? "Login" : "Sign Up"}
          </button>
        </form>
        {error ? <div className="form-status error">{error}</div> : null}
        {!isLogin ? (
          <div className="muted" style={{ marginTop: 10 }}>
            Already have an account? <Link to="/login">Login</Link>
          </div>
        ) : null}
      </div>
    </section>
  );
}

function ItemsPage() {
  const [items, setItems] = useState([]);
  const [q, setQ] = useState("");
  const [type, setType] = useState("all");
  const [currentChatItem, setCurrentChatItem] = useState(null);
  const [chatName, setChatName] = useState("Select an item to chat");
  const [messages, setMessages] = useState([]);
  const [chatInput, setChatInput] = useState("");
  const socket = useMemo(() => io("/", { autoConnect: false, withCredentials: true }), []);

  const loadItems = useCallback(async () => {
    const data = await api.get(`/api/items?type=${encodeURIComponent(type)}&q=${encodeURIComponent(q)}`);
    setItems(data.items || []);
  }, [q, type]);

  useEffect(() => {
    loadItems();
  }, [loadItems]);

  useEffect(() => {
    socket.on("message", (payload) => {
      if (String(payload.item_id) === String(currentChatItem)) {
        setMessages((existing) => [...existing, { id: payload.id, sender_name: payload.sender, body: payload.body }]);
      }
    });
    return () => socket.off("message");
  }, [socket, currentChatItem]);

  async function claim(itemId) {
    const res = await api.post("/api/claim", { item_id: itemId });
    if (!res.ok) {
      alert(res.error || "Please login to claim.");
      return;
    }
    alert("Claim submitted. You can open chat now.");
    loadItems();
  }

  async function openChat(item) {
    const data = await api.get(`/api/chat/messages?item_id=${item.id}`);
    if (data.error) {
      alert(data.error);
      return;
    }
    setCurrentChatItem(item.id);
    setChatName(item.name);
    setMessages(data.messages || []);
    if (!socket.connected) socket.connect();
    socket.emit("join", { item_id: item.id });
  }

  async function sendChat() {
    if (!currentChatItem) return alert("Select an item to chat first.");
    const body = chatInput.trim();
    if (!body) return;
    const res = await api.post("/api/chat/messages", { item_id: currentChatItem, body });
    if (res.ok) {
      setChatInput("");
      setMessages((existing) => [...existing, { id: res.id || null, sender_name: "You", body }]);
    } else {
      alert(res.error || "Please login to chat.");
    }
  }

  async function report(messageId) {
    const reason = prompt("Report reason?") || "Reported";
    const res = await api.post("/api/chat/report", { message_id: messageId, reason });
    if (res.ok) alert("Report submitted.");
  }

  return (
    <section className="items">
      <div className="items-header">
        <h2>All Lost & Found Items</h2>
        <div className="items-controls">
          <input value={q} onChange={(event) => setQ(event.target.value)} type="text" placeholder="Search items..." />
          <select value={type} onChange={(event) => setType(event.target.value)}>
            <option value="all">All</option>
            <option value="lost">Lost</option>
            <option value="found">Found</option>
          </select>
          <button className="btn ghost" onClick={loadItems}>
            Search
          </button>
        </div>
      </div>

      <div className="items-layout">
        <div className="items-left">
          <div className="items-grid">
            {items.map((item) => (
              <div className="item-card" key={item.id}>
                <div className={`item-media ${item.imageUrl ? "has-photo" : "no-photo"}`}>
                  {item.imageUrl ? <img className="item-photo" src={item.imageUrl} alt="Lost Item" /> : null}
                  <div className="item-badge">{item.type.toUpperCase()}</div>
                </div>
                <div className="item-details">
                  <div className="item-title">{item.name}</div>
                  <div className="item-desc">{item.description || "No description"}</div>
                  <div className="item-contact">
                    Contact: {item.contact} {item.email ? `| ${item.email}` : ""}
                  </div>
                  <div className="item-actions">
                    <button className="btn ghost btn-claim" onClick={() => claim(item.id)}>
                      Belongs to me
                    </button>
                    {item.can_chat ? (
                      <button className="btn btn-chat" onClick={() => openChat(item)}>
                        Chat
                      </button>
                    ) : (
                      <span className="muted">{item.has_claim ? "Claim pending" : "Claim to enable chat"}</span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="items-right">
          {!currentChatItem ? (
            <div className="helper-card">
              <div className="helper-title">How to claim safely</div>
              <ul className="helper-list">
                <li>Open an item and click "Belongs to me".</li>
                <li>Wait for approval, then use chat to verify.</li>
                <li>Share identifiers (serials, photos) instead of personal info.</li>
                <li>Meet in public campus areas only.</li>
              </ul>
            </div>
          ) : (
            <div className="chat-panel">
              <div className="chat-header">
                <div>Chat</div>
                <div className="muted">{chatName}</div>
              </div>
              <div className="chat-messages">
                {messages.map((message) => (
                  <div className="chat-line" key={message.id || `${message.sender_name}-${message.body}`}>
                    <span className="muted">
                      {message.sender_name}: {message.body}
                    </span>
                    {message.id ? (
                      <button className="report-btn" onClick={() => report(message.id)}>
                        Report
                      </button>
                    ) : null}
                  </div>
                ))}
              </div>
              <div className="chat-input">
                <input value={chatInput} onChange={(event) => setChatInput(event.target.value)} type="text" placeholder="Type a message..." />
                <button className="btn" onClick={sendChat}>
                  Send
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

function Admin({ view = "summary" }) {
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

function Summary({ label, value }) {
  return (
    <div className="summary-card">
      <div className="summary-label">{label}</div>
      <div className="summary-value">{value}</div>
    </div>
  );
}

function AppRoutes({ user, setUser }) {
  const location = useLocation();

  return (
    <Routes key={location.pathname}>
      <Route path="/" element={<Home user={user} />} />
      <Route path="/lost" element={<ItemForm type="lost" />} />
      <Route path="/found" element={<ItemForm type="found" />} />
      <Route path="/items" element={<ItemsPage />} />
      <Route path="/login" element={<AuthForm mode="login" setUser={setUser} />} />
      <Route path="/register" element={<AuthForm mode="register" setUser={setUser} />} />
      <Route path="/admin" element={<Admin />} />
      <Route path="/admin/users" element={<Admin view="users" />} />
      <Route path="/admin/items" element={<Admin view="items" />} />
      <Route path="/admin/claims" element={<Admin view="claims" />} />
      <Route path="/admin/reports" element={<Admin view="reports" />} />
    </Routes>
  );
}

export default function App() {
  const [user, setUser] = useState(null);

  useEffect(() => {
    api.get("/api/me").then((data) => setUser(data.user));
  }, []);

  return (
    <BrowserRouter>
      <Layout user={user} setUser={setUser}>
        <AppRoutes user={user} setUser={setUser} />
      </Layout>
    </BrowserRouter>
  );
}
