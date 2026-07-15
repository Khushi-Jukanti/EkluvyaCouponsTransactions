const SchoolStudentImportLog = require("../models/school-student-import-log.model");

async function saveImportLogToDatabase(payload) {
  return SchoolStudentImportLog.findOneAndUpdate(
    { import_id: payload.importId },
    {
      $set: {
        import_id: payload.importId,
        import_type: payload.importType,
        source_file_name: payload.sourceFileName || null,
        dry_run: payload.dryRun === true,
        requested_by: payload.requestedBy || null,
        summary: payload.summary || {},
        source_rows: payload.sourceRows || [],
        successful_users: payload.successfulUsers || [],
        failed_rows: payload.failedRows || [],
        subscription_assignment: payload.subscriptionAssignment || {},
        log_file_name: payload.logFileName || null,
        log_file_path: payload.logFilePath || null,
      },
    },
    { upsert: true, new: true }
  ).lean();
}

async function listImportLogs({ page = 1, limit = 20, importType } = {}) {
  const safePage = Math.max(Number(page) || 1, 1);
  const safeLimit = Math.min(Math.max(Number(limit) || 20, 1), 100);
  const query = {};

  if (importType) {
    query.import_type = importType;
  }

  const [items, total] = await Promise.all([
    SchoolStudentImportLog.find(query)
      .select(
        "import_id import_type source_file_name summary successful_users subscription_assignment log_file_name created_at updated_at"
      )
      .sort({ created_at: -1 })
      .skip((safePage - 1) * safeLimit)
      .limit(safeLimit)
      .lean(),
    SchoolStudentImportLog.countDocuments(query),
  ]);

  return {
    items,
    pagination: {
      page: safePage,
      limit: safeLimit,
      total,
      totalPages: Math.ceil(total / safeLimit),
    },
  };
}

async function getImportLog(importId) {
  const log = await SchoolStudentImportLog.findOne({ import_id: importId }).lean();

  if (!log) return null;

  const statusByUserId = new Map();

  (log.subscription_assignment?.batches || []).forEach((batch) => {
    (batch.userIds || []).forEach((userId) => {
      statusByUserId.set(String(userId), batch.success ? "Assigned" : "Failed");
    });
  });

  if (statusByUserId.size === 0) return log;

  return {
    ...log,
    successful_users: (log.successful_users || []).map((user) => ({
      ...user,
      subscription_status:
        statusByUserId.get(String(user.user_id)) ||
        user.subscription_status ||
        "Pending",
    })),
  };
}

async function updateImportLogSubscription(importId, subscriptionAssignment) {
  if (!importId) return null;

  const log = await SchoolStudentImportLog.findOne({ import_id: importId });

  if (!log) return null;

  const statusByUserId = new Map();

  (subscriptionAssignment?.batches || []).forEach((batch) => {
    (batch.userIds || []).forEach((userId) => {
      statusByUserId.set(userId, batch.success ? "Assigned" : "Failed");
    });
  });

  const successfulUsers = (log.successful_users || []).map((user) => ({
    ...user,
    subscription_status:
      statusByUserId.get(String(user.user_id)) ||
      (subscriptionAssignment?.assigned > 0 ? "Assigned" : user.subscription_status || "Pending"),
  }));

  return SchoolStudentImportLog.findOneAndUpdate(
    { import_id: importId },
    {
      $set: {
        subscription_assignment: subscriptionAssignment || {},
        "summary.subscriptionAssignmentStatus": subscriptionAssignment?.status || "unknown",
        successful_users: successfulUsers,
      },
    },
    { new: true }
  ).lean();
}

module.exports = {
  saveImportLogToDatabase,
  listImportLogs,
  getImportLog,
  updateImportLogSubscription,
};
