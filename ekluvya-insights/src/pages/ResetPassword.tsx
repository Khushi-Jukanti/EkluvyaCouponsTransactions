import { useLocation, useNavigate } from "react-router-dom";
import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Eye, EyeOff } from "lucide-react";
import api from "@/lib/api";

const ResetPassword = () => {
    const navigate = useNavigate();
    const { state } = useLocation();
    const mobile = state?.mobile;

    const [password, setPassword] = useState("");
    const [confirm, setConfirm] = useState("");
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);

    if (!mobile) navigate("/login");

    const resetPassword = async () => {
        if (password !== confirm) {
            return alert("Passwords do not match");
        }

        if (password.length < 6) {
            return alert("Password must be at least 6 characters long");
        }

        try {
            setLoading(true);
            await api.post("/agent/forgot-password/reset", {
                mobile,
                newPassword: password,
            });
            alert("Password reset successful");
            navigate("/login");
        } catch (err: any) {
            alert(err?.response?.data?.message || "Reset failed");
        } finally {
            setLoading(false);
        }
    };

    const handleKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === "Enter" && password && confirm && !loading) {
            resetPassword();
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center px-4 bg-background">
            <Card className="w-full max-w-md p-8 rounded-2xl border-border shadow-xl">
                <div className="flex flex-col items-center mb-6">
                    <img src="/favicon.png" className="h-12 mb-3" alt="Logo" />
                    <h2 className="text-2xl font-bold text-center">
                        Reset Password
                    </h2>
                    <p className="text-sm text-muted-foreground mt-1">
                        Enter your new password
                    </p>
                </div>

                {/* Mobile display (read-only) */}
                <div className="mb-6 p-3 bg-muted/30 rounded-lg">
                    <p className="text-xs text-muted-foreground">Mobile Number</p>
                    <p className="text-sm font-medium">{mobile}</p>
                </div>

                <div className="space-y-4">
                    {/* New Password Field */}
                    <div className="space-y-2">
                        <label className="text-sm font-medium">New Password</label>
                        <div className="relative">
                            <Input
                                placeholder="Enter new password"
                                type={showPassword ? "text" : "password"}
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                onKeyPress={handleKeyPress}
                                className="h-11 pr-10"
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground"
                                title={showPassword ? "Hide password" : "Show password"}
                            >
                                {showPassword ? (
                                    <EyeOff className="h-4 w-4" />
                                ) : (
                                    <Eye className="h-4 w-4" />
                                )}
                            </button>
                        </div>
                        {password.length > 0 && password.length < 6 && (
                            <p className="text-xs text-amber-600">
                                Password must be at least 6 characters
                            </p>
                        )}
                    </div>

                    {/* Confirm Password Field */}
                    <div className="space-y-2">
                        <label className="text-sm font-medium">Confirm Password</label>
                        <div className="relative">
                            <Input
                                placeholder="Confirm new password"
                                type={showConfirm ? "text" : "password"}
                                value={confirm}
                                onChange={(e) => setConfirm(e.target.value)}
                                onKeyPress={handleKeyPress}
                                className="h-11 pr-10"
                            />
                            <button
                                type="button"
                                onClick={() => setShowConfirm(!showConfirm)}
                                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground"
                                title={showConfirm ? "Hide password" : "Show password"}
                            >
                                {showConfirm ? (
                                    <EyeOff className="h-4 w-4" />
                                ) : (
                                    <Eye className="h-4 w-4" />
                                )}
                            </button>
                        </div>
                        {confirm.length > 0 && password !== confirm && (
                            <p className="text-xs text-red-600">
                                Passwords do not match
                            </p>
                        )}
                        {confirm.length > 0 && password === confirm && (
                            <p className="text-xs text-green-600">
                                Passwords match ✓
                            </p>
                        )}
                    </div>
                </div>

                {/* Action Buttons */}
                <div className="mt-8 space-y-3">
                    <Button
                        onClick={resetPassword}
                        disabled={loading || !password || !confirm || password !== confirm || password.length < 6}
                        className="w-full h-11 text-base font-medium"
                    >
                        {loading ? (
                            <>
                                <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                                Resetting Password...
                            </>
                        ) : "Reset Password"}
                    </Button>

                    <Button
                        variant="outline"
                        onClick={() => navigate("/login")}
                        className="w-full h-11"
                    >
                        Back to Login
                    </Button>
                </div>

                {/* Password Requirements */}
                <div className="mt-6 p-4 bg-muted/30 rounded-lg">
                    <p className="text-sm font-medium mb-2">Password Requirements:</p>
                    <ul className="text-xs text-muted-foreground space-y-1">
                        <li className={`flex items-center ${password.length >= 6 ? 'text-green-600' : ''}`}>
                            {password.length >= 6 ? '✓' : '•'} At least 6 characters
                        </li>
                        <li className={`flex items-center ${password === confirm && confirm.length > 0 ? 'text-green-600' : ''}`}>
                            {password === confirm && confirm.length > 0 ? '✓' : '•'} Passwords must match
                        </li>
                    </ul>
                </div>
            </Card>
        </div>
    );
};

export default ResetPassword;