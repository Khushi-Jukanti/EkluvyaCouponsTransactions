const axios = require("axios");

function getPasswordChangeMessage(error) {
  if (!error) return "Password change failed";
  if (typeof error === "string") return error;
  return error.message || JSON.stringify(error);
}

function normalizePasswordChangeMessage(statusCode, message) {
  const text = String(message || "").trim();

  if (Number(statusCode) === 401) {
    return "Admin auth token is invalid, expired, or belongs to a different environment";
  }

  return text || "Password change failed";
}

async function changeStudentPassword({
  adminToken,
  username,
  password,
  passwordConfirmation,
  endpoint = process.env.PASSWORD_CHANGE_ENDPOINT,
}) {
  const passwordChangeEndpoint = String(endpoint || "").trim();

  if (!passwordChangeEndpoint) {
    return {
      success: false,
      statusCode: 500,
      message: "PASSWORD_CHANGE_ENDPOINT is required",
      response: {},
    };
  }

  if (!adminToken) {
    return {
      success: false,
      statusCode: 400,
      message: "Admin token is required",
      response: {},
    };
  }

  if (!username) {
    return {
      success: false,
      statusCode: 400,
      message: "Student ID is required",
      response: {},
    };
  }

  if (!password || !passwordConfirmation) {
    return {
      success: false,
      statusCode: 400,
      message: "Password and confirm password are required",
      response: {},
    };
  }

  if (password !== passwordConfirmation) {
    return {
      success: false,
      statusCode: 400,
      message: "Password and confirm password must match",
      response: {},
    };
  }

  try {
    const response = await axios.post(
      passwordChangeEndpoint,
      {
        username,
        password,
        password_confirmation: passwordConfirmation,
      },
      {
        headers: {
          Authorization: `Bearer ${adminToken}`,
          "Content-Type": "application/json",
        },
        timeout: 30000,
      }
    );
    const payload = response.data || {};

    if (payload.error || payload.status === "error") {
      return {
        success: false,
        statusCode: payload.statusCode || response.status || 400,
        message: normalizePasswordChangeMessage(
          payload.statusCode || response.status || 400,
          payload.message
        ),
        response: payload.response || {},
        error: payload,
      };
    }

    return {
      success: true,
      statusCode: response.status,
      message: payload.message || "Password changed successfully",
      response: payload.response || payload || {},
      raw: payload,
    };
  } catch (error) {
    const statusCode = error.response?.status || error.response?.data?.statusCode || 500;
    const data = error.response?.data;

    return {
      success: false,
      statusCode,
      message: normalizePasswordChangeMessage(
        statusCode,
        data?.message || getPasswordChangeMessage(error)
      ),
      response: data?.response || {},
      error: data || null,
    };
  }
}

module.exports = {
  changeStudentPassword,
};
