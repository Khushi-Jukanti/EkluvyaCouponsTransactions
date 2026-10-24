const test = require("node:test");
const assert = require("node:assert/strict");
const vm = require("node:vm");
const fs = require("node:fs");
const path = require("node:path");
const id = "aaaaaaaaaaaaaaaaaaaaaaaa";
function fixture({ status = "Pending", response = { failed: 0 }, error, locked = false } = {}) {
  const log = { successful_users: [{ user_id: id, subscription_status: status }, { user_id: "bbbbbbbbbbbbbbbbbbbbbbbb", subscription_status: "Pending" }] };
  const state = { calls: 0, updates: [] };
  const module = { exports: {} };
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, "../services/studentReview.service.js"), "utf8"), { module, process: { env: { SUBSCRIPTION_ENDPOINT: "https://example.test/assign" } }, require: name => name === "axios" ? { post: async () => { state.calls++; if (error) throw error; return { data: response }; } } : {
    findOneAndUpdate: () => ({ lean: async () => locked ? null : log }),
    updateOne: async (query, update, options) => {
      state.updates.push(update);
      if (options) for (const user of log.successful_users) if (options.arrayFilters[0]["student.user_id"].$in.includes(user.user_id)) for (const [key, value] of Object.entries(update.$set)) user[key.replace("successful_users.$[student].", "")] = value;
    },
  } });
  return { state, log, run: overrides => module.exports.approveStudents({ importId: "import-1", userIds: [id], adminToken: "secret", planId: "plan", reviewer: { id: "accountant" }, ...overrides }) };
}
test("assigns only selected students and audits approval without storing the token", async () => {
  const { run, log, state } = fixture();
  assert.equal((await run()).status, "Assigned");
  assert.equal(log.successful_users[0].approved_by.id, "accountant");
  assert.equal(log.successful_users[1].subscription_status, "Pending");
  assert.equal(JSON.stringify(state.updates).includes("secret"), false);
});
test("already assigned and foreign student IDs never call subscription API", async () => {
  for (const setup of [{ status: "Assigned" }, {}]) {
    const { run, state } = fixture(setup);
    await assert.rejects(run(setup.status ? {} : { userIds: ["cccccccccccccccccccccccc"] }));
    assert.equal(state.calls, 0);
  }
});
test("concurrent locked import cannot assign", async () => {
  const { run, state } = fixture({ locked: true }); await assert.rejects(run()); assert.equal(state.calls, 0);
});
test("timeout is not retried and is marked needs verification", async () => {
  const { run, state } = fixture({ error: new Error("timeout") });
  assert.equal((await run()).status, "Needs verification"); assert.equal(state.calls, 1);
});
test("partial external result never labels every selected student assigned", async () => {
  const { run } = fixture({ response: { failed: 1 } }); assert.equal((await run()).status, "Needs verification");
});
test("invalid token response marks selected students failed", async () => {
  const { run } = fixture({ error: { response: { status: 401 } } }); assert.equal((await run()).status, "Failed");
});
