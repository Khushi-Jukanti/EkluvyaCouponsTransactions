// src/config/db.config.js
const mongoose = require("mongoose");
require("dotenv").config();
require("../models/index");

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI, {});
    console.log("MongoDB Connected Successfully");
    console.log("All collections auto-registered");
  } catch (err) {
    console.error("MongoDB Connection Failed:", err.message);
    process.exit(1);
  }
};

const agentDB = mongoose.createConnection(process.env.AGENT_DB_URI, {
  serverSelectionTimeoutMS: 5000,
  socketTimeoutMS: 45000,
  tls: true,
});

agentDB.on("connected", () => {
  console.log("✅ Agent DB connected");
});

agentDB.on("error", (err) => {
  console.error("❌ Agent DB error:", err);
});

module.exports = { connectDB, agentDB };
