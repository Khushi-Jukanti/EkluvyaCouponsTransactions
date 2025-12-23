// admin.auth.routes.js - WITH DEBUGGING
const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const Agent = require("../models/agent");
const router = express.Router();

// Admin login - POST /api/auth/admin/login
router.post("/login", async (req, res) => {
  console.log("\n=== ADMIN LOGIN REQUEST ===");
  console.log("Request body:", req.body);

  try {
    const { username, password } = req.body;

    if (!username || !password) {
      console.log("❌ Missing username or password");
      return res.status(400).json({ message: "Username and password are required" });
    }

    console.log("Looking for admin with email:", username);

    // Find admin by email
    const admin = await Agent.findOne({
      email: username
    });

    console.log("Query result:", admin ? "Found" : "Not found");

    if (!admin) {
      console.log("❌ No admin found with email:", username);
      return res.status(401).json({ message: "Invalid email or password" });
    }

    console.log("\n✅ Admin found in database:");
    console.log("ID:", admin._id);
    console.log("Name:", admin.name);
    console.log("Email:", admin.email);
    console.log("Role:", admin.role);
    console.log("Has password field:", !!admin.password);

    if (admin.password) {
      console.log("Password hash length:", admin.password.length);
      console.log("Password hash (first 30 chars):", admin.password.substring(0, 30) + "...");

      // IMPORTANT: Check if role is actually admin
      if (admin.role !== "admin") {
        console.log("⚠️ WARNING: User found but role is:", admin.role, "not 'admin'");
        console.log("Setting role to 'admin' for this user");
        admin.role = "admin";
        await admin.save();
      }
    }

    // Check if user has admin role
    if (admin.role !== "admin") {
      console.log("❌ User role is not admin:", admin.role);
      return res.status(403).json({
        message: "Access denied. Admin privileges required."
      });
    }

    // Check password
    if (!admin.password) {
      console.log("❌ No password set for admin");
      return res.status(401).json({
        message: "Password not set. Please contact administrator."
      });
    }

    console.log("\n🔐 Password comparison:");
    console.log("Input password:", `"${password}"`);
    console.log("Input password length:", password.length);

    // Compare password
    const isMatch = await bcrypt.compare(password, admin.password);
    console.log("Bcrypt compare result:", isMatch);

    if (!isMatch) {
      console.log("❌ Password doesn't match!");

      // Try to see what's wrong
      console.log("\nDebugging password mismatch:");
      console.log("Stored hash:", admin.password);

      // Test with the exact password we just set
      const testMatch = await bcrypt.compare("admin@123", admin.password);
      console.log("Does 'admin@123' match stored hash?", testMatch);

      return res.status(401).json({ message: "Invalid password" });
    }

    console.log("\n✅ Password verified successfully!");

    // Generate JWT token
    const token = jwt.sign(
      { id: admin._id, role: "admin" },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    console.log("✅ JWT token generated");
    console.log("Token (first 30 chars):", token.substring(0, 30) + "...");
    console.log("=== ADMIN LOGIN SUCCESS ===\n");

    res.json({
      token,
      role: "admin",
      forcePasswordChange: false,
      admin: {
        name: admin.name,
        email: admin.email
      }
    });

  } catch (err) {
    console.error("\n❌ ADMIN LOGIN ERROR:", err);
    console.error("Error stack:", err.stack);
    res.status(500).json({ message: "Server error during login" });
  }
});

module.exports = router;