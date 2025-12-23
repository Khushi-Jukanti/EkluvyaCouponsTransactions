// components/ProtectedRoute.tsx
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2 } from "lucide-react";

interface ProtectedRouteProps {
    children: React.ReactNode;
    role?: "admin" | "agent";
}

const ProtectedRoute = ({ children, role }: ProtectedRouteProps) => {
    const navigate = useNavigate();

    useEffect(() => {
        const token = localStorage.getItem("token");
        const userRole = localStorage.getItem("role");

        // Prevent back button navigation after logout
        const handleBackButton = () => {
            if (!token || !userRole) {
                navigate("/login", { replace: true });
            }
        };

        window.addEventListener("popstate", handleBackButton);

        if (!token || !userRole) {
            navigate("/login", { replace: true });
            return;
        }

        // Check role if specified
        if (role && userRole !== role) {
            // Redirect to appropriate dashboard based on role
            if (userRole === "admin") {
                navigate("/admin/dashboard", { replace: true });
            } else if (userRole === "agent") {
                navigate("/agent/dashboard", { replace: true });
            }
            return;
        }

        return () => {
            window.removeEventListener("popstate", handleBackButton);
        };
    }, [navigate, role]);

    // Check token on every render
    const token = localStorage.getItem("token");
    const userRole = localStorage.getItem("role");

    if (!token || !userRole) {
        return (
            <div className="flex min-h-screen items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin" />
            </div>
        );
    }

    if (role && userRole !== role) {
        return (
            <div className="flex min-h-screen items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin" />
            </div>
        );
    }

    return <>{children}</>;
};

export default ProtectedRoute;