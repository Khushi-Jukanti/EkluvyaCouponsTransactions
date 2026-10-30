const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const { createRequire } = require("node:module");
const bcrypt = require("bcryptjs");
const { createHash } = require("node:crypto");

function load(relative, mocks) {
  const filename = path.resolve(__dirname, "..", relative);
  const nativeRequire = createRequire(filename);
  const module = { exports: {} };
  vm.runInNewContext(fs.readFileSync(filename, "utf8"), {
    require: id => Object.hasOwn(mocks, id) ? mocks[id] : nativeRequire(id),
    module, exports: module.exports, __dirname: path.dirname(filename), Buffer, console, process,
  }, { filename });
  return module.exports;
}

function routes(overrides = {}) {
  const state = { created: null, query: null, options: null, existing: null, log: null };
  const operator = { _id: "aaaaaaaaaaaaaaaaaaaaaaaa", name: "Operator", email: "operator@example.com", phone: "9876543210", role: "data_entry" };
  const Operator = {
    db: { name: "test" },
    collection: { name: "users", findOne: async query => { state.query = query; return state.existing; } },
    init: async () => {}, create: async value => { state.created = value; },
    findOne: query => { state.query = query; return { select: async () => operator, then: resolve => Promise.resolve(operator).then(resolve) }; },
    ...overrides.Operator,
  };
  const router = load("routes/data-entry.routes.js", {
    "../models/data-entry-user.model": Operator,
    "../models/data-entry-validation.model": { findOne: async query => { state.validationQuery = query; return overrides.validation || null; }, create: async value => ({ ...value, _id: "bbbbbbbbbbbbbbbbbbbbbbbb", createdAt: new Date() }) },
    "../middleware/auth": (req, res, next) => next(),
    "../services/schoolStudentsBulkImport.service": { validateSrReceiptSheet: async () => ({}), importSrReceiptUsersFromExcel: async (buffer, options) => { state.options = options; return { success: true }; } },
    "../services/schoolStudentsImportHistory.service": { getImportLog: async (id, owner) => { state.owner = owner; return state.log; }, listImportLogs: async options => { state.options = options; return { items: [] }; } },
  });
  async function call(method, route, req = {}) {
    const layer = router.stack.find(layer => layer.route?.path === route && layer.route.methods[method]);
    const res = { code: 200, status(code) { this.code = code; return this; }, json(body) { this.body = body; return this; } };
    await layer.route.stack.at(-1).handle({ body: {}, query: {}, params: {}, operator: { id: operator._id }, ...req }, res);
    return res;
  }
  return { state, call, operator };
}

const registration = { name: "Staff", email: "STAFF@example.com", phone: "9876543210", school_name: "School", location: "Hyderabad", zonal_name: "Zonal Manager", password: "StrongPass123" };
test("registration hashes passwords, normalizes email, and never accepts a privileged role", async () => {
  const { state, call } = routes();
  const result = await call("post", "/register", { body: { ...registration, role: "accountant" } });
  assert.equal(result.code, 201);
  assert.equal(state.created.role, "data_entry");
  assert.equal(state.created.email, "staff@example.com");
  assert.notEqual(state.created.password, registration.password);
  assert.equal(await bcrypt.compare(registration.password, state.created.password), true);
});
test("existing email or phone blocks registration without replacing the account", async () => {
  const { state, call } = routes(); state.existing = { role: "agent" };
  assert.equal((await call("post", "/register", { body: registration })).code, 409);
  assert.equal(state.created, null);
  assert.equal(state.query.$or.length, 3);
});
test("malformed registration cannot create an account", async () => {
  const { state, call } = routes();
  assert.equal((await call("post", "/register", { body: { ...registration, phone: "123" } })).code, 400);
  assert.equal(state.created, null);
});
test("login queries the data-entry role and rejects a wrong password", async () => {
  const { state, call, operator } = routes();
  operator.password = await bcrypt.hash("ActualPassword", 4);
  const result = await call("post", "/login", { body: { identifier: "OPERATOR@example.com", password: "WrongPassword" } });
  assert.equal(result.code, 401);
  assert.equal(state.query.role, "data_entry");
  assert.equal(state.query.email, "operator@example.com");
});
test("login rejects an account missing from the users collection", async () => {
  const { call } = routes({ Operator: { findOne: () => ({ select: async () => null }) } });
  const result = await call("post", "/login", { body: { identifier: "missing@example.com", password: "SomePassword123" } });
  assert.equal(result.code, 401);
  assert.equal(result.body.message, "Invalid email/phone or password.");
});
test("a registered operator can sign in with their saved password", async () => {
  const { state, call, operator } = routes();
  const registered = await call("post", "/register", { body: registration });
  assert.equal(registered.code, 201);
  Object.assign(operator, state.created);
  const secret = process.env.JWT_SECRET;
  process.env.JWT_SECRET = "operator-login-test-secret";
  try {
    const result = await call("post", "/login", { body: { identifier: registration.email, password: registration.password } });
    assert.equal(result.code, 200);
    assert.equal(result.body.role, "data_entry");
    assert.equal(result.body.user.email, registration.email.toLowerCase());
    assert.ok(result.body.token);
  } finally {
    if (secret === undefined) delete process.env.JWT_SECRET;
    else process.env.JWT_SECRET = secret;
  }
});
test("history list and details always use authenticated ownership", async () => {
  const { state, call } = routes();
  await call("get", "/history", { query: { requestedById: "another-operator" } });
  assert.equal(state.options.requestedById, "aaaaaaaaaaaaaaaaaaaaaaaa");
  const result = await call("get", "/history/:importId", { params: { importId: "other-import" } });
  assert.equal(result.code, 404);
  assert.equal(state.owner, "aaaaaaaaaaaaaaaaaaaaaaaa");
});
test("insertion requires an owned successful validation for the exact file", async () => {
  const { state, call } = routes(); const buffer = Buffer.from("changed file");
  const result = await call("post", "/insert", { body: { validationId: "bbbbbbbbbbbbbbbbbbbbbbbb" }, file: { buffer } });
  assert.equal(result.code, 400);
  assert.equal(state.validationQuery.operator_id, "aaaaaaaaaaaaaaaaaaaaaaaa");
  assert.equal(state.validationQuery.file_hash, createHash("sha256").update(buffer).digest("hex"));
  assert.equal(state.options, null);
});
test("operator insertion forcibly disables subscriptions and uses tracked import", async () => {
  const { state, call } = routes({ validation: { _id: "bbbbbbbbbbbbbbbbbbbbbbbb", createdAt: new Date() } });
  const result = await call("post", "/insert", { body: { validationId: "bbbbbbbbbbbbbbbbbbbbbbbb", assignSubscriptions: true, planId: "malicious-plan" }, file: { buffer: Buffer.from("sheet"), originalname: "students.csv" } });
  assert.equal(result.code, 200);
  assert.equal(state.options.assignSubscriptions, false);
  assert.equal(state.options.trackedImport, true);
  assert.equal(state.options.subscriptionPlanId, undefined);
});
test("repeating a committed import returns the existing result without inserting again", async () => {
  const { state, call } = routes({ validation: { _id: "bbbbbbbbbbbbbbbbbbbbbbbb" } });
  state.log = { successful_users: [{ user_id: "student" }] };
  const result = await call("post", "/insert", { body: { validationId: "bbbbbbbbbbbbbbbbbbbbbbbb" }, file: { buffer: Buffer.from("sheet") } });
  assert.equal(result.body.inserted, 1); assert.equal(state.options, null);
});
test("an incomplete history record resumes instead of returning false success", async () => {
  const { state, call } = routes({ validation: { _id: "bbbbbbbbbbbbbbbbbbbbbbbb" } });
  state.log = { insertion_status: "Partial", successful_users: [{ user_id: "student" }] };
  await call("post", "/insert", { body: { validationId: "bbbbbbbbbbbbbbbbbbbbbbbb" }, file: { buffer: Buffer.from("sheet") } });
  assert.equal(state.options.trackedImport, true);
});

function importer({ existing = [], failHistory = false } = {}) {
  const state = { students: [], logs: [], rolledBack: false };
  const session = { async withTransaction(fn) { try { await fn(); } catch (error) { state.students = []; state.logs = []; state.rolledBack = true; throw error; } }, async endSession() {} };
  class Student { validateSync() { return null; } }
  Student.find = () => ({ lean: async () => existing });
  Student.insertMany = async users => { state.students = users.map((user, i) => ({ ...user, _id: `student-${i}` })); return state.students; };
  Student.db = { startSession: async () => session, base: { Types: { ObjectId: class { constructor(value) { this.value = value; } } } }, collection: () => ({ insertOne: async value => { if (failHistory) throw new Error("history unavailable"); state.logs.push(value); } }) };
  const service = load("services/schoolStudentsBulkImport.service.js", {
    "../models/student-user.model": Student,
    "./subscriptionAssignment.service": { assignSubscriptionsToUsers: () => { throw new Error("must not assign"); } },
    "./schoolStudentsImportHistory.service": { saveImportLogToDatabase: () => { throw new Error("must use transaction"); } },
    "./dataEntryCredentials.service": { encryptInitialPassword: value => `encrypted:${value}` },
  });
  return { state, service };
}
const sheet = Buffer.from("receipt_no,first_name,school_name,executive_name,school_address,phone,dob\nREC001,Student,School,Executive,Hyderabad,9876543210,15/08/2012\n");
const options = { atomicImport: true, importId: "data-entry-bbbbbbbbbbbbbbbbbbbbbbbb", requestedBy: { id: "operator" } };
test("database duplicates stop the entire data-entry import", async () => {
  const { state, service } = importer({ existing: [{ receipt_no: "REC001" }] });
  const result = await service.importSrReceiptUsersFromExcel(sheet, options);
  assert.equal(result.success, false); assert.equal(state.students.length, 0);
});
test("one invalid row blocks insertion of otherwise valid students", async () => {
  const { state, service } = importer();
  const mixedSheet = Buffer.concat([sheet, Buffer.from("REC002,,School,Executive,Hyderabad,9876543211,15/08/2012\n")]);
  const result = await service.importSrReceiptUsersFromExcel(mixedSheet, options);
  assert.equal(result.success, false); assert.equal(result.failed, 1); assert.equal(state.students.length, 0);
});
test("valid import commits students and pending history without plaintext initial passwords", async () => {
  const { state, service } = importer();
  const result = await service.importSrReceiptUsersFromExcel(sheet, options);
  assert.equal(result.inserted, 1); assert.equal(state.logs.length, 1);
  assert.equal(state.students[0].temp_password, null);
  assert.equal(state.logs[0].successful_users[0].password, undefined);
  assert.equal(state.logs[0].successful_users[0].subscription_status, "Pending");
});
test("a history-write failure rolls back student insertion", async () => {
  const { state, service } = importer({ failHistory: true });
  await assert.rejects(service.importSrReceiptUsersFromExcel(sheet, options), /history unavailable/);
  assert.equal(state.rolledBack, true); assert.equal(state.students.length, 0);
});
test("initial password encryption round-trips and rejects tampering", () => {
  const service = load("services/dataEntryCredentials.service.js", { crypto: require("node:crypto") });
  const previous = process.env.DATA_ENTRY_CREDENTIAL_KEY;
  process.env.DATA_ENTRY_CREDENTIAL_KEY = "test-key-only";
  try {
    const encrypted = service.encryptInitialPassword("ABCDEF");
    assert.equal(service.restoreInitialPassword({ encrypted_initial_password: encrypted }).password, "ABCDEF");
    const parts = encrypted.split("."); parts[2] = Buffer.from("tampered").toString("base64");
    assert.throws(() => service.restoreInitialPassword({ encrypted_initial_password: parts.join(".") }));
  } finally { if (previous === undefined) delete process.env.DATA_ENTRY_CREDENTIAL_KEY; else process.env.DATA_ENTRY_CREDENTIAL_KEY = previous; }
});
test("assigning a selected student preserves unselected pending statuses", async () => {
  let update;
  const log = { successful_users: [{ user_id: "one", subscription_status: "Pending" }, { user_id: "two", subscription_status: "Pending" }] };
  const service = load("services/schoolStudentsImportHistory.service.js", {
    "../models/school-student-import-log.model": { findOne: async () => log, findOneAndUpdate: (query, value) => { update = value; return { lean: async () => value }; } },
  });
  await service.updateImportLogSubscription("batch", { assigned: 1, status: "completed", batches: [{ success: true, userIds: ["one"], response: { failed: 0 } }] });
  assert.equal(update.$set.successful_users[0].subscription_status, "Assigned");
  assert.equal(update.$set.successful_users[1].subscription_status, "Pending");
});

test("operator registration rejects invalid Indian mobiles before creating an account", async () => {
  for (const phone of ["1234567890", "98765", "+14155552671", "abc9876543210", "00919876543210"]) {
    const { call, state } = routes();
    assert.equal((await call("post", "/register", { body: { ...registration, phone } })).code, 400, phone);
    assert.equal(state.created, null);
  }
});
test("operator registration normalizes an Indian country prefix", async () => {
  const { call, state } = routes();
  assert.equal((await call("post", "/register", { body: { ...registration, phone: "+91 98765-43210" } })).code, 201);
  assert.equal(state.created.phone, "9876543210");
});
test("student validation rejects missing locations, invalid DOBs and invalid mobiles", async () => {
  const cases = [
    { location: "", phone: "9876543210", dob: "15/08/2012", error: /School location is required/ },
    { location: "Hyderabad", phone: "", dob: "15/08/2012", error: /Mobile Number is required/ },
    { location: "Hyderabad", phone: "1234567890", dob: "15/08/2012", error: /valid Indian Mobile Number/ },
    { location: "Hyderabad", phone: "abc9876543210", dob: "15/08/2012", error: /valid Indian Mobile Number/ },
    { location: "Hyderabad", phone: "9876543210", dob: "", error: /DOB.*required/ },
    { location: "Hyderabad", phone: "9876543210", dob: "31/02/2012", error: /Invalid DOB/ },
    { location: "Hyderabad", phone: "9876543210", dob: "01/01/2999", error: /not in the future/ },
  ];
  for (const row of cases) {
    const { service, state } = importer();
    const buffer = Buffer.from(`receipt_no,first_name,school_name,executive_name,SCHOOL LOCATION,Mobile Number,Date of Birth(DOB)\nREC001,Student,School,Executive,${row.location},${row.phone},${row.dob}\n`);
    const result = await service.validateSrReceiptSheet(buffer);
    assert.equal(result.failed, 1);
    assert.match(result.failedRows[0].error, row.error);
    assert.equal(result.report[0]["Validation Status"], "Needs correction");
    assert.match(result.report[0]["Validation Error"], row.error);
    assert.equal(state.students.length, 0);
  }
});
test("student validation accepts a real leap date and normalizes an Indian mobile", async () => {
  const { service } = importer();
  const buffer = Buffer.from("receipt_no,first_name,school_name,executive_name,SCHOOL LOCATION,Mobile Number,Date of Birth(DOB)\nREC001,Student,School,Executive,Hyderabad,+91 98765-43210,29/02/2012\n");
  const result = await service.validateSrReceiptSheet(buffer);
  assert.equal(result.failed, 0);
  assert.equal(result.preview[0].phone, "9876543210");
});

test("accountant history fills missing validator details without replacing the saved name", async () => {
  const operatorId = "aaaaaaaaaaaaaaaaaaaaaaaa";
  const stored = { import_id: `data-entry-${operatorId}`, requested_by: { id: operatorId, role: "data_entry", name: "Name at validation" }, successful_users: [] };
  let selected;
  const service = load("services/schoolStudentsImportHistory.service.js", {
    "../models/school-student-import-log.model": { findOne: () => ({ lean: async () => stored }) },
    "../models/data-entry-user.model": { find: query => {
      assert.equal(query.role, "data_entry");
      assert.equal(query._id.$in[0], operatorId);
      return { select: fields => { selected = fields; return { lean: async () => [{ _id: operatorId, name: "Current name", phone: "9876543210", zonal_name: "Zonal Manager" }] }; } };
    } },
  });
  const result = await service.getImportLog(stored.import_id);
  assert.equal(result.requested_by.name, "Name at validation");
  assert.equal(result.requested_by.phone, "9876543210");
  assert.equal(result.requested_by.zonal_name, "Zonal Manager");
  assert.equal(selected, "name phone zonal_name");
  assert.equal(stored.requested_by.zonal_name, undefined);
});
test("complete validator snapshots do not require a live operator lookup", async () => {
  const stored = { import_id: "data-entry-aaaaaaaaaaaaaaaaaaaaaaaa", requested_by: { id: "aaaaaaaaaaaaaaaaaaaaaaaa", role: "data_entry", name: "Validator", phone: "9876543210", zonal_name: "Zonal Manager" }, successful_users: [] };
  const service = load("services/schoolStudentsImportHistory.service.js", {
    "../models/school-student-import-log.model": { findOne: () => ({ lean: async () => stored }) },
    "../models/data-entry-user.model": { find: () => { throw new Error("Unexpected lookup"); } },
  });
  const result = await service.getImportLog(stored.import_id);
  assert.equal(result.requested_by.zonal_name, "Zonal Manager");
});
