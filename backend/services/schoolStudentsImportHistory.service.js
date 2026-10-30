const SchoolStudentImportLog = require("../models/school-student-import-log.model");
const { restoreInitialPassword } = require("./dataEntryCredentials.service");

// Older import snapshots omitted the operator's zonal name.
async function includeValidatorDetails(logs) {
  const needsDetails = log => (log.requested_by?.role === "data_entry" || log.import_id?.startsWith("data-entry-")) &&
    /^[a-f\d]{24}$/i.test(String(log.requested_by?.id || "")) &&
    ["name", "phone", "zonal_name"].some(key => !log.requested_by?.[key]);
  const ids = [...new Set(logs.filter(needsDetails).map(log => String(log.requested_by.id)))];
  if (!ids.length) return logs;
  const Operator = require("../models/data-entry-user.model");
  const operators = await Operator.find({ _id: { $in: ids }, role: "data_entry" }).select("name phone zonal_name").lean();
  const byId = new Map(operators.map(operator => [String(operator._id), operator]));
  return logs.map(log => {
    const operator = needsDetails(log) && byId.get(String(log.requested_by.id));
    if (!operator) return log;
    return { ...log, requested_by: {
      ...log.requested_by,
      ...Object.fromEntries(["name", "phone", "zonal_name"].map(key => [key, log.requested_by[key] || operator[key] || null])),
    } };
  });
}

function restoreAdmissionNumbers(log) {
  if (log.import_type !== "school_students") return log;

  const normalize = (value) => String(value ?? "").trim();
  const textKey = (value) => normalize(value).toLowerCase().replace(/\s+/g, " ");
  const dateKey = (value) => {
    const text = normalize(value);
    if (!text) return "";
    const parts = text.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})$/);
    if (parts) return `${parts[3]}-${parts[2].padStart(2, "0")}-${parts[1].padStart(2, "0")}`;
    const date = new Date(text);
    return Number.isNaN(date.getTime()) ? text : date.toISOString().slice(0, 10);
  };
  const studentKey = (user) => {
    if (!normalize(user.first_name) || !normalize(user.school_name) || !normalize(user.class) || !normalize(user.dob)) return null;
    return JSON.stringify([
      ...["first_name", "last_name", "school_name", "class"].map((key) => textKey(user[key])),
      dateKey(user.dob),
    ]);
  };
  const identifier = (key, value) => {
    const text = normalize(value);
    if (key === "phone") return text.replace(/\.0+$/, "").replace(/\D/g, "");
    return key === "email" ? text.toLowerCase() : text;
  };
  const sourceRows = (log.source_rows || []).map((row) => {
    const fields = Object.fromEntries(Object.entries(row).map(([key, value]) => [
      key.trim().toLowerCase().replace(/[\s_.-]+/g, ""), normalize(value),
    ]));
    const get = (...keys) => keys.map((key) => fields[key]).find(Boolean) || "";
    return {
      admission: get("admissionnumber", "admissionno", "receiptno(or)admissionno"),
      username: get("username"),
      phone: get("phone", "mobile", "mobileno", "phonenumber", "mobilenumber"),
      email: get("email", "emailid"),
      first_name: get("firstname", "name"),
      last_name: get("lastname", "surname", "secondname"),
      school_name: get("schoolname"),
      class: get("class"),
      dob: get("dob", "dateofbirth"),
    };
  });

  return {
    ...log,
    successful_users: (log.successful_users || []).map((user) => {
      if (normalize(user.admission_number)) return user;
      // Match identifiers, never array positions: failed rows can shift the order.
      let matches = sourceRows.filter((row) =>
        ["username", "phone", "email"].some((key) =>
          identifier(key, row[key]) && identifier(key, row[key]) === identifier(key, user[key])
        )
      );
      // Older imports generated usernames and allowed blank phone/email fields.
      // Only recover a unique student match; never guess between duplicate rows.
      if (matches.length === 0) {
        const key = studentKey(user);
        if (key) matches = sourceRows.filter((row) => studentKey(row) === key);
      }
      return matches.length === 1 && matches[0].admission
        ? { ...user, admission_number: matches[0].admission }
        : user;
    }),
  };
}

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

async function listImportLogs({ page = 1, limit = 20, importType, from, to, requestedById } = {}) {
  const safePage = Math.min(Math.max(Math.floor(Number(page)) || 1, 1), 100000);
  const safeLimit = Math.min(Math.max(Number(limit) || 20, 1), 100);
  const query = {};
  if (requestedById) query["requested_by.id"] = String(requestedById);

  if (importType) {
    query.import_type = importType;
  }

  if (from || to) {
    query.created_at = {};

    if (from) {
      const fromDate = new Date(`${from}T00:00:00.000+05:30`);
      if (!Number.isNaN(fromDate.getTime())) {
        query.created_at.$gte = fromDate;
      }
    }

    if (to) {
      const toDate = new Date(`${to}T23:59:59.999+05:30`);
      if (!Number.isNaN(toDate.getTime())) {
        query.created_at.$lte = toDate;
      }
    }

    if (Object.keys(query.created_at).length === 0) {
      delete query.created_at;
    }
  }

  const [items, total] = await Promise.all([
    SchoolStudentImportLog.find(query)
      .select(
        requestedById
          ? "import_id import_type source_file_name summary successful_users.user_id successful_users.subscription_status successful_users.subscription_assigned_at insertion_status validated_at inserted_at created_at updated_at"
          : "import_id import_type source_file_name summary successful_users subscription_assignment log_file_name created_at updated_at requested_by insertion_status review_locked"
      )
      .sort({ created_at: -1 })
      .skip((safePage - 1) * safeLimit)
      .limit(safeLimit)
      .lean(),
    SchoolStudentImportLog.countDocuments(query),
  ]);

  return {
    items: requestedById ? items : await includeValidatorDetails(items),
    pagination: {
      page: safePage,
      limit: safeLimit,
      total,
      totalPages: Math.ceil(total / safeLimit),
    },
  };
}

function batchStatus(batch) {
  if (!batch.success) return "Failed";
  // Aggregate failure counts cannot identify which individual students succeeded.
  if (Number(batch.response?.failed || 0) > 0) return "Needs verification";
  return "Assigned";
}

async function getImportLog(importId, requestedById) {
  const query = { import_id: importId };
  if (requestedById) query["requested_by.id"] = String(requestedById);
  const storedLog = await SchoolStudentImportLog.findOne(query).lean();

  if (!storedLog) return null;
  const [enrichedLog] = requestedById ? [storedLog] : await includeValidatorDetails([storedLog]);
  const log = restoreAdmissionNumbers(enrichedLog);
  log.successful_users = (log.successful_users || []).map(restoreInitialPassword);

  const statusByUserId = new Map();

  (log.subscription_assignment?.batches || []).forEach((batch) => {
    (batch.userIds || []).forEach((userId) => {
      statusByUserId.set(String(userId), batchStatus(batch));
    });
  });

  if (statusByUserId.size === 0) return log;

  return {
    ...log,
    successful_users: (log.successful_users || []).map((user) => ({
      ...user,
      subscription_status:
        (user.subscription_reviewed_at ? user.subscription_status : statusByUserId.get(String(user.user_id))) ||
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
      statusByUserId.set(String(userId), batchStatus(batch));
    });
  });

  const successfulUsers = (log.successful_users || []).map((user) => ({
    ...user,
    subscription_status:
      statusByUserId.get(String(user.user_id)) ||
      user.subscription_status || "Pending",
    subscription_assigned_at: statusByUserId.get(String(user.user_id)) === "Assigned" ? new Date() : user.subscription_assigned_at || null,
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
