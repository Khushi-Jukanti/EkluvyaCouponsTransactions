import { useLocation, useNavigate } from "react-router-dom";
import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import api from "@/lib/api";

const VerifyOtp = () => {
    const navigate = useNavigate();
    const { state } = useLocation();
    const mobile = state?.mobile;

    const [otp, setOtp] = useState("");
    const [loading, setLoading] = useState(false);

    if (!mobile) navigate("/login");

    const verifyOtp = async () => {
        try {
            setLoading(true);
            await api.post("/agent/forgot-password/verify-otp", {
                mobile,
                otp,
            });
            navigate("/reset-password", { state: { mobile } });
        } catch (err: any) {
            alert(err?.response?.data?.message || "Invalid OTP");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center px-4">
            <Card className="w-full max-w-md p-8 rounded-2xl">
                <h2 className="text-xl font-bold text-center mb-6">
                    Verify OTP
                </h2>

                <Input
                    placeholder="Enter OTP"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value)}
                />

                <Button
                    className="w-full mt-6"
                    onClick={verifyOtp}
                    disabled={loading}
                >
                    {loading ? "Verifying..." : "Verify OTP"}
                </Button>
            </Card>
        </div>
    );
};

export default VerifyOtp;
