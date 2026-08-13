import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import Login from "./routes/auth/Login";
import LoginSuccess from "./routes/auth/LoginSuccess";

/**
 * Issue 1 routing — login + the DoD proof screen. Issue 2 replaces the
 * catch-all with role-gated portal routing driven by the decoded JWT role.
 */
export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/login/success" element={<LoginSuccess />} />
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
