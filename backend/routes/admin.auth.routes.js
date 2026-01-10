// admin.auth.routes.js - FINAL FIXED VERSION
const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const Agent = require("../models/agent");
const router = express.Router();

// Admin/Accountant login - POST /api/auth/admin/login
router.post("/login", async (req, res) => {
  console.log("\n=== ADMIN/ACCOUNTANT LOGIN REQUEST ===");
  console.log("Request body:", req.body);

  try {
    const { username, password } = req.body;

    if (!username || !password) {
      console.log("❌ Missing username or password");
      return res.status(400).json({
        success: false,
        message: "Username and password are required"
      });
    }

    console.log("Looking for user with email:", username);

    // Find user by email
    const user = await Agent.findOne({
      email: username
    });

    console.log("Query result:", user ? "Found" : "Not found");

    if (!user) {
      console.log("❌ No user found with email:", username);
      return res.status(401).json({
        success: false,
        message: "Invalid email or password"
      });
    }

    console.log("\n✅ User found in database:");
    console.log("ID:", user._id);
    console.log("Name:", user.name);
    console.log("Email:", user.email);
    console.log("Database Role:", user.role);  // This should show "accountant" for accountant
    console.log("Has password field:", !!user.password);

    // Check if user has admin OR accountant role
    if (user.role !== "admin" && user.role !== "accountant") {
      console.log("❌ User role is not admin or accountant:", user.role);
      return res.status(403).json({
        success: false,
        message: "Access denied. Admin or accountant privileges required."
      });
    }

    // Check password
    if (!user.password) {
      console.log("❌ No password set for user");
      return res.status(401).json({
        success: false,
        message: "Password not set. Please contact administrator."
      });
    }

    console.log("\n🔐 Password comparison:");
    console.log("Input password:", `"${password}"`);
    console.log("Input password length:", password.length);

    // Compare password
    const isMatch = await bcrypt.compare(password, user.password);
    console.log("Bcrypt compare result:", isMatch);

    if (!isMatch) {
      console.log("❌ Password doesn't match!");
      return res.status(401).json({
        success: false,
        message: "Invalid password"
      });
    }

    console.log("\n✅ Password verified successfully!");
    console.log("User role for JWT token:", user.role);  // Should be "accountant"

    // Generate JWT token - USE user.role NOT "admin"
    const tokenPayload = {
      id: user._id,
      role: user.role,  // ← CRITICAL: Use actual role from database
      name: user.name,
      email: user.email
    };

    console.log("Token payload:", tokenPayload);

    const token = jwt.sign(
      tokenPayload,
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    console.log("✅ JWT token generated with role:", user.role);
    console.log("=== LOGIN SUCCESS ===\n");

    // Return response - USE user.role NOT "admin"
    res.json({
      success: true,
      token,
      role: user.role,  // ← CRITICAL: Return actual role
      forcePasswordChange: false,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,  // ← Include in user object too
        mobile: user.mobile
      }
    });

  } catch (err) {
    console.error("\n❌ LOGIN ERROR:", err);
    console.error("Error stack:", err.stack);
    res.status(500).json({
      success: false,
      message: "Server error during login"
    });
  }
});

module.exports = router;