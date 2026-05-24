import { NavLink, useNavigate } from "react-router-dom";
import { api } from "../../api/client.js";
import { useTheme } from "../../hooks/useTheme.js";

export default function Layout({ user, setUser, children }) {
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
