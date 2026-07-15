const {
  importOfflineReceiptUsersFromExcel,
  importSchoolStudentsFromExcel,
} = require("../services/schoolStudentsBulkImport.service");
const {
  assignSubscriptionsToUsers,
  fetchSubscriptionPlans,
} = require("../services/subscriptionAssignment.service");
const {
  getImportLog,
  listImportLogs,
  updateImportLogSubscription,
} = require("../services/schoolStudentsImportHistory.service");

const importSchoolStudents = async (req, res) => {
  try {
    if (!req.file || !req.file.buffer) {
      return res.status(400).json({
        success: false,
        message: "Excel file is required. Use multipart/form-data field name: file",
      });
    }

    const dryRun = ["true", "1", "yes"].includes(
      String(req.body.dryRun || "").toLowerCase()
    );
    const assignSubscriptions = ["true", "1", "yes"].includes(
      String(req.body.assignSubscriptions || "").toLowerCase()
    );

    const result = await importSchoolStudentsFromExcel(req.file.buffer, {
      dryRun,
      assignSubscriptions,
      subscriptionAdminToken: req.body.adminToken,
      subscriptionPlanId: req.body.planId,
      sourceFileName: req.file.originalname,
      requestedBy: req.user,
    });

    return res.status(result.success ? 200 : 400).json(result);
  } catch (error) {
    console.error("School students import error:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to import school students",
    });
  }
};

const importOfflineReceiptUsers = async (req, res) => {
  try {
    if (!req.file || !req.file.buffer) {
      return res.status(400).json({
        success: false,
        message: "Excel file is required. Use multipart/form-data field name: file",
      });
    }

    const dryRun = ["true", "1", "yes"].includes(
      String(req.body.dryRun || "").toLowerCase()
    );
    const assignSubscriptions = ["true", "1", "yes"].includes(
      String(req.body.assignSubscriptions || "").toLowerCase()
    );

    const result = await importOfflineReceiptUsersFromExcel(req.file.buffer, {
      dryRun,
      assignSubscriptions,
      subscriptionAdminToken: req.body.adminToken,
      subscriptionPlanId: req.body.planId,
      sourceFileName: req.file.originalname,
      requestedBy: req.user,
    });

    return res.status(result.success ? 200 : 400).json(result);
  } catch (error) {
    console.error("Offline receipt users import error:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to import offline receipt users",
    });
  }
};

const getSubscriptionPlans = async (req, res) => {
  try {
    const adminToken = req.body.adminToken || req.body.token;
    const result = await fetchSubscriptionPlans(adminToken);

    if (!result.success) {
      return res.status(400).json(result);
    }

    return res.json(result);
  } catch (error) {
    console.error("Fetch subscription plans error:", error.response?.data || error.message);
    return res.status(error.response?.status || 500).json({
      success: false,
      message:
        error.response?.data?.message ||
        error.message ||
        "Failed to fetch subscription plans",
      error: error.response?.data || null,
    });
  }
};

const assignSubscriptionToUsers = async (req, res) => {
  try {
    const { userIds, user_ids, adminToken, planId, importId } = req.body;
    const ids = Array.isArray(userIds) ? userIds : user_ids;

    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({
        success: false,
        message: "userIds array is required",
      });
    }

    if (!adminToken && !process.env.SUBSCRIPTION_ADMIN_TOKEN) {
      return res.status(400).json({
        success: false,
        message: "adminToken is required",
      });
    }

    if (!planId && !process.env.SUBSCRIPTION_PLAN_ID) {
      return res.status(400).json({
        success: false,
        message: "planId is required",
      });
    }

    const result = await assignSubscriptionsToUsers(ids, {
      adminToken,
      planId,
    });

    if (importId) {
      await updateImportLogSubscription(importId, result);
    }

    const hasAssignedUsers = Number(result.assigned || 0) > 0;

    return res.json({
      success: hasAssignedUsers,
      subscriptionAssignment: result,
    });
  } catch (error) {
    console.error("Assign subscription error:", error.response?.data || error.message);
    return res.status(error.response?.status || 500).json({
      success: false,
      message:
        error.response?.data?.message ||
        error.message ||
        "Failed to assign subscription",
      error: error.response?.data || null,
    });
  }
};

const getImportHistory = async (req, res) => {
  try {
    const result = await listImportLogs({
      page: req.query.page,
      limit: req.query.limit,
      importType: req.query.importType,
    });

    return res.json({
      success: true,
      ...result,
    });
  } catch (error) {
    console.error("Import history error:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch import history",
    });
  }
};

const getImportHistoryDetails = async (req, res) => {
  try {
    const log = await getImportLog(req.params.importId);

    if (!log) {
      return res.status(404).json({
        success: false,
        message: "Import history record not found",
      });
    }

    return res.json({
      success: true,
      log,
    });
  } catch (error) {
    console.error("Import history details error:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch import history details",
    });
  }
};

module.exports = {
  importSchoolStudents,
  importOfflineReceiptUsers,
  getSubscriptionPlans,
  assignSubscriptionToUsers,
  getImportHistory,
  getImportHistoryDetails,
};
