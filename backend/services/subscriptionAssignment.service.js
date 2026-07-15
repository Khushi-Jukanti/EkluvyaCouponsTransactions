const axios = require("axios");

const BATCH_SIZE = 150;
const MAX_RETRIES = 3;

function chunkArray(items, size) {
  const chunks = [];

  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }

  return chunks;
}

function getErrorMessage(error) {
  if (!error) return "Unknown error";
  if (typeof error === "string") return error;
  if (error.code === "CERT_HAS_EXPIRED") {
    return "Unable to connect to subscription payment API because the SSL certificate is expired.";
  }
  return error.message || JSON.stringify(error);
}

function shouldRetry(error) {
  const statusCode = error.response?.status || error.response?.data?.statusCode;
  return statusCode !== 401 && statusCode !== 403;
}

async function assignSubscriptionBatch({ userIds, adminToken, planId, endpoint, attempt = 1 }) {
  try {
    const response = await axios.post(
      endpoint,
      {
        user_ids: userIds,
        plan_id: planId,
      },
      {
        headers: {
          Authorization: `Bearer ${adminToken}`,
          "Content-Type": "application/json",
        },
        timeout: 30000,
      }
    );

    return {
      success: true,
      data: response.data,
    };
  } catch (error) {
    if (attempt <= MAX_RETRIES && shouldRetry(error)) {
      return assignSubscriptionBatch({
        userIds,
        adminToken,
        planId,
        endpoint,
        attempt: attempt + 1,
      });
    }

    return {
      success: false,
      error: error.response?.data || getErrorMessage(error),
    };
  }
}

async function assignSubscriptionsToUsers(userIds, options = {}) {
  const adminToken = options.adminToken || process.env.SUBSCRIPTION_ADMIN_TOKEN;
  const planId = options.planId || process.env.SUBSCRIPTION_PLAN_ID;
  const endpoint = options.endpoint || process.env.SUBSCRIPTION_ENDPOINT;

  if (!userIds.length) {
    return {
      status: "skipped",
      message: "No inserted users available for subscription assignment",
      assigned: 0,
      failed: 0,
      batches: [],
    };
  }

  if (!adminToken || !planId) {
    return {
      status: "skipped",
      message: "SUBSCRIPTION_ADMIN_TOKEN and SUBSCRIPTION_PLAN_ID are required",
      assigned: 0,
      failed: 0,
      batches: [],
    };
  }

  if (!endpoint) {
    return {
      status: "skipped",
      message: "SUBSCRIPTION_ENDPOINT is required",
      assigned: 0,
      failed: 0,
      batches: [],
    };
  }

  const batches = chunkArray(userIds, BATCH_SIZE);
  const batchResults = [];
  let assigned = 0;
  let failed = 0;

  for (let index = 0; index < batches.length; index += 1) {
    const userIdsBatch = batches[index];
    const result = await assignSubscriptionBatch({
      userIds: userIdsBatch,
      adminToken,
      planId,
      endpoint,
    });

    if (result.success) {
      const response = result.data?.response || result.data || {};
      const batchFailed = Number(response.failed || 0);
      const batchAssigned = Math.max(userIdsBatch.length - batchFailed, 0);

      assigned += batchAssigned;
      failed += batchFailed;
      batchResults.push({
        batch: index + 1,
        success: true,
        userIds: userIdsBatch,
        response,
      });
    } else {
      failed += userIdsBatch.length;
      batchResults.push({
        batch: index + 1,
        success: false,
        userIds: userIdsBatch,
        error: result.error,
      });
    }
  }

  return {
    status: failed > 0 ? "partial" : "completed",
    assigned,
    failed,
    batches: batchResults,
  };
}

async function fetchSubscriptionPlans(adminToken, options = {}) {
  const endpoint = options.endpoint || process.env.SUBSCRIPTIONS_LIST_ENDPOINT;

  if (!adminToken) {
    return {
      success: false,
      message: "Admin token is required to fetch subscriptions",
      subscriptions: [],
    };
  }

  if (!endpoint) {
    return {
      success: false,
      message: "SUBSCRIPTIONS_LIST_ENDPOINT is required",
      subscriptions: [],
    };
  }

  const response = await axios.get(endpoint, {
    headers: {
      Authorization: `Bearer ${adminToken}`,
      "Content-Type": "application/json",
    },
    timeout: 30000,
  });

  const subscriptions =
    response.data?.response?.subscriptionList?.subscriptions || [];

  return {
    success: true,
    subscriptions,
    raw: response.data,
  };
}

module.exports = {
  assignSubscriptionsToUsers,
  fetchSubscriptionPlans,
};
