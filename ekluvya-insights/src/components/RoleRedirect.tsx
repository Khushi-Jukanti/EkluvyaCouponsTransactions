import { Navigate } from "react-router-dom";
import { getUserRole } from "@/lib/auth";

const RoleRedirect = () => {
  const role = getUserRole();

  if (!role) return <Navigate to="/login" replace />;
  if (role === "admin") return <Navigate to="/" replace />;
  if (role === "agent") return <Navigate to="/agent/dashboard" replace />;

  return <Navigate to="/login" replace />;
};

export default RoleRedirect;
