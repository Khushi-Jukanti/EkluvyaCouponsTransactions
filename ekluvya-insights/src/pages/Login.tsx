import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Eye, EyeOff } from "lucide-react";
import api from "@/lib/api";

const Login = () => {
    const navigate = useNavigate();

    const [usernameOrMobile, setUsernameOrMobile] = useState("");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    // Add this useEffect to your Login.tsx
    useEffect(() => {
        // Check if user is already logged in
        const token = localStorage.getItem("token");
        const role = localStorage.getItem("role");

        if (token && role) {
            // If already logged in, redirect to appropriate dashboard
            if (role === "admin") {
                navigate("/admin/dashboard", { replace: true });
            } else {
                navigate("/agent/dashboard", { replace: true });
            }
        }

        // Clear any cached data
        localStorage.removeItem("token");
        localStorage.removeItem("role");
        localStorage.removeItem("userName");

        // Prevent back navigation after logout
        window.history.pushState(null, "", window.location.href);
        window.onpopstate = function () {
            window.history.go(1);
        };
    }, [navigate]);

    const handleLogin = async () => {
        setLoading(true);
        try {
            // Clean input
            const cleanedInput = usernameOrMobile.trim();

            // Check if input looks like email (for admin) or mobile (for agent)
            const isEmail = cleanedInput.includes('@');

            if (!isEmail) {
                // Try agent login first (mobile + password/coupon)
                console.log("Trying agent login (mobile format)");
                try {
                    const agentPayload = {
                        mobile: cleanedInput,
                        password: password,
                        couponCode: password
                    };

                    console.log("Agent login payload:", agentPayload);

                    const { data: agentData } = await api.post("/auth/agent/login", agentPayload);
                    console.log("Agent login successful:", agentData);

                    localStorage.setItem("token", agentData.token);
                    localStorage.setItem("role", agentData.role);

                    if (agentData.forcePasswordChange) {
                        navigate("/change-password");
                    } else {
                        navigate("/agent/dashboard");
                    }
                    return;
                } catch (agentError: any) {
                    console.log("Agent login failed:", agentError.response?.data?.message || agentError.message);
                    // Continue to try admin login
                }
            }

            // Try admin login (email/username + password)
            console.log("Trying admin login");
            try {
                const adminPayload = {
                    username: cleanedInput,
                    password
                };

                console.log("Admin login payload:", adminPayload);

                const { data: adminData } = await api.post("/auth/admin/login", adminPayload);
                console.log("Admin login successful:", adminData);

                localStorage.setItem("token", adminData.token);
                localStorage.setItem("role", adminData.role);

                if (adminData.forcePasswordChange) {
                    navigate("/change-password");
                } else {
                    navigate("/admin/dashboard");
                }
                return;
            } catch (adminError: any) {
                console.log("Admin login failed:", adminError.response?.data?.message || adminError.message);

                // Show appropriate error message
                if (adminError.response?.status === 401) {
                    throw new Error("Invalid username/email or password");
                } else {
                    throw new Error("Login failed. Please check your credentials.");
                }
            }

        } catch (err: any) {
            alert(err.message || "Login failed. Please check your credentials.");
        } finally {
            setLoading(false);
        }
    };

    // Handle Enter key press
    const handleKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === "Enter" && usernameOrMobile && password && !loading) {
            handleLogin();
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center px-4">
            <Card className="w-full max-w-md p-8 bg-background/70 backdrop-blur-xl border border-white/10 shadow-2xl rounded-2xl">
                {/* LOGO */}
                <div className="flex flex-col items-center mb-8">
                    <img src="/favicon.png" className="h-16 mb-3" alt="Ekluvya Logo" />
                    <h1 className="text-2xl font-bold tracking-wide">Ekluvya Portal</h1>
                    <p className="text-sm text-muted-foreground mt-1">
                        Secure Login Access
                    </p>
                </div>

                {/* FORM */}
                <div className="space-y-5">
                    {/* Username/Mobile Field */}
                    <div className="space-y-2">
                        <Input
                            placeholder="Enter mobile number or email"
                            value={usernameOrMobile}
                            onChange={(e) => setUsernameOrMobile(e.target.value)}
                            onKeyPress={handleKeyPress}
                            className="h-11"
                        />
                    </div>

                    {/* Password Field */}
                    <div className="space-y-2">
                        <div className="relative">
                            <Input
                                placeholder="Enter your password"
                                type={showPassword ? "text" : "password"}
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                onKeyPress={handleKeyPress}
                                className="h-11 pr-10"
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                            >
                                {showPassword ? (
                                    <EyeOff className="h-4 w-4" />
                                ) : (
                                    <Eye className="h-4 w-4" />
                                )}
                            </button>
                        </div>
                    </div>
                </div>

                {/* LOGIN BUTTON */}
                <Button
                    onClick={handleLogin}
                    disabled={loading || !usernameOrMobile || !password}
                    className="mt-6 h-10 rounded-xl text-base font-semibold w-full text-white"
                >
                    {loading ? "Signing in..." : "Login"}
                </Button>

                {/* FORGOT PASSWORD LINK */}
                <div className="text-center mt-5">
                    <button
                        onClick={() => navigate("/forgot-password")}
                        className="text-sm text-primary hover:underline"
                    >
                        Forgot Password?
                    </button>
                </div>

                {/* FOOTER */}
                <div className="mt-8 pt-5 border-t border-border">
                    <p className="text-center text-xs text-muted-foreground">
                        © {new Date().getFullYear()} Ekluvya • Secure Access
                    </p>
                    <p className="text-center text-xs text-muted-foreground mt-1">
                        v1.0.0 • All rights reserved
                    </p>
                </div>
            </Card>
        </div>
    );
};

export default Login;