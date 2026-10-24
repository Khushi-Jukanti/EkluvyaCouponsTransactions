const test = require("node:test");
const assert = require("node:assert/strict");
const { ObjectId } = require("mongodb");
const { insertTrackedUsers, resumeTrackedImport } = require("../services/dataEntryImport.service");
process.env.DATA_ENTRY_CREDENTIAL_KEY = "standalone-tests-only";

function database() {
  const state = { jobs: new Map(), logs: new Map(), users: new Map(), stopAfter: Infinity, historyFails: false, finalizeFails: false, writes: 0 };
  const jobs = {
    async insertOne(job) { if (state.jobs.has(job._id)) throw Object.assign(new Error("duplicate"), { code: 11000 }); state.jobs.set(job._id, job); },
    async findOne(query) { const job = state.jobs.get(query._id); return job?.operator_id === query.operator_id ? job : null; },
  };
  const histories = {
    async findOne(query) { return state.logs.get(String(query._id)); },
    async updateOne(query, update) {
      if (state.historyFails || (state.finalizeFails && update.$set)) throw new Error("history offline");
      const id = String(query._id);
      if (update.$setOnInsert) { if (!state.logs.has(id)) state.logs.set(id, structuredClone(update.$setOnInsert)); return; }
      const log = state.logs.get(id);
      if (log.insertion_status === "Inserted" || log.summary.successfullyInserted > query["summary.successfullyInserted"].$lte) return;
      for (const [key, value] of Object.entries(update.$set)) {
        if (key.startsWith("summary.")) log.summary[key.slice(8)] = value;
        else log[key] = value;
      }
    },
  };
  const Student = {
    db: { base: { Types: { ObjectId } }, collection: name => name === "data_entry_import_jobs" ? jobs : histories },
    collection: {
      async bulkWrite(operations) {
        state.writes++;
        let count = 0;
        for (const operation of operations) {
          if (count++ >= state.stopAfter) throw Object.assign(new Error("interrupted write"), { code: 91 });
          const { filter, update } = operation.updateOne;
          if (!state.users.has(String(filter._id))) state.users.set(String(filter._id), structuredClone(update.$setOnInsert));
        }
      },
      find(query) { return { toArray: async () => query._id.$in.filter(id => state.users.has(String(id))).map(id => ({ _id: id })) }; },
    },
  };
  return { Student, state };
}
const options = { importId: "data-entry-bbbbbbbbbbbbbbbbbbbbbbbb", requestedBy: { id: "owner" }, sourceFileName: "sheet.csv" };
const entries = () => [1, 2].map(index => ({ rowNumber: index + 1, tempPassword: `PASSWORD${index}`, user: { username: `REC${index}`, receipt_no: `REC${index}`, password: "bcrypt-hash", created_at: new Date() } }));

test("standalone import creates users and encrypted credential history without sessions", async () => {
  const { Student, state } = database();
  const result = await insertTrackedUsers(Student, entries(), [{}, {}], options);
  assert.equal(result.success, true); assert.equal(state.users.size, 2);
  const log = [...state.logs.values()][0];
  assert.equal(log.insertion_status, "Inserted"); assert.equal(log.successful_users.length, 2);
  assert.equal(log.successful_users[0].password, undefined);
  assert.ok(log.successful_users[0].encrypted_initial_password);
  assert.equal([...state.users.values()][0].temp_password, "PASSWORD1");
  assert.equal([...state.users.values()][0].password, "bcrypt-hash");
  assert.equal([...state.jobs.values()][0].entries[0].user.temp_password, null);
});
test("partial write is reported accurately and retry inserts only remaining users", async () => {
  const { Student, state } = database(); state.stopAfter = 1;
  const partial = await insertTrackedUsers(Student, entries(), [{}, {}], options);
  assert.equal(partial.success, false); assert.equal(partial.inserted, 1);
  assert.equal([...state.logs.values()][0].insertion_status, "Partial");
  const existing = [...state.users.values()][0]; existing.password = "student-changed-password"; existing.temp_password = null;
  state.stopAfter = Infinity;
  const result = await resumeTrackedImport(Student, options);
  assert.equal(result.success, true); assert.equal(state.users.size, 2);
  assert.equal([...state.users.values()][0].password, "student-changed-password");
  assert.equal([...state.users.values()][0].temp_password, null);
});
test("history failure before insertion leaves no students and the plan can resume", async () => {
  const { Student, state } = database(); state.historyFails = true;
  await assert.rejects(insertTrackedUsers(Student, entries(), [{}, {}], options), /history offline/);
  assert.equal(state.users.size, 0); assert.equal(state.jobs.size, 1);
  state.historyFails = false;
  assert.equal((await resumeTrackedImport(Student, options)).success, true);
});
test("history failure after insertion recovers original IDs and credentials on retry", async () => {
  const { Student, state } = database(); state.finalizeFails = true;
  await assert.rejects(insertTrackedUsers(Student, entries(), [{}, {}], options), /history offline/);
  const ids = [...state.users.keys()]; const encrypted = [...state.jobs.values()][0].entries[0].encrypted_initial_password;
  state.finalizeFails = false;
  assert.equal((await resumeTrackedImport(Student, options)).success, true);
  assert.deepEqual([...state.users.keys()], ids);
  assert.equal([...state.logs.values()][0].successful_users[0].encrypted_initial_password, encrypted);
});
test("completed retry performs no student writes and other operators cannot resume", async () => {
  const { Student, state } = database();
  await insertTrackedUsers(Student, entries(), [{}, {}], options);
  const writes = state.writes;
  assert.equal((await resumeTrackedImport(Student, options)).success, true);
  assert.equal(state.writes, writes);
  assert.equal(await resumeTrackedImport(Student, { ...options, requestedBy: { id: "another" } }), null);
});
