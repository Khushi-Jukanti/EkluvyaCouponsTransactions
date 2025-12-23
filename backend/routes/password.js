// routes/password.routes.js - COMPLETE FIXED VERSION
const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const mongoose = require("mongoose"); // Add mongoose import
const { agentDB } = require("../config/db.config");
const auth = require("../middleware/auth");
const sendOTP = require("../utils/sendOTP"); // Import your sendOTP function
const router = express.Router();

/**
 * SEND OTP for first login password change
 * Uses direct MongoDB update to bypass problematic pre-save hooks
 */
router.post("/first-login/send-otp", auth, async (req, res) => {
    console.log("\n=== FIRST LOGIN SEND OTP REQUEST ===");

    try {
        const userId = req.user.id;
        console.log("User ID:", userId);

        // Generate OTP
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        const otpExpiry = Date.now() + 5 * 60 * 1000;

        console.log("Generated OTP:", otp);

        // Use mongoose.Types.ObjectId for proper ObjectId conversion
        const agentId = new mongoose.Types.ObjectId(userId);

        // Use direct MongoDB update to avoid pre-save hooks
        const db = agentDB.db;
        const result = await db.collection("agents").updateOne(
            { _id: agentId },
            {
                $set: {
                    otp: otp,
                    otpExpiry: otpExpiry,
                    updatedAt: new Date()
                }
            }
        );

        console.log("Update result:", {
            matchedCount: result.matchedCount,
            modifiedCount: result.modifiedCount
        });

        if (result.matchedCount === 0) {
            return res.status(404).json({
                success: false,
                message: "Agent not found"
            });
        }

        // Get agent details for sending SMS
        const agent = await db.collection("agents").findOne({ _id: agentId });

        if (!agent) {
            return res.status(404).json({
                success: false,
                message: "Agent not found"
            });
        }

        console.log("OTP saved for agent:", agent.mobile);
        console.log("First login status:", agent.firstLogin);

        // IMPORTANT: Send OTP via SMS using SmartPing API
        try {
            console.log("Attempting to send OTP via SMS to:", agent.mobile);
            const smsResult = await sendOTP(agent.mobile, otp);
            console.log("SMS API Response:", smsResult);

            res.json({
                success: true,
                message: "OTP sent successfully to your registered mobile number",
                debug: process.env.NODE_ENV === 'development' ? {
                    otp, // Only show OTP in development
                    mobile: agent.mobile
                } : undefined
            });

        } catch (smsError) {
            console.error("❌ SMS sending failed:", smsError.message);

            // Even if SMS fails, return success but inform user
            res.json({
                success: true, // Still success because OTP is stored in DB
                message: "OTP generated. If not received via SMS, contact support.",
                debug: process.env.NODE_ENV === 'development' ? {
                    otp,
                    mobile: agent.mobile,
                    smsError: smsError.message
                } : undefined
            });
        }

    } catch (error) {
        console.error("First login OTP error:", error);
        res.status(500).json({
            success: false,
            message: "Server error while sending OTP"
        });
    }
});

/**
 * VERIFY OTP and set new password for first login
 * Uses direct MongoDB update to bypass problematic pre-save hooks
 */
router.post("/first-login/verify", auth, async (req, res) => {
    console.log("\n=== FIRST LOGIN VERIFY REQUEST ===");

    try {
        const { otp, newPassword } = req.body;
        const userId = req.user.id;

        console.log("Verifying OTP for user:", userId);

        if (!otp || !newPassword) {
            return res.status(400).json({
                success: false,
                message: "OTP and new password are required"
            });
        }

        if (newPassword.length < 6) {
            return res.status(400).json({
                success: false,
                message: "Password must be at least 6 characters long"
            });
        }

        // Get agent directly from MongoDB
        const db = agentDB.db;
        const agentId = new mongoose.Types.ObjectId(userId);
        const agent = await db.collection("agents").findOne({ _id: agentId });

        if (!agent) {
            return res.status(404).json({
                success: false,
                message: "Agent not found"
            });
        }

        console.log("Agent OTP check:", {
            storedOTP: agent.otp,
            enteredOTP: otp,
            otpValid: agent.otp === otp,
            otpExpired: agent.otpExpiry && agent.otpExpiry < Date.now(),
            currentTime: Date.now(),
            otpExpiryTime: agent.otpExpiry
        });

        // Verify OTP
        if (!agent.otp) {
            return res.status(400).json({
                success: false,
                message: "No OTP found. Please request a new OTP."
            });
        }

        if (agent.otp !== otp) {
            return res.status(400).json({
                success: false,
                message: "Invalid OTP. Please enter the correct OTP."
            });
        }

        if (!agent.otpExpiry || agent.otpExpiry < Date.now()) {
            return res.status(400).json({
                success: false,
                message: "OTP has expired. Please request a new OTP."
            });
        }

        // Hash the new password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(newPassword, salt);

        // Update agent directly in MongoDB
        const updateResult = await db.collection("agents").updateOne(
            { _id: agentId },
            {
                $set: {
                    password: hashedPassword,
                    firstLogin: false,
                    forcePasswordChange: false,
                    otp: null,
                    otpExpiry: null,
                    updatedAt: new Date()
                }
            }
        );

        console.log("Password update result:", updateResult);

        if (updateResult.modifiedCount === 0) {
            return res.status(500).json({
                success: false,
                message: "Failed to update password"
            });
        }

        res.json({
            success: true,
            message: "Password updated successfully. You can now login with your new password."
        });

    } catch (error) {
        console.error("First login verify error:", error);
        res.status(500).json({
            success: false,
            message: "Server error while updating password"
        });
    }
});

module.exports = router;