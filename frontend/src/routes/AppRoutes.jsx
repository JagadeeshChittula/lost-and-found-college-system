import { Route, Routes, useLocation } from "react-router-dom";
import Admin from "../pages/admin/Admin.jsx";
import AuthForm from "../pages/AuthForm.jsx";
import Home from "../pages/Home.jsx";
import ItemForm from "../pages/ItemForm.jsx";
import ItemsPage from "../pages/ItemsPage.jsx";

export default function AppRoutes({ user, setUser }) {
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
