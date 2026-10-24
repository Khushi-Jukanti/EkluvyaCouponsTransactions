const XLSX = require("xlsx");
const bcrypt = require("bcryptjs");
const fs = require("fs");
const path = require("path");
const { randomInt } = require("crypto");
const StudentUser = require("../models/student-user.model");
const { assignSubscriptionsToUsers } = require("./subscriptionAssignment.service");
const { saveImportLogToDatabase } = require("./schoolStudentsImportHistory.service");
const { encryptInitialPassword } = require("./dataEntryCredentials.service");
const { resumeTrackedImport, insertTrackedUsers } = require("./dataEntryImport.service");

const HASH_CONCURRENCY = 25;
const IMPORT_LOG_DIR = path.join(__dirname, "..", "data", "import-logs");

function generateRandomPassword() {
  const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  let password = "";

  for (let index = 0; index < 6; index += 1) {
    password += letters[randomInt(letters.length)];
  }

  return password;
}

function createImportId() {
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const suffix = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `school-students-${timestamp}-${suffix}`;
}

function normalizeKey(key) {
  return key.toString().trim().toLowerCase().replace(/[\s_.-]+/g, "");
}

function normalizeValue(value) {
  if (value === undefined || value === null) return null;

  const normalized = value.toString().trim();
  return normalized === "" ? null : normalized;
}

function normalizeSchoolType(value) {
  const normalized = normalizeValue(value)?.toUpperCase();

  return ["SR", "SR1"].includes(normalized) ? normalized : null;
}

function normalizePhone(value) {
  const normalized = normalizeValue(value)?.replace(/\.0+$/, "");

  if (!normalized) return null;

  const digitsOnly = normalized.replace(/\D/g, "");
  return digitsOnly || null;
}

function normalizeReceiptNo(value) {
  return normalizeValue(value)?.replace(/\.0+$/, "") || null;
}

function normalizeEmail(value) {
  return normalizeValue(value)?.toLowerCase() || null;
}

function getRowValue(row, possibleKeys) {
  for (const key of possibleKeys) {
    if (Object.prototype.hasOwnProperty.call(row, key)) {
      return row[key];
    }
  }

  const normalizedKeyMap = new Map(
    Object.keys(row).map((key) => [normalizeKey(key), row[key]])
  );

  for (const key of possibleKeys) {
    const normalizedKey = normalizeKey(key);

    if (normalizedKeyMap.has(normalizedKey)) {
      return normalizedKeyMap.get(normalizedKey);
    }
  }

  return undefined;
}

function parseDOB(rawDob) {
  if (rawDob === undefined || rawDob === null || rawDob === "") {
    return null;
  }

  if (rawDob instanceof Date) {
    if (isNaN(rawDob.getTime())) {
      throw new Error(`Invalid DOB value: ${rawDob}`);
    }

    return rawDob;
  }

  if (typeof rawDob === "number") {
    const parsedFromExcel = XLSX.SSF.parse_date_code(rawDob);

    if (!parsedFromExcel) {
      throw new Error(`Invalid DOB value: ${rawDob}`);
    }

    return new Date(parsedFromExcel.y, parsedFromExcel.m - 1, parsedFromExcel.d);
  }

  const dobStr = rawDob.toString().trim();
  const parts = dobStr.split(/[-/.\s]+/);

  if (parts.length !== 3) {
    throw new Error(`Invalid DOB format: ${dobStr}`);
  }

  const [first, second, third] = parts;
  const yyyy = first.length === 4 ? first : third;
  const mm = first.length === 4 ? second : second;
  const dd = first.length === 4 ? third : first;
  const parsed = new Date(Number(yyyy), Number(mm) - 1, Number(dd));

  if (
    yyyy.length !== 4 ||
    isNaN(parsed.getTime()) ||
    parsed.getDate() !== Number(dd) ||
    parsed.getMonth() !== Number(mm) - 1 ||
    parsed.getFullYear() !== Number(yyyy)
  ) {
    throw new Error(`Invalid DOB value: ${dobStr}`);
  }

  return parsed;
}

function mapGender(gender) {
  const normalizedGender = normalizeValue(gender)?.toLowerCase();

  if (!normalizedGender) return null;
  if (normalizedGender === "male") return "1";
  if (normalizedGender === "female") return "2";
  if (normalizedGender === "other" || normalizedGender === "others") return "3";

  return null;
}

function buildAuthMethods(authMethods) {
  const methods = Array.isArray(authMethods) ? authMethods.filter(Boolean) : [];

  return methods.includes("otp") ? methods : [...methods, "otp"];
}

function buildNewUserWalkthroughState() {
  return {
    last_login: null,
    lastLogin: null,
    loginCount: 0,
    walkthrough_shown: false,
    walkthrough_shown_at: null,
  };
}

function buildOfflineReceiptUsername(receiptNo) {
  const safeReceiptNo = receiptNo
    .toString()
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");

  return `offline_${safeReceiptNo}`;
}

function buildReceiptAlreadyExistsMessage() {
  return "receipt no already exists in database";
}

function buildDuplicatePhoneInSheetMessage(phone) {
  return `duplicate phone number in sheet: ${phone}`;
}

function buildPhoneAlreadyExistsMessage(phone) {
  return `phone number already exists in database: ${phone}`;
}

function buildPhone(row) {
  return normalizePhone(
    getRowValue(row, [
      "phone",
      "Phone",
      "mobile",
      "Mobile",
      "mobile_no",
      "mobileNo",
      "mobile_number",
      "Mobile No",
      "Mobile No.",
      "mobile no",
      "Phone Number",
      "phone_number",
    ])
  );
}

function buildEmail(row, username) {
  return normalizeEmail(
    getRowValue(row, ["email", "Email", "email_id", "Email ID", "E-mail"])
  );
}

function buildAdmissionNumber(row) {
  return normalizeValue(
    getRowValue(row, [
      "admission_number",
      "Admission Number",
      "admission no",
      "admission_no",
      "Admission No",
      "RECEIPT NO (OR) ADMISSION NO",
    ])
  );
}

function generateSchoolStudentUsername(firstName) {
  const prefix = firstName.normalize("NFKD").replace(/[\u0300-\u036f]/g, "")
    .toUpperCase().replace(/[^A-Z]/g, "").slice(0, 3).padEnd(3, "X");
  return `${prefix}${randomInt(10000, 100000)}`;
}

function buildBaseUser(row) {
  const schoolCode = normalizeValue(getRowValue(row, ["school_code", "School Code"]));
  const admissionNumber = buildAdmissionNumber(row);
  const firstName = normalizeValue(
    getRowValue(row, ["first_name", "First Name", "firstname", "name", "Name"])
  );

  if (!admissionNumber) throw new Error("admission_number missing");
  if (!firstName) throw new Error("first_name missing");

  const username = generateSchoolStudentUsername(firstName);
  const tempPassword = generateRandomPassword();

  return {
    username,
    tempPassword,
    user: {
      username,
      admission_number: admissionNumber,
      user_type: "b2b",
      first_name: firstName,
      last_name: normalizeValue(getRowValue(row, ["last_name", "Last Name", "lastname", "SURNAME", "Second Name"])),
      email: buildEmail(row),
      phone: buildPhone(row),
      school_code: schoolCode,
      school_name: normalizeValue(
        getRowValue(row, ["school_name", "School Name", "school name", "schoolName"])
      ),
      school_type: normalizeSchoolType(
        getRowValue(row, ["school_type", "School Type", "school type", "schoolType"])
      ),
      school_address: normalizeValue(
        getRowValue(row, [
          "school_address",
          "School Address",
          "school address",
          "schoolAddress",
          "SCHOOL LOCATION",
        ])
      ),
      executive_name: normalizeValue(getRowValue(row, ["executive_name", "Executive Name"])),
      executive_phone: normalizePhone(getRowValue(row, ["executive_phone", "Executive Phone"])),
      branch: normalizeValue(getRowValue(row, ["branch", "Branch"])),
      class: normalizeValue(getRowValue(row, ["class", "Class", "grade", "Grade"])),
      section: normalizeValue(getRowValue(row, ["section", "Section"])),
      preparing_for: normalizeValue(
        getRowValue(row, ["preparing_for", "Preparing For"])
      ),
      must_change_password: 0,
      dob: parseDOB(getRowValue(row, ["dob", "DOB", "date_of_birth", "Date of Birth"])),
      gender: mapGender(getRowValue(row, ["gender", "Gender"])),
      profile_picture: "",
      roles_user: [],
      studio_user: [],
      notification_status: 1,
      notify_videos: 1,
      notify_newsletter: 1,
      notify_email: 1,
      coins: 0,
      is_coins_credited: 0,
      device_limit: 0,
      access_otp_token: null,
      expiry_at: null,
      otp_hit_count: 0,
      otp: 0,
      is_email_verified: 0,
      is_phone_verified: 0,
      is_active: 1,
      is_archived: 0,
      is_partner_blocked: 0,
      is_contact_sync: 0,
      is_fbsync: 0,
      push_notification_status: 2,
      email_notification_status: 2,
      auth_methods: ["password"],
      login_type: "password",
      temp_password: tempPassword,
      ...buildNewUserWalkthroughState(),
      created_at: new Date(),
      updated_at: new Date(),
    },
  };
}

function buildSrReceiptUser(row) {
  const receiptNo = normalizeReceiptNo(
    getRowValue(row, ["receipt_no", "Receipt No", "Receipt Number", "RECEIPT NO (OR) ADMISSION NO"])
  );
  const firstName = normalizeValue(
    getRowValue(row, ["first_name", "First Name", "firstname", "student_name", "NAME"])
  );
  const schoolName = normalizeValue(
    getRowValue(row, ["school_name", "School Name", "school name", "schoolName"])
  );
  const executiveName = normalizeValue(
    getRowValue(row, ["executive_name", "Executive Name"])
  );
  const executivePhone = normalizePhone(
    getRowValue(row, ["executive_phone", "Executive Phone"])
  );

  if (!receiptNo) throw new Error("receipt_no missing");
  if (!schoolName) throw new Error("school_name missing");
  if (!firstName) throw new Error("first_name missing");
  if (!executiveName) throw new Error("executive_name missing");

  const username = receiptNo;
  const tempPassword = generateRandomPassword();

  return {
    username,
    tempPassword,
    user: {
      username,
      receipt_no: receiptNo,
      admission_number: null,
      user_type: "b2b",
      first_name: firstName,
      last_name: normalizeValue(getRowValue(row, ["last_name", "Last Name", "lastname", "SURNAME"])),
      email: buildEmail(row),
      phone: buildPhone(row),
      school_code: normalizeValue(getRowValue(row, ["school_code", "School Code"])),
      school_name: schoolName,
      school_type: normalizeSchoolType(
        getRowValue(row, ["school_type", "School Type", "school type", "schoolType"])
      ),
      school_address: normalizeValue(
        getRowValue(row, [
          "school_address",
          "school_Address",
          "School Address",
          "school address",
          "schoolAddress",
          "SCHOOL LOCATION",
        ])
      ),
      branch: normalizeValue(getRowValue(row, ["branch", "Branch"])),
      class: normalizeValue(getRowValue(row, ["class", "Class", "grade", "Grade"])),
      section: normalizeValue(getRowValue(row, ["section", "Section"])),
      preparing_for: normalizeValue(
        getRowValue(row, ["preparing_for", "Preparing For"])
      ),
      executive_name: executiveName,
      executive_phone: executivePhone,
      must_change_password: 0,
      dob: parseDOB(getRowValue(row, ["dob", "DOB", "date_of_birth", "Date of Birth"])),
      gender: mapGender(getRowValue(row, ["gender", "Gender"])),
      profile_picture: "",
      roles_user: [],
      studio_user: [],
      notification_status: 1,
      notify_videos: 1,
      notify_newsletter: 1,
      notify_email: 1,
      coins: 0,
      is_coins_credited: 0,
      device_limit: 0,
      access_otp_token: null,
      expiry_at: null,
      otp_hit_count: 0,
      otp: 0,
      is_email_verified: 0,
      is_phone_verified: 0,
      is_active: 1,
      is_archived: 0,
      is_partner_blocked: 0,
      is_contact_sync: 0,
      is_fbsync: 0,
      push_notification_status: 2,
      email_notification_status: 2,
      auth_methods: ["password"],
      login_type: "password",
      temp_password: tempPassword,
      ...buildNewUserWalkthroughState(),
      created_at: new Date(),
      updated_at: new Date(),
    },
  };
}

function buildOfflineReceiptFields(row) {
  const receiptNo = normalizeReceiptNo(
    getRowValue(row, ["receipt_no", "Receipt No", "Receipt Number", "RECEIPT NO (OR) ADMISSION NO"])
  );
  const executiveName = normalizeValue(
    getRowValue(row, ["executive_name", "Executive Name"])
  );
  const executivePhone = normalizePhone(
    getRowValue(row, ["executive_phone", "Executive Phone"])
  );
  const schoolName = normalizeValue(
    getRowValue(row, ["school_name", "School Name", "school name", "schoolName"])
  );
  const schoolType = normalizeSchoolType(
    getRowValue(row, ["school_type", "School Type", "school type", "schoolType"])
  );
  const schoolAddress = normalizeValue(
    getRowValue(row, [
      "school_address",
      "school_Address",
      "School Address",
      "school address",
      "schoolAddress",
      "SCHOOL LOCATION",
    ])
  );
  const subscriberName = normalizeValue(
    getRowValue(row, ["subscriber_name", "Subscriber Name", "name", "Name"])
  );
  const firstName =
    normalizeValue(
      getRowValue(row, ["first_name", "First Name", "firstname", "student_name", "NAME"])
    ) || subscriberName?.split(" ")[0];
  const lastName =
    normalizeValue(getRowValue(row, ["last_name", "Last Name", "lastname", "SURNAME"])) ||
    (subscriberName?.split(" ").length > 1
      ? subscriberName.split(" ").slice(1).join(" ")
      : null);
  const email = normalizeEmail(
    getRowValue(row, ["email", "Email", "email_id", "Email ID", "E-mail"])
  );
  const phone = normalizePhone(
    getRowValue(row, ["phone", "Phone", "mobile", "Mobile", "Phone Number"])
  );

  if (!receiptNo) throw new Error("receipt_no missing");
  if (!executiveName) throw new Error("executive_name missing");
  if (!schoolName) throw new Error("school_name missing");
  if (!firstName) throw new Error("first_name missing");
  if (!email && !phone) throw new Error("email or phone missing");

  return {
    user_type: "b2c",
    registration_source: "offline_receipt",
    school_type: schoolType,
    school_name: schoolName,
    school_address: schoolAddress,
    school_code: normalizeValue(getRowValue(row, ["school_code", "School Code"])),
    branch: normalizeValue(getRowValue(row, ["branch", "Branch"])),
    receipt_no: receiptNo,
    executive_name: executiveName,
    executive_phone: executivePhone,
    first_name: firstName,
    last_name: lastName,
    email,
    phone,
    class: normalizeValue(
      getRowValue(row, ["class", "Class", "student_class", "Student Class"])
    ),
    section: normalizeValue(getRowValue(row, ["section", "Section"])),
    gender: mapGender(getRowValue(row, ["gender", "Gender"])),
    preparing_for: normalizeValue(getRowValue(row, ["preparing_for", "Preparing For"])),
    dob: parseDOB(getRowValue(row, ["dob", "DOB", "Date of Birth"])),
    password: null,
    temp_password: null,
    must_change_password: 0,
    is_phone_verified: 0,
    is_email_verified: 0,
    is_active: 1,
    is_archived: 0,
    profile_picture: "",
    roles_user: [],
    studio_user: [],
    notification_status: 1,
    notify_videos: 1,
    notify_newsletter: 1,
    notify_email: 1,
    coins: 0,
    is_coins_credited: 0,
    device_limit: 0,
    access_otp_token: null,
    expiry_at: null,
    otp_hit_count: 0,
    otp: 0,
    is_partner_blocked: 0,
    is_contact_sync: 0,
    is_fbsync: 0,
    push_notification_status: 2,
    email_notification_status: 2,
    login_type: "offline_receipt",
  };
}

function writeImportLog(importId, logPayload) {
  fs.mkdirSync(IMPORT_LOG_DIR, { recursive: true });
  const logFileName = `${importId}.json`;
  const logPath = path.join(IMPORT_LOG_DIR, logFileName);

  fs.writeFileSync(logPath, JSON.stringify(logPayload, null, 2));

  return {
    logFileName,
    logPath,
  };
}

function applySubscriptionStatus(users, subscriptionAssignment) {
  if (!Array.isArray(users) || users.length === 0) return users;

  if (!subscriptionAssignment || subscriptionAssignment.status === "skipped") {
    return users.map((user) => ({
      ...user,
      subscription_status: "Pending",
    }));
  }

  const statusByUserId = new Map();

  (subscriptionAssignment.batches || []).forEach((batch) => {
    (batch.userIds || []).forEach((userId) => {
      statusByUserId.set(userId, batch.success ? "Assigned" : "Failed");
    });
  });

  return users.map((user) => ({
    ...user,
    subscription_status:
      statusByUserId.get(user.user_id) ||
      (subscriptionAssignment.assigned > 0 ? "Assigned" : "Pending"),
  }));
}

function readWorkbookRows(buffer) {
  const workbook = XLSX.read(buffer, {
    type: "buffer",
    cellDates: true,
  });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];

  if (!sheet) {
    throw new Error("Excel file does not contain any sheets");
  }

  return XLSX.utils.sheet_to_json(sheet, {
    defval: "",
  }).filter((row) =>
    Object.values(row).some((value) => normalizeValue(value) !== null)
  );
}

async function createOrUpdateOfflineReceiptUser(receiptFields) {
  const existingReceipt = await StudentUser.findOne({
    receipt_no: receiptFields.receipt_no,
  }).lean();

  if (existingReceipt) {
    throw new Error(buildReceiptAlreadyExistsMessage(existingReceipt));
  }

  const existingUserByEmail = receiptFields.email
    ? await StudentUser.findOne({ email: receiptFields.email }).lean()
    : null;
  if (receiptFields.phone) {
    const existingUserByPhone = await StudentUser.findOne({
      phone: receiptFields.phone,
    }).lean();

    if (existingUserByPhone) {
      throw new Error(buildPhoneAlreadyExistsMessage(receiptFields.phone));
    }
  }

  const existingUser = existingUserByEmail;

  if (existingUser) {
    if (existingUser.receipt_no) {
      throw new Error("this user already has a receipt_no");
    }

    const updatedUser = await StudentUser.findByIdAndUpdate(
      existingUser._id,
      {
        $set: {
          ...receiptFields,
          password: null,
          temp_password: null,
          must_change_password: 0,
          auth_methods: buildAuthMethods(existingUser.auth_methods),
          login_type: "offline_receipt",
          updated_at: new Date(),
        },
      },
      { new: true }
    ).lean();

    return { action: "Updated", user: updatedUser };
  }

  const username = buildOfflineReceiptUsername(receiptFields.receipt_no);
  const existingUsername = await StudentUser.findOne({ username }).lean();

  if (existingUsername) {
    throw new Error(`generated username already exists: ${username}`);
  }

  const insertedUser = await StudentUser.create({
    ...receiptFields,
    username,
    password: null,
    temp_password: null,
    auth_methods: ["otp"],
    login_type: "offline_receipt",
    ...buildNewUserWalkthroughState(),
    created_at: new Date(),
    updated_at: new Date(),
  });

  return { action: "Inserted", user: insertedUser.toObject() };
}

async function hashUsersInBatches(userEntries) {
  const result = [];

  for (let index = 0; index < userEntries.length; index += HASH_CONCURRENCY) {
    const batch = userEntries.slice(index, index + HASH_CONCURRENCY);
    const hashedBatch = await Promise.all(
      batch.map(async (entry) => ({
        ...entry,
        user: {
          ...entry.user,
          password: await bcrypt.hash(entry.tempPassword, 10),
        },
      }))
    );

    result.push(...hashedBatch);
  }

  return result;
}

async function importSchoolStudentsFromExcel(buffer, options = {}) {
  const dryRun = options.dryRun === true;
  const assignSubscriptions = options.assignSubscriptions === true;
  const importId = createImportId();
  const rows = readWorkbookRows(buffer);
  const failedRows = [];
  const validEntries = [];
  const seenUsernames = new Set();
  const seenAdmissions = new Set();
  const seenEmails = new Set();
  const seenPhones = new Set();

  rows.forEach((row, index) => {
    const rowNumber = index + 2;

    try {
      const entry = buildBaseUser(row);
      const admissionKey = JSON.stringify([entry.user.school_code, entry.user.admission_number]);

      if (seenAdmissions.has(admissionKey)) {
        throw new Error(`duplicate admission number in sheet: ${entry.user.admission_number}`);
      }

      for (let attempt = 0; seenUsernames.has(entry.user.username) && attempt < 100; attempt += 1) {
        entry.username = entry.user.username = generateSchoolStudentUsername(entry.user.first_name);
      }

      if (seenUsernames.has(entry.user.username)) {
        throw new Error("Could not generate an available username; retry the import");
      }

      if (entry.user.email && seenEmails.has(entry.user.email)) {
        throw new Error(`duplicate email in sheet: ${entry.user.email}`);
      }

      if (entry.user.phone && seenPhones.has(entry.user.phone)) {
        throw new Error(buildDuplicatePhoneInSheetMessage(entry.user.phone));
      }

      seenUsernames.add(entry.user.username);
      seenAdmissions.add(admissionKey);
      if (entry.user.email) {
        seenEmails.add(entry.user.email);
      }
      if (entry.user.phone) {
        seenPhones.add(entry.user.phone);
      }
      validEntries.push({
        rowNumber,
        ...entry,
      });
    } catch (err) {
      failedRows.push({
        rowNumber,
        username: buildAdmissionNumber(row) || "UNKNOWN",
        error: err.message,
      });
    }
  });

  if (validEntries.length === 0) {
    return {
      success: false,
      dryRun,
      totalRows: rows.length,
      validRows: 0,
      inserted: 0,
      failed: failedRows.length,
      mapping: [],
      failedRows,
      message: "No valid users found in the uploaded file",
    };
  }

  const usernames = validEntries.map((entry) => entry.user.username);
  const emails = validEntries.map((entry) => entry.user.email).filter(Boolean);
  const phones = validEntries.map((entry) => entry.user.phone).filter(Boolean);
  const existingUserQuery = [
    { username: { $in: usernames } },
    ...validEntries.map(({ user }) => ({
      school_code: user.school_code,
      admission_number: user.admission_number,
    })),
  ];

  if (emails.length > 0) {
    existingUserQuery.push({ email: { $in: emails } });
  }

  if (phones.length > 0) {
    existingUserQuery.push({ phone: { $in: phones } });
  }

  const existingUsers = await StudentUser.find(
    { $or: existingUserQuery },
    { username: 1, email: 1, phone: 1, school_code: 1, admission_number: 1 }
  ).lean();

  const existingUsernameSet = new Set(existingUsers.map((user) => user.username).filter(Boolean));
  const existingAdmissionSet = new Set(existingUsers
    .filter((user) => user.admission_number)
    .map((user) => JSON.stringify([user.school_code || null, user.admission_number])));

  // Retry generated collisions in batches, checking every replacement against the database.
  for (let attempt = 0; attempt < 20; attempt += 1) {
    const collisions = validEntries.filter((entry) => existingUsernameSet.has(entry.user.username));
    if (collisions.length === 0) break;
    for (const entry of collisions) {
      let candidate = generateSchoolStudentUsername(entry.user.first_name);
      for (let retry = 0; seenUsernames.has(candidate) && retry < 100; retry += 1) {
        candidate = generateSchoolStudentUsername(entry.user.first_name);
      }
      if (seenUsernames.has(candidate)) continue;
      seenUsernames.add(candidate);
      entry.username = entry.user.username = candidate;
    }
    const matches = await StudentUser.find(
      { username: { $in: collisions.map((entry) => entry.user.username) } },
      { username: 1 }
    ).lean();
    matches.forEach((user) => existingUsernameSet.add(user.username));
  }
  const existingEmailSet = new Set(existingUsers.map((user) => user.email).filter(Boolean));
  const existingPhoneSet = new Set(existingUsers.map((user) => user.phone).filter(Boolean));
  const newEntries = [];

  validEntries.forEach((entry) => {
    if (existingAdmissionSet.has(JSON.stringify([entry.user.school_code, entry.user.admission_number]))) {
      failedRows.push({
        rowNumber: entry.rowNumber,
        username: entry.user.username,
        error: "admission number already exists for this school in database",
      });
      return;
    }
    if (existingUsernameSet.has(entry.user.username)) {
      failedRows.push({
        rowNumber: entry.rowNumber,
        username: entry.user.username,
        error: "username already exists in database",
      });
      return;
    }

    if (entry.user.email && existingEmailSet.has(entry.user.email)) {
      failedRows.push({
        rowNumber: entry.rowNumber,
        username: entry.user.username,
        error: "email already exists in database",
      });
      return;
    }

    if (entry.user.phone && existingPhoneSet.has(entry.user.phone)) {
      failedRows.push({
        rowNumber: entry.rowNumber,
        username: entry.user.username,
        phone: entry.user.phone,
        error: buildPhoneAlreadyExistsMessage(entry.user.phone),
      });
      return;
    }

    newEntries.push(entry);
  });

  if (dryRun) {
    return {
      success: true,
      dryRun: true,
      totalRows: rows.length,
      validRows: validEntries.length,
      readyToInsert: newEntries.length,
      inserted: 0,
      failed: failedRows.length,
      preview: newEntries.slice(0, 20).map((entry) => ({
        rowNumber: entry.rowNumber,
        username: entry.user.username,
        user_type: entry.user.user_type,
        admission_number: entry.user.admission_number,
        executive_name: entry.user.executive_name,
        executive_phone: entry.user.executive_phone,
        first_name: entry.user.first_name,
        last_name: entry.user.last_name,
        email: entry.user.email,
        phone: entry.user.phone,
        school_code: entry.user.school_code,
        school_type: entry.user.school_type,
        school_name: entry.user.school_name,
        school_address: entry.user.school_address,
        branch: entry.user.branch,
        class: entry.user.class,
        section: entry.user.section,
        preparing_for: entry.user.preparing_for,
        dob: entry.user.dob,
        gender: entry.user.gender,
      })),
      failedRows,
    };
  }

  if (newEntries.length === 0) {
    return {
      success: false,
      dryRun,
      totalRows: rows.length,
      validRows: validEntries.length,
      inserted: 0,
      failed: failedRows.length,
      mapping: [],
      failedRows,
      message: "No new users to insert; all rows already exist or failed validation",
    };
  }

  const entriesWithHashedPasswords = await hashUsersInBatches(newEntries);
  const insertedUsers = await StudentUser.insertMany(
    entriesWithHashedPasswords.map((entry) => entry.user),
    { ordered: false }
  );

  const passwordByUsername = new Map(
    entriesWithHashedPasswords.map((entry) => [
      entry.user.username,
      entry.tempPassword,
    ])
  );

  const mapping = insertedUsers.map((user) => {
    const plainPassword = passwordByUsername.get(user.username) || user.temp_password;

    return {
      first_name: user.first_name,
      last_name: user.last_name,
      email: user.email,
      phone: user.phone,
      username: user.username,
      user_type: user.user_type,
      admission_number:
        user.admission_number ||
        (user.school_code && user.username?.startsWith(`${user.school_code}_`)
          ? user.username.slice(user.school_code.length + 1)
          : null),
      password: plainPassword,
      executive_name: user.executive_name,
      executive_phone: user.executive_phone,
      school_code: user.school_code,
      school_type: user.school_type,
      school_name: user.school_name,
      school_address: user.school_address,
      branch: user.branch,
      class: user.class,
      section: user.section,
      preparing_for: user.preparing_for,
      dob: user.dob,
      gender: user.gender,
      user_id: user._id.toString(),
      import_status: "Inserted",
    };
  });

  const successfulUsers = mapping.map((user) => ({ ...user }));

  const subscriptionAssignment = assignSubscriptions
    ? await assignSubscriptionsToUsers(
        mapping.map((user) => user.user_id),
        {
          adminToken: options.subscriptionAdminToken,
          planId: options.subscriptionPlanId,
        }
      )
    : {
        status: "skipped",
        message: "Subscription assignment was not requested",
        assigned: 0,
        failed: 0,
        batches: [],
      };

  const mappingWithSubscriptionStatus = applySubscriptionStatus(
    mapping,
    subscriptionAssignment
  );
  const successfulUsersWithSubscriptionStatus = applySubscriptionStatus(
    successfulUsers,
    subscriptionAssignment
  );

  const summary = {
    totalRecords: rows.length,
    successfullyInserted: insertedUsers.length,
    failedRecords: failedRows.length,
    subscriptionAssignmentStatus: subscriptionAssignment.status,
  };

  const logInfo = writeImportLog(importId, {
    importId,
    importType: "school_students",
    createdAt: new Date().toISOString(),
    sourceFileName: options.sourceFileName || null,
    requestedBy: options.requestedBy || null,
    summary,
    sourceRows: rows,
    successfulUsers: mappingWithSubscriptionStatus,
    failedRows,
    subscriptionAssignment,
  });

  await saveImportLogToDatabase({
    importId,
    importType: "school_students",
    sourceFileName: options.sourceFileName || null,
    dryRun: false,
    requestedBy: options.requestedBy || null,
    summary,
    sourceRows: rows,
    successfulUsers: mappingWithSubscriptionStatus,
    failedRows,
    subscriptionAssignment,
    logFileName: logInfo.logFileName,
    logFilePath: logInfo.logPath,
  });

  return {
    success: true,
    dryRun: false,
    totalRows: rows.length,
    validRows: validEntries.length,
    inserted: insertedUsers.length,
    failed: failedRows.length,
    mapping: mappingWithSubscriptionStatus,
    successfulUsers: successfulUsersWithSubscriptionStatus,
    failedRows,
    summary,
    subscriptionAssignment,
    importLog: {
      importId,
      fileName: logInfo.logFileName,
    },
  };
}

async function importSrReceiptUsersFromExcel(buffer, options = {}) {
  if (options.trackedImport) {
    const resumed = await resumeTrackedImport(StudentUser, options);
    if (resumed) return resumed;
  }
  const dryRun = options.dryRun === true;
  const assignSubscriptions = options.assignSubscriptions === true;
  const importId = createImportId().replace("school-students", "sr-receipts");
  const rows = readWorkbookRows(buffer);
  if ((options.atomicImport || options.trackedImport) && (!rows.length || rows.length > 5000)) {
    throw new Error("Upload 1–5,000 student rows");
  }
  const failedRows = [];
  const validEntries = [];
  const seenUsernames = new Set();
  const seenReceipts = new Set();
  const seenEmails = new Set();
  const seenPhones = new Set();

  rows.forEach((row, index) => {
    const rowNumber = index + 2;

    try {
      const entry = buildSrReceiptUser(row);
      const schemaError = new StudentUser(entry.user).validateSync();
      if (schemaError) throw new Error(schemaError.message);

      if (seenReceipts.has(entry.user.receipt_no)) {
        throw new Error(`duplicate receipt_no in sheet: ${entry.user.receipt_no}`);
      }

      if (seenUsernames.has(entry.user.username)) {
        throw new Error(`duplicate username in sheet: ${entry.user.username}`);
      }

      if (entry.user.email && seenEmails.has(entry.user.email)) {
        throw new Error(`duplicate email in sheet: ${entry.user.email}`);
      }

      if (entry.user.phone && seenPhones.has(entry.user.phone)) {
        throw new Error(buildDuplicatePhoneInSheetMessage(entry.user.phone));
      }

      seenUsernames.add(entry.user.username);
      seenReceipts.add(entry.user.receipt_no);
      if (entry.user.email) {
        seenEmails.add(entry.user.email);
      }
      if (entry.user.phone) {
        seenPhones.add(entry.user.phone);
      }
      validEntries.push({
        rowNumber,
        ...entry,
      });
    } catch (err) {
      const receiptNo = normalizeReceiptNo(
        getRowValue(row, ["receipt_no", "Receipt No", "Receipt Number", "RECEIPT NO (OR) ADMISSION NO"])
      );

      failedRows.push({
        rowNumber,
        username: receiptNo || "UNKNOWN",
        receipt_no: receiptNo || "UNKNOWN",
        error: err.message,
      });
    }
  });

  if (validEntries.length === 0) {
    return {
      success: false,
      dryRun,
      totalRows: rows.length,
      validRows: 0,
      inserted: 0,
      failed: failedRows.length,
      mapping: [],
      failedRows,
      message: "No valid SR receipt users found in the uploaded file",
    };
  }

  const usernames = validEntries.map((entry) => entry.user.username);
  const receiptNos = validEntries.map((entry) => entry.user.receipt_no);
  const emails = validEntries.map((entry) => entry.user.email).filter(Boolean);
  const phones = validEntries.map((entry) => entry.user.phone).filter(Boolean);
  const existingUserQuery = [
    { username: { $in: usernames } },
    { receipt_no: { $in: receiptNos } },
  ];

  if (emails.length > 0) {
    existingUserQuery.push({ email: { $in: emails } });
  }

  if (phones.length > 0) {
    existingUserQuery.push({ phone: { $in: phones } });
  }

  const existingUsers = await StudentUser.find(
    { $or: existingUserQuery },
    { username: 1, receipt_no: 1, email: 1, phone: 1, user_type: 1, school_type: 1 }
  ).lean();

  const existingUsernameSet = new Set(existingUsers.map((user) => user.username).filter(Boolean));
  const existingReceiptByNo = new Map(
    existingUsers
      .filter((user) => user.receipt_no)
      .map((user) => [user.receipt_no, user])
  );
  const existingEmailSet = new Set(existingUsers.map((user) => user.email).filter(Boolean));
  const existingPhoneSet = new Set(existingUsers.map((user) => user.phone).filter(Boolean));
  const newEntries = [];

  validEntries.forEach((entry) => {
    if (existingReceiptByNo.has(entry.user.receipt_no)) {
      failedRows.push({
        rowNumber: entry.rowNumber,
        username: entry.user.username,
        user_type: entry.user.user_type,
        receipt_no: entry.user.receipt_no,
        error: buildReceiptAlreadyExistsMessage(
          existingReceiptByNo.get(entry.user.receipt_no)
        ),
      });
      return;
    }

    if (existingUsernameSet.has(entry.user.username)) {
      failedRows.push({
        rowNumber: entry.rowNumber,
        username: entry.user.username,
        user_type: entry.user.user_type,
        receipt_no: entry.user.receipt_no,
        error: "username already exists in database",
      });
      return;
    }

    if (entry.user.email && existingEmailSet.has(entry.user.email)) {
      failedRows.push({
        rowNumber: entry.rowNumber,
        username: entry.user.username,
        receipt_no: entry.user.receipt_no,
        error: "email already exists in database",
      });
      return;
    }

    if (entry.user.phone && existingPhoneSet.has(entry.user.phone)) {
      failedRows.push({
        rowNumber: entry.rowNumber,
        username: entry.user.username,
        receipt_no: entry.user.receipt_no,
        phone: entry.user.phone,
        error: buildPhoneAlreadyExistsMessage(entry.user.phone),
      });
      return;
    }

    newEntries.push(entry);
  });

  if (dryRun) {
    return {
      success: true,
      dryRun: true,
      totalRows: rows.length,
      validRows: validEntries.length,
      readyToInsert: newEntries.length,
      inserted: 0,
      failed: failedRows.length,
      preview: newEntries.slice(0, options.fullPreview ? undefined : 20).map((entry) => ({
        rowNumber: entry.rowNumber,
        username: entry.user.username,
        receipt_no: entry.user.receipt_no,
        first_name: entry.user.first_name,
        last_name: entry.user.last_name,
        email: entry.user.email,
        phone: entry.user.phone,
        school_code: entry.user.school_code,
        school_type: entry.user.school_type,
        school_name: entry.user.school_name,
        school_address: entry.user.school_address,
        branch: entry.user.branch,
        executive_phone: entry.user.executive_phone,
        executive_name: entry.user.executive_name,
        class: entry.user.class,
        section: entry.user.section,
        preparing_for: entry.user.preparing_for,
        dob: entry.user.dob,
        gender: entry.user.gender,
      })),
      failedRows,
    };
  }

  if (newEntries.length === 0) {
    return {
      success: false,
      dryRun,
      totalRows: rows.length,
      validRows: validEntries.length,
      inserted: 0,
      failed: failedRows.length,
      mapping: [],
      failedRows,
      message: "No new SR receipt users to insert; all rows already exist or failed validation",
    };
  }

  if (options.atomicImport || options.trackedImport) {
    if (failedRows.length || newEntries.length !== rows.length) {
      return { success: false, totalRows: rows.length, inserted: 0, failed: failedRows.length, failedRows, message: "Some rows failed validation. Correct errors or remove existing-user rows and submit those separately to the admin office, then validate again." };
    }
    if (options.trackedImport) return insertTrackedUsers(StudentUser, await hashUsersInBatches(newEntries), rows, options);
    return insertDataEntryUsers(newEntries, rows, options);
  }

  const entriesWithHashedPasswords = await hashUsersInBatches(newEntries);
  const insertedUsers = await StudentUser.insertMany(
    entriesWithHashedPasswords.map((entry) => entry.user),
    { ordered: false }
  );

  const passwordByUsername = new Map(
    entriesWithHashedPasswords.map((entry) => [
      entry.user.username,
      entry.tempPassword,
    ])
  );

  const mapping = insertedUsers.map((user) => ({
    first_name: user.first_name,
    last_name: user.last_name,
    email: user.email,
    phone: user.phone,
    username: user.username,
    user_type: user.user_type,
    receipt_no: user.receipt_no,
    admission_number: user.admission_number,
    password: passwordByUsername.get(user.username) || user.temp_password,
    school_code: user.school_code,
    school_type: user.school_type,
    school_name: user.school_name,
    school_address: user.school_address,
    branch: user.branch,
    executive_name: user.executive_name,
    executive_phone: user.executive_phone,
    class: user.class,
    section: user.section,
    preparing_for: user.preparing_for,
    dob: user.dob,
    gender: user.gender,
    user_id: user._id.toString(),
    import_status: "Inserted",
  }));

  const successfulUsers = mapping.map((user) => ({ ...user }));
  const subscriptionAssignment = assignSubscriptions
    ? await assignSubscriptionsToUsers(
        mapping.map((user) => user.user_id),
        {
          adminToken: options.subscriptionAdminToken,
          planId: options.subscriptionPlanId,
        }
      )
    : {
        status: "skipped",
        message: "Subscription assignment was not requested",
        assigned: 0,
        failed: 0,
        batches: [],
      };

  const mappingWithSubscriptionStatus = applySubscriptionStatus(
    mapping,
    subscriptionAssignment
  );
  const successfulUsersWithSubscriptionStatus = applySubscriptionStatus(
    successfulUsers,
    subscriptionAssignment
  );
  const summary = {
    totalRecords: rows.length,
    successfullyInserted: insertedUsers.length,
    failedRecords: failedRows.length,
    subscriptionAssignmentStatus: subscriptionAssignment.status,
  };

  const logInfo = writeImportLog(importId, {
    importId,
    importType: "sr_receipt_users",
    createdAt: new Date().toISOString(),
    sourceFileName: options.sourceFileName || null,
    requestedBy: options.requestedBy || null,
    summary,
    sourceRows: rows,
    successfulUsers: mappingWithSubscriptionStatus,
    failedRows,
    subscriptionAssignment,
  });

  await saveImportLogToDatabase({
    importId,
    importType: "sr_receipt_users",
    sourceFileName: options.sourceFileName || null,
    dryRun: false,
    requestedBy: options.requestedBy || null,
    summary,
    sourceRows: rows,
    successfulUsers: mappingWithSubscriptionStatus,
    failedRows,
    subscriptionAssignment,
    logFileName: logInfo.logFileName,
    logFilePath: logInfo.logPath,
  });

  return {
    success: true,
    dryRun: false,
    totalRows: rows.length,
    validRows: validEntries.length,
    inserted: insertedUsers.length,
    failed: failedRows.length,
    mapping: mappingWithSubscriptionStatus,
    successfulUsers: successfulUsersWithSubscriptionStatus,
    failedRows,
    summary,
    subscriptionAssignment,
    importLog: {
      importId,
      fileName: logInfo.logFileName,
    },
  };
}

async function importOfflineReceiptUsersFromExcel(buffer, options = {}) {
  const dryRun = options.dryRun === true;
  const assignSubscriptions = options.assignSubscriptions === true;
  const importId = createImportId().replace("school-students", "offline-receipts");
  const rows = readWorkbookRows(buffer);
  const failedRows = [];
  const validEntries = [];
  const seenReceipts = new Set();
  const seenPhones = new Set();

  rows.forEach((row, index) => {
    const rowNumber = index + 2;

    try {
      const receiptFields = buildOfflineReceiptFields(row);

      if (seenReceipts.has(receiptFields.receipt_no)) {
        throw new Error(`duplicate receipt_no in sheet: ${receiptFields.receipt_no}`);
      }

      if (receiptFields.phone && seenPhones.has(receiptFields.phone)) {
        throw new Error(buildDuplicatePhoneInSheetMessage(receiptFields.phone));
      }

      seenReceipts.add(receiptFields.receipt_no);
      if (receiptFields.phone) {
        seenPhones.add(receiptFields.phone);
      }
      validEntries.push({
        rowNumber,
        receiptFields,
      });
    } catch (err) {
      failedRows.push({
        rowNumber,
        receipt_no:
          normalizeReceiptNo(
            getRowValue(row, ["receipt_no", "Receipt No", "Receipt Number", "RECEIPT NO (OR) ADMISSION NO"])
          ) || "UNKNOWN",
        error: err.message,
      });
    }
  });

  if (validEntries.length === 0) {
    return {
      success: false,
      dryRun,
      totalRows: rows.length,
      validRows: 0,
      inserted: 0,
      updated: 0,
      failed: failedRows.length,
      mapping: [],
      failedRows,
      message: "No valid receipt users found in the uploaded file",
    };
  }

  const receiptNos = validEntries.map((entry) => entry.receiptFields.receipt_no);
  const phones = validEntries.map((entry) => entry.receiptFields.phone).filter(Boolean);
  const existingReceiptQuery = [{ receipt_no: { $in: receiptNos } }];

  if (phones.length > 0) {
    existingReceiptQuery.push({ phone: { $in: phones } });
  }

  const existingReceiptUsers = await StudentUser.find(
    { $or: existingReceiptQuery },
    { receipt_no: 1, phone: 1 }
  ).lean();
  const existingReceiptSet = new Set(
    existingReceiptUsers.map((user) => user.receipt_no).filter(Boolean)
  );
  const existingPhoneSet = new Set(
    existingReceiptUsers.map((user) => user.phone).filter(Boolean)
  );
  const readyEntries = [];

  validEntries.forEach((entry) => {
    if (existingReceiptSet.has(entry.receiptFields.receipt_no)) {
      failedRows.push({
        rowNumber: entry.rowNumber,
        receipt_no: entry.receiptFields.receipt_no,
        error: buildReceiptAlreadyExistsMessage(),
      });
      return;
    }

    if (entry.receiptFields.phone && existingPhoneSet.has(entry.receiptFields.phone)) {
      failedRows.push({
        rowNumber: entry.rowNumber,
        receipt_no: entry.receiptFields.receipt_no,
        phone: entry.receiptFields.phone,
        error: buildPhoneAlreadyExistsMessage(entry.receiptFields.phone),
      });
      return;
    }

    readyEntries.push(entry);
  });

  if (dryRun) {
    return {
      success: true,
      dryRun: true,
      totalRows: rows.length,
      validRows: validEntries.length,
      readyToProcess: readyEntries.length,
      inserted: 0,
      updated: 0,
      failed: failedRows.length,
      preview: readyEntries.slice(0, 20).map((entry) => ({
        rowNumber: entry.rowNumber,
        receipt_no: entry.receiptFields.receipt_no,
        first_name: entry.receiptFields.first_name,
        last_name: entry.receiptFields.last_name,
        email: entry.receiptFields.email,
        phone: entry.receiptFields.phone,
        school_name: entry.receiptFields.school_name,
        school_type: entry.receiptFields.school_type,
        school_code: entry.receiptFields.school_code,
        school_address: entry.receiptFields.school_address,
        branch: entry.receiptFields.branch,
        executive_phone: entry.receiptFields.executive_phone,
        executive_name: entry.receiptFields.executive_name,
        dob: entry.receiptFields.dob,
        gender: entry.receiptFields.gender,
        class: entry.receiptFields.class,
        section: entry.receiptFields.section,
        preparing_for: entry.receiptFields.preparing_for,
      })),
      failedRows,
    };
  }

  if (readyEntries.length === 0) {
    return {
      success: false,
      dryRun,
      totalRows: rows.length,
      validRows: validEntries.length,
      inserted: 0,
      updated: 0,
      failed: failedRows.length,
      mapping: [],
      failedRows,
      message: "No new receipt users to insert; all rows already exist or failed validation",
    };
  }

  const mapping = [];

  for (const entry of readyEntries) {
    try {
      const result = await createOrUpdateOfflineReceiptUser(entry.receiptFields);

      mapping.push({
        action: result.action,
        receipt_no: result.user.receipt_no,
        first_name: result.user.first_name,
        last_name: result.user.last_name,
        email: result.user.email,
        phone: result.user.phone,
        username: result.user.username,
        user_type: result.user.user_type,
        user_id: result.user._id.toString(),
        school_name: result.user.school_name,
        school_type: result.user.school_type,
        school_code: result.user.school_code,
        school_address: result.user.school_address,
        branch: result.user.branch,
        executive_name: result.user.executive_name,
        executive_phone: result.user.executive_phone,
        dob: result.user.dob,
        gender: result.user.gender,
        class: result.user.class,
        section: result.user.section,
        preparing_for: result.user.preparing_for,
        import_status: result.action,
      });
    } catch (err) {
      failedRows.push({
        rowNumber: entry.rowNumber,
        receipt_no: entry.receiptFields.receipt_no,
        error: err.message,
      });
    }
  }

  const userIds = mapping.map((user) => user.user_id);
  const subscriptionAssignment =
    assignSubscriptions && userIds.length > 0
      ? await assignSubscriptionsToUsers(userIds, {
          adminToken: options.subscriptionAdminToken,
          planId: options.subscriptionPlanId,
        })
      : {
          status: "skipped",
          message: "Subscription assignment was not requested",
          assigned: 0,
          failed: 0,
          batches: [],
        };

  const mappingWithSubscriptionStatus = applySubscriptionStatus(
    mapping,
    subscriptionAssignment
  );
  const inserted = mappingWithSubscriptionStatus.filter((user) => user.action === "Inserted").length;
  const updated = mappingWithSubscriptionStatus.filter((user) => user.action === "Updated").length;
  const summary = {
    totalRecords: rows.length,
    successfullyProcessed: mapping.length,
    inserted,
    updated,
    failedRecords: failedRows.length,
    subscriptionAssignmentStatus: subscriptionAssignment.status,
  };

  const logInfo = writeImportLog(importId, {
    importId,
    importType: "offline_receipt_users",
    createdAt: new Date().toISOString(),
    sourceFileName: options.sourceFileName || null,
    requestedBy: options.requestedBy || null,
    summary,
    sourceRows: rows,
    successfulUsers: mappingWithSubscriptionStatus,
    failedRows,
    subscriptionAssignment,
  });

  await saveImportLogToDatabase({
    importId,
    importType: "offline_receipt_users",
    sourceFileName: options.sourceFileName || null,
    dryRun: false,
    requestedBy: options.requestedBy || null,
    summary,
    sourceRows: rows,
    successfulUsers: mappingWithSubscriptionStatus,
    failedRows,
    subscriptionAssignment,
    logFileName: logInfo.logFileName,
    logFilePath: logInfo.logPath,
  });

  return {
    success: mapping.length > 0,
    dryRun: false,
    totalRows: rows.length,
    validRows: validEntries.length,
    inserted,
    updated,
    failed: failedRows.length,
    mapping: mappingWithSubscriptionStatus,
    successfulUsers: mappingWithSubscriptionStatus,
    failedRows,
    summary,
    subscriptionAssignment,
    importLog: {
      importId,
      fileName: logInfo.logFileName,
    },
  };
}

async function validateSrReceiptSheet(buffer) {
  const rows = readWorkbookRows(buffer);
  if (!rows.length) throw new Error("The first sheet is empty. Add headers and student rows.");
  if (rows.length > 5000) throw new Error("Please upload at most 5,000 students per file.");
  const result = await importSrReceiptUsersFromExcel(buffer, {
    dryRun: true,
    assignSubscriptions: false,
    fullPreview: true,
  });
  const errors = new Map(result.failedRows.map((row) => [row.rowNumber, row.error]));
  return {
    ...result,
    report: rows.map((row, index) => {
      const original = { ...row };
      // Remove report metadata when a previously downloaded sheet is revalidated.
      delete original["Validation Row"];
      delete original["Validation Status"];
      delete original["Validation Error"];
      return errors.size > 0 ? {
        ...original,
        "Validation Row": index + 2,
        "Validation Status": errors.has(index + 2) ? "Needs correction" : "Valid",
        "Validation Error": errors.get(index + 2) || "",
      } : original;
    }),
  };
}

// Commit students and their history together on the same MongoDB connection.
// Transactions deliberately fail closed if the database does not support them.
async function insertDataEntryUsers(entries, sourceRows, options) {
  const hashed = await hashUsersInBatches(entries);
  const session = await StudentUser.db.startSession();
  const now = new Date();
  let inserted = 0;
  try {
    await session.withTransaction(async () => {
      const users = await StudentUser.insertMany(hashed.map((entry) => ({ ...entry.user, temp_password: null })), { session, ordered: true });
      const successfulUsers = users.map((user, index) => ({
        ...Object.fromEntries(["first_name", "last_name", "email", "phone", "username", "user_type", "receipt_no", "admission_number", "school_code", "school_type", "school_name", "school_address", "branch", "executive_name", "executive_phone", "class", "section", "preparing_for", "dob", "gender"].map((key) => [key, user[key] ?? null])),
        user_id: String(user._id), encrypted_initial_password: encryptInitialPassword(hashed[index].tempPassword),
        rowNumber: entries[index].rowNumber, import_status: "Inserted", subscription_status: "Pending",
        inserted_at: now,
      }));
      // _id is deterministic so simultaneous retries cannot commit duplicate batches.
      await StudentUser.db.collection("school_student_import_logs").insertOne({
        _id: new StudentUser.db.base.Types.ObjectId(options.importId.replace("data-entry-", "")), import_id: options.importId, import_type: "sr_receipt_users",
        source_file_name: options.sourceFileName, dry_run: false, requested_by: options.requestedBy,
        validated_at: options.validatedAt, inserted_at: now, insertion_status: "Inserted",
        summary: { totalRecords: sourceRows.length, successfullyInserted: users.length, failedRecords: 0, subscriptionAssignmentStatus: "skipped" },
        source_rows: sourceRows, successful_users: successfulUsers, failed_rows: [],
        subscription_assignment: { status: "skipped", assigned: 0, failed: 0, batches: [], message: "Awaiting accountant subscription assignment" },
        created_at: now, updated_at: now,
      }, { session });
      inserted = users.length;
    });
  } finally { await session.endSession(); }
  return { success: true, importId: options.importId, inserted, totalRows: sourceRows.length, failed: 0, failedRows: [], message: "Inserted successfully. Subscriptions will activate within 24 hours." };
}

module.exports = {
  validateSrReceiptSheet,
  importSchoolStudentsFromExcel,
  importSrReceiptUsersFromExcel,
  importOfflineReceiptUsersFromExcel,
};
