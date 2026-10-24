const mongoose = require("mongoose");
const { agentDB } = require("../config/db.config");

const schema = new mongoose.Schema({
  operator_id: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
  operator: { type: mongoose.Schema.Types.Mixed, required: true },
  file_hash: { type: String, required: true },
  source_file_name: String,
  total_rows: Number,
  failed_rows: Number,
  status: { type: String, enum: ["valid", "invalid"], required: true },
}, { timestamps: true });
schema.index({ operator_id: 1, createdAt: -1 });
module.exports = agentDB.model("DataEntryValidation", schema, "data_entry_validations");
