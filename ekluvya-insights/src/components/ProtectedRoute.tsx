// components/ProtectedRoute.tsx
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2 } from "lucide-react";

interface ProtectedRouteProps {
    children: React.ReactNode;
    role?: "admin" | "agent" | "accountant" | ("admin" | "agent" | "accountant")[];
    allowedRoles?: ("admin" | "agent" | "accountant")[];
}

const ProtectedRoute = ({
    children,
    role,
    allowedRoles = role ? (Array.isArray(role) ? role : [role]) : undefined
}: ProtectedRouteProps) => {
    const navigate = useNavigate();
    const [isChecking, setIsChecking] = useState(true);

    useEffect(() => {
        console.log("🔒 ProtectedRoute - Checking authentication...");

        const token = localStorage.getItem("token");
        const userRole = localStorage.getItem("role") as "admin" | "agent" | "accountant" | null;

        console.log("Token exists:", !!token);
        console.log("User role from localStorage:", userRole);
        console.log("Allowed roles:", allowedRoles);

        if (!token || !userRole) {
            console.log("❌ No token or role, redirecting to login");
            localStorage.removeItem("token");
            localStorage.removeItem("role");
            localStorage.removeItem("userName");
            navigate("/login", { replace: true });
            return;
        }

        // Check if role is allowed
        if (allowedRoles && allowedRoles.length > 0) {
            console.log("Checking role permissions...");
            console.log("User role:", userRole);
            console.log("Allowed roles:", allowedRoles);

            if (!allowedRoles.includes(userRole)) {
                console.log(`❌ Access denied. Role ${userRole} not in allowed roles:`, allowedRoles);

                // Redirect to appropriate dashboard based on role
                if (userRole === "admin" || userRole === "accountant") {
                    console.log("Redirecting to admin dashboard");
                    navigate("/admin/dashboard", { replace: true });
                } else if (userRole === "agent") {
                    console.log("Redirecting to agent dashboard");
                    navigate("/agent/dashboard", { replace: true });
                } else {
                    console.log("Unknown role, redirecting to login");
                    navigate("/login", { replace: true });
                }
                return;
            }

            console.log("✅ Role check passed!");
        }

        console.log("✅ Authentication successful!");
        setIsChecking(false);

        // Cleanup function
        return () => {
            console.log("ProtectedRoute cleanup");
        };
    }, [navigate, allowedRoles]);

    // Show loading while checking
    if (isChecking) {
        console.log("⏳ Showing loading spinner...");
        return (
            <div className="flex min-h-screen items-center justify-center bg-background">
                <div className="text-center">
                    <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
                    <p className="text-sm text-muted-foreground">Verifying access permissions...</p>
                    <p className="text-xs text-muted-foreground mt-2">
                        Role: {localStorage.getItem("role") || "Unknown"}
                    </p>
                </div>
            </div>
        );
    }

    console.log("✅ Rendering protected content");
    return <>{children}</>;
};

export default ProtectedRoute;