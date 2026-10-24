const axios = require("axios");
const Log = require("../models/school-student-import-log.model");

async function approveStudents({ importId, userIds, adminToken, planId, reviewer }) {
  if (typeof importId !== "string" || !importId.trim()) throw Object.assign(new Error("Select an import."), { status: 400 });
  if (typeof adminToken !== "string" || !adminToken.trim() || typeof planId !== "string" || !planId.trim() || !Array.isArray(userIds) || !userIds.length || userIds.length > 150 || userIds.some(id => typeof id !== "string" || !/^[a-f\d]{24}$/i.test(id)) || new Set(userIds).size !== userIds.length) {
    throw Object.assign(new Error("Provide an admin token, plan and 1–150 distinct students."), { status: 400 });
  }
  if (!process.env.SUBSCRIPTION_ENDPOINT) throw Object.assign(new Error("Subscription endpoint is not configured."), { status: 503 });
  const log = await Log.findOneAndUpdate({ import_id: importId, insertion_status: "Inserted", review_locked: { $ne: true } }, { $set: { review_locked: true } }, { new: true }).lean();
  if (!log) throw Object.assign(new Error("Import is unavailable, incomplete or already being reviewed. Refresh its status."), { status: 409 });
  let started = false;
  try {
    const students = log.successful_users || [];
    if (userIds.some(id => !students.some(user => String(user.user_id) === id && ["Pending", "Failed"].includes(user.subscription_status || "Pending")))) {
      throw Object.assign(new Error("Select only pending or failed students belonging to this import."), { status: 409 });
    }
    const now = new Date();
    const actor = { id: reviewer.id, name: reviewer.name, email: reviewer.email };
    const update = async fields => Log.updateOne({ import_id: importId }, { $set: Object.fromEntries(Object.entries(fields).map(([key, value]) => [`successful_users.$[student].${key}`, value])) }, { arrayFilters: [{ "student.user_id": { $in: userIds } }] });
    await update({ subscription_status: "Processing", subscription_reviewed_at: now, approved_by: actor, approved_at: now, subscription_plan_id: planId.trim() });
    started = true;
    let status = "Needs verification";
    let message = "The result could not be confirmed. Verify these subscriptions before trying again.";
    try {
      const { data } = await axios.post(process.env.SUBSCRIPTION_ENDPOINT, { user_ids: userIds, plan_id: planId.trim() }, { headers: { Authorization: `Bearer ${adminToken.trim()}` }, timeout: 60000 });
      const response = data?.response || data || {};
      if (data?.success === false || response.success === false) { status = "Failed"; message = "The subscription service rejected the assignment."; }
      else if (Number(response.failed || 0) === 0 && (data?.success === true || response.success === true || response.failed === 0 || Number(response.assigned) === userIds.length)) { status = "Assigned"; message = `Subscription assigned to ${userIds.length} students.`; }
      else { message = "The service reported partial failures. Verify the selected students individually before retrying."; }
    } catch (error) {
      if ([400, 401, 403, 422].includes(error.response?.status)) { status = "Failed"; message = "Assignment rejected. Check your admin token and selected plan."; }
    }
    await update({ subscription_status: status, subscription_assigned_at: status === "Assigned" ? new Date() : null });
    const statuses = students.map(user => userIds.includes(String(user.user_id)) ? status : user.subscription_status || "Pending");
    const assigned = statuses.filter(value => value === "Assigned").length;
    const failed = statuses.filter(value => value === "Failed").length;
    await Log.updateOne({ import_id: importId }, {
      $push: { review_attempts: { user_ids: userIds, plan_id: planId.trim(), reviewer: actor, at: now, status } },
      $set: { review_locked: false, "subscription_assignment.assigned": assigned, "subscription_assignment.failed": failed,
        "subscription_assignment.status": assigned === students.length ? "completed" : "partial",
        "summary.subscriptionAssignmentStatus": assigned === students.length ? "completed" : "partial" },
    });
    return { success: status === "Assigned", status, message };
  } catch (error) {
    // After an external call may have started, retain the lock if persistence fails.
    if (!started) await Log.updateOne({ import_id: importId }, { $set: { review_locked: false } });
    throw error;
  }
}
module.exports = { approveStudents };
