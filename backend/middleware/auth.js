// middleware/auth.js - WITH DEFAULT EXPORT
const jwt = require("jsonwebtoken");
const TokenBlacklist = require("../models/tokenBlacklist.model");

// Combined middleware function with blacklist check
const verifyToken = async function (req, res, next) {
  // Get token from header
  const token = req.header("Authorization")?.replace("Bearer ", "");

  // Check if no token
  if (!token) {
    return res.status(401).json({ message: "No token, authorization denied" });
  }

  try {
    // Check if token is blacklisted
    const blacklisted = await TokenBlacklist.findOne({ token });
    if (blacklisted) {
      return res.status(401).json({ message: "Token has been invalidated" });
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Add user from payload
    req.user = decoded;
    next();
  } catch (err) {
    console.error("Auth middleware error:", err.message);

    // Different error messages based on error type
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ message: "Token has expired" });
    } else if (err.name === 'JsonWebTokenError') {
      return res.status(401).json({ message: "Invalid token" });
    } else {
      return res.status(401).json({ message: "Token is not valid" });
    }
  }
};

// Export as default (for backward compatibility)
module.exports = verifyToken; // Default export

// Also export as named export
module.exports.verifyToken = verifyToken;