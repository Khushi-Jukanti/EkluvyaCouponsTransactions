const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const Agent = require("../models/agent");
const sendOTP = require("../utils/sendOTP");
const router = express.Router();

router.post("/login", async (req, res) => {
  console.log("\n=== AGENT LOGIN REQUEST ===");
  console.log("Request body:", req.body);

  try {
    const { mobile, password, couponCode } = req.body;

    // Validate input
    if (!mobile || !password) {
      console.log("Missing required fields");
      return res.status(400).json({
        success: false,
        message: "Mobile number and password are required"
      });
    }

    console.log("Looking for agent with mobile:", mobile);

    // Find agent
    let agent;
    try {
      agent = await Agent.findOne({ mobile });
      console.log("Database query result:", agent ? "Found" : "Not found");
    } catch (dbError) {
      console.error("❌ Database query error:", dbError.message);
      console.error("Database error stack:", dbError.stack);
      return res.status(500).json({
        success: false,
        message: "Database connection error"
      });
    }

    if (!agent) {
      console.log("❌ Agent not found for mobile:", mobile);
      return res.status(401).json({
        success: false,
        message: "Invalid mobile number or password"
      });
    }

    console.log("\n✅ Agent found:");
    console.log("ID:", agent._id);
    console.log("Name:", agent.name);
    console.log("Mobile:", agent.mobile);
    console.log("Role:", agent.role);
    console.log("firstLogin:", agent.firstLogin);
    console.log("hasPassword:", !!agent.password);
    console.log("couponCode:", agent.couponCode);

    // FIRST LOGIN LOGIC
    if (agent.firstLogin) {
      console.log("\n🔑 First login attempt");
      console.log("Provided couponCode:", couponCode);
      console.log("Stored couponCode:", agent.couponCode);

      if (!couponCode) {
        console.log("❌ No coupon code provided for first login");
        return res.status(401).json({
          success: false,
          message: "Coupon code is required for first login"
        });
      }

      if (couponCode !== agent.couponCode) {
        console.log("❌ Coupon code mismatch");
        return res.status(401).json({
          success: false,
          message: "Invalid coupon code"
        });
      }

      console.log("✅ First login coupon code verified");

      // Set forcePasswordChange for first login
      agent.forcePasswordChange = true;

      try {
        await agent.save();
        console.log("✅ Agent forcePasswordChange updated to true");
      } catch (saveError) {
        console.error("❌ Error saving agent:", saveError.message);
        // Continue anyway - the login should still work
      }

    } else {
      // NORMAL LOGIN LOGIC
      console.log("\n🔑 Normal login attempt");

      if (!agent.password) {
        console.log("❌ Agent has no password set");
        return res.status(401).json({
          success: false,
          message: "Password not set. Please use forgot password."
        });
      }

      try {
        console.log("Comparing password with bcrypt...");
        const isMatch = await bcrypt.compare(password, agent.password);
        console.log("Password match result:", isMatch);

        if (!isMatch) {
          console.log("❌ Password doesn't match");
          return res.status(401).json({
            success: false,
            message: "Invalid password"
          });
        }
      } catch (bcryptError) {
        console.error("❌ Bcrypt comparison error:", bcryptError.message);
        console.error("Bcrypt error stack:", bcryptError.stack);
        return res.status(500).json({
          success: false,
          message: "Password verification error"
        });
      }
    }

    // GENERATE TOKEN
    try {
      console.log("\n🎫 Generating JWT token...");
      const token = jwt.sign(
        { id: agent._id.toString(), role: "agent" },
        process.env.JWT_SECRET,
        { expiresIn: "7d" }
      );

      console.log("✅ Token generated successfully");
      console.log("forcePasswordChange:", agent.forcePasswordChange || false);

      res.json({
        success: true,
        token,
        role: "agent",
        forcePasswordChange: agent.forcePasswordChange || false,
        agent: {
          name: agent.name,
          mobile: agent.mobile,
          couponCode: agent.couponCode,
        },
      });

    } catch (jwtError) {
      console.error("❌ JWT generation error:", jwtError.message);
      console.error("JWT error stack:", jwtError.stack);
      return res.status(500).json({
        success: false,
        message: "Token generation error"
      });
    }

  } catch (error) {
    console.error("\n❌ UNEXPECTED AGENT LOGIN ERROR:");
    console.error("Error message:", error.message);
    console.error("Error stack:", error.stack);
    console.error("Error full:", error);

    res.status(500).json({
      success: false,
      message: "Server error during login",
      debug: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

router.post("/forgot-password/send-otp", async (req, res) => {
  try {
    const { mobile } = req.body;

    console.log("Forgot password OTP request for mobile:", mobile);

    // Validate mobile
    if (!mobile || mobile.length !== 10) {
      return res.status(400).json({
        success: false,
        message: "Please enter a valid 10-digit mobile number"
      });
    }

    // Check if agent exists
    const agent = await Agent.findOne({ mobile });

    if (!agent) {
      return res.status(404).json({
        success: false,
        message: "Agent not found with this mobile number"
      });
    }

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    // Set OTP expiry (5 minutes from now)
    agent.otp = otp;
    agent.otpExpiry = Date.now() + 5 * 60 * 1000; // 5 minutes

    await agent.save();
    console.log("OTP generated for", mobile, ":", otp);

    // Send OTP via SMS
    try {
      const smsResult = await sendOTP(mobile, otp);
      console.log("SMS sent successfully:", smsResult);

      res.json({
        success: true,
        message: "OTP sent successfully to your mobile number",
        mobile: mobile // Return masked mobile if needed
      });

    } catch (smsError) {
      console.error("Failed to send SMS:", smsError.message);

      // Even if SMS fails, store OTP in database for testing
      res.status(500).json({
        success: false,
        message: "Failed to send OTP via SMS. Please try again later.",
        debug: process.env.NODE_ENV === 'development' ? smsError.message : undefined
      });
    }

  } catch (err) {
    console.error("Send OTP error:", err);
    res.status(500).json({
      success: false,
      message: "Server error while sending OTP"
    });
  }
});

router.post("/forgot-password/verify-otp", async (req, res) => {
  try {
    const { mobile, otp } = req.body;

    console.log("Verify OTP request:", { mobile, otp });

    if (!mobile || !otp) {
      return res.status(400).json({
        success: false,
        message: "Mobile number and OTP are required"
      });
    }

    const agent = await Agent.findOne({ mobile });

    if (!agent) {
      return res.status(404).json({
        success: false,
        message: "Agent not found"
      });
    }

    console.log("Stored OTP:", agent.otp);
    console.log("Entered OTP:", otp);
    console.log("OTP Expiry:", new Date(agent.otpExpiry));
    console.log("Current time:", new Date());

    // Check OTP validity
    if (!agent.otp || !agent.otpExpiry) {
      return res.status(400).json({
        success: false,
        message: "OTP not found or expired. Please request a new OTP."
      });
    }

    if (agent.otp !== otp) {
      return res.status(400).json({
        success: false,
        message: "Invalid OTP. Please enter the correct OTP."
      });
    }

    if (agent.otpExpiry < Date.now()) {
      return res.status(400).json({
        success: false,
        message: "OTP has expired. Please request a new OTP."
      });
    }

    // OTP is valid
    console.log("OTP verified successfully for:", mobile);

    res.json({
      success: true,
      message: "OTP verified successfully",
      verified: true
    });

  } catch (err) {
    console.error("Verify OTP error:", err);
    res.status(500).json({
      success: false,
      message: "Server error while verifying OTP"
    });
  }
});

router.post("/forgot-password/reset", async (req, res) => {
  try {
    const { mobile, otp, newPassword } = req.body;

    console.log("Reset password request for:", mobile);
    console.log("New password (plain text):", newPassword);

    if (!mobile || !otp || !newPassword) {
      return res.status(400).json({
        success: false,
        message: "Mobile number, OTP and new password are required"
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 6 characters long"
      });
    }

    const agent = await Agent.findOne({ mobile });

    if (!agent) {
      return res.status(404).json({
        success: false,
        message: "Agent not found"
      });
    }

    // Verify OTP again
    if (!agent.otp || agent.otp !== otp || agent.otpExpiry < Date.now()) {
      return res.status(400).json({
        success: false,
        message: "Invalid or expired OTP. Please restart the password reset process."
      });
    }

    // IMPORTANT: Save the plain password and let Mongoose middleware hash it
    console.log("Setting plain password to agent object");
    agent.password = newPassword; // Plain password - will be hashed by pre-save hook
    agent.firstLogin = false;
    agent.forcePasswordChange = false;
    agent.otp = null;
    agent.otpExpiry = null;

    // Add debug logging
    console.log("Before save - agent.password type:", typeof agent.password);
    console.log("Before save - password length:", agent.password.length);
    console.log("Before save - password (first 20 chars):", agent.password.substring(0, 20));

    await agent.save();

    console.log("After save - agent saved successfully");

    // Verify the hash was created
    const updatedAgent = await Agent.findOne({ mobile }).select('password');
    console.log("After save - password hash length:", updatedAgent.password?.length);
    console.log("After save - password hash (first 10 chars):", updatedAgent.password?.substring(0, 10));

    res.json({
      success: true,
      message: "Password reset successful. You can now login with your new password."
    });

  } catch (err) {
    console.error("Reset password error:", err);
    console.error("Error stack:", err.stack);
    res.status(500).json({
      success: false,
      message: "Server error while resetting password"
    });
  }
});

module.exports = router;