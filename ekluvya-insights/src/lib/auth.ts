import { jwtDecode } from "jwt-decode";

interface DecodedToken {
  role: "admin" | "agent";
  exp: number;
}

export const getUserRole = (): "admin" | "agent" | null => {
  const token = localStorage.getItem("token");
  if (!token) return null;

  try {
    const decoded = jwtDecode<DecodedToken>(token);
    return decoded.role;
  } catch {
    return null;
  }
};

export const isAuthenticated = () => {
  return !!getUserRole();
};
