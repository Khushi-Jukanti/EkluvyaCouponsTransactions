const path = require("path");
const fs = require("fs");
require("dotenv").config({ path: path.join(__dirname, "..", ".env") });

const XLSX = require("xlsx");
const bcrypt = require("bcryptjs");
const StudentUser = require("../models/student-user.model");

const HASH_CONCURRENCY = 25;
const LOG_DIR = path.join(__dirname, "..", "data", "password-update-logs");

function normalizeKey(key) {
  return String(key || "").trim().toLowerCase().replace(/[\s_.-]+/g, "");
}

function normalizeValue(value) {
  if (value === undefined || value === null) return "";
  return String(value).trim();
}

function getRowValue(row, possibleKeys) {
  const normalizedKeyMap = new Map(
    Object.keys(row).map((key) => [normalizeKey(key), row[key]])
  );

  for (const key of possibleKeys) {
    const normalizedKey = normalizeKey(key);

    if (normalizedKeyMap.has(normalizedKey)) {
      return normalizedKeyMap.get(normalizedKey);
    }
  }

  return "";
}

function readRows(filePath) {
  const workbook = XLSX.readFile(filePath, { cellDates: false });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];

  if (!sheet) {
    throw new Error("Excel file does not contain any sheets");
  }

  return XLSX.utils.sheet_to_json(sheet, { defval: "" }).filter((row) =>
    Object.values(row).some((value) => normalizeValue(value) !== "")
  );
}

function parseArgs() {
  const args = process.argv.slice(2);
  const filePath = args.find((arg) => !arg.startsWith("--"));
  const apply = args.includes("--apply");

  if (!filePath) {
    throw new Error(
      "Usage: node scripts/update-student-passwords-from-excel.js <file.xlsx|file.csv> [--apply]"
    );
  }

  return {
    filePath: path.resolve(process.cwd(), filePath),
    apply,
  };
}

function buildEntries(rows) {
  const failedRows = [];
  const entries = [];
  const seenUsernames = new Set();

  rows.forEach((row, index) => {
    const rowNumber = index + 2;
    const username = normalizeValue(getRowValue(row, ["username", "user_name", "User Name"]));
    const password = normalizeValue(getRowValue(row, ["password", "Password"]));

    if (!username) {
      failedRows.push({ rowNumber, username: "UNKNOWN", error: "username missing" });
      return;
    }

    if (!password) {
      failedRows.push({ rowNumber, username, error: "password missing" });
      return;
    }

    if (seenUsernames.has(username)) {
      failedRows.push({ rowNumber, username, error: "duplicate username in sheet" });
      return;
    }

    seenUsernames.add(username);
    entries.push({ rowNumber, username, password });
  });

  return { entries, failedRows };
}

async function hashEntries(entries) {
  const result = [];

  for (let index = 0; index < entries.length; index += HASH_CONCURRENCY) {
    const batch = entries.slice(index, index + HASH_CONCURRENCY);
    const hashedBatch = await Promise.all(
      batch.map(async (entry) => ({
        ...entry,
        hashedPassword: await bcrypt.hash(entry.password, 10),
      }))
    );

    result.push(...hashedBatch);
  }

  return result;
}

function writeLog(payload) {
  fs.mkdirSync(LOG_DIR, { recursive: true });

  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const logPath = path.join(LOG_DIR, `password-update-${timestamp}.json`);

  fs.writeFileSync(logPath, JSON.stringify(payload, null, 2));

  return logPath;
}

async function main() {
  const { filePath, apply } = parseArgs();

  if (!fs.existsSync(filePath)) {
    throw new Error(`File not found: ${filePath}`);
  }

  const rows = readRows(filePath);
  const { entries, failedRows } = buildEntries(rows);
  const usernames = entries.map((entry) => entry.username);
  const existingUsers = await StudentUser.find(
    { username: { $in: usernames } },
    { username: 1 }
  ).lean();
  const existingUsernameSet = new Set(existingUsers.map((user) => user.username));
  const readyEntries = [];

  entries.forEach((entry) => {
    if (!existingUsernameSet.has(entry.username)) {
      failedRows.push({
        rowNumber: entry.rowNumber,
        username: entry.username,
        error: "username not found in database",
      });
      return;
    }

    readyEntries.push(entry);
  });

  const updatedUsers = [];

  if (apply && readyEntries.length > 0) {
    const hashedEntries = await hashEntries(readyEntries);

    for (const entry of hashedEntries) {
      const result = await StudentUser.updateOne(
        { username: entry.username },
        {
          $set: {
            password: entry.hashedPassword,
            temp_password: entry.password,
            must_change_password: 0,
            login_type: "password",
            updated_at: new Date(),
          },
          $addToSet: {
            auth_methods: "password",
          },
        }
      );

      updatedUsers.push({
        rowNumber: entry.rowNumber,
        username: entry.username,
        matched: result.matchedCount || 0,
        modified: result.modifiedCount || 0,
      });
    }
  }

  const summary = {
    mode: apply ? "apply" : "dry-run",
    totalRows: rows.length,
    validRows: entries.length,
    readyToUpdate: readyEntries.length,
    updated: updatedUsers.filter((user) => user.modified > 0).length,
    failed: failedRows.length,
  };
  const logPath = writeLog({
    createdAt: new Date().toISOString(),
    sourceFile: filePath,
    summary,
    readyUsers: readyEntries.map((entry) => ({
      rowNumber: entry.rowNumber,
      username: entry.username,
    })),
    updatedUsers,
    failedRows,
  });

  console.log("Password update summary");
  console.table(summary);
  console.log(`Log file: ${logPath}`);

  if (!apply) {
    console.log("Dry run only. Re-run with --apply to update passwords.");
  }
}

main()
  .catch((error) => {
    console.error("Password update failed:", error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await StudentUser.db.close();
  });
