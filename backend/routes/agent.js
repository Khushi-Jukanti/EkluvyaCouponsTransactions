// routes/agent.js - CORRECTED VERSION
const Agent = require("../models/agent");
const Transaction = require("../models/userpaymenttransactions.model");
const express = require("express");
const router = express.Router();
const { verifyToken } = require('../middleware/auth');

// GET /agent/profile
router.get("/profile", verifyToken, async (req, res) => {
  try {
    // Since you're using MongoDB for agents, use the Agent model
    const agent = await Agent.findById(req.user.id).select("-password");
    
    if (!agent) {
      return res.status(404).json({ message: 'Agent not found' });
    }
    
    // Format the response to match what frontend expects
    res.json({
      name: agent.name || "Agent",
      mobile: agent.mobile || "N/A",
      email: agent.email || "",
      couponCode: agent.couponCode || "",
      Coupon_code_url: agent.Coupon_code_url || "",
      role: agent.role || "agent",
      firstLogin: agent.firstLogin,
      forcePasswordChange: agent.forcePasswordChange,
      account_number: agent.account_number || "",
      ifsc_code: agent.ifsc_code || "",
      bank_name: agent.bank_name || "",
      account_details_updated: agent.account_details_updated || false
    });

  } catch (error) {
    console.error("Error fetching agent profile:", error);
    res.status(500).json({ message: "Error fetching profile data" });
  }
});

// POST /agent/update-account-details
router.post('/update-account-details', verifyToken, async (req, res) => {
  try {
    const { account_number, ifsc_code, bank_name } = req.body;
    const agentId = req.user.id;

    // Validate input
    if (!account_number || !ifsc_code) {
      return res.status(400).json({
        message: 'Account number and IFSC code are required'
      });
    }

    // Validate account number (9-18 digits)
    if (account_number.length < 9 || account_number.length > 18) {
      return res.status(400).json({
        message: 'Account number must be between 9 and 18 digits'
      });
    }

    // Validate IFSC code format
    const ifscRegex = /^[A-Z]{4}0[A-Z0-9]{6}$/;
    if (!ifscRegex.test(ifsc_code.toUpperCase())) {
      return res.status(400).json({
        message: 'Invalid IFSC code format (e.g., SBIN0001234)'
      });
    }

    // Update agent account details in MongoDB
    const updatedAgent = await Agent.findByIdAndUpdate(
      agentId,
      {
        account_number: account_number,
        ifsc_code: ifsc_code.toUpperCase(),
        bank_name: bank_name,
        account_details_updated: true,
        updated_at: new Date()
      },
      { new: true, select: '-password' }
    );

    if (!updatedAgent) {
      return res.status(404).json({ message: 'Agent not found' });
    }

    res.json({
      message: 'Account details updated successfully',
      agent: {
        id: updatedAgent._id,
        name: updatedAgent.name,
        account_number: updatedAgent.account_number,
        ifsc_code: updatedAgent.ifsc_code,
        bank_name: updatedAgent.bank_name
      }
    });

  } catch (error) {
    console.error('Error updating account details:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// GET /agent/subscriptions
router.get("/subscriptions", verifyToken, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 15;
    const skip = (page - 1) * limit;

    // Get filter from query
    const filterStatus = req.query.status || "all";

    // Get agent from MongoDB
    const agent = await Agent.findById(req.user.id).select("name couponCode");
    
    if (!agent) {
      return res.status(404).json({
        success: false,
        message: "Agent not found"
      });
    }

    console.log("=== FETCHING AGENT SUBSCRIPTIONS ===");
    console.log("Agent:", agent.name, "Coupon:", agent.couponCode);
    console.log("Filter Status:", filterStatus);

    // Get ALL transactions with user and payment info
    const allTransactions = await Transaction.aggregate([
      // Match transactions with agent's coupon code
      { $match: { coupon_text: agent.couponCode } },

      // Lookup user information
      {
        $lookup: {
          from: "users",
          localField: "user_id",
          foreignField: "_id",
          as: "userInfo"
        }
      },
      { $unwind: { path: "$userInfo", preserveNullAndEmptyArrays: true } },

      // Lookup payment information
      {
        $lookup: {
          from: "payments",
          localField: "payment_id",
          foreignField: "_id",
          as: "paymentInfo"
        }
      },
      { $unwind: { path: "$paymentInfo", preserveNullAndEmptyArrays: true } },

      // Determine payment status
      {
        $addFields: {
          paymentStatus: { $ifNull: ["$paymentInfo.status", 2] },
          paymentStatusText: {
            $cond: {
              if: { $eq: [{ $ifNull: ["$paymentInfo.status", 2] }, 2] },
              then: "Success",
              else: "Failed"
            }
          }
        }
      },

      // Project all necessary fields
      {
        $project: {
          _id: 1,
          transactionId: {
            $ifNull: ["$gud_transaction_id", { $toString: "$_id" }]
          },
          userName: {
            $trim: {
              input: {
                $concat: [
                  { $ifNull: ["$userInfo.first_name", ""] },
                  " ",
                  { $ifNull: ["$userInfo.last_name", ""] }
                ]
              }
            }
          },
          mobile: { $ifNull: ["$userInfo.phone", "N/A"] },
          email: { $ifNull: ["$userInfo.email", "N/A"] },
          couponCode: "$coupon_text",
          amount: { $ifNull: ["$price", 0] },
          paymentStatus: 1,
          paymentStatusText: 1,
          createdAt: "$created_at",
          // Create unique key: username + mobile + status
          uniqueKey: {
            $concat: [
              { $ifNull: ["$userInfo.first_name", ""] },
              " ",
              { $ifNull: ["$userInfo.last_name", ""] },
              "|",
              { $ifNull: ["$userInfo.phone", ""] },
              "|",
              {
                $cond: {
                  if: { $eq: [{ $ifNull: ["$paymentInfo.status", 2] }, 2] },
                  then: "Success",
                  else: "Failed"
                }
              }
            ]
          }
        }
      },

      // Sort by date (latest first) so we keep the latest transaction
      { $sort: { createdAt: -1 } }
    ]);

    console.log(`Found ${allTransactions.length} total transactions for coupon: ${agent.couponCode}`);

    // Remove duplicates based on uniqueKey (username + mobile + status)
    // Keep only the latest transaction for each unique combination
    const uniqueMap = new Map();

    for (const transaction of allTransactions) {
      const key = transaction.uniqueKey;
      if (!uniqueMap.has(key)) {
        uniqueMap.set(key, transaction);
      }
    }

    const uniqueTransactions = Array.from(uniqueMap.values());

    console.log(`After removing duplicates (by username+mobile+status): ${uniqueTransactions.length} unique transactions`);

    // Apply status filter if needed
    let filteredTransactions = uniqueTransactions;
    if (filterStatus !== "all") {
      filteredTransactions = uniqueTransactions.filter(tx =>
        tx.paymentStatusText === (filterStatus === "success" ? "Success" : "Failed")
      );
    }

    console.log(`After status filter "${filterStatus}": ${filteredTransactions.length} transactions`);

    // SORT ONLY BY DATE (latest first) - no status grouping
    filteredTransactions.sort((a, b) => {
      // Sort by date (latest first) ONLY
      return new Date(b.createdAt) - new Date(a.createdAt);
    });

    // Apply pagination
    const totalCount = filteredTransactions.length;
    const paginatedData = filteredTransactions.slice(skip, skip + limit);

    console.log(`Returning ${paginatedData.length} transactions for page ${page} (total: ${totalCount})`);

    // Format the data
    const formattedData = paginatedData.map((item, index) => {
      // Parse the date
      let date;
      if (item.createdAt instanceof Date) {
        date = item.createdAt;
      } else if (item.createdAt) {
        date = new Date(item.createdAt);
        if (isNaN(date.getTime())) {
          console.warn(`Invalid date for transaction ${item._id}: ${item.createdAt}`);
          date = new Date();
        }
      } else {
        date = new Date();
      }

      // Format for Indian locale
      const formattedDate = date.toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        timeZone: 'Asia/Kolkata'
      });

      const formattedTime = date.toLocaleTimeString('en-IN', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
        timeZone: 'Asia/Kolkata'
      });

      // Clean up user name
      const userName = item.userName.trim();
      const userInitial = userName && userName !== "" ? userName.charAt(0).toUpperCase() : "U";

      return {
        serialNo: (page - 1) * limit + index + 1,
        _id: item._id,
        transactionId: item.transactionId,
        userName: userName === "" ? "Customer" : userName,
        userInitial: userInitial,
        mobile: item.mobile,
        email: item.email,
        couponCode: item.couponCode,
        amount: item.amount,
        paymentStatus: item.paymentStatus,
        paymentStatusText: item.paymentStatusText,
        createdAt: item.createdAt,
        formattedDate: formattedDate,
        formattedTime: formattedTime,
        subscriptionType: "One-time"
      };
    });

    // Calculate stats from unique transactions
    const stats = {
      totalRevenue: 0,
      successCount: 0,
      failedCount: 0,
      totalUsers: new Set(uniqueTransactions.map(tx =>
        `${tx.userName}|${tx.mobile}`
      )).size // Count unique users (by username+mobile only)
    };

    uniqueTransactions.forEach(item => {
      stats.totalRevenue += item.amount;
      if (item.paymentStatusText === "Success") {
        stats.successCount++;
      } else {
        stats.failedCount++;
      }
    });

    console.log(`Stats: Success=${stats.successCount}, Failed=${stats.failedCount}, Total Users=${stats.totalUsers}, Revenue=${stats.totalRevenue}`);

    res.json({
      success: true,
      data: formattedData,
      stats: {
        totalRevenue: stats.totalRevenue,
        successCount: stats.successCount,
        failedCount: stats.failedCount,
        pendingCount: 0,
        totalUsers: stats.totalUsers
      },
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(totalCount / limit),
        totalCount: totalCount,
        hasNextPage: page < Math.ceil(totalCount / limit),
        hasPrevPage: page > 1,
        pageSize: limit
      }
    });

  } catch (error) {
    console.error("Error fetching agent subscriptions:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching subscription data",
      error: error.message
    });
  }
});

module.exports = router;