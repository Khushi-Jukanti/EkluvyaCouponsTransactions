const mongoose = require("mongoose");
const { agentDB } = require("../config/db.config");

// Explicit collection: operators belong to AGENT_DB_URI.users, not agents.
const schema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, lowercase: true, trim: true },
  phone: { type: String, required: true },
  school_name: { type: String, required: true, trim: true },
  location: { type: String, required: true, trim: true },
  password: { type: String, required: true, select: false },
  role: { type: String, enum: ["data_entry"], default: "data_entry" },
}, { timestamps: true });
schema.index({ email: 1 }, { name: "data_entry_email_unique", unique: true, partialFilterExpression: { role: "data_entry", email: { $type: "string" } } });
schema.index({ phone: 1 }, { name: "data_entry_phone_unique", unique: true, partialFilterExpression: { role: "data_entry", phone: { $type: "string" } } });
module.exports = agentDB.model("DataEntryUser", schema, "users");
