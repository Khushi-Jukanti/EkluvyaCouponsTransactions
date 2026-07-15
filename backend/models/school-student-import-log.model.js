const mongoose = require("mongoose");
const { Schema } = mongoose;

const writeMongoUri = process.env.WRITE_MONGO_URI || process.env.MONGODB_URI;

if (!writeMongoUri) {
  throw new Error("WRITE_MONGO_URI or MONGODB_URI is required");
}

const importLogConnection = mongoose.createConnection(writeMongoUri, {
  serverSelectionTimeoutMS: 10000,
  socketTimeoutMS: 120000,
});

importLogConnection.on("connected", () => {
  console.log("Student import log DB connected");
});

importLogConnection.on("error", (err) => {
  console.error("Student import log DB error:", err.message);
});

const SchoolStudentImportLogSchema = new Schema(
  {
    import_id: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    import_type: {
      type: String,
      enum: ["school_students", "offline_receipt_users"],
      required: true,
      index: true,
    },
    source_file_name: {
      type: String,
      default: null,
    },
    dry_run: {
      type: Boolean,
      default: false,
    },
    requested_by: {
      type: Schema.Types.Mixed,
      default: null,
    },
    summary: {
      type: Schema.Types.Mixed,
      default: {},
    },
    source_rows: {
      type: [Schema.Types.Mixed],
      default: [],
    },
    successful_users: {
      type: [Schema.Types.Mixed],
      default: [],
    },
    failed_rows: {
      type: [Schema.Types.Mixed],
      default: [],
    },
    subscription_assignment: {
      type: Schema.Types.Mixed,
      default: {},
    },
    log_file_name: {
      type: String,
      default: null,
    },
    log_file_path: {
      type: String,
      default: null,
    },
  },
  {
    timestamps: {
      createdAt: "created_at",
      updatedAt: "updated_at",
    },
  }
);

SchoolStudentImportLogSchema.index({ created_at: -1 });
SchoolStudentImportLogSchema.index({ import_type: 1, created_at: -1 });

module.exports = importLogConnection.model(
  "school_student_import_logs",
  SchoolStudentImportLogSchema,
  "school_student_import_logs"
);
