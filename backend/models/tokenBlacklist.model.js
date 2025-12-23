// models/tokenBlacklist.model.js
const mongoose = require("mongoose");

const tokenBlacklistSchema = new mongoose.Schema({
  token: {
    type: String,
    required: true,
    unique: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Agent",
    required: true
  },
  expiresAt: {
    type: Date,
    required: true,
    index: { expires: 0 } // TTL index
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model("TokenBlacklist", tokenBlacklistSchema);