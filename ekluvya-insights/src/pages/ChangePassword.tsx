import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
    Loader2,
    Lock,
    ShieldCheck,
    Eye,
    EyeOff,
    ArrowLeft,
    CheckCircle2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import api from "@/lib/api";

const ChangePassword = () => {
    const navigate = useNavigate();

    const [otp, setOtp] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    const [loading, setLoading] = useState({
        sendOtp: false,
        verify: false
    });
    const [message, setMessage] = useState({ type: "", text: "" });
    const [otpSent, setOtpSent] = useState(false);
    const [countdown, setCountdown] = useState(0);

    // Send OTP on component mount
    useEffect(() => {
        sendOtp();
    }, []);

    // Handle countdown timer
    useEffect(() => {
        let timer: NodeJS.Timeout;

        if (countdown > 0) {
            timer = setTimeout(() => setCountdown(countdown - 1), 1000);
        }

        return () => {
            if (timer) clearTimeout(timer);
        };
    }, [countdown]);

    const sendOtp = async () => {
        setLoading(prev => ({ ...prev, sendOtp: true }));
        setMessage({ type: "", text: "" });

        try {
            const response = await api.post("/password/first-login/send-otp");

            if (response.data.success) {
                // Check if we have debug OTP (for development)
                const debugOtp = response.data.debug?.otp;

                let messageText = response.data.message;

                if (debugOtp && process.env.NODE_ENV === 'development') {
                    messageText += ` [Dev OTP: ${debugOtp}]`;
                    console.log(`📱 Development OTP: ${debugOtp}`);
                }

                setMessage({ type: "success", text: messageText });
                setOtpSent(true);
                setCountdown(30);
            } else {
                setMessage({ type: "error", text: response.data.message });
            }
        } catch (err: any) {
            const errorMessage = err.response?.data?.message || "Failed to send OTP";
            setMessage({ type: "error", text: errorMessage });
        } finally {
            setLoading(prev => ({ ...prev, sendOtp: false }));
        }
    };

    const handleResendOtp = () => {
        if (countdown === 0) {
            sendOtp();
        }
    };

    const handleSubmit = async () => {
        // Validation
        if (!otp || otp.length !== 6) {
            setMessage({ type: "error", text: "Please enter a valid 6-digit OTP" });
            return;
        }

        if (!password || password.length < 6) {
            setMessage({ type: "error", text: "Password must be at least 6 characters long" });
            return;
        }

        if (password !== confirmPassword) {
            setMessage({ type: "error", text: "Passwords do not match" });
            return;
        }

        // Check password strength (optional)
        const hasUpperCase = /[A-Z]/.test(password);
        const hasLowerCase = /[a-z]/.test(password);
        const hasNumbers = /\d/.test(password);
        const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);

        if (!hasUpperCase || !hasLowerCase || !hasNumbers) {
            setMessage({
                type: "error",
                text: "Password must contain uppercase, lowercase letters, and numbers"
            });
            return;
        }

        setLoading(prev => ({ ...prev, verify: true }));
        setMessage({ type: "", text: "" });

        try {
            const response = await api.post("/password/first-login/verify", {
                otp,
                newPassword: password,
            });

            if (response.data.success) {
                setMessage({
                    type: "success",
                    text: "Password changed successfully! Redirecting to dashboard..."
                });

                // Store success in localStorage to show confirmation
                localStorage.setItem("passwordChanged", "true");

                // Redirect to dashboard after 2 seconds
                setTimeout(() => {
                    navigate("/agent/dashboard", { replace: true });
                }, 2000);
            } else {
                setMessage({
                    type: "error",
                    text: response.data.message || "Failed to update password"
                });
            }
        } catch (err: any) {
            const errorMessage = err.response?.data?.message || "Failed to update password";
            setMessage({ type: "error", text: errorMessage });

            // Clear OTP on invalid attempt
            if (err.response?.status === 400) {
                setOtp("");
            }
        } finally {
            setLoading(prev => ({ ...prev, verify: false }));
        }
    };

    const handleBackToLogin = () => {
        navigate("/login");
    };

    return (
        <div className="min-h-screen flex flex-col items-center justify-center p-4">
            {/* Back Button */}
            <Button
                variant="ghost"
                onClick={handleBackToLogin}
                className="absolute top-6 left-6"
            >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Login
            </Button>

            <Card className="w-full max-w-md p-8 bg-white/95 dark:bg-gray-900/95 backdrop-blur-sm border shadow-2xl">
                {/* Header */}
                <div className="flex flex-col items-center mb-8">
                    <div className="relative mb-4">
                        <div className="h-20 w-20 rounded-full bg-primary/10 flex items-center justify-center">
                            <ShieldCheck className="h-10 w-10 text-primary" />
                        </div>
                        <div className="absolute -top-2 -right-2 h-10 w-10 rounded-full bg-green-500/20 flex items-center justify-center">
                            <Lock className="h-5 w-5 text-green-500" />
                        </div>
                    </div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                        Set Your Password
                    </h1>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-2 text-center">
                        {otpSent
                            ? "Enter the OTP sent to your mobile number and set a new password"
                            : "Securing your account with a new password"
                        }
                    </p>
                </div>

                {/* Messages */}
                {message.text && (
                    <Alert className={`mb-6 ${message.type === "error" ? "border-red-200 bg-red-50 dark:bg-red-900/20" : "border-green-200 bg-green-50 dark:bg-green-900/20"}`}>
                        <AlertDescription className={`text-sm ${message.type === "error" ? "text-red-700 dark:text-red-300" : "text-green-700 dark:text-green-300"}`}>
                            {message.text}
                        </AlertDescription>
                    </Alert>
                )}

                {/* OTP Section */}
                <div className="space-y-6">
                    <div className="space-y-4">
                        <div className="flex justify-between items-center">
                            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                OTP Verification
                            </label>
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={handleResendOtp}
                                disabled={countdown > 0 || loading.sendOtp}
                                className="text-xs"
                            >
                                {loading.sendOtp ? (
                                    <>
                                        <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                                        Sending...
                                    </>
                                ) : countdown > 0 ? (
                                    `Resend in ${countdown}s`
                                ) : (
                                    "Resend OTP"
                                )}
                            </Button>
                        </div>

                        <Input
                            placeholder="Enter 6-digit OTP"
                            value={otp}
                            onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                            className="text-center text-xl tracking-widest font-mono h-12"
                            maxLength={6}
                        />

                        {!otpSent && (
                            <div className="text-xs text-gray-500 dark:text-gray-400 flex items-center">
                                <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                                Sending OTP to your mobile...
                            </div>
                        )}
                    </div>

                    {/* Password Section */}
                    <div className="space-y-4">
                        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                            New Password
                        </label>

                        <div className="relative">
                            <Input
                                type={showPassword ? "text" : "password"}
                                placeholder="Enter new password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="h-12 pr-10"
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                            >
                                {showPassword ? (
                                    <EyeOff className="h-5 w-5" />
                                ) : (
                                    <Eye className="h-5 w-5" />
                                )}
                            </button>
                        </div>

                        <div className="relative">
                            <Input
                                type={showConfirmPassword ? "text" : "password"}
                                placeholder="Confirm new password"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                className="h-12 pr-10"
                            />
                            <button
                                type="button"
                                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                            >
                                {showConfirmPassword ? (
                                    <EyeOff className="h-5 w-5" />
                                ) : (
                                    <Eye className="h-5 w-5" />
                                )}
                            </button>
                        </div>

                        {/* Password Strength Indicator */}
                        {password.length > 0 && (
                            <div className="space-y-2">
                                <div className="text-xs text-gray-600 dark:text-gray-400">
                                    Password strength:
                                </div>
                                <div className="flex space-x-1">
                                    {[
                                        password.length >= 8,
                                        /[A-Z]/.test(password),
                                        /[a-z]/.test(password),
                                        /\d/.test(password),
                                        /[!@#$%^&*(),.?":{}|<>]/.test(password)
                                    ].map((condition, index) => (
                                        <div
                                            key={index}
                                            className={`h-1 flex-1 rounded-full ${condition ? "bg-green-500" : "bg-gray-200"}`}
                                        />
                                    ))}
                                </div>
                                <ul className="text-xs text-gray-500 dark:text-gray-400 space-y-1">
                                    <li className={`flex items-center ${password.length >= 8 ? "text-green-600" : ""}`}>
                                        <CheckCircle2 className="mr-1 h-3 w-3" />
                                        At least 8 characters
                                    </li>
                                    <li className={`flex items-center {/[A-Z]/.test(password) ? "text-green-600" : ""}`}>
                                        <CheckCircle2 className="mr-1 h-3 w-3" />
                                        Uppercase letter
                                    </li>
                                    <li className={`flex items-center {/\d/.test(password) ? "text-green-600" : ""}`}>
                                        <CheckCircle2 className="mr-1 h-3 w-3" />
                                        Number
                                    </li>
                                </ul>
                            </div>
                        )}
                    </div>

                    {/* Submit Button */}
                    <Button
                        onClick={handleSubmit}
                        disabled={loading.verify || !otp || !password || !confirmPassword}
                        className="w-full h-12 text-base font-semibold"
                    >
                        {loading.verify ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Updating Password...
                            </>
                        ) : (
                            "Set New Password"
                        )}
                    </Button>

                    {/* Help Text */}
                    <div className="text-center text-xs text-gray-500 dark:text-gray-400 pt-4 border-t">
                        <p>
                            This is your first login. You must set a password to continue.
                        </p>
                        <p className="mt-1">
                            Contact support if you don't receive the OTP within 2 minutes.
                        </p>
                    </div>
                </div>
            </Card>

            {/* Footer */}
            <div className="mt-8 text-center">
                <p className="text-xs text-gray-500 dark:text-gray-400">
                    © {new Date().getFullYear()} Ekluvya • Secure Password Setup
                </p>
            </div>
        </div>
    );
};

export default ChangePassword;