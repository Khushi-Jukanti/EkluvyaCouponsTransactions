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

const toText = (value) => String(value ?? "").trim();

const getDisplaySignature = (transaction) => {
  const phone = toText(transaction.phone || transaction.userPhone);
  const email = toText(transaction.email || transaction.userEmail).toLowerCase();
  const agent = toText(transaction.agentName).toLowerCase();
  const school = toText(transaction.school_code).toLowerCase();
  const coupon = toText(
    transaction.couponText || transaction.coupon_text || transaction.coupon_code || transaction.coupon
  ).toUpperCase();
  const amount = toText(transaction.amount);
  const status = toText(transaction.paymentStatus ?? transaction.status ?? transaction.paymentStatusText).toLowerCase();

  return [phone, email, agent, school, coupon, amount, status].join("|");
};

const getSignatureScore = (transaction) => {
  const fields = [
    transaction.userName,
    transaction.phone,
    transaction.email,
    transaction.agentName,
    transaction.school_code,
    transaction.couponText,
    transaction.amount,
    transaction.paymentStatus,
    transaction.date_ist,
  ];

  return fields.reduce((score, field) => {
    const value = toText(field);
    return score + (value ? 1 : 0);
  }, 0);
};

const getSortTime = (transaction) => {
  const raw = transaction.createdDate || transaction.transaction_date || transaction.date_ist;
  if (!raw) return 0;
  if (raw instanceof Date) return raw.getTime();
  const parsed = new Date(raw);
  return Number.isNaN(parsed.getTime()) ? 0 : parsed.getTime();
};

const dedupeTransactions = (transactions = []) => {
  const map = new Map();

  for (const transaction of transactions) {
    const key = getDisplaySignature(transaction);
    const existing = map.get(key);

    if (!existing) {
      map.set(key, transaction);
      continue;
    }

    const existingScore = getSignatureScore(existing);
    const currentScore = getSignatureScore(transaction);
    if (currentScore > existingScore) {
      map.set(key, transaction);
      continue;
    }

    if (currentScore === existingScore && getSortTime(transaction) > getSortTime(existing)) {
      map.set(key, transaction);
    }
  }

  return Array.from(map.values());
};

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
      {
        $lookup: {
          from: "payments",
          localField: "payment_id",
          foreignField: "_id",
          as: "payment",
        },
      },
      {
        $addFields: {
          user: { $arrayElemAt: ["$user", 0] },
          payment: { $arrayElemAt: ["$payment", 0] },
        },
      }
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
        paymentId: { $toString: { $ifNull: ["$payment_id", ""] } },
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

    const rawPipeline = [...pipeline];

    // Remove duplicate transactions before counting, summarizing, and paging.
    // Prefer a stable transaction identifier when available, otherwise fall
    // back to a composite of the visible transaction fields.
    pipeline.push({
      $addFields: {
        dedupeKey: {
          $let: {
            vars: {
              txKey: {
                $trim: {
                  input: { $ifNull: ["$transactionId", ""] },
                },
              },
              schoolKey: { $toLower: { $ifNull: ["$school_code", ""] } },
              createdKey: {
                $ifNull: ["$transaction_date", new Date(0)],
              },
              phoneKey: {
                $ifNull: ["$phone", ""],
              },
              emailKey: {
                $toLower: { $ifNull: ["$email", ""] },
              },
              schoolKey: { $toLower: { $ifNull: ["$school_code", ""] } },
              couponKey: {
                $toUpper: { $ifNull: ["$couponText", ""] },
              },
              amountKey: {
                $toString: { $ifNull: ["$amount", ""] },
              },
              paymentKey: {
                $trim: {
                  input: { $ifNull: ["$paymentId", ""] },
                },
              },
              statusKey: {
                $toString: { $ifNull: ["$paymentStatus", ""] },
              },
            },
            in: {
              $cond: [
                { $ne: ["$$txKey", ""] },
                "$$txKey",
                {
                  $cond: [
                    { $ne: ["$$paymentKey", ""] },
                    "$$paymentKey",
                    {
                      $concat: [
                        "$$phoneKey",
                        "|",
                        "$$emailKey",
                        "|",
                        "$$schoolKey",
                        "|",
                        {
                          $dateToString: {
                            format: "%Y-%m-%dT%H:%M:%S",
                            date: "$$createdKey",
                            timezone: "Asia/Kolkata",
                          },
                        },
                        "|",
                        "$$couponKey",
                        "|",
                        "$$amountKey",
                        "|",
                        "$$statusKey",
                      ],
                    },
                  ],
                },
              ],
            },
          },
        },
      },
    });

    pipeline.push({ $sort: { createdDate: sortOrder, _id: 1 } });
    pipeline.push({
      $group: {
        _id: "$dedupeKey",
        doc: { $first: "$$ROOT" },
      },
    });
    pipeline.push({ $replaceRoot: { newRoot: "$doc" } });
    pipeline.push({ $project: { dedupeKey: 0 } });

    const rawData = await UserPaymentTransaction.aggregate(rawPipeline);

    // Enrich agent info from global map before deduping so the display
    // signature uses the same row content the UI shows.
    const enrichedRawData = rawData.map((item) => {
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

    const uniqueData = dedupeTransactions(enrichedRawData).sort((a, b) => {
      const aTime = getSortTime(a);
      const bTime = getSortTime(b);
      return sortOrder === 1 ? aTime - bTime : bTime - aTime;
    });

    const total = uniqueData.length;
    const summary = uniqueData.reduce(
      (acc, item) => {
        acc.total += 1;
        const status = Number(item.paymentStatus);
        if (status === 2) acc.success += 1;
        if (status === 3) acc.failed += 1;
        return acc;
      },
      { total: 0, success: 0, failed: 0 }
    );

    const pagedData = uniqueData.slice(skip, skip + limitNum);

    res.json({
      success: true,
      count: pagedData.length,
      total,
      summary,
      page: pageNum,
      pages: Math.ceil(total / limitNum),
      data: pagedData,
    });
  } catch (err) {
    console.error("Transaction Error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = { getAllTransactions };
