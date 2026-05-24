import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../api/client.js";

export default function AuthForm({ mode, setUser }) {
  const navigate = useNavigate();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const isLogin = mode === "login";

  async function submit(event) {
    event.preventDefault();
    setError("");
    setLoading(true);
    try {
      const data = Object.fromEntries(new FormData(event.currentTarget).entries());
      const res = await api.post(isLogin ? "/api/login" : "/api/register", data);
      if (res.ok) {
        if (isLogin) setUser(res.user);
        navigate(isLogin ? "/" : "/login");
      } else {
        setError(res.message || res.error || "Something went wrong.");
      }
    } finally {
      setLoading(false);
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
          <button className="btn" type="submit" disabled={loading}>
            {loading ? "Please wait…" : isLogin ? "Login" : "Sign Up"}
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
