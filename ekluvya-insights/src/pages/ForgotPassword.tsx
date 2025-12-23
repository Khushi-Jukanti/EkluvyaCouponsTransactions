import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import api from "@/lib/api";

const ForgotPassword = () => {
    const navigate = useNavigate();
    const [step, setStep] = useState(1); // 1: Send OTP, 2: Verify OTP, 3: Reset Password
    const [mobile, setMobile] = useState("");
    const [otp, setOtp] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState("");
    const [error, setError] = useState("");

    // Step 1: Send OTP
    const handleSendOTP = async () => {
        if (!mobile || mobile.length !== 10) {
            setError("Please enter a valid 10-digit mobile number");
            return;
        }

        setLoading(true);
        setError("");
        setMessage("");

        try {
            const response = await api.post("/auth/agent/forgot-password/send-otp", { mobile });

            if (response.data.success) {
                setMessage(response.data.message);
                setStep(2); // Move to OTP verification step
            } else {
                setError(response.data.message || "Failed to send OTP");
            }
        } catch (err: any) {
            setError(err.response?.data?.message || "Failed to send OTP. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    // Step 2: Verify OTP
    const handleVerifyOTP = async () => {
        if (!otp || otp.length !== 6) {
            setError("Please enter a valid 6-digit OTP");
            return;
        }

        setLoading(true);
        setError("");
        setMessage("");

        try {
            const response = await api.post("/auth/agent/forgot-password/verify-otp", {
                mobile,
                otp
            });

            if (response.data.success) {
                setMessage("OTP verified successfully");
                setStep(3); // Move to password reset step
            } else {
                setError(response.data.message || "Invalid OTP");
            }
        } catch (err: any) {
            setError(err.response?.data?.message || "Failed to verify OTP");
        } finally {
            setLoading(false);
        }
    };

    // Step 3: Reset Password
    const handleResetPassword = async () => {
        if (!newPassword || newPassword.length < 6) {
            setError("Password must be at least 6 characters long");
            return;
        }

        if (newPassword !== confirmPassword) {
            setError("Passwords do not match");
            return;
        }

        setLoading(true);
        setError("");
        setMessage("");

        try {
            const response = await api.post("/auth/agent/forgot-password/reset", {
                mobile,
                otp,
                newPassword
            });

            if (response.data.success) {
                setMessage("Password reset successful! You can now login with your new password.");

                // Redirect to login after 3 seconds
                setTimeout(() => {
                    navigate("/login");
                }, 3000);
            } else {
                setError(response.data.message || "Failed to reset password");
            }
        } catch (err: any) {
            setError(err.response?.data?.message || "Failed to reset password");
        } finally {
            setLoading(false);
        }
    };

    // Resend OTP
    const handleResendOTP = async () => {
        setLoading(true);
        setError("");
        setMessage("");

        try {
            const response = await api.post("/auth/agent/forgot-password/send-otp", { mobile });

            if (response.data.success) {
                setMessage("New OTP sent successfully");
            } else {
                setError(response.data.message || "Failed to resend OTP");
            }
        } catch (err: any) {
            setError(err.response?.data?.message || "Failed to resend OTP");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center px-4">
            <Card className="w-full max-w-md p-8">
                <div className="flex flex-col items-center mb-8">
                    <img src="/favicon.png" className="h-16 mb-3" alt="Ekluvya Logo" />
                    <h1 className="text-2xl font-bold">Forgot Password</h1>
                    <p className="text-sm text-muted-foreground mt-1">
                        {step === 1 && "Enter your registered mobile number"}
                        {step === 2 && "Enter the OTP sent to your mobile"}
                        {step === 3 && "Set your new password"}
                    </p>
                </div>

                {/* Error Message */}
                {error && (
                    <div className="mb-4 p-3 bg-destructive/10 border border-destructive/30 rounded-lg">
                        <p className="text-sm text-destructive">{error}</p>
                    </div>
                )}

                {/* Success Message */}
                {message && (
                    <div className="mb-4 p-3 bg-green-500/10 border border-green-500/30 rounded-lg">
                        <p className="text-sm text-green-700">{message}</p>
                    </div>
                )}

                {/* Step 1: Enter Mobile */}
                {step === 1 && (
                    <div className="space-y-4">
                        <div>
                            <label className="text-sm font-medium">Mobile Number</label>
                            <Input
                                placeholder="Enter your 10-digit mobile number"
                                value={mobile}
                                onChange={(e) => setMobile(e.target.value.replace(/\D/g, '').slice(0, 10))}
                                className="mt-1"
                                maxLength={10}
                            />
                        </div>

                        <Button
                            onClick={handleSendOTP}
                            disabled={loading || mobile.length !== 10}
                            className="w-full"
                        >
                            {loading ? "Sending OTP..." : "Send OTP"}
                        </Button>

                        <div className="text-center">
                            <button
                                onClick={() => navigate("/login")}
                                className="text-sm text-primary hover:underline"
                            >
                                Back to Login
                            </button>
                        </div>
                    </div>
                )}

                {/* Step 2: Enter OTP */}
                {step === 2 && (
                    <div className="space-y-4">
                        <div>
                            <p className="text-sm text-muted-foreground mb-2">
                                OTP sent to: <span className="font-medium">******{mobile.slice(-4)}</span>
                            </p>
                            <label className="text-sm font-medium">OTP</label>
                            <Input
                                placeholder="Enter 6-digit OTP"
                                value={otp}
                                onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                                className="mt-1 text-center text-xl tracking-widest"
                                maxLength={6}
                            />
                        </div>

                        <Button
                            onClick={handleVerifyOTP}
                            disabled={loading || otp.length !== 6}
                            className="w-full"
                        >
                            {loading ? "Verifying..." : "Verify OTP"}
                        </Button>

                        <div className="flex justify-between">
                            <button
                                onClick={() => setStep(1)}
                                className="text-sm text-primary hover:underline"
                            >
                                Change Mobile Number
                            </button>
                            <button
                                onClick={handleResendOTP}
                                disabled={loading}
                                className="text-sm text-primary hover:underline"
                            >
                                Resend OTP
                            </button>
                        </div>
                    </div>
                )}

                {/* Step 3: Reset Password */}
                {step === 3 && (
                    <div className="space-y-4">
                        <div>
                            <label className="text-sm font-medium">New Password</label>
                            <Input
                                type="password"
                                placeholder="Enter new password"
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                className="mt-1"
                            />
                        </div>

                        <div>
                            <label className="text-sm font-medium">Confirm Password</label>
                            <Input
                                type="password"
                                placeholder="Confirm new password"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                className="mt-1"
                            />
                        </div>

                        <Button
                            onClick={handleResetPassword}
                            disabled={loading || !newPassword || !confirmPassword}
                            className="w-full"
                        >
                            {loading ? "Resetting Password..." : "Reset Password"}
                        </Button>

                        <div className="text-center">
                            <button
                                onClick={() => setStep(2)}
                                className="text-sm text-primary hover:underline"
                            >
                                Back to OTP
                            </button>
                        </div>
                    </div>
                )}
            </Card>
        </div>
    );
};

export default ForgotPassword;