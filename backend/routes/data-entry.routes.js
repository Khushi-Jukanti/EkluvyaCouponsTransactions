const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const multer = require("multer");
const { createHash } = require("crypto");
const { normalizeIndianMobile } = require("../utils/indianMobile");
const Operator = require("../models/data-entry-user.model");
const Validation = require("../models/data-entry-validation.model");
const verifyToken = require("../middleware/auth");
const requireRole = require("../middleware/role");
const { validateSrReceiptSheet, importSrReceiptUsersFromExcel } = require("../services/schoolStudentsBulkImport.service");
const { listImportLogs, getImportLog } = require("../services/schoolStudentsImportHistory.service");
const router = express.Router();
router.use((req, res, next) => { res.set("Cache-Control", "no-store"); next(); });
const clean = (value) => typeof value === "string" ? value.trim() : "";
const phoneNumber = (value) => clean(value).replace(/[\s()+-]/g, "");
const hash = (buffer) => createHash("sha256").update(buffer).digest("hex");
const profile = (user) => ({ id: String(user._id), name: user.name, email: user.email, phone: user.phone, zonal_name: user.zonal_name, school_name: user.school_name, location: user.location, role: "data_entry" });

router.post("/register", async (req, res) => {
  try {
    const name = clean(req.body.name), email = clean(req.body.email).toLowerCase();
    const phone = normalizeIndianMobile(req.body.phone), school_name = clean(req.body.school_name), location = clean(req.body.location);
    const zonal_name = clean(req.body.zonal_name);
    const password = typeof req.body.password === "string" ? req.body.password : "";
    if (!zonal_name || zonal_name.length > 150 || !name || name.length > 150 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254 || !phone || !school_name || school_name.length > 200 || !location || location.length > 300 || password.length < 8 || Buffer.byteLength(password) > 72) {
      return res.status(400).json({ message: "Enter all details, a valid email and Indian mobile number (10 digits starting with 6–9), and a password of at least 8 characters (maximum 72 bytes)." });
    }
    // Check all existing users, regardless of role. Never convert an existing account.
    const escapedEmail = email.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    if (await Operator.collection.findOne({ $or: [{ email: { $regex: `^${escapedEmail}$`, $options: "i" } }, { phone: { $in: [phone, Number(phone)] } }, { mobile: { $in: [phone, Number(phone)] } }] })) {
      return res.status(409).json({ message: "An account with this email or phone already exists. Please sign in or contact the admin office." });
    }
    await Operator.init(); // Unique indexes also protect simultaneous registrations.
    await Operator.create({ name, email, phone, school_name, location, zonal_name, password: await bcrypt.hash(password, 12), role: "data_entry" });
    return res.status(201).json({ success: true, message: "Registration successful. Please sign in." });
  } catch (error) {
    return res.status(error.code === 11000 ? 409 : 500).json({ message: error.code === 11000 ? "An account with this email or phone already exists." : "Registration could not finish. Please contact the admin office." });
  }
});

router.post("/login", async (req, res) => {
  try {
    const identifier = clean(req.body.identifier);
    const password = typeof req.body.password === "string" ? req.body.password : "";
    if (!identifier || !password || Buffer.byteLength(password) > 72) return res.status(400).json({ message: "Enter your email or phone and password." });
    const user = await Operator.findOne({ role: "data_entry", ...(identifier.includes("@") ? { email: identifier.toLowerCase() } : { phone: normalizeIndianMobile(identifier) || phoneNumber(identifier) }) }).select("+password");
    if (!user) {
      console.warn("Data-entry login rejected", {
        reason: "operator_not_found",
        database: Operator.db.name,
        collection: Operator.collection.name,
      });
      return res.status(401).json({ message: "Invalid email/phone or password." });
    }
    if (typeof user.password !== "string" || !(await bcrypt.compare(password, user.password))) {
      console.warn("Data-entry login rejected", {
        reason: "password_mismatch",
        database: Operator.db.name,
        collection: Operator.collection.name,
      });
      return res.status(401).json({ message: "Invalid email/phone or password." });
    }
    const userProfile = profile(user);
    const token = jwt.sign({ ...userProfile, account_source: "data_entry_users" }, process.env.JWT_SECRET, { expiresIn: "12h" });
    return res.json({ success: true, token, role: "data_entry", user: userProfile });
  } catch {
    return res.status(500).json({ message: "Unable to sign in. Please try again." });
  }
});

router.use(verifyToken, requireRole("data_entry"), async (req, res, next) => {
  try {
    if (req.user.account_source !== "data_entry_users") return res.status(403).json({ message: "Data-entry account required." });
    const user = await Operator.findOne({ _id: req.user.id, role: "data_entry" });
    if (!user) return res.status(401).json({ message: "Account no longer available. Please sign in again." });
    req.operator = profile(user);
    next();
  } catch { res.status(401).json({ message: "Unable to verify your account." }); }
});
router.get("/me", (req, res) => res.json({ user: req.operator }));
const uploader = multer({ storage: multer.memoryStorage(), limits: { fileSize: 15 * 1024 * 1024, files: 1 } }).single("file");
const upload = (req, res, next) => uploader(req, res, (error) => {
  if (error || !req.file || !/\.(xlsx|xls|csv)$/i.test(req.file.originalname)) return res.status(400).json({ message: "Upload an Excel/CSV file no larger than 15 MB." });
  next();
});
router.post("/validate", upload, async (req, res) => {
  try {
    const result = await validateSrReceiptSheet(req.file.buffer);
    const validation = await Validation.create({ operator_id: req.operator.id, operator: req.operator, file_hash: hash(req.file.buffer), source_file_name: req.file.originalname, total_rows: result.totalRows, failed_rows: result.failed, status: result.failed === 0 && result.readyToInsert === result.totalRows ? "valid" : "invalid" });
    res.json({ ...result, validationId: String(validation._id), validatedAt: validation.createdAt });
  } catch { res.status(400).json({ message: "Unable to validate. Use a readable Excel/CSV file with 1–5,000 student rows." }); }
});
router.post("/insert", upload, async (req, res) => {
  try {
    if (!/^[a-f\d]{24}$/i.test(clean(req.body.validationId))) return res.status(400).json({ message: "Validate this sheet before inserting." });
    const validation = await Validation.findOne({ _id: req.body.validationId, operator_id: req.operator.id, status: "valid", file_hash: hash(req.file.buffer) });
    if (!validation) return res.status(400).json({ message: "Validate this exact sheet successfully before inserting." });
    const importId = `data-entry-${validation._id}`;
    const previous = await getImportLog(importId, req.operator.id);
    if (previous && (!previous.insertion_status || previous.insertion_status === "Inserted")) return res.json({ success: true, importId, inserted: previous.successful_users.length, message: "Inserted successfully. Subscriptions will activate within 24 hours." });
    const result = await importSrReceiptUsersFromExcel(req.file.buffer, { trackedImport: true, importId, requestedBy: { ...req.operator, ...validation.operator }, validatedAt: validation.createdAt, sourceFileName: req.file.originalname, assignSubscriptions: false });
    return res.status(result.success ? 200 : 400).json(result);
  } catch (error) {
    console.error("Data-entry insertion failed", { name: error.name, code: error.code, codeName: error.codeName, validationId: clean(req.body.validationId) });
    // A concurrent retry may have committed the same import while this request ran.
    const previous = await getImportLog(`data-entry-${clean(req.body.validationId)}`, req.operator.id).catch(() => null);
    if (previous && (!previous.insertion_status || previous.insertion_status === "Inserted")) return res.json({ success: true, importId: previous.import_id, inserted: previous.successful_users.length, message: "Inserted successfully. Subscriptions will activate within 24 hours." });
    return res.status(409).json({ message: "Insertion could not be confirmed. Check My import history, then retry this same submission. If it still fails, validate again or contact the admin office." });
  }
});
router.get("/history", async (req, res) => {
  try { res.json(await listImportLogs({ page: req.query.page, limit: 20, from: req.query.from, to: req.query.to, requestedById: req.operator.id })); }
  catch { res.status(500).json({ message: "Unable to load your import history." }); }
});
router.get("/history/:importId", async (req, res) => {
  try {
    const log = await getImportLog(req.params.importId, req.operator.id);
    if (!log) return res.status(404).json({ message: "Import not found." });
    res.json({ log });
  } catch { res.status(500).json({ message: "Unable to load this import." }); }
});
module.exports = router;
