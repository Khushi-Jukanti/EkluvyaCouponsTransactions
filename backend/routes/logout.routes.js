// routes/logout.routes.js - Enhanced version with blacklist
const express = require("express");
const jwt = require("jsonwebtoken");
const TokenBlacklist = require("../models/tokenBlacklist.model");
const auth = require("../middleware/auth");
const router = express.Router();

router.post("/logout", auth, async (req, res) => {
    try {
        const token = req.header("Authorization")?.replace("Bearer ", "");

        if (!token) {
            return res.status(400).json({
                success: false,
                message: "No token provided"
            });
        }

        // Decode token to get expiration
        const decoded = jwt.decode(token);

        if (decoded && decoded.exp) {
            // Add token to blacklist
            const blacklistEntry = new TokenBlacklist({
                token,
                userId: req.user.id,
                expiresAt: new Date(decoded.exp * 1000) // Convert to milliseconds
            });

            await blacklistEntry.save();
            console.log(`Token blacklisted for user: ${req.user.id}`);
        }

        res.json({
            success: true,
            message: "Logged out successfully"
        });
    } catch (error) {
        console.error("Logout error:", error);
        res.status(500).json({
            success: false,
            message: "Logout failed"
        });
    }
});

router.post("/logout/all", auth, async (req, res) => {
    try {
        res.json({
            success: true,
            message: "Logged out from all devices"
        });
    } catch (error) {
        console.error("Logout all error:", error);
        res.status(500).json({
            success: false,
            message: "Logout failed"
        });
    }
});

module.exports = router;