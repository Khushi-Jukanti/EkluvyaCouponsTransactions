const { encryptInitialPassword, restoreInitialPassword } = require("./dataEntryCredentials.service");

const detailKeys = ["first_name", "last_name", "email", "phone", "username", "user_type", "receipt_no", "admission_number", "school_code", "school_type", "school_name", "school_address", "branch", "executive_name", "executive_phone", "class", "section", "preparing_for", "dob", "gender"];

async function resumeTrackedImport(StudentUser, options) {
  const job = await StudentUser.db.collection("data_entry_import_jobs").findOne({ _id: options.importId, operator_id: String(options.requestedBy.id) });
  return job ? runJob(StudentUser, job) : null;
}

async function insertTrackedUsers(StudentUser, entries, sourceRows, options) {
  const now = new Date();
  const job = {
    _id: options.importId,
    operator_id: String(options.requestedBy.id),
    entries: entries.map(entry => ({
      rowNumber: entry.rowNumber,
      user: { ...entry.user, _id: new StudentUser.db.base.Types.ObjectId(), temp_password: null },
      encrypted_initial_password: encryptInitialPassword(entry.tempPassword),
    })),
    history: {
      _id: new StudentUser.db.base.Types.ObjectId(options.importId.replace("data-entry-", "")),
      import_id: options.importId, import_type: "sr_receipt_users", source_file_name: options.sourceFileName,
      dry_run: false, requested_by: options.requestedBy, validated_at: options.validatedAt,
      insertion_status: "Processing", source_rows: sourceRows, successful_users: [], failed_rows: [],
      summary: { totalRecords: sourceRows.length, successfullyInserted: 0, failedRecords: 0, subscriptionAssignmentStatus: "skipped" },
      subscription_assignment: { status: "skipped", assigned: 0, failed: 0, batches: [], message: "Awaiting accountant subscription assignment" },
      created_at: now, updated_at: now,
    },
  };
  // Persist IDs, hashes and encrypted credentials before any student write.
  // Concurrent submissions always use the first durable plan.
  const jobs = StudentUser.db.collection("data_entry_import_jobs");
  try { await jobs.insertOne(job); }
  catch (error) { if (error.code !== 11000) throw error; }
  return resumeTrackedImport(StudentUser, options);
}

async function runJob(StudentUser, job) {
  const histories = StudentUser.db.collection("school_student_import_logs");
  await histories.updateOne({ _id: job.history._id }, { $setOnInsert: job.history }, { upsert: true });
  const existing = await histories.findOne({ _id: job.history._id });
  if (existing.insertion_status === "Inserted") return result(job, existing.successful_users.length);

  // Native $setOnInsert avoids changing existing passwords or timestamps on retries.
  // These documents have already passed schema validation and password hashing.
  let writeError;
  for (let offset = 0; offset < job.entries.length; offset += 150) {
    try {
      await StudentUser.collection.bulkWrite(job.entries.slice(offset, offset + 150).map(({ user, encrypted_initial_password }) => ({
        updateOne: { filter: { _id: user._id }, update: { $setOnInsert: { ...user, temp_password: restoreInitialPassword({ encrypted_initial_password }).password } }, upsert: true },
      })), { ordered: false });
    } catch (error) {
      writeError = error;
      break;
    }
  }
  // A timeout can follow a committed write. Check IDs rather than assuming failure.
  const stored = await StudentUser.collection.find({ _id: { $in: job.entries.map(entry => entry.user._id) } }, { projection: { _id: 1 } }).toArray();
  const confirmed = new Set(stored.map(user => String(user._id)));
  const successfulUsers = job.entries.filter(entry => confirmed.has(String(entry.user._id))).map(entry => ({
    ...Object.fromEntries(detailKeys.map(key => [key, entry.user[key] ?? null])),
    user_id: String(entry.user._id), rowNumber: entry.rowNumber,
    encrypted_initial_password: entry.encrypted_initial_password,
    import_status: "Inserted", subscription_status: "Pending", inserted_at: entry.user.created_at,
  }));
  const failedRows = job.entries.filter(entry => !confirmed.has(String(entry.user._id))).map(entry => ({
    rowNumber: entry.rowNumber, username: entry.user.username,
    error: writeError?.code === 11000 ? "A matching user now exists. Submit this row to the admin office." : "Insertion not confirmed. Retry this same submission to resume.",
  }));
  const complete = failedRows.length === 0;
  // Do not let a slower concurrent retry overwrite a completed/newer snapshot.
  await histories.updateOne({ _id: job.history._id, insertion_status: { $ne: "Inserted" }, "summary.successfullyInserted": { $lte: successfulUsers.length } }, { $set: {
    successful_users: successfulUsers, failed_rows: failedRows,
    insertion_status: complete ? "Inserted" : successfulUsers.length ? "Partial" : "Failed",
    "summary.successfullyInserted": successfulUsers.length, "summary.failedRecords": failedRows.length,
    ...(complete ? { inserted_at: new Date() } : {}), updated_at: new Date(),
  } });
  if (writeError) console.error("Data-entry student write", { importId: job._id, name: writeError.name, code: writeError.code, confirmed: successfulUsers.length });
  return result(job, successfulUsers.length, failedRows);
}

function result(job, inserted, failedRows = []) {
  const success = inserted === job.entries.length;
  return { success, importId: job._id, inserted, totalRows: job.entries.length, failed: failedRows.length, failedRows,
    message: success ? "Inserted successfully. Subscriptions will activate within 24 hours." : `${inserted} of ${job.entries.length} students inserted. Check My import history and retry this same submission to resume the remaining rows.`,
  };
}

module.exports = { resumeTrackedImport, insertTrackedUsers };
