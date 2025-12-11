// src/controllers/transaction.controller.js
const moment = require("moment-timezone");
const UserPaymentTransaction = require("../models/userpaymenttransactions.model");

// Helper: safe integer parse with default
const toInt = (v, defaultVal) => {
  const n = parseInt(v, 10);
  return Number.isFinite(n) && n > 0 ? n : defaultVal;
};

const getAllTransactions = async (req, res) => {
  try {
    const {
      start,
      end,
      coupon,
      page = 1,
      limit = 50,
      sort = "desc", // optional sort param
      status,
    } = req.query;

    const pageNum = toInt(page, 1);
    const limitNum = toInt(limit, 50);
    const skip = (pageNum - 1) * limitNum;
    const sortOrder = String(sort).toLowerCase() === "asc" ? 1 : -1;

    // Build date range in IST
    let startDate = null;
    let endDate = null;
    if (start || end) {
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
    if (startDate || endDate) {
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

    // Project fields you need. Use createdDate for formatting below.
    pipeline.push({
      $project: {
        transactionId: {
          $ifNull: ["$gud_transaction_id", "$payment.gudsho_receipt"],
        },
        userName: {
          $trim: {
            input: {
              $concat: [
                "$user.first_name",
                " ",
                { $ifNull: ["$user.last_name", ""] },
              ],
            },
          },
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
