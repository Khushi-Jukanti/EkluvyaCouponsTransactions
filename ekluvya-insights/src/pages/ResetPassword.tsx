import { useLocation, useNavigate } from "react-router-dom";
import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import api from "@/lib/api";

const ResetPassword = () => {
    const navigate = useNavigate();
    const { state } = useLocation();
    const mobile = state?.mobile;

    const [password, setPassword] = useState("");
    const [confirm, setConfirm] = useState("");
    const [loading, setLoading] = useState(false);

    if (!mobile) navigate("/login");

    const resetPassword = async () => {
        if (password !== confirm) {
            return alert("Passwords do not match");
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

    return (
        <div className="min-h-screen flex items-center justify-center px-4">
            <Card className="w-full max-w-md p-8 rounded-2xl">
                <h2 className="text-xl font-bold text-center mb-6">
                    Reset Password
                </h2>

                <Input
                    placeholder="New Password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                />

                <Input
                    className="mt-4"
                    placeholder="Confirm Password"
                    type="password"
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                />

                <Button
                    className="w-full mt-6"
                    onClick={resetPassword}
                    disabled={loading}
                >
                    {loading ? "Resetting..." : "Reset Password"}
                </Button>
            </Card>
        </div>
    );
};

export default ResetPassword;
