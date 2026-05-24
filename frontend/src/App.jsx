import { useEffect, useState } from "react";
import { BrowserRouter } from "react-router-dom";
import { api } from "./api/client.js";
import Layout from "./components/layout/Layout.jsx";
import AppRoutes from "./routes/AppRoutes.jsx";

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
