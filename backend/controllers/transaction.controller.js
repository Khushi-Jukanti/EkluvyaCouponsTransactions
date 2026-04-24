// src/controllers/transaction.controller.js
const moment = require("moment-timezone");
const UserPaymentTransaction = require("../models/userpaymenttransactions.model");

// Helper: safe integer parse with default
const toInt = (v, defaultVal) => {
  const n = parseInt(v, 10);
  return Number.isFinite(n) && n > 0 ? n : defaultVal;
};

const escapeRegex = (value) =>
  String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const getAllTransactions = async (req, res) => {
  try {
    const {
      start,
      end,
      coupon,
      user_type,
      school_code,
      page = 1,
      limit = 50,
      sort = "desc", // optional sort param
      status,
    } = req.query;

    const requestedUserType =
      String(user_type || "b2c").toLowerCase() === "b2b" ? "b2b" : "b2c";
    const requestedSchoolCode = String(school_code || "").trim();
    const applyDateFilter = !requestedSchoolCode;

    const pageNum = toInt(page, 1);
    const limitNum = toInt(limit, 50);
    const skip = (pageNum - 1) * limitNum;
    const sortOrder = String(sort).toLowerCase() === "asc" ? 1 : -1;

    // Build date range in IST
    let startDate = null;
    let endDate = null;
    if (applyDateFilter && (start || end)) {
      startDate = moment
        .tz(start || "1970-01-01", "Asia/Kolkata")
        .startOf("day")
        .toDate();
      endDate = moment
        .tz(end || new Date(), "Asia/Kolkata")
        .endOf("day")
        .toDate();
    }

    // Pre-match stage: narrow down by coupon (case-insensitive) and optionally by date
    // We'll normalize creation date into `createdDate` inside the pipeline and match on it.
    const preMatch = {};

    if (coupon && String(coupon).trim().length > 0) {
      // case-insensitive exact match (adjust to partial if needed)
      preMatch.coupon_text = {
        $regex: `^${String(coupon).trim()}`,
        $options: "i",
      };
    }

    // THIS BLOCK: Status filtering
    if (status && (status === "success" || status === "failed")) {
      preMatch["payment.status"] = status === "success" ? 2 : 3;
    }

    // Build aggregation pipeline
    const pipeline = [];

    // First, apply any basic pre-match (coupon is indexed maybe)
    if (Object.keys(preMatch).length) {
      pipeline.push({ $match: preMatch });
    }

    // Add a normalized "createdDate" field (tries multiple possible date fields)
    pipeline.push({
      $addFields: {
        createdDate: {
          $ifNull: [
            "$created_at",
            { $ifNull: ["$createdAt", { $ifNull: ["$created", new Date(0)] }] },
          ],
        },
      },
    });

    // Apply date range match if provided
    if (applyDateFilter && (startDate || endDate)) {
      const dateMatch = {};
      if (startDate) dateMatch.$gte = startDate;
      if (endDate) dateMatch.$lte = endDate;
      pipeline.push({ $match: { createdDate: dateMatch } });
    }

    // Lookups - keep your existing lookups/unwinds
    pipeline.push(
      {
        $lookup: {
          from: "users",
          localField: "user_id",
          foreignField: "_id",
          as: "user",
        },
      },
      { $unwind: { path: "$user", preserveNullAndEmptyArrays: true } },
      {
        $lookup: {
          from: "payments",
          localField: "payment_id",
          foreignField: "_id",
          as: "payment",
        },
      },
      { $unwind: { path: "$payment", preserveNullAndEmptyArrays: true } }
    );

    pipeline.push({
      $addFields: {
        resolvedUserType: {
          $toLower: { $ifNull: ["$user.user_type", "b2c"] },
        },
        resolvedSchoolCode: { $ifNull: ["$user.school_code", ""] },
        resolvedUsername: { $ifNull: ["$user.username", ""] },
      },
    });

    pipeline.push({
      $match: {
        resolvedUserType: requestedUserType,
      },
    });

    if (requestedUserType === "b2b" && requestedSchoolCode) {
      pipeline.push({
        $match: {
          resolvedSchoolCode: {
            $regex: `^${escapeRegex(requestedSchoolCode)}`,
            $options: "i",
          },
        },
      });
    }

    // Project fields you need. Use createdDate for formatting below.
    pipeline.push({
      $project: {
        transactionId: {
          $ifNull: ["$gud_transaction_id", "$payment.gudsho_receipt"],
        },
        userName: {
          $trim: {
            input: {
              $cond: [
                { $eq: ["$resolvedUserType", "b2b"] },
                {
                  $cond: [
                    { $ne: ["$resolvedUsername", ""] },
                    "$resolvedUsername",
                    {
                      $concat: [
                        "$user.first_name",
                        " ",
                        { $ifNull: ["$user.last_name", ""] },
                      ],
                    },
                  ],
                },
                {
                  $concat: [
                    "$user.first_name",
                    " ",
                    { $ifNull: ["$user.last_name", ""] },
                  ],
                },
              ],
            },
          },
        },
        first_name: {
          $cond: [
            { $eq: ["$resolvedUserType", "b2b"] },
            "$user.first_name",
            "$$REMOVE",
          ],
        },
        username: {
          $cond: [
            {
              $and: [
                { $eq: ["$resolvedUserType", "b2b"] },
                { $ne: ["$resolvedUsername", ""] },
              ],
            },
            "$resolvedUsername",
            "$$REMOVE",
          ],
        },
        user_type: "$resolvedUserType",
        school_code: {
          $cond: [
            { $eq: ["$resolvedUserType", "b2b"] },
            "$resolvedSchoolCode",
            "$$REMOVE",
          ],
        },
        phone: "$user.phone",
        email: "$user.email",
        couponText: "$coupon_text",
        amount: "$price",
        paymentStatus: "$payment.status",
        paymentStatusText: {
          $switch: {
            branches: [
              { case: { $eq: ["$payment.status", 2] }, then: "Success" },
              { case: { $eq: ["$payment.status", 3] }, then: "Failed" },
            ],
            default: "Pending",
          },
        },
        // date string formatted in IST (same as before)
        date_ist: {
          $dateToString: {
            format: "%d-%m-%Y %H:%M:%S",
            date: "$createdDate",
            timezone: "Asia/Kolkata",
          },
        },
        transaction_date: "$createdDate",
        createdDate: 1, // pass through for sorting
      },
    });

    // Count total matching documents (use same pipeline up to $project)
    const countPipeline = [...pipeline, { $count: "total" }];
    const countResult = await UserPaymentTransaction.aggregate(countPipeline);
    const total =
      countResult && countResult[0] && countResult[0].total
        ? countResult[0].total
        : 0;

    const summaryPipeline = [
      ...pipeline,
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          success: {
            $sum: {
              $cond: [{ $eq: ["$paymentStatus", 2] }, 1, 0],
            },
          },
          failed: {
            $sum: {
              $cond: [{ $eq: ["$paymentStatus", 3] }, 1, 0],
            },
          },
        },
      },
    ];
    const summaryResult = await UserPaymentTransaction.aggregate(summaryPipeline);
    const summary =
      summaryResult && summaryResult[0]
        ? {
            total: summaryResult[0].total || 0,
            success: summaryResult[0].success || 0,
            failed: summaryResult[0].failed || 0,
          }
        : { total: 0, success: 0, failed: 0 };

    // Now apply sort, skip and limit to fetch page
    pipeline.push({ $sort: { createdDate: sortOrder } });
    pipeline.push({ $skip: skip });
    pipeline.push({ $limit: limitNum });

    const data = await UserPaymentTransaction.aggregate(pipeline);

    // Enrich agent info from global map (unchanged)
    const enrichedData = data.map((item) => {
      const couponCode = item.couponText;
      const agent = couponCode
        ? (global.AGENT_COUPON_MAP || {})[couponCode.toUpperCase()]
        : null;

      return {
        ...item,
        paymentStatus: item.paymentStatus,         // ← Add this
        paymentStatusText: item.paymentStatusText, // ← Add this
        agentName: agent?.agentName || "No Agent",
        agentPhone: agent?.phone || "N/A",
        agentLocation: agent?.location || "N/A",
        agentType: agent?.agentType || "N/A",
      };
    });

    res.json({
      success: true,
      count: enrichedData.length,
      total,
      summary,
      page: pageNum,
      pages: Math.ceil(total / limitNum),
      data: enrichedData,
    });
  } catch (err) {
    console.error("Transaction Error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = { getAllTransactions };
